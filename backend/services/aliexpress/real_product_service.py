"""
Real AliExpress Product Service
Integrates web scraping and intelligent pricing for real dropshipping functionality.
"""

import asyncio
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorDatabase
import uuid

from .scraper import AliExpressScraper, get_scraper
from .pricing_engine import PricingEngine, get_pricing_engine
from .customs_calculator import CustomsCalculator

logger = logging.getLogger(__name__)


class RealAliExpressService:
    """
    Complete AliExpress service with real product data.
    Combines web scraping, intelligent pricing, and database management.
    """
    
    def __init__(
        self,
        db: AsyncIOMotorDatabase,
        profit_margin: float = 50.0,
        default_country: str = "SA"
    ):
        """
        Initialize real AliExpress service.
        
        Args:
            db: MongoDB database instance
            profit_margin: Default profit margin percentage
            default_country: Default country for pricing calculations
        """
        self.db = db
        self.profit_margin = profit_margin
        self.default_country = default_country
        self.scraper: Optional[AliExpressScraper] = None
        self.pricing_engine = get_pricing_engine(profit_margin)
        self.customs_calculator = CustomsCalculator()
    
    async def initialize(self):
        """Initialize the service"""
        try:
            self.scraper = await get_scraper()
            logger.info("Real AliExpress service initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize service: {e}")
            raise
    
    async def search_and_import_products(
        self,
        keywords: str,
        country_code: str = None,
        limit: int = 20,
        auto_import: bool = False,
        category: str = "imported"
    ) -> Dict[str, Any]:
        """
        Search for products on AliExpress and optionally import them.
        
        Args:
            keywords: Search keywords
            country_code: Target country for pricing
            limit: Maximum number of products
            auto_import: Automatically import products to database
            category: Store category for imported products
            
        Returns:
            Search results with pricing information
        """
        if not self.scraper:
            await self.initialize()
        
        country = country_code or self.default_country
        
        try:
            logger.info(f"Searching AliExpress for '{keywords}' (country: {country})")
            
            # Search products using scraper
            products = await self.scraper.search_products(
                keywords=keywords,
                ship_to=country,
                limit=limit
            )
            
            if not products:
                logger.warning(f"No products found for '{keywords}'")
                return {
                    'success': False,
                    'message': 'No products found',
                    'products': [],
                    'count': 0
                }
            
            # Calculate pricing for all products
            products_with_pricing = self.pricing_engine.calculate_bulk_pricing(
                products=products,
                country_code=country,
                profit_margin=self.profit_margin
            )
            
            # Auto-import if requested
            imported_count = 0
            if auto_import:
                for product in products_with_pricing:
                    try:
                        await self._import_product_to_db(product, category, country)
                        imported_count += 1
                    except Exception as e:
                        logger.error(f"Failed to import product {product.get('product_id')}: {e}")
            
            return {
                'success': True,
                'message': f"Found {len(products)} products",
                'products': products_with_pricing,
                'count': len(products),
                'imported_count': imported_count,
                'search_keywords': keywords,
                'country': country
            }
            
        except Exception as e:
            logger.error(f"Error searching products: {e}")
            return {
                'success': False,
                'message': str(e),
                'products': [],
                'count': 0
            }
    
    async def get_product_with_pricing(
        self,
        product_id: str,
        country_code: str = None
    ) -> Optional[Dict[str, Any]]:
        """
        Get detailed product information with pricing.
        
        Args:
            product_id: AliExpress product ID
            country_code: Target country for pricing
            
        Returns:
            Complete product information with pricing
        """
        if not self.scraper:
            await self.initialize()
        
        country = country_code or self.default_country
        
        try:
            logger.info(f"Fetching product {product_id} for country {country}")
            
            # Get product details from AliExpress
            product = await self.scraper.get_product_details(
                product_id=product_id,
                ship_to=country
            )
            
            if not product:
                logger.warning(f"Product {product_id} not found")
                return None
            
            # Calculate complete pricing
            base_price = product.get('sale_price', 0)
            title = product.get('title', '')
            
            # Get shipping cost from product data if available
            shipping_info = product.get('shipping_info', {})
            custom_shipping = shipping_info.get('shipping_cost', None)
            free_shipping = shipping_info.get('free_shipping', False)
            
            pricing = self.pricing_engine.calculate_complete_pricing(
                base_price=base_price,
                country_code=country,
                product_title=title,
                custom_shipping_cost=custom_shipping,
                free_shipping=free_shipping
            )
            
            # Combine product data with pricing
            complete_product = {
                **product,
                'pricing': pricing,
                'final_price': pricing['final_price'],
                'display_price': pricing['final_price'],
                'country_specific': {
                    'country_code': country,
                    'shipping': {
                        'cost': pricing['shipping_cost'],
                        'free': pricing['free_shipping'],
                        'delivery_time': pricing['delivery_estimate']
                    },
                    'taxes': {
                        'customs_duty': pricing['customs_duty'],
                        'vat': pricing['vat'],
                        'total': pricing['total_taxes']
                    }
                },
                'customer_display': self.pricing_engine.get_customer_price_display(pricing)
            }
            
            return complete_product
            
        except Exception as e:
            logger.error(f"Error getting product {product_id}: {e}")
            return None
    
    async def import_product(
        self,
        product_id: str,
        country_code: str = None,
        category: str = "imported",
        custom_name: Optional[str] = None,
        custom_description: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Import a product from AliExpress to the store.
        
        Args:
            product_id: AliExpress product ID
            country_code: Target country for default pricing
            category: Store category
            custom_name: Custom product name (optional)
            custom_description: Custom description (optional)
            
        Returns:
            Import result with product data
        """
        try:
            # Get product with pricing
            product = await self.get_product_with_pricing(product_id, country_code)
            
            if not product:
                raise Exception(f"Product {product_id} not found on AliExpress")
            
            # Import to database
            db_product = await self._import_product_to_db(
                product=product,
                category=category,
                country_code=country_code or self.default_country,
                custom_name=custom_name,
                custom_description=custom_description
            )
            
            logger.info(f"Successfully imported product {product_id}")
            
            return {
                'success': True,
                'message': 'Product imported successfully',
                'product': db_product
            }
            
        except Exception as e:
            logger.error(f"Error importing product {product_id}: {e}")
            return {
                'success': False,
                'message': str(e),
                'product': None
            }
    
    async def _import_product_to_db(
        self,
        product: Dict[str, Any],
        category: str,
        country_code: str,
        custom_name: Optional[str] = None,
        custom_description: Optional[str] = None
    ) -> Dict[str, Any]:
        """Import product to database"""
        try:
            product_id = product.get('product_id')
            
            # Check if product already exists
            existing = await self.db.products.find_one({'aliexpress_id': product_id})
            
            # Prepare product data
            pricing = product.get('pricing', {})
            
            product_data = {
                'id': existing.get('id') if existing else str(uuid.uuid4()),
                'name': custom_name or product.get('title', ''),
                'name_en': custom_name or product.get('title', ''),
                'description': custom_description or product.get('description', product.get('title', '')),
                'description_en': custom_description or product.get('description', product.get('title', '')),
                
                # Pricing (default country pricing)
                'price': pricing.get('final_price', 0),
                'base_price': pricing.get('base_price', 0),
                'original_price': product.get('original_price', 0),
                'currency': 'USD',
                
                # Product details
                'category': category,
                'images': product.get('images', [product.get('image_url', '')]),
                'stock_quantity': 999,  # Virtual stock for dropshipping
                'in_stock': True,
                
                # AliExpress data
                'aliexpress_id': product_id,
                'aliexpress_url': product.get('product_url', ''),
                'supplier': 'AliExpress',
                'is_dropshipping': True,
                
                # Ratings and reviews
                'rating': product.get('rating', 0),
                'reviews_count': product.get('orders_count', 0),
                
                # Shipping and pricing info
                'shipping_info': product.get('shipping_info', {}),
                'country_pricing': {
                    country_code: pricing
                },
                
                # Metadata
                'profit_margin': self.profit_margin,
                'import_source': 'aliexpress_scraper',
                'is_active': True,
                'is_featured': False,
                'created_at': existing.get('created_at') if existing else datetime.now(timezone.utc).isoformat(),
                'updated_at': datetime.now(timezone.utc).isoformat(),
                'last_sync': datetime.now(timezone.utc).isoformat()
            }
            
            # Update or insert
            if existing:
                await self.db.products.update_one(
                    {'_id': existing['_id']},
                    {'$set': product_data}
                )
                logger.info(f"Updated existing product {product_id}")
            else:
                await self.db.products.insert_one(product_data)
                logger.info(f"Inserted new product {product_id}")
            
            # Log import activity
            await self.db.import_logs.insert_one({
                'type': 'product_import',
                'source': 'aliexpress_scraper',
                'product_id': product_data['id'],
                'aliexpress_id': product_id,
                'country': country_code,
                'import_time': datetime.now(timezone.utc).isoformat(),
                'status': 'success'
            })
            
            return product_data
            
        except Exception as e:
            logger.error(f"Error saving product to database: {e}")
            raise
    
    async def sync_product_pricing(
        self,
        product_id: str,
        countries: List[str] = None
    ) -> Dict[str, Any]:
        """
        Sync pricing for a product across multiple countries.
        
        Args:
            product_id: Store product ID
            countries: List of country codes to sync
            
        Returns:
            Sync results
        """
        if countries is None:
            countries = ['SA', 'AE', 'KW', 'QA', 'BH', 'OM']
        
        try:
            # Get product from database
            product = await self.db.products.find_one({'id': product_id})
            
            if not product:
                raise Exception(f"Product {product_id} not found in database")
            
            aliexpress_id = product.get('aliexpress_id')
            if not aliexpress_id:
                raise Exception(f"Product {product_id} is not an AliExpress product")
            
            # Get fresh data from AliExpress
            fresh_product = await self.scraper.get_product_details(
                product_id=aliexpress_id,
                ship_to=countries[0]  # Use first country for base data
            )
            
            if not fresh_product:
                raise Exception(f"Failed to fetch product {aliexpress_id} from AliExpress")
            
            # Calculate pricing for all countries
            country_pricing = {}
            
            for country in countries:
                try:
                    pricing = self.pricing_engine.calculate_complete_pricing(
                        base_price=fresh_product.get('sale_price', 0),
                        country_code=country,
                        product_title=fresh_product.get('title', ''),
                        free_shipping=fresh_product.get('shipping_info', {}).get('free_shipping', False)
                    )
                    
                    country_pricing[country] = pricing
                    
                except Exception as e:
                    logger.error(f"Error calculating pricing for {country}: {e}")
            
            # Update product in database
            update_data = {
                'base_price': fresh_product.get('sale_price', 0),
                'original_price': fresh_product.get('original_price', 0),
                'country_pricing': country_pricing,
                'price': country_pricing.get(self.default_country, {}).get('final_price', 0),
                'updated_at': datetime.now(timezone.utc).isoformat(),
                'last_sync': datetime.now(timezone.utc).isoformat()
            }
            
            await self.db.products.update_one(
                {'id': product_id},
                {'$set': update_data}
            )
            
            logger.info(f"Successfully synced pricing for product {product_id}")
            
            return {
                'success': True,
                'message': 'Pricing synced successfully',
                'product_id': product_id,
                'countries': countries,
                'pricing': country_pricing
            }
            
        except Exception as e:
            logger.error(f"Error syncing product pricing: {e}")
            return {
                'success': False,
                'message': str(e),
                'product_id': product_id
            }
    
    async def bulk_import_products(
        self,
        keywords: str,
        count: int = 50,
        country_code: str = None,
        category: str = "imported"
    ) -> Dict[str, Any]:
        """
        Bulk import products from AliExpress.
        
        Args:
            keywords: Search keywords
            count: Number of products to import
            country_code: Target country
            category: Store category
            
        Returns:
            Import statistics
        """
        try:
            # Search and import products
            result = await self.search_and_import_products(
                keywords=keywords,
                country_code=country_code,
                limit=count,
                auto_import=True,
                category=category
            )
            
            return {
                'success': result['success'],
                'message': f"Imported {result.get('imported_count', 0)} products",
                'statistics': {
                    'searched': result.get('count', 0),
                    'imported': result.get('imported_count', 0),
                    'failed': result.get('count', 0) - result.get('imported_count', 0)
                },
                'keywords': keywords,
                'category': category
            }
            
        except Exception as e:
            logger.error(f"Error in bulk import: {e}")
            return {
                'success': False,
                'message': str(e),
                'statistics': {
                    'searched': 0,
                    'imported': 0,
                    'failed': 0
                }
            }
    
    async def get_product_availability(
        self,
        product_id: str,
        country_code: str
    ) -> Dict[str, Any]:
        """
        Check product availability for a specific country.
        
        Args:
            product_id: Store product ID
            country_code: Country code
            
        Returns:
            Availability information
        """
        try:
            # Get product from database
            product = await self.db.products.find_one({'id': product_id})
            
            if not product:
                raise Exception(f"Product {product_id} not found")
            
            # Get country-specific pricing
            country_pricing = product.get('country_pricing', {}).get(country_code)
            
            # If not cached, calculate fresh
            if not country_pricing:
                aliexpress_id = product.get('aliexpress_id')
                if aliexpress_id:
                    fresh_product = await self.get_product_with_pricing(
                        aliexpress_id,
                        country_code
                    )
                    if fresh_product:
                        country_pricing = fresh_product.get('pricing', {})
            
            if not country_pricing:
                return {
                    'available': False,
                    'message': 'Product not available in this country'
                }
            
            return {
                'available': True,
                'country_code': country_code,
                'pricing': country_pricing,
                'shipping': {
                    'cost': country_pricing.get('shipping_cost', 0),
                    'free': country_pricing.get('free_shipping', False),
                    'delivery_time': country_pricing.get('delivery_estimate', 'Unknown')
                },
                'taxes': {
                    'customs': country_pricing.get('customs_duty', 0),
                    'vat': country_pricing.get('vat', 0),
                    'total': country_pricing.get('total_taxes', 0)
                },
                'final_price': country_pricing.get('final_price', 0)
            }
            
        except Exception as e:
            logger.error(f"Error checking availability: {e}")
            return {
                'available': False,
                'message': str(e)
            }
    
    async def close(self):
        """Close the service and cleanup resources"""
        if self.scraper:
            await self.scraper.close()


# Global service instance
_service_instance: Optional[RealAliExpressService] = None


async def get_real_aliexpress_service(
    db: AsyncIOMotorDatabase,
    profit_margin: float = 50.0
) -> RealAliExpressService:
    """Get or create global service instance"""
    global _service_instance
    
    if _service_instance is None:
        _service_instance = RealAliExpressService(db, profit_margin)
        await _service_instance.initialize()
    
    return _service_instance

