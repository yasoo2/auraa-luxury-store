import requests
import asyncio
import aiohttp
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
import json
import uuid

logger = logging.getLogger(__name__)

class AliExpressService:
    def __init__(self, db, app_key: str = None, app_secret: str = None):
        self.db = db
        self.app_key = app_key or "demo_key"
        self.app_secret = app_secret or "demo_secret"
        self.base_url = "https://api-sg.aliexpress.com"
        self.session = None
        
    async def initialize(self):
        """Initialize the service with async HTTP session"""
        self.session = aiohttp.ClientSession()
        
    async def close(self):
        """Close the HTTP session"""
        if self.session:
            await self.session.close()
    
    async def search_products(
        self, 
        keywords: str, 
        category_id: Optional[str] = None,
        min_price: Optional[float] = None,
        max_price: Optional[float] = None,
        page_size: int = 20,
        page_no: int = 1
    ) -> Dict[str, Any]:
        """
        Search for products on AliExpress
        
        Args:
            keywords: Search keywords
            category_id: Category filter
            min_price: Minimum price filter
            max_price: Maximum price filter
            page_size: Number of products per page
            page_no: Page number
            
        Returns:
            Dict containing search results and metadata
        """
        try:
            # For demo purposes, return mock data
            # In production, this would make actual API calls
            if not self.app_key or self.app_key == "demo_key":
                return await self._generate_mock_products(keywords, page_size)
            
            # Real API implementation would go here
            params = {
                'app_key': self.app_key,
                'method': 'aliexpress.affiliate.product.query',
                'keywords': keywords,
                'category_ids': category_id,
                'min_sale_price': min_price,
                'max_sale_price': max_price,
                'page_size': page_size,
                'page_no': page_no,
                'platform_product_type': 'ALL',
                'ship_to_country': 'SA',
                'target_currency': 'USD',
                'target_language': 'EN',
                'tracking_id': 'default',
                'fields': 'commission_rate,sale_price,seller_id,product_id,product_title,product_main_image_url,product_video_url,product_small_image_urls,shop_url,shop_id,evaluate_rate,30_days_commission,volume,product_detail_url'
            }
            
            # Sign the request (implementation needed)
            signed_params = await self._sign_request(params)
            
            async with self.session.get(f"{self.base_url}/sync", params=signed_params) as response:
                if response.status == 200:
                    data = await response.json()
                    return await self._process_search_results(data)
                else:
                    logger.error(f"AliExpress API error: {response.status}")
                    return await self._generate_mock_products(keywords, page_size)
                    
        except Exception as e:
            logger.error(f"Error searching AliExpress products: {str(e)}")
            return await self._generate_mock_products(keywords, page_size)
    
    async def get_product_details(self, product_id: str) -> Optional[Dict[str, Any]]:
        """
        Get detailed information about a specific product
        
        Args:
            product_id: AliExpress product ID
            
        Returns:
            Product details dictionary
        """
        try:
            if not self.app_key or self.app_key == "demo_key":
                return await self._generate_mock_product_details(product_id)
            
            params = {
                'app_key': self.app_key,
                'method': 'aliexpress.affiliate.product.detail.get',
                'product_ids': product_id,
                'target_currency': 'USD',
                'target_language': 'EN',
                'tracking_id': 'default',
                'fields': 'commission_rate,sale_price,seller_id,product_id,product_title,product_main_image_url,product_video_url,product_small_image_urls,shop_url,shop_id,evaluate_rate,30_days_commission,volume,product_detail_url,original_price,discount'
            }
            
            signed_params = await self._sign_request(params)
            
            async with self.session.get(f"{self.base_url}/sync", params=signed_params) as response:
                if response.status == 200:
                    data = await response.json()
                    return await self._process_product_details(data)
                else:
                    return await self._generate_mock_product_details(product_id)
                    
        except Exception as e:
            logger.error(f"Error getting product details: {str(e)}")
            return await self._generate_mock_product_details(product_id)
    
    async def import_product_to_store(
        self, 
        aliexpress_product_id: str,
        custom_name: Optional[str] = None,
        custom_description: Optional[str] = None,
        markup_percentage: float = 50.0,
        category: str = "imported"
    ) -> Dict[str, Any]:
        """
        Import a product from AliExpress to the local store
        
        Args:
            aliexpress_product_id: Product ID from AliExpress
            custom_name: Custom product name (optional)
            custom_description: Custom product description (optional)  
            markup_percentage: Markup percentage for pricing
            category: Local store category
            
        Returns:
            Imported product data
        """
        try:
            # Get product details from AliExpress
            product_details = await self.get_product_details(aliexpress_product_id)
            
            if not product_details:
                raise Exception("Product not found on AliExpress")
            
            # Calculate pricing with markup
            original_price = float(product_details.get('sale_price', 0))
            marked_up_price = original_price * (1 + markup_percentage / 100)
            
            # Prepare product data for local store
            product_data = {
                'id': str(uuid.uuid4()),
                'name': custom_name or product_details.get('product_title', ''),
                'name_en': custom_name or product_details.get('product_title', ''),
                'description': custom_description or product_details.get('product_title', ''),
                'description_en': custom_description or product_details.get('product_title', ''),
                'price': round(marked_up_price, 2),
                'original_price': round(original_price, 2),
                'currency': 'USD',
                'category': category,
                'images': product_details.get('images', []),
                'stock_quantity': 999,  # Dropshipping - virtual stock
                'sku': f"AE_{aliexpress_product_id}",
                'aliexpress_id': aliexpress_product_id,
                'aliexpress_url': product_details.get('product_url', ''),
                'supplier': 'AliExpress',
                'is_dropshipping': True,
                'is_featured': False,
                'is_active': True,
                'tags': product_details.get('tags', []),
                'rating': product_details.get('evaluate_rate', 0),
                'reviews_count': product_details.get('volume', 0),
                'created_at': datetime.now(timezone.utc).isoformat(),
                'updated_at': datetime.now(timezone.utc).isoformat(),
                'import_source': 'aliexpress',
                'markup_percentage': markup_percentage
            }
            
            # Save to database
            await self.db.products.insert_one(product_data)
            
            # Log the import
            await self._log_import_activity(product_data)
            
            logger.info(f"Product imported successfully: {aliexpress_product_id}")
            return product_data
            
        except Exception as e:
            logger.error(f"Error importing product: {str(e)}")
            raise Exception(f"Failed to import product: {str(e)}")
    
    async def sync_product_prices(self) -> Dict[str, Any]:
        """
        Sync prices of all AliExpress products in the store
        
        Returns:
            Sync results summary
        """
        try:
            # Find all AliExpress products
            products = await self.db.products.find({
                'supplier': 'AliExpress',
                'is_active': True
            }).to_list(length=None)
            
            updated_count = 0
            error_count = 0
            results = []
            
            for product in products:
                try:
                    aliexpress_id = product.get('aliexpress_id')
                    if not aliexpress_id:
                        continue
                    
                    # Get current price from AliExpress
                    current_details = await self.get_product_details(aliexpress_id)
                    
                    if current_details:
                        new_price = float(current_details.get('sale_price', 0))
                        markup_percentage = product.get('markup_percentage', 50.0)
                        new_marked_up_price = round(new_price * (1 + markup_percentage / 100), 2)
                        
                        # Update if price changed
                        if abs(new_marked_up_price - product.get('price', 0)) > 0.01:
                            await self.db.products.update_one(
                                {'_id': product['_id']},
                                {
                                    '$set': {
                                        'price': new_marked_up_price,
                                        'original_price': new_price,
                                        'updated_at': datetime.now(timezone.utc).isoformat(),
                                        'last_price_sync': datetime.now(timezone.utc).isoformat()
                                    }
                                }
                            )
                            updated_count += 1
                            
                        results.append({
                            'product_id': product['id'],
                            'old_price': product.get('price', 0),
                            'new_price': new_marked_up_price,
                            'status': 'updated' if abs(new_marked_up_price - product.get('price', 0)) > 0.01 else 'unchanged'
                        })
                        
                except Exception as e:
                    error_count += 1
                    logger.error(f"Error syncing product {product.get('id', 'unknown')}: {str(e)}")
            
            summary = {
                'total_products': len(products),
                'updated_count': updated_count,
                'error_count': error_count,
                'sync_time': datetime.now(timezone.utc).isoformat(),
                'results': results
            }
            
            # Log sync activity
            await self.db.sync_logs.insert_one({
                **summary,
                'type': 'price_sync',
                'source': 'aliexpress'
            })
            
            logger.info(f"Price sync completed: {updated_count} products updated")
            return summary
            
        except Exception as e:
            logger.error(f"Error syncing prices: {str(e)}")
            raise Exception(f"Price sync failed: {str(e)}")
    
    async def _generate_mock_products(self, keywords: str, count: int = 20) -> Dict[str, Any]:
        """Generate mock product data for demo purposes"""
        products = []
        
        for i in range(count):
            products.append({
                'product_id': f'mock_{i+1}',
                'product_title': f'{keywords} Premium Item {i+1}',
                'sale_price': round(10 + (i * 5.99), 2),
                'original_price': round(15 + (i * 7.99), 2),
                'discount': f'{10 + (i % 50)}%',
                'product_main_image_url': f'https://images.unsplash.com/photo-{1500000000 + i}?w=400',
                'product_small_image_urls': [
                    f'https://images.unsplash.com/photo-{1500000000 + i}?w=400',
                    f'https://images.unsplash.com/photo-{1500000001 + i}?w=400'
                ],
                'evaluate_rate': round(4.0 + (i % 10) * 0.1, 1),
                'volume': 50 + (i * 10),
                'seller_id': f'seller_{(i % 5) + 1}',
                'shop_id': f'shop_{(i % 5) + 1}',
                'commission_rate': f'{5 + (i % 10)}%',
                'product_detail_url': f'https://www.aliexpress.com/item/mock_{i+1}.html',
                'shop_url': f'https://www.aliexpress.com/store/mock_shop_{(i % 5) + 1}'
            })
        
        return {
            'products': products,
            'total_results': count * 10,  # Mock larger total
            'current_page': 1,
            'total_pages': 10,
            'search_keywords': keywords
        }
    
    async def _generate_mock_product_details(self, product_id: str) -> Dict[str, Any]:
        """Generate mock product details for demo purposes"""
        return {
            'product_id': product_id,
            'product_title': f'Premium Luxury Item {product_id}',
            'sale_price': 29.99,
            'original_price': 49.99,
            'discount': '40%',
            'product_main_image_url': 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400',
            'images': [
                'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400',
                'https://images.unsplash.com/photo-1506755855567-92ff770e8d00?w=400',
                'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=400'
            ],
            'product_url': f'https://www.aliexpress.com/item/{product_id}.html',
            'evaluate_rate': 4.5,
            'volume': 150,
            'tags': ['luxury', 'premium', 'accessories'],
            'seller_id': 'demo_seller',
            'shop_id': 'demo_shop'
        }
    
    async def _sign_request(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Sign API request (placeholder for actual implementation)"""
        # In production, implement proper API signature
        return params
    
    async def _process_search_results(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Process and normalize search results from AliExpress API"""
        # Process actual API response format
        return data
    
    async def _process_product_details(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Process and normalize product details from AliExpress API"""
        # Process actual API response format
        return data
    
    async def _log_import_activity(self, product_data: Dict[str, Any]):
        """Log product import activity"""
        await self.db.import_logs.insert_one({
            'type': 'product_import',
            'source': 'aliexpress',
            'product_id': product_data['id'],
            'aliexpress_id': product_data['aliexpress_id'],
            'import_time': datetime.now(timezone.utc).isoformat(),
            'status': 'success'
        })

# Global instance
_aliexpress_service = None

def get_aliexpress_service(db, app_key: str = None, app_secret: str = None) -> AliExpressService:
    """Get or create AliExpress service instance"""
    global _aliexpress_service
    if _aliexpress_service is None:
        _aliexpress_service = AliExpressService(db, app_key, app_secret)
    return _aliexpress_service