"""
AliExpress Product Mapper
Maps AliExpress products to Auraa Luxury store format with pricing logic.
"""

import os
from typing import Dict, Any, Optional
from datetime import datetime


class AliExpressProductMapper:
    """
    Maps AliExpress product data to store format.
    Applies pricing markup and sanitizes all references to source.
    """
    
    def __init__(self):
        # Pricing configuration from ENV
        self.markup_percentage = float(os.getenv('ALI_PRICE_MARKUP_PCT', '100'))
        self.min_profit_usd = float(os.getenv('ALI_MIN_PROFIT_USD', '2.5'))
        
        # VAT configuration
        self.vat_sa = float(os.getenv('DEFAULT_VAT_SA', '15')) / 100
        self.vat_gcc = float(os.getenv('DEFAULT_VAT_GCC', '5')) / 100
    
    def calculate_sale_price(
        self,
        base_price: float,
        shipping_cost: float
    ) -> Dict[str, float]:
        """
        Calculate sale price with markup and minimum profit.
        
        Args:
            base_price: Product base price in USD
            shipping_cost: Shipping cost in USD
            
        Returns:
            Dict with cost_price and sale_price
        """
        # Total cost
        cost_price = base_price + shipping_cost
        
        # Apply markup percentage
        markup_price = cost_price * (1 + self.markup_percentage / 100)
        
        # Apply minimum profit
        min_price = cost_price + self.min_profit_usd
        
        # Take the higher of the two
        sale_price = max(markup_price, min_price)
        
        # Round to 2 decimals
        sale_price = round(sale_price, 2)
        cost_price = round(cost_price, 2)
        
        return {
            'cost_price_usd': cost_price,
            'sale_price_usd': sale_price,
            'profit_usd': round(sale_price - cost_price, 2),
            'profit_percentage': round(((sale_price - cost_price) / cost_price) * 100, 1)
        }
    
    def format_delivery_window(
        self,
        min_days: int,
        max_days: int,
        language: str = 'ar'
    ) -> str:
        """
        Format delivery window text for display.
        
        Args:
            min_days: Minimum delivery days
            max_days: Maximum delivery days
            language: Display language ('ar' or 'en')
            
        Returns:
            Formatted delivery text
        """
        if language == 'ar':
            return f"يوصل خلال {min_days}–{max_days} يوم"
        else:
            return f"Delivers in {min_days}–{max_days} days"
    
    def sanitize_title(self, title: str) -> str:
        """
        Remove any references to AliExpress or vendor names.
        
        Args:
            title: Original product title
            
        Returns:
            Sanitized title
        """
        # Terms to remove
        banned_terms = [
            'aliexpress', 'ali express', 'alibaba', 'china',
            'wholesale', 'dropship', 'free shipping', 'hot sale',
            'new arrival', '2024', '2025', 'shop', 'store'
        ]
        
        clean_title = title.lower()
        for term in banned_terms:
            clean_title = clean_title.replace(term, '')
        
        # Clean extra spaces and capitalize
        clean_title = ' '.join(clean_title.split()).title()
        
        return clean_title[:150]  # Limit length
    
    def sanitize_description(self, description: str) -> str:
        """
        Remove vendor references from description.
        
        Args:
            description: Original description
            
        Returns:
            Sanitized description
        """
        if not description:
            return "Luxury jewelry piece from Auraa Luxury collection."
        
        # Remove banned terms
        clean_desc = description
        banned_terms = [
            'aliexpress', 'ali express', 'alibaba', 'shop now',
            'order now', 'buy from', 'seller', 'vendor'
        ]
        
        for term in banned_terms:
            clean_desc = clean_desc.replace(term, '')
            clean_desc = clean_desc.replace(term.title(), '')
            clean_desc = clean_desc.replace(term.upper(), '')
        
        return clean_desc[:500]
    
    def map_product(
        self,
        aliexpress_product: Dict[str, Any],
        shipping_info: Dict[str, Any],
        ship_to: str,
        category: str
    ) -> Dict[str, Any]:
        """
        Map complete AliExpress product to store format.
        
        Args:
            aliexpress_product: Raw product data from AliExpress
            shipping_info: Shipping information
            ship_to: Destination country code
            category: Product category
            
        Returns:
            Mapped product dict ready for database
        """
        # Extract base data
        product_id = aliexpress_product.get('product_id', '')
        base_price = float(aliexpress_product.get('target_sale_price', 0))
        original_price = float(aliexpress_product.get('target_original_price', base_price))
        
        # Shipping info
        shipping_cost = shipping_info.get('cost', 0)
        shipping_method = shipping_info.get('method', 'Standard Shipping')
        min_days = shipping_info.get('min_days', 15)
        max_days = shipping_info.get('max_days', 30)
        ship_from = shipping_info.get('ship_from', 'CN')
        
        # Calculate pricing
        pricing = self.calculate_sale_price(base_price, shipping_cost)
        
        # Sanitize content
        title = self.sanitize_title(aliexpress_product.get('product_title', ''))
        description = self.sanitize_description(aliexpress_product.get('product_detail_url', ''))
        
        # Images (filter out watermarked images if possible)
        images = []
        if aliexpress_product.get('product_main_image_url'):
            images.append(aliexpress_product['product_main_image_url'])
        
        # Additional images if available
        if aliexpress_product.get('product_small_image_urls'):
            for img in aliexpress_product['product_small_image_urls']:
                if len(images) < 8:  # Limit to 8 images
                    images.append(img)
        
        # Stock determination
        stock = 100  # Default virtual stock for dropshipping
        is_published = True
        
        # Check if product is available
        if shipping_cost == 0 or not shipping_info.get('available', True):
            is_published = False
            stock = 0
        
        # Build mapped product
        mapped_product = {
            # Source tracking (internal use only)
            'source': 'aliexpress',
            'source_product_id': product_id,
            'ship_to': ship_to,
            
            # Display information
            'title': title,
            'description': description,
            'images': images,
            'category': category,
            
            # Pricing
            'cost_price_usd': pricing['cost_price_usd'],
            'shipping_cost_usd': shipping_cost,
            'sale_price_usd': pricing['sale_price_usd'],
            'currency': 'USD',
            
            # Shipping & Delivery
            'delivery_min_days': min_days,
            'delivery_max_days': max_days,
            'delivery_window_text': self.format_delivery_window(min_days, max_days, 'ar'),
            'delivery_window_text_en': self.format_delivery_window(min_days, max_days, 'en'),
            'shipping_method': shipping_method,
            'ship_from_country': ship_from,
            
            # Stock & Availability
            'stock': stock,
            'is_published': is_published,
            
            # Ratings
            'rating': float(aliexpress_product.get('evaluate_rate', 0)),
            'reviews': int(aliexpress_product.get('volume', 0)),
            
            # Timestamps
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow()
        }
        
        return mapped_product
    
    def update_product_availability(
        self,
        current_product: Dict[str, Any],
        new_stock: int,
        shipping_available: bool
    ) -> Dict[str, Any]:
        """
        Update product availability based on stock and shipping.
        
        Args:
            current_product: Current product data
            new_stock: New stock value
            shipping_available: Whether shipping is available
            
        Returns:
            Updated product fields
        """
        updates = {
            'stock': new_stock,
            'updated_at': datetime.utcnow()
        }
        
        # Determine if should be published
        if new_stock == 0 or not shipping_available:
            updates['is_published'] = False
        else:
            updates['is_published'] = True
        
        return updates
