"""
Background Import Job System
Handles async product imports that continue even if user closes browser
"""
import asyncio
import json
import re
import uuid
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from motor.motor_asyncio import AsyncIOMotorDatabase
import logging
from .pricing_service import pricing_service
from .import_service import bulk_import_products

logger = logging.getLogger(__name__)


class ImportJobManager:
    """Manages background import jobs with database tracking"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.jobs_collection = db.import_jobs
    
    async def create_job(
        self,
        job_type: str,
        supplier: str,
        params: Dict[str, Any],
        user_id: Optional[str] = None
    ) -> str:
        """
        Create a new import job
        
        Args:
            job_type: Type of import (bulk, single, category)
            supplier: Supplier name (cj, aliexpress)
            params: Import parameters (keyword, count, etc.)
            user_id: ID of user who initiated the job
            
        Returns:
            job_id: Unique job identifier
        """
        job_id = str(uuid.uuid4())
        
        job_doc = {
            "job_id": job_id,
            "type": job_type,
            "supplier": supplier,
            "params": params,
            "user_id": user_id,
            "status": "pending",
            "progress": {
                "total": params.get("max_products", 0),
                "processed": 0,
                "imported": 0,
                "failed": 0,
                "percent": 0
            },
            "result": None,
            "error": None,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "started_at": None,
            "completed_at": None
        }
        
        await self.jobs_collection.insert_one(job_doc)
        logger.info(f"✅ Created import job: {job_id} ({supplier})")
        
        return job_id
    
    async def update_job_status(
        self,
        job_id: str,
        status: str,
        progress: Optional[Dict[str, Any]] = None,
        result: Optional[Dict[str, Any]] = None,
        error: Optional[str] = None
    ):
        """Update job status and progress"""
        update_data = {
            "status": status,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        if status == "running" and not await self._get_job_field(job_id, "started_at"):
            update_data["started_at"] = datetime.now(timezone.utc).isoformat()
        
        if status in ["completed", "failed"]:
            update_data["completed_at"] = datetime.now(timezone.utc).isoformat()
        
        if progress:
            update_data["progress"] = progress
        
        if result:
            update_data["result"] = result
        
        if error:
            update_data["error"] = error
        
        await self.jobs_collection.update_one(
            {"job_id": job_id},
            {"$set": update_data}
        )
    
    async def get_job(self, job_id: str) -> Optional[Dict[str, Any]]:
        """Get job details by ID"""
        job = await self.jobs_collection.find_one({"job_id": job_id})
        if job:
            job.pop("_id", None)
        return job
    
    async def list_jobs(
        self,
        user_id: Optional[str] = None,
        status: Optional[str] = None,
        limit: int = 50
    ) -> list:
        """List import jobs with optional filters"""
        query = {}
        if user_id:
            query["user_id"] = user_id
        if status:
            query["status"] = status
        
        cursor = self.jobs_collection.find(query).sort("created_at", -1).limit(limit)
        jobs = await cursor.to_list(length=limit)
        
        for job in jobs:
            job.pop("_id", None)
        
        return jobs
    
    async def _get_job_field(self, job_id: str, field: str) -> Any:
        """Get a specific field from job"""
        job = await self.jobs_collection.find_one(
            {"job_id": job_id},
            {field: 1}
        )
        return job.get(field) if job else None


# The storefront accepts six categories and nothing else; a product whose
# category is anything else fails validation and is dropped from the listing
# without a word to anyone. CJ sends free text such as "Jewelry & Accessories",
# so an imported product used to be published and then simply never appear.
STORE_CATEGORIES = ("earrings", "necklaces", "bracelets", "rings", "watches", "sets")

CATEGORY_KEYWORDS = {
    "earrings":  ["earring", "ear ring", "ear stud", "stud", "hoop", "قرط", "أقراط", "حلق", "حلقان"],
    "necklaces": ["necklace", "pendant", "chain", "choker", "collar", "locket",
                  "قلادة", "قلائد", "عقد", "عقود", "سلسلة", "تعليقة", "طوق"],
    "bracelets": ["bracelet", "bangle", "cuff", "anklet", "wristband", "charm bracelet",
                  "سوار", "أساور", "إسورة", "خلخال", "معصم"],
    "rings":     ["ring", "band ring", "signet", "خاتم", "خواتم", "دبلة"],
    "watches":   ["watch", "timepiece", "wristwatch", "ساعة", "ساعات"],
    "sets":      ["set", "jewelry set", "jewellery set", "combo", "kit", "parure",
                  "طقم", "أطقم", "مجموعة"],
}


def classify_category(product: dict) -> str:
    """
    Pick one of the store's six categories from CJ's free-text fields.

    Checks the most specific signal first (the product's own name), then CJ's
    category label. "sets" is matched last because the word "set" appears in
    plenty of single-item titles.
    """
    haystacks = [
        str(product.get("productNameEn") or ""),
        str(product.get("productName") or ""),
        str(product.get("categoryName") or ""),
    ]

    for text in haystacks:
        low = text.lower()
        if not low:
            continue
        for category in ("earrings", "necklaces", "bracelets", "rings", "watches", "sets"):
            for word in CATEGORY_KEYWORDS[category]:
                if word in low:
                    return category

    # Nothing recognisable. "sets" is the store's catch-all, and the flag
    # written alongside it lets the admin find these and re-file them —
    # far better than a product that exists but is invisible.
    return "sets"


def _collect_images(product: dict) -> list:
    """
    Every image CJ gives us, not just the thumbnail.

    The field is called productImageSet on some endpoints and productImages on
    others, and is sometimes a JSON string rather than a list — so normalise
    before trusting it. Order is preserved and duplicates dropped, with the
    main image first.
    """
    candidates = []
    main = product.get('productImage')
    if main:
        candidates.append(main)

    for key in ('productImageSet', 'productImages', 'images'):
        raw = product.get(key)
        if not raw:
            continue
        if isinstance(raw, str):
            try:
                raw = json.loads(raw)
            except (ValueError, TypeError):
                raw = [part for part in raw.split(',') if part.strip()]
        if isinstance(raw, list):
            candidates.extend(item for item in raw if isinstance(item, str))

    seen, out = set(), []
    for url in candidates:
        url = url.strip()
        if url.startswith('http') and url not in seen:
            seen.add(url)
            out.append(url)
    return out[:10]


# CJ titles are search bait, not names: they cram the whole listing into one
# line — "European American Niche Design Spliced Heart Earrings For Women,
# Colorful Titanium Steel Earrings, Personalized Exaggerated Light Luxury Style
# Ear Jewelry". Printed as a heading it is unreadable, and printed again as the
# description it is the same paragraph twice.
_NAME_MAX = 60


def _product_name(raw: str) -> str:
    """
    A heading a person would read, taken from CJ's keyword-stuffed title.

    The first clause carries the product; everything after the first comma is
    restatement for the supplier's search engine. Cut there, and only fall back
    to trimming on length when there is no comma to cut at.
    """
    text = re.sub(r'\s+', ' ', (raw or '')).strip()
    if not text:
        return ''

    # Both commas: CJ's Arabic titles are separated by the Arabic comma (،,
    # U+060C), so splitting on the ASCII one alone left them whole.
    head = re.split(r'[,\u060c]', text)[0].strip()
    # A first clause that is itself a paragraph is no better than the whole.
    if len(head) > _NAME_MAX:
        words, out = head.split(' '), []
        for word in words:
            if len(' '.join(out + [word])) > _NAME_MAX:
                break
            out.append(word)
        head = ' '.join(out) or head[:_NAME_MAX]
    return head.rstrip(' -–—')


def _clean_description(product: dict) -> str:
    """
    CJ's description is HTML. Strip it to text so it can be shown safely and
    indexed by search engines; fall back through the fields it may live in.
    """
    for key in ('description', 'productDescription', 'descriptionEn', 'remark'):
        raw = product.get(key)
        if not raw or not isinstance(raw, str):
            continue
        text = re.sub(r'<[^>]+>', ' ', raw)
        text = re.sub(r'&[a-z]+;', ' ', text)
        text = re.sub(r'\s+', ' ', text).strip()
        if len(text) >= 20:
            return text[:2000]
    return ''


async def background_import_cj_products(
    job_id: str,
    keyword: Optional[str],
    category_id: Optional[str],
    max_products: int,
    db: AsyncIOMotorDatabase,
):
    # There was a `cj_service` parameter here that every caller dutifully passed
    # and this function never read: the fetching happens inside
    # bulk_import_products, which uses services/cj_client. Its only effect was
    # to make a second, unrepaired CJ client look load-bearing.
    """
    Background task to import CJ products
    Uses new rate-limited import service with retry mechanism
    """
    job_manager = ImportJobManager(db)
    
    try:
        # Update status to running
        await job_manager.update_job_status(job_id, "running")
        
        logger.info(f"🚀 Starting background CJ import job: {job_id} (Rate Limited)")
        
        # Use new rate-limited bulk import
        import_results = await bulk_import_products(
            total_count=max_products,
            keyword=keyword or "luxury jewelry"
        )
        
        products = import_results.get("products", [])
        total = len(products)
        imported_count = 0
        failed_count = 0
        imported_products = []
        
        logger.info(f"📦 Fetched {total} products from CJ (requested {max_products})")
        
        # Update progress - products found
        await job_manager.update_job_status(
            job_id,
            "running",
            progress={
                "total": total,
                "processed": 0,
                "imported": 0,
                "failed": 0,
                "percent": 0,
                "batches_info": import_results.get("batches", [])
            }
        )
        
        # Import each product
        for idx, product in enumerate(products, 1):
            try:
                product_id = product.get('pid')
                if not product_id:
                    failed_count += 1
                    continue
                
                # Check if already exists IN STAGING for this job (allow re-import to live store)
                existing = await db.products.find_one({
                    "source": "cj_dropshipping",
                    "external_id": product_id,
                    "staging": True,  # Only check staging area
                    "import_job_id": job_id  # Only check current job
                })
                
                if existing:
                    logger.debug(f"Product {product_id} already exists in current staging job, skipping")
                    failed_count += 1
                    continue
                
                # Calculate pricing with automatic markup (200% profit + taxes + shipping)
                base_cost = float(product.get('sellPrice', 0))
                shipping_cost = float(product.get('shippingPrice', 0))
                weight = float(product.get('weight', 0.5))
                
                # Calculate final price for Saudi Arabia (default)
                pricing = pricing_service.calculate_final_price(
                    base_cost=base_cost,
                    shipping_cost=shipping_cost,
                    country_code="SA",  # Default country
                    weight_kg=weight,
                    original_currency="USD"  # CJ prices are usually in USD
                )
                
                # Create product document (in STAGING area for editing before publish)
                product_data = {
                    "id": str(uuid.uuid4()),
                    "source": "cj_dropshipping",
                    "external_id": product_id,
                    "name": _product_name(product.get('productNameEn') or product.get('productName', '')),
                    "name_ar": _product_name(product.get('productName') or product.get('productNameEn', '')),
                    # The supplier's full title becomes the description when CJ
                    # sends no real one. It must never fall back to `name` —
                    # that printed the identical sentence as heading and as body
                    # on every product page.
                    "description": _clean_description(product) or (product.get('productNameEn') or ''),
                    "description_ar": _clean_description(product) or (product.get('productName') or ''),
                    "price": pricing['final_price_sar'],  # profit + tax + shipping included
                    # Deliberately no "original_price". It used to be set to the
                    # supplier's cost, which the product page renders struck
                    # through next to a "Save %" badge — so every import claimed
                    # a discount off a price that was *lower* than the one being
                    # charged, and printed the wholesale cost for every shopper
                    # to read. A crossed-out price means "this used to cost
                    # more"; only the owner lowering a price can create one.
                    "supplier_price": base_cost,  # CJ price, admin-only
                    "is_active": True,
                    "supplier_shipping": shipping_cost,
                    "price_breakdown": pricing['breakdown'],  # Full pricing details
                    "images": _collect_images(product),
                    "sku": product.get('productSku', ''),
                    "stock": product.get('sellQuantity', 0),
                    "in_stock": True,
                    "category": classify_category(product),
                    "supplier_category": product.get('categoryName', ''),
                    "category_auto": True,
                    "weight_kg": weight,
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                    "imported_from_cj": True,
                    "import_job_id": job_id,
                    "pricing_auto_calculated": True,
                    "staging": True  # Mark as staging - not yet published to live store
                }
                
                await db.products.insert_one(product_data)
                imported_count += 1
                imported_products.append(product_data)
                
                # Update progress every 10 products
                if idx % 10 == 0 or idx == total:
                    percent = int((idx / total) * 100)
                    await job_manager.update_job_status(
                        job_id,
                        "running",
                        progress={
                            "total": total,
                            "processed": idx,
                            "imported": imported_count,
                            "failed": failed_count,
                            "percent": percent
                        }
                    )
                
                # Small delay to avoid overwhelming DB
                await asyncio.sleep(0.05)
                
            except Exception as e:
                logger.error(f"Failed to import product {product.get('pid')}: {e}")
                failed_count += 1
        
        # Mark as completed
        result = {
            "total_found": total,
            "imported": imported_count,
            "failed": failed_count,
            "sample_products": imported_products[:5]
        }
        
        await job_manager.update_job_status(
            job_id,
            "completed",
            progress={
                "total": total,
                "processed": total,
                "imported": imported_count,
                "failed": failed_count,
                "percent": 100
            },
            result=result
        )
        
        logger.info(f"✅ Completed background CJ import job: {job_id} - {imported_count}/{total} imported")
        
    except Exception as e:
        logger.error(f"❌ Background CJ import job failed: {job_id} - {e}")
        await job_manager.update_job_status(
            job_id,
            "failed",
            error=str(e)
        )
