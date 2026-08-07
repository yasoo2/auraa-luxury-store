# routes/cj_admin.py
from fastapi import APIRouter, HTTPException, Depends
from services.cj_client import list_products, authenticate
from core.security import require_admin_doc
from services.import_service import bulk_import_products
from pydantic import BaseModel
from typing import Optional
import logging

logger = logging.getLogger(__name__)

# These endpoints spend CJ API quota and write products, so the whole router
# requires an admin caller. Previously every one of them was public.
router = APIRouter(
    prefix="/api/admin/cj",
    tags=["CJ Admin"],
    dependencies=[Depends(require_admin_doc)],
)

class ImportRequest(BaseModel):
    count: int = 50
    keyword: Optional[str] = "luxury jewelry"

@router.get("/ping")
async def cj_ping():
    """
    فحص سريع للاتصال بـ CJ API
    """
    try:
        logger.info("🏓 Pinging CJ API...")
        data = await list_products(page_num=1, page_size=1)
        
        return {
            "ok": True,
            "message": "✅ CJ API is reachable",
            "data": data
        }
    except Exception as e:
        logger.error(f"❌ CJ Ping failed: {e}")
        raise HTTPException(status_code=502, detail=f"CJ API error: {str(e)}")

@router.get("/test-auth")
async def test_auth():
    """
    اختبار التوثيق مع CJ
    """
    try:
        logger.info("🔐 Testing CJ authentication...")
        result = await authenticate()
        
        return {
            "ok": True,
            "message": "✅ Authentication successful",
            "data": result
        }
    except Exception as e:
        logger.error(f"❌ CJ Auth failed: {e}")
        raise HTTPException(status_code=502, detail=f"Authentication error: {str(e)}")

@router.post("/import/bulk")
async def import_bulk(request: ImportRequest):
    """
    استيراد عدد من المنتجات على دفعات
    
    Args:
        count: عدد المنتجات (1-1000)
        keyword: كلمة البحث
    """
    if request.count < 1 or request.count > 1000:
        raise HTTPException(status_code=400, detail="Count must be between 1 and 1000")
    
    try:
        logger.info(f"📦 Starting bulk import: {request.count} products with keyword '{request.keyword}'")
        
        results = await bulk_import_products(
            total_count=request.count,
            keyword=request.keyword
        )
        
        return {
            "ok": True,
            "message": f"✅ Import complete: {results['total_fetched']}/{request.count} products",
            "results": results
        }
    except Exception as e:
        logger.error(f"❌ Bulk import failed: {e}")
        raise HTTPException(status_code=500, detail=f"Import error: {str(e)}")

@router.get("/products/list")
async def list_cj_products(page: int = 1, size: int = 20, keyword: str = ""):
    """
    جلب قائمة المنتجات من CJ (للمعاينة)
    """
    try:
        if size > 100:
            size = 100  # حد أقصى
        
        logger.info(f"📋 Listing CJ products: page={page}, size={size}, keyword='{keyword}'")
        
        data = await list_products(page_num=page, page_size=size, keyword=keyword)
        
        return {
            "ok": True,
            "data": data
        }
    except Exception as e:
        logger.error(f"❌ List products failed: {e}")
        raise HTTPException(status_code=502, detail=f"CJ API error: {str(e)}")
