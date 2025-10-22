"""
Test routes for CJ Dropshipping API
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import Dict
import asyncio
import logging

from services.cj_dropshipping import CJDropshippingService, get_cj_service
from middleware.auth import verify_super_admin

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/test-cj-search")
async def test_cj_search(
    query: str = "women jewelry",
    page_size: int = 5,
    current_user: Dict = Depends(verify_super_admin)
):
    """
    Test CJ API search functionality
    """
    try:
        cj = CJDropshipping()
        
        # Test search in thread
        products = await asyncio.to_thread(
            cj.search_products, query, page=1, page_size=page_size
        )
        
        if not products:
            return {
                "success": False,
                "message": "No products found",
                "products_count": 0,
                "products": []
            }
        
        return {
            "success": True,
            "message": f"Found {len(products)} products",
            "products_count": len(products),
            "products": products[:3]  # Return first 3 for testing
        }
        
    except Exception as e:
        logger.error(f"Test CJ search error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/test-cj-sync")
async def test_cj_sync(
    product_id: str,
    country_code: str = "SA",
    current_user: Dict = Depends(verify_super_admin)
):
    """
    Test CJ API sync product functionality
    """
    try:
        cj = CJDropshipping()
        
        # Test sync in thread
        store_product = await asyncio.to_thread(
            cj.sync_product_to_store, product_id, country_code
        )
        
        if not store_product:
            return {
                "success": False,
                "message": "Failed to sync product",
                "product": None
            }
        
        return {
            "success": True,
            "message": "Product synced successfully",
            "product": store_product
        }
        
    except Exception as e:
        logger.error(f"Test CJ sync error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/test-cj-token")
async def test_cj_token(
    current_user: Dict = Depends(verify_super_admin)
):
    """
    Test CJ API token
    """
    try:
        cj = CJDropshipping()
        
        # Get token
        token = await asyncio.to_thread(cj.get_access_token)
        
        if not token:
            return {
                "success": False,
                "message": "Failed to get token"
            }
        
        return {
            "success": True,
            "message": "Token retrieved successfully",
            "token_length": len(token),
            "token_preview": token[:20] + "..." if len(token) > 20 else token
        }
        
    except Exception as e:
        logger.error(f"Test CJ token error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

