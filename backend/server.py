from fastapi import FastAPI, APIRouter, HTTPException, Depends, Query, File, UploadFile, Request, Form, BackgroundTasks
from fastapi.responses import JSONResponse, FileResponse, StreamingResponse, Response, RedirectResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import asyncio
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
from collections import defaultdict
import uuid
import shutil
import aiofiles
from PIL import Image
import io
import re
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
from passlib.context import CryptContext
from enum import Enum

# Import services
from services.background_import import ImportJobManager, background_import_cj_products

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Configure logging. This must come before anything that logs at import time —
# the CJ initialization below logs on failure, and referencing `logger` before
# it exists would turn a recoverable service outage into a boot crash.
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# There is one CJ client in this project: services/cj_client.py. There used to
# be three — services/cj_dropshipping.py (unreachable: the package of the same
# name shadowed it), the package itself, and cj_client. Each fix landed in one
# of them, so the Integrations screen could report a healthy connection through
# the repaired client while the import ran on a broken one. The duplicates are
# gone; anything CJ goes through cj_client.
from services.cj_client import credentials_configured as cj_credentials_configured

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI(title="لورا لاكشري API", version="1.0.0")

# Store database in app state for access in routes
app.state.db = db

# CORS Configuration — the allowlist itself lives in core.origins so the OAuth
# route can vet its return address against exactly the same rule.
from core.origins import is_origin_allowed  # noqa: E402


# Custom CORS Handler
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response as StarletteResponse
from middleware.rate_limiter import RateLimitMiddleware

class CustomCORSMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        origin = request.headers.get("origin")
        is_allowed = is_origin_allowed(origin)

        # Handle preflight
        if request.method == "OPTIONS":
            response = StarletteResponse(status_code=200)
            if is_allowed and origin:
                response.headers["Access-Control-Allow-Origin"] = origin
                response.headers["Access-Control-Allow-Credentials"] = "true"
                response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, PATCH, OPTIONS"
                response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, Accept, Origin, User-Agent, X-Requested-With"
                response.headers["Access-Control-Expose-Headers"] = "*"
                response.headers["Access-Control-Max-Age"] = "3600"
            return response
        
        # Process request
        try:
            response = await call_next(request)
        except Exception as e:
            logger.error(f"Error processing request: {e}")
            response = StarletteResponse(status_code=500, content=str(e))
        
        # Add CORS headers to response
        if is_allowed and origin:
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
            response.headers["Access-Control-Expose-Headers"] = "*"
        
        return response

# Middleware runs in reverse registration order, so registering the rate
# limiter first and CORS second means CORS is outermost — a 429 still carries
# the CORS headers the browser needs to expose the response to the frontend.
app.add_middleware(
    RateLimitMiddleware,
    max_requests=int(os.getenv("AUTH_RATE_LIMIT_MAX", "10")),
    window_seconds=int(os.getenv("AUTH_RATE_LIMIT_WINDOW", "300")),
)
app.add_middleware(CustomCORSMiddleware)

api_router = APIRouter(prefix="/api")

from core.security import (
    get_current_user_doc,
    require_admin_doc,
    require_super_admin_doc,
)

# ---------------------------------------------------------------------------
# The staging boundary.
#
# Quick Import writes supplier products with staging=True and the owner reviews
# them — fixes the price, rewrites the machine-translated title, picks a decent
# photo — before pressing "Live". Only the product *listing* honoured that.
# Everything else read the collection unfiltered, so an unreviewed product was
# still openable by URL, addable to a cart, orderable, wishlistable, and — the
# worst of them — published to Google in sitemap.xml with the supplier's raw
# title and an unedited price.
#
# One rule, one name. A new query that forgets it is a leak, so anything
# touching db.products for a shopper goes through LIVE_ONLY or live_product().
# ---------------------------------------------------------------------------
LIVE_ONLY: Dict[str, Any] = {"staging": {"$ne": True}, "is_active": {"$ne": False}}

# How long the shop tells a customer to expect delivery, in days. A single
# store-wide window: CJ publishes no lead time per product, and no country
# configuration in this project has ever set one, so the old
# `config.get("delivery_days", "5-10")` was a default nobody could change
# without editing code.
DELIVERY_DAYS = os.getenv("DELIVERY_DAYS", "5-15")


# What a dropshipping supplier needs before a parcel can move. CJ rejects an
# order missing any of these, and the shipping address arrived here as a free
# Dict[str, Any] that nothing ever looked inside — so an order with no phone
# number, or no country, was accepted, charged to the customer's expectations,
# and could never be fulfilled.
SHIPPING_REQUIRED = {
    "fullName": "recipient name",
    "phone": "phone number",
    "country": "country",
    "city": "city",
    "address": "street address",
}


def notify_owner_of_new_order(order: Dict[str, Any]) -> None:
    """Best-effort alert that an order is waiting for approval."""
    try:
        from services.email_service import send_order_awaiting_approval_email
        if not send_order_awaiting_approval_email(order):
            logger.error(
                "Order %s is waiting for approval and the owner was not emailed",
                order.get("order_number"),
            )
    except Exception as e:  # noqa: BLE001 — a customer's order outranks a mail
        logger.error(f"Could not send the new-order alert: {e}")


def missing_shipping_fields(address: Optional[Dict[str, Any]]) -> List[str]:
    """Which required address fields are absent or blank."""
    address = address or {}
    # The names the checkout page actually sends lead each list. It posts
    # firstName/lastName and `street`; a validator that demanded `fullName` and
    # `address` would have rejected every real order at the till.
    aliases = {
        "fullName": ("firstName", "lastName", "fullName", "full_name", "name", "recipient"),
        "phone": ("phone", "phone_number", "mobile"),
        "country": ("country", "country_code", "countryCode"),
        "city": ("city", "town"),
        "address": ("street", "address", "address_line_1", "addressLine1"),
    }
    missing = []
    for field, label in SHIPPING_REQUIRED.items():
        if not any(str(address.get(key) or "").strip() for key in aliases[field]):
            missing.append(label)
    return missing


async def live_product(product_id: str) -> Optional[Dict[str, Any]]:
    """A product a shopper is allowed to see, or None. Staging is invisible."""
    return await db.products.find_one({"id": product_id, **LIVE_ONLY})


# =============================================================================
# Health Checks
# =============================================================================

def _sanitize_db_error(exc: Exception) -> str:
    """
    Short, safe description of a database failure.

    Driver errors can echo the connection URI, which carries the password, so
    the message is never returned verbatim — only the exception type plus a
    hint matched from known failure modes.
    """
    name = type(exc).__name__
    text = str(exc).lower()

    if "authentication failed" in text or "auth failed" in text:
        hint = "authentication failed — check the username and password in MONGO_URL"
    elif "timed out" in text or "serverselectiontimeout" in name.lower():
        hint = "cannot reach the cluster — check the Atlas Network Access IP allowlist"
    elif "name does not exist" in text or "nodename nor servname" in text:
        hint = "cluster hostname does not resolve — check the host in MONGO_URL"
    elif "ssl" in text or "tls" in text:
        hint = "TLS handshake failed"
    else:
        hint = "see the service logs for the full error"

    return f"{name}: {hint}"


async def _health_payload():
    """Shared health body. Reports DB reachability without failing the check."""
    db_ok = True
    db_error = None
    try:
        await db.command("ping")
    except Exception as e:
        db_ok = False
        # Reported so a failing deployment can be diagnosed from the endpoint
        # itself; swallowing it silently left `db: false` with no explanation.
        db_error = _sanitize_db_error(e)
        logger.error(f"Health check database ping failed: {type(e).__name__}: {e}")

    payload = {
        "status": "ok",
        "db": db_ok,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    if db_error:
        payload["db_error"] = db_error
    return payload


@app.get("/health")
async def health_check():
    """Liveness probe. Referenced by render.yaml `healthCheckPath`."""
    return await _health_payload()


@api_router.get("/health")
async def api_health_check():
    """Same probe under /api, which is what the frontend calls."""
    return await _health_payload()


# =============================================================================
# Core Models
# =============================================================================

class CategoryType(str, Enum):
    earrings = "earrings"
    necklaces = "necklaces"
    bracelets = "bracelets"
    rings = "rings"
    watches = "watches"
    sets = "sets"


class OrderStatus(str, Enum):
    pending = "pending"
    processing = "processing"
    shipped = "shipped"
    delivered = "delivered"
    cancelled = "cancelled"


class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    # Accounts created by routes/auth.py carry a single `name` and no phone, so
    # these stay optional — requiring them would 500 on every such user.
    name: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[Dict[str, Any]] = None
    created_at: Optional[Any] = None
    is_admin: bool = False
    is_super_admin: bool = False


class Product(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    price: float
    original_price: Optional[float] = None
    discount_percentage: Optional[int] = None
    category: CategoryType
    images: List[str]
    in_stock: bool = True
    stock_quantity: int = 100
    rating: float = 0.0
    reviews_count: int = 0
    external_url: Optional[str] = None
    # The admin catalogue has always drawn a red "Inactive" badge from this
    # field. It did not exist on the model, so it read as undefined on every
    # product and every single one was labelled inactive — a status with
    # nothing behind it, on products that were live and selling. Now it is
    # real: default on, and the storefront respects it.
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ProductCreate(BaseModel):
    name: str
    description: str
    price: float
    original_price: Optional[float] = None
    discount_percentage: Optional[int] = None
    category: CategoryType
    images: List[str]
    stock_quantity: int = 100
    external_url: Optional[str] = None


class CartItem(BaseModel):
    product_id: str
    quantity: int
    price: float
    # Carried on order lines so fulfilment does not depend on the product
    # document still existing, or still saying the same thing, weeks later.
    # Optional because a cart line has none of it — only orders do.
    product_name: Optional[str] = None
    supplier: Optional[str] = None
    supplier_product_id: Optional[str] = None
    supplier_sku: Optional[str] = None


class Cart(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    items: List[CartItem] = []
    total_amount: float = 0.0
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class Order(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    items: List[CartItem]
    total_amount: float
    currency: str = "SAR"
    order_number: Optional[str] = None
    shipping_address: Dict[str, Any]
    payment_method: str
    # Whether the money has actually arrived. Nothing may be bought from the
    # supplier while this says otherwise: a parcel sent for an unpaid order is
    # a loss the shop has no way to recover.
    payment_status: str = "awaiting_payment"
    payment_reference: Optional[str] = None
    payment_confirmed_at: Optional[str] = None
    status: OrderStatus = OrderStatus.pending
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    tracking_number: Optional[str] = None


class OrderCreate(BaseModel):
    shipping_address: Dict[str, Any]
    payment_method: str


# =============================================================================
# Auth Dependencies
# =============================================================================

async def get_current_user(user: Dict[str, Any] = Depends(get_current_user_doc)) -> User:
    """Typed view of the caller resolved by core.security."""
    return User(**user)


async def get_admin_user(user: Dict[str, Any] = Depends(require_admin_doc)) -> User:
    """Require an admin caller. Super admins are admins too."""
    return User(**user)


async def get_super_admin_user(
    user: Dict[str, Any] = Depends(require_super_admin_doc)
) -> User:
    return User(**user)


# Health Check Endpoint
# =============================================================================
# Admin Dashboard - CMS Pages, Theme, Media, Settings
# =============================================================================

class CMSPage(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    slug: str
    title_en: str
    title_ar: str
    content_en: str
    content_ar: str
    route: str
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# ============================================================================
# Google Search Console - Dynamic Sitemap
# ============================================================================

@app.get("/sitemap.xml")
async def generate_sitemap():
    """
    Generate dynamic sitemap for Google Search Console
    Includes: Products, Categories, Static Pages
    """
    try:
        from xml.etree.ElementTree import Element, SubElement, tostring
        from xml.dom import minidom
        
        # Create root element
        urlset = Element('urlset')
        urlset.set('xmlns', 'http://www.sitemaps.org/schemas/sitemap/0.9')
        
        base_url = "https://auraaluxury.com"
        
        # Add static pages
        static_pages = [
            ('/', '1.0', 'daily'),
            ('/products', '0.9', 'daily'),
            ('/auth', '0.6', 'monthly'),
            ('/cart', '0.5', 'weekly'),
            ('/privacy-policy', '0.4', 'yearly'),
            ('/terms-of-service', '0.4', 'yearly'),
            ('/return-policy', '0.4', 'yearly'),
            ('/contact-us', '0.5', 'monthly'),
            ('/order-tracking', '0.5', 'weekly'),
        ]
        
        for path, priority, changefreq in static_pages:
            url = SubElement(urlset, 'url')
            loc = SubElement(url, 'loc')
            loc.text = f"{base_url}{path}"
            lastmod = SubElement(url, 'lastmod')
            lastmod.text = datetime.now(timezone.utc).strftime('%Y-%m-%d')
            changefreq_elem = SubElement(url, 'changefreq')
            changefreq_elem.text = changefreq
            priority_elem = SubElement(url, 'priority')
            priority_elem.text = priority
        
        # Add category pages
        categories = [
            'earrings', 'necklaces', 'bracelets', 'rings', 'watches', 'sets'
        ]
        
        for category in categories:
            url = SubElement(urlset, 'url')
            loc = SubElement(url, 'loc')
            loc.text = f"{base_url}/products?category={category}"
            lastmod = SubElement(url, 'lastmod')
            lastmod.text = datetime.now(timezone.utc).strftime('%Y-%m-%d')
            changefreq_elem = SubElement(url, 'changefreq')
            changefreq_elem.text = 'daily'
            priority_elem = SubElement(url, 'priority')
            priority_elem.text = '0.8'
        
        # Add product pages (fetch from database). Staging products are not
        # submitted to search engines — the owner has not approved them yet.
        products = await db.products.find({"in_stock": True, **LIVE_ONLY}).to_list(length=500)
        
        for product in products:
            url = SubElement(urlset, 'url')
            loc = SubElement(url, 'loc')
            loc.text = f"{base_url}/product/{product['id']}"
            lastmod = SubElement(url, 'lastmod')
            # Use product's last_synced_at if available, otherwise created_at
            last_updated = product.get('last_synced_at') or product.get('created_at') or datetime.now(timezone.utc)
            if isinstance(last_updated, datetime):
                lastmod.text = last_updated.strftime('%Y-%m-%d')
            else:
                lastmod.text = datetime.now(timezone.utc).strftime('%Y-%m-%d')
            changefreq_elem = SubElement(url, 'changefreq')
            changefreq_elem.text = 'weekly'
            priority_elem = SubElement(url, 'priority')
            priority_elem.text = '0.7'
        
        # Pretty print XML
        xml_string = tostring(urlset, encoding='unicode')
        dom = minidom.parseString(xml_string)
        pretty_xml = dom.toprettyxml(indent="  ", encoding="UTF-8")
        
        logger.info(f"Sitemap generated with {len(static_pages) + len(categories) + len(products)} URLs")
        
        return Response(
            content=pretty_xml,
            media_type="application/xml",
            headers={
                "Content-Type": "application/xml; charset=UTF-8",
                "Cache-Control": "public, max-age=3600"  # Cache for 1 hour
            }
        )
        
    except Exception as e:
        logger.error(f"Error generating sitemap: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate sitemap")

# ======================================
# Import Service Endpoints
# ======================================

class ImportRequest(BaseModel):
    source: str = "cj"
    count: int = 50
    batch_size: int = 20
    keyword: str = "luxury jewelry accessories"


@api_router.post("/imports/start")
async def start_import_job(
    background_tasks: BackgroundTasks,
    payload: ImportRequest = ImportRequest(),
    admin: User = Depends(get_admin_user)
):
    """
    Start a new import job from CJ Dropshipping
    Returns job_id for tracking progress
    """
    source, count = payload.source, payload.count
    batch_size, keyword = payload.batch_size, payload.keyword

    try:
        if count < 1 or count > 1000:
            raise HTTPException(status_code=400, detail="Count must be between 1 and 1000")
        
        if source != "cj":
            raise HTTPException(status_code=400, detail="Only 'cj' source is supported")
        
        job_manager = ImportJobManager(db)
        job_id = await job_manager.create_job(
            job_type="bulk_import",
            supplier=source,
            params={
                "max_products": count,
                "batch_size": batch_size,
                "keyword": keyword
            }
        )
        
        logger.info(f"🚀 Starting CJ import job {job_id}: {count} products with keyword '{keyword}'")
        
        # Start background import
        background_tasks.add_task(
            background_import_cj_products,
            job_id=job_id,
            keyword=keyword,
            category_id=None,
            max_products=count,
            db=db,
        )
        
        return {
            "success": True,
            "jobId": job_id,
            "message": f"Import job started for {count} products"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to start import job: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/imports/{job_id}/status")
async def get_unified_import_status(job_id: str, admin: User = Depends(get_admin_user)):
    """
    Get import job status for Quick Import page
    Returns unified format for all import sources
    """
    try:
        job_manager = ImportJobManager(db)
        job = await job_manager.get_job(job_id)
        
        if not job:
            return {"error": "Invalid jobId", "state": "not_found"}
        
        # Convert to unified format expected by frontend
        return {
            "processed": job["progress"]["processed"],
            "total": job["progress"]["total"],
            "state": job["status"],  # pending, running, completed, failed
            "error": job.get("error"),
            "source": job["supplier"],
            "batch_size": job["params"].get("batch_size", 50),
            "percent": job["progress"]["percent"],
            "imported": job["progress"]["imported"],
            "failed": job["progress"]["failed"]
        }
        
    except Exception as e:
        logger.error(f"Error fetching import status: {e}")
        return {"error": str(e), "state": "error"}

@api_router.get("/readiness")
async def check_readiness():
    """
    Check if backend services are ready
    Used by Quick Import page to enable/disable buttons
    """
    try:
        # Check database connection
        db_ok = True
        try:
            await db.command("ping")
        except:
            db_ok = False
        
        # Vendor readiness means "credentials are configured", and says so.
        # It used to mean "an object was constructed", which was true even when
        # that object held no credentials at all — a green light backed by
        # nothing. Reachability is not checked here on purpose: CJ issues an
        # access token once per 300 seconds, so authenticating on every health
        # poll would spend the store's whole quota. The Integrations screen is
        # where the connection is actually exercised.
        vendors_ok = cj_credentials_configured()
        
        overall_status = "ready" if (db_ok and vendors_ok) else "degraded"
        
        return {
            "status": overall_status,
            "db": db_ok,
            "vendors": vendors_ok,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error checking readiness: {e}")
        return {
            "status": "error",
            "db": False,
            "vendors": False,
            "error": str(e)
        }

# ============================================================================
# STAGING AREA ENDPOINTS - For Quick Import Page
# ============================================================================

@api_router.get("/products/staging")
async def get_staging_products(
    job_id: Optional[str] = None,
    admin: User = Depends(get_admin_user)
):
    """
    Get products from staging area (imported but not yet published)
    """
    try:
        query = {"staging": True}
        if job_id:
            query["import_job_id"] = job_id
        
        products = await db.products.find(query).sort("created_at", -1).to_list(length=1000)
        
        # Convert ObjectId to string if present
        for product in products:
            if "_id" in product:
                del product["_id"]
        
        return products
    except Exception as e:
        logger.error(f"Error fetching staging products: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.put("/products/staging/{product_id}")
async def update_staging_product(
    product_id: str,
    updates: Dict[str, Any],
    admin: User = Depends(get_admin_user)
):
    """
    Update a product in staging area
    """
    try:
        result = await db.products.update_one(
            {"id": product_id, "staging": True},
            {"$set": {
                **updates,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Product not found in staging")
        
        return {"success": True, "message": "Product updated"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating staging product: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.delete("/products/staging/{product_id}")
async def delete_staging_product(product_id: str, admin: User = Depends(get_admin_user)):
    """
    Delete a product from staging area
    """
    try:
        result = await db.products.delete_one({"id": product_id, "staging": True})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Product not found in staging")
        
        return {"success": True, "message": "Product deleted"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting staging product: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/products/publish-staging")
async def publish_staging_products(
    data: Dict[str, Any],
    admin: User = Depends(get_admin_user)
):
    """
    Publish staging products to live store
    Moves products from staging=True to staging=False (live)
    """
    try:
        product_ids = data.get("product_ids", [])
        
        if not product_ids:
            raise HTTPException(status_code=400, detail="No product IDs provided")
        
        # Update all products: set staging=False to make them live
        result = await db.products.update_many(
            {"id": {"$in": product_ids}, "staging": True},
            {"$set": {
                "staging": False,
                "published_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        logger.info(f"✅ Published {result.modified_count} products to live store")
        
        return {
            "success": True,
            "published": result.modified_count,
            "message": f"Successfully published {result.modified_count} products"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error publishing staging products: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# STOREFRONT — Products, Categories, Cart, Orders
#
# Registered after the /products/staging routes above so that the literal
# "staging" path keeps precedence over /products/{product_id}.
# ============================================================================

def _sane_reference_price(doc: Dict[str, Any]) -> Dict[str, Any]:
    """
    Drop a "was" price that was never higher than the price being charged.

    Early imports wrote original_price as the *supplier's cost*, so the product
    page struck through 25 riyals beside a 175 riyal price and stamped a "Save"
    badge on it — a discount running the wrong way, with the wholesale cost
    printed underneath. Newer imports no longer write it, but rows already in
    the database still carry it, and a crossed-out price that is not higher is
    never right regardless of how it got there. Applied on read, so the
    catalogue is corrected without a migration.
    """
    original = doc.get("original_price")
    if original is None:
        return doc
    try:
        if float(original) <= float(doc.get("price") or 0):
            doc["original_price"] = None
            doc["discount_percentage"] = None
    except (TypeError, ValueError):
        doc["original_price"] = None
        doc["discount_percentage"] = None
    return doc


def _readable_name(doc: Dict[str, Any]) -> Dict[str, Any]:
    """
    Turn a supplier title back into a heading, for rows imported before the
    importer learned to do it.

    CJ titles are the whole listing on one line. Products already in the
    database carry them verbatim as `name`, and their description carries the
    same sentence — so the product page prints that paragraph twice, once bold
    and once not. Fixing the importer did nothing for a catalogue already
    imported, and there is no migration anyone can safely run against a live
    store, so it is corrected on read.

    Only supplier rows, and only when the stored name is longer than a heading
    should be: a name the owner wrote stays exactly as the owner wrote it.
    """
    if not (doc.get("imported_from_cj") or doc.get("source") == "cj_dropshipping"):
        return doc

    for field in ("name", "name_ar"):
        value = doc.get(field)
        if isinstance(value, str) and len(value) > NAME_MAX:
            short = _shorten_name(value)
            if short:
                doc[field] = short
    return doc


NAME_MAX = 60


def _shorten_name(raw: str) -> str:
    """The first clause of a supplier title, capped at a heading's length.

    Kept in step with services/background_import._product_name — same rule,
    applied to rows written before that function existed.
    """
    text = re.sub(r"\s+", " ", raw or "").strip()
    if not text:
        return ""
    head = re.split(r"[,\u060c]", text)[0].strip()
    if len(head) > NAME_MAX:
        words, out = head.split(" "), []
        for word in words:
            if len(" ".join(out + [word])) > NAME_MAX:
                break
            out.append(word)
        head = " ".join(out) or head[:NAME_MAX]
    return head.rstrip(" -–—")


def _localize(doc: Dict[str, Any], language: Optional[str]) -> Dict[str, Any]:
    """Pick the localized name/description, falling back across languages."""
    doc = _sane_reference_price(doc)
    doc = _readable_name(doc)
    if not language:
        return doc

    primary = "ar" if language.startswith("ar") else "en"
    secondary = "en" if primary == "ar" else "ar"

    doc["name"] = (
        doc.get(f"name_{primary}") or doc.get("name") or doc.get(f"name_{secondary}")
    )
    doc["description"] = (
        doc.get(f"description_{primary}")
        or doc.get("description")
        or doc.get(f"description_{secondary}")
    )
    return doc


@api_router.get("/products", response_model=List[Product])
async def get_products(
    category: Optional[CategoryType] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 20,
    language: Optional[str] = Query(None, description="Preferred language (ar|en)")
):
    """List live products: nothing in staging, nothing switched off."""
    # Built from LIVE_ONLY rather than repeating its terms. The listing carried
    # its own copy of the rule and so missed is_active the moment that field
    # became real — the exact drift LIVE_ONLY exists to prevent.
    query: Dict[str, Any] = dict(LIVE_ONLY)

    if category:
        query["category"] = category
    if min_price is not None:
        query["price"] = {"$gte": min_price}
    if max_price is not None:
        query.setdefault("price", {})["$lte"] = max_price
    if search:
        query["$or"] = [
            {field: {"$regex": search, "$options": "i"}}
            for field in ("name", "description", "name_en", "name_ar",
                          "description_en", "description_ar")
        ]

    products = await db.products.find(query).skip(skip).limit(limit).to_list(length=None)

    # Skip documents that don't satisfy the schema rather than failing the
    # whole listing — imported supplier data is not always well-formed.
    valid_products = []
    for product in products:
        try:
            valid_products.append(Product(**_localize(product, language)))
        except Exception as e:
            logger.warning(f"Skipping malformed product {product.get('id', 'unknown')}: {e}")

    return valid_products


# ---------------------------------------------------------------------------
# Recommendations, comparison and search
#
# The storefront has always rendered these three features. None of the three
# endpoints existed, so every visitor was shown products invented in the
# browser — the comparison table filled its weight and quality columns with
# Math.random(). These compute from the catalogue and the order book instead.
# ---------------------------------------------------------------------------

RECOMMENDATION_TYPES = ("personalized", "similar", "trending", "bestsellers", "complements")


async def _live_products(query: Dict[str, Any], limit: int, language: Optional[str] = None):
    """Fetch live products for `query`, skipping any that fail validation."""
    query = {**query, "staging": {"$ne": True}}
    docs = await db.products.find(query).limit(max(1, min(limit, 50))).to_list(length=None)
    out = []
    for doc in docs:
        try:
            out.append(Product(**_localize(doc, language)))
        except Exception:
            continue
    return out


async def _ordered_by_ids(ids: List[str], limit: int, language: Optional[str] = None):
    """Products for `ids`, preserving the ranking order the caller computed."""
    if not ids:
        return []
    found = {p.id: p for p in await _live_products({"id": {"$in": ids}}, len(ids), language)}
    return [found[i] for i in ids if i in found][:limit]


async def _bestseller_ids(limit: int, exclude: Optional[str] = None) -> List[str]:
    """Product ids ranked by units actually sold, newest orders included."""
    sold: Dict[str, int] = {}
    async for order in db.orders.find({}, {"items": 1}):
        for item in order.get("items") or []:
            pid = item.get("product_id") or item.get("id")
            if pid and pid != exclude:
                sold[pid] = sold.get(pid, 0) + int(item.get("quantity") or 1)
    return [pid for pid, _ in sorted(sold.items(), key=lambda kv: -kv[1])][:limit]


@api_router.get("/recommendations", response_model=List[Product])
async def get_recommendations(
    request: Request,
    type: str = "personalized",
    limit: int = 6,
    userId: Optional[str] = None,
    productId: Optional[str] = None,
    category: Optional[str] = None,
    language: Optional[str] = Query(None),
):
    """
    Products to suggest, computed from real catalogue and order data.

    Every strategy falls back to the next most general one rather than
    returning nothing, so the row is never empty on a young store — but every
    product in it is a product that exists.
    """
    if type not in RECOMMENDATION_TYPES:
        type = "personalized"
    limit = max(1, min(limit, 24))

    seed = await db.products.find_one({"id": productId}) if productId else None
    picks: List[str] = []

    if type == "similar" and seed:
        siblings = await _live_products(
            {"category": seed.get("category"), "id": {"$ne": productId}}, limit * 2, language)
        picks = [p.id for p in sorted(siblings, key=lambda p: -p.rating)]

    elif type == "complements" and seed:
        # Bought in the same order as this product, most frequent first.
        together: Dict[str, int] = {}
        async for order in db.orders.find({"items.product_id": productId}, {"items": 1}):
            for item in order.get("items") or []:
                pid = item.get("product_id") or item.get("id")
                if pid and pid != productId:
                    together[pid] = together.get(pid, 0) + 1
        picks = [pid for pid, _ in sorted(together.items(), key=lambda kv: -kv[1])]
        if not picks:
            # Nothing bought alongside it yet: suggest other categories.
            others = await _live_products(
                {"category": {"$ne": seed.get("category")}}, limit * 2, language)
            picks = [p.id for p in sorted(others, key=lambda p: -p.rating)]

    elif type == "trending":
        # What visitors have actually been opening, last 14 days.
        since = (datetime.now(timezone.utc) - timedelta(days=14)).isoformat()
        counts: Dict[str, int] = {}
        async for ev in db.recommendation_events.find({"created_at": {"$gte": since}}, {"product_id": 1}):
            pid = ev.get("product_id")
            if pid:
                counts[pid] = counts.get(pid, 0) + 1
        picks = [pid for pid, _ in sorted(counts.items(), key=lambda kv: -kv[1])]

    elif type == "bestsellers":
        picks = await _bestseller_ids(limit * 2)

    elif type == "personalized":
        # The categories this shopper has actually bought from or opened.
        user_id = userId
        if not user_id:
            try:
                user = await get_current_user_doc(request)
                user_id = user.get("id")
            except Exception:
                user_id = None

        if user_id:
            seen_categories: Dict[str, int] = {}
            async for order in db.orders.find({"user_id": user_id}, {"items": 1}):
                for item in order.get("items") or []:
                    pid = item.get("product_id") or item.get("id")
                    doc = await db.products.find_one({"id": pid}, {"category": 1}) if pid else None
                    if doc and doc.get("category"):
                        seen_categories[doc["category"]] = seen_categories.get(doc["category"], 0) + 2
            async for ev in db.recommendation_events.find({"user_id": user_id}, {"product_id": 1}):
                doc = await db.products.find_one({"id": ev.get("product_id")}, {"category": 1})
                if doc and doc.get("category"):
                    seen_categories[doc["category"]] = seen_categories.get(doc["category"], 0) + 1

            for cat, _ in sorted(seen_categories.items(), key=lambda kv: -kv[1]):
                for p in await _live_products({"category": cat}, limit, language):
                    if p.id not in picks:
                        picks.append(p.id)

        if not picks:
            picks = await _bestseller_ids(limit * 2)

    results = await _ordered_by_ids(picks, limit, language)

    # Top up from the requested category, then from anything live, so the row
    # is useful on day one — still only real products.
    if len(results) < limit:
        have = {p.id for p in results}
        filler_query: Dict[str, Any] = {"id": {"$nin": list(have) + ([productId] if productId else [])}}
        if category:
            filler_query["category"] = category
        filler = await _live_products(filler_query, limit * 2, language)
        if not filler and category:
            filler_query.pop("category")
            filler = await _live_products(filler_query, limit * 2, language)
        results.extend(sorted(filler, key=lambda p: -p.rating)[: limit - len(results)])

    return results[:limit]


class RecommendationEvent(BaseModel):
    productId: str
    type: Optional[str] = None
    userId: Optional[str] = None


@api_router.post("/recommendations/track")
async def track_recommendation(payload: RecommendationEvent, request: Request):
    """
    Record that a suggested product was opened.

    This is what makes "trending" and "personalized" mean anything — without
    it both would be guesses. Anonymous visitors are counted too; only the
    product, the strategy and the timestamp are stored.
    """
    user_id = payload.userId
    if not user_id:
        try:
            user_id = (await get_current_user_doc(request)).get("id")
        except Exception:
            user_id = None

    await db.recommendation_events.insert_one({
        "product_id": payload.productId,
        "type": payload.type,
        "user_id": user_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"success": True}


class CompareRequest(BaseModel):
    productIds: List[str]


@api_router.post("/products/compare")
async def compare_products(payload: CompareRequest, language: Optional[str] = Query(None)):
    """
    Side-by-side attributes for the selected products.

    Returns only what each product actually carries. The previous behaviour —
    inventing a material, a size and a Math.random() weight — put fictional
    specifications in front of a paying customer.
    """
    ids = payload.productIds[:6]
    if not ids:
        raise HTTPException(status_code=400, detail="No product IDs provided")

    docs = await db.products.find({"id": {"$in": ids}, "staging": {"$ne": True}}).to_list(length=None)
    by_id = {d["id"]: d for d in docs if d.get("id")}

    # Shipping, warranty and returns are properties of the shop, not of an
    # individual necklace. The old version varied them per row by array index,
    # which meant two identical products advertised different delivery times.
    settings = await _get_singleton(SETTINGS_DOC_ID)
    policies = {
        "shipping_time": settings.get("shipping_time"),
        "warranty": settings.get("warranty"),
        "return_policy": settings.get("return_policy"),
    }

    out: Dict[str, Any] = {}
    for pid in ids:
        doc = by_id.get(pid)
        if not doc:
            continue
        doc = _localize(doc, language)
        out[pid] = {
            "id": pid,
            "name": doc.get("name"),
            "images": doc.get("images") or [],
            "price": doc.get("price"),
            "original_price": doc.get("original_price"),
            "category": doc.get("category"),
            "rating": doc.get("rating", 0),
            "reviews_count": doc.get("reviews_count", 0),
            "in_stock": doc.get("in_stock", True),
            "stock_quantity": doc.get("stock_quantity") or doc.get("stock"),
            # Present only when the product record has them. A missing value
            # is returned as null and rendered as a dash, never guessed.
            "sku": doc.get("sku"),
            "brand": doc.get("brand"),
            "material": doc.get("material"),
            "color": doc.get("color"),
            "size": doc.get("size"),
            "weight": f"{doc['weight_kg']} kg" if doc.get("weight_kg") else None,
            "discount_percentage": doc.get("discount_percentage"),
            "stock_status": (
                "in_stock" if doc.get("in_stock", True) and (doc.get("stock_quantity") or doc.get("stock") or 0) > 5
                else "low_stock" if doc.get("in_stock", True)
                else "out_of_stock"
            ),
            **policies,
        }
    return out


@api_router.get("/search", response_model=List[Product])
async def search_products(
    q: str = Query(..., min_length=1),
    limit: int = 10,
    language: Optional[str] = Query(None),
):
    """Search live products by name and description, in both languages."""
    fields = ("name", "description", "name_en", "name_ar", "description_en",
              "description_ar", "sku", "category")
    escaped = re.escape(q.strip())
    return await _live_products(
        {"$or": [{f: {"$regex": escaped, "$options": "i"}} for f in fields]},
        limit, language,
    )


@api_router.get("/categories")
async def get_categories():
    return [
        {"id": "earrings", "name": "أقراط", "name_en": "Earrings", "icon": "💎"},
        {"id": "necklaces", "name": "قلادات", "name_en": "Necklaces", "icon": "📿"},
        {"id": "bracelets", "name": "أساور", "name_en": "Bracelets", "icon": "⭕"},
        {"id": "rings", "name": "خواتم", "name_en": "Rings", "icon": "💍"},
        {"id": "watches", "name": "ساعات", "name_en": "Watches", "icon": "⌚"},
        {"id": "sets", "name": "أطقم", "name_en": "Sets", "icon": "✨"}
    ]


@api_router.get("/products/{product_id}", response_model=Product)
async def get_product(product_id: str, language: Optional[str] = Query(None)):
    product = await live_product(product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    try:
        return Product(**_localize(product, language))
    except Exception as e:
        logger.error(f"Malformed product data for id {product_id}: {e}")
        raise HTTPException(status_code=500, detail="Product data is corrupted")


@api_router.post("/products", response_model=Product)
async def create_product(product_data: ProductCreate, admin: User = Depends(get_admin_user)):
    product = Product(**product_data.model_dump())
    await db.products.insert_one(product.model_dump())
    return product


@api_router.put("/products/{product_id}", response_model=Product)
async def update_product(
    product_id: str,
    product_data: ProductCreate,
    admin: User = Depends(get_admin_user)
):
    result = await db.products.update_one(
        {"id": product_id},
        {"$set": product_data.model_dump(exclude_unset=True)}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")

    product = await db.products.find_one({"id": product_id})
    return Product(**product)


@api_router.delete("/products/{product_id}")
async def delete_product(product_id: str, admin: User = Depends(get_admin_user)):
    result = await db.products.delete_one({"id": product_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"message": "Product deleted successfully"}


# ---------------------------------------------------------------------------
# Cart
# ---------------------------------------------------------------------------

@api_router.get("/cart", response_model=Cart)
async def get_cart(current_user: User = Depends(get_current_user)):
    cart = await db.carts.find_one({"user_id": current_user.id})
    if not cart:
        new_cart = Cart(user_id=current_user.id)
        await db.carts.insert_one(new_cart.model_dump())
        return new_cart

    cart.pop("_id", None)
    return Cart(**cart)


@api_router.post("/cart/add")
async def add_to_cart(
    product_id: str,
    quantity: int = 1,
    current_user: User = Depends(get_current_user)
):
    if quantity < 1:
        raise HTTPException(status_code=400, detail="Quantity must be at least 1")

    product = await live_product(product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    cart = await db.carts.find_one({"user_id": current_user.id})
    if not cart:
        cart = Cart(user_id=current_user.id).model_dump()
        await db.carts.insert_one(dict(cart))

    cart_items = cart.get("items", [])
    existing_item = next(
        (item for item in cart_items if item["product_id"] == product_id), None
    )

    if existing_item:
        existing_item["quantity"] += quantity
    else:
        cart_items.append({
            "product_id": product_id,
            "quantity": quantity,
            "price": product["price"]
        })

    total = sum(item["quantity"] * item["price"] for item in cart_items)

    await db.carts.update_one(
        {"user_id": current_user.id},
        {"$set": {
            "items": cart_items,
            "total_amount": total,
            "updated_at": datetime.now(timezone.utc)
        }}
    )

    return {"message": "Item added to cart", "total_amount": total}


@api_router.delete("/cart/remove/{product_id}")
async def remove_from_cart(product_id: str, current_user: User = Depends(get_current_user)):
    cart = await db.carts.find_one({"user_id": current_user.id})
    if not cart:
        raise HTTPException(status_code=404, detail="Cart not found")

    cart_items = [
        item for item in cart.get("items", []) if item["product_id"] != product_id
    ]
    total = sum(item["quantity"] * item["price"] for item in cart_items)

    await db.carts.update_one(
        {"user_id": current_user.id},
        {"$set": {
            "items": cart_items,
            "total_amount": total,
            "updated_at": datetime.now(timezone.utc)
        }}
    )

    return {"message": "Item removed from cart", "total_amount": total}


# ---------------------------------------------------------------------------
# Wishlist
#
# WishlistContext and WishlistPage have always called these paths, but no
# implementation existed anywhere in the codebase — every call 404'd and the
# frontend silently fell back to localStorage, so wishlists never synced
# across devices.
# ---------------------------------------------------------------------------

class WishlistAddRequest(BaseModel):
    product_id: str


async def _wishlist_products(product_ids: List[str]) -> List[Dict[str, Any]]:
    """Hydrate wishlist ids into product documents, dropping any that vanished."""
    if not product_ids:
        return []

    # A product pulled back to staging stops being shown, the same as one that
    # was deleted — the wishlist keeps the id, so it reappears if it goes live.
    docs = await db.products.find({"id": {"$in": product_ids}, **LIVE_ONLY}).to_list(length=None)
    by_id = {}
    for doc in docs:
        doc.pop("_id", None)
        by_id[doc["id"]] = doc

    # Preserve the order the user added them in.
    return [by_id[pid] for pid in product_ids if pid in by_id]


@api_router.get("/wishlist")
async def get_wishlist(current_user: User = Depends(get_current_user)):
    wishlist = await db.wishlists.find_one({"user_id": current_user.id})
    product_ids = wishlist.get("product_ids", []) if wishlist else []

    return {
        "product_ids": product_ids,
        "products": await _wishlist_products(product_ids)
    }


@api_router.post("/wishlist/add")
async def add_to_wishlist(
    payload: WishlistAddRequest,
    current_user: User = Depends(get_current_user)
):
    product = await live_product(payload.product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # $addToSet keeps this idempotent — adding twice is not an error.
    await db.wishlists.update_one(
        {"user_id": current_user.id},
        {
            "$addToSet": {"product_ids": payload.product_id},
            "$set": {"updated_at": datetime.now(timezone.utc)}
        },
        upsert=True
    )

    return {"message": "Added to wishlist", "product_id": payload.product_id}


@api_router.delete("/wishlist/remove/{product_id}")
async def remove_from_wishlist(
    product_id: str,
    current_user: User = Depends(get_current_user)
):
    await db.wishlists.update_one(
        {"user_id": current_user.id},
        {
            "$pull": {"product_ids": product_id},
            "$set": {"updated_at": datetime.now(timezone.utc)}
        }
    )
    return {"message": "Removed from wishlist", "product_id": product_id}


# ---------------------------------------------------------------------------
# Orders
# ---------------------------------------------------------------------------

@api_router.post("/orders", response_model=Order)
async def create_order(
    order_data: OrderCreate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user)
):
    cart = await db.carts.find_one({"user_id": current_user.id})
    if not cart or not cart.get("items"):
        raise HTTPException(status_code=400, detail="Cart is empty")

    # An order placed by a method the shop does not offer is an order nobody
    # can pay: the customer is told it went through and then hears nothing,
    # because there is no account for the money to arrive in.
    methods = await available_payment_methods()
    if not methods:
        raise HTTPException(
            status_code=503,
            detail="The store cannot take payment right now. Please try again shortly.",
        )
    if order_data.payment_method not in {m["id"] for m in methods}:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown payment method: {order_data.payment_method}",
        )

    # An address CJ cannot ship to is an order that can never be fulfilled.
    # Refuse it here, while the customer is still on the page and can fix it.
    missing = missing_shipping_fields(order_data.shipping_address)
    if missing:
        raise HTTPException(
            status_code=400,
            detail=f"Shipping address is incomplete: {', '.join(missing)}",
        )

    # Re-read every line from the catalogue. The cart stores the price captured
    # when the item was added, and nothing checked it again: a product withdrawn
    # from sale, sold out, or repriced by the supplier sync still went through
    # at whatever the cart happened to remember.
    items, total = [], 0.0
    for line in cart["items"]:
        product = await live_product(line["product_id"])
        if not product:
            raise HTTPException(
                status_code=409,
                detail=f"A product in your cart is no longer available: {line['product_id']}",
            )
        if product.get("in_stock") is False:
            raise HTTPException(
                status_code=409,
                detail=f"Out of stock: {product.get('name') or line['product_id']}",
            )
        quantity = max(1, int(line.get("quantity") or 1))
        price = float(product.get("price") or 0)
        total += price * quantity
        items.append({
            "product_id": line["product_id"],
            "quantity": quantity,
            "price": price,
            # What the supplier needs to identify the item. Kept on the order so
            # fulfilment does not depend on the product document surviving
            # unchanged, and so an order can be traced back to what was bought.
            "product_name": product.get("name"),
            "supplier": product.get("source"),
            "supplier_product_id": product.get("external_id"),
            "supplier_sku": product.get("sku"),
        })

    order = Order(
        user_id=current_user.id,
        items=items,
        total_amount=round(total, 2),
        currency="SAR",
        order_number=f"AUR-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{str(uuid.uuid4())[:8].upper()}",
        # No tracking number. There used to be one — "TRK-" and ten random
        # characters, minted at checkout — handed to the customer before
        # anything had shipped and before any carrier had ever seen the parcel.
        # A tracking number the customer can type into a courier's website and
        # get nothing back is worse than none at all. It stays empty until a
        # carrier issues a real one.
        tracking_number=None,
        shipping_address=order_data.shipping_address,
        payment_method=order_data.payment_method
    )

    doc = order.model_dump()
    # Nothing is bought from the supplier until a human approves it, so the
    # order says so explicitly rather than leaving "pending" to mean two
    # different things at once.
    doc["supplier_status"] = "awaiting_approval"
    doc["supplier_order_id"] = None
    await db.orders.insert_one(doc)

    # Empty the cart now that its contents belong to the order.
    await db.carts.update_one(
        {"user_id": current_user.id},
        {"$set": {"items": [], "total_amount": 0.0}}
    )

    # Tell the owner — except for card orders. A card order at this moment is
    # a customer mid-payment: they are on their way to the gateway, and an
    # abandoned checkout is not something the owner needs email about. The
    # card alert fires when the money actually lands, with the CJ outcome in
    # it. (Best-effort either way: a mail provider being down must never cost
    # a customer their order.)
    if order_data.payment_method != CARD:
        background_tasks.add_task(notify_owner_of_new_order, doc)

    return order


@api_router.get("/orders", response_model=List[Order])
async def get_orders(current_user: User = Depends(get_current_user)):
    orders = await db.orders.find(
        {"user_id": current_user.id}
    ).sort("created_at", -1).to_list(length=None)

    result = []
    for order in orders:
        order.pop("_id", None)
        try:
            result.append(Order(**order))
        except Exception as e:
            logger.warning(f"Skipping malformed order {order.get('id', 'unknown')}: {e}")
    return result


def _iyzico_basket(order: Dict[str, Any], total: float) -> List[Dict[str, Any]]:
    """
    The order's lines as iyzico wants them.

    iyzico rejects a basket whose item prices do not add up to the price being
    charged. Converting each line separately and rounding each one is exactly
    how you end up a cent out on an order of three, so the lines are scaled to
    the charged total and the rounding remainder is put on the last line.
    """
    items = order.get("items") or []
    subtotal = sum(float(i.get("price") or 0) * max(1, int(i.get("quantity") or 1)) for i in items)
    lines: List[Dict[str, Any]] = []
    running = 0.0

    for index, item in enumerate(items):
        quantity = max(1, int(item.get("quantity") or 1))
        share = (float(item.get("price") or 0) * quantity / subtotal) if subtotal else 0.0
        price = round(total * share, 2) if index < len(items) - 1 else round(total - running, 2)
        running = round(running + price, 2)
        lines.append({
            "id": str(item.get("product_id") or f"line-{index}"),
            "name": (item.get("product_name") or "Item")[:120],
            "category1": item.get("category") or "Accessories",
            "itemType": "PHYSICAL",
            "price": f"{max(price, 0.0):.2f}",
        })

    if not lines:
        raise HTTPException(status_code=409, detail="This order has no items to pay for")
    return lines


def _iyzico_parties(order: Dict[str, Any], user: Dict[str, Any]) -> Dict[str, Any]:
    address = order.get("shipping_address") or {}
    name = (str(address.get("firstName") or "").strip()
            or str(address.get("fullName") or "").strip()
            or str(user.get("first_name") or "").strip() or "Customer")
    surname = (str(address.get("lastName") or "").strip()
               or str(user.get("last_name") or "").strip() or "-")
    street = str(address.get("street") or address.get("address") or "").strip()
    city = str(address.get("city") or "").strip()
    country = str(address.get("country") or "").strip()

    return {
        "buyer": {
            "id": str(order.get("user_id") or "guest"),
            "name": name,
            "surname": surname,
            "gsmNumber": str(address.get("phone") or "").strip(),
            "email": str(address.get("email") or user.get("email") or "").strip(),
            "identityNumber": "11111111111",   # required by iyzico; not collected
            "registrationAddress": street or city or country,
            "city": city,
            "country": country,
            "zipCode": str(address.get("zipCode") or "").strip(),
            "ip": str(order.get("client_ip") or "0.0.0.0"),
        },
        "address": {
            "contactName": f"{name} {surname}".strip(),
            "city": city,
            "country": country,
            "address": street or city or country,
            "zipCode": str(address.get("zipCode") or "").strip(),
        },
    }


@api_router.post("/orders/{order_id}/pay-session")
async def start_card_payment(
    order_id: str,
    request: Request,
    current_user: User = Depends(get_current_user)
):
    """
    Open a card payment for one of your own orders.

    Returns the hosted page to go to. Nothing here marks anything paid — that
    decision belongs to the callback, and only after iyzico has been asked
    directly and its answer has been checked against our secret key.
    """
    from services import iyzico_client

    if not iyzico_client.is_configured():
        raise HTTPException(status_code=503, detail="Card payment is not configured")

    order = await db.orders.find_one({"id": order_id, "user_id": current_user.id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.get("payment_status") == "paid":
        raise HTTPException(status_code=409, detail="This order is already paid")

    # The catalogue is priced in SAR and iyzico does not settle SAR. An
    # unknown rate means the only honest amount to charge is none: guessing
    # one charges a real card a made-up number.
    from services.currency_service import get_currency_service
    service = get_currency_service(db)
    total_sar = float(order.get("total_amount") or 0)
    amount = await service.convert_currency(total_sar, "SAR", iyzico_client.CURRENCY)
    if amount is None or amount <= 0:
        raise HTTPException(
            status_code=503,
            detail=f"Cannot price this order in {iyzico_client.CURRENCY} right now. Please try again shortly.",
        )

    parties = _iyzico_parties(order, current_user.model_dump())
    try:
        session = await iyzico_client.create_checkout_form(
            conversation_id=order_id,
            basket_id=str(order.get("order_number") or order_id),
            amount=amount,
            callback_url=f"{PUBLIC_API_URL}/api/payments/iyzico/callback",
            buyer=parties["buyer"],
            address=parties["address"],
            basket_items=_iyzico_basket(order, amount),
        )
    except iyzico_client.IyzicoError as e:
        logger.error("iyzico refused to open a payment for %s: %s", order_id, e)
        raise HTTPException(status_code=502, detail=f"Card payment could not be started: {e}")

    await db.orders.update_one({"id": order_id}, {"$set": {
        "payment_token": session["token"],
        "payment_provider": "iyzico",
        "payment_amount_charged": amount,
        "payment_currency_charged": iyzico_client.CURRENCY,
        "payment_started_at": datetime.now(timezone.utc).isoformat(),
    }})

    return {
        "payment_page_url": session["payment_page_url"],
        # Said before the customer leaves, not discovered on their statement.
        "amount": amount,
        "currency": iyzico_client.CURRENCY,
        "original_amount": round(total_sar, 2),
        "original_currency": order.get("currency", "SAR"),
        "sandbox": iyzico_client.SANDBOX,
    }


@api_router.post("/payments/iyzico/callback")
async def iyzico_callback(request: Request, background_tasks: BackgroundTasks):
    """
    Where iyzico's hosted page sends the customer's browser back.

    Deliberately unauthenticated: this arrives as a cross-site form POST, so
    the session cookie is not sent with it. Authentication is not what makes
    it safe — the token is looked up against an order we opened ourselves,
    and the payment is confirmed by asking iyzico over our own connection and
    verifying the signature on its reply. The browser's claim is worth
    nothing on its own.
    """
    from services import iyzico_client

    form = await request.form()
    token = str(form.get("token") or "").strip()
    landing = f"{PUBLIC_SITE_URL}/profile?tab=orders"

    if not token:
        return RedirectResponse(landing, status_code=303)

    order = await db.orders.find_one({"payment_token": token})
    if not order:
        logger.warning("iyzico called back with a token matching no order")
        return RedirectResponse(landing, status_code=303)

    order_id = order["id"]
    landing = f"{PUBLIC_SITE_URL}/order/{order_id}/pay"

    try:
        result = await iyzico_client.retrieve_checkout_form(
            token=token, conversation_id=order_id
        )
    except iyzico_client.IyzicoError as e:
        logger.error("Could not confirm iyzico payment for %s: %s", order_id, e)
        await db.orders.update_one({"id": order_id}, {"$set": {
            "payment_error": str(e)[:500],
        }})
        return RedirectResponse(landing, status_code=303)

    if not result["paid"]:
        await db.orders.update_one({"id": order_id}, {"$set": {
            "payment_error": result.get("error_message") or result.get("payment_status") or "not completed",
        }})
        return RedirectResponse(landing, status_code=303)

    # Paid less than we asked is not paid. iyzico is told the amount by us, so
    # a mismatch means something in between changed it.
    expected = float(order.get("payment_amount_charged") or 0)
    charged = float(result.get("paid_price") or 0)
    if expected and charged + 0.01 < expected:
        logger.error("iyzico reports %.2f for order %s, expected %.2f", charged, order_id, expected)
        await db.orders.update_one({"id": order_id}, {"$set": {
            "payment_error": f"Amount mismatch: charged {charged}, expected {expected}",
        }})
        return RedirectResponse(landing, status_code=303)

    await db.orders.update_one({"id": order_id}, {"$set": {
        "payment_status": "paid",
        "payment_reference": str(result.get("payment_id") or ""),
        "payment_confirmed_at": datetime.now(timezone.utc).isoformat(),
        "payment_confirmed_by": "iyzico",
        "payment_error": None,
    }})
    logger.info("Order %s paid via iyzico (%s)", order_id, result.get("payment_id"))

    # Paid → bought, immediately, with no human in between. In the background
    # so the customer's redirect is instant: CJ's variant lookups and freight
    # call take seconds they should not spend staring at a spinner.
    background_tasks.add_task(_auto_fulfil_paid_order, order_id)

    return RedirectResponse(landing, status_code=303)


@api_router.get("/orders/{order_id}/payment-instructions")
async def get_payment_instructions(
    order_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    How to pay for one of your own orders, and whether it is already settled.

    Reachable after checkout, not only on the page that follows it: a customer
    who closes the tab before writing the IBAN down has no other way back to
    it, and asking them to email for their own bank details is a good way to
    lose the sale.
    """
    order = await db.orders.find_one({"id": order_id, "user_id": current_user.id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    method_id = order.get("payment_method")
    live = await available_payment_methods()
    method = next(
        (dict(m) for m in live if m["id"] == method_id),
        # A method withdrawn since the order was placed still has to be shown,
        # or the customer is left holding an invoice with no way to settle it.
        {"id": method_id, "unavailable": True} if method_id else None,
    )

    # What the card will actually be charged, in the currency it will be
    # charged in. Shown before the customer leaves for the payment page, so
    # the figure on their statement is never the first time they see it.
    if method and method.get("id") == CARD:
        from services import iyzico_client
        from services.currency_service import get_currency_service

        charged = await get_currency_service(db).convert_currency(
            float(order.get("total_amount") or 0), "SAR", iyzico_client.CURRENCY
        )
        method["charged"] = (
            f"{charged:.2f} {iyzico_client.CURRENCY}" if charged is not None else None
        )

    return {
        "order_id": order.get("id"),
        "order_number": order.get("order_number"),
        "amount": order.get("total_amount"),
        "currency": order.get("currency", "SAR"),
        "payment_status": order.get("payment_status", "awaiting_payment"),
        "payment_reference": order.get("payment_reference"),
        # A card that was declined, or a payment abandoned halfway, left the
        # page looking identical to one never attempted.
        "payment_error": order.get("payment_error"),
        # What the customer must quote so the transfer can be matched to this
        # order. Money arriving with no reference is money nobody can place.
        "reference_to_quote": order.get("order_number") or order.get("id"),
        "method": method,
    }


@api_router.get("/orders/my-orders")
async def get_my_orders(current_user: User = Depends(get_current_user)):
    orders = await db.orders.find(
        {"user_id": current_user.id}
    ).sort("created_at", -1).to_list(length=None)

    return {"orders": [
        {
            "id": o.get("id"),
            "order_number": o.get("order_number"),
            "tracking_number": o.get("tracking_number"),
            "status": o.get("status", "pending"),
            "created_at": o.get("created_at"),
            "total_amount": o.get("total_amount", 0.0),
            "currency": o.get("currency", "SAR"),
            "shipping_address": o.get("shipping_address", {}),
            # "بانتظار" meant nothing on its own — waiting for what? This is
            # the half the customer can do something about.
            "payment_status": o.get("payment_status", "awaiting_payment"),
            "payment_method": o.get("payment_method"),
        }
        for o in orders
    ]}


@api_router.get("/orders/track/{search_param}")
async def track_order(search_param: str):
    """Public order lookup by tracking number, order number, or id."""
    order = None
    for field in ("tracking_number", "order_number", "id"):
        order = await db.orders.find_one({field: search_param})
        if order:
            break

    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    return {
        "order_number": order.get("order_number"),
        "tracking_number": order.get("tracking_number"),
        "status": order.get("status", "pending"),
        "created_at": order.get("created_at"),
        "total_amount": order.get("total_amount", 0.0),
        "currency": order.get("currency", "SAR")
    }


# ---------------------------------------------------------------------------
# Fulfilment — sending an approved order to the supplier
#
# Deliberately manual. Creating an order on CJ commits the shop to buying the
# goods, so a human presses the button; nothing here runs on a timer or on the
# customer's checkout.
# ---------------------------------------------------------------------------

def _cj_shipping_from(address: Dict[str, Any]) -> Dict[str, Any]:
    """The address in the shape CJ's order API expects."""
    name = " ".join(
        str(address.get(k) or "") for k in ("firstName", "lastName")
    ).strip() or str(address.get("fullName") or address.get("name") or "").strip()

    return {
        "name": name,
        "phone": str(address.get("phone") or "").strip(),
        "country_code": str(address.get("country") or address.get("countryCode") or "").strip().upper(),
        "province": str(address.get("state") or address.get("province") or "").strip(),
        "city": str(address.get("city") or "").strip(),
        "address": str(address.get("street") or address.get("address") or "").strip(),
        "zip": str(address.get("zipCode") or address.get("zip") or "").strip(),
    }


async def _prepare_supplier_order(order: Dict[str, Any]) -> Dict[str, Any]:
    """
    Everything needed to place an order at CJ, and nothing that changes
    anything there.

    Shared by the dry run and the real send *on purpose*. A rehearsal that
    walks a different code path is a rehearsal for a different play: it can
    pass while the thing it stands in for fails. Every step below — the
    address, the variant of every line, the freight options — is exactly what
    the real send uses, so a green preview means the only untested step left is
    the createOrder call itself.
    """
    from services import cj_client

    shipping = _cj_shipping_from(order.get("shipping_address") or {})
    if not (shipping["country_code"] and shipping["city"] and shipping["address"]
            and shipping["phone"] and shipping["name"]):
        raise HTTPException(status_code=400, detail="The order's address is not complete enough to ship")

    # Resolve every line before touching anything else: a partially sent order
    # is worse than one not sent at all.
    lines, described = [], []
    for item in order.get("items") or []:
        pid = item.get("supplier_product_id")
        if not pid:
            raise HTTPException(
                status_code=400,
                detail=f"No supplier reference for {item.get('product_name') or item.get('product_id')}",
            )
        try:
            vid = await cj_client.default_variant_id(pid, item.get("supplier_sku") or "")
        except cj_client.CJError as e:
            raise HTTPException(status_code=502, detail=f"CJ: {e}")
        if not vid:
            raise HTTPException(
                status_code=409,
                detail=(f"Could not tell which variant of "
                        f"{item.get('product_name') or pid} to ship — choose it in CJ"),
            )
        quantity = max(1, int(item.get("quantity") or 1))
        lines.append({"vid": vid, "quantity": quantity})
        described.append({
            "product": item.get("product_name") or pid,
            "supplier_product_id": pid,
            "variant_id": vid,
            "quantity": quantity,
        })

    try:
        options = await cj_client.calculate_freight(
            start_country=os.getenv("CJ_FROM_COUNTRY", "CN"),
            end_country=shipping["country_code"],
            products=lines,
            zip_code=shipping["zip"],
        )
    except cj_client.CJError as e:
        raise HTTPException(status_code=502, detail=f"CJ: {e}")

    if not options:
        raise HTTPException(status_code=409, detail="CJ offers no shipping method to this address")

    return {"shipping": shipping, "lines": lines, "described": described,
            "options": options, "chosen": options[0]}


@api_router.post("/admin/orders/{order_id}/supplier-preview")
async def preview_order_at_supplier(order_id: str, admin: User = Depends(get_admin_user)):
    """
    Rehearse sending an order to CJ without creating anything there.

    Authenticates, looks up the variant of every line, and asks CJ what it
    would charge to ship — then stops and reports. Nothing is created, nothing
    is reserved, nothing is charged. This is how to find out whether the
    fulfilment path works before a real customer's order depends on it.
    """
    order = await db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    prepared = await _prepare_supplier_order(order)
    chosen = prepared["chosen"]

    return {
        "ok": True,
        "dry_run": True,
        "message": "لم يُنشأ شيء لدى CJ — هذا فحص فقط.",
        "order_number": order.get("order_number") or order_id,
        "ship_to": {k: prepared["shipping"][k] for k in ("name", "city", "country_code", "zip")},
        "items": prepared["described"],
        "shipping_options": [
            {"name": o.get("logisticName"), "price": o.get("logisticPrice"),
             "days": o.get("logisticAging")}
            for o in prepared["options"][:5]
        ],
        "would_use": {"name": chosen.get("logisticName"), "price": chosen.get("logisticPrice")},
    }


async def _buy_from_supplier(order: Dict[str, Any], actor: str) -> Dict[str, Any]:
    """
    Buy a paid order's items from CJ and record the outcome on the order.

    Creates the order on CJ but does not pay it: payment is a separate call in
    CJ's API, so a mistake caught here can still be cancelled in the CJ
    dashboard before any money moves.

    Shared by the admin's button and the automatic send that follows a card
    payment, on purpose — two code paths to the supplier means two ways to be
    wrong about what was bought.
    """
    from services import cj_client

    order_id = order["id"]

    if order.get("supplier_order_id"):
        raise HTTPException(
            status_code=409,
            detail=f"Already sent to the supplier as {order['supplier_order_id']}",
        )

    # Buying the goods is the point of no return: CJ ships, the money is spent,
    # and there is nobody to take it back from if the customer never paid.
    if order.get("payment_status") != "paid":
        raise HTTPException(
            status_code=409,
            detail="This order is not paid yet. Confirm the payment before buying the goods.",
        )

    # One buyer at a time. iyzico can deliver its callback more than once, and
    # an admin can press the button while the automatic send is still running —
    # without an atomic claim, each of them buys the goods and the shop pays
    # for the same parcel twice.
    claim = await db.orders.update_one(
        {"id": order_id, "supplier_order_id": None, "supplier_status": {"$ne": "sending"}},
        {"$set": {"supplier_status": "sending"}},
    )
    if claim.modified_count == 0:
        raise HTTPException(
            status_code=409,
            detail="This order is already on its way to the supplier",
        )

    async def record_failure(reason: str) -> None:
        await db.orders.update_one({"id": order_id}, {"$set": {
            "supplier_status": "failed",
            "supplier_error": reason[:500],
            "supplier_failed_at": datetime.now(timezone.utc).isoformat(),
        }})

    # Only the createOrder call used to be recorded as a failure. Everything
    # before it — an address CJ cannot use, a line whose variant cannot be
    # resolved, no shipping method to that country — raised and left the order
    # sitting in the queue marked "waiting for your approval", which is a lie:
    # the owner already approved and the send is what broke.
    try:
        prepared = await _prepare_supplier_order(order)
    except HTTPException as e:
        await record_failure(str(e.detail))
        raise

    chosen = prepared["chosen"]

    try:
        result = await cj_client.create_order(
            order_number=order.get("order_number") or order_id,
            shipping=prepared["shipping"],
            products=prepared["lines"],
            logistic_name=chosen.get("logisticName") or chosen.get("logisticAging") or "",
            from_country=os.getenv("CJ_FROM_COUNTRY", "CN"),
        )
    except cj_client.CJError as e:
        await record_failure(f"CJ refused the order: {e}")
        raise HTTPException(status_code=502, detail=f"CJ refused the order: {e}")

    supplier_order_id = result.get("orderId") or result.get("orderNum")
    await db.orders.update_one({"id": order_id}, {"$set": {
        "supplier_status": "sent",
        "supplier_order_id": supplier_order_id,
        "supplier_shipping_method": chosen.get("logisticName"),
        "supplier_shipping_cost": chosen.get("logisticPrice"),
        "supplier_error": None,
        "supplier_failed_at": None,
        "sent_to_supplier_at": datetime.now(timezone.utc).isoformat(),
        "sent_to_supplier_by": actor,
        "status": OrderStatus.processing.value,
    }})

    return {
        "success": True,
        "supplier_order_id": supplier_order_id,
        "shipping_method": chosen.get("logisticName"),
        "shipping_cost": chosen.get("logisticPrice"),
        # Said plainly so nobody assumes the goods are paid for.
        "message": "Created on CJ. It is not paid yet — pay it from your CJ balance.",
    }


async def _auto_fulfil_paid_order(order_id: str) -> None:
    """
    Money in → order out, with nobody pressing anything in between.

    This is what a dropshipping shop *is*: the customer's card is charged and
    the goods get bought, immediately, automatically. The owner's only
    remaining job is topping up the CJ balance.

    Best-effort by design. The payment is already recorded before this runs,
    and a CJ failure — no variant, an address CJ refuses, CJ itself down —
    must never look like a payment failure. It lands the order in the admin
    screen's red "failed" queue with its reason, and the owner is emailed
    either way.
    """
    order = await db.orders.find_one({"id": order_id})
    if not order or order.get("supplier_order_id"):
        return

    error: Optional[str] = None
    try:
        result = await _buy_from_supplier(order, actor="auto — paid card order")
        logger.info("Order %s auto-sent to CJ as %s", order_id, result.get("supplier_order_id"))
    except HTTPException as e:
        error = str(e.detail)
        logger.error("Order %s is paid but could not be auto-sent to CJ: %s", order_id, error)
    except Exception as e:  # noqa: BLE001 — an unexpected crash must still be recorded
        error = str(e)
        logger.error("Order %s auto-send crashed: %s", order_id, error)
        await db.orders.update_one({"id": order_id}, {"$set": {
            "supplier_status": "failed",
            "supplier_error": error[:500],
            "supplier_failed_at": datetime.now(timezone.utc).isoformat(),
        }})

    # Tell the owner what actually happened — the one time the send failed is
    # the one time they have to act.
    try:
        from services.email_service import send_order_paid_email
        fresh = await db.orders.find_one({"id": order_id})
        if fresh:
            send_order_paid_email(fresh, error=error)
    except Exception as e:  # noqa: BLE001 — mail is never allowed to break fulfilment
        logger.error("Could not send the paid-order alert for %s: %s", order_id, e)


@api_router.post("/admin/orders/{order_id}/send-to-supplier")
async def send_order_to_supplier(order_id: str, admin: User = Depends(get_admin_user)):
    """The manual door to the same path: retries after a failed auto-send."""
    order = await db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return await _buy_from_supplier(order, actor=admin.email)


class PaymentConfirmation(BaseModel):
    reference: Optional[str] = None
    paid: bool = True


@api_router.post("/admin/orders/{order_id}/confirm-payment")
async def confirm_order_payment(
    order_id: str,
    payload: PaymentConfirmation,
    admin: User = Depends(get_admin_user)
):
    """
    Record that the customer's money arrived — or take that back.

    There is no gateway to ask, so the only thing that knows whether a transfer
    landed is the bank statement, and the only one reading it is the owner.
    This is where what they saw there gets written down, with who said so and
    when, because "paid" is the flag that unlocks spending money at CJ.
    """
    order = await db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if payload.paid:
        updates = {
            "payment_status": "paid",
            "payment_reference": (payload.reference or "").strip() or None,
            "payment_confirmed_at": datetime.now(timezone.utc).isoformat(),
            "payment_confirmed_by": admin.email,
        }
    else:
        # Marking it back is not tidying up after a mistake — an order already
        # sent to CJ has had money spent against it, and clearing the flag
        # would let it be sent again.
        if order.get("supplier_order_id"):
            raise HTTPException(
                status_code=409,
                detail="This order was already bought from the supplier; its payment cannot be un-confirmed.",
            )
        updates = {
            "payment_status": "awaiting_payment",
            "payment_reference": None,
            "payment_confirmed_at": None,
            "payment_confirmed_by": None,
        }

    await db.orders.update_one({"id": order_id}, {"$set": updates})
    return {"success": True, "id": order_id, **updates}


# ============================================================================
# ADMIN — User management
#
# Implements the paths UsersManagementPage and AdminManagement already call.
# routes/super_admin.py exposes /super-admin/manage/* instead, which no part
# of the frontend requests, so wiring that router would not have helped.
# ============================================================================

class ChangePasswordRequest(BaseModel):
    new_password: str


class ChangeRoleRequest(BaseModel):
    user_id: str
    new_role: str  # "user" | "admin" | "super_admin"
    current_password: Optional[str] = None


def _public_user(doc: Dict[str, Any]) -> Dict[str, Any]:
    doc.pop("_id", None)
    doc.pop("password", None)
    return doc


@api_router.get("/admin/users")
async def admin_list_users(
    sort_by: str = "created_at",
    sort_order: str = "desc",
    admin: User = Depends(get_admin_user)
):
    """List users with their order counts, for the users management table."""
    # Whitelist sort fields: sort_by reaches Mongo directly.
    allowed_sorts = {"created_at", "email", "name", "total_orders", "total_activity_time"}
    if sort_by not in allowed_sorts:
        sort_by = "created_at"
    direction = -1 if sort_order == "desc" else 1

    users = await db.users.find({}).to_list(length=None)

    for user in users:
        _public_user(user)
        user["total_orders"] = await db.orders.count_documents({"user_id": user.get("id")})

    users.sort(key=lambda u: (u.get(sort_by) is None, u.get(sort_by, "")),
               reverse=(direction == -1))
    return users


@api_router.get("/admin/users/all")
async def admin_list_all_users(admin: User = Depends(get_admin_user)):
    users = await db.users.find({}).to_list(length=None)
    return [_public_user(u) for u in users]


@api_router.patch("/admin/users/{user_id}/toggle-admin")
async def admin_toggle_admin(user_id: str, admin: User = Depends(get_super_admin_user)):
    """Grant or revoke admin. Super-admin only — this hands out privileges."""
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.get("is_super_admin"):
        raise HTTPException(status_code=400, detail="Cannot change a super admin's role")

    new_value = not user.get("is_admin", False)
    await db.users.update_one({"id": user_id}, {"$set": {"is_admin": new_value}})
    return {"success": True, "user_id": user_id, "is_admin": new_value}


@api_router.patch("/admin/users/{user_id}/change-password")
async def admin_change_user_password(
    user_id: str,
    payload: ChangePasswordRequest,
    admin: User = Depends(get_super_admin_user)
):
    if len(payload.new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")

    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    hashed = bcrypt.hashpw(payload.new_password.encode(), bcrypt.gensalt()).decode()
    await db.users.update_one({"id": user_id}, {"$set": {"password": hashed}})

    # Force re-authentication everywhere this user was signed in.
    tokens = await db.refresh_tokens.find({"user_id": user_id}).to_list(length=None)
    for t in tokens:
        await db.revoked_tokens.update_one(
            {"jti": t["jti"]},
            {"$set": {"jti": t["jti"], "revoked_at": datetime.now(timezone.utc)}},
            upsert=True,
        )

    return {"success": True, "message": "Password updated"}


@api_router.delete("/admin/users/{user_id}")
async def admin_delete_user(user_id: str, admin: User = Depends(get_super_admin_user)):
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.get("is_super_admin"):
        raise HTTPException(status_code=400, detail="Cannot delete a super admin")
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")

    await db.users.delete_one({"id": user_id})
    await db.carts.delete_many({"user_id": user_id})
    await db.wishlists.delete_many({"user_id": user_id})
    return {"success": True, "message": "User deleted"}


@api_router.delete("/admin/super-admin-delete/{user_id}")
async def super_admin_delete_user(user_id: str, admin: User = Depends(get_super_admin_user)):
    """Alias kept for AdminManagementSection, which calls this path."""
    return await admin_delete_user(user_id, admin)


@api_router.get("/admin/super-admin-statistics")
async def super_admin_statistics(admin: User = Depends(get_super_admin_user)):
    return {
        "total_users": await db.users.count_documents({}),
        "total_admins": await db.users.count_documents({"is_admin": True}),
        "total_super_admins": await db.users.count_documents({"is_super_admin": True}),
        "total_products": await db.products.count_documents({"staging": {"$ne": True}}),
        "total_orders": await db.orders.count_documents({}),
    }


@api_router.post("/admin/super-admin-change-role")
async def super_admin_change_role(
    payload: ChangeRoleRequest,
    admin: User = Depends(get_super_admin_user)
):
    """Set a user's role. The caller re-enters their password to confirm."""
    if payload.new_role not in ("user", "admin", "super_admin"):
        raise HTTPException(status_code=400, detail="Invalid role")

    # Re-authenticate the caller: this is a privilege escalation path.
    caller = await db.users.find_one({"id": admin.id})
    if not payload.current_password or not caller or not caller.get("password"):
        raise HTTPException(status_code=400, detail="Current password is required")
    if not bcrypt.checkpw(payload.current_password.encode(), caller["password"].encode()):
        raise HTTPException(status_code=401, detail="Incorrect password")

    target = await db.users.find_one({"id": payload.user_id})
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    if payload.user_id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot change your own role")

    await db.users.update_one({"id": payload.user_id}, {"$set": {
        "is_admin": payload.new_role in ("admin", "super_admin"),
        "is_super_admin": payload.new_role == "super_admin",
    }})

    return {"success": True, "user_id": payload.user_id, "new_role": payload.new_role}


# ============================================================================
# ADMIN — Orders, settings, theme, CMS, media, analytics
#
# These paths were called by the admin pages but implemented nowhere, so every
# admin screen fell back to mock data or an error toast.
#
# Settings and theme are stored as single documents and returned verbatim: the
# frontend merges the response into its own defaults (`{...prev, ...data}`),
# so persisting the shape it sends keeps the two in step without this layer
# having to know every field.
# ============================================================================

SETTINGS_DOC_ID = "store_settings"
THEME_DOC_ID = "store_theme"

# Overridable so tests (and any deployment using a mounted volume) can write
# somewhere other than the repository tree.
UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", ROOT_DIR / "static" / "uploads"))
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/static", StaticFiles(directory=str(ROOT_DIR / "static")), name="static")

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_UPLOAD_BYTES = 5 * 1024 * 1024


class OrderStatusUpdate(BaseModel):
    status: OrderStatus


async def _get_singleton(doc_id: str) -> Dict[str, Any]:
    doc = await db.site_config.find_one({"_id": doc_id})
    if not doc:
        return {}
    doc.pop("_id", None)
    return doc


async def _put_singleton(doc_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    payload = {k: v for k, v in payload.items() if k != "_id"}
    payload["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.site_config.update_one({"_id": doc_id}, {"$set": payload}, upsert=True)
    return payload


# ---------------------------------------------------------------------------
# How a customer pays
# ---------------------------------------------------------------------------
#
# There is no card gateway, and there will not be one until the paperwork for a
# merchant account exists. What the shop does have is a bank account, which is
# a real way to be paid — so the checkout offers it, with the details the payer
# actually needs and the order number to quote.
#
# The details are configuration, never code. An IBAN written into a source file
# is one deploy away from sending a customer's money to the wrong account, and
# a half-filled bank block is not a payment method — it is a transfer that
# bounces. So a method is offered only when everything a payer needs is there.

PAYMENT_DOC_ID = "store_payment"

# Where iyzico sends the customer back to, and where the shop lives. These
# leave our own process and are typed into a payment provider's records, so
# they cannot be guessed from the incoming request's Host header — that header
# is whatever the caller wrote in it.
PUBLIC_API_URL = os.getenv("PUBLIC_API_URL", "https://auraa-luxury-api.onrender.com").rstrip("/")
PUBLIC_SITE_URL = os.getenv("PUBLIC_SITE_URL", "https://auraaluxury.com").rstrip("/")

BANK_TRANSFER_REQUIRED = ("bank_name", "account_holder", "iban")

# The fallback the shop already runs by hand: the order is placed, and the
# owner arranges payment with the customer before anything ships. It is not
# automated, but it is not fiction either — it describes what really happens.
ON_CONFIRMATION = "on_confirmation"
BANK_TRANSFER = "bank_transfer"
CARD = "card"


def _bank_transfer_option(cfg: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """The bank block as a customer should see it, or None if unusable."""
    bank = (cfg or {}).get(BANK_TRANSFER) or {}
    if not bank.get("enabled"):
        return None
    if any(not str(bank.get(field) or "").strip() for field in BANK_TRANSFER_REQUIRED):
        return None
    return {
        "id": BANK_TRANSFER,
        "bank_name": str(bank["bank_name"]).strip(),
        "account_holder": str(bank["account_holder"]).strip(),
        "iban": str(bank["iban"]).strip().replace(" ", "").upper(),
        # Optional: a wire from abroad needs the SWIFT/BIC, a domestic one does not.
        "swift": str(bank.get("swift") or "").strip() or None,
        "account_currency": str(bank.get("account_currency") or "").strip() or None,
        "instructions": str(bank.get("instructions") or "").strip() or None,
    }


async def available_payment_methods() -> List[Dict[str, Any]]:
    """Every method a customer can actually use right now."""
    from services import iyzico_client

    cfg = await _get_singleton(PAYMENT_DOC_ID)
    methods: List[Dict[str, Any]] = []

    # A card, on the site, from any country — what every shop in the world
    # offers, and the only one of these three a stranger in another hemisphere
    # will actually go through with. First in the list because it is the one
    # customers expect.
    card_live = iyzico_client.is_configured()
    if card_live:
        methods.append({
            "id": CARD,
            "provider": "iyzico",
            "currency": iyzico_client.CURRENCY,
            # Surfaced so the shop can never quietly run a rehearsal in front
            # of paying customers: sandbox marks orders paid without money.
            "sandbox": iyzico_client.SANDBOX,
        })

    # A wire transfer to a Turkish account is a real way to be paid and a poor
    # way to be bought from. It stays available while there is no card option,
    # and steps aside once there is.
    bank = _bank_transfer_option(cfg)
    if bank and not card_live:
        methods.append(bank)

    # Defaults to on, so configuring anything else is an improvement rather
    # than the moment the shop starts taking orders at all.
    if (cfg.get(ON_CONFIRMATION) or {}).get("enabled", True) and not card_live:
        methods.append({"id": ON_CONFIRMATION})

    return methods


@api_router.get("/payment-methods")
async def get_payment_methods():
    """
    What the checkout may offer. Public on purpose: an IBAN is for giving to
    the people who owe you money.
    """
    return {"methods": await available_payment_methods()}


@api_router.get("/admin/payment-settings")
async def admin_get_payment_settings(admin: User = Depends(get_admin_user)):
    from services import iyzico_client

    cfg = await _get_singleton(PAYMENT_DOC_ID)
    return {
        BANK_TRANSFER: cfg.get(BANK_TRANSFER) or {},
        ON_CONFIRMATION: cfg.get(ON_CONFIRMATION) or {"enabled": True},
        # The card gateway is configured through the host's environment, not
        # this document — an API secret in the database is an API secret in
        # every backup of it. Reported read-only so the screen can say whether
        # it is on without ever being able to print the key.
        CARD: {
            "configured": iyzico_client.is_configured(),
            "provider": "iyzico",
            "mode": iyzico_client.mode(),
            "currency": iyzico_client.CURRENCY,
        },
        # So the screen can say plainly whether customers are being offered
        # this, rather than leaving the owner to work it out from the fields.
        "live_methods": [m["id"] for m in await available_payment_methods()],
    }


@api_router.put("/admin/payment-settings")
async def admin_update_payment_settings(
    payload: Dict[str, Any],
    admin: User = Depends(get_admin_user)
):
    bank = payload.get(BANK_TRANSFER) or {}
    updates: Dict[str, Any] = {
        BANK_TRANSFER: {
            "enabled": bool(bank.get("enabled")),
            "bank_name": str(bank.get("bank_name") or "").strip(),
            "account_holder": str(bank.get("account_holder") or "").strip(),
            "iban": str(bank.get("iban") or "").strip().replace(" ", "").upper(),
            "swift": str(bank.get("swift") or "").strip(),
            "account_currency": str(bank.get("account_currency") or "").strip(),
            "instructions": str(bank.get("instructions") or "").strip(),
        },
        ON_CONFIRMATION: {
            "enabled": bool((payload.get(ON_CONFIRMATION) or {}).get("enabled", True)),
        },
    }

    # Turning it on with a field missing would show customers a payment box
    # they cannot pay into. Say which field, here, while it can still be typed.
    if updates[BANK_TRANSFER]["enabled"]:
        missing = [f for f in BANK_TRANSFER_REQUIRED if not updates[BANK_TRANSFER][f]]
        if missing:
            raise HTTPException(
                status_code=400,
                detail="Bank transfer needs: " + ", ".join(f.replace("_", " ") for f in missing),
            )

    await _put_singleton(PAYMENT_DOC_ID, updates)
    return {**updates, "live_methods": [m["id"] for m in await available_payment_methods()]}


# ---------------------------------------------------------------------------
# Orders (admin view)
# ---------------------------------------------------------------------------

@api_router.get("/admin/orders")
async def admin_list_orders(
    status: Optional[OrderStatus] = None,
    admin: User = Depends(get_admin_user)
):
    query = {"status": status.value} if status else {}
    orders = await db.orders.find(query).sort("created_at", -1).to_list(length=None)

    for order in orders:
        order.pop("_id", None)
        # The table shows who placed each order.
        user = await db.users.find_one({"id": order.get("user_id")})
        order["customer_email"] = user.get("email") if user else None
        order["customer_name"] = user.get("name") if user else None

    return orders


@api_router.put("/admin/orders/{order_id}")
async def admin_update_order_status(
    order_id: str,
    payload: OrderStatusUpdate,
    admin: User = Depends(get_admin_user)
):
    result = await db.orders.update_one(
        {"id": order_id},
        {"$set": {"status": payload.status.value,
                  "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")

    return {"success": True, "id": order_id, "status": payload.status.value}


# ---------------------------------------------------------------------------
# Settings and theme
# ---------------------------------------------------------------------------

@api_router.get("/admin/settings")
async def admin_get_settings(admin: User = Depends(get_admin_user)):
    return await _get_singleton(SETTINGS_DOC_ID)


@api_router.put("/admin/settings")
async def admin_update_settings(
    payload: Dict[str, Any],
    admin: User = Depends(get_admin_user)
):
    return await _put_singleton(SETTINGS_DOC_ID, payload)


@api_router.get("/admin/theme")
async def admin_get_theme(admin: User = Depends(get_admin_user)):
    return await _get_singleton(THEME_DOC_ID)


@api_router.put("/admin/theme")
async def admin_update_theme(
    payload: Dict[str, Any],
    admin: User = Depends(get_admin_user)
):
    return await _put_singleton(THEME_DOC_ID, payload)


# ---------------------------------------------------------------------------
# CMS pages
# ---------------------------------------------------------------------------

@api_router.get("/admin/cms-pages")
async def admin_list_cms_pages(admin: User = Depends(get_admin_user)):
    pages = await db.cms_pages.find({}).to_list(length=None)
    for page in pages:
        page.pop("_id", None)
    return pages


@api_router.post("/admin/cms-pages")
async def admin_create_cms_page(page: CMSPage, admin: User = Depends(get_admin_user)):
    if await db.cms_pages.find_one({"slug": page.slug}):
        raise HTTPException(status_code=400, detail="A page with this slug already exists")

    await db.cms_pages.insert_one(page.model_dump())
    return page


@api_router.put("/admin/cms-pages/{page_id}")
async def admin_update_cms_page(
    page_id: str,
    updates: Dict[str, Any],
    admin: User = Depends(get_admin_user)
):
    updates = {k: v for k, v in updates.items() if k not in ("_id", "id")}
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()

    result = await db.cms_pages.update_one({"id": page_id}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Page not found")

    page = await db.cms_pages.find_one({"id": page_id})
    page.pop("_id", None)
    return page


@api_router.delete("/admin/cms-pages/{page_id}")
async def admin_delete_cms_page(page_id: str, admin: User = Depends(get_admin_user)):
    result = await db.cms_pages.delete_one({"id": page_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Page not found")
    return {"success": True, "id": page_id}


@api_router.get("/cms-pages/{slug}")
async def get_public_cms_page(slug: str):
    """Public read for a published page, used to render CMS-driven routes."""
    page = await db.cms_pages.find_one({"slug": slug, "is_active": True})
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    page.pop("_id", None)
    return page


# ---------------------------------------------------------------------------
# Media
#
# Files are written to the local static directory. On Render's ephemeral disk
# these do not survive a redeploy — object storage is the durable answer, but
# that needs bucket credentials this codebase does not yet carry.
# ---------------------------------------------------------------------------

@api_router.post("/admin/upload-image")
async def admin_upload_image(
    file: UploadFile = File(...),
    admin: User = Depends(get_admin_user)
):
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported type {file.content_type}. Allowed: JPEG, PNG, WebP, GIF"
        )

    contents = await file.read()
    if len(contents) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=400, detail="File exceeds the 5 MB limit")

    # Verify it really is an image rather than trusting the declared type.
    try:
        Image.open(io.BytesIO(contents)).verify()
    except Exception:
        raise HTTPException(status_code=400, detail="File is not a valid image")

    # Generate the name: a caller-supplied filename could escape the directory.
    suffix = Path(file.filename or "").suffix.lower() or ".jpg"
    if suffix not in (".jpg", ".jpeg", ".png", ".webp", ".gif"):
        suffix = ".jpg"
    stored_name = f"{uuid.uuid4()}{suffix}"

    async with aiofiles.open(UPLOAD_DIR / stored_name, "wb") as f:
        await f.write(contents)

    url = f"/static/uploads/{stored_name}"
    await db.media.insert_one({
        "id": str(uuid.uuid4()),
        "filename": stored_name,
        "original_name": file.filename,
        "url": url,
        "size": len(contents),
        "content_type": file.content_type,
        "uploaded_by": admin.id,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })

    return {"url": url, "filename": stored_name, "size": len(contents)}


@api_router.get("/admin/media")
async def admin_list_media(admin: User = Depends(get_admin_user)):
    items = await db.media.find({}).sort("created_at", -1).to_list(length=None)
    for item in items:
        item.pop("_id", None)
    return items


@api_router.delete("/admin/media/{media_id}")
async def admin_delete_media(media_id: str, admin: User = Depends(get_admin_user)):
    item = await db.media.find_one({"id": media_id})
    if not item:
        raise HTTPException(status_code=404, detail="Media not found")

    # Remove the file, but treat a missing one as already deleted.
    try:
        (UPLOAD_DIR / item["filename"]).unlink(missing_ok=True)
    except Exception as e:
        logger.warning(f"Could not remove media file {item.get('filename')}: {e}")

    await db.media.delete_one({"id": media_id})
    return {"success": True, "id": media_id}


# ---------------------------------------------------------------------------
# Analytics
# ---------------------------------------------------------------------------

@api_router.get("/admin/analytics")
async def admin_analytics(
    range: str = Query("30d", description="7d | 30d | 90d | all"),
    admin: User = Depends(get_admin_user)
):
    """Store metrics over a window, computed from orders/users/products."""
    days = {"7d": 7, "30d": 30, "90d": 90}.get(range)
    since = datetime.now(timezone.utc) - timedelta(days=days) if days else None

    orders = await db.orders.find({}).to_list(length=None)

    def in_window(order) -> bool:
        if since is None:
            return True
        created = order.get("created_at")
        if isinstance(created, str):
            try:
                created = datetime.fromisoformat(created.replace("Z", "+00:00"))
            except ValueError:
                return False
        if not isinstance(created, datetime):
            return False
        if created.tzinfo is None:
            created = created.replace(tzinfo=timezone.utc)
        return created >= since

    windowed = [o for o in orders if in_window(o)]
    revenue = sum(o.get("total_amount", 0) or 0 for o in windowed)

    status_counts: Dict[str, int] = {}
    for o in windowed:
        key = o.get("status", "pending")
        status_counts[key] = status_counts.get(key, 0) + 1

    # Best sellers by quantity across the window.
    sold: Dict[str, int] = {}
    for o in windowed:
        for item in o.get("items", []):
            sold[item["product_id"]] = sold.get(item["product_id"], 0) + item.get("quantity", 0)

    top_products = []
    for pid, qty in sorted(sold.items(), key=lambda kv: kv[1], reverse=True)[:5]:
        product = await db.products.find_one({"id": pid})
        top_products.append({
            "product_id": pid,
            "name": product.get("name") if product else "Unknown",
            "quantity_sold": qty,
        })

    return {
        "range": range,
        "total_revenue": round(revenue, 2),
        "total_orders": len(windowed),
        "average_order_value": round(revenue / len(windowed), 2) if windowed else 0,
        "total_users": await db.users.count_documents({}),
        "total_products": await db.products.count_documents({"staging": {"$ne": True}}),
        "orders_by_status": status_counts,
        "top_products": top_products,
    }


# ============================================================================
# SETUP — first admin bootstrap
#
# Without this there is no way to obtain the first admin account: every admin
# endpoint requires an existing admin, so the store could never be configured.
# ============================================================================

class FirstAdminRequest(BaseModel):
    email: EmailStr
    password: str
    name: Optional[str] = None
    setup_key: Optional[str] = None


@api_router.get("/setup/check-admin")
async def check_admin_exists():
    """Public: reports only whether setup is still needed, never who the admin is."""
    return {"has_admin": await db.users.count_documents({"is_admin": True}) > 0}


@api_router.post("/setup/create-first-admin")
async def create_first_admin(payload: FirstAdminRequest):
    """
    Create the initial super admin. Closes permanently once any admin exists,
    so it cannot be replayed to mint a second one.
    """
    if await db.users.count_documents({"is_admin": True}) > 0:
        raise HTTPException(status_code=403, detail="An admin already exists")

    # Optional shared secret, so a race to this endpoint on a fresh deploy
    # cannot be won by a stranger.
    expected_key = os.getenv("ADMIN_SETUP_KEY")
    if expected_key and payload.setup_key != expected_key:
        raise HTTPException(status_code=403, detail="Invalid setup key")

    if len(payload.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")

    if await db.users.find_one({"email": payload.email}):
        raise HTTPException(status_code=400, detail="Email already registered")

    user = {
        "id": str(uuid.uuid4()),
        "email": payload.email,
        "password": bcrypt.hashpw(payload.password.encode(), bcrypt.gensalt()).decode(),
        "name": payload.name or payload.email.split("@")[0],
        "phone": None,
        "is_admin": True,
        "is_super_admin": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(dict(user))
    logger.info(f"✅ First super admin created: {payload.email}")

    user.pop("password", None)
    user.pop("_id", None)
    return {"success": True, "user": user}


# ============================================================================
# ADMIN — Product management (bulk operations)
# ============================================================================

class BulkIdsRequest(BaseModel):
    ids: List[str]


class BulkUpdateRequest(BaseModel):
    ids: List[str]
    data: Dict[str, Any]


@api_router.get("/admin/products")
async def admin_list_products(
    include_staging: bool = False,
    admin: User = Depends(get_admin_user)
):
    """Unlike the storefront listing, this returns raw documents unfiltered by
    schema validity — the admin needs to see malformed rows in order to fix them."""
    query = {} if include_staging else {"staging": {"$ne": True}}
    products = await db.products.find(query).sort("created_at", -1).to_list(length=None)
    for p in products:
        p.pop("_id", None)
        # Everything imported before is_active existed has no such key, and the
        # admin catalogue reads a missing key as "inactive" — which is how every
        # live, selling product came to wear a red "Inactive" badge. Absent
        # means active, the same rule LIVE_ONLY applies when deciding what
        # shoppers see; state it here rather than leave the UI to guess.
        p.setdefault("is_active", True)
        _sane_reference_price(p)
        _readable_name(p)
        # Flag rows the storefront will refuse to render, with the reason, so
        # a product that exists but is invisible to customers is visible here.
        try:
            Product(**p)
            p["storefront_visible"] = True
            p["storefront_issue"] = None
        except Exception as e:
            p["storefront_visible"] = False
            p["storefront_issue"] = str(e).split("\n")[1].strip() if "\n" in str(e) else str(e)
    return products


@api_router.post("/admin/products/bulk-delete")
async def admin_bulk_delete_products(
    payload: BulkIdsRequest,
    admin: User = Depends(get_admin_user)
):
    if not payload.ids:
        raise HTTPException(status_code=400, detail="No product ids provided")

    result = await db.products.delete_many({"id": {"$in": payload.ids}})
    logger.info(f"🗑️  {admin.email} bulk-deleted {result.deleted_count} products")
    return {"success": True, "deleted": result.deleted_count}


@api_router.post("/admin/products/bulk-update")
async def admin_bulk_update_products(
    payload: BulkUpdateRequest,
    admin: User = Depends(get_admin_user)
):
    if not payload.ids:
        raise HTTPException(status_code=400, detail="No product ids provided")

    # `id` must not be settable in bulk — it would collapse many products onto one.
    updates = {k: v for k, v in payload.data.items() if k not in ("_id", "id")}
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.products.update_many({"id": {"$in": payload.ids}}, {"$set": updates})
    return {"success": True, "updated": result.modified_count}


@api_router.delete("/admin/products/{product_id}")
async def admin_delete_product(product_id: str, admin: User = Depends(get_admin_user)):
    result = await db.products.delete_one({"id": product_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"success": True, "id": product_id}


# ============================================================================
# ADMIN — Super admin account actions
# ============================================================================

class ResetPasswordRequest(BaseModel):
    user_id: str
    new_password: str
    current_password: Optional[str] = None


class ToggleStatusRequest(BaseModel):
    user_id: str
    is_active: Optional[bool] = None


@api_router.post("/admin/super-admin-reset-password")
async def super_admin_reset_password(
    payload: ResetPasswordRequest,
    admin: User = Depends(get_super_admin_user)
):
    return await admin_change_user_password(
        payload.user_id, ChangePasswordRequest(new_password=payload.new_password), admin
    )


@api_router.post("/admin/super-admin-toggle-status")
async def super_admin_toggle_status(
    payload: ToggleStatusRequest,
    admin: User = Depends(get_super_admin_user)
):
    """Enable or disable an account. Disabled users cannot authenticate."""
    user = await db.users.find_one({"id": payload.user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.get("is_super_admin"):
        raise HTTPException(status_code=400, detail="Cannot disable a super admin")

    new_value = payload.is_active if payload.is_active is not None \
        else not user.get("is_active", True)

    await db.users.update_one({"id": payload.user_id}, {"$set": {"is_active": new_value}})
    return {"success": True, "user_id": payload.user_id, "is_active": new_value}


# ============================================================================
# GEO / SHIPPING / PLACEHOLDER
# ============================================================================

@api_router.get("/geo/detect")
async def geo_detect(request: Request):
    """Detect the visitor's country for currency and VAT defaults."""
    try:
        from services.geoip_service import GeoIPService
        service = GeoIPService()
        country = service.get_country_from_request(request)
        config = service.get_country_config(country)

        return {
            "country_code": country,
            "currency": service.get_currency(country),
            "vat_rate": service.get_vat_rate(country),
            "is_gcc": service.is_gcc_country(country),
            "config": config,
        }
    except Exception as e:
        logger.warning(f"Geo detection failed, falling back to SA: {e}")
        # A detection failure must not break the storefront.
        return {"country_code": "SA", "currency": "SAR", "vat_rate": 0.15,
                "is_gcc": True, "config": {}}


@api_router.get("/placeholder/{width}/{height}")
async def placeholder_image(width: int, height: int):
    """Neutral placeholder used where a product image is missing."""
    width = max(1, min(width, 2000))
    height = max(1, min(height, 2000))

    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" '
        f'viewBox="0 0 {width} {height}">'
        f'<rect width="100%" height="100%" fill="#f4efe7"/>'
        f'<text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" '
        f'fill="#b9a88f" font-family="sans-serif" font-size="{max(10, min(width, height) // 8)}">'
        f'{width}×{height}</text></svg>'
    )
    return Response(content=svg, media_type="image/svg+xml",
                    headers={"Cache-Control": "public, max-age=86400"})


# ============================================================================
# AUTO-UPDATE — currency rates, price sync, scheduled task visibility
#
# Backed by the existing services (currency, scheduler, product sync), which
# were written but had no HTTP surface, so the AutoUpdatePage had nothing to
# call.
# ============================================================================

class ShippingItemRequest(BaseModel):
    product_id: str
    quantity: int = 1


class ShippingEstimateRequest(BaseModel):
    country_code: str = "SA"
    items: List[ShippingItemRequest] = []


@api_router.get("/auto-update/status")
async def auto_update_status(admin: User = Depends(get_admin_user)):
    """Snapshot of the background automation, for the AutoUpdate dashboard."""
    last_currency = await db.exchange_rates.find_one(sort=[("updated_at", -1)])
    last_sync = await db.sync_logs.find_one(sort=[("created_at", -1)])

    for doc in (last_currency, last_sync):
        if doc:
            doc.pop("_id", None)

    return {
        "scheduler_running": bool(getattr(app.state, "scheduler_running", False)),
        "last_currency_update": (last_currency or {}).get("updated_at"),
        "last_product_sync": (last_sync or {}).get("created_at"),
        "total_products": await db.products.count_documents({}),
        "pending_import_jobs": await db.import_jobs.count_documents(
            {"status": {"$in": ["pending", "running"]}}
        ),
    }


@api_router.get("/auto-update/currency-rates")
async def auto_update_currency_rates():
    """
    Today's exchange rates. Public on purpose.

    Every visitor's LanguageContext calls this on load to price the catalogue
    in their currency, but it required an admin token — so every customer got
    403 and the whole store silently fell back to USD-only rates. Published
    exchange rates are not secret; refreshing them still is (see the POST
    below, which stays admin-only).
    """
    try:
        from services.currency_service import get_currency_service
        service = get_currency_service(db)
        rates = await service.get_latest_rates("USD")
        return {"base": "USD", "rates": rates,
                # "live" or "fallback". The provider failing used to leave the
                # store with an empty rate table and no sign of it: prices
                # simply stopped following the currency switcher.
                "source": getattr(service, "last_source", "unknown"),
                "updated_at": datetime.now(timezone.utc).isoformat()}
    except Exception as e:
        logger.error(f"Could not load currency rates: {e}")
        raise HTTPException(status_code=502, detail="Currency service unavailable")


@api_router.post("/auto-update/trigger-currency-update")
async def auto_update_trigger_currency(admin: User = Depends(get_admin_user)):
    try:
        from services.currency_service import get_currency_service
        ok = await get_currency_service(db).update_exchange_rates()
        return {"success": bool(ok),
                "message": "Exchange rates refreshed" if ok else "Refresh failed"}
    except Exception as e:
        logger.error(f"Currency update failed: {e}")
        raise HTTPException(status_code=502, detail="Currency update failed")


@api_router.get("/auto-update/scheduled-task-logs")
async def auto_update_task_logs(limit: int = 50, admin: User = Depends(get_admin_user)):
    logs = await db.scheduled_task_logs.find({}).sort(
        "created_at", -1).to_list(length=max(1, min(limit, 500)))
    for log in logs:
        log.pop("_id", None)
    return logs


@api_router.get("/auto-update/bulk-import-tasks")
async def auto_update_import_tasks(limit: int = 50, admin: User = Depends(get_admin_user)):
    jobs = await db.import_jobs.find({}).sort(
        "created_at", -1).to_list(length=max(1, min(limit, 500)))
    for job in jobs:
        job.pop("_id", None)
    return jobs


@api_router.post("/auto-update/sync-products")
async def auto_update_sync_products(
    background_tasks: BackgroundTasks,
    admin: User = Depends(get_admin_user)
):
    """Kick off a supplier sync in the background and return immediately."""
    if not cj_credentials_configured():
        raise HTTPException(status_code=503, detail="CJ credentials are not configured")

    job_manager = ImportJobManager(db)
    job_id = await job_manager.create_job(
        job_type="sync", supplier="cj", params={"triggered_by": admin.email}
    )

    background_tasks.add_task(
        background_import_cj_products,
        job_id=job_id, keyword="luxury jewelry accessories",
        category_id=None, max_products=50, db=db,
    )

    return {"success": True, "jobId": job_id, "message": "Product sync started"}


@api_router.post("/auto-update/update-all-prices")
async def auto_update_all_prices(admin: User = Depends(get_admin_user)):
    """
    Recompute selling prices from cost using the pricing rules.
    Products without a cost are left untouched rather than zeroed out.
    """
    try:
        from services.pricing_service import PricingService
        pricing = PricingService()
    except Exception as e:
        logger.error(f"Pricing service unavailable: {e}")
        raise HTTPException(status_code=503, detail="Pricing service unavailable")

    products = await db.products.find({}).to_list(length=None)
    updated = skipped = 0

    for product in products:
        cost = product.get("cost_price") or product.get("source_price")
        if not cost:
            skipped += 1
            continue
        try:
            result = pricing.calculate_final_price(float(cost))
            price = result.get("final_price") if isinstance(result, dict) else float(result)
            await db.products.update_one(
                {"id": product["id"]},
                {"$set": {"price": round(float(price), 2),
                          "updated_at": datetime.now(timezone.utc).isoformat()}},
            )
            updated += 1
        except Exception as e:
            logger.warning(f"Price update skipped for {product.get('id')}: {e}")
            skipped += 1

    await db.scheduled_task_logs.insert_one({
        "task": "update-all-prices", "updated": updated, "skipped": skipped,
        "triggered_by": admin.email, "created_at": datetime.now(timezone.utc).isoformat(),
    })

    return {"success": True, "updated": updated, "skipped": skipped}


@api_router.post("/shipping/estimate")
async def shipping_estimate(payload: ShippingEstimateRequest):
    """Estimate shipping for a basket. Public — checkout needs it before login."""
    try:
        from services.geoip_service import GeoIPService
        config = GeoIPService().get_country_config(payload.country_code)
    except Exception:
        config = {}

    subtotal = 0.0
    for item in payload.items:
        product = await live_product(item.product_id)
        if product:
            subtotal += (product.get("price") or 0) * max(1, item.quantity)

    # Shipping is free because it is already paid for. Every imported product's
    # sale price is built by pricing_service as
    #     base_cost + supplier_shipping + local_shipping + profit + tax
    # so the delivery is inside the price the shopper already sees. Adding a
    # separate shipping line at checkout charged them for it a second time.
    return {
        "country_code": payload.country_code,
        "currency": config.get("currency", "SAR"),
        "subtotal": round(subtotal, 2),
        "shipping_cost": 0.0,
        "free_shipping": True,
        "shipping_included_in_price": True,
        "qualifies_for_free_shipping": True,
        # Said, not charged: a buyer outside Saudi Arabia may owe duty at their
        # own border, and the shop neither collects it nor can remit it. Hiding
        # that until the parcel is held at customs is how a good order becomes a
        # refund request.
        "import_duty_may_apply": bool(config.get("import_duty_may_apply")),
        # The store's own delivery window, in days. Not a supplier promise:
        # CJ's product listing carries no lead time, so this is what the shop
        # commits to. One value for the whole catalogue unless a country
        # configuration overrides it, and settable without a deploy.
        "estimated_days": config.get("delivery_days") or DELIVERY_DAYS,
    }


# ============================================================================
# AUTHENTICATION ROUTES
# ============================================================================
try:
    from routes.auth import router as auth_router
    api_router.include_router(auth_router)
    logger.info("✅ Auth routes loaded")
except Exception as e:
    logger.error(f"⚠️ Failed to load Auth routes: {e}")

# ============================================================================
# CJ ADMIN ROUTES - Rate Limited & Protected
# ============================================================================
try:
    from routes.cj_admin import router as cj_admin_router
    app.include_router(cj_admin_router)
    logger.info("✅ CJ Admin routes loaded with rate limiting")
except Exception as e:
    logger.error(f"⚠️ Failed to load CJ Admin routes: {e}")

# Include the router in the main app (MUST be after all routes are defined)
app.include_router(api_router)
