"""
Full-store integration tests.

Runs the real FastAPI app against an in-memory MongoDB, so no external
service or database is required. Every case here corresponds to a defect that
actually shipped, so these double as regression tests.

    python -m pytest tests/test_integration.py -v
"""
import os
import sys
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

from fastapi.testclient import TestClient  # noqa: E402
from mongomock_motor import AsyncMongoMockClient  # noqa: E402

import server  # noqa: E402
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
