"""
Bulk Import Service for AliExpress Products
Handles large-scale product import with category distribution.
"""

import asyncio
import inspect
from typing import List, Dict, Any, Optional, Callable
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorDatabase

from .auth import AliExpressAuthenticator
from .product_sync import ProductSyncService
from .category_mapper import CategoryMapper, AuraaCategory
from .models import AliExpressProduct


class BulkImportService:
    """
    Service for bulk importing products from AliExpress.
    Distributes products across categories and stores in external_products.
    """
    
    def __init__(
        self,
        authenticator: AliExpressAuthenticator,
        db: AsyncIOMotorDatabase,
        api_base_url: str = "http://gw.api.taobao.com/router/rest"
    ):
        """
        Initialize bulk import service.
        
        Args:
            authenticator: AliExpress authenticator
            db: MongoDB database
            api_base_url: AliExpress API URL
        """
        self.auth = authenticator
        self.db = db
        self.api_url = api_base_url
        self.category_mapper = CategoryMapper()
        self.sync_service = ProductSyncService(authenticator, db, api_base_url)
    
    async def search_products_by_category(
        self,
        category: AuraaCategory,
        page_size: int = 20,
        page_no: int = 1
    ) -> List[Dict[str, Any]]:
        """
        Search products for specific category.
        
        Args:
            category: Auraa category
            page_size: Results per page
            page_no: Page number
            
        Returns:
            List of product data
        """
        search_keyword = self.category_mapper.get_search_keyword(category)
        
        params = {
            'keywords': search_keyword,
            'page_size': min(page_size, 50),  # AliExpress max is 50
            'page_no': page_no,
            'sort': 'SALE_PRICE_ASC',  # Start with lower priced items
            'target_currency': 'USD',
            'target_language': 'EN',
            'ship_to_country': 'SA'  # Default to Saudi Arabia
        }
        
        try:
            response = await self.sync_service.make_api_request(
                'aliexpress.affiliate.product.query',
                params
            )
            
            result = response.get('aliexpress_affiliate_product_query_response', {})
            result_data = result.get('resp_result', {})
            
            if not result_data.get('result', {}).get('products'):
                return []
            
            products = result_data['result']['products'].get('product', [])
            
            # Add category to each product
            for product in products:
                product['mapped_category'] = category.value
            
            return products
            
        except Exception as e:
            print(f"Error searching category {category}: {e}")
            return []
    
    async def import_category_products(
        self,
        category: AuraaCategory,
        count: int,
        progress_callback: Optional[Callable[[int], Any]] = None
    ) -> Dict[str, Any]:
        """
        Import specified number of products for a category.
        
        Args:
            category: Category to import
            count: Number of products to import
            progress_callback: Optional callback called with increment (e.g., 1) for each imported product
            
        Returns:
            Import statistics
        """
        stats = {
            'category': category.value,
            'requested': count,
            'imported': 0,
            'skipped': 0,
            'errors': []
        }
        
        page_size = 50
        pages_needed = (count + page_size - 1) // page_size
        
        for page in range(1, pages_needed + 1):
            try:
                products = await self.search_products_by_category(
                    category,
                    page_size=page_size,
                    page_no=page
                )
                
                for product_data in products:
                    if stats['imported'] >= count:
                        break
                    
                    try:
                        # Check if already exists
                        exists = await self.db.external_products.find_one({
                            'external_id': product_data['product_id'],
                            'source': 'aliexpress'
                        })
                        
                        if exists:
                            stats['skipped'] += 1
                            continue
                        
                        # Sanitize product name
                        sanitized_names = self.category_mapper.sanitize_product_name(
                            product_data.get('product_title', ''),
                            category
                        )
                        
                        # Prepare external product document
                        external_product = {
                            'external_id': product_data['product_id'],
                            'source': 'aliexpress',
                            'category': category.value,
                            'name_en': sanitized_names['en'],
                            'name_ar': sanitized_names['ar'],
                            'description': '',  # Will be fetched in detail sync
                            'images': [product_data.get('product_main_image_url', '')],
                            'base_price_usd': float(product_data.get('target_sale_price', 0)),
                            'original_price_usd': float(product_data.get('target_original_price', 0)),
                            'discount_percentage': None,
                            'available_countries': [],  # Will be populated by sync
                            'shipping': {},  # Will be populated by sync
                            'stock': None,
                            'rating': float(product_data.get('evaluate_rate', 0)),
                            'reviews_count': int(product_data.get('volume', 0)),
                            'external_url': product_data.get('promotion_link', ''),
                            'brand_sanitized': 'Auraa Luxury',  # Replace with store brand
                            'specs': {},
                            'pushed_to_store': False,
                            'created_at': datetime.utcnow(),
                            'updated_at': datetime.utcnow(),
                            'last_synced': None
                        }
                        
                        # Calculate discount
                        if external_product['original_price_usd'] > external_product['base_price_usd']:
                            discount = (
                                (external_product['original_price_usd'] - external_product['base_price_usd'])
                                / external_product['original_price_usd']
                                * 100
                            )
                            external_product['discount_percentage'] = int(discount)
                        
                        # Insert into external_products
                        await self.db.external_products.insert_one(external_product)
                        stats['imported'] += 1
                        
                        # progress callback
                        if progress_callback:
                            try:
                                if inspect.iscoroutinefunction(progress_callback):
                                    await progress_callback(1)
                                else:
                                    progress_callback(1)
                            except Exception:
                                # Don't break import due to callback errors
                                pass
                        
                    except Exception as e:
                        stats['errors'].append({
                            'product_id': product_data.get('product_id'),
                            'error': str(e)
                        })
                
                # Rate limiting between pages
                await asyncio.sleep(2)
                
            except Exception as e:
                stats['errors'].append({
                    'page': page,
                    'error': str(e)
                })
        
        return stats
    
    async def bulk_import(
        self,
        total_count: int = 1000,
        category_distribution: Optional[Dict[AuraaCategory, int]] = None
    ) -> Dict[str, Any]:
        """
        Import products distributed across categories.
        
        Args:
            total_count: Total number of products to import
            category_distribution: Custom distribution or None for equal split
            
        Returns:
            Complete import statistics
        """
        start_time = datetime.utcnow()
        
        # Default equal distribution across all categories
        if not category_distribution:
            categories = self.category_mapper.get_all_categories()
            per_category = total_count // len(categories)
            category_distribution = {cat: per_category for cat in categories}
            
            # Add remainder to first category
            remainder = total_count % len(categories)
            if remainder:
                first_cat = categories[0]
                category_distribution[first_cat] += remainder
        
        # Import results
        results = {
            'total_requested': total_count,
            'total_imported': 0,
            'total_skipped': 0,
            'total_errors': 0,
            'by_category': {},
            'start_time': start_time.isoformat(),
            'end_time': None,
            'duration_seconds': 0
        }
        
        # Import each category concurrently (but with limits)
        tasks = []
        for category, count in category_distribution.items():
            tasks.append(self.import_category_products(category, count))
        
        # Execute imports with concurrency limit
        category_results = []
        for i in range(0, len(tasks), 3):  # 3 categories at a time
            batch = tasks[i:i+3]
            batch_results = await asyncio.gather(*batch, return_exceptions=True)
            category_results.extend(batch_results)
            
            # Delay between batches
            if i + 3 < len(tasks):
                await asyncio.sleep(5)
        
        # Aggregate results
        for cat_result in category_results:
            if isinstance(cat_result, Exception):
                results['total_errors'] += 1
                continue
            
            results['by_category'][cat_result['category']] = cat_result
            results['total_imported'] += cat_result['imported']
            results['total_skipped'] += cat_result['skipped']
            results['total_errors'] += len(cat_result['errors'])
        
        # Finalize timing
        end_time = datetime.utcnow()
        results['end_time'] = end_time.isoformat()
        results['duration_seconds'] = (end_time - start_time).total_seconds()
        
        # Store import log
        await self.db.import_logs.insert_one(results)
        
        return results
    
    async def push_to_store(
        self,
        external_product_ids: List[str],
        profit_margin: float = 0.20
    ) -> Dict[str, Any]:
        """
        Push external products to main store (products collection).
        
        Args:
            external_product_ids: List of external product document IDs
            profit_margin: Profit margin to add to base price
            
        Returns:
            Push statistics
        """
        stats = {
            'total': len(external_product_ids),
            'pushed': 0,
            'skipped': 0,
            'errors': []
        }
        
        for ext_id in external_product_ids:
            try:
                # Get external product
                ext_product = await self.db.external_products.find_one({'_id': ext_id})
                if not ext_product:
                    stats['skipped'] += 1
                    continue
                
                # Check if already pushed
                if ext_product.get('pushed_to_store'):
                    stats['skipped'] += 1
                    continue
                
                # Calculate store price with margin
                base_price = ext_product['base_price_usd']
                store_price = base_price * (1 + profit_margin)
                
                # Round price nicely
                store_price = round(store_price / 5) * 5  # Round to nearest 5
                
                # Create store product
                store_product = {
                    'id': ext_product['external_id'],
                    'name': ext_product['name_en'],  # Default to English
                    'description': ext_product.get('description', ''),
                    'price': store_price,
                    'original_price': None,
                    'discount_percentage': ext_product.get('discount_percentage'),
                    'category': ext_product['category'],
                    'images': ext_product['images'],
                    'in_stock': True,
                    'stock_quantity': 100,  # Virtual stock for dropshipping
                    'rating': ext_product['rating'],
                    'reviews_count': ext_product['reviews_count'],
                    'external_url': None,  # Hide AliExpress link
                    'created_at': datetime.utcnow(),
                    'external_source': 'aliexpress',  # Internal tracking only
                    'external_id': ext_product['external_id']
                }
                
                # Insert into products collection
                await self.db.products.insert_one(store_product)
                
                # Mark as pushed
                await self.db.external_products.update_one(
                    {'_id': ext_id},
                    {
                        '$set': {
                            'pushed_to_store': True,
                            'pushed_at': datetime.utcnow()
                        }
                    }
                )
                
                stats['pushed'] += 1
                
            except Exception as e:
                stats['errors'].append({
                    'external_id': str(ext_id),
                    'error': str(e)
                })
        
        return stats
