import asyncio
import logging
from datetime import datetime, timedelta
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.triggers.cron import CronTrigger
from motor.motor_asyncio import AsyncIOMotorDatabase
from .currency_service import CurrencyService
from .product_sync_service import ProductSyncService

logger = logging.getLogger(__name__)

class SchedulerService:
    """Background task scheduler for automated updates"""
    
    def __init__(self, database: AsyncIOMotorDatabase):
        self.db = database
        self.scheduler = AsyncIOScheduler()
        self.currency_service = CurrencyService(database)
        self.product_sync_service = ProductSyncService(database)
        self._is_running = False
    
    async def start_scheduler(self):
        """Start the task scheduler"""
        if self._is_running:
            logger.warning("Scheduler is already running")
            return
        
        try:
            # Schedule currency rate updates every hour
            self.scheduler.add_job(
                func=self._update_currency_rates,
                trigger=IntervalTrigger(hours=1),
                id="currency_rates_update",
                name="Update Currency Exchange Rates",
                replace_existing=True,
                max_instances=1
            )
            
            # Schedule inventory sync every 6 hours
            self.scheduler.add_job(
                func=self._sync_inventory,
                trigger=IntervalTrigger(hours=6),
                id="inventory_sync",
                name="Sync Product Inventory",
                replace_existing=True,
                max_instances=1
            )
            
            # Schedule price updates every 24 hours
            self.scheduler.add_job(
                func=self._update_product_prices,
                trigger=CronTrigger(hour=2, minute=0),  # Run at 2 AM daily
                id="price_update",
                name="Update Product Prices",
                replace_existing=True,
                max_instances=1
            )
            
            # Schedule bulk inventory import check every 30 minutes
            self.scheduler.add_job(
                func=self._process_bulk_imports,
                trigger=IntervalTrigger(minutes=30),
                id="bulk_import_process",
                name="Process Bulk Import Requests",
                replace_existing=True,
                max_instances=1
            )
            
            # Schedule auto-sync new products daily
            self.scheduler.add_job(
                func=self._auto_sync_new_products,
                trigger=CronTrigger(hour=1, minute=0),  # Run at 1 AM daily
                id="auto_sync_new_products",
                name="Auto-sync New Luxury Products",
                replace_existing=True,
                max_instances=1
            )
            
            self.scheduler.start()
            self._is_running = True
            
            logger.info("Scheduler started successfully with 5 scheduled tasks")
            
        except Exception as e:
            logger.error(f"Error starting scheduler: {str(e)}")
            raise
    
    async def stop_scheduler(self):
        """Stop the task scheduler"""
        if self._is_running:
            self.scheduler.shutdown()
            self._is_running = False
            logger.info("Scheduler stopped successfully")
    
    async def _update_currency_rates(self):
        """Scheduled task to update currency exchange rates"""
        try:
            logger.info("Starting scheduled currency rate update...")
            success = await self.currency_service.update_exchange_rates()
            
            if success:
                logger.info("Currency rate update completed successfully")
                # Log update to database
                await self._log_scheduled_task("currency_update", "success", "Currency rates updated")
            else:
                logger.error("Currency rate update failed")
                await self._log_scheduled_task("currency_update", "failed", "Failed to update currency rates")
                
        except Exception as e:
            logger.error(f"Error in scheduled currency update: {str(e)}")
            await self._log_scheduled_task("currency_update", "error", str(e))
    
    async def _sync_inventory(self):
        """Scheduled task to sync product inventory"""
        try:
            logger.info("Starting scheduled inventory sync...")
            
            # Get all active products
            products_cursor = self.db.products.find({"is_available": True})
            product_ids = []
            
            async for product in products_cursor:
                product_ids.append(product.get("external_id"))
            
            if product_ids:
                result = await self.product_sync_service.sync_products_batch(product_ids[:100])  # Limit to 100 products
                
                logger.info(f"Inventory sync completed: {result}")
                await self._log_scheduled_task("inventory_sync", "success", f"Synced {len(product_ids)} products")
            else:
                logger.info("No products found for inventory sync")
                await self._log_scheduled_task("inventory_sync", "success", "No products to sync")
                
        except Exception as e:
            logger.error(f"Error in scheduled inventory sync: {str(e)}")
            await self._log_scheduled_task("inventory_sync", "error", str(e))
    
    async def _update_product_prices(self):
        """Scheduled task to update product prices with current exchange rates"""
        try:
            logger.info("Starting scheduled price update...")
            
            # Get all products
            products_cursor = self.db.products.find({})
            updated_count = 0
            
            async for product in products_cursor:
                try:
                    base_price_usd = product.get("base_price_usd")
                    if not base_price_usd:
                        continue
                    
                    # Get current multi-currency prices
                    multi_currency_prices = await self.currency_service.get_multi_currency_prices(
                        base_price_usd, "USD"
                    )
                    
                    # Apply luxury markup
                    markup_percentage = product.get("markup_percentage", 50.0)
                    final_prices = await self.currency_service.apply_luxury_markup(
                        multi_currency_prices, markup_percentage
                    )
                    
                    # Update product in database
                    update_data = {
                        "price_usd": final_prices.get("USD"),
                        "price_sar": final_prices.get("SAR"),
                        "price_aed": final_prices.get("AED"),
                        "price_qar": final_prices.get("QAR"),
                        "updated_at": datetime.utcnow()
                    }
                    
                    await self.db.products.update_one(
                        {"_id": product["_id"]},
                        {"$set": update_data}
                    )
                    
                    updated_count += 1
                    
                except Exception as e:
                    logger.error(f"Error updating price for product {product.get('_id')}: {str(e)}")
                    continue
            
            logger.info(f"Price update completed: {updated_count} products updated")
            await self._log_scheduled_task("price_update", "success", f"Updated {updated_count} product prices")
            
        except Exception as e:
            logger.error(f"Error in scheduled price update: {str(e)}")
            await self._log_scheduled_task("price_update", "error", str(e))
    
    async def _process_bulk_imports(self):
        """Scheduled task to process bulk import requests"""
        try:
            logger.info("Checking for bulk import requests...")
            
            # Get pending bulk import tasks
            import_tasks = await self.db.bulk_import_tasks.find({
                "status": "pending",
                "scheduled_at": {"$lte": datetime.utcnow()}
            }).to_list(length=10)  # Process up to 10 tasks at a time
            
            for task in import_tasks:
                try:
                    await self._process_single_import_task(task)
                except Exception as e:
                    logger.error(f"Error processing import task {task['_id']}: {str(e)}")
                    await self.db.bulk_import_tasks.update_one(
                        {"_id": task["_id"]},
                        {"$set": {"status": "failed", "error_message": str(e), "completed_at": datetime.utcnow()}}
                    )
            
            if import_tasks:
                logger.info(f"Processed {len(import_tasks)} bulk import tasks")
            
        except Exception as e:
            logger.error(f"Error processing bulk imports: {str(e)}")
    
    async def _auto_sync_new_products(self):
        """Scheduled task to discover and sync new luxury products"""
        try:
            logger.info("Starting auto-sync of new luxury products...")
            
            # Define luxury product search terms
            luxury_search_terms = [
                "designer handbag",
                "luxury watch", 
                "designer jewelry",
                "premium sunglasses",
                "luxury scarf",
                "designer wallet",
                "luxury belt",
                "premium accessories"
            ]
            
            new_products_count = 0
            
            for search_term in luxury_search_terms:
                try:
                    # This would integrate with actual product APIs like Amazon or AliExpress
                    # For now, we'll simulate the process
                    results = await self.product_sync_service.search_products(
                        query=search_term,
                        min_price=100.0,  # Minimum price for luxury items
                        limit=10
                    )
                    
                    for product_data in results:
                        # Check if product already exists
                        existing = await self.db.products.find_one({
                            "external_id": product_data.get("id")
                        })
                        
                        if not existing:
                            await self.product_sync_service.add_new_product(product_data)
                            new_products_count += 1
                    
                    # Rate limiting between searches
                    await asyncio.sleep(2)
                    
                except Exception as e:
                    logger.error(f"Error searching for '{search_term}': {str(e)}")
                    continue
            
            logger.info(f"Auto-sync completed: {new_products_count} new products added")
            await self._log_scheduled_task("auto_sync", "success", f"Added {new_products_count} new products")
            
        except Exception as e:
            logger.error(f"Error in auto-sync new products: {str(e)}")
            await self._log_scheduled_task("auto_sync", "error", str(e))
    
    async def _process_single_import_task(self, task):
        """Process a single bulk import task"""
        try:
            # Update task status
            await self.db.bulk_import_tasks.update_one(
                {"_id": task["_id"]},
                {"$set": {"status": "processing", "started_at": datetime.utcnow()}}
            )
            
            task_type = task.get("type")
            file_path = task.get("file_path")
            
            if task_type == "csv_import":
                result = await self.product_sync_service.import_products_from_csv(file_path)
            elif task_type == "excel_import":
                result = await self.product_sync_service.import_products_from_excel(file_path)
            else:
                raise ValueError(f"Unknown import type: {task_type}")
            
            # Update task with results
            await self.db.bulk_import_tasks.update_one(
                {"_id": task["_id"]},
                {
                    "$set": {
                        "status": "completed",
                        "completed_at": datetime.utcnow(),
                        "results": result
                    }
                }
            )
            
            logger.info(f"Bulk import task {task['_id']} completed successfully")
            
        except Exception as e:
            logger.error(f"Error processing import task: {str(e)}")
            raise
    
    async def _log_scheduled_task(self, task_type: str, status: str, message: str):
        """Log scheduled task execution"""
        try:
            log_entry = {
                "task_type": task_type,
                "status": status,
                "message": message,
                "timestamp": datetime.utcnow(),
                "server_info": {
                    "hostname": "auraa-backend",
                    "scheduler_version": "1.0"
                }
            }
            
            await self.db.scheduled_task_logs.insert_one(log_entry)
            
        except Exception as e:
            logger.error(f"Error logging scheduled task: {str(e)}")
    
    def get_scheduler_status(self) -> dict:
        """Get current scheduler status"""
        if not self._is_running:
            return {"status": "stopped", "jobs": []}
        
        jobs = []
        for job in self.scheduler.get_jobs():
            jobs.append({
                "id": job.id,
                "name": job.name,
                "next_run": job.next_run_time.isoformat() if job.next_run_time else None,
                "trigger": str(job.trigger)
            })
        
        return {
            "status": "running",
            "jobs": jobs,
            "running_since": self.scheduler._start_time.isoformat() if hasattr(self.scheduler, '_start_time') else None
        }

# Global scheduler instance
scheduler_service = None

def get_scheduler_service(database: AsyncIOMotorDatabase) -> SchedulerService:
    """Get scheduler service instance"""
    global scheduler_service
    if scheduler_service is None:
        scheduler_service = SchedulerService(database)
    return scheduler_service