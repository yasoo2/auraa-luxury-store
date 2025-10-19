"""
AliExpress Web Scraper
Extracts real product data from AliExpress using web scraping.
"""

import asyncio
import re
import json
import logging
from typing import List, Dict, Any, Optional
from urllib.parse import quote, urljoin
from playwright.async_api import async_playwright, Page, Browser
from bs4 import BeautifulSoup
import aiohttp
from decimal import Decimal

logger = logging.getLogger(__name__)


class AliExpressScraper:
    """
    Web scraper for AliExpress products.
    Extracts product information, prices, shipping costs, and availability.
    """
    
    def __init__(self):
        self.base_url = "https://www.aliexpress.com"
        self.search_url = "https://www.aliexpress.com/wholesale"
        self.browser: Optional[Browser] = None
        self.playwright = None
        
    async def initialize(self):
        """Initialize Playwright browser"""
        try:
            self.playwright = await async_playwright().start()
            self.browser = await self.playwright.chromium.launch(
                headless=True,
                args=['--no-sandbox', '--disable-setuid-sandbox']
            )
            logger.info("AliExpress scraper initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize scraper: {e}")
            raise
    
    async def close(self):
        """Close browser and cleanup"""
        if self.browser:
            await self.browser.close()
        if self.playwright:
            await self.playwright.stop()
    
    async def search_products(
        self,
        keywords: str,
        page: int = 1,
        min_price: Optional[float] = None,
        max_price: Optional[float] = None,
        ship_to: str = "SA",
        limit: int = 20
    ) -> List[Dict[str, Any]]:
        """
        Search for products on AliExpress.
        
        Args:
            keywords: Search keywords
            page: Page number
            min_price: Minimum price filter
            max_price: Maximum price filter
            ship_to: Ship to country code (SA, AE, etc.)
            limit: Maximum number of results
            
        Returns:
            List of product dictionaries
        """
        if not self.browser:
            await self.initialize()
        
        try:
            context = await self.browser.new_context(
                user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            )
            page_obj = await context.new_page()
            
            # Build search URL
            search_query = quote(keywords)
            url = f"{self.search_url}?SearchText={search_query}&page={page}"
            
            if min_price:
                url += f"&minPrice={min_price}"
            if max_price:
                url += f"&maxPrice={max_price}"
            
            # Add ship to country
            url += f"&shipCountry={ship_to}"
            
            logger.info(f"Searching AliExpress: {url}")
            
            # Navigate to search page
            await page_obj.goto(url, wait_until="networkidle", timeout=30000)
            
            # Wait for products to load
            await page_obj.wait_for_selector('.search-card-item', timeout=10000)
            
            # Extract product data
            products = await self._extract_search_results(page_obj, limit)
            
            await context.close()
            
            logger.info(f"Found {len(products)} products for '{keywords}'")
            return products
            
        except Exception as e:
            logger.error(f"Error searching products: {e}")
            return []
    
    async def _extract_search_results(self, page: Page, limit: int) -> List[Dict[str, Any]]:
        """Extract product data from search results page"""
        products = []
        
        try:
            # Get page content
            content = await page.content()
            soup = BeautifulSoup(content, 'html.parser')
            
            # Find product cards
            product_cards = soup.select('.search-card-item')[:limit]
            
            for card in product_cards:
                try:
                    product = await self._parse_product_card(card)
                    if product:
                        products.append(product)
                except Exception as e:
                    logger.warning(f"Error parsing product card: {e}")
                    continue
            
        except Exception as e:
            logger.error(f"Error extracting search results: {e}")
        
        return products
    
    async def _parse_product_card(self, card) -> Optional[Dict[str, Any]]:
        """Parse individual product card from search results"""
        try:
            # Extract product ID from link
            link_elem = card.select_one('a.search-card-item')
            if not link_elem:
                return None
            
            product_url = link_elem.get('href', '')
            product_id = self._extract_product_id(product_url)
            
            if not product_id:
                return None
            
            # Extract title
            title_elem = card.select_one('.multi--titleText--nXeOvyr')
            title = title_elem.get_text(strip=True) if title_elem else "Unknown Product"
            
            # Extract price
            price_elem = card.select_one('.multi--price-sale--U-S0jtj')
            price_text = price_elem.get_text(strip=True) if price_elem else "0"
            price = self._parse_price(price_text)
            
            # Extract original price (if on sale)
            original_price_elem = card.select_one('.multi--price-original--1zEQqOK')
            original_price = self._parse_price(original_price_elem.get_text(strip=True)) if original_price_elem else price
            
            # Extract image
            img_elem = card.select_one('img')
            image_url = img_elem.get('src', '') if img_elem else ""
            
            # Extract rating
            rating_elem = card.select_one('.multi--starRating--rBNSwWY')
            rating = 0.0
            if rating_elem:
                rating_text = rating_elem.get_text(strip=True)
                try:
                    rating = float(rating_text)
                except:
                    rating = 0.0
            
            # Extract orders count
            orders_elem = card.select_one('.multi--trade--Ktbl2jB')
            orders = 0
            if orders_elem:
                orders_text = orders_elem.get_text(strip=True)
                orders = self._parse_orders_count(orders_text)
            
            # Extract shipping info
            shipping_elem = card.select_one('.multi--shipping--yNJkXcl')
            free_shipping = False
            if shipping_elem:
                shipping_text = shipping_elem.get_text(strip=True).lower()
                free_shipping = 'free' in shipping_text
            
            return {
                'product_id': product_id,
                'title': title,
                'sale_price': price,
                'original_price': original_price,
                'discount_percentage': round(((original_price - price) / original_price * 100), 1) if original_price > price else 0,
                'image_url': image_url,
                'product_url': urljoin(self.base_url, product_url) if not product_url.startswith('http') else product_url,
                'rating': rating,
                'orders_count': orders,
                'free_shipping': free_shipping,
                'currency': 'USD'
            }
            
        except Exception as e:
            logger.error(f"Error parsing product card: {e}")
            return None
    
    async def get_product_details(
        self,
        product_id: str,
        ship_to: str = "SA"
    ) -> Optional[Dict[str, Any]]:
        """
        Get detailed product information.
        
        Args:
            product_id: AliExpress product ID
            ship_to: Ship to country code
            
        Returns:
            Detailed product information
        """
        if not self.browser:
            await self.initialize()
        
        try:
            context = await self.browser.new_context(
                user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            )
            page = await context.new_page()
            
            # Build product URL
            url = f"{self.base_url}/item/{product_id}.html"
            
            logger.info(f"Fetching product details: {url}")
            
            # Navigate to product page
            await page.goto(url, wait_until="networkidle", timeout=30000)
            
            # Wait for product data to load
            await page.wait_for_selector('.product-title', timeout=10000)
            
            # Extract detailed product data
            product = await self._extract_product_details(page, product_id, ship_to)
            
            await context.close()
            
            return product
            
        except Exception as e:
            logger.error(f"Error getting product details for {product_id}: {e}")
            return None
    
    async def _extract_product_details(
        self,
        page: Page,
        product_id: str,
        ship_to: str
    ) -> Dict[str, Any]:
        """Extract detailed product information from product page"""
        try:
            content = await page.content()
            soup = BeautifulSoup(content, 'html.parser')
            
            # Extract title
            title_elem = soup.select_one('.product-title-text')
            title = title_elem.get_text(strip=True) if title_elem else "Unknown Product"
            
            # Extract price from page data
            price_data = await self._extract_price_data(page)
            
            # Extract images
            images = await self._extract_images(soup)
            
            # Extract description
            description = await self._extract_description(soup)
            
            # Extract shipping information
            shipping_info = await self._extract_shipping_info(page, ship_to)
            
            # Extract specifications
            specs = await self._extract_specifications(soup)
            
            # Extract seller info
            seller_info = await self._extract_seller_info(soup)
            
            return {
                'product_id': product_id,
                'title': title,
                'description': description,
                'sale_price': price_data.get('sale_price', 0),
                'original_price': price_data.get('original_price', 0),
                'currency': price_data.get('currency', 'USD'),
                'images': images,
                'shipping_info': shipping_info,
                'specifications': specs,
                'seller_info': seller_info,
                'rating': price_data.get('rating', 0),
                'orders_count': price_data.get('orders_count', 0),
                'product_url': f"{self.base_url}/item/{product_id}.html"
            }
            
        except Exception as e:
            logger.error(f"Error extracting product details: {e}")
            raise
    
    async def _extract_price_data(self, page: Page) -> Dict[str, Any]:
        """Extract price data from page JavaScript"""
        try:
            # Try to extract from window.runParams
            price_data = await page.evaluate("""
                () => {
                    try {
                        if (window.runParams && window.runParams.data) {
                            const data = window.runParams.data;
                            return {
                                sale_price: parseFloat(data.priceModule?.minActivityAmount?.value || data.priceModule?.minAmount?.value || 0),
                                original_price: parseFloat(data.priceModule?.maxAmount?.value || 0),
                                currency: data.priceModule?.minActivityAmount?.currency || 'USD',
                                rating: parseFloat(data.titleModule?.feedbackRating?.averageStar || 0),
                                orders_count: parseInt(data.titleModule?.tradeCount || 0)
                            };
                        }
                        return null;
                    } catch (e) {
                        return null;
                    }
                }
            """)
            
            if price_data:
                return price_data
            
            # Fallback: extract from HTML
            content = await page.content()
            soup = BeautifulSoup(content, 'html.parser')
            
            price_elem = soup.select_one('.product-price-value')
            price = self._parse_price(price_elem.get_text(strip=True)) if price_elem else 0
            
            return {
                'sale_price': price,
                'original_price': price,
                'currency': 'USD',
                'rating': 0,
                'orders_count': 0
            }
            
        except Exception as e:
            logger.error(f"Error extracting price data: {e}")
            return {
                'sale_price': 0,
                'original_price': 0,
                'currency': 'USD',
                'rating': 0,
                'orders_count': 0
            }
    
    async def _extract_images(self, soup) -> List[str]:
        """Extract product images"""
        images = []
        
        try:
            # Find image gallery
            img_elements = soup.select('.images-view-item img')
            
            for img in img_elements:
                img_url = img.get('src', '')
                if img_url and 'http' in img_url:
                    # Get high-res version
                    img_url = img_url.replace('_50x50.jpg', '').replace('_640x640.jpg', '')
                    images.append(img_url)
            
            # Fallback: main image
            if not images:
                main_img = soup.select_one('.magnifier-image img')
                if main_img:
                    img_url = main_img.get('src', '')
                    if img_url:
                        images.append(img_url)
        
        except Exception as e:
            logger.error(f"Error extracting images: {e}")
        
        return images[:10]  # Limit to 10 images
    
    async def _extract_description(self, soup) -> str:
        """Extract product description"""
        try:
            desc_elem = soup.select_one('.product-description')
            if desc_elem:
                return desc_elem.get_text(strip=True)[:500]  # Limit to 500 chars
            
            # Fallback: use title
            title_elem = soup.select_one('.product-title-text')
            if title_elem:
                return title_elem.get_text(strip=True)
            
            return ""
        except Exception as e:
            logger.error(f"Error extracting description: {e}")
            return ""
    
    async def _extract_shipping_info(self, page: Page, ship_to: str) -> Dict[str, Any]:
        """Extract shipping information for specific country"""
        try:
            # Try to extract from page data
            shipping_data = await page.evaluate(f"""
                () => {{
                    try {{
                        if (window.runParams && window.runParams.data && window.runParams.data.shippingModule) {{
                            const shipping = window.runParams.data.shippingModule;
                            return {{
                                free_shipping: shipping.freightExt?.freightFee === '0' || shipping.freightExt?.freightFee === 'Free',
                                shipping_cost: parseFloat(shipping.freightExt?.freightFee || 0),
                                delivery_time: shipping.freightExt?.deliveryTime || '',
                                currency: 'USD'
                            }};
                        }}
                        return null;
                    }} catch (e) {{
                        return null;
                    }}
                }}
            """)
            
            if shipping_data:
                return shipping_data
            
            # Default shipping info
            return {
                'free_shipping': False,
                'shipping_cost': 0,
                'delivery_time': '15-30 days',
                'currency': 'USD',
                'ship_to': ship_to
            }
            
        except Exception as e:
            logger.error(f"Error extracting shipping info: {e}")
            return {
                'free_shipping': False,
                'shipping_cost': 0,
                'delivery_time': 'Unknown',
                'currency': 'USD',
                'ship_to': ship_to
            }
    
    async def _extract_specifications(self, soup) -> Dict[str, str]:
        """Extract product specifications"""
        specs = {}
        
        try:
            spec_items = soup.select('.product-prop-list .property-item')
            
            for item in spec_items:
                key_elem = item.select_one('.propery-title')
                value_elem = item.select_one('.propery-des')
                
                if key_elem and value_elem:
                    key = key_elem.get_text(strip=True)
                    value = value_elem.get_text(strip=True)
                    specs[key] = value
        
        except Exception as e:
            logger.error(f"Error extracting specifications: {e}")
        
        return specs
    
    async def _extract_seller_info(self, soup) -> Dict[str, Any]:
        """Extract seller information"""
        try:
            seller_elem = soup.select_one('.shop-name')
            seller_name = seller_elem.get_text(strip=True) if seller_elem else "Unknown Seller"
            
            return {
                'name': seller_name,
                'rating': 0,
                'followers': 0
            }
        except Exception as e:
            logger.error(f"Error extracting seller info: {e}")
            return {
                'name': 'Unknown Seller',
                'rating': 0,
                'followers': 0
            }
    
    def _extract_product_id(self, url: str) -> Optional[str]:
        """Extract product ID from URL"""
        try:
            # Pattern: /item/1234567890.html or /item/1234567890
            match = re.search(r'/item/(\d+)', url)
            if match:
                return match.group(1)
            
            # Pattern: productId=1234567890
            match = re.search(r'productId=(\d+)', url)
            if match:
                return match.group(1)
            
            return None
        except Exception as e:
            logger.error(f"Error extracting product ID: {e}")
            return None
    
    def _parse_price(self, price_text: str) -> float:
        """Parse price from text"""
        try:
            # Remove currency symbols and spaces
            price_text = re.sub(r'[^\d.,]', '', price_text)
            # Replace comma with dot for decimal
            price_text = price_text.replace(',', '.')
            # Extract first number
            match = re.search(r'(\d+\.?\d*)', price_text)
            if match:
                return float(match.group(1))
            return 0.0
        except Exception as e:
            logger.error(f"Error parsing price '{price_text}': {e}")
            return 0.0
    
    def _parse_orders_count(self, text: str) -> int:
        """Parse orders count from text"""
        try:
            # Remove non-numeric characters
            text = re.sub(r'[^\d]', '', text)
            if text:
                return int(text)
            return 0
        except Exception as e:
            logger.error(f"Error parsing orders count: {e}")
            return 0


# Global scraper instance
_scraper_instance: Optional[AliExpressScraper] = None


async def get_scraper() -> AliExpressScraper:
    """Get or create global scraper instance"""
    global _scraper_instance
    
    if _scraper_instance is None:
        _scraper_instance = AliExpressScraper()
        await _scraper_instance.initialize()
    
    return _scraper_instance

