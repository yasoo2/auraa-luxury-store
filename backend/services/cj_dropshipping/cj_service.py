"""
CJ Dropshipping API Service
Handles authentication, product search, and import operations
"""

import httpx
import os
import asyncio
from datetime import datetime, timedelta, timezone
from typing import Optional, List, Dict, Any
import logging

logger = logging.getLogger(__name__)

class CJDropshippingService:
    """
    Service for interacting with CJ Dropshipping API
    """
    
    def __init__(self):
        self.email = os.getenv('CJ_DROPSHIP_EMAIL')
        self.api_key = os.getenv('CJ_DROPSHIP_API_KEY')
        self.base_url = os.getenv('CJ_DROPSHIP_BASE_URL', 'https://developers.cjdropshipping.com')
        self.api_version = os.getenv('CJ_DROPSHIP_API_VERSION', 'api2.0/v1')
        
        # Token management
        self.access_token: Optional[str] = None
        self.refresh_token: Optional[str] = None
        self.token_expires_at: Optional[datetime] = None
        self.refresh_token_expires_at: Optional[datetime] = None
        
        # HTTP client
        self.client = httpx.AsyncClient(timeout=30.0)
        
        # Rate limiting
        self.rate_limit_remaining = 1000
        self.rate_limit_reset_time = None
    
    async def _get_api_url(self, endpoint: str) -> str:
        """Construct full API URL"""
        endpoint = endpoint.lstrip('/')
        return f"{self.base_url}/{self.api_version}/{endpoint}"
    
    async def authenticate(self) -> bool:
        """
        Authenticate with CJ Dropshipping API and obtain access token
        Returns True if successful, False otherwise
        """
        try:
            url = await self._get_api_url('authentication/getAccessToken')
            
            payload = {
                "email": self.email,
                "password": self.api_key
            }
            
            logger.info(f"Authenticating with CJ Dropshipping for email: {self.email}")
            
            response = await self.client.post(url, json=payload)
            response.raise_for_status()
            
            data = response.json()
            
            # Check if response is successful
            if data.get('code') == 200 and data.get('result'):
                result = data['data']
                self.access_token = result.get('accessToken')
                self.refresh_token = result.get('refreshToken')
                
                # Tokens valid for 15 days
                self.token_expires_at = datetime.now(timezone.utc) + timedelta(days=15)
                self.refresh_token_expires_at = datetime.now(timezone.utc) + timedelta(days=180)
                
                logger.info("✅ CJ Dropshipping authentication successful")
                return True
            else:
                logger.error(f"❌ CJ Authentication failed: {data.get('message')}")
                return False
                
        except Exception as e:
            logger.error(f"❌ CJ Authentication error: {str(e)}")
            return False
    
    async def ensure_authenticated(self) -> bool:
        """Ensure we have a valid access token"""
        # If no token or token expired, authenticate
        if not self.access_token or not self.token_expires_at:
            return await self.authenticate()
        
        # Check if token will expire soon (within 1 hour)
        if datetime.now(timezone.utc) >= (self.token_expires_at - timedelta(hours=1)):
            logger.info("Access token expiring soon, refreshing...")
            return await self.authenticate()
        
        return True
    
    async def _make_request(self, method: str, endpoint: str, **kwargs) -> Dict[Any, Any]:
        """
        Make authenticated request to CJ API
        """
        # Ensure we're authenticated
        if not await self.ensure_authenticated():
            raise Exception("Failed to authenticate with CJ Dropshipping")
        
        url = await self._get_api_url(endpoint)
        
        # Add authentication header
        headers = kwargs.get('headers', {})
        headers['CJ-Access-Token'] = self.access_token
        kwargs['headers'] = headers
        
        # Make request
        if method.upper() == 'GET':
            response = await self.client.get(url, **kwargs)
        elif method.upper() == 'POST':
            response = await self.client.post(url, **kwargs)
        elif method.upper() == 'PUT':
            response = await self.client.put(url, **kwargs)
        else:
            raise ValueError(f"Unsupported HTTP method: {method}")
        
        response.raise_for_status()
        return response.json()
    
    async def get_categories(self) -> List[Dict]:
        """
        Get product categories from CJ Dropshipping
        """
        try:
            data = await self._make_request('GET', 'product/getCategory')
            
            if data.get('code') == 200 and data.get('result'):
                return data.get('data', [])
            else:
                logger.error(f"Failed to get categories: {data.get('message')}")
                return []
                
        except Exception as e:
            logger.error(f"Error getting categories: {str(e)}")
            return []
    
    async def search_products(
        self,
        keyword: Optional[str] = None,
        category_id: Optional[str] = None,
        page: int = 1,
        page_size: int = 20
    ) -> Dict[str, Any]:
        """
        Search products in CJ catalog
        
        Args:
            keyword: Search keyword
            category_id: Filter by category ID
            page: Page number (1-indexed)
            page_size: Results per page (max 20)
        
        Returns:
            Dict with products list and pagination info
        """
        try:
            params = {
                'pageNum': page,
                'pageSize': min(page_size, 20)
            }
            
            if keyword:
                params['keyword'] = keyword
            if category_id:
                params['categoryId'] = category_id
            
            data = await self._make_request('GET', 'product/list', params=params)
            
            if data.get('code') == 200 and data.get('result'):
                result_data = data.get('data', {})
                return {
                    'products': result_data.get('list', []),
                    'total': result_data.get('total', 0),
                    'page': page,
                    'page_size': page_size,
                    'total_pages': (result_data.get('total', 0) + page_size - 1) // page_size
                }
            else:
                logger.error(f"Product search failed: {data.get('message')}")
                return {'products': [], 'total': 0, 'page': 1, 'page_size': page_size, 'total_pages': 0}
                
        except Exception as e:
            logger.error(f"Error searching products: {str(e)}")
            return {'products': [], 'total': 0, 'page': 1, 'page_size': page_size, 'total_pages': 0}
    
    async def get_product_details(self, product_id: str) -> Optional[Dict]:
        """
        Get detailed information about a specific product
        
        Args:
            product_id: CJ product ID or SKU
        
        Returns:
            Product details dictionary or None if not found
        """
        try:
            params = {'pid': product_id}
            
            data = await self._make_request('GET', 'product/query', params=params)
            
            if data.get('code') == 200 and data.get('result'):
                return data.get('data')
            else:
                logger.error(f"Failed to get product details: {data.get('message')}")
                return None
                
        except Exception as e:
            logger.error(f"Error getting product details: {str(e)}")
            return None
    
    async def bulk_search_products(
        self,
        keyword: Optional[str] = None,
        category_id: Optional[str] = None,
        max_products: int = 500
    ) -> List[Dict]:
        """
        Search and retrieve multiple pages of products
        
        Args:
            keyword: Search keyword
            category_id: Filter by category
            max_products: Maximum number of products to retrieve
        
        Returns:
            List of product dictionaries
        """
        all_products = []
        page = 1
        page_size = 20  # CJ API max per page
        
        try:
            while len(all_products) < max_products:
                result = await self.search_products(
                    keyword=keyword,
                    category_id=category_id,
                    page=page,
                    page_size=page_size
                )
                
                products = result.get('products', [])
                if not products:
                    break  # No more products
                
                all_products.extend(products)
                
                # Check if we've retrieved all available products
                if len(all_products) >= result.get('total', 0):
                    break
                
                # Stop if we've reached max
                if len(all_products) >= max_products:
                    all_products = all_products[:max_products]
                    break
                
                page += 1
                
                # Small delay to respect rate limits
                await asyncio.sleep(0.1)
            
            logger.info(f"✅ Retrieved {len(all_products)} products from CJ Dropshipping")
            return all_products
            
        except Exception as e:
            logger.error(f"Error in bulk search: {str(e)}")
            return all_products
    
    async def close(self):
        """Close the HTTP client"""
        await self.client.aclose()

# Global instance
cj_service = CJDropshippingService()


def get_cj_service() -> CJDropshippingService:
    """Get CJ Dropshipping service instance"""
    return cj_service
