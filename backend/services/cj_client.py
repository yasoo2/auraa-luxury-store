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

# Both spellings are accepted: deployments in the wild have the key under
# CJ_API_KEY and the email under CJ_EMAIL, and a mismatch here reads as
# "credentials rejected" with nothing to show why.
CJ_API_KEY = os.getenv("CJ_DROPSHIP_API_KEY") or os.getenv("CJ_API_KEY") or ""
CJ_EMAIL = os.getenv("CJ_DROPSHIP_EMAIL") or os.getenv("CJ_EMAIL") or ""

# غيّر القيم حسب سياسة CJ الفعلية:
REQUESTS_PER_SEC = int(os.getenv("CJ_RPS", "2"))  # حد أقصى 2 طلب/ثانية
MAX_CONCURRENCY  = int(os.getenv("CJ_MAX_CONCURRENCY", "3"))  # توازي بحد أقصى 3
TIMEOUT_SECONDS  = 40

# Limiter + Semaphore (للسرعة الآمنة)
_limiter = AsyncLimiter(REQUESTS_PER_SEC, time_period=1)
_sem     = asyncio.Semaphore(MAX_CONCURRENCY)

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
_token_lock = asyncio.Lock()

# Refresh a little early rather than discovering expiry mid-import.
_TOKEN_SAFETY_MARGIN = 3600  # seconds


def _reset_token() -> None:
    global _token, _token_expires_at
    _token, _token_expires_at = None, 0.0


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
    global _token, _token_expires_at

    async with _token_lock:
        if not force and _token and time.time() < _token_expires_at - _TOKEN_SAFETY_MARGIN:
            return _token

        if not CJ_EMAIL or not CJ_API_KEY:
            raise CJError(
                "CJ credentials are not configured: set CJ_DROPSHIP_EMAIL and "
                "CJ_DROPSHIP_API_KEY (or CJ_EMAIL / CJ_API_KEY)"
            )

        # The field is apiKey, not password. CJ's own rejection said so:
        #   "CJ error 1600005: Email or password is wrong ... We recommend
        #    switching to the apiKey mode"
        # The sibling client in this repo had it right all along.
        logger.info("🔑 Requesting a fresh CJ access token")
        data = await _request_json(
            "POST", "/v1/authentication/getAccessToken",
            json={"email": CJ_EMAIL, "apiKey": CJ_API_KEY},
            authenticated=False,
        )

        payload = data.get("data") or {}
        token = payload.get("accessToken")
        if not token:
            raise CJError(f"CJ returned no access token: {data}")

        _token = token
        _token_expires_at = _parse_expiry(payload.get("accessTokenExpiryDate"))
        logger.info("🔑 CJ access token obtained")
        return _token

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
    authenticated: bool = True,
    _retrying: bool = False,
) -> Dict[str, Any]:
    """طلب HTTP مع rate limiting و retries تلقائية"""
    if not CJ_API_KEY:
        raise CJError("CJ_DROPSHIP_API_KEY not configured")

    headers = {"Content-Type": "application/json"}
    if authenticated:
        headers["CJ-Access-Token"] = await _get_access_token()

    url = f"{CJ_BASE}{path}"

    async with _sem:             # حد أقصى للتوازي
        async with _limiter:     # حد أقصى للطلبات/الثانية
            logger.info(f"🌐 CJ API Request: {method} {path}")
            
            resp = await _client.request(method, url, json=json or {}, headers=headers)
            
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

async def list_products(page_num: int = 1, page_size: int = 50, keyword: str = "") -> Dict[str, Any]:
    """جلب قائمة المنتجات من CJ"""
    payload = {
        "pageNum": page_num, 
        "pageSize": page_size
    }
    if keyword:
        payload["productNameEn"] = keyword
    
    return await _request_json("POST", "/v1/product/list", json=payload)

async def get_product_details(pid: str) -> Dict[str, Any]:
    """جلب تفاصيل منتج واحد"""
    payload = {"pid": pid}
    return await _request_json("POST", "/v1/product/query", json=payload)

async def import_products_by_ids(product_ids: List[str]) -> Dict[str, Any]:
    """استيراد منتجات بالـ IDs"""
    # هذا endpoint مثال - عدّله حسب API الفعلي لـ CJ
    payload = {"productIds": product_ids}
    return await _request_json("POST", "/v1/product/import", json=payload)

async def authenticate() -> Dict[str, Any]:
    """
    Force a fresh access token and report what CJ said.

    Used by the admin Integrations screen, so it must answer for the whole
    exchange — not merely that the HTTP call did not throw.
    """
    token = await _get_access_token(force=True)
    return {"authenticated": True, "token_suffix": token[-6:], "expires_at": _token_expires_at}

# Graceful shutdown
async def close_client():
    """إغلاق الـ HTTP client"""
    await _client.aclose()
    logger.info("🔒 CJ Client closed")
