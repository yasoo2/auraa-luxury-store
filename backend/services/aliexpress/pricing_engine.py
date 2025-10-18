"""
Intelligent Pricing Engine for Dropshipping
Calculates final prices including: base price + shipping + taxes + profit margin
"""

import logging
from decimal import Decimal, ROUND_HALF_UP
from typing import Dict, Any, Optional
from .customs_calculator import CustomsCalculator, ProductCategory

logger = logging.getLogger(__name__)


class PricingEngine:
    """
    Intelligent pricing engine that calculates complete product pricing
    for dropshipping business model.
    
    Formula:
    Final Price = (Base Price + Shipping Cost + Customs + VAT) × (1 + Profit Margin)
    
    The profit margin is hidden from customers - they only see:
    - Base Price
    - Shipping Cost
    - Taxes (Customs + VAT)
    - Total Price
    """
    
    def __init__(self, default_profit_margin: float = 50.0):
        """
        Initialize pricing engine.
        
        Args:
            default_profit_margin: Default profit margin percentage (default: 50%)
        """
        self.default_profit_margin = Decimal(str(default_profit_margin))
        self.customs_calculator = CustomsCalculator()
        
        # Shipping cost estimates by country (in USD)
        # These are base estimates - can be updated from real data
        self.shipping_costs = {
            'SA': Decimal('8.00'),   # Saudi Arabia
            'AE': Decimal('7.00'),   # UAE
            'KW': Decimal('9.00'),   # Kuwait
            'QA': Decimal('8.50'),   # Qatar
            'BH': Decimal('7.50'),   # Bahrain
            'OM': Decimal('9.50'),   # Oman
            'EG': Decimal('10.00'),  # Egypt
            'JO': Decimal('11.00'),  # Jordan
            'LB': Decimal('12.00'),  # Lebanon
            'OTHER': Decimal('15.00') # Other countries
        }
        
        # Delivery time estimates by country (in days)
        self.delivery_times = {
            'SA': {'min': 10, 'max': 20},
            'AE': {'min': 8, 'max': 15},
            'KW': {'min': 12, 'max': 22},
            'QA': {'min': 10, 'max': 18},
            'BH': {'min': 9, 'max': 16},
            'OM': {'min': 12, 'max': 20},
            'EG': {'min': 15, 'max': 25},
            'JO': {'min': 15, 'max': 25},
            'LB': {'min': 18, 'max': 30},
            'OTHER': {'min': 20, 'max': 35}
        }
    
    def calculate_complete_pricing(
        self,
        base_price: float,
        country_code: str,
        product_title: str,
        category: Optional[ProductCategory] = None,
        custom_shipping_cost: Optional[float] = None,
        profit_margin: Optional[float] = None,
        free_shipping: bool = False
    ) -> Dict[str, Any]:
        """
        Calculate complete pricing breakdown for a product.
        
        Args:
            base_price: Product base price from AliExpress (USD)
            country_code: Destination country code (SA, AE, etc.)
            product_title: Product title for category detection
            category: Product category (optional, will auto-detect if not provided)
            custom_shipping_cost: Custom shipping cost (optional)
            profit_margin: Custom profit margin percentage (optional)
            free_shipping: Whether shipping is free from supplier
            
        Returns:
            Complete pricing breakdown dictionary
        """
        try:
            # Convert to Decimal for precision
            base_price = Decimal(str(base_price))
            
            # Determine product category
            if category is None:
                category = self.customs_calculator.categorize_product(product_title)
            
            # Get shipping cost
            if free_shipping:
                shipping_cost = Decimal('0.00')
            elif custom_shipping_cost is not None:
                shipping_cost = Decimal(str(custom_shipping_cost))
            else:
                shipping_cost = self.shipping_costs.get(
                    country_code.upper(),
                    self.shipping_costs['OTHER']
                )
            
            # Calculate customs and taxes
            tax_calculation = self.customs_calculator.calculate_gcc_taxes(
                country_code.upper(),
                float(base_price),
                float(shipping_cost),
                category
            )
            
            # Get profit margin
            margin = Decimal(str(profit_margin)) if profit_margin is not None else self.default_profit_margin
            
            # Calculate costs before profit
            total_cost = (
                base_price +
                shipping_cost +
                tax_calculation.customs_duty_amount +
                tax_calculation.vat_amount
            )
            
            # Calculate profit amount
            profit_amount = total_cost * (margin / Decimal('100'))
            
            # Calculate final price
            final_price = total_cost + profit_amount
            
            # Round all values
            base_price = base_price.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
            shipping_cost = shipping_cost.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
            total_cost = total_cost.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
            profit_amount = profit_amount.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
            final_price = final_price.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
            
            # Get delivery time
            delivery_time = self.delivery_times.get(
                country_code.upper(),
                self.delivery_times['OTHER']
            )
            
            # Build pricing breakdown
            pricing = {
                # Base information
                'country_code': country_code.upper(),
                'currency': 'USD',
                'category': category.value,
                
                # Price components (visible to customer)
                'base_price': float(base_price),
                'shipping_cost': float(shipping_cost),
                'customs_duty': float(tax_calculation.customs_duty_amount),
                'vat': float(tax_calculation.vat_amount),
                'total_taxes': float(tax_calculation.total_taxes),
                
                # Final pricing
                'subtotal': float(base_price + shipping_cost),
                'total_cost_before_profit': float(total_cost),
                'final_price': float(final_price),
                
                # Hidden from customer (internal use only)
                'profit_margin_percentage': float(margin),
                'profit_amount': float(profit_amount),
                
                # Tax rates (for transparency)
                'customs_duty_rate': float(tax_calculation.customs_duty_rate * 100),
                'vat_rate': float(tax_calculation.vat_rate * 100),
                
                # Shipping information
                'free_shipping': free_shipping,
                'delivery_time_min': delivery_time['min'],
                'delivery_time_max': delivery_time['max'],
                'delivery_estimate': f"{delivery_time['min']}-{delivery_time['max']} days",
                
                # Customer-facing breakdown
                'customer_breakdown': {
                    'product_price': float(base_price),
                    'shipping': float(shipping_cost),
                    'taxes_and_duties': float(tax_calculation.total_taxes),
                    'total': float(final_price)
                },
                
                # Detailed breakdown (for admin)
                'detailed_breakdown': {
                    'base_price': float(base_price),
                    'shipping_cost': float(shipping_cost),
                    'customs_duty': float(tax_calculation.customs_duty_amount),
                    'vat': float(tax_calculation.vat_amount),
                    'subtotal_with_taxes': float(total_cost),
                    'profit_margin': f"{float(margin)}%",
                    'profit_amount': float(profit_amount),
                    'final_price': float(final_price)
                }
            }
            
            return pricing
            
        except Exception as e:
            logger.error(f"Error calculating pricing: {e}")
            raise
    
    def calculate_bulk_pricing(
        self,
        products: list,
        country_code: str,
        profit_margin: Optional[float] = None
    ) -> list:
        """
        Calculate pricing for multiple products.
        
        Args:
            products: List of product dictionaries with 'base_price' and 'title'
            country_code: Destination country code
            profit_margin: Custom profit margin (optional)
            
        Returns:
            List of products with pricing information
        """
        results = []
        
        for product in products:
            try:
                base_price = product.get('sale_price') or product.get('price', 0)
                title = product.get('title', '')
                free_shipping = product.get('free_shipping', False)
                
                pricing = self.calculate_complete_pricing(
                    base_price=base_price,
                    country_code=country_code,
                    product_title=title,
                    profit_margin=profit_margin,
                    free_shipping=free_shipping
                )
                
                # Add pricing to product
                product_with_pricing = {
                    **product,
                    'pricing': pricing,
                    'final_price': pricing['final_price'],
                    'display_price': pricing['final_price'],
                    'shipping_info': {
                        'cost': pricing['shipping_cost'],
                        'free': pricing['free_shipping'],
                        'delivery_time': pricing['delivery_estimate']
                    },
                    'tax_info': {
                        'customs': pricing['customs_duty'],
                        'vat': pricing['vat'],
                        'total': pricing['total_taxes']
                    }
                }
                
                results.append(product_with_pricing)
                
            except Exception as e:
                logger.error(f"Error calculating pricing for product: {e}")
                # Add product without pricing
                results.append(product)
        
        return results
    
    def update_shipping_cost(self, country_code: str, cost: float):
        """
        Update shipping cost for a specific country.
        
        Args:
            country_code: Country code
            cost: New shipping cost in USD
        """
        self.shipping_costs[country_code.upper()] = Decimal(str(cost))
        logger.info(f"Updated shipping cost for {country_code}: ${cost}")
    
    def update_delivery_time(self, country_code: str, min_days: int, max_days: int):
        """
        Update delivery time estimate for a specific country.
        
        Args:
            country_code: Country code
            min_days: Minimum delivery days
            max_days: Maximum delivery days
        """
        self.delivery_times[country_code.upper()] = {
            'min': min_days,
            'max': max_days
        }
        logger.info(f"Updated delivery time for {country_code}: {min_days}-{max_days} days")
    
    def get_customer_price_display(self, pricing: Dict[str, Any]) -> Dict[str, Any]:
        """
        Get customer-facing price display (hides profit margin).
        
        Args:
            pricing: Complete pricing breakdown
            
        Returns:
            Customer-facing pricing information
        """
        return {
            'price': pricing['final_price'],
            'currency': pricing['currency'],
            'breakdown': {
                'product': pricing['base_price'],
                'shipping': pricing['shipping_cost'],
                'taxes': pricing['total_taxes']
            },
            'shipping': {
                'cost': pricing['shipping_cost'],
                'free': pricing['free_shipping'],
                'delivery': pricing['delivery_estimate']
            },
            'taxes': {
                'included': True,
                'amount': pricing['total_taxes'],
                'details': f"Includes customs duty and {pricing['vat_rate']}% VAT"
            }
        }
    
    def compare_prices_across_countries(
        self,
        base_price: float,
        product_title: str,
        countries: list = None
    ) -> Dict[str, Any]:
        """
        Compare final prices across different countries.
        
        Args:
            base_price: Product base price
            product_title: Product title
            countries: List of country codes (optional)
            
        Returns:
            Price comparison across countries
        """
        if countries is None:
            countries = ['SA', 'AE', 'KW', 'QA', 'BH', 'OM']
        
        comparison = {}
        
        for country in countries:
            try:
                pricing = self.calculate_complete_pricing(
                    base_price=base_price,
                    country_code=country,
                    product_title=product_title
                )
                
                comparison[country] = {
                    'final_price': pricing['final_price'],
                    'shipping': pricing['shipping_cost'],
                    'taxes': pricing['total_taxes'],
                    'delivery': pricing['delivery_estimate']
                }
            except Exception as e:
                logger.error(f"Error calculating price for {country}: {e}")
        
        return comparison


# Global pricing engine instance
_pricing_engine: Optional[PricingEngine] = None


def get_pricing_engine(profit_margin: float = 50.0) -> PricingEngine:
    """Get or create global pricing engine instance"""
    global _pricing_engine
    
    if _pricing_engine is None:
        _pricing_engine = PricingEngine(default_profit_margin=profit_margin)
    
    return _pricing_engine

