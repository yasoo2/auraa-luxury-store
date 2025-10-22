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
CJ_API_KEY = os.getenv("CJ_DROPSHIP_API_KEY", "")  # تأكد أنه موجود في .env
CJ_EMAIL = os.getenv("CJ_DROPSHIP_EMAIL", "")

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
async def _request_json(method: str, path: str, json: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """طلب HTTP مع rate limiting و retries تلقائية"""
    if not CJ_API_KEY:
        raise CJError("CJ_DROPSHIP_API_KEY not configured")

    headers = {
        "Content-Type": "application/json",
        # CJ يستخدم هذا الهيدر للتوثيق
        "CJ-Access-Token": CJ_API_KEY,
    }

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
                if resp.status_code in (400, 401, 403):
                    logger.error(f"❌ CJ API error {resp.status_code}: {body}")
                    raise CJError(f"CJ error {resp.status_code}: {body}") from None
                
                # 429/5xx سيُعاد بفضل tenacity (should_retry=True)
                logger.warning(f"⚠️ CJ API {resp.status_code} - will retry: {body}")
                raise
            
            result = resp.json()
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
    """توثيق مع CJ API"""
    payload = {
        "email": CJ_EMAIL,
        "password": CJ_API_KEY
    }
    return await _request_json("POST", "/authentication/getAccessToken", json=payload)

# Graceful shutdown
async def close_client():
    """إغلاق الـ HTTP client"""
    await _client.aclose()
    logger.info("🔒 CJ Client closed")
