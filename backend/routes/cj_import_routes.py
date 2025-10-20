"""
CJ Dropshipping Bulk Import Routes
Endpoints for bulk importing products from CJ
"""

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from typing import List, Optional
from pydantic import BaseModel
import logging
import asyncio
from datetime import datetime
import uuid

from services.cj_dropshipping import get_cj_service, CJDropshippingService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/admin", tags=["CJ Bulk Import"])


class BulkImportRequest(BaseModel):
    count: int = 500
    query: str = "women accessories beauty jewelry"
    provider: str = "cj"
    country_code: str = "SA"


class ImportJobStatus(BaseModel):
    job_id: str
    status: str  # pending, processing, completed, failed
    total_items: int
    processed_items: int
    percent: int
    started_at: str
    completed_at: Optional[str] = None
    error: Optional[str] = None


# In-memory job storage (in production, use Redis or database)
import_jobs = {}


async def import_products_from_cj(
    job_id: str,
    query: str,
    count: int,
    country_code: str,
    cj: CJDropshippingService,
    db
):
    """
    Background task to import products from CJ
    
    Args:
        job_id: Unique job ID
        query: Search query
        count: Number of products to import
        country_code: Target country code
        cj: CJ service instance
        db: Database connection
    """
    try:
        # Update job status
        import_jobs[job_id]['status'] = 'processing'
        import_jobs[job_id]['started_at'] = datetime.utcnow().isoformat()
        
        logger.info(f"Starting bulk import job {job_id}: {count} products with query '{query}'")
        
        # Calculate how many pages we need
        page_size = 200  # Max per page
        total_pages = (count + page_size - 1) // page_size
        
        imported_count = 0
        failed_count = 0
        
        for page in range(1, total_pages + 1):
            try:
                # Calculate how many products to fetch in this page
                remaining = count - imported_count
                current_page_size = min(page_size, remaining)
                
                if current_page_size <= 0:
                    break
                
                logger.info(f"Fetching page {page}/{total_pages} ({current_page_size} products)")
                
                # Search products from CJ
                products = cj.search_products(query, page=page, page_size=current_page_size)
                
                if not products:
                    logger.warning(f"No products found on page {page}")
                    continue
                
                # Import each product
                for product in products:
                    try:
                        product_id = product.get('pid')
                        if not product_id:
                            continue
                        
                        # Sync product to store format
                        store_product = cj.sync_product_to_store(product_id, country_code)
                        
                        if store_product:
                            # Save to database
                            # Check if product already exists
                            existing = await db.products.find_one({"cj_product_id": product_id})
                            
                            if existing:
                                # Update existing product
                                await db.products.update_one(
                                    {"cj_product_id": product_id},
                                    {"$set": store_product}
                                )
                                logger.info(f"Updated product {product_id}")
                            else:
                                # Insert new product
                                await db.products.insert_one(store_product)
                                logger.info(f"Imported new product {product_id}")
                            
                            imported_count += 1
                        else:
                            failed_count += 1
                            logger.warning(f"Failed to sync product {product_id}")
                        
                        # Update progress
                        import_jobs[job_id]['processed_items'] = imported_count
                        import_jobs[job_id]['percent'] = int((imported_count / count) * 100)
                        
                    except Exception as e:
                        failed_count += 1
                        logger.error(f"Error importing product: {str(e)}")
                        continue
                
                # Small delay between pages to avoid rate limits
                await asyncio.sleep(2)
                
            except Exception as e:
                logger.error(f"Error fetching page {page}: {str(e)}")
                continue
        
        # Mark job as completed
        import_jobs[job_id]['status'] = 'completed'
        import_jobs[job_id]['completed_at'] = datetime.utcnow().isoformat()
        import_jobs[job_id]['processed_items'] = imported_count
        import_jobs[job_id]['percent'] = 100
        
        logger.info(f"Bulk import job {job_id} completed: {imported_count} imported, {failed_count} failed")
        
    except Exception as e:
        # Mark job as failed
        import_jobs[job_id]['status'] = 'failed'
        import_jobs[job_id]['error'] = str(e)
        import_jobs[job_id]['completed_at'] = datetime.utcnow().isoformat()
        logger.error(f"Bulk import job {job_id} failed: {str(e)}")


@router.post("/import-fast")
async def bulk_import_products(
    request: BulkImportRequest,
    background_tasks: BackgroundTasks,
    cj: CJDropshippingService = Depends(get_cj_service)
):
    """
    Start bulk import of products from CJ Dropshipping
    
    Args:
        request: Import parameters
        background_tasks: FastAPI background tasks
        cj: CJ service instance
        
    Returns:
        Job ID and status
    """
    try:
        # Only support CJ provider for now
        if request.provider != 'cj':
            raise HTTPException(
                status_code=400,
                detail=f"Provider '{request.provider}' not supported yet. Only 'cj' is supported."
            )
        
        # Validate count
        if request.count <= 0 or request.count > 1000:
            raise HTTPException(
                status_code=400,
                detail="Count must be between 1 and 1000"
            )
        
        # Create job ID
        job_id = str(uuid.uuid4())
        
        # Initialize job status
        import_jobs[job_id] = {
            'job_id': job_id,
            'status': 'pending',
            'total_items': request.count,
            'processed_items': 0,
            'percent': 0,
            'query': request.query,
            'provider': request.provider,
            'started_at': None,
            'completed_at': None,
            'error': None
        }
        
        # Get database connection
        from motor.motor_asyncio import AsyncIOMotorClient
        import os
        mongo_url = os.environ['MONGO_URL']
        client = AsyncIOMotorClient(mongo_url)
        db = client[os.environ['DB_NAME']]
        
        # Start background import task
        background_tasks.add_task(
            import_products_from_cj,
            job_id,
            request.query,
            request.count,
            request.country_code,
            cj,
            db
        )
        
        logger.info(f"Started bulk import job {job_id} for {request.count} products")
        
        return {
            "success": True,
            "task_id": job_id,
            "message": f"Started importing {request.count} products from CJ Dropshipping",
            "status": "pending"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to start bulk import: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to start import: {str(e)}")


@router.get("/import-jobs/{job_id}")
async def get_import_job_status(job_id: str):
    """
    Get status of an import job
    
    Args:
        job_id: Job ID
        
    Returns:
        Job status
    """
    if job_id not in import_jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return import_jobs[job_id]


@router.get("/import-jobs")
async def list_import_jobs():
    """
    List all import jobs
    
    Returns:
        List of jobs
    """
    # Return jobs sorted by start time (most recent first)
    jobs = list(import_jobs.values())
    jobs.sort(key=lambda x: x.get('started_at') or '', reverse=True)
    return {"jobs": jobs}


@router.post("/sync-now")
async def sync_products_now(
    background_tasks: BackgroundTasks,
    provider: str = "cj",
    cj: CJDropshippingService = Depends(get_cj_service)
):
    """
    Sync prices and inventory for existing CJ products
    
    Args:
        background_tasks: FastAPI background tasks
        provider: Provider name
        cj: CJ service instance
        
    Returns:
        Success message
    """
    try:
        if provider != 'cj':
            raise HTTPException(
                status_code=400,
                detail=f"Provider '{provider}' not supported yet. Only 'cj' is supported."
            )
        
        # TODO: Implement sync logic
        # This would:
        # 1. Get all products with cj_product_id from database
        # 2. For each product, fetch latest price and inventory from CJ
        # 3. Update database with new values
        
        return {
            "success": True,
            "message": "Sync feature coming soon!"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Sync failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Sync failed: {str(e)}")

