# services/import_service.py
import asyncio
from typing import List, Dict, Any, Optional, Set
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

# Pages to try before concluding CJ has nothing new for this keyword. With 50
# per page that is up to 2000 listings scanned — enough to fill any real
# request, small enough to end a hopeless keyword in a couple of minutes.
MAX_PAGES = 40


async def bulk_import_products(
    total_count: int,
    keyword: str = "luxury jewelry",
    exclude_ids: Optional[Set[str]] = None,
) -> Dict[str, Any]:
    """
    Fetch `total_count` products the shop does NOT already have.

    The old version computed how many pages `total_count` needs and read
    exactly those, starting from page 1 — the same first page every run. After
    the first import ever, every product it fetched already existed, the
    importer skipped them all, and the owner pressed «استيراد» to watch fifty
    duplicates get refused: requested 50, imported 0, reported success.

    `exclude_ids` carries the external ids the shop already owns; pages are
    read until enough NEW products are found or the supplier runs dry.
    """
    exclude = set(exclude_ids or ())
    results = {
        "total_requested": total_count,
        "total_fetched": 0,
        "ok": 0,
        "failed": 0,
        "skipped_existing": 0,
        "batches": [],
        "products": []
    }

    page_size = BATCH_SIZE
    logger.info(f"🚀 Starting bulk import: {total_count} new products, {len(exclude)} already owned")

    # CJ can repeat an item across pages; one run must not import it twice.
    seen_pids = set()
    products_fetched = 0

    for page_num in range(1, MAX_PAGES + 1):
        if products_fetched >= total_count:
            break

        try:
            logger.info(f"📦 Page {page_num}: fetching (have {products_fetched}/{total_count})")

            response = await list_products(
                page_num=page_num,
                page_size=page_size,
                keyword=keyword
            )

            page_products = _products_from(response)
            if not page_products:
                # The supplier has nothing further for this keyword.
                results["batches"].append({
                    "batch": page_num,
                    "page": page_num,
                    "size": 0,
                    "status": "empty"
                })
                break

            fresh = []
            for product in page_products:
                pid = str(product.get("pid") or "")
                if not pid or pid in seen_pids:
                    continue
                seen_pids.add(pid)
                if pid in exclude:
                    results["skipped_existing"] += 1
                    continue
                fresh.append(product)

            remaining = total_count - products_fetched
            fresh = fresh[:remaining]

            if fresh:
                results["products"].extend(fresh)
                products_fetched += len(fresh)
                results["ok"] += len(fresh)

            results["batches"].append({
                "batch": page_num,
                "page": page_num,
                "size": len(fresh),
                "status": "success"
            })

            logger.info(f"✅ Page {page_num}: {len(fresh)} new ({products_fetched}/{total_count})")

        except Exception as e:
            logger.error(f"❌ Page {page_num} failed: {e}")
            results["failed"] += min(page_size, total_count - products_fetched)
            results["batches"].append({
                "batch": page_num,
                "page": page_num,
                "size": 0,
                "status": f"error: {str(e)[:100]}"
            })

        # راحة قصيرة بين الدفعات لتفادي 429
        if products_fetched < total_count and page_num < MAX_PAGES:
            logger.info(f"😴 Sleeping {PAUSE_BETWEEN_BATCHES}s before next page...")
            await asyncio.sleep(PAUSE_BETWEEN_BATCHES)

    results["total_fetched"] = products_fetched

    logger.info(
        f"✅ Bulk import complete: {products_fetched}/{total_count} new, "
        f"{results['skipped_existing']} already owned"
    )

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
