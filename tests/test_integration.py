"""
Full-store integration tests.

Runs the real FastAPI app against an in-memory MongoDB, so no external
service or database is required. Every case here corresponds to a defect that
actually shipped, so these double as regression tests.

    python -m pytest tests/test_integration.py -v
"""
import io
import os
import sys
import tempfile
from pathlib import Path

import pytest

BACKEND = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(BACKEND))

os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "test_db")
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key")
os.environ.setdefault("ENV", "test")
# TestClient speaks plain HTTP, and Secure cookies are never sent over HTTP.
os.environ.setdefault("COOKIE_CROSS_SITE", "false")
os.environ.setdefault("COOKIE_SECURE", "false")
# Upload tests write real files; keep them out of the repository tree.
os.environ.setdefault("UPLOAD_DIR", tempfile.mkdtemp(prefix="auraa-test-uploads-"))

from fastapi.testclient import TestClient  # noqa: E402
from mongomock_motor import AsyncMongoMockClient  # noqa: E402

import server  # noqa: E402
from auth.oauth_service import oauth_service  # noqa: E402
from middleware.rate_limiter import reset_rate_limits  # noqa: E402


PRODUCTS = [
    {"id": "p1", "name": "Gold Ring", "name_ar": "خاتم ذهبي", "description": "A ring",
     "description_ar": "خاتم", "price": 250.0, "category": "rings",
     "images": ["http://img/1.jpg"], "in_stock": True},
    {"id": "p2", "name": "Silver Necklace", "description": "A necklace", "price": 120.0,
     "category": "necklaces", "images": ["http://img/2.jpg"]},
    {"id": "p3", "name": "Staged", "description": "not live", "price": 10.0,
     "category": "rings", "images": [], "staging": True},
    {"id": "p4", "description": "malformed - missing name", "price": 5.0,
     "category": "rings", "images": []},
]


@pytest.fixture
def client(monkeypatch):
    """Fresh app state + empty in-memory database per test."""
    db = AsyncMongoMockClient()["test_db"]
    monkeypatch.setattr(server, "db", db)
    server.app.state.db = db

    # The app object is module-level and shared, so rate-limit buckets would
    # otherwise carry over and 429 later tests.
    reset_rate_limits()

    with TestClient(server.app, raise_server_exceptions=False) as c:
        c._db = db
        yield c


@pytest.fixture
def seeded(client):
    import asyncio
    asyncio.get_event_loop().run_until_complete(
        client._db.products.insert_many([dict(p) for p in PRODUCTS])
    )
    return client


def register(client, email="user@example.com", password="pw123456", **extra):
    return client.post("/api/auth/register",
                       json={"email": email, "password": password, "name": "User", **extra})


def make_admin(client, email, super_admin=False):
    import asyncio
    asyncio.get_event_loop().run_until_complete(
        client._db.users.update_one(
            {"email": email},
            {"$set": {"is_admin": True, "is_super_admin": super_admin}},
        )
    )


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("path", ["/health", "/api/health"])
def test_health_endpoints_exist(client, path):
    """render.yaml healthCheckPath pointed at a route that did not exist."""
    r = client.get(path)
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------

def test_register_returns_token_and_sets_cookies(client):
    r = register(client)
    assert r.status_code == 200, r.text
    assert r.json()["access_token"]
    assert "access_token" in r.cookies or "access_token" in client.cookies
    assert "refresh_token" in client.cookies


def test_login_accepts_identifier_payload(client):
    """The frontend sends `identifier`; requiring `email` made login a hard 422."""
    register(client, email="a@b.com")
    r = client.post("/api/auth/login",
                    json={"identifier": "a@b.com", "password": "pw123456",
                          "remember_me": True})
    assert r.status_code == 200, r.text


def test_login_by_phone(client):
    register(client, email="ph@b.com", phone="+966501234567")
    r = client.post("/api/auth/login",
                    json={"identifier": "+966501234567", "password": "pw123456"})
    assert r.status_code == 200, r.text


def test_login_wrong_password_is_401(client):
    register(client, email="c@b.com")
    r = client.post("/api/auth/login",
                    json={"identifier": "c@b.com", "password": "nope"})
    assert r.status_code == 401


def test_malformed_token_is_401_not_500(client):
    """`jwt.JWTError` does not exist in PyJWT; the AttributeError surfaced as 500."""
    r = client.get("/api/auth/me", headers={"Authorization": "Bearer garbage.token.x"})
    assert r.status_code == 401


def test_session_survives_reload_via_cookie(client):
    """
    AuthContext calls /api/auth/me with cookies and no Authorization header.
    Header-only auth meant users appeared logged out after every reload.
    """
    register(client, email="cookie@b.com")
    client.headers.pop("Authorization", None)
    r = client.get("/api/auth/me")
    assert r.status_code == 200, r.text
    assert r.json()["email"] == "cookie@b.com"


def test_bearer_null_falls_back_to_cookie(client):
    """Admin pages send `Bearer null` when localStorage is empty."""
    register(client, email="null@b.com")
    r = client.get("/api/auth/me", headers={"Authorization": "Bearer null"})
    assert r.status_code == 200, r.text


def test_refresh_rotates_and_revokes_old_token(client):
    register(client, email="rot@b.com")
    old_refresh = client.cookies.get("refresh_token")

    r = client.post("/api/auth/refresh")
    assert r.status_code == 200, r.text
    assert client.cookies.get("refresh_token") != old_refresh

    # The rotated-out token must no longer work.
    client.cookies.set("refresh_token", old_refresh)
    assert client.post("/api/auth/refresh").status_code == 401


def test_logout_revokes_refresh_token(client):
    """Clearing the cookie alone left a copied token usable forever."""
    register(client, email="out@b.com")
    stolen = client.cookies.get("refresh_token")

    assert client.post("/api/auth/logout").status_code == 200

    client.cookies.set("refresh_token", stolen)
    assert client.post("/api/auth/refresh").status_code == 401


def test_access_token_cannot_be_used_as_refresh(client):
    token = register(client, email="mix@b.com").json()["access_token"]
    client.cookies.set("refresh_token", token)
    assert client.post("/api/auth/refresh").status_code == 401


# ---------------------------------------------------------------------------
# Storefront
# ---------------------------------------------------------------------------

def test_products_listing_is_public(seeded):
    r = seeded.get("/api/products")
    assert r.status_code == 200
    assert {p["id"] for p in r.json()} == {"p1", "p2"}


def test_products_excludes_staging_and_skips_malformed(seeded):
    ids = [p["id"] for p in seeded.get("/api/products").json()]
    assert "p3" not in ids, "staging product leaked into the storefront"
    assert "p4" not in ids, "malformed product should be skipped, not 500"


def test_arabic_localization(seeded):
    names = [p["name"] for p in seeded.get("/api/products?language=ar").json()]
    assert "خاتم ذهبي" in names


def test_category_filter(seeded):
    assert [p["id"] for p in seeded.get("/api/products?category=rings").json()] == ["p1"]


def test_product_detail_and_404(seeded):
    assert seeded.get("/api/products/p1").status_code == 200
    assert seeded.get("/api/products/missing").status_code == 404


def test_staging_path_precedence(seeded):
    """/products/staging must not be captured by /products/{product_id}."""
    register(seeded, email="adm@b.com")
    make_admin(seeded, "adm@b.com")
    r = seeded.get("/api/products/staging")
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_categories(client):
    r = client.get("/api/categories")
    assert r.status_code == 200 and len(r.json()) == 6


# ---------------------------------------------------------------------------
# Cart and orders
# ---------------------------------------------------------------------------

def test_cart_requires_auth(client):
    assert client.get("/api/cart").status_code in (401, 403)


def test_cart_add_and_total(seeded):
    register(seeded, email="cart@b.com")
    assert seeded.post("/api/cart/add?product_id=p1&quantity=2").status_code == 200
    assert seeded.get("/api/cart").json()["total_amount"] == 500.0


def test_cart_add_unknown_product_404(seeded):
    register(seeded, email="cart2@b.com")
    assert seeded.post("/api/cart/add?product_id=nope").status_code == 404


def test_cart_remove(seeded):
    register(seeded, email="cart3@b.com")
    seeded.post("/api/cart/add?product_id=p1&quantity=1")
    assert seeded.delete("/api/cart/remove/p1").status_code == 200
    assert seeded.get("/api/cart").json()["total_amount"] == 0.0


def test_order_flow_clears_cart_and_is_trackable(seeded):
    register(seeded, email="order@b.com")
    seeded.post("/api/cart/add?product_id=p1&quantity=2")

    r = seeded.post("/api/orders", json={"shipping_address": {"city": "Riyadh"},
                                         "payment_method": "cod"})
    assert r.status_code == 200, r.text
    order = r.json()
    assert order["total_amount"] == 500.0

    assert seeded.get("/api/cart").json()["total_amount"] == 0.0
    assert len(seeded.get("/api/orders").json()) == 1
    assert len(seeded.get("/api/orders/my-orders").json()["orders"]) == 1
    assert seeded.get(f"/api/orders/track/{order['tracking_number']}").status_code == 200


def test_order_with_empty_cart_is_400(seeded):
    register(seeded, email="empty@b.com")
    r = seeded.post("/api/orders", json={"shipping_address": {}, "payment_method": "cod"})
    assert r.status_code == 400


def test_track_unknown_order_404(client):
    assert client.get("/api/orders/track/NOPE").status_code == 404


# ---------------------------------------------------------------------------
# Wishlist (previously called by the frontend but implemented nowhere)
# ---------------------------------------------------------------------------

def test_wishlist_requires_auth(client):
    assert client.get("/api/wishlist").status_code in (401, 403)


def test_wishlist_add_list_remove(seeded):
    register(seeded, email="wish@b.com")

    assert seeded.get("/api/wishlist").json()["product_ids"] == []

    assert seeded.post("/api/wishlist/add", json={"product_id": "p1"}).status_code == 200
    body = seeded.get("/api/wishlist").json()
    assert body["product_ids"] == ["p1"]
    assert body["products"][0]["name"] == "Gold Ring"

    # Adding twice must not duplicate.
    seeded.post("/api/wishlist/add", json={"product_id": "p1"})
    assert seeded.get("/api/wishlist").json()["product_ids"] == ["p1"]

    assert seeded.delete("/api/wishlist/remove/p1").status_code == 200
    assert seeded.get("/api/wishlist").json()["product_ids"] == []


def test_wishlist_add_unknown_product_404(seeded):
    register(seeded, email="wish2@b.com")
    assert seeded.post("/api/wishlist/add", json={"product_id": "nope"}).status_code == 404


# ---------------------------------------------------------------------------
# Authorization
# ---------------------------------------------------------------------------

ADMIN_WRITE_ENDPOINTS = [
    ("post", "/api/products", {"name": "x", "description": "d", "price": 1.0,
                               "category": "rings", "images": []}),
    ("put", "/api/products/p1", {"name": "x", "description": "d", "price": 1.0,
                                 "category": "rings", "images": []}),
    ("delete", "/api/products/p1", None),
    ("get", "/api/products/staging", None),
    ("post", "/api/products/publish-staging", {"product_ids": ["p1"]}),
    ("delete", "/api/products/staging/p1", None),
    ("post", "/api/imports/start", None),
]


@pytest.mark.parametrize("method,path,body", ADMIN_WRITE_ENDPOINTS)
def test_admin_endpoints_reject_anonymous(client, method, path, body):
    """Import and staging endpoints accepted anyone before this change."""
    kwargs = {"json": body} if body is not None else {}
    r = getattr(client, method)(path, **kwargs)
    assert r.status_code in (401, 403), f"{method.upper()} {path} -> {r.status_code}"


@pytest.mark.parametrize("method,path,body", ADMIN_WRITE_ENDPOINTS)
def test_admin_endpoints_reject_normal_user(client, method, path, body):
    register(client, email="plain@b.com")
    kwargs = {"json": body} if body is not None else {}
    r = getattr(client, method)(path, **kwargs)
    assert r.status_code == 403, f"{method.upper()} {path} -> {r.status_code}"


def test_admin_can_create_product(client):
    register(client, email="realadmin@b.com")
    make_admin(client, "realadmin@b.com")
    r = client.post("/api/products", json={"name": "New", "description": "d",
                                           "price": 9.0, "category": "rings",
                                           "images": []})
    assert r.status_code == 200, r.text


def test_cj_admin_routes_require_admin(client):
    assert client.get("/api/admin/cj/ping").status_code in (401, 403)


# ---------------------------------------------------------------------------
# Admin user management
# ---------------------------------------------------------------------------

def test_admin_can_list_users(client):
    register(client, email="lister@b.com")
    make_admin(client, "lister@b.com")
    r = client.get("/api/admin/users")
    assert r.status_code == 200
    assert all("password" not in u for u in r.json()), "password hash leaked"


def test_user_list_requires_admin(client):
    register(client, email="nobody@b.com")
    assert client.get("/api/admin/users").status_code == 403


def test_toggle_admin_requires_super_admin(client):
    register(client, email="justadmin@b.com")
    make_admin(client, "justadmin@b.com", super_admin=False)
    r = client.patch("/api/admin/users/whoever/toggle-admin")
    assert r.status_code == 403


def test_super_admin_can_toggle_admin(client):
    import asyncio
    register(client, email="target2@b.com")
    target_id = register(client, email="sa@b.com").json()["user"]["id"]
    make_admin(client, "sa@b.com", super_admin=True)

    victim = asyncio.get_event_loop().run_until_complete(
        client._db.users.find_one({"email": "target2@b.com"}))

    r = client.patch(f"/api/admin/users/{victim['id']}/toggle-admin")
    assert r.status_code == 200, r.text
    assert r.json()["is_admin"] is True


def test_change_role_requires_current_password(client):
    register(client, email="sa2@b.com")
    make_admin(client, "sa2@b.com", super_admin=True)

    r = client.post("/api/admin/super-admin-change-role",
                    json={"user_id": "x", "new_role": "admin"})
    assert r.status_code == 400

    r = client.post("/api/admin/super-admin-change-role",
                    json={"user_id": "x", "new_role": "admin",
                          "current_password": "wrong"})
    assert r.status_code == 401


def test_change_role_rejects_invalid_role(client):
    register(client, email="sa3@b.com")
    make_admin(client, "sa3@b.com", super_admin=True)
    r = client.post("/api/admin/super-admin-change-role",
                    json={"user_id": "x", "new_role": "god",
                          "current_password": "pw123456"})
    assert r.status_code == 400


def test_super_admin_statistics(client):
    register(client, email="stats@b.com")
    make_admin(client, "stats@b.com", super_admin=True)
    r = client.get("/api/admin/super-admin-statistics")
    assert r.status_code == 200
    assert set(r.json()) >= {"total_users", "total_admins", "total_products", "total_orders"}


def test_cannot_delete_own_account(client):
    uid = register(client, email="self@b.com").json()["user"]["id"]
    make_admin(client, "self@b.com", super_admin=True)
    assert client.delete(f"/api/admin/users/{uid}").status_code == 400


def test_password_change_revokes_sessions(client):
    """Changing a password must not leave old refresh tokens usable."""
    import asyncio
    victim_refresh = None

    register(client, email="victim@b.com")
    victim_refresh = client.cookies.get("refresh_token")
    victim = asyncio.get_event_loop().run_until_complete(
        client._db.users.find_one({"email": "victim@b.com"}))

    client.cookies.clear()
    register(client, email="sa4@b.com")
    make_admin(client, "sa4@b.com", super_admin=True)

    r = client.patch(f"/api/admin/users/{victim['id']}/change-password",
                     json={"new_password": "brand-new-pw"})
    assert r.status_code == 200, r.text

    client.cookies.clear()
    client.cookies.set("refresh_token", victim_refresh)
    assert client.post("/api/auth/refresh").status_code == 401


# ---------------------------------------------------------------------------
# Admin: orders, settings, theme, CMS, media, analytics
# ---------------------------------------------------------------------------

def as_admin(client, email="boss@b.com", super_admin=True):
    register(client, email=email)
    make_admin(client, email, super_admin=super_admin)
    return client


ADMIN_ONLY_PATHS = [
    ("get", "/api/admin/orders"),
    ("get", "/api/admin/settings"),
    ("get", "/api/admin/theme"),
    ("get", "/api/admin/cms-pages"),
    ("get", "/api/admin/media"),
    ("get", "/api/admin/analytics"),
]


@pytest.mark.parametrize("method,path", ADMIN_ONLY_PATHS)
def test_new_admin_endpoints_reject_anonymous(client, method, path):
    assert getattr(client, method)(path).status_code in (401, 403)


@pytest.mark.parametrize("method,path", ADMIN_ONLY_PATHS)
def test_new_admin_endpoints_reject_normal_user(client, method, path):
    register(client, email="plain2@b.com")
    assert getattr(client, method)(path).status_code == 403


def test_admin_orders_list_includes_customer(seeded):
    register(seeded, email="buyer@b.com")
    seeded.post("/api/cart/add?product_id=p1&quantity=1")
    seeded.post("/api/orders", json={"shipping_address": {}, "payment_method": "cod"})
    seeded.cookies.clear()

    as_admin(seeded)
    r = seeded.get("/api/admin/orders")
    assert r.status_code == 200, r.text
    assert r.json()[0]["customer_email"] == "buyer@b.com"


def test_admin_can_update_order_status(seeded):
    register(seeded, email="buyer2@b.com")
    seeded.post("/api/cart/add?product_id=p1&quantity=1")
    order_id = seeded.post("/api/orders",
                           json={"shipping_address": {}, "payment_method": "cod"}).json()["id"]
    seeded.cookies.clear()

    as_admin(seeded)
    r = seeded.put(f"/api/admin/orders/{order_id}", json={"status": "shipped"})
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "shipped"


def test_admin_order_status_rejects_invalid_value(seeded):
    as_admin(seeded)
    r = seeded.put("/api/admin/orders/whatever", json={"status": "teleported"})
    assert r.status_code == 422


def test_admin_update_missing_order_404(client):
    as_admin(client)
    assert client.put("/api/admin/orders/nope",
                      json={"status": "shipped"}).status_code == 404


def test_settings_roundtrip(client):
    as_admin(client)
    assert client.get("/api/admin/settings").json() == {}

    payload = {"store_name": "Auraa", "store_name_ar": "أورا", "logo_url": "/x.png"}
    assert client.put("/api/admin/settings", json=payload).status_code == 200

    saved = client.get("/api/admin/settings").json()
    assert saved["store_name"] == "Auraa"
    assert saved["store_name_ar"] == "أورا"


def test_theme_roundtrip(client):
    as_admin(client)
    assert client.put("/api/admin/theme",
                      json={"primary_color": "#b45309"}).status_code == 200
    assert client.get("/api/admin/theme").json()["primary_color"] == "#b45309"


CMS_PAGE = {
    "slug": "about", "title_en": "About", "title_ar": "من نحن",
    "content_en": "Hello", "content_ar": "مرحبا", "route": "/about",
}


def test_cms_page_crud(client):
    as_admin(client)

    created = client.post("/api/admin/cms-pages", json=CMS_PAGE)
    assert created.status_code == 200, created.text
    page_id = created.json()["id"]

    assert len(client.get("/api/admin/cms-pages").json()) == 1

    updated = client.put(f"/api/admin/cms-pages/{page_id}", json={"title_en": "About Us"})
    assert updated.status_code == 200
    assert updated.json()["title_en"] == "About Us"

    assert client.delete(f"/api/admin/cms-pages/{page_id}").status_code == 200
    assert client.get("/api/admin/cms-pages").json() == []


def test_cms_page_slug_must_be_unique(client):
    as_admin(client)
    assert client.post("/api/admin/cms-pages", json=CMS_PAGE).status_code == 200
    assert client.post("/api/admin/cms-pages", json=CMS_PAGE).status_code == 400


def test_public_cms_page_is_readable_and_hides_inactive(client):
    as_admin(client)
    page_id = client.post("/api/admin/cms-pages", json=CMS_PAGE).json()["id"]

    client.cookies.clear()
    assert client.get("/api/cms-pages/about").status_code == 200

    as_admin(client, email="boss2@b.com")
    client.put(f"/api/admin/cms-pages/{page_id}", json={"is_active": False})

    client.cookies.clear()
    assert client.get("/api/cms-pages/about").status_code == 404


def _png_bytes():
    from PIL import Image as PILImage
    buf = io.BytesIO()
    PILImage.new("RGB", (4, 4), (200, 160, 60)).save(buf, format="PNG")
    return buf.getvalue()


def test_image_upload_and_delete(client):
    as_admin(client)

    r = client.post("/api/admin/upload-image",
                    files={"file": ("logo.png", _png_bytes(), "image/png")})
    assert r.status_code == 200, r.text
    assert r.json()["url"].startswith("/static/uploads/")

    media = client.get("/api/admin/media").json()
    assert len(media) == 1
    assert client.delete(f"/api/admin/media/{media[0]['id']}").status_code == 200
    assert client.get("/api/admin/media").json() == []


def test_upload_rejects_non_image_content_type(client):
    as_admin(client)
    r = client.post("/api/admin/upload-image",
                    files={"file": ("evil.sh", b"#!/bin/sh\nrm -rf /", "text/x-shellscript")})
    assert r.status_code == 400


def test_upload_rejects_disguised_non_image(client):
    """A declared image/png that is not actually an image must be rejected."""
    as_admin(client)
    r = client.post("/api/admin/upload-image",
                    files={"file": ("fake.png", b"not really a png", "image/png")})
    assert r.status_code == 400


def test_upload_filename_cannot_traverse_directories(client):
    """The stored name is generated, so a ../ filename cannot escape the dir."""
    as_admin(client)
    r = client.post("/api/admin/upload-image",
                    files={"file": ("../../../../etc/passwd.png", _png_bytes(), "image/png")})
    assert r.status_code == 200
    assert ".." not in r.json()["filename"]
    assert r.json()["url"].startswith("/static/uploads/")


def test_analytics_reflects_real_orders(seeded):
    register(seeded, email="an@b.com")
    seeded.post("/api/cart/add?product_id=p1&quantity=2")   # 2 x 250 = 500
    seeded.post("/api/orders", json={"shipping_address": {}, "payment_method": "cod"})
    seeded.cookies.clear()

    as_admin(seeded)
    r = seeded.get("/api/admin/analytics?range=30d")
    assert r.status_code == 200, r.text

    data = r.json()
    assert data["total_orders"] == 1
    assert data["total_revenue"] == 500.0
    assert data["average_order_value"] == 500.0
    assert data["orders_by_status"]["pending"] == 1
    assert data["top_products"][0]["product_id"] == "p1"
    assert data["top_products"][0]["quantity_sold"] == 2


def test_analytics_empty_store_does_not_divide_by_zero(client):
    as_admin(client)
    data = client.get("/api/admin/analytics").json()
    assert data["total_orders"] == 0
    assert data["average_order_value"] == 0


# ---------------------------------------------------------------------------
# Setup bootstrap
# ---------------------------------------------------------------------------

FIRST_ADMIN = {"email": "root@b.com", "password": "strong-pw-1", "name": "Root"}


def test_check_admin_is_public_and_reports_state(client):
    assert client.get("/api/setup/check-admin").json()["has_admin"] is False
    client.post("/api/setup/create-first-admin", json=FIRST_ADMIN)
    assert client.get("/api/setup/check-admin").json()["has_admin"] is True


def test_first_admin_is_super_admin_and_can_log_in(client):
    r = client.post("/api/setup/create-first-admin", json=FIRST_ADMIN)
    assert r.status_code == 200, r.text
    assert r.json()["user"]["is_super_admin"] is True
    assert "password" not in r.json()["user"]

    login = client.post("/api/auth/login",
                        json={"identifier": "root@b.com", "password": "strong-pw-1"})
    assert login.status_code == 200, login.text


def test_first_admin_endpoint_closes_after_first_use(client):
    """Otherwise anyone could mint themselves a super admin at any time."""
    assert client.post("/api/setup/create-first-admin", json=FIRST_ADMIN).status_code == 200
    second = client.post("/api/setup/create-first-admin",
                         json={"email": "attacker@b.com", "password": "strong-pw-2"})
    assert second.status_code == 403


def test_first_admin_rejects_weak_password(client):
    r = client.post("/api/setup/create-first-admin",
                    json={"email": "weak@b.com", "password": "short"})
    assert r.status_code == 400


def test_first_admin_honours_setup_key(client, monkeypatch):
    monkeypatch.setenv("ADMIN_SETUP_KEY", "let-me-in")
    assert client.post("/api/setup/create-first-admin",
                       json=FIRST_ADMIN).status_code == 403
    ok = client.post("/api/setup/create-first-admin",
                     json={**FIRST_ADMIN, "setup_key": "let-me-in"})
    assert ok.status_code == 200, ok.text


# ---------------------------------------------------------------------------
# Admin product bulk operations
# ---------------------------------------------------------------------------

def test_admin_products_list_includes_malformed(seeded):
    """The admin view must surface broken rows so they can be repaired."""
    as_admin(seeded)
    ids = {p["id"] for p in seeded.get("/api/admin/products").json()}
    assert "p4" in ids, "malformed product hidden from the admin view"


def test_bulk_delete(seeded):
    as_admin(seeded)
    r = seeded.post("/api/admin/products/bulk-delete", json={"ids": ["p1", "p2"]})
    assert r.status_code == 200 and r.json()["deleted"] == 2
    assert seeded.get("/api/products").json() == []


def test_bulk_update(seeded):
    as_admin(seeded)
    r = seeded.post("/api/admin/products/bulk-update",
                    json={"ids": ["p1"], "data": {"in_stock": False}})
    assert r.status_code == 200 and r.json()["updated"] == 1
    assert seeded.get("/api/products/p1").json()["in_stock"] is False


def test_bulk_update_cannot_overwrite_ids(seeded):
    """Setting `id` in bulk would collapse every selected product onto one."""
    as_admin(seeded)
    seeded.post("/api/admin/products/bulk-update",
                json={"ids": ["p1", "p2"], "data": {"id": "same", "in_stock": False}})
    ids = {p["id"] for p in seeded.get("/api/products").json()}
    assert ids == {"p1", "p2"}


def test_bulk_operations_reject_empty_selection(seeded):
    as_admin(seeded)
    assert seeded.post("/api/admin/products/bulk-delete",
                       json={"ids": []}).status_code == 400
    assert seeded.post("/api/admin/products/bulk-update",
                       json={"ids": [], "data": {"x": 1}}).status_code == 400


def test_bulk_endpoints_require_admin(seeded):
    register(seeded, email="nope@b.com")
    assert seeded.post("/api/admin/products/bulk-delete",
                       json={"ids": ["p1"]}).status_code == 403


# ---------------------------------------------------------------------------
# Account disabling
# ---------------------------------------------------------------------------

def test_disabled_account_cannot_log_in_or_use_existing_token(client):
    import asyncio
    register(client, email="banned@b.com")
    banned_cookies = dict(client.cookies)
    banned = asyncio.get_event_loop().run_until_complete(
        client._db.users.find_one({"email": "banned@b.com"}))

    client.cookies.clear()
    as_admin(client, email="boss3@b.com")
    r = client.post("/api/admin/super-admin-toggle-status",
                    json={"user_id": banned["id"], "is_active": False})
    assert r.status_code == 200, r.text

    # Fresh login is refused.
    client.cookies.clear()
    assert client.post("/api/auth/login",
                       json={"identifier": "banned@b.com",
                             "password": "pw123456"}).status_code == 403

    # And the token issued before the ban stops working.
    for k, v in banned_cookies.items():
        client.cookies.set(k, v)
    assert client.get("/api/auth/me").status_code == 403


# ---------------------------------------------------------------------------
# Geo and placeholder
# ---------------------------------------------------------------------------

def test_geo_detect_is_public_and_always_answers(client):
    r = client.get("/api/geo/detect")
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["country_code"]
    assert body["currency"]


def test_placeholder_returns_svg_and_clamps_size(client):
    r = client.get("/api/placeholder/300/300")
    assert r.status_code == 200
    assert r.headers["content-type"].startswith("image/svg+xml")

    huge = client.get("/api/placeholder/99999/99999")
    assert huge.status_code == 200
    assert "2000" in huge.text


# ---------------------------------------------------------------------------
# Auto-update and shipping
# ---------------------------------------------------------------------------

# /auto-update/currency-rates is deliberately absent: reading published
# exchange rates is public, because every visitor needs them to see prices.
# Triggering a refresh is still admin-only and is covered below.
AUTO_UPDATE_PATHS = [
    ("get", "/api/auto-update/status"),
    ("get", "/api/auto-update/scheduled-task-logs"),
    ("get", "/api/auto-update/bulk-import-tasks"),
    ("post", "/api/auto-update/trigger-currency-update"),
    ("post", "/api/auto-update/update-all-prices"),
    ("post", "/api/auto-update/sync-products"),
]


@pytest.mark.parametrize("method,path", AUTO_UPDATE_PATHS)
def test_auto_update_requires_admin(client, method, path):
    register(client, email="plain3@b.com")
    assert getattr(client, method)(path).status_code == 403


def test_auto_update_status(client):
    as_admin(client)
    r = client.get("/api/auto-update/status")
    assert r.status_code == 200, r.text
    assert "total_products" in r.json()


def test_task_logs_and_import_tasks_are_lists(client):
    as_admin(client)
    assert client.get("/api/auto-update/scheduled-task-logs").json() == []
    assert client.get("/api/auto-update/bulk-import-tasks").json() == []


def test_update_all_prices_skips_products_without_cost(seeded):
    """A product with no cost must keep its price, not be zeroed."""
    as_admin(seeded)
    before = seeded.get("/api/products/p1").json()["price"]

    r = seeded.post("/api/auto-update/update-all-prices")
    assert r.status_code == 200, r.text
    assert r.json()["skipped"] >= 1

    assert seeded.get("/api/products/p1").json()["price"] == before


def test_shipping_estimate_is_public(seeded):
    r = seeded.post("/api/shipping/estimate",
                    json={"country_code": "SA",
                          "items": [{"product_id": "p1", "quantity": 1}]})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["subtotal"] == 250.0
    assert "shipping_cost" in body


def test_shipping_free_above_threshold(seeded):
    r = seeded.post("/api/shipping/estimate",
                    json={"country_code": "SA",
                          "items": [{"product_id": "p1", "quantity": 10}]})
    body = r.json()
    assert body["subtotal"] == 2500.0
    assert body["qualifies_for_free_shipping"] is True
    assert body["shipping_cost"] == 0


def test_shipping_ignores_unknown_products(seeded):
    r = seeded.post("/api/shipping/estimate",
                    json={"country_code": "SA",
                          "items": [{"product_id": "ghost", "quantity": 3}]})
    assert r.status_code == 200
    assert r.json()["subtotal"] == 0


# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("origin", [
    "https://evil-attacker.vercel.app",       # arbitrary Vercel project
    "https://vercel.app.attacker.com",        # substring match bypass
    "https://totally-evil.emergentagent.com",
    "https://evil.com",
])
def test_cors_rejects_untrusted_origins(client, origin):
    r = client.options("/api/auth/login",
                       headers={"Origin": origin,
                                "Access-Control-Request-Method": "POST"})
    assert r.headers.get("Access-Control-Allow-Origin") is None, (
        f"{origin} was reflected back with credentials"
    )


@pytest.mark.parametrize("origin", [
    "https://auraaluxury.com",
    "https://www.auraaluxury.com",
    "http://localhost:3000",
])
def test_cors_allows_trusted_origins(client, origin):
    r = client.options("/api/auth/login",
                       headers={"Origin": origin,
                                "Access-Control-Request-Method": "POST"})
    assert r.headers.get("Access-Control-Allow-Origin") == origin


# ---------------------------------------------------------------------------
# Rate limiting
# ---------------------------------------------------------------------------

def test_login_is_rate_limited(client):
    """Brute-force protection existed in the repo but was never registered."""
    register(client, email="target@b.com")

    statuses = []
    for i in range(25):
        r = client.post("/api/auth/login",
                        json={"identifier": "target@b.com", "password": "wrong"},
                        headers={"X-Forwarded-For": "203.0.113.9"})
        statuses.append(r.status_code)
        if r.status_code == 429:
            break

    assert 429 in statuses, f"never rate limited: {statuses}"


def test_rate_limit_is_per_ip(client):
    """
    Keying on request.client.host would bucket every user behind the proxy
    together and lock out the whole site.
    """
    register(client, email="v@b.com")
    for _ in range(20):
        client.post("/api/auth/login",
                    json={"identifier": "v@b.com", "password": "wrong"},
                    headers={"X-Forwarded-For": "203.0.113.50"})

    # A different client IP must still be served.
    r = client.post("/api/auth/login",
                    json={"identifier": "v@b.com", "password": "pw123456"},
                    headers={"X-Forwarded-For": "198.51.100.7"})
    assert r.status_code == 200, r.text


# ---------------------------------------------------------------------------
# Sign in with Google
#
# The flow used to route through a third-party broker; these pin down the
# replacement so the button can't silently regress into something that sends
# customers to Google and brings them back still signed out.
# ---------------------------------------------------------------------------

GOOGLE_CREDS = {"GOOGLE_CLIENT_ID": "test-client-id.apps.googleusercontent.com",
                "GOOGLE_CLIENT_SECRET": "test-client-secret"}
CALLBACK = "https://auraaluxury.com/auth/oauth-callback"
STATE = "0123456789abcdef0123456789abcdef"


@pytest.fixture
def google_configured(monkeypatch):
    for k, v in GOOGLE_CREDS.items():
        monkeypatch.setenv(k, v)


def test_providers_reports_google_off_when_unconfigured(client, monkeypatch):
    monkeypatch.delenv("GOOGLE_CLIENT_ID", raising=False)
    monkeypatch.delenv("GOOGLE_CLIENT_SECRET", raising=False)
    r = client.get("/api/auth/oauth/providers")
    assert r.status_code == 200
    assert r.json() == {"google": False}


def test_providers_reports_google_on_when_configured(client, google_configured):
    assert client.get("/api/auth/oauth/providers").json() == {"google": True}


def test_oauth_url_points_at_google_not_a_third_party(client, google_configured):
    r = client.get("/api/auth/oauth/google/url",
                   params={"redirect_url": CALLBACK, "state": STATE})
    assert r.status_code == 200, r.text
    url = r.json()["url"]
    assert url.startswith("https://accounts.google.com/o/oauth2/v2/auth?")
    assert "emergentagent" not in url
    assert GOOGLE_CREDS["GOOGLE_CLIENT_ID"] in url
    assert STATE in url
    # The secret must never reach the browser.
    assert GOOGLE_CREDS["GOOGLE_CLIENT_SECRET"] not in url


def test_oauth_url_is_503_when_google_is_not_configured(client, monkeypatch):
    monkeypatch.delenv("GOOGLE_CLIENT_ID", raising=False)
    monkeypatch.delenv("GOOGLE_CLIENT_SECRET", raising=False)
    r = client.get("/api/auth/oauth/google/url",
                   params={"redirect_url": CALLBACK, "state": STATE})
    assert r.status_code == 503


def test_oauth_url_refuses_an_off_site_return_address(client, google_configured):
    r = client.get("/api/auth/oauth/google/url",
                   params={"redirect_url": "https://evil.example.com/steal", "state": STATE})
    assert r.status_code == 400


def test_oauth_url_requires_a_state(client, google_configured):
    r = client.get("/api/auth/oauth/google/url",
                   params={"redirect_url": CALLBACK, "state": "short"})
    assert r.status_code == 400


def test_unsupported_provider_is_rejected(client, google_configured):
    r = client.get("/api/auth/oauth/facebook/url",
                   params={"redirect_url": CALLBACK, "state": STATE})
    assert r.status_code == 400


def _fake_exchange(profile=None, raises=None):
    async def exchange(code, redirect_uri):
        if raises:
            raise raises
        return profile
    return exchange


def test_google_callback_creates_the_account_and_issues_a_session(
    client, google_configured, monkeypatch
):
    monkeypatch.setattr(
        oauth_service, "exchange_code",
        _fake_exchange({"sub": "g-1", "email": "New.Person@Gmail.com",
                        "email_verified": True, "name": "New Person", "picture": None}),
    )
    r = client.post("/api/auth/oauth/google/callback",
                    json={"code": "auth-code", "redirect_uri": CALLBACK})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["access_token"]
    # Stored lowercase so a later password login on the same address matches.
    assert body["user"]["email"] == "new.person@gmail.com"
    assert body["needs_phone"] is True
    assert "access_token" in r.cookies or "access_token" in r.headers.get("set-cookie", "")


def test_google_callback_signs_into_the_existing_account(
    client, google_configured, monkeypatch
):
    register(client, email="existing@b.com")
    monkeypatch.setattr(
        oauth_service, "exchange_code",
        _fake_exchange({"sub": "g-2", "email": "existing@b.com",
                        "email_verified": True, "name": "Existing", "picture": None}),
    )
    r = client.post("/api/auth/oauth/google/callback",
                    json={"code": "auth-code", "redirect_uri": CALLBACK})
    assert r.status_code == 200, r.text
    # Same account, not a duplicate.
    import asyncio
    count = asyncio.get_event_loop().run_until_complete(
        client._db.users.count_documents({"email": "existing@b.com"})
    )
    assert count == 1


def test_google_callback_refuses_an_unverified_email(client, google_configured, monkeypatch):
    """
    Otherwise an account whose address was never proven could be used to claim
    an existing customer's account.
    """
    register(client, email="victim@b.com")
    monkeypatch.setattr(
        oauth_service, "exchange_code",
        _fake_exchange({"sub": "g-3", "email": "victim@b.com",
                        "email_verified": False, "name": "Not Really", "picture": None}),
    )
    r = client.post("/api/auth/oauth/google/callback",
                    json={"code": "auth-code", "redirect_uri": CALLBACK})
    assert r.status_code == 401
    assert r.json()["detail"] == "google_email_not_verified"


def test_google_callback_rejects_a_bad_code(client, google_configured, monkeypatch):
    from auth.oauth_service import OAuthExchangeError
    monkeypatch.setattr(
        oauth_service, "exchange_code",
        _fake_exchange(raises=OAuthExchangeError("nope")),
    )
    r = client.post("/api/auth/oauth/google/callback",
                    json={"code": "stale-code", "redirect_uri": CALLBACK})
    assert r.status_code == 401


def test_google_callback_refuses_an_off_site_redirect_uri(client, google_configured):
    r = client.post("/api/auth/oauth/google/callback",
                    json={"code": "auth-code", "redirect_uri": "https://evil.example.com/cb"})
    assert r.status_code == 400


# ---------------------------------------------------------------------------
# Currency rates
# ---------------------------------------------------------------------------

def test_currency_rates_are_public(client):
    """
    Every visitor's LanguageContext calls this to price the catalogue. It used
    to require an admin token, so every customer got 403 and the store fell
    back to USD-only rates.
    """
    r = client.get("/api/auto-update/currency-rates")
    assert r.status_code != 401, "signed-out visitors must be able to read rates"
    assert r.status_code != 403, "customers must not need admin to see prices"


def test_refreshing_currency_rates_still_needs_admin(client):
    """Reading is public; making the server go fetch new rates is not."""
    r = client.post("/api/auto-update/trigger-currency-update")
    assert r.status_code in (401, 403), r.text


def test_google_links_to_an_account_registered_with_different_capitals(
    client, google_configured, monkeypatch
):
    """
    Registration keeps the address as typed; Google reports it lowercased.
    Matching only the lowercase form created a second account and quietly
    stripped the customer of their orders, wishlist and admin rights.
    """
    register(client, email="Younes.Person@gmail.com")
    make_admin(client, "Younes.Person@gmail.com")

    monkeypatch.setattr(
        oauth_service, "exchange_code",
        _fake_exchange({"sub": "g-9", "email": "younes.person@gmail.com",
                        "email_verified": True, "name": "Younes", "picture": None}),
    )
    r = client.post("/api/auth/oauth/google/callback",
                    json={"code": "auth-code", "redirect_uri": CALLBACK})
    assert r.status_code == 200, r.text

    import asyncio
    total = asyncio.get_event_loop().run_until_complete(
        client._db.users.count_documents({})
    )
    assert total == 1, "a second account was created for the same person"
    assert r.json()["user"]["is_admin"] is True, "signed into a new account, losing admin"


def test_registration_keeps_the_name_the_form_collected(client):
    """
    The sign-up form has always sent first_name/last_name. They were absent
    from the model, so every customer was stored under their email prefix and
    the admin users table showed a column of login handles.
    """
    r = client.post("/api/auth/register", json={
        "email": "person@example.com", "password": "pw123456",
        "first_name": "يونس", "last_name": "السعدي", "phone": "+966500000000",
    })
    assert r.status_code == 200, r.text
    user = r.json()["user"]
    assert user["first_name"] == "يونس"
    assert user["last_name"] == "السعدي"
    assert user["name"] == "يونس السعدي"


def test_registration_without_a_name_still_works(client):
    r = client.post("/api/auth/register",
                    json={"email": "noname@example.com", "password": "pw123456"})
    assert r.status_code == 200, r.text
    assert r.json()["user"]["name"] == "noname"


# ---------------------------------------------------------------------------
# Storefront: recommendations, comparison, search
#
# All three features were rendered to every visitor while none of the three
# endpoints existed, so the browser filled them in — the comparison table
# generated its weights and quality scores with Math.random().
# ---------------------------------------------------------------------------

def test_recommendations_return_only_real_products(seeded):
    r = seeded.get("/api/recommendations", params={"type": "personalized", "limit": 6})
    assert r.status_code == 200, r.text
    ids = {p["id"] for p in r.json()}
    assert ids, "the row must not be empty when the catalogue has products"
    # p3 is staging and p4 is malformed; neither may reach a customer.
    assert "p3" not in ids
    assert ids <= {"p1", "p2"}


def test_similar_recommendations_share_the_category_and_exclude_the_product(seeded):
    r = seeded.get("/api/recommendations", params={"type": "similar", "productId": "p1", "limit": 5})
    assert r.status_code == 200, r.text
    for p in r.json():
        assert p["id"] != "p1", "a product cannot be similar to itself"


def test_unknown_recommendation_type_falls_back_instead_of_failing(seeded):
    assert seeded.get("/api/recommendations", params={"type": "nonsense"}).status_code == 200


def test_tracking_a_click_feeds_trending(seeded):
    for _ in range(3):
        assert seeded.post("/api/recommendations/track",
                           json={"productId": "p2", "type": "trending"}).status_code == 200

    r = seeded.get("/api/recommendations", params={"type": "trending", "limit": 3})
    assert r.status_code == 200, r.text
    assert r.json()[0]["id"] == "p2", "the most-opened product must lead the row"


def test_compare_returns_stored_values_and_never_invents_specifications(seeded):
    r = seeded.post("/api/products/compare", json={"productIds": ["p1", "p2"]})
    assert r.status_code == 200, r.text
    data = r.json()
    assert set(data) == {"p1", "p2"}
    assert data["p1"]["price"] == 250.0
    # The seed products carry no material or colour, so those must come back
    # null — the old code filled them with "18K Gold" chosen by array index.
    assert data["p1"]["material"] is None
    assert data["p1"]["color"] is None
    assert data["p1"]["stock_status"] in ("in_stock", "low_stock", "out_of_stock")


def test_compare_skips_staging_products(seeded):
    data = seeded.post("/api/products/compare", json={"productIds": ["p1", "p3"]}).json()
    assert "p3" not in data


def test_compare_rejects_an_empty_request(seeded):
    assert seeded.post("/api/products/compare", json={"productIds": []}).status_code == 400


def test_search_finds_products_by_name(seeded):
    r = seeded.get("/api/search", params={"q": "Necklace"})
    assert r.status_code == 200, r.text
    assert [p["id"] for p in r.json()] == ["p2"]


def test_search_excludes_staging(seeded):
    assert all(p["id"] != "p3" for p in seeded.get("/api/search", params={"q": "Staged"}).json())


def test_search_treats_the_query_as_text_not_a_pattern(seeded):
    """A regex metacharacter must not blow up or match everything."""
    r = seeded.get("/api/search", params={"q": "a(b"})
    assert r.status_code == 200
    assert r.json() == []


# ---------------------------------------------------------------------------
# Quick import
# ---------------------------------------------------------------------------

def test_import_start_reads_the_count_it_is_given(client, monkeypatch):
    """
    The page sends count and keyword in the JSON body. They were declared as
    query parameters, so the body was discarded and every run imported the
    default 50 with the default keyword.
    """
    captured = {}

    async def fake_import(**kwargs):
        captured.update(kwargs)

    monkeypatch.setattr(server, "background_import_cj_products", fake_import)
    register(client, email="imp@b.com")
    make_admin(client, "imp@b.com")

    r = client.post("/api/imports/start",
                    json={"source": "cj", "count": 200, "keyword": "gold rings"})
    assert r.status_code == 200, r.text
    assert captured.get("max_products") == 200, f"count ignored: {captured}"
    assert captured.get("keyword") == "gold rings", f"keyword ignored: {captured}"


def test_import_start_still_rejects_an_out_of_range_count(client):
    register(client, email="imp2@b.com")
    make_admin(client, "imp2@b.com")
    r = client.post("/api/imports/start", json={"count": 5000})
    assert r.status_code == 400


# ---------------------------------------------------------------------------
# Imported products must actually reach the storefront
#
# The storefront accepts six categories and drops anything else with only a log
# line. CJ sends free text, so an imported product was published and then never
# appeared — in the shop or on the admin's own products screen.
# ---------------------------------------------------------------------------

from services.background_import import (  # noqa: E402
    classify_category, _collect_images, _clean_description,
)


@pytest.mark.parametrize("payload,expected", [
    ({"productNameEn": "18K Gold Plated Pendant Necklace", "categoryName": "Jewelry"}, "necklaces"),
    ({"productNameEn": "Women Stud Earrings", "categoryName": "Jewelry"}, "earrings"),
    ({"productNameEn": "Stainless Steel Bangle", "categoryName": "Jewelry"}, "bracelets"),
    ({"productNameEn": "Engagement Ring", "categoryName": "Jewelry"}, "rings"),
    ({"productNameEn": "Quartz Wristwatch", "categoryName": "Watches"}, "watches"),
    ({"productName": "قلادة ذهبية", "categoryName": ""}, "necklaces"),
    ({"productName": "طقم مجوهرات", "categoryName": ""}, "sets"),
    # Nothing recognisable still lands somewhere valid rather than nowhere.
    ({"productNameEn": "Mystery Item", "categoryName": "Other"}, "sets"),
])
def test_cj_categories_map_onto_the_six_the_shop_accepts(payload, expected):
    assert classify_category(payload) == expected


def test_an_imported_product_is_visible_in_the_shop(client):
    """The end of the pipeline: what the importer writes must survive the
    storefront's own validation, or the shop shows nothing after an import."""
    cj = {
        "productNameEn": "18K Gold Plated Pendant Necklace",
        "productName": "قلادة مطلية بالذهب",
        "categoryName": "Jewelry & Accessories",   # not one of the six
        "productImage": "https://cf.cjdropshipping.com/a.jpg",
        "productImageSet": '["https://cf.cjdropshipping.com/a.jpg","https://cf.cjdropshipping.com/b.jpg"]',
        "description": "<p>18K gold plated. <b>Hypoallergenic</b> &amp; tarnish resistant.</p>",
    }
    import asyncio
    asyncio.get_event_loop().run_until_complete(client._db.products.insert_one({
        "id": "cj-1", "source": "cj_dropshipping",
        "name": cj["productNameEn"], "description": _clean_description(cj),
        "price": 180.0, "images": _collect_images(cj),
        "category": classify_category(cj), "in_stock": True, "staging": False,
    }))

    listed = client.get("/api/products").json()
    assert [p["id"] for p in listed] == ["cj-1"], "the imported product never reached the shop"
    assert listed[0]["category"] == "necklaces"
    assert len(listed[0]["images"]) == 2, "only the thumbnail was kept"
    assert "<" not in listed[0]["description"], "HTML reached the customer"
    assert listed[0]["description"] != listed[0]["name"], "description is a copy of the title"

    # And it must be reachable through the category filter customers use.
    assert client.get("/api/products", params={"category": "necklaces"}).json()


def test_admin_listing_flags_products_the_shop_will_not_show(client):
    """
    A product can exist and still be invisible to customers. The admin screen
    has to say so — silence here is how 50 imported products go missing.
    """
    register(client, email="pv@b.com")
    make_admin(client, "pv@b.com")

    import asyncio
    asyncio.get_event_loop().run_until_complete(client._db.products.insert_many([
        {"id": "good", "name": "Ring", "description": "d", "price": 10.0,
         "category": "rings", "images": [], "staging": False},
        {"id": "bad", "name": "Broken", "description": "d", "price": 10.0,
         "category": "Jewelry & Accessories", "images": [], "staging": False},
    ]))

    rows = {p["id"]: p for p in client.get("/api/admin/products").json()}
    assert set(rows) == {"good", "bad"}, "the admin must see everything, valid or not"
    assert rows["good"]["storefront_visible"] is True
    assert rows["bad"]["storefront_visible"] is False
    assert "category" in (rows["bad"]["storefront_issue"] or "")


# ---------------------------------------------------------------------------
# CJ access tokens
#
# The client sent the account API key as the CJ-Access-Token header. CJ's
# /getAccessToken reads the request body, so authentication appeared to
# succeed while every real call came back 401 "Invalid API key or access
# token" — exactly what the Integrations screen showed.
# ---------------------------------------------------------------------------

import services.cj_client as cj_client  # noqa: E402

REAL_TOKEN = "AT-real-token-xyz"


class _FakeResponse:
    def __init__(self, status, payload):
        self.status_code, self._payload = status, payload

    def json(self):
        return self._payload

    @property
    def text(self):
        return str(self._payload)

    def raise_for_status(self):
        if self.status_code >= 400:
            import httpx
            raise httpx.HTTPStatusError("err", request=None, response=self)


class _FakeCJ:
    """Behaves the way CJ does: the token endpoint reads the body, every other
    endpoint requires the issued token in the header."""

    def __init__(self):
        self.calls = []

    async def request(self, method, url, json=None, headers=None):
        self.calls.append((url.rsplit("/api2.0", 1)[-1], (headers or {}).get("CJ-Access-Token")))
        if url.endswith("/v1/authentication/getAccessToken"):
            if json.get("email") and json.get("password"):
                return _FakeResponse(200, {"code": 200, "result": True, "data": {
                    "accessToken": REAL_TOKEN,
                    "accessTokenExpiryDate": "2030-01-01T00:00:00"}})
            return _FakeResponse(200, {"code": 1600001, "result": False, "message": "bad creds"})
        if (headers or {}).get("CJ-Access-Token") != REAL_TOKEN:
            return _FakeResponse(401, {"code": 1600001, "result": False,
                                       "message": "Invalid API key or access token"})
        return _FakeResponse(200, {"code": 200, "result": True, "data": {"list": [{"pid": "1"}]}})


@pytest.fixture
def fake_cj(monkeypatch):
    fake = _FakeCJ()
    monkeypatch.setattr(cj_client, "_client", fake)
    monkeypatch.setattr(cj_client, "CJ_EMAIL", "shop@example.com")
    monkeypatch.setattr(cj_client, "CJ_API_KEY", "APIKEY-not-a-token")
    cj_client._reset_token()
    yield fake
    cj_client._reset_token()


def test_calls_carry_the_issued_token_not_the_api_key(fake_cj):
    import asyncio
    result = asyncio.get_event_loop().run_until_complete(cj_client.list_products(1, 1))
    assert result["result"] is True

    sent = dict(fake_cj.calls)
    assert sent["/v1/product/list"] == REAL_TOKEN, "the API key was sent as the access token"
    assert sent["/v1/authentication/getAccessToken"] is None, "the token call must not need a token"


def test_the_token_is_cached_because_cj_rate_limits_issuing_it(fake_cj):
    import asyncio
    loop = asyncio.get_event_loop()
    for _ in range(3):
        loop.run_until_complete(cj_client.list_products(1, 1))
    auths = [c for c in fake_cj.calls if "getAccessToken" in c[0]]
    assert len(auths) == 1, f"authenticated {len(auths)} times for three calls"


def test_a_rejected_token_is_refreshed_and_the_call_retried(fake_cj):
    import asyncio
    loop = asyncio.get_event_loop()
    loop.run_until_complete(cj_client.list_products(1, 1))

    # CJ revoked it: the next call 401s, and the client must recover by itself.
    cj_client._token = "stale-token"
    result = loop.run_until_complete(cj_client.list_products(1, 1))
    assert result["result"] is True
    assert len([c for c in fake_cj.calls if "getAccessToken" in c[0]]) == 2


def test_a_failure_reported_with_http_200_is_still_a_failure(fake_cj, monkeypatch):
    """CJ answers many errors with 200 and result=false. Treating that as
    success is how a broken connection reported itself healthy."""
    monkeypatch.setattr(cj_client, "CJ_EMAIL", "")
    cj_client._reset_token()
    import asyncio
    with pytest.raises(cj_client.CJError):
        asyncio.get_event_loop().run_until_complete(cj_client.list_products(1, 1))


def test_missing_credentials_say_which_variables_to_set(fake_cj, monkeypatch):
    monkeypatch.setattr(cj_client, "CJ_EMAIL", "")
    cj_client._reset_token()
    import asyncio
    with pytest.raises(cj_client.CJError) as e:
        asyncio.get_event_loop().run_until_complete(cj_client._get_access_token())
    assert "CJ_DROPSHIP_EMAIL" in str(e.value)


def test_the_token_call_uses_the_versioned_path(fake_cj):
    """
    Every other call in this client is versioned (/v1/product/list); the token
    call was not, so it addressed a path CJ does not serve. The sibling client
    in this same repo had it right, which is what gave the mismatch away.
    """
    import asyncio
    asyncio.get_event_loop().run_until_complete(cj_client.list_products(1, 1))
    paths = [p for p, _ in fake_cj.calls]
    assert "/v1/authentication/getAccessToken" in paths, paths
