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
    # A product exactly as Quick Import writes it: in stock, waiting for the
    # owner to review the supplier's title and price before it goes live.
    {"id": "p3", "name": "Staged", "description": "not live", "price": 10.0,
     "category": "rings", "images": [], "in_stock": True, "staging": True},
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


# The payload CheckoutPage actually posts. Pinning the tests to it means a
# validator that would reject a real customer fails here first.
SHIPPING = {
    "firstName": "Younes", "lastName": "S", "email": "c@x.com",
    "phone": "+966500000000", "street": "King Fahd Rd 12",
    "city": "Riyadh", "state": "Riyadh", "zipCode": "11564", "country": "SA",
}


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
    body = r.json()
    assert body["status"] == "ok"
    # Which code is answering. Without this on the endpoint, "did the fix
    # reach production yet?" was unanswerable, and a retry against the old
    # deploy looked like the fix failing.
    assert body["version"], body


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


def _expired_bearer(email="stale@b.com"):
    """A syntactically perfect access token that expired an hour ago."""
    from datetime import timedelta
    from core.security import create_access_token
    return create_access_token({"sub": email, "user_id": "whoever"},
                               expires_delta=timedelta(hours=-1))


def test_an_expired_header_does_not_bury_a_live_cookie(client):
    """
    How an admin got locked out of the dashboard with a perfectly good session:

    AuthContext sets a global Authorization header from localStorage. The
    server read the header first and stopped there. Once the stored token
    expired, every call 401'd; the axios interceptor refreshed — which renews
    the *cookie* and never touches localStorage — and retried with the same
    dead header. 401 again, forever, while a valid cookie sat unread.
    """
    register(client, email="locked@b.com")
    make_admin(client, "locked@b.com")

    r = client.get("/api/admin/products",
                   headers={"Authorization": f"Bearer {_expired_bearer()}"})
    assert r.status_code == 200, f"a live cookie was ignored: {r.text}"


def test_a_malformed_header_does_not_bury_a_live_cookie(client):
    register(client, email="garbled@b.com")
    r = client.get("/api/auth/me", headers={"Authorization": "Bearer not-a-jwt"})
    assert r.status_code == 200, r.text


def test_an_expired_header_with_no_cookie_is_still_rejected(client):
    """The fallback must not become a way in for anyone without credentials."""
    register(client, email="nocookie@b.com")
    client.cookies.clear()
    r = client.get("/api/auth/me",
                   headers={"Authorization": f"Bearer {_expired_bearer()}"})
    assert r.status_code == 401, r.text
    assert "expired" in r.json()["detail"].lower(), r.json()


def test_refresh_hands_back_a_token_the_client_can_store(client):
    """
    The interceptor now writes this into localStorage and the default header;
    without it in the body there is nothing to replace the stale token with.
    """
    register(client, email="tok@b.com")
    body = client.post("/api/auth/refresh").json()
    assert body.get("access_token"), body


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


# --- the staging boundary --------------------------------------------------
#
# Quick Import writes supplier products with staging=True so the owner can fix
# the price and rewrite the machine-translated title before pressing "Live".
# Only the listing honoured that. Every other read of db.products was
# unfiltered, so "not published yet" meant nothing more than "not in the grid".

def test_a_staging_product_is_not_openable_by_url(seeded):
    """The listing hid p3; its own page served it in full to anyone."""
    assert seeded.get("/api/products/p3").status_code == 404


def test_a_staging_product_cannot_be_added_to_a_cart(seeded):
    register(seeded, email="cart-staging@b.com")
    r = seeded.post("/api/cart/add?product_id=p3&quantity=1")
    assert r.status_code == 404, "an unreviewed product was sellable"
    assert seeded.get("/api/cart").json()["items"] == []


def test_a_staging_product_cannot_be_wishlisted(seeded):
    register(seeded, email="wish-staging@b.com")
    assert seeded.post("/api/wishlist/add", json={"product_id": "p3"}).status_code == 404


def test_a_product_pulled_back_to_staging_leaves_the_wishlist(seeded):
    """Wishlisted while live, then withdrawn — it must stop being shown."""
    import asyncio
    register(seeded, email="wish-pulled@b.com")
    assert seeded.post("/api/wishlist/add", json={"product_id": "p1"}).status_code == 200

    asyncio.get_event_loop().run_until_complete(
        seeded._db.products.update_one({"id": "p1"}, {"$set": {"staging": True}})
    )
    body = seeded.get("/api/wishlist").json()
    assert body["products"] == [], "a withdrawn product still rendered"
    assert body["product_ids"] == ["p1"], "the id is kept so it returns if re-published"


def test_staging_products_are_not_submitted_to_google(seeded):
    """
    The worst of the leaks: sitemap.xml selected on in_stock alone, so every
    unreviewed import was handed to Search Console with the supplier's raw
    title and an unedited price.
    """
    body = seeded.get("/sitemap.xml").text
    assert "/product/p1" in body, "live products must still be listed"
    assert "/product/p3" not in body, "an unreviewed product was published to Google"


def test_a_staging_product_is_not_priceable_at_checkout(seeded):
    r = seeded.post("/api/shipping/estimate", json={
        "country_code": "SA",
        "items": [{"product_id": "p3", "quantity": 2}],
    })
    assert r.status_code == 200
    assert r.json()["subtotal"] == 0.0, "checkout priced an unpublished product"


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

    r = seeded.post("/api/orders", json={"shipping_address": SHIPPING, "payment_method": "on_confirmation"})
    assert r.status_code == 200, r.text
    order = r.json()
    assert order["total_amount"] == 500.0

    assert seeded.get("/api/cart").json()["total_amount"] == 0.0
    assert len(seeded.get("/api/orders").json()) == 1
    assert len(seeded.get("/api/orders/my-orders").json()["orders"]) == 1
    # No tracking number is minted at checkout any more; the order number is
    # what the customer is given, and it has to work.
    assert order["tracking_number"] is None, "a tracking number was invented"
    assert seeded.get(f"/api/orders/track/{order['order_number']}").status_code == 200


def test_an_address_a_supplier_cannot_ship_to_is_refused(seeded):
    """
    shipping_address arrived as a free Dict[str, Any] that nothing looked
    inside. An order with no phone number or no country was accepted, the cart
    emptied, and the customer told it was placed — while no dropshipper on
    earth could move the parcel. Refuse it while they can still fix it.
    """
    register(seeded, email="addr@b.com")
    seeded.post("/api/cart/add?product_id=p1&quantity=1")

    r = seeded.post("/api/orders", json={
        "shipping_address": {"city": "Riyadh"}, "payment_method": "on_confirmation"})
    assert r.status_code == 400, r.text
    detail = r.json()["detail"]
    for label in ("recipient name", "phone number", "country", "street address"):
        assert label in detail, detail

    # And the cart is untouched, so nothing is lost by the refusal.
    assert seeded.get("/api/cart").json()["items"], "the cart was emptied by a refused order"


def test_the_address_the_checkout_page_sends_is_accepted(seeded):
    """
    The validator must speak the checkout page's field names. It posts
    firstName/lastName and `street`; demanding fullName/address would have
    turned away every real customer.
    """
    register(seeded, email="realaddr@b.com")
    seeded.post("/api/cart/add?product_id=p1&quantity=1")
    r = seeded.post("/api/orders", json={
        "shipping_address": SHIPPING, "payment_method": "on_confirmation"})
    assert r.status_code == 200, r.text


def test_an_order_is_priced_from_the_catalogue_not_the_cart(seeded):
    """
    The cart stores the price captured when the item went in, and nothing
    checked it again — so a supplier price sync between browsing and checkout
    sold at whatever the cart happened to remember.
    """
    import asyncio
    register(seeded, email="price@b.com")
    seeded.post("/api/cart/add?product_id=p1&quantity=2")   # 250 each

    asyncio.get_event_loop().run_until_complete(
        seeded._db.products.update_one({"id": "p1"}, {"$set": {"price": 300.0}}))

    order = seeded.post("/api/orders", json={
        "shipping_address": SHIPPING, "payment_method": "on_confirmation"}).json()
    assert order["total_amount"] == 600.0, order
    assert order["items"][0]["price"] == 300.0


def test_an_order_carries_what_the_supplier_needs_to_ship_it(seeded):
    """A line that outlives the product document it came from."""
    import asyncio
    register(seeded, email="supl@b.com")
    asyncio.get_event_loop().run_until_complete(
        seeded._db.products.update_one({"id": "p1"}, {"$set": {
            "source": "cj_dropshipping", "external_id": "CJ-777", "sku": "SKU-777"}}))
    seeded.post("/api/cart/add?product_id=p1&quantity=1")

    order = seeded.post("/api/orders", json={
        "shipping_address": SHIPPING, "payment_method": "on_confirmation"}).json()
    line = order["items"][0]
    assert line["supplier"] == "cj_dropshipping"
    assert line["supplier_product_id"] == "CJ-777"
    assert line["supplier_sku"] == "SKU-777"
    assert line["product_name"]


def test_a_withdrawn_product_cannot_be_ordered_from_a_stale_cart(seeded):
    """Added while on sale, pulled before checkout: the order must not go through."""
    import asyncio
    register(seeded, email="gone@b.com")
    seeded.post("/api/cart/add?product_id=p1&quantity=1")

    asyncio.get_event_loop().run_until_complete(
        seeded._db.products.update_one({"id": "p1"}, {"$set": {"is_active": False}}))

    r = seeded.post("/api/orders", json={
        "shipping_address": SHIPPING, "payment_method": "on_confirmation"})
    assert r.status_code == 409, r.text


def test_an_out_of_stock_product_cannot_be_ordered(seeded):
    import asyncio
    register(seeded, email="oos@b.com")
    seeded.post("/api/cart/add?product_id=p1&quantity=1")

    asyncio.get_event_loop().run_until_complete(
        seeded._db.products.update_one({"id": "p1"}, {"$set": {"in_stock": False}}))

    r = seeded.post("/api/orders", json={
        "shipping_address": SHIPPING, "payment_method": "on_confirmation"})
    assert r.status_code == 409, r.text
    assert "stock" in r.json()["detail"].lower()


# --- an order waits for a human, and the human is told --------------------

def _place_order(seeded, email="buyer@b.com"):
    register(seeded, email=email)
    seeded.post("/api/cart/add?product_id=p1&quantity=1")
    return seeded.post("/api/orders", json={
        "shipping_address": SHIPPING, "payment_method": "on_confirmation"}).json()


def _confirm_payment(seeded, order_id, reference="TEST-REF"):
    """Record that the money arrived. The caller must already be an admin."""
    r = seeded.post(f"/api/admin/orders/{order_id}/confirm-payment",
                    json={"paid": True, "reference": reference})
    assert r.status_code == 200, r.text
    return r.json()


def test_a_new_order_emails_the_owner(seeded, monkeypatch):
    """
    Nothing is bought from the supplier until a human approves it, so the queue
    is invisible unless someone thinks to open the dashboard. The owner gets
    told.
    """
    import services.email_service as email_service
    sent = []
    monkeypatch.setattr(email_service, "SENDGRID_API_KEY", "sg-test-key")
    monkeypatch.setattr(email_service, "send_email",
                        lambda **kw: sent.append(kw) or True)

    order = _place_order(seeded, "mailed@b.com")

    assert len(sent) == 1, f"the owner was not told: {sent}"
    body = sent[0]["html_content"]
    assert order["order_number"] in sent[0]["subject"]
    assert order["order_number"] in body
    assert SHIPPING["phone"] in body, "the alert must carry what is needed to judge it"
    assert "Riyadh" in body


def test_a_dead_mail_provider_never_costs_a_customer_their_order(seeded, monkeypatch):
    """The alert is best-effort; the order is not."""
    import services.email_service as email_service

    def explode(**kwargs):
        raise RuntimeError("SendGrid is down")

    monkeypatch.setattr(email_service, "SENDGRID_API_KEY", "sg-test-key")
    monkeypatch.setattr(email_service, "send_email", explode)

    order = _place_order(seeded, "resilient@b.com")
    assert order["order_number"], order
    assert seeded.get("/api/cart").json()["items"] == []


def test_a_new_order_waits_for_approval_and_says_so(seeded):
    # Place the order first: registering swaps the session cookie, so an admin
    # registered beforehand is no longer the caller by the time the list is read.
    _place_order(seeded, "waiter@b.com")
    register(seeded, email="adm-o@b.com")
    make_admin(seeded, "adm-o@b.com")

    rows = seeded.get("/api/admin/orders").json()
    assert isinstance(rows, list), rows
    assert rows[0]["supplier_status"] == "awaiting_approval", rows[0]
    assert rows[0]["supplier_order_id"] is None


def test_sending_to_the_supplier_needs_an_admin(seeded):
    order = _place_order(seeded, "notadmin@b.com")
    r = seeded.post(f"/api/admin/orders/{order['id']}/send-to-supplier")
    assert r.status_code in (401, 403), r.text


def test_an_order_with_no_supplier_reference_is_not_sent(seeded):
    """
    A line the supplier cannot identify must stop the whole order: half an
    order sent is worse than none, because the customer is charged for all of
    it and receives part.
    """
    order = _place_order(seeded, "nosup@b.com")
    register(seeded, email="adm-ns@b.com")
    make_admin(seeded, "adm-ns@b.com")
    _confirm_payment(seeded, order["id"])

    r = seeded.post(f"/api/admin/orders/{order['id']}/send-to-supplier")
    assert r.status_code == 400, r.text
    assert "supplier reference" in r.json()["detail"]


def _set_bank(seeded, **overrides):
    body = {
        "bank_transfer": {
            "enabled": True,
            "bank_name": "VakifBank",
            "account_holder": "Auraa Luxury",
            "iban": "tr33 0006 1005 1978 6457 8413 26",
            "swift": "TVBATR2A",
            **overrides,
        },
    }
    return seeded.put("/api/admin/payment-settings", json=body)


def test_a_half_filled_bank_account_is_never_offered_to_a_customer(seeded):
    """
    A bank block with no IBAN is not a payment method, it is a dead end: the
    customer reads "bank transfer", opens their banking app, and there is
    nothing to type. Turning it on without one is refused, and the name of the
    missing field is said out loud while it can still be typed.
    """
    register(seeded, email="adm-bank@b.com")
    make_admin(seeded, "adm-bank@b.com")

    bad = _set_bank(seeded, iban="")
    assert bad.status_code == 400, bad.text
    assert "iban" in bad.json()["detail"].lower()

    offered = {m["id"] for m in seeded.get("/api/payment-methods").json()["methods"]}
    assert "bank_transfer" not in offered, offered

    # And again from the other side. Refusing to *write* an incomplete account
    # is not the same guard as refusing to *offer* one: a document written
    # before that check existed, or edited straight in the database, still has
    # to be caught on the way out. Checking only the write leaves this test
    # passing with the read-side guard deleted.
    import asyncio
    asyncio.get_event_loop().run_until_complete(
        seeded._db.site_config.update_one(
            {"_id": "store_payment"},
            {"$set": {"bank_transfer": {"enabled": True, "bank_name": "VakifBank",
                                        "account_holder": "Auraa Luxury", "iban": ""}}},
            upsert=True,
        ))
    offered = {m["id"] for m in seeded.get("/api/payment-methods").json()["methods"]}
    assert "bank_transfer" not in offered, "an account with no IBAN was offered to customers"


def test_the_iban_a_customer_is_shown_is_the_one_that_was_saved(seeded):
    register(seeded, email="adm-bank2@b.com")
    make_admin(seeded, "adm-bank2@b.com")
    assert _set_bank(seeded).status_code == 200

    methods = seeded.get("/api/payment-methods").json()["methods"]
    bank = next(m for m in methods if m["id"] == "bank_transfer")
    # Stored the way a bank prints it, offered the way it must be typed.
    assert bank["iban"] == "TR330006100519786457841326"
    assert bank["bank_name"] == "VakifBank"
    assert bank["swift"] == "TVBATR2A"


def test_an_order_cannot_be_placed_by_a_method_the_shop_does_not_offer(seeded):
    """
    An order placed by a method nobody runs is an order nobody can pay: the
    customer is told it went through and then hears nothing, because there is
    no account for the money to arrive in.
    """
    register(seeded, email="ghostpay@b.com")
    seeded.post("/api/cart/add?product_id=p1&quantity=1")
    r = seeded.post("/api/orders", json={
        "shipping_address": SHIPPING, "payment_method": "bitcoin"})
    assert r.status_code == 400, r.text
    assert "bitcoin" in r.json()["detail"]
    # And the cart is intact, so they can pick a real method and carry on.
    assert seeded.get("/api/cart").json()["items"], "the cart was emptied by a rejected order"


def test_a_customer_can_read_back_how_to_pay_for_their_own_order(seeded):
    """
    A customer who closes the tab after checkout has no other route back to the
    account details, and asking them to email for them is a good way to lose
    the sale.
    """
    register(seeded, email="adm-inst@b.com")
    make_admin(seeded, "adm-inst@b.com")
    assert _set_bank(seeded).status_code == 200

    register(seeded, email="reader@b.com")
    seeded.post("/api/cart/add?product_id=p1&quantity=1")
    order = seeded.post("/api/orders", json={
        "shipping_address": SHIPPING, "payment_method": "bank_transfer"}).json()

    info = seeded.get(f"/api/orders/{order['id']}/payment-instructions")
    assert info.status_code == 200, info.text
    body = info.json()
    assert body["payment_status"] == "awaiting_payment"
    assert body["method"]["iban"] == "TR330006100519786457841326"
    # Without a reference the money arrives belonging to nobody.
    assert body["reference_to_quote"] == order["order_number"]
    assert body["amount"] == order["total_amount"]


def test_one_customer_cannot_read_another_customers_payment_details(seeded):
    order = _place_order(seeded, "victim@b.com")
    register(seeded, email="snoop@b.com")
    r = seeded.get(f"/api/orders/{order['id']}/payment-instructions")
    assert r.status_code == 404, r.text


# --- the card gateway ------------------------------------------------------
#
# The dangerous half of a payment integration is not taking the money, it is
# deciding an order is paid. The browser comes back from the provider carrying
# a token, and anyone can type a URL — so the only thing these tests really
# guard is that nothing but a signed answer from iyzico, fetched over our own
# connection, is ever allowed to flip that flag.

def _iyzico_signature(secret, fields):
    import hashlib
    import hmac
    return hmac.new(secret.encode(), ":".join(fields).encode(), hashlib.sha256).hexdigest()


class _FakeIyzico:
    """Stands in for iyzico's HTTP API, signing exactly as iyzico does."""

    SECRET = "sandbox-secret"

    def __init__(self, paid=True, paid_price="24.85", sign=True):
        self.paid, self.paid_price, self.sign = paid, paid_price, sign
        self.calls = []

    async def post(self, path, payload):
        self.calls.append((path, payload))
        if path.endswith("/initialize/ecom"):
            body = {"status": "success", "conversationId": payload["conversationId"],
                    "token": "TOK-1", "paymentPageUrl": "https://sandbox-cpp.iyzipay.com/TOK-1"}
            body["signature"] = _iyzico_signature(
                self.SECRET, [body["conversationId"], body["token"]])
            return body

        body = {
            "status": "success",
            "paymentStatus": "SUCCESS" if self.paid else "FAILURE",
            "paymentId": "PAY-1",
            "currency": "USD",
            "basketId": "AUR-TEST",
            "conversationId": payload["conversationId"],
            "paidPrice": self.paid_price,
            "price": self.paid_price,
            "errorMessage": None if self.paid else "Card declined",
        }
        fields = [body["paymentStatus"], body["paymentId"], body["currency"],
                  body["basketId"], body["conversationId"],
                  str(body["paidPrice"]), str(body["price"]), payload["token"]]
        body["signature"] = _iyzico_signature(self.SECRET, fields) if self.sign else "deadbeef"
        return body


@pytest.fixture
def card_shop(seeded, monkeypatch):
    """A shop with the card gateway switched on and a rate SAR->USD known."""
    from services import iyzico_client

    fake = _FakeIyzico()
    monkeypatch.setattr(iyzico_client, "API_KEY", "sandbox-key")
    monkeypatch.setattr(iyzico_client, "SECRET_KEY", _FakeIyzico.SECRET)
    monkeypatch.setattr(iyzico_client, "CURRENCY", "USD")
    monkeypatch.setattr(iyzico_client, "_post", fake.post)

    import services.currency_service as currency_service

    class _Rates:
        async def convert_currency(self, amount, frm, to):
            return round(amount * 0.2665, 2) if (frm, to) == ("SAR", "USD") else None

    monkeypatch.setattr(currency_service, "get_currency_service", lambda db: _Rates())
    return fake


def test_a_configured_card_gateway_is_the_only_method_offered(seeded, card_shop):
    """
    A wire transfer to a Turkish account is a real way to be paid and a poor
    way to be bought from — nobody abroad completes one for a pair of
    earrings. Once cards work it steps aside rather than sitting there as a
    worse choice next to a better one.
    """
    register(seeded, email="adm-card@b.com")
    make_admin(seeded, "adm-card@b.com")
    assert _set_bank(seeded).status_code == 200

    offered = [m["id"] for m in seeded.get("/api/payment-methods").json()["methods"]]
    assert offered == ["card"], offered


def test_paying_by_card_never_marks_the_order_paid_on_its_own(seeded, card_shop):
    """
    Opening a payment session is not payment. Until iyzico says otherwise the
    order is unpaid, and the gate on buying from the supplier holds.
    """
    register(seeded, email="cardbuyer@b.com")
    seeded.post("/api/cart/add?product_id=p1&quantity=1")
    order = seeded.post("/api/orders", json={
        "shipping_address": SHIPPING, "payment_method": "card"}).json()

    r = seeded.post(f"/api/orders/{order['id']}/pay-session")
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["payment_page_url"].startswith("https://")
    # 250 SAR at the fixture's rate (250 * 0.2665 = 66.625, rounded down).
    assert body["amount"] == 66.62, body
    assert body["currency"] == "USD"

    info = seeded.get(f"/api/orders/{order['id']}/payment-instructions").json()
    assert info["payment_status"] == "awaiting_payment", info


def test_a_callback_with_a_made_up_token_pays_for_nothing(seeded, card_shop):
    """The token arrives in a browser, and a browser is not a witness."""
    register(seeded, email="forger@b.com")
    seeded.post("/api/cart/add?product_id=p1&quantity=1")
    order = seeded.post("/api/orders", json={
        "shipping_address": SHIPPING, "payment_method": "card"}).json()
    seeded.post(f"/api/orders/{order['id']}/pay-session")

    seeded.post("/api/payments/iyzico/callback", data={"token": "TOK-WHATEVER"},
                follow_redirects=False)

    info = seeded.get(f"/api/orders/{order['id']}/payment-instructions").json()
    assert info["payment_status"] == "awaiting_payment", info


def test_a_callback_whose_signature_does_not_verify_pays_for_nothing(seeded, card_shop):
    """
    The reply carries iyzico's own HMAC over its contents. Without checking
    it, anyone who could answer in iyzico's place — or replay a stale body —
    could hand this shop a free order.
    """
    register(seeded, email="unsigned@b.com")
    seeded.post("/api/cart/add?product_id=p1&quantity=1")
    order = seeded.post("/api/orders", json={
        "shipping_address": SHIPPING, "payment_method": "card"}).json()
    seeded.post(f"/api/orders/{order['id']}/pay-session")

    card_shop.sign = False      # same SUCCESS body, signature no longer iyzico's
    seeded.post("/api/payments/iyzico/callback", data={"token": "TOK-1"},
                follow_redirects=False)

    info = seeded.get(f"/api/orders/{order['id']}/payment-instructions").json()
    assert info["payment_status"] == "awaiting_payment", info
    assert "signature" in (info["payment_error"] or "").lower(), info


def test_a_signed_success_pays_the_order_and_opens_the_supplier_gate(seeded, card_shop):
    register(seeded, email="realpay@b.com")
    seeded.post("/api/cart/add?product_id=p1&quantity=1")
    order = seeded.post("/api/orders", json={
        "shipping_address": SHIPPING, "payment_method": "card"}).json()
    started = seeded.post(f"/api/orders/{order['id']}/pay-session").json()
    card_shop.paid_price = f"{started['amount']:.2f}"

    r = seeded.post("/api/payments/iyzico/callback", data={"token": "TOK-1"},
                    follow_redirects=False)
    assert r.status_code == 303, r.text
    assert f"/order/{order['id']}/pay" in r.headers["location"]

    info = seeded.get(f"/api/orders/{order['id']}/payment-instructions").json()
    assert info["payment_status"] == "paid", info
    assert info["payment_reference"] == "PAY-1"


def test_a_declined_card_says_so_and_leaves_the_order_unpaid(seeded, card_shop):
    register(seeded, email="declined@b.com")
    seeded.post("/api/cart/add?product_id=p1&quantity=1")
    order = seeded.post("/api/orders", json={
        "shipping_address": SHIPPING, "payment_method": "card"}).json()
    seeded.post(f"/api/orders/{order['id']}/pay-session")

    card_shop.paid = False
    seeded.post("/api/payments/iyzico/callback", data={"token": "TOK-1"},
                follow_redirects=False)

    info = seeded.get(f"/api/orders/{order['id']}/payment-instructions").json()
    assert info["payment_status"] == "awaiting_payment", info
    # An abandoned payment and a refused card looked identical: both silent.
    assert "declined" in (info["payment_error"] or "").lower(), info


def test_paying_less_than_the_order_is_not_paying_the_order(seeded, card_shop):
    """
    The amount is ours to set, so iyzico reporting a smaller one means
    something in between changed it. Shipping the goods anyway is how a shop
    sells at whatever price a stranger chooses.
    """
    register(seeded, email="short@b.com")
    seeded.post("/api/cart/add?product_id=p1&quantity=1")
    order = seeded.post("/api/orders", json={
        "shipping_address": SHIPPING, "payment_method": "card"}).json()
    seeded.post(f"/api/orders/{order['id']}/pay-session")

    card_shop.paid_price = "1.00"
    seeded.post("/api/payments/iyzico/callback", data={"token": "TOK-1"},
                follow_redirects=False)

    info = seeded.get(f"/api/orders/{order['id']}/payment-instructions").json()
    assert info["payment_status"] == "awaiting_payment", info
    assert "mismatch" in (info["payment_error"] or "").lower(), info


def test_an_order_is_never_priced_by_guesswork_when_the_rate_is_unknown(seeded, card_shop, monkeypatch):
    """
    The catalogue is in SAR and iyzico does not settle SAR. With no rate, the
    only honest amount to charge a real card is none at all.
    """
    import services.currency_service as currency_service

    class _NoRates:
        async def convert_currency(self, amount, frm, to):
            return None

    monkeypatch.setattr(currency_service, "get_currency_service", lambda db: _NoRates())

    register(seeded, email="norate@b.com")
    seeded.post("/api/cart/add?product_id=p1&quantity=1")
    order = seeded.post("/api/orders", json={
        "shipping_address": SHIPPING, "payment_method": "card"}).json()

    r = seeded.post(f"/api/orders/{order['id']}/pay-session")
    assert r.status_code == 503, r.text
    assert "USD" in r.json()["detail"]


def test_the_charge_path_prices_every_currency_the_shop_displays(seeded, monkeypatch):
    """
    The storefront showed prices in TRY from the unfiltered rates endpoint
    while the charge path stored rates through a seven-currency Gulf filter —
    so a lira-configured gateway answered every card session with 503. This
    drives the real CurrencyService (no stub) with the gateway set to TRY:
    the same table that lets the shop display a currency must price it.
    """
    from services import iyzico_client
    import services.currency_service as currency_service

    fake = _FakeIyzico()
    monkeypatch.setattr(iyzico_client, "API_KEY", "sandbox-key")
    monkeypatch.setattr(iyzico_client, "SECRET_KEY", _FakeIyzico.SECRET)
    monkeypatch.setattr(iyzico_client, "CURRENCY", "TRY")
    monkeypatch.setattr(iyzico_client, "_post", fake.post)

    # A fresh real service with no provider key: rates come from the same
    # fallback table the storefront display path serves.
    monkeypatch.delenv("EXCHANGE_RATE_API_KEY", raising=False)
    monkeypatch.setattr(currency_service, "currency_service", None)

    register(seeded, email="tr-buyer@b.com")
    seeded.post("/api/cart/add?product_id=p1&quantity=1")
    order = seeded.post("/api/orders", json={
        "shipping_address": SHIPPING, "payment_method": "card"}).json()

    r = seeded.post(f"/api/orders/{order['id']}/pay-session")
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["currency"] == "TRY"

    # Expected amount from the very endpoint the storefront displays with:
    # the charge must equal what the shopper was shown, not a private table.
    shown = seeded.get("/api/auto-update/currency-rates").json()["rates"]
    expected = round(250 * (shown["TRY"] / shown["SAR"]), 2)
    assert body["amount"] == expected, body


def test_a_card_payment_sends_the_order_to_cj_by_itself(seeded, card_shop, monkeypatch):
    """
    The whole point of a dropshipping shop: the customer pays and the goods
    get bought, with nobody pressing anything in between. Before this, a paid
    order sat in the admin queue waiting for the owner to notice it — which
    is a flow no shop in the world runs.
    """
    import asyncio

    monkeypatch.setattr(cj_client, "_client", _FulfilmentCJ())
    monkeypatch.setattr(cj_client, "CJ_EMAIL", "shop@example.com")
    monkeypatch.setattr(cj_client, "CJ_API_KEY", "APIKEY")
    cj_client._reset_token()
    asyncio.get_event_loop().run_until_complete(
        seeded._db.products.update_one({"id": "p1"}, {"$set": {
            "source": "cj_dropshipping", "external_id": "CJ-777", "sku": "SKU-777"}}))

    # And the owner hears about it — once, with the outcome, not at checkout.
    import services.email_service as email_service
    sent_mail = []
    monkeypatch.setattr(email_service, "SENDGRID_API_KEY", "sg-test-key")
    monkeypatch.setattr(email_service, "send_email",
                        lambda **kw: sent_mail.append(kw) or True)

    register(seeded, email="autocj@b.com")
    seeded.post("/api/cart/add?product_id=p1&quantity=1")
    order = seeded.post("/api/orders", json={
        "shipping_address": SHIPPING, "payment_method": "card"}).json()
    assert sent_mail == [], "a card order emailed the owner before any money moved"

    started = seeded.post(f"/api/orders/{order['id']}/pay-session").json()
    card_shop.paid_price = f"{started['amount']:.2f}"

    r = seeded.post("/api/payments/iyzico/callback", data={"token": "TOK-1"},
                    follow_redirects=False)
    assert r.status_code == 303, r.text

    register(seeded, email="adm-auto@b.com")
    make_admin(seeded, "adm-auto@b.com")
    row = {o["id"]: o for o in seeded.get("/api/admin/orders").json()}[order["id"]]
    assert row["payment_status"] == "paid", row
    assert row["supplier_status"] == "sent", row
    assert row["supplier_order_id"] == "CJ-ORDER-1", row
    assert row["status"] == "processing", row
    assert "auto" in (row["sent_to_supplier_by"] or ""), row

    paths = [p for p, _ in cj_client._client.calls]
    assert "/v1/shopping/order/createOrder" in paths

    assert len(sent_mail) == 1, sent_mail
    assert "CJ-ORDER-1" in sent_mail[0]["html_content"]
    cj_client._reset_token()


def test_a_paid_order_cj_cannot_fulfil_fails_loudly_not_silently(seeded, card_shop):
    """
    Auto-send is best-effort on purpose: whether the customer paid must never
    depend on whether CJ is healthy. A line CJ cannot identify leaves the
    payment recorded and the failure — with its reason — where the owner
    already looks for failures.
    """
    register(seeded, email="autofail@b.com")
    seeded.post("/api/cart/add?product_id=p1&quantity=1")
    # p1 carries no supplier reference here, so the send cannot succeed.
    order = seeded.post("/api/orders", json={
        "shipping_address": SHIPPING, "payment_method": "card"}).json()
    started = seeded.post(f"/api/orders/{order['id']}/pay-session").json()
    card_shop.paid_price = f"{started['amount']:.2f}"

    seeded.post("/api/payments/iyzico/callback", data={"token": "TOK-1"},
                follow_redirects=False)

    register(seeded, email="adm-af@b.com")
    make_admin(seeded, "adm-af@b.com")
    row = {o["id"]: o for o in seeded.get("/api/admin/orders").json()}[order["id"]]
    assert row["payment_status"] == "paid", row
    assert row["supplier_order_id"] is None, row
    assert row["supplier_status"] == "failed", row
    assert "supplier reference" in (row["supplier_error"] or ""), row


def test_a_card_payment_cannot_be_confirmed_by_hand(seeded, card_shop):
    """
    The confirm button exists because a bank statement has a human reader.
    A card has no statement to read — iyzico's signed answer is the only
    witness — and the admin page offered the same green button on abandoned
    card sessions, one click away from spending CJ money against a payment
    that never happened.
    """
    register(seeded, email="handpay@b.com")
    make_admin(seeded, "handpay@b.com")
    seeded.post("/api/cart/add?product_id=p1&quantity=1")
    order = seeded.post("/api/orders", json={
        "shipping_address": SHIPPING, "payment_method": "card"}).json()

    r = seeded.post(f"/api/admin/orders/{order['id']}/confirm-payment",
                    json={"paid": True, "reference": "wishful thinking"})
    assert r.status_code == 409, r.text

    info = seeded.get(f"/api/orders/{order['id']}/payment-instructions").json()
    assert info["payment_status"] == "awaiting_payment", info


def test_an_abandoned_card_order_can_be_swept_away(seeded, card_shop):
    """Unpaid test orders are clutter, and clutter hides the rows that matter."""
    register(seeded, email="sweeper@b.com")
    make_admin(seeded, "sweeper@b.com")
    seeded.post("/api/cart/add?product_id=p1&quantity=1")
    order = seeded.post("/api/orders", json={
        "shipping_address": SHIPPING, "payment_method": "card"}).json()

    r = seeded.delete(f"/api/admin/orders/{order['id']}")
    assert r.status_code == 200, r.text
    ids = [o["id"] for o in seeded.get("/api/admin/orders").json()]
    assert order["id"] not in ids


def test_a_paid_order_refuses_deletion_until_cancelled(seeded, card_shop):
    """
    A paid record is money the books point at; it does not vanish on one
    click. Cancelling first is the deliberate second step.
    """
    register(seeded, email="paidsweep@b.com")
    seeded.post("/api/cart/add?product_id=p1&quantity=1")
    # p1 has no supplier reference, so the auto-send fails and the order
    # stays paid with nothing bought — the exact shape of a paid test order.
    order = seeded.post("/api/orders", json={
        "shipping_address": SHIPPING, "payment_method": "card"}).json()
    started = seeded.post(f"/api/orders/{order['id']}/pay-session").json()
    card_shop.paid_price = f"{started['amount']:.2f}"
    seeded.post("/api/payments/iyzico/callback", data={"token": "TOK-1"},
                follow_redirects=False)

    register(seeded, email="adm-sweep@b.com")
    make_admin(seeded, "adm-sweep@b.com")

    r = seeded.delete(f"/api/admin/orders/{order['id']}")
    assert r.status_code == 409, r.text

    assert seeded.put(f"/api/admin/orders/{order['id']}",
                      json={"status": "cancelled"}).status_code == 200
    r = seeded.delete(f"/api/admin/orders/{order['id']}")
    assert r.status_code == 200, r.text
    ids = [o["id"] for o in seeded.get("/api/admin/orders").json()]
    assert order["id"] not in ids


def test_an_order_bought_at_cj_keeps_its_record(seeded, card_shop, monkeypatch):
    """
    Deleting a record does not un-buy the goods: CJ still has the order and
    the shop still owes it an explanation. The record stays, full stop.
    """
    import asyncio

    monkeypatch.setattr(cj_client, "_client", _FulfilmentCJ())
    monkeypatch.setattr(cj_client, "CJ_EMAIL", "shop@example.com")
    monkeypatch.setattr(cj_client, "CJ_API_KEY", "APIKEY")
    cj_client._reset_token()
    asyncio.get_event_loop().run_until_complete(
        seeded._db.products.update_one({"id": "p1"}, {"$set": {
            "source": "cj_dropshipping", "external_id": "CJ-777", "sku": "SKU-777"}}))

    register(seeded, email="cjkeeper@b.com")
    seeded.post("/api/cart/add?product_id=p1&quantity=1")
    order = seeded.post("/api/orders", json={
        "shipping_address": SHIPPING, "payment_method": "card"}).json()
    started = seeded.post(f"/api/orders/{order['id']}/pay-session").json()
    card_shop.paid_price = f"{started['amount']:.2f}"
    seeded.post("/api/payments/iyzico/callback", data={"token": "TOK-1"},
                follow_redirects=False)

    register(seeded, email="adm-keeper@b.com")
    make_admin(seeded, "adm-keeper@b.com")
    row = {o["id"]: o for o in seeded.get("/api/admin/orders").json()}[order["id"]]
    assert row["supplier_order_id"] == "CJ-ORDER-1", row

    r = seeded.delete(f"/api/admin/orders/{order['id']}")
    assert r.status_code == 409, r.text
    assert order["id"] in [o["id"] for o in seeded.get("/api/admin/orders").json()]
    cj_client._reset_token()


def test_an_unpaid_order_is_never_bought_from_the_supplier(seeded):
    """
    Buying the goods is the point of no return: CJ ships, the money is spent,
    and there is nobody to recover it from if the customer never paid. Until
    this gate existed, "approve" was the only thing between an order arriving
    and the shop spending its own money on it — and whether the customer had
    actually paid was not recorded anywhere at all.
    """
    order = _place_order(seeded, "unpaid@b.com")
    register(seeded, email="adm-up@b.com")
    make_admin(seeded, "adm-up@b.com")

    r = seeded.post(f"/api/admin/orders/{order['id']}/send-to-supplier")
    assert r.status_code == 409, r.text
    assert "not paid" in r.json()["detail"].lower()

    # And the refusal is about payment, not about anything further down the
    # path: nothing was written to the order, so it is not marked failed.
    row = {o["id"]: o for o in seeded.get("/api/admin/orders").json()}[order["id"]]
    assert row["payment_status"] == "awaiting_payment", row
    assert row.get("supplier_status") == "awaiting_approval", row


def test_confirming_payment_records_who_said_so(seeded):
    order = _place_order(seeded, "paid@b.com")
    register(seeded, email="adm-pd@b.com")
    make_admin(seeded, "adm-pd@b.com")

    _confirm_payment(seeded, order["id"], reference="HAVALE-99")

    row = {o["id"]: o for o in seeded.get("/api/admin/orders").json()}[order["id"]]
    assert row["payment_status"] == "paid"
    assert row["payment_reference"] == "HAVALE-99"
    assert row["payment_confirmed_by"] == "adm-pd@b.com"
    assert row["payment_confirmed_at"]

    # Confirmed by mistake — it can be taken back while nothing has been spent.
    undo = seeded.post(f"/api/admin/orders/{order['id']}/confirm-payment",
                       json={"paid": False})
    assert undo.status_code == 200, undo.text
    row = {o["id"]: o for o in seeded.get("/api/admin/orders").json()}[order["id"]]
    assert row["payment_status"] == "awaiting_payment"
    assert row["payment_reference"] is None


def test_order_with_empty_cart_is_400(seeded):
    register(seeded, email="empty@b.com")
    r = seeded.post("/api/orders", json={"shipping_address": SHIPPING, "payment_method": "on_confirmation"})
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
    seeded.post("/api/orders", json={"shipping_address": SHIPPING, "payment_method": "on_confirmation"})
    seeded.cookies.clear()

    as_admin(seeded)
    r = seeded.get("/api/admin/orders")
    assert r.status_code == 200, r.text
    assert r.json()[0]["customer_email"] == "buyer@b.com"


def test_admin_can_update_order_status(seeded):
    register(seeded, email="buyer2@b.com")
    seeded.post("/api/cart/add?product_id=p1&quantity=1")
    order_id = seeded.post("/api/orders",
                           json={"shipping_address": SHIPPING, "payment_method": "on_confirmation"}).json()["id"]
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
    seeded.post("/api/orders", json={"shipping_address": SHIPPING, "payment_method": "on_confirmation"})
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
    """Behaves the way CJ does: the token endpoint is a POST that reads the
    body, every read endpoint is a GET taking query parameters, and every one
    of them requires the issued token in the header."""

    def __init__(self):
        self.calls = []
        self.requests = []

    async def request(self, method, url, json=None, params=None, headers=None):
        self.calls.append((url.rsplit("/api2.0", 1)[-1], (headers or {}).get("CJ-Access-Token")))
        self.requests.append({"method": method, "url": url, "json": json, "params": params})
        if url.endswith("/v1/authentication/getAccessToken"):
            if method != "POST":
                return _FakeResponse(200, {"code": 16900202, "result": False,
                                           "message": f"Request method '{method}' not supported"})
            # CJ wants apiKey. Sending "password" earns error 1600005.
            if (json or {}).get("email") and (json or {}).get("apiKey"):
                return _FakeResponse(200, {"code": 200, "result": True, "data": {
                    "accessToken": REAL_TOKEN,
                    "accessTokenExpiryDate": "2030-01-01T00:00:00"}})
            return _FakeResponse(200, {"code": 1600005, "result": False, "message":
                "Email or password is wrong, please check and try again. "
                "We recommend switching to the apiKey mode"})
        if (headers or {}).get("CJ-Access-Token") != REAL_TOKEN:
            return _FakeResponse(401, {"code": 1600001, "result": False,
                                       "message": "Invalid API key or access token"})
        # Reads are GETs. CJ answers anything else on them with 16900202, which
        # is precisely what the live store saw on /admin/cj/ping.
        if method != "GET":
            return _FakeResponse(200, {"code": 16900202, "result": False,
                                       "message": f"Request method '{method}' not supported"})
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


def test_reads_are_GETs_with_query_parameters(fake_cj):
    """
    Authentication succeeded and then every real call failed with

        CJ error 16900202: Request method 'POST' not supported

    because the read endpoints were called as POST with a JSON body. CJ serves
    them as GET with query parameters; only the token exchange is a POST.
    """
    import asyncio
    loop = asyncio.get_event_loop()
    loop.run_until_complete(cj_client.list_products(2, 7, keyword="ring"))
    loop.run_until_complete(cj_client.get_product_details("PID-9"))

    by_path = {r["url"].rsplit("/api2.0", 1)[-1]: r for r in fake_cj.requests}

    token_call = by_path["/v1/authentication/getAccessToken"]
    assert token_call["method"] == "POST", "the token exchange is the one POST"
    assert token_call["json"]["email"], "and it carries a body"

    listing = by_path["/v1/product/list"]
    assert listing["method"] == "GET", f"product/list sent as {listing['method']}"
    assert listing["params"] == {"pageNum": 2, "pageSize": 7, "productNameEn": "ring"}
    assert listing["json"] is None, "a GET must not carry a JSON body"

    detail = by_path["/v1/product/query"]
    assert detail["method"] == "GET", f"product/query sent as {detail['method']}"
    assert detail["params"] == {"pid": "PID-9"}
    assert detail["json"] is None


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


def test_the_token_call_sends_apikey_not_password(fake_cj):
    """
    CJ names the field apiKey. Sending it as "password" is rejected with 1600005
    and CJ's own message tells you so — the sibling client in this repo had it
    right, this one did not.
    """
    import asyncio
    asyncio.get_event_loop().run_until_complete(cj_client.list_products(1, 1))
    assert any(p.endswith("/v1/authentication/getAccessToken") for p, _ in fake_cj.calls)


# --- the import actually importing -----------------------------------------
#
# Every CJ test above proves the *client* talks to CJ. None of them proved that
# a product ever reaches the store, and it did not: bulk_import_products read
# the answer as response["result"]["data"], but CJ's "result" is a boolean, so
# .get() on it raised AttributeError — swallowed by the batch try/except and
# reported as a tidy "0 products fetched". The importer was fetching from CJ
# and throwing every answer away.

# The first title is shaped the way CJ really ships them: the whole listing
# crammed into one line, comma-separated, far past anything readable as a
# heading. A fixture with tidy names cannot catch a naming bug.
CJ_TITLE = ("Gold Plated Necklace For Women, Light Luxury High-end Chain Design, "
            "Personalized Exaggerated Stainless Steel Neck Jewelry")

CJ_CATALOGUE = [
    {"pid": "CJ-1", "productNameEn": CJ_TITLE, "productName": "قلادة مطلية بالذهب، تصميم سلسلة فاخر",
     "sellPrice": "12.50", "shippingPrice": "3.00", "weight": "0.08",
     "productImage": "https://cj/img1.jpg", "productSku": "SKU-1",
     "categoryName": "Jewelry > Necklaces", "sellQuantity": 40,
     "description": "<p>A fine gold plated necklace for everyday elegance.</p>"},
    {"pid": "CJ-2", "productNameEn": "Silver Ring", "productName": "خاتم فضّي",
     "sellPrice": "8.00", "shippingPrice": "2.00", "weight": "0.03",
     "productImage": "https://cj/img2.jpg", "productSku": "SKU-2",
     "categoryName": "Jewelry > Rings", "sellQuantity": 12,
     "description": "<p>A classic sterling silver ring, polished finish.</p>"},
]


class _CJCatalogue(_FakeCJ):
    """Answers /product/list with CJ's real envelope: data.list, not data."""

    async def request(self, method, url, json=None, params=None, headers=None):
        self.calls.append((url.rsplit("/api2.0", 1)[-1], (headers or {}).get("CJ-Access-Token")))
        self.requests.append({"method": method, "url": url, "json": json, "params": params})
        if url.endswith("/v1/authentication/getAccessToken"):
            return _FakeResponse(200, {"code": 200, "result": True, "data": {
                "accessToken": REAL_TOKEN, "accessTokenExpiryDate": "2030-01-01T00:00:00"}})
        if url.endswith("/v1/product/list"):
            return _FakeResponse(200, {"code": 200, "result": True, "message": "Success",
                                       "data": {"pageNum": 1, "pageSize": 50,
                                                "total": len(CJ_CATALOGUE),
                                                "list": CJ_CATALOGUE}})
        return _FakeResponse(200, {"code": 200, "result": True, "data": {}})


LONG_CJ_NAME = ("Ins Fashion Stainless Steel Petal Earrings 18K Gold Rotating Leaf "
                "Versatile Titanium Steel Ear Studs With A Light Luxury And High-End Feel")


def test_a_supplier_title_already_in_the_catalogue_is_shortened_on_read(seeded):
    """
    Fixing the importer did nothing for products already imported: their name
    is still the whole CJ listing, and their description is the same sentence,
    so the page prints that paragraph twice. There is no migration anyone can
    safely run against a live store, so it is corrected on read.
    """
    import asyncio
    asyncio.get_event_loop().run_until_complete(
        seeded._db.products.update_one({"id": "p1"}, {"$set": {
            "source": "cj_dropshipping", "name": LONG_CJ_NAME,
            "description": LONG_CJ_NAME}}))

    detail = seeded.get("/api/products/p1").json()
    assert len(detail["name"]) <= 60, detail["name"]
    assert detail["name"] == "Ins Fashion Stainless Steel Petal Earrings 18K Gold Rotating"
    assert detail["description"] == LONG_CJ_NAME, "the full title belongs in the body"
    assert detail["description"] != detail["name"], "heading and body were identical"

    listed = {p["id"]: p for p in seeded.get("/api/products").json()}
    assert listed["p1"]["name"] == detail["name"]

    register(seeded, email="nm@b.com")
    make_admin(seeded, "nm@b.com")
    rows = {p["id"]: p for p in seeded.get("/api/admin/products").json()}
    assert rows["p1"]["name"] == detail["name"]


def test_a_name_the_owner_wrote_is_never_rewritten(seeded):
    """The correction is for supplier rows only, and only for overlong ones."""
    import asyncio
    owner_name = "A deliberately long product name the owner chose to write out"
    asyncio.get_event_loop().run_until_complete(
        seeded._db.products.update_one({"id": "p2"}, {"$set": {
            "source": "manual", "name": owner_name}}))
    listed = {p["id"]: p for p in seeded.get("/api/products").json()}
    assert listed["p2"]["name"] == owner_name

    # A short supplier name is left alone too.
    asyncio.get_event_loop().run_until_complete(
        seeded._db.products.update_one({"id": "p1"}, {"$set": {
            "source": "cj_dropshipping", "name": "Gold Ring"}}))
    listed = {p["id"]: p for p in seeded.get("/api/products").json()}
    assert listed["p1"]["name"] == "Gold Ring"


def test_rates_fall_back_to_real_numbers_instead_of_an_empty_table(monkeypatch):
    """
    With EXCHANGE_RATE_API_KEY set, any provider failure returned {} — an empty
    table the frontend cannot convert with. Nothing looked broken; the currency
    switcher simply moved no number, on every page of the store.
    """
    import asyncio
    from services.currency_service import CurrencyService
    from mongomock_motor import AsyncMongoMockClient

    monkeypatch.setenv("EXCHANGE_RATE_API_KEY", "a-key-that-does-not-work")
    service = CurrencyService(AsyncMongoMockClient()["t"])
    rates = asyncio.get_event_loop().run_until_complete(service.get_latest_rates("USD"))

    assert rates, "an empty rate table leaves every price stuck in one currency"
    assert rates["SAR"] > 0, rates
    assert rates["USD"] == 1.0
    assert service.last_source == "fallback", "a stale table must not read as live"


def test_the_rates_endpoint_says_whether_it_is_live(client):
    body = client.get("/api/auto-update/currency-rates").json()
    assert body["rates"].get("SAR"), body
    assert body["source"] in ("live", "fallback"), body


def test_a_reference_price_that_is_not_higher_never_reaches_a_shopper(seeded):
    """
    Rows imported before the fix still carry original_price = supplier cost, so
    the page struck through 25 riyals next to a 175 riyal price under a "Save"
    badge. A crossed-out price that is not higher is wrong however it got
    there, so it is dropped on read — the catalogue is corrected without a
    migration nobody can run against a live store.
    """
    import asyncio
    asyncio.get_event_loop().run_until_complete(
        seeded._db.products.update_one({"id": "p1"}, {"$set": {
            "original_price": 25.8, "discount_percentage": 85}}))

    listed = {p["id"]: p for p in seeded.get("/api/products").json()}
    assert listed["p1"]["original_price"] is None, listed["p1"]
    assert listed["p1"]["discount_percentage"] is None

    detail = seeded.get("/api/products/p1").json()
    assert detail["original_price"] is None

    register(seeded, email="ref@b.com")
    make_admin(seeded, "ref@b.com")
    admin_rows = {p["id"]: p for p in seeded.get("/api/admin/products").json()}
    assert admin_rows["p1"]["original_price"] is None


def test_a_genuine_markdown_is_left_alone(seeded):
    """The guard must not erase a real price cut."""
    import asyncio
    asyncio.get_event_loop().run_until_complete(
        seeded._db.products.update_one({"id": "p1"}, {"$set": {
            "original_price": 400.0, "discount_percentage": 38}}))
    listed = {p["id"]: p for p in seeded.get("/api/products").json()}
    assert listed["p1"]["original_price"] == 400.0
    assert listed["p1"]["discount_percentage"] == 38


def test_an_imported_name_is_a_name_not_the_whole_listing(client, monkeypatch):
    """
    CJ titles are search bait: the entire listing crammed into one line. Used
    verbatim they made an unreadable heading, and because the description fell
    back to the same string the product page printed that paragraph twice.
    """
    import asyncio
    from services.background_import import background_import_cj_products

    monkeypatch.setattr(cj_client, "_client", _CJCatalogue())
    monkeypatch.setattr(cj_client, "CJ_EMAIL", "shop@example.com")
    monkeypatch.setattr(cj_client, "CJ_API_KEY", "APIKEY")
    cj_client._reset_token()

    asyncio.get_event_loop().run_until_complete(background_import_cj_products(
        job_id="job-n", keyword="jewelry", category_id=None,
        max_products=2, db=client._db,
    ))
    staged = asyncio.get_event_loop().run_until_complete(
        client._db.products.find({"staging": True}).to_list(length=None))

    for p in staged:
        assert len(p["name"]) <= 60, f"heading is a paragraph: {p['name']}"
        assert "," not in p["name"], f"name kept the keyword tail: {p['name']}"
        assert p["name"] and p["name_ar"]
        assert "،" not in p["name_ar"], f"the Arabic comma tail survived: {p['name_ar']}"
        assert "،" not in p["name_ar"], f"the Arabic comma tail survived: {p[chr(39)+chr(39)]}" if False else True
        assert p["description"] != p["name"], "the heading was reprinted as the body"
        assert p["description_ar"] != p["name_ar"]
    cj_client._reset_token()


def test_a_long_cj_title_survives_as_the_description(client, monkeypatch):
    """Trimming the heading must not throw the supplier's text away."""
    from services.background_import import _product_name, _clean_description
    title = ("European American Niche Design Spliced Heart Earrings For Women, "
             "Colorful Titanium Steel Earrings, Personalized Exaggerated Light "
             "Luxury Style Ear Jewelry")
    name = _product_name(title)
    assert name == "European American Niche Design Spliced Heart Earrings For"
    # No CJ description field: the full title carries the detail instead.
    assert _clean_description({"productNameEn": title}) == ""
    assert len(title) > len(name)


class _FulfilmentCJ(_FakeCJ):
    """CJ as far as fulfilment is concerned: variants, freight, orders."""

    async def request(self, method, url, json=None, params=None, headers=None):
        self.calls.append((url.rsplit("/api2.0", 1)[-1], (headers or {}).get("CJ-Access-Token")))
        self.requests.append({"method": method, "url": url, "json": json, "params": params})
        if url.endswith("/v1/authentication/getAccessToken"):
            return _FakeResponse(200, {"code": 200, "result": True, "data": {
                "accessToken": REAL_TOKEN, "accessTokenExpiryDate": "2030-01-01T00:00:00"}})
        if url.endswith("/v1/product/query"):
            return _FakeResponse(200, {"code": 200, "result": True, "data": {
                "variants": [{"vid": "VID-1", "variantSku": "SKU-777"}]}})
        if url.endswith("/v1/logistic/freightCalculate"):
            return _FakeResponse(200, {"code": 200, "result": True, "data": [
                {"logisticName": "CJPacket Ordinary", "logisticPrice": "4.20", "logisticAging": "7-12"},
                {"logisticName": "DHL", "logisticPrice": "31.00", "logisticAging": "3-5"}]})
        if url.endswith("/v1/shopping/order/createOrder"):
            # The real CJ refuses an order without the country NAME — the code
            # alone is not enough, and the store's first paid order died on
            # exactly this. The fake refuses the same way, so any payload that
            # would fail in production fails here first.
            if not (json or {}).get("shippingCountry"):
                return _FakeResponse(400, {
                    "code": 1600300, "result": False,
                    "message": "shippingCountry must be not empty",
                    "data": None, "success": False})
            return _FakeResponse(200, {"code": 200, "result": True,
                                       "data": {"orderId": "CJ-ORDER-1"}})
        return _FakeResponse(200, {"code": 200, "result": True, "data": {}})


def _order_ready_for_cj(seeded, monkeypatch, email="ful@b.com"):
    import asyncio
    monkeypatch.setattr(cj_client, "_client", _FulfilmentCJ())
    monkeypatch.setattr(cj_client, "CJ_EMAIL", "shop@example.com")
    monkeypatch.setattr(cj_client, "CJ_API_KEY", "APIKEY")
    cj_client._reset_token()

    asyncio.get_event_loop().run_until_complete(
        seeded._db.products.update_one({"id": "p1"}, {"$set": {
            "source": "cj_dropshipping", "external_id": "CJ-777", "sku": "SKU-777"}}))
    order = _place_order(seeded, email)
    register(seeded, email="adm-f@b.com")
    make_admin(seeded, "adm-f@b.com")
    # The shop is not allowed to spend money on an order it has not been paid
    # for, so anything testing the send has to get past that gate first.
    _confirm_payment(seeded, order["id"])
    return order


def test_a_send_that_crashes_still_names_its_failure(seeded, monkeypatch):
    """
    The CJ client's retrier eventually re-raises RAW httpx errors — not
    CJError — and an unnamed escape answered the browser with a bare 500,
    stored nothing on the order, and left the claim stuck in "sending" so
    every later retry was refused as already-on-its-way while nothing was on
    its way at all. Every failure must leave its name and free the claim.
    """
    order = _order_ready_for_cj(seeded, monkeypatch, email="crash@b.com")
    real_create_order = cj_client.create_order

    async def _explodes(**kwargs):
        raise RuntimeError("socket exploded mid-flight")

    monkeypatch.setattr(cj_client, "create_order", _explodes)
    r = seeded.post(f"/api/admin/orders/{order['id']}/send-to-supplier")
    assert r.status_code == 502, r.text
    assert "RuntimeError" in r.json()["detail"], r.text

    row = {o["id"]: o for o in seeded.get("/api/admin/orders").json()}[order["id"]]
    assert row["supplier_status"] == "failed", row
    assert "socket exploded" in (row["supplier_error"] or ""), row

    # And the claim is free again: the very next attempt runs — and succeeds.
    monkeypatch.setattr(cj_client, "create_order", real_create_order)
    r = seeded.post(f"/api/admin/orders/{order['id']}/send-to-supplier")
    assert r.status_code == 200, r.text
    assert r.json()["supplier_order_id"] == "CJ-ORDER-1"


def test_a_send_stuck_mid_flight_can_be_retried_once_stale(seeded, monkeypatch):
    """
    A process killed mid-send — a deploy, a crash — leaves "sending" behind
    with nobody coming back to finish it. A fresh claim stays exclusive; a
    corpse does not get to block the order forever.
    """
    import asyncio as aio
    from datetime import datetime, timezone

    order = _order_ready_for_cj(seeded, monkeypatch, email="stuck@b.com")

    # A fresh claim — another worker, seconds ago — is respected.
    aio.get_event_loop().run_until_complete(seeded._db.orders.update_one(
        {"id": order["id"]},
        {"$set": {"supplier_status": "sending",
                  "supplier_sending_at": datetime.now(timezone.utc).isoformat()}}))
    r = seeded.post(f"/api/admin/orders/{order['id']}/send-to-supplier")
    assert r.status_code == 409, r.text

    # A claim from before claims were timestamped is a corpse: retry runs.
    aio.get_event_loop().run_until_complete(seeded._db.orders.update_one(
        {"id": order["id"]},
        {"$unset": {"supplier_sending_at": ""}}))
    r = seeded.post(f"/api/admin/orders/{order['id']}/send-to-supplier")
    assert r.status_code == 200, r.text
    assert r.json()["supplier_order_id"] == "CJ-ORDER-1"


def test_a_dry_run_creates_nothing_at_the_supplier(seeded, monkeypatch):
    """
    A way to find out whether fulfilment works before a real customer's order
    depends on it. It authenticates, resolves every variant and asks CJ for
    freight — and stops there.
    """
    order = _order_ready_for_cj(seeded, monkeypatch, "dry@b.com")

    r = seeded.post(f"/api/admin/orders/{order['id']}/supplier-preview")
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["dry_run"] is True
    assert body["items"][0]["variant_id"] == "VID-1"
    assert body["would_use"]["name"] == "CJPacket Ordinary", body
    assert len(body["shipping_options"]) == 2

    paths = [p for p, _ in cj_client._client.calls]
    assert "/v1/product/query" in paths and "/v1/logistic/freightCalculate" in paths
    assert "/v1/shopping/order/createOrder" not in paths, "the dry run created an order"

    # And the order is untouched: still waiting for a human.
    rows = {o["id"]: o for o in seeded.get("/api/admin/orders").json()}
    assert rows[order["id"]]["supplier_order_id"] is None
    assert rows[order["id"]]["supplier_status"] == "awaiting_approval"
    cj_client._reset_token()


def test_a_dry_run_works_before_the_money_has_arrived(seeded, monkeypatch):
    """
    The rehearsal costs nothing and creates nothing, so waiting for payment to
    run it would only mean finding out the address is unusable after the
    customer has already sent their money.
    """
    order = _order_ready_for_cj(seeded, monkeypatch, "drynopay@b.com")
    undo = seeded.post(f"/api/admin/orders/{order['id']}/confirm-payment",
                       json={"paid": False})
    assert undo.status_code == 200, undo.text

    r = seeded.post(f"/api/admin/orders/{order['id']}/supplier-preview")
    assert r.status_code == 200, r.text
    assert r.json()["dry_run"] is True

    # But buying the goods is still refused.
    send = seeded.post(f"/api/admin/orders/{order['id']}/send-to-supplier")
    assert send.status_code == 409, send.text
    assert "not paid" in send.json()["detail"].lower()
    cj_client._reset_token()


def test_sending_records_what_the_supplier_answered(seeded, monkeypatch):
    order = _order_ready_for_cj(seeded, monkeypatch, "send@b.com")

    r = seeded.post(f"/api/admin/orders/{order['id']}/send-to-supplier")
    assert r.status_code == 200, r.text
    assert r.json()["supplier_order_id"] == "CJ-ORDER-1"
    assert "not paid" in r.json()["message"]

    rows = {o["id"]: o for o in seeded.get("/api/admin/orders").json()}
    row = rows[order["id"]]
    assert row["supplier_status"] == "sent"
    assert row["supplier_order_id"] == "CJ-ORDER-1"
    assert row["supplier_shipping_method"] == "CJPacket Ordinary"
    assert row["sent_to_supplier_by"] == "adm-f@b.com"

    # Sending twice must not buy the goods twice.
    again = seeded.post(f"/api/admin/orders/{order['id']}/send-to-supplier")
    assert again.status_code == 409, again.text
    cj_client._reset_token()


def test_a_dry_run_reports_the_same_refusal_the_real_send_would(seeded, monkeypatch):
    """
    The rehearsal is worth nothing unless it walks the same path. Break the
    variant lookup and both must fail the same way.
    """
    import asyncio

    class _NoVariants(_FulfilmentCJ):
        async def request(self, method, url, json=None, params=None, headers=None):
            if url.endswith("/v1/product/query"):
                self.calls.append((url.rsplit("/api2.0", 1)[-1], None))
                return _FakeResponse(200, {"code": 200, "result": True, "data": {"variants": []}})
            return await super().request(method, url, json, params, headers)

    order = _order_ready_for_cj(seeded, monkeypatch, "novar@b.com")
    monkeypatch.setattr(cj_client, "_client", _NoVariants())
    cj_client._reset_token()

    dry = seeded.post(f"/api/admin/orders/{order['id']}/supplier-preview")
    real = seeded.post(f"/api/admin/orders/{order['id']}/send-to-supplier")
    assert dry.status_code == real.status_code == 409, (dry.text, real.text)
    assert dry.json()["detail"] == real.json()["detail"]
    cj_client._reset_token()


def test_a_send_that_fails_before_cj_is_still_recorded_as_failed(seeded, monkeypatch):
    """
    Only a refusal from createOrder itself was written to the order. Every
    earlier way a send can fail — a variant that cannot be resolved, an address
    CJ will not accept, no shipping method to that country — raised and left
    supplier_status on "awaiting_approval".

    So the owner pressed approve, the send broke, and the order went back to
    sitting in the approval queue looking like nobody had touched it yet. The
    admin screen had no way to tell "not yet approved" from "approved, and the
    purchase failed".
    """
    class _NoVariants(_FulfilmentCJ):
        async def request(self, method, url, json=None, params=None, headers=None):
            if url.endswith("/v1/product/query"):
                self.calls.append((url.rsplit("/api2.0", 1)[-1], None))
                return _FakeResponse(200, {"code": 200, "result": True, "data": {"variants": []}})
            return await super().request(method, url, json, params, headers)

    order = _order_ready_for_cj(seeded, monkeypatch, "failrec@b.com")
    monkeypatch.setattr(cj_client, "_client", _NoVariants())
    cj_client._reset_token()

    # The rehearsal changes nothing, including this.
    assert seeded.post(f"/api/admin/orders/{order['id']}/supplier-preview").status_code == 409
    after_dry = {o["id"]: o for o in seeded.get("/api/admin/orders").json()}[order["id"]]
    assert after_dry["supplier_status"] == "awaiting_approval", after_dry

    assert seeded.post(f"/api/admin/orders/{order['id']}/send-to-supplier").status_code == 409

    row = {o["id"]: o for o in seeded.get("/api/admin/orders").json()}[order["id"]]
    assert row["supplier_status"] == "failed", row
    assert row["supplier_order_id"] is None
    # The reason has to survive to the screen, or the owner presses the same
    # button again and learns nothing.
    assert "variant" in (row["supplier_error"] or "").lower(), row
    assert row.get("supplier_failed_at")
    cj_client._reset_token()


def test_reimporting_the_same_catalogue_does_not_duplicate_products(client, monkeypatch):
    """
    The importer's existence check filtered on `import_job_id == this job`,
    which no earlier import can ever match — so every run re-created the whole
    catalogue under fresh ids. The owner pressed "استيراد سريع" twice and the
    storefront sold every product twice.

    A supplier item's identity is (source, external_id); an import that finds
    it already in the shop reports "already there", not a fresh copy and not
    a failure.
    """
    import asyncio
    from services.background_import import ImportJobManager, background_import_cj_products

    monkeypatch.setattr(cj_client, "_client", _CJCatalogue())
    monkeypatch.setattr(cj_client, "CJ_EMAIL", "shop@example.com")
    monkeypatch.setattr(cj_client, "CJ_API_KEY", "APIKEY")
    cj_client._reset_token()
    loop = asyncio.get_event_loop()
    manager = ImportJobManager(client._db)

    def run_import():
        job_id = loop.run_until_complete(manager.create_job(
            job_type="import", supplier="cj", params={"max_products": 5}))
        loop.run_until_complete(background_import_cj_products(
            job_id=job_id, keyword="jewelry", category_id=None,
            max_products=5, db=client._db))
        return loop.run_until_complete(
            client._db.import_jobs.find_one({"job_id": job_id}))

    run_import()
    first = loop.run_until_complete(
        client._db.products.count_documents({"source": "cj_dropshipping"}))
    assert first > 0

    second_job = run_import()
    second = loop.run_until_complete(
        client._db.products.count_documents({"source": "cj_dropshipping"}))
    assert second == first, f"re-import grew the catalogue from {first} to {second}"

    # And the job says so out loud instead of counting the skips as failures.
    assert second_job["result"]["skipped_existing"] == first, second_job["result"]
    assert second_job["result"]["failed"] == 0, second_job["result"]


def test_dedupe_keeps_the_copy_the_order_history_points_at(seeded):
    """
    Collapsing duplicates must not orphan what was sold or empty anyone's
    cart. The survivor is the copy an order references — even a staging one —
    and carts pointing at a removed copy are re-pointed, because the product
    is still on sale and "no longer available" about it would be a lie.
    """
    import asyncio
    loop = asyncio.get_event_loop()

    common = {"source": "cj_dropshipping", "external_id": "CJ-DUP-1",
              "name": "خاتم مكرّر", "price": 120.0, "is_active": True, "in_stock": True}
    loop.run_until_complete(seeded._db.products.insert_many([
        {**common, "id": "dupA", "staging": True, "created_at": "2026-01-01T00:00:00"},
        {**common, "id": "dupB", "staging": False, "created_at": "2026-02-01T00:00:00"},
        {**common, "id": "dupC", "staging": False, "created_at": "2026-03-01T00:00:00"},
    ]))
    # An old order bought the oldest, staging copy…
    loop.run_until_complete(seeded._db.orders.insert_one({
        "id": "ord-dup", "user_id": "u-x", "status": "delivered",
        "items": [{"product_id": "dupA", "quantity": 1, "price": 120.0}],
    }))
    # …and a live cart holds one of the copies about to be removed.
    loop.run_until_complete(seeded._db.carts.insert_one({
        "user_id": "u-cart",
        "items": [{"product_id": "dupC", "quantity": 2, "price": 120.0}],
    }))

    register(seeded, email="adm-dup@b.com")
    make_admin(seeded, "adm-dup@b.com")

    report = seeded.get("/api/admin/products/duplicates").json()
    assert report["duplicates"] == 2, report

    r = seeded.post("/api/admin/products/dedupe")
    assert r.status_code == 200, r.text
    assert r.json()["removed"] == 2, r.json()

    left = loop.run_until_complete(
        seeded._db.products.find({"external_id": "CJ-DUP-1"}).to_list(length=None))
    assert [p["id"] for p in left] == ["dupA"], left

    cart = loop.run_until_complete(seeded._db.carts.find_one({"user_id": "u-cart"}))
    assert cart["items"][0]["product_id"] == "dupA", cart["items"]
    assert cart["items"][0]["quantity"] == 2, cart["items"]


def test_an_import_never_invents_a_discount(client, monkeypatch):
    """
    original_price was set to the supplier's cost. The product page renders
    that struck through beside a "Save %" badge — so every import advertised a
    saving off a price *lower* than the one being charged, and printed the
    wholesale cost for every shopper to read.
    """
    import asyncio
    from services.background_import import background_import_cj_products

    monkeypatch.setattr(cj_client, "_client", _CJCatalogue())
    monkeypatch.setattr(cj_client, "CJ_EMAIL", "shop@example.com")
    monkeypatch.setattr(cj_client, "CJ_API_KEY", "APIKEY")
    cj_client._reset_token()

    asyncio.get_event_loop().run_until_complete(background_import_cj_products(
        job_id="job-d", keyword="jewelry", category_id=None,
        max_products=2, db=client._db,
    ))
    staged = asyncio.get_event_loop().run_until_complete(
        client._db.products.find({"staging": True}).to_list(length=None))

    for p in staged:
        assert not p.get("original_price"), \
            f"a crossed-out price was invented: {p.get('original_price')} vs {p['price']}"
        assert not p.get("discount_percentage")
        assert p["is_active"] is True, "imports arrived flagged inactive"
    cj_client._reset_token()


def test_products_imported_before_the_field_existed_are_not_labelled_inactive(seeded):
    """
    The admin catalogue draws its red "Inactive" badge from `is_active`, and
    this endpoint returns raw documents — so the model default never applied
    and every product stored before the field existed came back without it.
    A missing key is not "switched off"; it is "nobody ever switched it".
    """
    register(seeded, email="badge@b.com")
    make_admin(seeded, "badge@b.com")

    rows = seeded.get("/api/admin/products").json()
    assert rows, "no products returned"
    for row in rows:
        assert row["is_active"] is True, f"{row['id']} came back flagged inactive"


def test_a_product_switched_off_still_reads_as_off_in_the_admin_list(seeded):
    """The default must not paper over a real choice to hide something."""
    import asyncio
    register(seeded, email="badge2@b.com")
    make_admin(seeded, "badge2@b.com")
    asyncio.get_event_loop().run_until_complete(
        seeded._db.products.update_one({"id": "p1"}, {"$set": {"is_active": False}}))

    rows = {r["id"]: r for r in seeded.get("/api/admin/products").json()}
    assert rows["p1"]["is_active"] is False
    assert rows["p2"]["is_active"] is True


def test_a_hidden_product_leaves_the_storefront(seeded):
    """
    The admin catalogue drew a red "Inactive" badge from a field the Product
    model never had, so every product read as inactive while being live and
    sellable. The field is real now, and hiding one has to actually hide it.
    """
    import asyncio
    assert "p1" in [p["id"] for p in seeded.get("/api/products").json()]

    asyncio.get_event_loop().run_until_complete(
        seeded._db.products.update_one({"id": "p1"}, {"$set": {"is_active": False}}))

    assert "p1" not in [p["id"] for p in seeded.get("/api/products").json()]
    assert seeded.get("/api/products/p1").status_code == 404
    assert seeded.get("/sitemap.xml").text.count("/product/p1") == 0


def test_a_product_with_no_is_active_field_is_still_sold(seeded):
    """Everything imported before this field existed must stay on sale."""
    ids = [p["id"] for p in seeded.get("/api/products").json()]
    assert "p1" in ids and "p2" in ids


def test_shipping_is_free_because_the_price_already_contains_it(seeded):
    """
    pricing_service builds every sale price as
    base_cost + supplier_shipping + local_shipping + profit + tax.
    Charging a separate shipping line at checkout billed the customer for
    delivery twice.
    """
    r = seeded.post("/api/shipping/estimate", json={
        "country_code": "SA", "items": [{"product_id": "p1", "quantity": 1}]})
    assert r.status_code == 200
    body = r.json()
    assert body["shipping_cost"] == 0.0, body
    assert body["free_shipping"] is True
    assert body["shipping_included_in_price"] is True


def test_a_foreign_customer_is_not_charged_saudi_vat(seeded):
    """
    Any country without its own configuration used to be handed the *Saudi*
    one: quoted in riyals and charged 15% VAT — a tax that country never
    levied and this shop cannot remit on anyone's behalf. A Saudi seller's
    exports are zero-rated; what a foreign buyer owes is duty at their own
    border.
    """
    from services.geoip_service import GeoIPService
    service = GeoIPService()

    assert service.get_country_config("SA")["vat_rate"] == 0.15
    assert service.get_country_config("AE")["vat_rate"] == 0.05

    for code in ("DE", "US", "JP", "BR", "ZA"):
        config = service.get_country_config(code)
        assert config["vat_rate"] == 0.0, f"{code} was charged {config['vat_rate']}"
        assert config["currency"] == "USD", config
        assert config["import_duty_may_apply"] is True


def test_the_shop_says_import_duty_may_apply_before_the_order(seeded):
    """Told at checkout, not by customs holding the parcel."""
    abroad = seeded.post("/api/shipping/estimate", json={
        "country_code": "DE", "items": []}).json()
    assert abroad["import_duty_may_apply"] is True, abroad

    home = seeded.post("/api/shipping/estimate", json={
        "country_code": "SA", "items": []}).json()
    assert home["import_duty_may_apply"] is False, home


def test_a_shopper_may_name_any_country_they_live_in(seeded):
    """
    Detection required membership of a six-country Gulf list, so a customer
    saying "France" was overruled and served as Saudi Arabia.
    """
    from services.geoip_service import GeoIPService
    service = GeoIPService()

    class _Req:
        def __init__(self, params=None, headers=None):
            self.query_params = params or {}
            self.headers = headers or {}

    assert service.get_country_from_request(_Req({"country": "fr"})) == "FR"
    assert service.get_country_from_request(_Req({}, {"X-User-Country": "jp"})) == "JP"
    # Nonsense is still refused rather than passed along.
    assert service.get_country_from_request(_Req({"country": "xxx"})) == "SA"


def test_the_delivery_window_is_the_one_the_shop_promises(seeded, monkeypatch):
    """
    No country configuration in this project ever set delivery_days, so the
    window was whatever the literal default in the code happened to be — and
    changing it meant editing and redeploying. One store-wide value, settable
    without a deploy.
    """
    body = seeded.post("/api/shipping/estimate", json={
        "country_code": "SA", "items": []}).json()
    assert body["estimated_days"] == "5-15", body


def test_the_delivery_window_is_a_readable_string(seeded):
    """
    The product page read estimated_days as {min, max} and printed a literal
    "?-? days" because the server sends a string like "5-10".
    """
    body = seeded.post("/api/shipping/estimate", json={
        "country_code": "SA", "items": []}).json()
    days = body["estimated_days"]
    assert isinstance(days, str) and days.strip(), body
    assert "?" not in days


def test_a_cj_import_puts_real_products_into_staging(client, monkeypatch):
    """The whole path: CJ answers, the importer writes, staging holds them."""
    import asyncio
    from services.background_import import background_import_cj_products

    monkeypatch.setattr(cj_client, "_client", _CJCatalogue())
    monkeypatch.setattr(cj_client, "CJ_EMAIL", "shop@example.com")
    monkeypatch.setattr(cj_client, "CJ_API_KEY", "APIKEY")
    cj_client._reset_token()

    asyncio.get_event_loop().run_until_complete(background_import_cj_products(
        job_id="job-1", keyword="jewelry", category_id=None,
        max_products=2, db=client._db,
    ))

    staged = asyncio.get_event_loop().run_until_complete(
        client._db.products.find({"staging": True}).to_list(length=None))
    assert len(staged) == 2, f"nothing was imported: {staged}"

    by_sku = {p["sku"]: p for p in staged}
    necklace = by_sku["SKU-1"]
    assert necklace["name"] == "Gold Plated Necklace For Women"
    assert necklace["name_ar"] == "قلادة مطلية بالذهب"  # الجزء قبل الفاصلة
    assert necklace["category"] == "necklaces", necklace["category"]
    assert necklace["images"] == ["https://cj/img1.jpg"]
    assert "<p>" not in necklace["description"], "supplier HTML reached the store"
    assert necklace["price"] > 12.50, "the sale price must exceed the supplier cost"
    assert necklace["external_id"] == "CJ-1" and necklace["import_job_id"] == "job-1"

    assert by_sku["SKU-2"]["category"] == "rings"
    cj_client._reset_token()


def test_imported_products_stay_off_the_storefront_until_published(client, monkeypatch):
    import asyncio
    from services.background_import import background_import_cj_products

    monkeypatch.setattr(cj_client, "_client", _CJCatalogue())
    monkeypatch.setattr(cj_client, "CJ_EMAIL", "shop@example.com")
    monkeypatch.setattr(cj_client, "CJ_API_KEY", "APIKEY")
    cj_client._reset_token()

    asyncio.get_event_loop().run_until_complete(background_import_cj_products(
        job_id="job-2", keyword="jewelry", category_id=None,
        max_products=2, db=client._db,
    ))

    assert client.get("/api/products").json() == [], "unreviewed imports reached shoppers"

    register(client, email="owner@auraa.com")
    make_admin(client, "owner@auraa.com")
    staged = client.get("/api/products/staging?job_id=job-2").json()
    assert len(staged) == 2

    published = client.post("/api/products/publish-staging",
                            json={"product_ids": [p["id"] for p in staged]})
    assert published.status_code == 200 and published.json()["published"] == 2

    live = client.get("/api/products").json()
    assert {p["name"] for p in live} == {"Gold Plated Necklace For Women", "Silver Ring"}
    cj_client._reset_token()


# --- several similarly named CJ variables ----------------------------------

def _cj_env(monkeypatch, **vars):
    for name in ("CJ_DROPSHIP_API_KEY", "CJ_API_KEY", "CJ_ACCESS_TOKEN",
                 "CJ_DROPSHIP_EMAIL", "CJ_EMAIL"):
        monkeypatch.delenv(name, raising=False)
    for name, value in vars.items():
        monkeypatch.setenv(name, value)


class _PickyCJ(_FakeCJ):
    """Accepts exactly one API key, the way CJ accepts exactly one."""

    def __init__(self, good_key):
        super().__init__()
        self.good_key = good_key

    async def request(self, method, url, json=None, params=None, headers=None):
        self.calls.append((url.rsplit("/api2.0", 1)[-1], (headers or {}).get("CJ-Access-Token")))
        self.requests.append({"method": method, "url": url, "json": json, "params": params})
        if url.endswith("/v1/authentication/getAccessToken"):
            if (json or {}).get("apiKey") == self.good_key:
                return _FakeResponse(200, {"code": 200, "result": True, "data": {
                    "accessToken": REAL_TOKEN, "accessTokenExpiryDate": "2030-01-01T00:00:00"}})
            return _FakeResponse(200, {"code": 1600005, "result": False,
                                       "message": "Email or password is wrong"})
        if (headers or {}).get("CJ-Access-Token") != REAL_TOKEN:
            return _FakeResponse(401, {"code": 1600001, "result": False, "message": "bad token"})
        return _FakeResponse(200, {"code": 200, "result": True, "data": {"list": []}})


def test_the_right_key_is_found_even_when_it_is_not_the_first_variable(monkeypatch):
    """
    This deployment has both CJ_DROPSHIP_API_KEY and CJ_API_KEY. Preferring one
    and stopping meant a correct key sitting in the other variable still read as
    "Email or password is wrong".
    """
    _cj_env(monkeypatch, CJ_DROPSHIP_API_KEY="the-wrong-one",
            CJ_API_KEY="the-right-one", CJ_EMAIL="shop@example.com")
    monkeypatch.setattr(cj_client, "_client", _PickyCJ("the-right-one"))
    cj_client._reset_token()

    import asyncio
    token = asyncio.get_event_loop().run_until_complete(cj_client._get_access_token())
    assert token == REAL_TOKEN
    cj_client._reset_token()


def test_when_no_key_works_the_error_names_what_was_tried(monkeypatch):
    _cj_env(monkeypatch, CJ_DROPSHIP_API_KEY="wrong-a", CJ_API_KEY="wrong-b",
            CJ_EMAIL="shop@example.com")
    monkeypatch.setattr(cj_client, "_client", _PickyCJ("something-else"))
    cj_client._reset_token()

    import asyncio
    with pytest.raises(cj_client.CJError) as e:
        asyncio.get_event_loop().run_until_complete(cj_client._get_access_token())
    message = str(e.value)
    assert "CJ_DROPSHIP_API_KEY" in message and "CJ_API_KEY" in message
    assert "My CJ" in message, "the message must say where to get a real key"
    # The keys themselves must never appear in something an admin screen renders.
    assert "wrong-a" not in message and "wrong-b" not in message
    cj_client._reset_token()


def test_the_report_never_prints_a_key(monkeypatch):
    _cj_env(monkeypatch, CJ_API_KEY="super-secret-key-value", CJ_EMAIL="a@b.c")
    report = cj_client.credential_report()
    assert "super-secret-key-value" not in str(report)
    assert "22 chars" in report["keys"]["CJ_API_KEY"]


def test_the_email_is_shown_in_full_so_it_can_be_compared(monkeypatch):
    """
    The email was masked alongside the keys, which was caution in the wrong
    place: "in…om" cannot be compared against a CJ login, and comparing them is
    the entire reason an admin opens this screen. A key is a credential; an
    account email is an identifier, and the store's own.
    """
    _cj_env(monkeypatch, CJ_API_KEY="super-secret-key-value",
            CJ_EMAIL="info@auraaluxury.com")
    report = cj_client.credential_report()
    assert report["emails"]["CJ_EMAIL"] == "info@auraaluxury.com"
    assert report["emails"]["CJ_DROPSHIP_EMAIL"] == "unset"
    # ...and the keys stay masked in the same breath.
    assert "super-secret-key-value" not in str(report)


def test_the_rejection_message_shows_the_email_it_actually_sent(monkeypatch):
    _cj_env(monkeypatch, CJ_DROPSHIP_API_KEY="k" * 32,
            CJ_EMAIL="info@auraaluxury.com")
    monkeypatch.setattr(cj_client, "_client", _PickyCJ("nothing-matches"))
    monkeypatch.setattr(cj_client, "CJ_EMAIL_VAR", "CJ_EMAIL")
    monkeypatch.setattr(cj_client, "CJ_EMAIL", "info@auraaluxury.com")
    monkeypatch.setattr(cj_client, "CJ_API_KEY_VAR", "CJ_DROPSHIP_API_KEY")
    monkeypatch.setattr(cj_client, "CJ_API_KEY", "k" * 32)
    cj_client._reset_token()

    import asyncio
    with pytest.raises(cj_client.CJError) as e:
        asyncio.get_event_loop().run_until_complete(cj_client._get_access_token())
    message = str(e.value)
    assert "info@auraaluxury.com" in message, "the admin cannot check what was sent"
    assert "k" * 32 not in message, "the key must never be printed"
    cj_client._reset_token()


def test_each_attempt_is_named_by_the_variable_it_actually_came_from(monkeypatch):
    """
    Reproduces what the live dashboard printed:

        Tried 2 combination(s): CJ_EMAIL+CJ_API_KEY, CJ_EMAIL+CJ_API_KEY

    Two *different* keys were tried and both were reported under one name,
    because the module-level value was labelled with a hardcoded variable name
    instead of the variable it was resolved from. The report is the whole point
    of trying several — a report that cannot tell them apart is worth nothing.
    """
    _cj_env(monkeypatch, CJ_DROPSHIP_API_KEY="b" * 32, CJ_API_KEY="3" * 32,
            CJ_EMAIL="info@auraaluxury.com")
    monkeypatch.setattr(cj_client, "_client", _PickyCJ("no-key-works-here"))
    monkeypatch.setattr(cj_client, "CJ_API_KEY_VAR", "CJ_DROPSHIP_API_KEY")
    monkeypatch.setattr(cj_client, "CJ_API_KEY", "b" * 32)
    monkeypatch.setattr(cj_client, "CJ_EMAIL_VAR", "CJ_EMAIL")
    monkeypatch.setattr(cj_client, "CJ_EMAIL", "info@auraaluxury.com")
    cj_client._reset_token()

    import asyncio
    with pytest.raises(cj_client.CJError) as e:
        asyncio.get_event_loop().run_until_complete(cj_client._get_access_token())
    message = str(e.value)

    attempts = message.split("combination(s): ")[1].split(". CJ rejected")[0]
    assert attempts.count("CJ_DROPSHIP_API_KEY") == 1, attempts
    assert "CJ_API_KEY[" in attempts, attempts
    assert len(set(attempts.split("; "))) == 2, f"two attempts printed alike: {attempts}"
    # Both keys were genuinely tried, so the values are the problem.
    assert "2 distinct API key(s)" in message
    assert "b" * 32 not in message and "3" * 32 not in message
    cj_client._reset_token()


def test_rechecking_the_connection_does_not_burn_cjs_token_quota(fake_cj):
    """
    CJ issues an access token at most once per 300 seconds. The Integrations
    screen calls authenticate() on every press of "re-check", and it used to
    force a re-issue — so the second press inside five minutes came back as
    "Email or password is wrong" on a connection that was perfectly healthy.
    """
    import asyncio
    loop = asyncio.get_event_loop()
    for _ in range(3):
        loop.run_until_complete(cj_client.authenticate())
    auths = [c for c in fake_cj.calls if "getAccessToken" in c[0]]
    assert len(auths) == 1, f"re-checking three times issued {len(auths)} tokens"


def test_a_successful_check_says_which_variables_worked(monkeypatch):
    """
    Reporting only "authenticated" leaves an owner with two similarly named
    keys no way to tell which one is live, so the dead one stays forever.
    """
    _cj_env(monkeypatch, CJ_DROPSHIP_API_KEY="the-wrong-one",
            CJ_API_KEY="the-right-one", CJ_EMAIL="shop@example.com")
    monkeypatch.setattr(cj_client, "_client", _PickyCJ("the-right-one"))
    cj_client._reset_token()

    import asyncio
    result = asyncio.get_event_loop().run_until_complete(cj_client.authenticate())
    assert result["credentials_used"] == "CJ_EMAIL + CJ_API_KEY", result
    assert "the-right-one" not in str(result), "the key itself must not be reported"
    cj_client._reset_token()
