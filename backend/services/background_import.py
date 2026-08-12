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
from .pricing_service import pricing_service, load_pricing_settings
from .import_service import bulk_import_products
from .product_translation import translate_title, translate_description

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


_JSON_ARRAY = re.compile(r'^\s*\[.*\]\s*$', re.S)


def plain_name(raw) -> str:
    """
    A title as text, whatever shape the supplier sent it in.

    CJ sometimes gives the title as a JSON array — the same trick it plays with
    productImageSet, which this file already normalises. Stored verbatim, the
    shop printed a product card reading `["Mini","Dried Flower 6 Bouquets"]`:
    brackets, quotes and commas, on the storefront, to shoppers.
    """
    if isinstance(raw, (list, tuple)):
        return " ".join(str(x).strip() for x in raw if str(x).strip())

    text = str(raw or "").strip()
    if _JSON_ARRAY.match(text):
        try:
            parsed = json.loads(text)
        except ValueError:
            return text
        if isinstance(parsed, list):
            return " ".join(str(x).strip() for x in parsed if str(x).strip())
    return text


def _product_name(raw) -> str:
    """
    A heading a person would read, taken from CJ's keyword-stuffed title.

    The first clause carries the product; everything after the first comma is
    restatement for the supplier's search engine. Cut there, and only fall back
    to trimming on length when there is no comma to cut at.
    """
    text = re.sub(r'\s+', ' ', plain_name(raw)).strip()
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


# One keyword surfaces one slice of CJ's catalogue — «luxury jewelry
# accessories» returns mostly the same vein forever, which is why the shop
# filled with lookalikes. The sweep asks the supplier for every kind of
# accessory the store actually sells, a few search phrasings per category,
# and splits the requested count evenly across them.
CATEGORY_SWEEP_KEYWORDS = {
    "earrings":  ["earrings women", "hoop earrings", "stud earrings",
                  "pearl earrings", "zircon earrings", "gold plated earrings",
                  "drop earrings"],
    "necklaces": ["necklace women", "pendant necklace", "choker necklace",
                  "gold plated necklace", "pearl necklace", "layered necklace",
                  "zircon pendant"],
    "bracelets": ["bracelet women", "bangle", "charm bracelet",
                  "anklet women", "pearl bracelet", "cuff bracelet"],
    "rings":     ["ring women", "adjustable ring", "zircon ring",
                  "gold plated ring", "ring set women"],
    "watches":   ["women watch", "quartz watch women", "bracelet watch set"],
    # The store's sixth shelf is also its catch-all, so the wider world of
    # women's adornment — hair pieces, brooches, body chains — lands here,
    # visible and re-fileable, instead of nowhere.
    "sets":      ["jewelry set", "necklace earrings set", "bridal jewelry set",
                  "hair accessories women", "hair clip pearl", "brooch women",
                  "body chain jewelry"],
}


def _sweep_plan(total_count: int):
    """Split the requested count across the six categories, first ones taking
    the remainder — asking for 50 yields quotas of 9,9,8,8,8,8."""
    cats = list(CATEGORY_SWEEP_KEYWORDS)
    base, rem = divmod(total_count, len(cats))
    return [
        (cat, CATEGORY_SWEEP_KEYWORDS[cat], base + (1 if i < rem else 0))
        for i, cat in enumerate(cats)
    ]


async def background_import_cj_products(
    job_id: str,
    keyword: Optional[str],
    category_id: Optional[str],
    max_products: int,
    db: AsyncIOMotorDatabase,
    sweep: bool = False,
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

        # Everything the shop already owns from this supplier, so the fetcher
        # reads past it. Without this list it re-read the same first page on
        # every run, skipped all of it as duplicates, and the owner watched
        # «تم استيراد 50» import nothing.
        owned_ids = {
            str(pid) for pid in await db.products.distinct(
                "external_id", {"source": "cj_dropshipping"}
            ) if pid
        }

        # The margin the owner saved on the pricing screen — read once per
        # job, applied to every product it prices.
        pricing_cfg = await load_pricing_settings(db)

        # Both modes run the same machinery over a fetch plan: the sweep walks
        # every store category with its own search phrasings and quota; the
        # keyword mode is a plan of one. Each category tries its next phrasing
        # only for whatever its quota still lacks.
        if sweep:
            plan = _sweep_plan(max_products)
        else:
            plan = [("keyword", [keyword or "luxury jewelry"], max_products)]

        products = []
        skipped_existing = 0
        rejected_off_category = 0
        fetch_report = []
        for plan_cat, keywords, quota in plan:
            remaining = quota
            for kw in keywords:
                if remaining <= 0:
                    break
                part = await bulk_import_products(
                    total_count=remaining,
                    keyword=kw,
                    exclude_ids=owned_ids,
                )
                got = part.get("products", [])
                products.extend(got)
                remaining -= len(got)
                skipped_existing += int(part.get("skipped_existing", 0))
                rejected_off_category += int(part.get("rejected_off_category", 0))
                fetch_report.append({"plan": plan_cat, "keyword": kw, "fetched": len(got)})
                # The next search must not re-fetch what this one just found.
                owned_ids.update(str(p.get("pid")) for p in got if p.get("pid"))

        total = len(products)
        imported_count = 0
        failed_count = 0
        imported_products = []
        # What actually landed where, by the classifier's verdict — the number
        # the owner cares about: does every shelf of the shop fill up?
        by_category: Dict[str, int] = {}
        
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
                "batches_info": fetch_report
            }
        )
        
        # Import each product
        for idx, product in enumerate(products, 1):
            try:
                product_id = product.get('pid')
                if not product_id:
                    failed_count += 1
                    continue
                
                # Skip anything this shop already has — staging or live, from
                # any job. The old check filtered on `import_job_id == this
                # job`, which no earlier import can ever match, so every
                # re-import re-created the whole catalogue under fresh ids:
                # press "استيراد سريع" twice and every product exists twice.
                # A supplier item's identity is (source, external_id), nothing
                # narrower.
                existing = await db.products.find_one({
                    "source": "cj_dropshipping",
                    "external_id": product_id,
                })

                if existing:
                    # Not a failure: the product is in the shop, which is what
                    # importing it asks for. Counted separately so the job
                    # report says "already there", not "broke".
                    skipped_existing += 1
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
                    original_currency="USD",  # CJ prices are usually in USD
                    profit_margin_percent=pricing_cfg["profit_margin_percent"],
                    minimum_profit_sar=pricing_cfg["minimum_profit_sar"],
                )
                
                english_name = _product_name(
                    product.get('productNameEn') or product.get('productName', '')
                )
                english_description = _clean_description(product)

                # Create product document (in STAGING area for editing before publish)
                product_data = {
                    "id": str(uuid.uuid4()),
                    "source": "cj_dropshipping",
                    "external_id": product_id,
                    "name": english_name,
                    # CJ has no Arabic. Both of its title fields are English, so
                    # writing productName here — as this did — filled the Arabic
                    # column with English and the store's language button had
                    # nothing to switch the catalogue to. The Arabic is composed
                    # from the attributes the supplier actually stated; when the
                    # title states none we know, it stays None and the storefront
                    # falls back to the English above, which is at least true.
                    "name_ar": translate_title(english_name),
                    # The supplier's full title becomes the description when CJ
                    # sends no real one. It must never fall back to `name` —
                    # that printed the identical sentence as heading and as body
                    # on every product page.
                    "description": english_description or (product.get('productNameEn') or ''),
                    "description_ar": translate_description(english_name, english_description),
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
                by_category[product_data["category"]] = by_category.get(product_data["category"], 0) + 1
                
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
                            "skipped_existing": skipped_existing,
                            "rejected_off_category": rejected_off_category,
                            "failed": failed_count,
                            "percent": percent,
                            "by_category": by_category
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
            "skipped_existing": skipped_existing,
            "rejected_off_category": rejected_off_category,
            "failed": failed_count,
            "by_category": by_category,
            "fetch_report": fetch_report,
            "sample_products": imported_products[:5]
        }

        await job_manager.update_job_status(
            job_id,
            "completed",
            progress={
                "total": total,
                "processed": total,
                "imported": imported_count,
                "skipped_existing": skipped_existing,
                "rejected_off_category": rejected_off_category,
                "failed": failed_count,
                "percent": 100,
                "by_category": by_category
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
