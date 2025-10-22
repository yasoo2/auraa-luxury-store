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

# Initialize CJ service (for readiness check)
try:
    from services.cj_dropshipping import CJDropshippingService
    cj_service = CJDropshippingService()
except Exception as e:
    logger.warning(f"CJ service initialization failed: {e}")
    cj_service = None

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI(title="لورا لاكشري API", version="1.0.0")

# CORS Configuration - Load from environment variable
# This allows easy updates without code changes
cors_origins_env = os.getenv('CORS_ORIGINS', '')
allowed_origins = [origin.strip() for origin in cors_origins_env.split(',') if origin.strip()]

# Fallback to default patterns if env variable is empty
if not allowed_origins:
    # Get app name from environment for dynamic Emergent URLs
    app_name = os.getenv('APP_NAME', 'app')
    
    allowed_origins = [
        "https://auraaluxury.com",
        "https://www.auraaluxury.com",
        "https://api.auraaluxury.com",
        f"https://cjdrop-import.preview.emergentagent.com",
        f"https://{app_name}.emergent.host",
        "http://localhost:3000",
        "http://localhost:8001",
    ]

print(f"✅ CORS configured with {len(allowed_origins)} origins")

# Custom CORS Handler for Vercel Preview URLs
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response as StarletteResponse

class CustomCORSMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        origin = request.headers.get("origin")
        
        # Check if origin matches patterns
        is_allowed = False
        if origin:
            # Exact match
            if origin in allowed_origins:
                is_allowed = True
            # Vercel preview URLs
            elif ".vercel.app" in origin:
                is_allowed = True
            # Development localhost with any port
            elif origin.startswith("http://localhost") or origin.startswith("http://127.0.0.1"):
                is_allowed = True
            # Emergent preview URLs
            elif ".emergentagent.com" in origin or ".emergent.host" in origin:
                is_allowed = True
        
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

# Apply custom CORS middleware FIRST
app.add_middleware(CustomCORSMiddleware)

api_router = APIRouter(prefix="/api")

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
    keyword: str = "luxury jewelry accessories"
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
            total_count=count,
            keyword=keyword,
            db=db
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
async def get_unified_import_status(job_id: str):
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
async def get_staging_products(job_id: Optional[str] = None):
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
async def update_staging_product(product_id: str, updates: Dict[str, Any]):
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
async def delete_staging_product(product_id: str):
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
async def publish_staging_products(data: Dict[str, Any]):
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
