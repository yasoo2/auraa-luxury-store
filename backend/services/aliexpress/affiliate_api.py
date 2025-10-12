"""
AliExpress Affiliate API Service
Handles product search, details, and commission tracking
"""
import hashlib
import hmac
import time
import aiohttp
import logging
from typing import Dict, List, Optional, Any
import json

logger = logging.getLogger(__name__)

class AliExpressAffiliateAPI:
    """AliExpress Affiliate API client for product imports"""
    
    def __init__(self, app_key: str, app_secret: str, tracking_id: str):
        self.app_key = app_key
        self.app_secret = app_secret
        self.tracking_id = tracking_id
        self.base_url = "https://api-sg.aliexpress.com/sync"
        
    def _generate_signature(self, params: Dict[str, str]) -> str:
        """Generate API signature using MD5"""
        # Sort parameters
        sorted_params = sorted(params.items())
        
        # Build sign string: secret + key1value1key2value2... + secret
        sign_str = self.app_secret + ''.join([f'{k}{v}' for k, v in sorted_params]) + self.app_secret
        
        # Generate MD5 hash
        signature = hashlib.md5(sign_str.encode('utf-8')).hexdigest().upper()
        
        return signature
    
    async def search_products(
        self, 
        keywords: str, 
        category_id: Optional[str] = None,
        page_no: int = 1,
        page_size: int = 20,
        min_price: Optional[float] = None,
        max_price: Optional[float] = None,
        ship_to_country: str = "SA",
        sort: str = "SALE_PRICE_ASC"
    ) -> Dict[str, Any]:
        """
        Search for products using Affiliate API
        
        Args:
            keywords: Search keywords
            category_id: Category ID (optional)
            page_no: Page number (1-based)
            page_size: Items per page (max 50)
            min_price: Minimum price in USD
            max_price: Maximum price in USD
            ship_to_country: 2-letter country code (SA, AE, etc.)
            sort: Sort order (SALE_PRICE_ASC, SALE_PRICE_DESC, etc.)
        """
        try:
            # Build request parameters
            params = {
                'app_key': self.app_key,
                'method': 'aliexpress.affiliate.product.query',
                'timestamp': str(int(time.time() * 1000)),
                'format': 'json',
                'v': '2.0',
                'sign_method': 'md5',
                'keywords': keywords,
                'page_no': str(page_no),
                'page_size': str(page_size),
                'sort': sort,
                'ship_to_country': ship_to_country,
                'tracking_id': self.tracking_id,
                'target_currency': 'USD',
                'target_language': 'EN'
            }
            
            # Add optional parameters
            if category_id:
                params['category_ids'] = category_id
            if min_price:
                params['min_sale_price'] = str(min_price)
            if max_price:
                params['max_sale_price'] = str(max_price)
            
            # Generate signature
            params['sign'] = self._generate_signature(params)
            
            # Make API request
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    self.base_url, 
                    data=params,
                    timeout=aiohttp.ClientTimeout(total=30)
                ) as response:
                    result = await response.json()
                    
                    # Check for errors
                    if 'error_response' in result:
                        error = result['error_response']
                        logger.error(f"Affiliate API error: {error}")
                        raise Exception(f"API Error: {error.get('msg', 'Unknown error')}")
                    
                    # Extract product data
                    response_data = result.get('aliexpress_affiliate_product_query_response', {})
                    
                    return {
                        'success': True,
                        'total_results': response_data.get('resp_result', {}).get('result', {}).get('total_results', 0),
                        'current_page': page_no,
                        'products': self._parse_products(response_data)
                    }
                    
        except Exception as e:
            logger.error(f"Error searching products: {e}")
            return {
                'success': False,
                'error': str(e),
                'products': []
            }
    
    def _parse_products(self, response_data: Dict) -> List[Dict]:
        """Parse product data from API response"""
        products = []
        
        try:
            result = response_data.get('resp_result', {}).get('result', {})
            products_data = result.get('products', {}).get('product', [])
            
            for product in products_data:
                parsed = {
                    'external_id': str(product.get('product_id', '')),
                    'name': product.get('product_title', ''),
                    'price': float(product.get('target_sale_price', 0)),
                    'original_price': float(product.get('target_original_price', 0)),
                    'currency': product.get('target_sale_price_currency', 'USD'),
                    'image_url': product.get('product_main_image_url', ''),
                    'product_url': product.get('product_detail_url', ''),
                    'promotion_link': product.get('promotion_link', ''),
                    'rating': float(product.get('evaluate_rate', 0)),
                    'orders': int(product.get('volume', 0)),
                    'commission_rate': float(product.get('commission_rate', 0)),
                    'discount': int(product.get('discount', 0)),
                    'ship_to_days': product.get('ship_to_days', 'N/A'),
                    'category_id': product.get('category_id', ''),
                    'shop_id': product.get('shop_id', ''),
                    'shop_url': product.get('shop_url', '')
                }
                products.append(parsed)
                
        except Exception as e:
            logger.error(f"Error parsing products: {e}")
        
        return products
    
    async def get_product_details(self, product_ids: List[str], ship_to_country: str = "SA") -> Dict[str, Any]:
        """
        Get detailed product information
        
        Args:
            product_ids: List of product IDs (max 50)
            ship_to_country: 2-letter country code
        """
        try:
            # Build request parameters
            params = {
                'app_key': self.app_key,
                'method': 'aliexpress.affiliate.productdetail.get',
                'timestamp': str(int(time.time() * 1000)),
                'format': 'json',
                'v': '2.0',
                'sign_method': 'md5',
                'product_ids': ','.join(product_ids),
                'ship_to_country': ship_to_country,
                'tracking_id': self.tracking_id,
                'target_currency': 'USD',
                'target_language': 'EN'
            }
            
            # Generate signature
            params['sign'] = self._generate_signature(params)
            
            # Make API request
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    self.base_url,
                    data=params,
                    timeout=aiohttp.ClientTimeout(total=30)
                ) as response:
                    result = await response.json()
                    
                    # Check for errors
                    if 'error_response' in result:
                        error = result['error_response']
                        logger.error(f"Product details error: {error}")
                        raise Exception(f"API Error: {error.get('msg', 'Unknown error')}")
                    
                    # Extract product details
                    response_data = result.get('aliexpress_affiliate_productdetail_get_response', {})
                    
                    return {
                        'success': True,
                        'products': self._parse_product_details(response_data)
                    }
                    
        except Exception as e:
            logger.error(f"Error getting product details: {e}")
            return {
                'success': False,
                'error': str(e),
                'products': []
            }
    
    def _parse_product_details(self, response_data: Dict) -> List[Dict]:
        """Parse detailed product data from API response"""
        products = []
        
        try:
            result = response_data.get('resp_result', {}).get('result', {})
            products_data = result.get('products', {}).get('product', [])
            
            for product in products_data:
                parsed = {
                    'external_id': str(product.get('product_id', '')),
                    'name': product.get('product_title', ''),
                    'description': product.get('product_detail', ''),
                    'price': float(product.get('target_sale_price', 0)),
                    'original_price': float(product.get('target_original_price', 0)),
                    'currency': product.get('target_sale_price_currency', 'USD'),
                    'image_url': product.get('product_main_image_url', ''),
                    'images': product.get('product_small_image_urls', {}).get('string', []),
                    'product_url': product.get('product_detail_url', ''),
                    'promotion_link': product.get('promotion_link', ''),
                    'rating': float(product.get('evaluate_rate', 0)),
                    'orders': int(product.get('volume', 0)),
                    'stock': int(product.get('stock', 999)),
                    'commission_rate': float(product.get('commission_rate', 0)),
                    'discount': int(product.get('discount', 0)),
                    'ship_to_days': product.get('ship_to_days', 'N/A'),
                    'category_id': product.get('category_id', ''),
                    'shop_id': product.get('shop_id', ''),
                    'shop_url': product.get('shop_url', ''),
                    'properties': product.get('product_properties', [])
                }
                products.append(parsed)
                
        except Exception as e:
            logger.error(f"Error parsing product details: {e}")
        
        return products
    
    async def get_hot_products(
        self,
        category_id: Optional[str] = None,
        page_no: int = 1,
        page_size: int = 20,
        ship_to_country: str = "SA"
    ) -> Dict[str, Any]:
        """Get hot/trending products"""
        try:
            params = {
                'app_key': self.app_key,
                'method': 'aliexpress.affiliate.hotproduct.query',
                'timestamp': str(int(time.time() * 1000)),
                'format': 'json',
                'v': '2.0',
                'sign_method': 'md5',
                'page_no': str(page_no),
                'page_size': str(page_size),
                'ship_to_country': ship_to_country,
                'tracking_id': self.tracking_id,
                'target_currency': 'USD',
                'target_language': 'EN'
            }
            
            if category_id:
                params['category_ids'] = category_id
            
            # Generate signature
            params['sign'] = self._generate_signature(params)
            
            # Make API request
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    self.base_url,
                    data=params,
                    timeout=aiohttp.ClientTimeout(total=30)
                ) as response:
                    result = await response.json()
                    
                    if 'error_response' in result:
                        error = result['error_response']
                        logger.error(f"Hot products error: {error}")
                        raise Exception(f"API Error: {error.get('msg', 'Unknown error')}")
                    
                    response_data = result.get('aliexpress_affiliate_hotproduct_query_response', {})
                    
                    return {
                        'success': True,
                        'products': self._parse_products(response_data)
                    }
                    
        except Exception as e:
            logger.error(f"Error getting hot products: {e}")
            return {
                'success': False,
                'error': str(e),
                'products': []
            }
