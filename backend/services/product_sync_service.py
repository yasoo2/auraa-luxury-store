import asyncio
import csv
import pandas as pd
import aiohttp
import logging
from datetime import datetime
from typing import List, Dict, Any, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from .currency_service import CurrencyService
import uuid
import os

logger = logging.getLogger(__name__)

class ProductSyncService:
    """Service for syncing products from external sources"""
    
    def __init__(self, database: AsyncIOMotorDatabase):
        self.db = database
        self.currency_service = CurrencyService(database)
        
        # Simulated external APIs (replace with real implementations)
        self.aliexpress_api_key = os.environ.get("ALIEXPRESS_API_KEY")
        self.amazon_api_key = os.environ.get("AMAZON_API_KEY")
        
    async def search_products(
        self, 
        query: str, 
        source: str = "aliexpress",
        min_price: float = 0.0,
        max_price: float = 10000.0,
        limit: int = 20
    ) -> List[Dict[str, Any]]:
        """
        Search for products from external sources
        
        Args:
            query: Search query
            source: Product source (aliexpress, amazon)
            min_price: Minimum price filter
            max_price: Maximum price filter
            limit: Maximum results to return
            
        Returns:
            List of product data dictionaries
        """
        try:
            if source == "aliexpress":
                return await self._search_aliexpress_products(query, min_price, max_price, limit)
            elif source == "amazon":
                return await self._search_amazon_products(query, min_price, max_price, limit)
            else:
                logger.error(f"Unknown product source: {source}")
                return []
                
        except Exception as e:
            logger.error(f"Error searching products from {source}: {str(e)}")
            return []
    
    async def _search_aliexpress_products(
        self, 
        query: str, 
        min_price: float, 
        max_price: float, 
        limit: int
    ) -> List[Dict[str, Any]]:
        """Search AliExpress products (simulated for demo)"""
        # In a real implementation, this would call AliExpress API
        # For demo purposes, we'll return simulated luxury products
        
        simulated_products = [
            {
                "id": f"ae_{uuid.uuid4().hex[:8]}",
                "title": f"Luxury Designer {query.title()} - Premium Quality",
                "description": f"High-end {query} with premium materials and exquisite craftsmanship.",
                "price_usd": min_price + (i * 50),
                "images": [
                    f"https://images.unsplash.com/photo-{1500000000 + i}?w=500&h=500&fit=crop",
                    f"https://images.unsplash.com/photo-{1500000001 + i}?w=500&h=500&fit=crop"
                ],
                "category": "luxury_accessories",
                "brand": f"Designer Brand {i+1}",
                "supplier_url": f"https://aliexpress.com/item/{1000000000 + i}",
                "stock_quantity": 50 + (i * 10),
                "rating": 4.5 + (i * 0.1),
                "reviews_count": 100 + (i * 20),
                "source": "aliexpress"
            }
            for i in range(min(limit, 10))
        ]
        
        return [p for p in simulated_products if min_price <= p["price_usd"] <= max_price]
    
    async def _search_amazon_products(
        self, 
        query: str, 
        min_price: float, 
        max_price: float, 
        limit: int
    ) -> List[Dict[str, Any]]:
        """Search Amazon products (simulated for demo)"""
        # In a real implementation, this would call Amazon Product Advertising API
        
        simulated_products = [
            {
                "id": f"amz_{uuid.uuid4().hex[:8]}",
                "title": f"Premium {query.title()} Collection - Authentic Designer",
                "description": f"Authentic designer {query} from top luxury brands with guaranteed quality.",
                "price_usd": min_price + (i * 75),
                "images": [
                    f"https://images.unsplash.com/photo-{1600000000 + i}?w=500&h=500&fit=crop",
                    f"https://images.unsplash.com/photo-{1600000001 + i}?w=500&h=500&fit=crop"
                ],
                "category": "designer_accessories",
                "brand": f"Luxury Brand {i+1}",
                "supplier_url": f"https://amazon.com/dp/B00{1000000 + i}",
                "stock_quantity": 25 + (i * 5),
                "rating": 4.7 + (i * 0.05),
                "reviews_count": 200 + (i * 50),
                "source": "amazon"
            }
            for i in range(min(limit, 8))
        ]
        
        return [p for p in simulated_products if min_price <= p["price_usd"] <= max_price]
    
    async def sync_products_batch(self, external_ids: List[str]) -> Dict[str, Any]:
        """
        Sync a batch of products by their external IDs
        
        Args:
            external_ids: List of external product IDs to sync
            
        Returns:
            Dictionary with sync results
        """
        start_time = datetime.utcnow()
        success_count = 0
        failed_count = 0
        errors = []
        
        try:
            for external_id in external_ids:
                try:
                    success = await self._sync_single_product(external_id)
                    if success:
                        success_count += 1
                    else:
                        failed_count += 1
                        
                except Exception as e:
                    failed_count += 1
                    errors.append(f"Product {external_id}: {str(e)}")
                    logger.error(f"Error syncing product {external_id}: {str(e)}")
                
                # Rate limiting between requests
                await asyncio.sleep(0.5)
            
            duration = (datetime.utcnow() - start_time).total_seconds()
            
            # Log sync operation
            await self._log_sync_operation("batch_sync", {
                "total_products": len(external_ids),
                "success_count": success_count,
                "failed_count": failed_count,
                "duration_seconds": duration,
                "errors": errors[:10]  # Limit error list
            })
            
            return {
                "success": success_count,
                "failed": failed_count,
                "total": len(external_ids),
                "duration_seconds": duration,
                "errors": errors
            }
            
        except Exception as e:
            logger.error(f"Error in batch sync: {str(e)}")
            return {
                "success": 0,
                "failed": len(external_ids),
                "total": len(external_ids),
                "duration_seconds": 0,
                "errors": [str(e)]
            }
    
    async def _sync_single_product(self, external_id: str) -> bool:
        """Sync a single product from external source"""
        try:
            # Determine source from external_id prefix
            if external_id.startswith("ae_"):
                product_data = await self._fetch_aliexpress_product(external_id)
            elif external_id.startswith("amz_"):
                product_data = await self._fetch_amazon_product(external_id)
            else:
                logger.error(f"Unknown external ID format: {external_id}")
                return False
            
            if not product_data:
                return False
            
            # Convert prices to multiple currencies
            base_price_usd = product_data["price_usd"]
            multi_currency_prices = await self.currency_service.get_multi_currency_prices(
                base_price_usd, "USD"
            )
            
            # Apply luxury markup
            final_prices = await self.currency_service.apply_luxury_markup(
                multi_currency_prices, 50.0  # 50% markup for luxury positioning
            )
            
            # Prepare product data for database
            product_doc = {
                "external_id": external_id,
                "title": product_data["title"],
                "description": product_data["description"],
                "base_price_usd": base_price_usd,
                "price_usd": final_prices.get("USD"),
                "price_sar": final_prices.get("SAR"),
                "price_aed": final_prices.get("AED"),
                "price_qar": final_prices.get("QAR"),
                "images": product_data["images"],
                "category": product_data["category"],
                "brand": product_data.get("brand"),
                "supplier_url": product_data["supplier_url"],
                "stock_quantity": product_data["stock_quantity"],
                "rating": product_data.get("rating"),
                "reviews_count": product_data.get("reviews_count"),
                "source": product_data["source"],
                "is_available": True,
                "markup_percentage": 50.0,
                "last_synced_at": datetime.utcnow(),
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            
            # Upsert product in database
            await self.db.products.update_one(
                {"external_id": external_id},
                {"$set": product_doc},
                upsert=True
            )
            
            logger.info(f"Successfully synced product: {external_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error syncing product {external_id}: {str(e)}")
            return False
    
    async def _fetch_aliexpress_product(self, external_id: str) -> Optional[Dict[str, Any]]:
        """Fetch single product from AliExpress (simulated)"""
        # In real implementation, this would call AliExpress API
        return {
            "id": external_id,
            "title": "Luxury Designer Accessory - Premium Collection",
            "description": "High-quality designer accessory with premium materials.",
            "price_usd": 199.99,
            "images": [
                "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=500&h=500&fit=crop",
                "https://images.unsplash.com/photo-1573408301185-9146fe634ad0?w=500&h=500&fit=crop"
            ],
            "category": "luxury_accessories",
            "brand": "Designer Brand",
            "supplier_url": f"https://aliexpress.com/item/{external_id}",
            "stock_quantity": 75,
            "rating": 4.6,
            "reviews_count": 150,
            "source": "aliexpress"
        }
    
    async def _fetch_amazon_product(self, external_id: str) -> Optional[Dict[str, Any]]:
        """Fetch single product from Amazon (simulated)"""
        # In real implementation, this would call Amazon Product Advertising API
        return {
            "id": external_id,
            "title": "Premium Designer Accessory - Authentic Collection",
            "description": "Authentic designer accessory from luxury brand collection.",
            "price_usd": 299.99,
            "images": [
                "https://images.unsplash.com/photo-1611652022419-a9419f74343d?w=500&h=500&fit=crop",
                "https://images.unsplash.com/photo-1583292650898-7d6b27d36bf2?w=500&h=500&fit=crop"
            ],
            "category": "designer_accessories",
            "brand": "Luxury Designer",
            "supplier_url": f"https://amazon.com/dp/{external_id}",
            "stock_quantity": 35,
            "rating": 4.8,
            "reviews_count": 300,
            "source": "amazon"
        }
    
    async def add_new_product(self, product_data: Dict[str, Any]) -> str:
        """
        Add a new product to the database
        
        Args:
            product_data: Product information dictionary
            
        Returns:
            Generated product ID
        """
        try:
            # Generate unique product ID
            product_id = str(uuid.uuid4())
            
            # Convert prices
            base_price_usd = product_data["price_usd"]
            multi_currency_prices = await self.currency_service.get_multi_currency_prices(
                base_price_usd, "USD"
            )
            final_prices = await self.currency_service.apply_luxury_markup(
                multi_currency_prices, 50.0
            )
            
            product_doc = {
                "_id": product_id,
                "external_id": product_data["id"],
                "title": product_data["title"],
                "description": product_data["description"],
                "base_price_usd": base_price_usd,
                "price_usd": final_prices.get("USD"),
                "price_sar": final_prices.get("SAR"),
                "price_aed": final_prices.get("AED"),
                "images": product_data["images"],
                "category": product_data["category"],
                "brand": product_data.get("brand"),
                "source": product_data["source"],
                "is_available": True,
                "stock_quantity": product_data.get("stock_quantity", 0),
                "markup_percentage": 50.0,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            
            await self.db.products.insert_one(product_doc)
            
            logger.info(f"Added new product: {product_id}")
            return product_id
            
        except Exception as e:
            logger.error(f"Error adding new product: {str(e)}")
            raise
    
    async def import_products_from_csv(self, file_path: str) -> Dict[str, Any]:
        """
        Import products from CSV file
        
        Args:
            file_path: Path to CSV file
            
        Returns:
            Import results dictionary
        """
        try:
            imported_count = 0
            failed_count = 0
            errors = []
            
            with open(file_path, 'r', encoding='utf-8') as file:
                reader = csv.DictReader(file)
                
                for row in reader:
                    try:
                        # Validate required fields
                        required_fields = ['title', 'price_usd', 'category', 'images']
                        missing_fields = [field for field in required_fields if not row.get(field)]
                        
                        if missing_fields:
                            errors.append(f"Row {reader.line_num}: Missing fields: {missing_fields}")
                            failed_count += 1
                            continue
                        
                        # Prepare product data
                        product_data = {
                            "id": f"csv_{uuid.uuid4().hex[:8]}",
                            "title": row['title'],
                            "description": row.get('description', ''),
                            "price_usd": float(row['price_usd']),
                            "images": row['images'].split(',') if row['images'] else [],
                            "category": row['category'],
                            "brand": row.get('brand', ''),
                            "source": "csv_import",
                            "stock_quantity": int(row.get('stock_quantity', 0))
                        }
                        
                        # Add product
                        await self.add_new_product(product_data)
                        imported_count += 1
                        
                    except Exception as e:
                        errors.append(f"Row {reader.line_num}: {str(e)}")
                        failed_count += 1
            
            return {
                "imported_count": imported_count,
                "failed_count": failed_count,
                "errors": errors[:50]  # Limit error list
            }
            
        except Exception as e:
            logger.error(f"Error importing CSV: {str(e)}")
            return {
                "imported_count": 0,
                "failed_count": 0,
                "errors": [str(e)]
            }
    
    async def import_products_from_excel(self, file_path: str) -> Dict[str, Any]:
        """
        Import products from Excel file
        
        Args:
            file_path: Path to Excel file
            
        Returns:
            Import results dictionary
        """
        try:
            # Read Excel file
            df = pd.read_excel(file_path)
            
            imported_count = 0
            failed_count = 0
            errors = []
            
            for index, row in df.iterrows():
                try:
                    # Validate required fields
                    if pd.isna(row.get('title')) or pd.isna(row.get('price_usd')):
                        errors.append(f"Row {index + 2}: Missing title or price")
                        failed_count += 1
                        continue
                    
                    # Prepare product data
                    product_data = {
                        "id": f"excel_{uuid.uuid4().hex[:8]}",
                        "title": str(row['title']),
                        "description": str(row.get('description', '')),
                        "price_usd": float(row['price_usd']),
                        "images": str(row.get('images', '')).split(',') if pd.notna(row.get('images')) else [],
                        "category": str(row.get('category', 'accessories')),
                        "brand": str(row.get('brand', '')),
                        "source": "excel_import",
                        "stock_quantity": int(row.get('stock_quantity', 0)) if pd.notna(row.get('stock_quantity')) else 0
                    }
                    
                    # Add product
                    await self.add_new_product(product_data)
                    imported_count += 1
                    
                except Exception as e:
                    errors.append(f"Row {index + 2}: {str(e)}")
                    failed_count += 1
            
            return {
                "imported_count": imported_count,
                "failed_count": failed_count,
                "errors": errors[:50]
            }
            
        except Exception as e:
            logger.error(f"Error importing Excel: {str(e)}")
            return {
                "imported_count": 0,
                "failed_count": 0,
                "errors": [str(e)]
            }
    
    async def _log_sync_operation(self, operation_type: str, data: Dict[str, Any]):
        """Log sync operation to database"""
        try:
            log_entry = {
                "operation_type": operation_type,
                "timestamp": datetime.utcnow(),
                "data": data,
                "server_info": {
                    "hostname": "lora-luxury-backend",
                    "sync_service_version": "1.0"
                }
            }
            
            await self.db.sync_logs.insert_one(log_entry)
            
        except Exception as e:
            logger.error(f"Error logging sync operation: {str(e)}")

# Global service instance
product_sync_service = None

def get_product_sync_service(database: AsyncIOMotorDatabase) -> ProductSyncService:
    """Get product sync service instance"""
    global product_sync_service
    if product_sync_service is None:
        product_sync_service = ProductSyncService(database)
    return product_sync_service