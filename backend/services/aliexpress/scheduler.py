"""
AliExpress Automated Synchronization Scheduler
Manages periodic product updates using APScheduler.
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.triggers.cron import CronTrigger
from apscheduler.events import EVENT_JOB_EXECUTED, EVENT_JOB_ERROR
from pydantic import BaseModel
from motor.motor_asyncio import AsyncIOMotorDatabase

from .product_sync import ProductSyncService


class SyncJobMonitor(BaseModel):
    """Monitor sync job execution and statistics."""
    job_id: str
    last_run: Optional[datetime] = None
    last_success: Optional[datetime] = None
    last_error: Optional[datetime] = None
    total_runs: int = 0
    successful_runs: int = 0
    failed_runs: int = 0
    average_duration: float = 0.0
    last_sync_stats: Optional[Dict[str, Any]] = None


class AliExpressSyncScheduler:
    """
    Automated synchronization scheduler using APScheduler.
    Manages periodic product, price, and inventory updates.
    """
    
    def __init__(
        self,
        sync_service: ProductSyncService,
        db: AsyncIOMotorDatabase,
        sync_interval_minutes: int = 10
    ):
        """
        Initialize sync scheduler.
        
        Args:
            sync_service: Product sync service instance
            db: MongoDB database instance
            sync_interval_minutes: Interval between full syncs
        """
        self.sync_service = sync_service
        self.db = db
        self.sync_interval = sync_interval_minutes
        self.scheduler = AsyncIOScheduler()
        self.job_monitors: Dict[str, SyncJobMonitor] = {}
        
        # Configure logging
        self.logger = logging.getLogger(__name__)
        
        # Add event listeners
        self.scheduler.add_listener(
            self._job_executed_listener,
            EVENT_JOB_EXECUTED | EVENT_JOB_ERROR
        )
    
    def _job_executed_listener(self, event):
        """Listen to job execution events for monitoring."""
        job_id = event.job_id
        
        if job_id not in self.job_monitors:
            self.job_monitors[job_id] = SyncJobMonitor(job_id=job_id)
        
        monitor = self.job_monitors[job_id]
        monitor.last_run = datetime.utcnow()
        monitor.total_runs += 1
        
        if event.exception:
            monitor.failed_runs += 1
            monitor.last_error = datetime.utcnow()
            self.logger.error(
                f"Job {job_id} failed: {event.exception}",
                exc_info=event.exception
            )
        else:
            monitor.successful_runs += 1
            monitor.last_success = datetime.utcnow()
            
            # Calculate average duration
            if event.retval:
                duration = event.retval.get('duration', 0)
                monitor.average_duration = (
                    (monitor.average_duration * (monitor.successful_runs - 1) + duration)
                    / monitor.successful_runs
                )
    
    async def sync_all_products(self) -> Dict[str, Any]:
        """
        Synchronize all products in database.
        Updates prices, inventory, and availability.
        """
        start_time = datetime.utcnow()
        stats = {
            'start_time': start_time.isoformat(),
            'products_updated': 0,
            'products_failed': 0,
            'errors': []
        }
        
        try:
            # Get all active products from database
            cursor = self.db.products.find({'sync_status': 'active'})
            products = await cursor.to_list(length=None)
            
            self.logger.info(f"Starting sync for {len(products)} products")
            
            # Sync products in batches
            product_ids = [p['product_id'] for p in products]
            batch_results = await self.sync_service.sync_products_batch(
                product_ids,
                batch_size=10
            )
            
            stats['products_updated'] = batch_results['successful']
            stats['products_failed'] = batch_results['failed']
            
        except Exception as e:
            self.logger.error(f"Sync job failed: {e}", exc_info=True)
            stats['errors'].append(str(e))
        
        end_time = datetime.utcnow()
        stats['end_time'] = end_time.isoformat()
        stats['duration'] = (end_time - start_time).total_seconds()
        
        # Store sync stats in database
        await self.db.sync_logs.insert_one(stats)
        
        self.logger.info(
            f"Sync completed: {stats['products_updated']} updated, "
            f"{stats['products_failed']} failed, "
            f"duration: {stats['duration']:.2f}s"
        )
        
        return stats
    
    async def quick_price_sync(self) -> Dict[str, Any]:
        """
        Quick price-only update for all products.
        Faster than full sync, runs more frequently.
        """
        start_time = datetime.utcnow()
        stats = {
            'start_time': start_time.isoformat(),
            'prices_updated': 0,
            'errors': []
        }
        
        try:
            cursor = self.db.products.find({'sync_status': 'active'})
            products = await cursor.to_list(length=None)
            
            for product in products:
                try:
                    # Get current product details from API
                    updated = await self.sync_service.get_product_details(
                        product['product_id']
                    )
                    
                    if updated:
                        # Update only price fields
                        await self.db.products.update_one(
                            {'product_id': product['product_id']},
                            {
                                '$set': {
                                    'original_price': updated.original_price,
                                    'sale_price': updated.sale_price,
                                    'last_synced': datetime.utcnow()
                                }
                            }
                        )
                        stats['prices_updated'] += 1
                        
                except Exception as e:
                    self.logger.warning(
                        f"Failed to update price for {product['product_id']}: {e}"
                    )
                    stats['errors'].append({
                        'product_id': product['product_id'],
                        'error': str(e)
                    })
                
                # Rate limiting delay
                await asyncio.sleep(0.5)
        
        except Exception as e:
            self.logger.error(f"Price sync failed: {e}", exc_info=True)
            stats['errors'].append(str(e))
        
        end_time = datetime.utcnow()
        stats['end_time'] = end_time.isoformat()
        stats['duration'] = (end_time - start_time).total_seconds()
        
        await self.db.sync_logs.insert_one(stats)
        
        return stats
    
    def start_scheduler(self):
        """Start the scheduler with configured jobs."""
        
        # Schedule main sync jobs - Every 10 minutes for fast updates
        self.scheduler.add_job(
            self.sync_all_products,
            IntervalTrigger(minutes=10),  # Changed to 10 minutes
            id="sync_all_products",
            name="Sync All Products (10min)",
            replace_existing=True,
            max_instances=1
        )
        
        # Schedule price/inventory sync - Every 5 minutes for critical updates
        self.scheduler.add_job(
            self.quick_price_sync,
            IntervalTrigger(minutes=5),
            id="quick_price_sync",
            name="Quick Price & Inventory Sync (5min)",
            replace_existing=True,
            max_instances=1
        )
        
        # Schedule daily maintenance
        self.scheduler.add_job(
            self.daily_maintenance,
            CronTrigger(hour=2, minute=0),
            id="daily_maintenance",
            name="Daily Maintenance",
            replace_existing=True,
            max_instances=1
        )
        
        self.scheduler.start()
        self.logger.info("Scheduler started with jobs")
    
    def stop_scheduler(self):
        """Stop the scheduler gracefully."""
        self.scheduler.shutdown(wait=True)
        self.logger.info("Scheduler stopped")
    
    async def cleanup_old_logs(self):
        """Remove sync logs older than 30 days."""
        cutoff_date = datetime.utcnow() - timedelta(days=30)
        result = await self.db.sync_logs.delete_many({
            'start_time': {'$lt': cutoff_date.isoformat()}
        })
        self.logger.info(f"Cleaned up {result.deleted_count} old sync logs")
    
    def get_job_status(self, job_id: str) -> Optional[SyncJobMonitor]:
        """Get monitoring statistics for a job."""
        return self.job_monitors.get(job_id)
    
    def get_all_jobs_status(self) -> list:
        """Get status of all scheduled jobs."""
        jobs = []
        for job in self.scheduler.get_jobs():
            monitor = self.job_monitors.get(job.id)
            jobs.append({
                'id': job.id,
                'name': job.name,
                'next_run': job.next_run_time.isoformat() if job.next_run_time else None,
                'monitor': monitor.model_dump() if monitor else None
            })
        return jobs
    
    async def trigger_immediate_sync(self) -> Dict[str, Any]:
        """Trigger immediate full sync outside of schedule."""
        self.logger.info("Triggering immediate sync")
        return await self.sync_all_products()
