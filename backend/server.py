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

# Initialize CJ service (for readiness check)
try:
    from services.cj_dropshipping import CJDropshippingService
    cj_service = CJDropshippingService()
except Exception as e:
    logger.warning(f"CJ service initialization failed: {e}")
    cj_service = None

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI(title="لورا لاكشري API", version="1.0.0")

# Store database in app state for access in routes
app.state.db = db

# CORS Configuration - Load from environment variable
# This allows easy updates without code changes
import re

cors_origins_env = os.getenv('CORS_ORIGINS', '')
allowed_origins = [origin.strip() for origin in cors_origins_env.split(',') if origin.strip()]

# Fallback to default patterns if env variable is empty
if not allowed_origins:
    allowed_origins = [
        "https://auraaluxury.com",
        "https://www.auraaluxury.com",
        "https://api.auraaluxury.com",
        "http://localhost:3000",
        "http://localhost:8001",
    ]

# Preview deployments. Previously any origin merely *containing* ".vercel.app"
# was allowed with credentials, so https://evil.vercel.app — or even
# https://vercel.app.attacker.com — could read authenticated responses on
# behalf of a signed-in user. This anchors the match to the project's own
# preview subdomains and requires a full-host match.
_preview_pattern = os.getenv(
    'CORS_PREVIEW_REGEX',
    r'^https://[a-z0-9-]*auraa[a-z0-9-]*\.vercel\.app$'
)
try:
    PREVIEW_ORIGIN_RE = re.compile(_preview_pattern)
except re.error as e:
    logger.error(f"Invalid CORS_PREVIEW_REGEX ({e}); preview origins disabled")
    PREVIEW_ORIGIN_RE = None

# Localhost on any port, for local development only.
LOCALHOST_RE = re.compile(r'^http://(localhost|127\.0\.0\.1)(:\d+)?$')

logger.info(
    f"✅ CORS: {len(allowed_origins)} exact origins, "
    f"preview pattern={_preview_pattern!r}"
)


def is_origin_allowed(origin: Optional[str]) -> bool:
    """Exact-match an origin, or match the anchored preview/localhost patterns."""
    if not origin:
        return False
    if origin in allowed_origins:
        return True
    if PREVIEW_ORIGIN_RE and PREVIEW_ORIGIN_RE.match(origin):
        return True
    return bool(LOCALHOST_RE.match(origin))


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


# =============================================================================
# Health Checks
# =============================================================================

async def _health_payload():
    """Shared health body. Reports DB reachability without failing the check."""
    db_ok = True
    try:
        await db.command("ping")
    except Exception:
        db_ok = False

    return {
        "status": "ok",
        "db": db_ok,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


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
        
        # Add product pages (fetch from database)
        products = await db.products.find({"in_stock": True}).to_list(length=500)
        
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

@api_router.post("/imports/start")
async def start_import_job(
    background_tasks: BackgroundTasks,
    source: str = "cj",
    count: int = 50,
    batch_size: int = 20,
    keyword: str = "luxury jewelry accessories",
    admin: User = Depends(get_admin_user)
):
    """
    Start a new import job from CJ Dropshipping
    Returns job_id for tracking progress
    """
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
            cj_service=cj_service
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
        
        # Check CJ Dropshipping service
        vendors_ok = True
        try:
            # Quick check if CJ service is initialized
            if not cj_service:
                vendors_ok = False
        except:
            vendors_ok = False
        
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

def _localize(doc: Dict[str, Any], language: Optional[str]) -> Dict[str, Any]:
    """Pick the localized name/description, falling back across languages."""
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
    """List live products. Staging products are excluded from the storefront."""
    query: Dict[str, Any] = {"staging": {"$ne": True}}

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
    product = await db.products.find_one({"id": product_id})
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

    product = await db.products.find_one({"id": product_id})
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

    docs = await db.products.find({"id": {"$in": product_ids}}).to_list(length=None)
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
    product = await db.products.find_one({"id": payload.product_id})
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
    current_user: User = Depends(get_current_user)
):
    cart = await db.carts.find_one({"user_id": current_user.id})
    if not cart or not cart.get("items"):
        raise HTTPException(status_code=400, detail="Cart is empty")

    order = Order(
        user_id=current_user.id,
        items=cart["items"],
        total_amount=cart["total_amount"],
        currency="SAR",
        order_number=f"AUR-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{str(uuid.uuid4())[:8].upper()}",
        tracking_number=f"TRK-{str(uuid.uuid4())[:10].upper()}",
        shipping_address=order_data.shipping_address,
        payment_method=order_data.payment_method
    )

    await db.orders.insert_one(order.model_dump())

    # Empty the cart now that its contents belong to the order.
    await db.carts.update_one(
        {"user_id": current_user.id},
        {"$set": {"items": [], "total_amount": 0.0}}
    )

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
            "shipping_address": o.get("shipping_address", {})
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
