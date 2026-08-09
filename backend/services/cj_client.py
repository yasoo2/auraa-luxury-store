# services/cj_client.py
import os
import asyncio
from typing import Any, Dict, Optional, List
import httpx
from aiolimiter import AsyncLimiter
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception, RetryCallState
import logging

logger = logging.getLogger(__name__)

CJ_BASE = os.getenv("CJ_BASE", "https://developers.cjdropshipping.com/api2.0")

# This deployment carries several similarly named variables — CJ_API_KEY and
# CJ_DROPSHIP_API_KEY both exist, and only one of them is the API key CJ wants.
# Rather than make the shop owner guess which, try each in turn and say which
# one worked.
KEY_VARS = ("CJ_DROPSHIP_API_KEY", "CJ_API_KEY", "CJ_ACCESS_TOKEN")
EMAIL_VARS = ("CJ_DROPSHIP_EMAIL", "CJ_EMAIL")


def _resolve(names):
    """The first variable in `names` that holds a value, and that value."""
    for name in names:
        value = os.getenv(name)
        if value:
            return name, value
    return "", ""


# Keep the variable each value came from. Reporting a value under a name it did
# not come from is how the first version of this printed the same label twice —
# two different keys were tried and the message called both CJ_API_KEY.
CJ_API_KEY_VAR, CJ_API_KEY = _resolve(KEY_VARS)
CJ_EMAIL_VAR, CJ_EMAIL = _resolve(EMAIL_VARS)


def _fingerprint(value: str) -> str:
    """Enough to tell two values apart, never enough to use one."""
    if not value:
        return "unset"
    return f"{value[:2]}…{value[-2:]} ({len(value)} chars)"


def _shown_email(value: str) -> str:
    """
    The email in full.

    It was masked alongside the keys at first, which was caution in the wrong
    place. An API key is a credential; an account email is an identifier, and
    it is the store's own — already on its invoices and its contact page.
    Masking it hid the one thing this screen exists to let an admin check:
    whether the address configured here is the address CJ knows. "in…om" is
    not something anyone can compare against their CJ login.
    """
    return value or "unset"


def credential_report() -> Dict[str, Any]:
    """
    Which CJ variables this deployment has, and how they differ. Emails in
    full so they can be compared against the CJ account; keys fingerprinted,
    because those are secrets and this text is rendered on a screen.
    """
    return {
        "emails": {v: _shown_email(os.getenv(v) or "") for v in EMAIL_VARS},
        "keys": {v: _fingerprint(os.getenv(v) or "") for v in KEY_VARS},
    }


def _candidates(names, override_var, override_value, fallback_label):
    """
    Every distinct value the environment offers for `names`, in preference
    order, each labelled with the variable it actually came from.

    The module-level value leads: it is what an explicit override sets. It is
    labelled with the variable it was resolved from, so two variables holding
    two different values never report under one name.
    """
    out, seen = [], set()
    if override_value:
        out.append((override_var or fallback_label, override_value))
        seen.add(override_value)
    for name in names:
        value = os.getenv(name)
        if value and value not in seen:
            seen.add(value)
            out.append((name, value))
    return out


def _credential_pairs():
    """Every (email, key) worth trying, most likely first."""
    emails = _candidates(EMAIL_VARS, CJ_EMAIL_VAR, CJ_EMAIL, "CJ_EMAIL")
    keys = _candidates(KEY_VARS, CJ_API_KEY_VAR, CJ_API_KEY, "CJ_API_KEY")
    for ev, email in emails:
        for kv, key in keys:
            yield ev, email, kv, key

# غيّر القيم حسب سياسة CJ الفعلية:
REQUESTS_PER_SEC = int(os.getenv("CJ_RPS", "2"))  # حد أقصى 2 طلب/ثانية
MAX_CONCURRENCY  = int(os.getenv("CJ_MAX_CONCURRENCY", "3"))  # توازي بحد أقصى 3
TIMEOUT_SECONDS  = 40

# Limiter + Semaphore (للسرعة الآمنة)
#
# Built per running event loop, not once at import. asyncio primitives bind to
# the loop that was current when they were created, and a limiter reused across
# loops has undefined behaviour — aiolimiter says so itself in a warning. A
# process with one loop never noticed; anything that runs the client from a
# second loop got "attached to a different loop" and a 500.
_loop_state: Dict[int, Dict[str, Any]] = {}


def _state() -> Dict[str, Any]:
    loop = asyncio.get_event_loop()
    state = _loop_state.get(id(loop))
    if state is None:
        state = {
            "limiter": AsyncLimiter(REQUESTS_PER_SEC, time_period=1),
            "sem": asyncio.Semaphore(MAX_CONCURRENCY),
            "token_lock": asyncio.Lock(),
        }
        _loop_state[id(loop)] = state
    return state

# عميل HTTP واحد
_client = httpx.AsyncClient(timeout=TIMEOUT_SECONDS)

class CJError(Exception):
    pass


# --- access token -----------------------------------------------------------
#
# CJ is a two-step API: you exchange the account email and API key for an
# access token, then send that token on every other call. This client sent the
# API key itself as the CJ-Access-Token header, which is why authentication
# appeared to succeed — /getAccessToken reads the body, not the header — while
# every real call came back 401 "Invalid API key or access token".
#
# getAccessToken is rate limited to one call per 300 seconds, so caching the
# token is required for correctness, not just speed. The lock keeps a burst of
# concurrent imports from firing several authentications at once and tripping
# that limit.

_token: Optional[str] = None
_token_expires_at: float = 0.0
# Which pair of environment variables produced the token in hand. Reported to
# the admin screen so a deployment carrying duplicates can drop the unused one.
_token_source: Optional[str] = None

# Refresh a little early rather than discovering expiry mid-import.
_TOKEN_SAFETY_MARGIN = 3600  # seconds


def _reset_token() -> None:
    global _token, _token_expires_at, _token_source
    _token, _token_expires_at, _token_source = None, 0.0, None


def _parse_expiry(raw: Any) -> float:
    """CJ returns an ISO timestamp; fall back to 14 days if it is unreadable."""
    import time
    from datetime import datetime
    if isinstance(raw, str):
        for fmt in ("%Y-%m-%dT%H:%M:%S%z", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%d %H:%M:%S"):
            try:
                return datetime.strptime(raw, fmt).timestamp()
            except ValueError:
                continue
    return time.time() + 14 * 24 * 3600


async def _get_access_token(force: bool = False) -> str:
    """The cached access token, fetching a new one only when it is needed."""
    import time
    global _token, _token_expires_at, _token_source

    async with _state()["token_lock"]:
        if not force and _token and time.time() < _token_expires_at - _TOKEN_SAFETY_MARGIN:
            return _token

        pairs = list(_credential_pairs())
        if not pairs:
            raise CJError(
                "CJ credentials are not configured. Set an email in one of "
                f"{', '.join(EMAIL_VARS)} and an API key in one of "
                f"{', '.join(KEY_VARS)}."
            )

        # The field is apiKey, not password. CJ's own rejection said so:
        #   "CJ error 1600005: Email or password is wrong ... We recommend
        #    switching to the apiKey mode"
        last_error = None
        for email_var, email, key_var, key in pairs:
            logger.info(f"🔑 Requesting a CJ access token with {email_var} + {key_var}")
            try:
                data = await _request_json(
                    "POST", "/v1/authentication/getAccessToken",
                    json={"email": email, "apiKey": key},
                    authenticated=False,
                )
            except CJError as e:
                # Wrong pair; keep the reason and try the next combination.
                last_error = e
                logger.warning(f"🔑 {email_var} + {key_var} rejected: {e}")
                continue

            payload = data.get("data") or {}
            token = payload.get("accessToken")
            if not token:
                last_error = CJError(f"CJ returned no access token: {data}")
                continue

            _token = token
            _token_expires_at = _parse_expiry(payload.get("accessTokenExpiryDate"))
            _token_source = f"{email_var} + {key_var}"
            logger.info(f"🔑 CJ access token obtained using {_token_source}")
            return _token

        # Name every attempt by the variable *and* the value's fingerprint, so
        # two variables holding two different keys can never read as one.
        tried = "; ".join(
            f"{ev}[{_shown_email(email)}] + {kv}[{_fingerprint(key)}]"
            for ev, email, kv, key in pairs
        )
        distinct_keys = len({k for _, _, _, k in pairs})
        raise CJError(
            f"{last_error}. Tried {len(pairs)} combination(s): {tried}. "
            f"CJ rejected {distinct_keys} distinct API key(s) against "
            f"{len({e for _, e, _, _ in pairs})} email(s), so the values "
            "themselves are wrong, not which variable holds them. Two things "
            "make CJ answer 1600005: the email must be the one you log in to "
            "CJ with, and only the API key currently shown in My CJ → "
            "Authorization → API is valid — generating a new key revokes the "
            "old one."
        )

def _should_retry(exc: Exception) -> bool:
    """نعيد المحاولة على 429 + كل 5xx + أخطاء الشبكة"""
    if isinstance(exc, httpx.HTTPStatusError):
        return exc.response.status_code in (429, 500, 502, 503, 504)
    return isinstance(exc, (httpx.ConnectError, httpx.ReadTimeout, httpx.WriteError))

def _before_sleep(retry_state: RetryCallState):
    """لوج قبل إعادة المحاولة"""
    attempt = retry_state.attempt_number
    logger.warning(f"⏳ CJ API retry attempt {attempt} after error")

@retry(
    retry=retry_if_exception(_should_retry),
    wait=wait_exponential(multiplier=1, min=2, max=30),
    stop=stop_after_attempt(5),
    before_sleep=_before_sleep,
    reraise=True
)
async def _request_json(
    method: str,
    path: str,
    json: Optional[Dict[str, Any]] = None,
    params: Optional[Dict[str, Any]] = None,
    authenticated: bool = True,
    _retrying: bool = False,
) -> Dict[str, Any]:
    """طلب HTTP مع rate limiting و retries تلقائية"""
    # Credentials are checked where they are used — _get_access_token names
    # every variable it tried. This guard read a constant resolved at import,
    # so it fired even when a valid key was available later.
    headers = {"Content-Type": "application/json"}
    if authenticated:
        headers["CJ-Access-Token"] = await _get_access_token()

    url = f"{CJ_BASE}{path}"

    state = _state()
    async with state["sem"]:             # حد أقصى للتوازي
        async with state["limiter"]:     # حد أقصى للطلبات/الثانية
            logger.info(f"🌐 CJ API Request: {method} {path}")

            # Only send a body when there is one. `json={}` used to go out on
            # every call, which puts a body on a GET — and CJ's read endpoints
            # are GETs.
            resp = await _client.request(
                method, url, json=json, params=params, headers=headers
            )
            
            try:
                resp.raise_for_status()
            except httpx.HTTPStatusError as e:
                # نقرأ البودي لنفهم الخطأ
                body = None
                try:
                    body = resp.json()
                except Exception:
                    body = resp.text
                
                # لو 401/403/400 لا نُعيد المحاولة غالبًا
                if resp.status_code == 401 and authenticated and not _retrying:
                    logger.warning("🔑 CJ rejected the token; refreshing once and retrying")
                    _reset_token()
                    return await _request_json(method, path, json=json,
                                               authenticated=True, _retrying=True)

                if resp.status_code in (400, 401, 403):
                    logger.error(f"❌ CJ API error {resp.status_code}: {body}")
                    raise CJError(f"CJ error {resp.status_code}: {body}") from None
                
                # 429/5xx سيُعاد بفضل tenacity (should_retry=True)
                logger.warning(f"⚠️ CJ API {resp.status_code} - will retry: {body}")
                raise
            
            result = resp.json()

            # CJ answers plenty of failures with HTTP 200 and result=false in
            # the body. Treating those as success is how a broken connection
            # reported itself as healthy.
            if isinstance(result, dict) and result.get("result") is False:
                message = result.get("message") or result
                logger.error(f"❌ CJ rejected {path}: {message}")
                raise CJError(f"CJ error {result.get('code')}: {message}")

            logger.info(f"✅ CJ API Success: {method} {path}")
            return result

# واجهات ملائمة

# CJ's read endpoints are GETs taking query parameters. Sending them as POST
# with a JSON body earned:
#     CJ error 16900202: Request method 'POST' not supported
# Only the token exchange is a POST. The sibling client in this repo had this
# right too, which is what gave the mismatch away — again.

async def list_products(page_num: int = 1, page_size: int = 50, keyword: str = "") -> Dict[str, Any]:
    """جلب قائمة المنتجات من CJ"""
    params = {"pageNum": page_num, "pageSize": page_size}
    if keyword:
        params["productNameEn"] = keyword

    return await _request_json("GET", "/v1/product/list", params=params)


async def get_product_details(pid: str) -> Dict[str, Any]:
    """جلب تفاصيل منتج واحد"""
    return await _request_json("GET", "/v1/product/query", params={"pid": pid})

async def authenticate() -> Dict[str, Any]:
    """
    Report whether this deployment holds a usable CJ access token.

    Deliberately does *not* force a re-issue. CJ allows getAccessToken once per
    300 seconds, so a forced refresh on every press of the admin's "re-check"
    button turned a perfectly healthy connection into "Email or password is
    wrong" the second time it was pressed. The token in hand was obtained from
    CJ and nothing else could have produced it, so holding one is the answer to
    the question this endpoint asks. Whether CJ still honours it is the
    question /ping asks, by spending it on a real call.
    """
    token = await _get_access_token()
    return {
        "authenticated": True,
        "token_suffix": token[-6:],
        "expires_at": _token_expires_at,
        "credentials_used": _token_source,
    }

# Graceful shutdown
async def close_client():
    """إغلاق الـ HTTP client"""
    await _client.aclose()
    logger.info("🔒 CJ Client closed")


def credentials_configured() -> bool:
    """
    Whether this deployment has any (email, key) pair to try at all.

    Answers without touching the network: CJ issues an access token once per
    300 seconds, so a health check that authenticated would spend the store's
    whole quota on polling. Reachability is what the Integrations screen
    measures, by spending the token on a real call.
    """
    return next(_credential_pairs(), None) is not None


# --- fulfilment --------------------------------------------------------------
#
# Placing an order on CJ takes three things this client did not have:
#   1. a variant id (vid) per line — CJ ships variants, not products, and the
#      importer stores only the product id (pid);
#   2. a logistics option, from the freight calculator;
#   3. the order itself.
#
# The variant is looked up when the order is approved rather than captured at
# import: it costs one call per line only for products actually sold, instead
# of one per product for a whole catalogue, and it reads the supplier's current
# stock rather than whatever was true on import day.

async def product_variants(pid: str) -> List[Dict[str, Any]]:
    """The sellable variants of a CJ product."""
    data = await _request_json("GET", "/v1/product/query", params={"pid": pid})
    payload = data.get("data") or {}
    variants = payload.get("variants")
    return variants if isinstance(variants, list) else []


async def default_variant_id(pid: str, sku: str = "") -> Optional[str]:
    """
    The variant to ship for a product.

    Prefers the variant whose SKU matches the one recorded on the order line,
    so a product with several variants ships the one that was actually sold.
    Falls back to the only variant when there is just one; returns None rather
    than guessing between several, because guessing here posts the wrong item
    to a real customer.
    """
    variants = await product_variants(pid)
    if not variants:
        return None

    if sku:
        for variant in variants:
            if str(variant.get("variantSku") or "").strip() == sku.strip():
                return variant.get("vid")

    if len(variants) == 1:
        return variants[0].get("vid")
    return None


async def calculate_freight(
    *,
    start_country: str,
    end_country: str,
    products: List[Dict[str, Any]],
    zip_code: str = "",
) -> List[Dict[str, Any]]:
    """Shipping options CJ offers for this parcel, cheapest first."""
    data = await _request_json("POST", "/v1/logistic/freightCalculate", json={
        "startCountryCode": start_country,
        "endCountryCode": end_country,
        "zip": zip_code,
        "products": products,
    })
    options = data.get("data")
    if not isinstance(options, list):
        return []
    return sorted(options, key=lambda o: float(o.get("logisticPrice") or 0))


async def create_order(
    *,
    order_number: str,
    shipping: Dict[str, Any],
    products: List[Dict[str, Any]],
    logistic_name: str,
    from_country: str = "CN",
) -> Dict[str, Any]:
    """
    Place the order with CJ. Money leaves the account when it is paid, which is
    a separate call — this only creates it, so a mistake here can still be
    cancelled in the CJ dashboard before anything is spent.
    """
    from services.country_names import country_name_en

    data = await _request_json("POST", "/v1/shopping/order/createOrder", json={
        "orderNumber": order_number,
        "shippingZip": shipping.get("zip") or "",
        # CJ takes the code for freight but demands the NAME here — omitting
        # it refuses the whole order with 1600300 "shippingCountry must be
        # not empty", which is how the store's first paid order died.
        "shippingCountry": country_name_en(shipping["country_code"]),
        "shippingCountryCode": shipping["country_code"],
        "shippingProvince": shipping.get("province") or "",
        "shippingCity": shipping["city"],
        "shippingAddress": shipping["address"],
        "shippingCustomerName": shipping["name"],
        "shippingPhone": shipping["phone"],
        "logisticName": logistic_name,
        "fromCountryCode": from_country,
        "products": products,
    })
    return data.get("data") or {}
