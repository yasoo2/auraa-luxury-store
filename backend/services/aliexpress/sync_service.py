"""
AliExpress Synchronization Service
Handles import and periodic sync of products, prices, stock, and shipping.
"""

import asyncio
import os
from typing import List, Dict, Any
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorDatabase

from .auth import AliExpressAuthenticator
from .product_sync import ProductSyncService
from .mapper import AliExpressProductMapper
from .category_mapper import CategoryMapper, AuraaCategory


class AliExpressSyncService:
    """
    Service for importing and syncing AliExpress products.
    Implements 10-minute sync schedule and stock management logic.
    """
    
    def __init__(
        self,
        authenticator: AliExpressAuthenticator,
        db: AsyncIOMotorDatabase,
        api_base_url: str = "http://gw.api.taobao.com/router/rest"
    ):
        """
        Initialize sync service.
        
        Args:
            authenticator: AliExpress authenticator
            db: MongoDB database
            api_base_url: AliExpress API URL
        """
        self.auth = authenticator
        self.db = db
        self.api_url = api_base_url
        self.product_sync = ProductSyncService(authenticator, db, api_base_url)
        self.mapper = AliExpressProductMapper()
        self.category_mapper = CategoryMapper()
        
        # Configuration from ENV
        self.sync_countries = os.getenv('ALI_SYNC_COUNTRIES', 'SA,AE,KW,QA,BH,OM').split(',')
        self.default_ship_to = os.getenv('ALI_DEFAULT_SHIP_TO', 'SA')
    
    async def import_bulk_accessories(
        self,
        limit: int = 1000,
        query: str = "jewelry accessories"
    ) -> Dict[str, Any]:
        """
        Import bulk accessories from AliExpress.
        
        Args:
            limit: Maximum number of products to import
            query: Search query
            
        Returns:
            Import statistics
        """
        start_time = datetime.utcnow()
        stats = {
            'start_time': start_time.isoformat(),
            'query': query,
            'requested': limit,
            'inserted': 0,
            'updated': 0,
            'skipped': 0,
            'errors': [],
            'by_category': {}
        }
        
        try:
            # Get all categories
            categories = self.category_mapper.get_all_categories()
            per_category = limit // len(categories)
            
            # Import each category
            for category in categories:
                cat_stats = await self._import_category(
                    category,
                    per_category,
                    query
                )
                
                stats['by_category'][category.value] = cat_stats
                stats['inserted'] += cat_stats['inserted']
                stats['updated'] += cat_stats['updated']
                stats['skipped'] += cat_stats['skipped']
                stats['errors'].extend(cat_stats['errors'])
                
                # Rate limiting
                await asyncio.sleep(2)
        
        except Exception as e:
            stats['errors'].append({'general': str(e)})
        
        end_time = datetime.utcnow()
        stats['end_time'] = end_time.isoformat()
        stats['duration_seconds'] = (end_time - start_time).total_seconds()
        
        # Store log
        await self.db.sync_logs.insert_one(stats)
        
        return stats
    
    async def _import_category(
        self,
        category: AuraaCategory,
        count: int,
        base_query: str
    ) -> Dict[str, Any]:
        """
        Import products for specific category.
        
        Args:
            category: Category to import
            count: Number of products
            base_query: Base search query
            
        Returns:
            Category import stats
        """
        stats = {
            'category': category.value,
            'inserted': 0,
            'updated': 0,
            'skipped': 0,
            'errors': []
        }
        
        # Get category-specific search keyword
        category_keyword = self.category_mapper.get_search_keyword(category)
        search_query = f"{base_query} {category_keyword}"
        
        page_size = 20
        pages = (count + page_size - 1) // page_size
        
        for page in range(1, min(pages + 1, 6)):  # Max 5 pages to respect limits
            try:
                # Search products
                params = {
                    'keywords': search_query,
                    'page_size': page_size,
                    'page_no': page,
                    'sort': 'SALE_PRICE_ASC',
                    'target_currency': 'USD',
                    'target_language': 'EN',
                    'ship_to_country': self.default_ship_to
                }
                
                response = await self.product_sync.make_api_request(
                    'aliexpress.affiliate.product.query',
                    params
                )
                
                result = response.get('aliexpress_affiliate_product_query_response', {})
                products = result.get('resp_result', {}).get('result', {}).get('products', {}).get('product', [])
                
                # Process each product
                for product_data in products:
                    if stats['inserted'] + stats['updated'] >= count:
                        break
                    
                    try:
                        await self._import_single_product(
                            product_data,
                            category,
                            self.default_ship_to,
                            stats
                        )
                    except Exception as e:
                        stats['errors'].append({
                            'product_id': product_data.get('product_id'),
                            'error': str(e)
                        })
                
                # Rate limiting
                await asyncio.sleep(1)
                
            except Exception as e:
                stats['errors'].append({
                    'page': page,
                    'error': str(e)
                })
        
        return stats
    
    async def _import_single_product(
        self,
        product_data: Dict[str, Any],
        category: AuraaCategory,
        ship_to: str,
        stats: Dict[str, Any]
    ):
        """
        Import or update single product.
        
        Args:
            product_data: Product data from AliExpress
            category: Product category
            ship_to: Destination country
            stats: Stats dict to update
        """
        product_id = product_data['product_id']
        
        # Get shipping info
        shipping_params = {
            'product_id': product_id,
            'country_code': ship_to,
            'product_num': 1
        }
        
        try:
            ship_response = await self.product_sync.make_api_request(
                'aliexpress.ds.shipping.info',
                shipping_params
            )
            
            ship_result = ship_response.get('aliexpress_ds_shipping_info_response', {}).get('result', {})
            freight_list = ship_result.get('aeop_freight_calculate_result_list', [])
            
            if not freight_list:
                stats['skipped'] += 1
                return
            
            # Get cheapest shipping option
            cheapest = min(freight_list, key=lambda x: float(x.get('freight', 999)))
            
            shipping_info = {
                'cost': float(cheapest.get('freight', 0)),
                'method': cheapest.get('service_name', 'Standard'),
                'min_days': int(cheapest.get('delivery_date_min', 15)),
                'max_days': int(cheapest.get('delivery_date_max', 30)),
                'available': True,
                'ship_from': 'CN'
            }
            
        except Exception as e:
            # No shipping available
            shipping_info = {
                'cost': 0,
                'method': 'N/A',
                'min_days': 0,
                'max_days': 0,
                'available': False,
                'ship_from': 'CN'
            }
        
        # Map product
        mapped_product = self.mapper.map_product(
            product_data,
            shipping_info,
            ship_to,
            category.value
        )
        
        # Upsert to database
        result = await self.db.products.update_one(
            {
                'source': 'aliexpress',
                'source_product_id': product_id,
                'ship_to': ship_to
            },
            {
                '$set': mapped_product,
                '$setOnInsert': {'created_at': datetime.utcnow()}
            },
            upsert=True
        )
        
        if result.upserted_id:
            stats['inserted'] += 1
        elif result.modified_count > 0:
            stats['updated'] += 1
        else:
            stats['skipped'] += 1
    
    async def sync_prices_stock_shipping(self) -> Dict[str, Any]:
        """
        Sync prices, stock, and shipping for all published products.
        Runs every 10 minutes via scheduler.
        
        Returns:
            Sync statistics
        """
        start_time = datetime.utcnow()
        stats = {
            'start_time': start_time.isoformat(),
            'type': 'price_stock_shipping_sync',
            'products_checked': 0,
            'products_updated': 0,
            'products_hidden': 0,
            'products_restored': 0,
            'errors': []
        }
        
        try:
            # Get all AliExpress products
            cursor = self.db.products.find({'source': 'aliexpress'})
            products = await cursor.to_list(length=None)
            
            stats['products_checked'] = len(products)
            
            # Process in batches
            for product in products:
                try:
                    updated = await self._sync_single_product(product)
                    
                    if updated.get('hidden'):
                        stats['products_hidden'] += 1
                    elif updated.get('restored'):
                        stats['products_restored'] += 1
                    elif updated.get('updated'):
                        stats['products_updated'] += 1
                    
                except Exception as e:
                    stats['errors'].append({
                        'product_id': product.get('source_product_id'),
                        'error': str(e)
                    })
                
                # Rate limiting
                await asyncio.sleep(0.5)
        
        except Exception as e:
            stats['errors'].append({'general': str(e)})
        
        end_time = datetime.utcnow()
        stats['end_time'] = end_time.isoformat()
        stats['duration_seconds'] = (end_time - start_time).total_seconds()
        
        # Store log
        await self.db.sync_logs.insert_one(stats)
        
        return stats
    
    async def _sync_single_product(self, product: Dict[str, Any]) -> Dict[str, Any]:
        """
        Sync single product pricing and availability.
        
        Args:
            product: Current product data
            
        Returns:
            Sync result
        """
        result = {'updated': False, 'hidden': False, 'restored': False}
        
        product_id = product['source_product_id']
        ship_to = product.get('ship_to', self.default_ship_to)
        
        try:
            # Get fresh product details
            detail_params = {
                'product_ids': product_id,
                'target_currency': 'USD',
                'target_language': 'EN'
            }
            
            detail_response = await self.product_sync.make_api_request(
                'aliexpress.affiliate.productdetail.get',
                detail_params
            )
            
            detail_result = detail_response.get('aliexpress_affiliate_productdetail_get_response', {})
            products = detail_result.get('resp_result', {}).get('result', {}).get('products', {}).get('product', [])
            
            if not products:
                # Product no longer available
                await self.db.products.update_one(
                    {'_id': product['_id']},
                    {
                        '$set': {
                            'is_published': False,
                            'stock': 0,
                            'updated_at': datetime.utcnow()
                        }
                    }
                )
                result['hidden'] = True
                return result
            
            fresh_data = products[0]
            new_base_price = float(fresh_data.get('target_sale_price', 0))
            
            # Get fresh shipping
            ship_params = {
                'product_id': product_id,
                'country_code': ship_to,
                'product_num': 1
            }
            
            ship_response = await self.product_sync.make_api_request(
                'aliexpress.ds.shipping.info',
                ship_params
            )
            
            ship_result = ship_response.get('aliexpress_ds_shipping_info_response', {}).get('result', {})
            freight_list = ship_result.get('aeop_freight_calculate_result_list', [])
            
            shipping_available = len(freight_list) > 0
            
            if shipping_available:
                cheapest = min(freight_list, key=lambda x: float(x.get('freight', 999)))
                new_shipping_cost = float(cheapest.get('freight', 0))
                min_days = int(cheapest.get('delivery_date_min', 15))
                max_days = int(cheapest.get('delivery_date_max', 30))
            else:
                new_shipping_cost = 0
                min_days = 0
                max_days = 0
            
            # Recalculate pricing
            pricing = self.mapper.calculate_sale_price(new_base_price, new_shipping_cost)
            
            # Determine availability
            is_published = shipping_available and new_base_price > 0
            stock = 100 if is_published else 0
            
            # Update database
            update_data = {
                'cost_price_usd': pricing['cost_price_usd'],
                'shipping_cost_usd': new_shipping_cost,
                'sale_price_usd': pricing['sale_price_usd'],
                'delivery_min_days': min_days,
                'delivery_max_days': max_days,
                'delivery_window_text': self.mapper.format_delivery_window(min_days, max_days, 'ar'),
                'delivery_window_text_en': self.mapper.format_delivery_window(min_days, max_days, 'en'),
                'stock': stock,
                'is_published': is_published,
                'updated_at': datetime.utcnow()
            }
            
            await self.db.products.update_one(
                {'_id': product['_id']},
                {'$set': update_data}
            )
            
            # Track what changed
            if not is_published and product.get('is_published', True):
                result['hidden'] = True
            elif is_published and not product.get('is_published', False):
                result['restored'] = True
            else:
                result['updated'] = True
            
        except Exception as e:
            # On error, hide product to be safe
            await self.db.products.update_one(
                {'_id': product['_id']},
                {
                    '$set': {
                        'is_published': False,
                        'updated_at': datetime.utcnow()
                    }
                }
            )
            result['hidden'] = True
            raise e
        
        return result
    
    async def check_country_availability(self, product_id: str, country_code: str) -> Dict[str, Any]:
        """
        Check product availability and shipping options for a specific country.
        
        Args:
            product_id: AliExpress product ID
            country_code: ISO country code (e.g., 'SA', 'AE')
            
        Returns:
            Availability info with shipping options
        """
        try:
            # Get shipping info from AliExpress API
            shipping_params = {
                'product_id': product_id,
                'country_code': country_code.upper(),
                'product_num': 1
            }
            
            ship_response = await self.product_sync.make_api_request(
                'aliexpress.ds.shipping.info',
                shipping_params
            )
            
            ship_result = ship_response.get('aliexpress_ds_shipping_info_response', {}).get('result', {})
            freight_list = ship_result.get('aeop_freight_calculate_result_list', [])
            
            if not freight_list:
                # No shipping available
                return {
                    'available': False,
                    'country_code': country_code.upper(),
                    'shipping_options': [],
                    'message': 'Shipping not available to this country'
                }
            
            # Convert freight list to shipping options
            shipping_options = []
            for freight in freight_list:
                option = {
                    'price_usd': float(freight.get('freight', 0)),
                    'min_days': int(freight.get('delivery_date_min', 15)),
                    'max_days': int(freight.get('delivery_date_max', 30)),
                    'carrier': freight.get('service_name', 'Standard Shipping'),
                    'speed': 'standard'  # Default speed
                }
                
                # Determine speed based on delivery time
                if option['max_days'] <= 7:
                    option['speed'] = 'fastest'
                elif option['max_days'] <= 15:
                    option['speed'] = 'fast'
                
                shipping_options.append(option)
            
            # Sort by price (cheapest first)
            shipping_options.sort(key=lambda x: x['price_usd'])
            
            return {
                'available': True,
                'country_code': country_code.upper(),
                'shipping_options': shipping_options,
                'message': f'{len(shipping_options)} shipping options available'
            }
            
        except Exception as e:
            # Fallback to mock data for testing
            return self._get_mock_shipping_options(country_code)
    
    def _get_mock_shipping_options(self, country_code: str) -> Dict[str, Any]:
        """
        Get mock shipping options for testing when API is not available.
        
        Args:
            country_code: ISO country code
            
        Returns:
            Mock availability info
        """
        # Mock shipping options based on country
        if country_code.upper() in ['SA', 'AE', 'KW', 'QA', 'BH', 'OM']:
            # GCC countries - good shipping options
            shipping_options = [
                {
                    'price_usd': 8.50,
                    'min_days': 7,
                    'max_days': 14,
                    'carrier': 'AliExpress Standard Shipping',
                    'speed': 'standard'
                },
                {
                    'price_usd': 15.99,
                    'min_days': 3,
                    'max_days': 7,
                    'carrier': 'DHL Express',
                    'speed': 'fastest'
                },
                {
                    'price_usd': 12.00,
                    'min_days': 5,
                    'max_days': 10,
                    'carrier': 'FedEx International',
                    'speed': 'fast'
                }
            ]
        else:
            # Other countries - limited options
            shipping_options = [
                {
                    'price_usd': 12.00,
                    'min_days': 15,
                    'max_days': 30,
                    'carrier': 'Standard International',
                    'speed': 'standard'
                }
            ]
        
        return {
            'available': True,
            'country_code': country_code.upper(),
            'shipping_options': shipping_options,
            'message': f'Mock: {len(shipping_options)} shipping options available'
        }
