"""
CJ Dropshipping API Integration Service
Handles all interactions with CJ Dropshipping API
"""

import requests
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime
import json

logger = logging.getLogger(__name__)

class CJDropshippingService:
    """Service for interacting with CJ Dropshipping API"""
    
    def __init__(self, email: str, api_key: str):
        """
        Initialize CJ Dropshipping service
        
        Args:
            email: CJ account email
            api_key: CJ Dropshipping API key
        """
        self.email = email
        self.api_key = api_key
        self.base_url = "https://developers.cjdropshipping.com/api2.0/v1"
        self.access_token = None
        self.refresh_token = None
        self.token_expiry = None
        
        # Get initial access token
        self._get_access_token()
    
    def _get_access_token(self):
        """Get access token from CJ API"""
        url = f"{self.base_url}/authentication/getAccessToken"
        data = {
            "email": self.email,
            "apiKey": self.api_key
        }
        
        try:
            response = requests.post(url, json=data, timeout=30)
            response.raise_for_status()
            result = response.json()
            
            if result.get('code') == 200 and result.get('data'):
                token_data = result['data']
                self.access_token = token_data.get('accessToken')
                self.refresh_token = token_data.get('refreshToken')
                self.token_expiry = token_data.get('accessTokenExpiryDate')
                logger.info("✅ CJ API access token obtained successfully")
                return True
            else:
                logger.error(f"Failed to get CJ access token: {result.get('message', 'Unknown error')}")
                return False
        except Exception as e:
            logger.error(f"Failed to get CJ access token: {str(e)}")
            return False
    
    @property
    def headers(self):
        """Get request headers with current access token"""
        return {
            "CJ-Access-Token": self.access_token or "",
            "Content-Type": "application/json"
        }
    
    def _make_request(self, method: str, endpoint: str, data: Optional[Dict] = None) -> Dict:
        """
        Make HTTP request to CJ API
        
        Args:
            method: HTTP method (GET, POST, etc.)
            endpoint: API endpoint
            data: Request data
            
        Returns:
            API response as dictionary
        """
        url = f"{self.base_url}{endpoint}"
        
        try:
            if method.upper() == "GET":
                response = requests.get(url, headers=self.headers, params=data, timeout=30)
            elif method.upper() == "POST":
                response = requests.post(url, headers=self.headers, json=data, timeout=30)
            else:
                raise ValueError(f"Unsupported HTTP method: {method}")
            
            response.raise_for_status()
            result = response.json()
            
            # CJ API returns data in 'data' field
            if result.get('code') == 200:
                return result.get('data', {})
            else:
                logger.error(f"CJ API error: {result.get('message', 'Unknown error')}")
                return {}
                
        except requests.exceptions.RequestException as e:
            logger.error(f"CJ API request failed: {str(e)}")
            return {}
    
    def get_product_details(self, product_id: str) -> Optional[Dict]:
        """
        Get product details from CJ
        
        Args:
            product_id: CJ product ID
            
        Returns:
            Product details dictionary
        """
        endpoint = "/product/query"
        params = {"pid": product_id}
        
        result = self._make_request("GET", endpoint, params)
        return result if result else None
    
    def search_products(self, keyword: str, page: int = 1, page_size: int = 20) -> List[Dict]:
        """
        Search for products on CJ
        
        Args:
            keyword: Search keyword
            page: Page number
            page_size: Number of products per page
            
        Returns:
            List of product dictionaries
        """
        endpoint = "/product/list"
        params = {
            "productNameEn": keyword,
            "pageNum": page,
            "pageSize": page_size
        }
        
        result = self._make_request("GET", endpoint, params)
        return result.get('list', []) if result else []
    
    def get_shipping_cost(self, product_id: str, country_code: str, quantity: int = 1) -> Optional[Dict]:
        """
        Calculate shipping cost for a product
        
        Args:
            product_id: CJ product ID
            country_code: ISO country code (e.g., 'SA' for Saudi Arabia)
            quantity: Product quantity
            
        Returns:
            Shipping cost details
        """
        endpoint = "/logistic/freightCalculate"
        data = {
            "startCountryCode": "CN",  # Most CJ products ship from China
            "endCountryCode": country_code,
            "products": [{
                "pid": product_id,
                "quantity": quantity
            }]
        }
        
        result = self._make_request("POST", endpoint, data)
        return result if result else None
    
    def calculate_final_price(self, product_price: float, shipping_cost: float, 
                             tax_rate: float = 0.05, profit_margin: float = 2.0) -> Dict:
        """
        Calculate final price for customer
        
        Formula: (Product Price × profit_margin) + Shipping + Tax
        
        Args:
            product_price: Base product price from CJ
            shipping_cost: Shipping cost from CJ
            tax_rate: Tax rate (default 5% for Saudi Arabia)
            profit_margin: Profit margin multiplier (default 2.0 = 200%)
            
        Returns:
            Price breakdown dictionary
        """
        # Calculate profit on product only
        product_with_profit = product_price * profit_margin
        
        # Calculate tax on total
        subtotal = product_with_profit + shipping_cost
        tax = subtotal * tax_rate
        
        # Final price
        final_price = subtotal + tax
        
        return {
            "original_product_price": round(product_price, 2),
            "product_price_with_profit": round(product_with_profit, 2),
            "shipping_cost": round(shipping_cost, 2),
            "tax": round(tax, 2),
            "tax_rate": tax_rate,
            "final_price": round(final_price, 2),
            "profit": round(product_with_profit - product_price, 2),
            "currency": "SAR"
        }
    
    def create_order(self, order_data: Dict) -> Optional[Dict]:
        """
        Create order in CJ Dropshipping
        
        Args:
            order_data: Order details
            
        Returns:
            Created order details
        """
        endpoint = "/shopping/order/createOrder"
        
        result = self._make_request("POST", endpoint, order_data)
        return result if result else None
    
    def get_order_status(self, order_id: str) -> Optional[Dict]:
        """
        Get order status from CJ
        
        Args:
            order_id: CJ order ID
            
        Returns:
            Order status details
        """
        endpoint = "/shopping/order/query"
        data = {"orderId": order_id}
        
        result = self._make_request("POST", endpoint, data)
        return result if result else None
    
    def track_shipment(self, tracking_number: str) -> Optional[Dict]:
        """
        Track shipment using tracking number
        
        Args:
            tracking_number: Shipment tracking number
            
        Returns:
            Tracking details
        """
        endpoint = "/logistic/trackQuery"
        data = {"trackingNumber": tracking_number}
        
        result = self._make_request("POST", endpoint, data)
        return result if result else None
    
    def create_return_request(self, order_id: str, reason: str, items: List[Dict]) -> Optional[Dict]:
        """
        Create return request in CJ
        
        Args:
            order_id: CJ order ID
            reason: Return reason
            items: List of items to return
            
        Returns:
            Return request details
        """
        endpoint = "/shopping/order/returnRequest"
        data = {
            "orderId": order_id,
            "reason": reason,
            "items": items
        }
        
        result = self._make_request("POST", endpoint, data)
        return result if result else None
    
    def get_product_variants(self, product_id: str) -> List[Dict]:
        """
        Get product variants (sizes, colors, etc.)
        
        Args:
            product_id: CJ product ID
            
        Returns:
            List of variant dictionaries
        """
        endpoint = "/product/variant/queryByVid"
        data = {"pid": product_id}
        
        result = self._make_request("POST", endpoint, data)
        return result.get('variants', []) if result else []
    
    def sync_product_to_store(self, cj_product_id: str, country_code: str = "SA") -> Optional[Dict]:
        """
        Sync product from CJ to store with calculated prices
        
        Args:
            cj_product_id: CJ product ID
            country_code: Target country code for shipping calculation
            
        Returns:
            Product data ready for store
        """
        # Get product details
        product = self.get_product_details(cj_product_id)
        if not product:
            logger.error(f"Failed to get product details for {cj_product_id}")
            return None
        
        # Get shipping cost
        shipping = self.get_shipping_cost(cj_product_id, country_code)
        shipping_cost = 0
        if shipping and 'logisticList' in shipping:
            # Get cheapest shipping option
            logistics = shipping['logisticList']
            if logistics:
                shipping_cost = min(float(log.get('logisticPrice', 0)) for log in logistics)
        
        # Calculate final price
        product_price = float(product.get('sellPrice', 0))
        pricing = self.calculate_final_price(product_price, shipping_cost)
        
        # Prepare product data for store
        store_product = {
            "cj_product_id": cj_product_id,
            "name": product.get('productNameEn', ''),
            "description": product.get('description', ''),
            "images": product.get('productImage', []),
            "price": pricing['final_price'],
            "original_price": pricing['original_product_price'],
            "shipping_cost": pricing['shipping_cost'],
            "tax": pricing['tax'],
            "profit": pricing['profit'],
            "currency": "SAR",
            "stock": product.get('sellQuantity', 0),
            "variants": self.get_product_variants(cj_product_id),
            "category": product.get('categoryName', ''),
            "weight": product.get('packWeight', 0),
            "dimensions": {
                "length": product.get('packLength', 0),
                "width": product.get('packWidth', 0),
                "height": product.get('packHeight', 0)
            },
            "source": "cj_dropshipping",
            "synced_at": datetime.utcnow().isoformat()
        }
        
        return store_product


# Initialize CJ service with email and API key
CJ_EMAIL = "info.auraaluxury@gmail.com"
CJ_API_KEY = "942ad21128534fba953d489b4d6688ee"
cj_service = CJDropshippingService(CJ_EMAIL, CJ_API_KEY)


def get_cj_service() -> CJDropshippingService:
    """Get CJ Dropshipping service instance"""
    return cj_service

