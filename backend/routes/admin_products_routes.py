"""
Admin routes for product management
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import Dict
import logging
from motor.motor_asyncio import AsyncIOMotorClient
import os

from middleware.auth import verify_super_admin

router = APIRouter()
logger = logging.getLogger(__name__)

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]


@router.delete("/delete-all-products")
async def delete_all_products(
    current_user: Dict = Depends(verify_super_admin)
):
    """
    Delete all products from the database
    WARNING: This action cannot be undone!
    """
    try:
        # Count products before deletion
        count_before = await db.products.count_documents({})
        
        # Delete all products
        result = await db.products.delete_many({})
        
        # Count products after deletion
        count_after = await db.products.count_documents({})
        
        logger.info(f"Deleted {result.deleted_count} products")
        
        return {
            "success": True,
            "message": f"Successfully deleted {result.deleted_count} products",
            "count_before": count_before,
            "count_after": count_after,
            "deleted_count": result.deleted_count
        }
        
    except Exception as e:
        logger.error(f"Error deleting products: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/products-count")
async def get_products_count(
    current_user: Dict = Depends(verify_super_admin)
):
    """
    Get total number of products in database
    """
    try:
        count = await db.products.count_documents({})
        
        return {
            "success": True,
            "count": count
        }
        
    except Exception as e:
        logger.error(f"Error counting products: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

