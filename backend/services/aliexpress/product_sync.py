"""
AliExpress Product Synchronization Service
Handles product discovery, detail retrieval, and country availability checking.
"""

import asyncio
import httpx
from typing import List, Optional, Dict, Any
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorDatabase

from .auth import AliExpressAuthenticator
from .models import (
    AliExpressProduct,
    ProductVariant,
    CountryAvailability,
    ShippingMethod
)


class ProductSyncService:
    """
    Service for synchronizing products from AliExpress.
    Handles product discovery, detail retrieval, and country availability.
    """
    
    def __init__(
        self,
        authenticator: AliExpressAuthenticator,
        db: AsyncIOMotorDatabase,
        api_base_url: str = "http://gw.api.taobao.com/router/rest"
    ):
        """
        Initialize product sync service.
        
        Args:
            authenticator: AliExpress authenticator instance
            db: MongoDB database instance
            api_base_url: AliExpress API base URL
        """
        self.auth = authenticator
        self.db = db
        self.api_url = api_base_url
        self.target_countries = ['SA', 'AE', 'KW', 'QA', 'BH', 'OM']
        
    async def make_api_request(
        self,
        method: str,
        params: Dict[str, Any],
        retry_count: int = 3
    ) -> Dict[str, Any]:
        """
        Make authenticated API request with retry logic.
        
        Args:
            method: AliExpress API method name
            params: Method-specific parameters
            retry_count: Number of retry attempts
            
        Returns:
            API response as dictionary
            
        Raises:
            Exception: On persistent failures
        """
        request_params = self.auth.prepare_request_params(method, params)
        
        for attempt in range(retry_count):
            try:
                async with httpx.AsyncClient(timeout=30.0) as client:
                    response = await client.post(
                        self.api_url,
                        data=request_params,
                        headers={'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8'}
                    )
                    response.raise_for_status()
                    data = response.json()
                    
                    # Check for API errors in response
                    if 'error_response' in data:
                        error = data['error_response']
                        raise Exception(f"API Error: {error.get('msg', 'Unknown error')}")
                    
                    return data
                    
            except httpx.TimeoutException:
                if attempt == retry_count - 1:
                    raise Exception("API request timeout")
                await asyncio.sleep(2 ** attempt)  # Exponential backoff
                
            except httpx.HTTPError as e:
                if attempt == retry_count - 1:
                    raise Exception(f"HTTP error: {str(e)}")
                await asyncio.sleep(2 ** attempt)
    
    async def get_product_details(self, product_id: str) -> Optional[AliExpressProduct]:
        """
        Fetch complete product details from AliExpress.
        
        Args:
            product_id: AliExpress product ID
            
        Returns:
            AliExpressProduct instance or None if not found
        """
        params = {
            'product_ids': product_id,
            'target_currency': 'USD',
            'target_language': 'EN'
        }
        
        try:
            response = await self.make_api_request(
                'aliexpress.affiliate.productdetail.get',
                params
            )
            
            # Parse response and extract product data
            result = response.get('aliexpress_affiliate_productdetail_get_response', {})
            result_data = result.get('resp_result', {})
            
            if not result_data.get('result', {}).get('products'):
                return None
            
            product_data = result_data['result']['products']['product'][0]
            
            # Transform API response to our model
            product = AliExpressProduct(
                product_id=product_data['product_id'],
                title=product_data['product_title'],
                description=product_data.get('product_detail_url'),
                images=[product_data.get('product_main_image_url', '')],
                original_price=float(product_data.get('original_price', 0)),
                sale_price=float(product_data.get('target_sale_price', 0)),
                currency=product_data.get('target_sale_price_currency', 'USD'),
                rating=float(product_data.get('evaluate_rate', 0)),
                orders_count=int(product_data.get('volume', 0))
            )
            
            return product
            
        except Exception as e:
            print(f"Error fetching product {product_id}: {str(e)}")
            return None
    
    async def check_country_availability(
        self,
        product_id: str,
        country_code: str
    ) -> CountryAvailability:
        """
        Check if product can be shipped to specific country and get costs.
        
        Args:
            product_id: AliExpress product ID
            country_code: ISO country code (e.g., 'SA' for Saudi Arabia)
            
        Returns:
            CountryAvailability with shipping options and costs
        """
        params = {
            'product_id': product_id,
            'country_code': country_code,
            'product_num': 1
        }
        
        try:
            response = await self.make_api_request(
                'aliexpress.ds.shipping.info',
                params
            )
            
            result = response.get('aliexpress_ds_shipping_info_response', {})
            shipping_info = result.get('result', {})
            
            if not shipping_info.get('aeop_freight_calculate_result_list'):
                return CountryAvailability(
                    country_code=country_code,
                    available=False
                )
            
            # Parse shipping methods
            shipping_methods = []
            for method in shipping_info['aeop_freight_calculate_result_list']:
                shipping_methods.append(ShippingMethod(
                    service_name=method.get('service_name', 'Standard'),
                    shipping_cost=float(method.get('freight', 0)),
                    delivery_time_min=int(method.get('delivery_date_min', 15)),
                    delivery_time_max=int(method.get('delivery_date_max', 45)),
                    tracking_available=method.get('tracking_available', True),
                    currency=method.get('currency', 'USD')
                ))
            
            availability = CountryAvailability(
                country_code=country_code,
                available=len(shipping_methods) > 0,
                shipping_methods=shipping_methods
            )
            
            # Calculate customs and VAT for Saudi Arabia
            if country_code == 'SA' and availability.available:
                product = await self.get_product_details(product_id)
                if product:
                    base_price = product.sale_price
                    availability.estimated_vat = base_price * 0.15  # 15% VAT
                    availability.total_landed_cost = (
                        base_price + 
                        availability.estimated_vat + 
                        min(m.shipping_cost for m in shipping_methods)
                    )
            
            return availability
            
        except Exception as e:
            print(f"Error checking availability for {product_id} in {country_code}: {str(e)}")
            return CountryAvailability(
                country_code=country_code,
                available=False
            )
    
    async def sync_product(self, product_id: str) -> Optional[str]:
        """
        Synchronize single product with all country availability data.
        
        Args:
            product_id: AliExpress product ID
            
        Returns:
            MongoDB document ID if successful, None otherwise
        """
        # Get product details
        product = await self.get_product_details(product_id)
        if not product:
            return None
        
        # Check availability for all target countries
        for country_code in self.target_countries:
            availability = await self.check_country_availability(
                product_id,
                country_code
            )
            product.country_availability[country_code] = availability
        
        # Store in MongoDB
        product_dict = product.model_dump()
        result = await self.db.products.update_one(
            {'product_id': product_id},
            {'$set': product_dict},
            upsert=True
        )
        
        return str(result.upserted_id) if result.upserted_id else product_id
    
    async def sync_products_batch(
        self,
        product_ids: List[str],
        batch_size: int = 10
    ) -> Dict[str, Any]:
        """
        Synchronize multiple products in batches.
        
        Args:
            product_ids: List of product IDs to sync
            batch_size: Number of concurrent requests
            
        Returns:
            Summary statistics of sync operation
        """
        results = {
            'total': len(product_ids),
            'successful': 0,
            'failed': 0,
            'product_ids': []
        }
        
        # Process in batches to respect rate limits
        for i in range(0, len(product_ids), batch_size):
            batch = product_ids[i:i+batch_size]
            tasks = [self.sync_product(pid) for pid in batch]
            batch_results = await asyncio.gather(*tasks, return_exceptions=True)
            
            for result in batch_results:
                if isinstance(result, Exception):
                    results['failed'] += 1
                elif result:
                    results['successful'] += 1
                    results['product_ids'].append(result)
                else:
                    results['failed'] += 1
            
            # Rate limiting delay between batches
            if i + batch_size < len(product_ids):
                await asyncio.sleep(2)
        
        return results
