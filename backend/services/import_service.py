# services/import_service.py
import asyncio
from typing import List, Dict, Any
from services.cj_client import list_products, get_product_details
import logging

logger = logging.getLogger(__name__)

BATCH_SIZE = 50   # عدد العناصر في الدفعة (خفضناها من 100 لـ 50 لأمان أكثر)
PAUSE_BETWEEN_BATCHES = 2  # ثواني راحة بين الدفعات


def _products_from(response: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    The product list out of a CJ response.

    CJ answers with:

        {"code": 200, "result": true, "message": "...",
         "data": {"pageNum": 1, "pageSize": 20, "total": 137, "list": [ ... ]}}

    This used to read `response["result"]["data"]` — but `result` is a boolean,
    so calling .get() on it raised AttributeError, which the surrounding
    try/except swallowed as "batch failed". The fallback branch demanded that
    `data` be a list, and it is a dict. Neither branch could ever produce a
    product: the importer fetched from CJ and threw the answer away, reporting
    a clean "0 products" every time.
    """
    data = response.get("data")
    if isinstance(data, dict):
        listing = data.get("list")
        if isinstance(listing, list):
            return listing
    # Some CJ endpoints answer with the array directly.
    if isinstance(data, list):
        return data
    return []

async def chunked(lst: List[Any], size: int):
    """تقسيم القائمة إلى دفعات"""
    for i in range(0, len(lst), size):
        yield lst[i:i+size]

async def bulk_import_products(
    total_count: int, 
    keyword: str = "luxury jewelry"
) -> Dict[str, Any]:
    """
    استيراد منتجات على دفعات من CJ Dropshipping
    
    Args:
        total_count: العدد الإجمالي للمنتجات المطلوبة
        keyword: كلمة البحث
    
    Returns:
        dict مع نتائج الاستيراد
    """
    results = {
        "total_requested": total_count,
        "total_fetched": 0,
        "ok": 0,
        "failed": 0,
        "batches": [],
        "products": []
    }

    # حساب عدد الصفحات المطلوبة
    page_size = BATCH_SIZE
    num_pages = (total_count + page_size - 1) // page_size

    logger.info(f"🚀 Starting bulk import: {total_count} products in {num_pages} batches")

    batch_index = 0
    products_fetched = 0
    
    for page_num in range(1, num_pages + 1):
        # Stop if we have enough products
        if products_fetched >= total_count:
            break
            
        batch_index += 1
        
        try:
            logger.info(f"📦 Batch {batch_index}/{num_pages}: Fetching page {page_num}")
            
            # جلب المنتجات
            response = await list_products(
                page_num=page_num,
                page_size=page_size,
                keyword=keyword
            )
            
            batch_products = _products_from(response)
            
            # حد العدد المطلوب
            remaining = total_count - products_fetched
            batch_products = batch_products[:remaining]
            
            if batch_products:
                results["products"].extend(batch_products)
                products_fetched += len(batch_products)
                results["ok"] += len(batch_products)
                
                results["batches"].append({
                    "batch": batch_index,
                    "page": page_num,
                    "size": len(batch_products),
                    "status": "success"
                })
                
                logger.info(f"✅ Batch {batch_index} success: {len(batch_products)} products ({products_fetched}/{total_count})")
            else:
                logger.warning(f"⚠️ Batch {batch_index}: No products returned")
                results["batches"].append({
                    "batch": batch_index,
                    "page": page_num,
                    "size": 0,
                    "status": "empty"
                })
                break  # No more products available
            
        except Exception as e:
            logger.error(f"❌ Batch {batch_index} failed: {e}")
            results["failed"] += page_size
            results["batches"].append({
                "batch": batch_index,
                "page": page_num,
                "size": 0,
                "status": f"error: {str(e)[:100]}"
            })
        
        # راحة قصيرة بين الدفعات لتفادي 429
        if batch_index < num_pages:
            logger.info(f"😴 Sleeping {PAUSE_BETWEEN_BATCHES}s before next batch...")
            await asyncio.sleep(PAUSE_BETWEEN_BATCHES)
    
    results["total_fetched"] = products_fetched
    
    logger.info(f"✅ Bulk import complete: {products_fetched}/{total_count} products fetched")
    
    return results

async def fetch_product_details_batch(product_ids: List[str]) -> List[Dict[str, Any]]:
    """
    جلب تفاصيل منتجات متعددة على دفعات
    
    Args:
        product_ids: قائمة IDs المنتجات
    
    Returns:
        قائمة تفاصيل المنتجات
    """
    results = []
    batch_index = 0
    
    async for batch in chunked(product_ids, BATCH_SIZE):
        batch_index += 1
        logger.info(f"📦 Fetching details batch {batch_index}: {len(batch)} products")
        
        try:
            # جلب التفاصيل بالتوازي (محمي بـ semaphore)
            tasks = [get_product_details(pid) for pid in batch]
            batch_results = await asyncio.gather(*tasks, return_exceptions=True)
            
            for i, result in enumerate(batch_results):
                if isinstance(result, Exception):
                    logger.error(f"❌ Failed to fetch {batch[i]}: {result}")
                else:
                    results.append(result)
            
            logger.info(f"✅ Details batch {batch_index} complete")
            
        except Exception as e:
            logger.error(f"❌ Details batch {batch_index} failed: {e}")
        
        # راحة بين الدفعات
        await asyncio.sleep(PAUSE_BETWEEN_BATCHES)
    
    return results
