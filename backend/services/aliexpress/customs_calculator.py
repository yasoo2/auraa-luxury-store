"""
Customs and Tax Calculator for GCC Countries
Calculates VAT, customs duties, and total landed costs.
"""

from decimal import Decimal, ROUND_HALF_UP
from typing import Dict, Optional
from .models import ProductCategory, TaxCalculation


class CustomsCalculator:
    """
    Calculate customs duties and taxes for GCC countries.
    Implements Saudi Arabia regulations as primary focus.
    """
    
    def __init__(self):
        # Saudi Arabia VAT rate (15% as of 2023)
        self.saudi_vat_rate = Decimal('0.15')
        
        # Customs duty rates by product category for Saudi Arabia
        self.saudi_customs_rates = {
            ProductCategory.ELECTRONICS: Decimal('0.05'),  # 5%
            ProductCategory.CLOTHING: Decimal('0.05'),
            ProductCategory.ACCESSORIES: Decimal('0.05'),
            ProductCategory.HOME_GOODS: Decimal('0.05'),
            ProductCategory.TOYS: Decimal('0.00'),  # Duty-free
            ProductCategory.BEAUTY: Decimal('0.05'),
            ProductCategory.SPORTS: Decimal('0.05'),
            ProductCategory.OTHER: Decimal('0.05')
        }
        
        # VAT rates for other GCC countries
        self.gcc_vat_rates = {
            'SA': Decimal('0.15'),  # Saudi Arabia
            'AE': Decimal('0.05'),  # UAE
            'KW': Decimal('0.00'),  # Kuwait (no VAT yet)
            'QA': Decimal('0.00'),  # Qatar (no VAT yet)
            'BH': Decimal('0.10'),  # Bahrain
            'OM': Decimal('0.05')   # Oman
        }
        
        # Customs duty exemption threshold (in USD)
        self.duty_exemption_threshold = Decimal('100.00')
    
    def categorize_product(self, product_title: str, category_id: Optional[str] = None) -> ProductCategory:
        """
        Categorize product based on title and category ID.
        
        Args:
            product_title: Product title text
            category_id: Optional AliExpress category ID
            
        Returns:
            ProductCategory enum value
        """
        title_lower = product_title.lower()
        
        # Keyword-based categorization
        if any(word in title_lower for word in ['phone', 'laptop', 'tablet', 'electronic']):
            return ProductCategory.ELECTRONICS
        elif any(word in title_lower for word in ['shirt', 'dress', 'pants', 'clothing']):
            return ProductCategory.CLOTHING
        elif any(word in title_lower for word in ['watch', 'jewelry', 'bag', 'wallet']):
            return ProductCategory.ACCESSORIES
        elif any(word in title_lower for word in ['kitchen', 'home', 'furniture', 'decor']):
            return ProductCategory.HOME_GOODS
        elif any(word in title_lower for word in ['toy', 'game', 'puzzle']):
            return ProductCategory.TOYS
        elif any(word in title_lower for word in ['cosmetic', 'makeup', 'skincare', 'beauty']):
            return ProductCategory.BEAUTY
        elif any(word in title_lower for word in ['sport', 'fitness', 'exercise', 'outdoor']):
            return ProductCategory.SPORTS
        else:
            return ProductCategory.OTHER
    
    def calculate_saudi_customs_duty(
        self,
        product_value: Decimal,
        shipping_cost: Decimal,
        category: ProductCategory
    ) -> Decimal:
        """
        Calculate customs duty for Saudi Arabia import.
        
        Args:
            product_value: Product value in USD
            shipping_cost: Shipping cost in USD
            category: Product category
            
        Returns:
            Customs duty amount in USD
        """
        # Check exemption threshold
        if product_value < self.duty_exemption_threshold:
            return Decimal('0.00')
        
        # Get duty rate for category
        duty_rate = self.saudi_customs_rates.get(category, Decimal('0.05'))
        
        # Duty calculated on (product value + shipping + insurance)
        # Insurance typically estimated as 1% of product value
        insurance = product_value * Decimal('0.01')
        customs_value = product_value + shipping_cost + insurance
        
        duty_amount = customs_value * duty_rate
        
        # Round to 2 decimal places
        return duty_amount.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
    
    def calculate_saudi_vat(
        self,
        product_value: Decimal,
        shipping_cost: Decimal,
        customs_duty: Decimal
    ) -> Decimal:
        """
        Calculate VAT for Saudi Arabia import.
        VAT is calculated on product value + shipping + customs duty.
        
        Args:
            product_value: Product value in USD
            shipping_cost: Shipping cost in USD
            customs_duty: Customs duty amount in USD
            
        Returns:
            VAT amount in USD
        """
        # VAT base includes product, shipping, and duties
        vat_base = product_value + shipping_cost + customs_duty
        
        vat_amount = vat_base * self.saudi_vat_rate
        
        return vat_amount.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
    
    def calculate_gcc_taxes(
        self,
        country_code: str,
        product_value: Decimal,
        shipping_cost: Decimal,
        category: ProductCategory
    ) -> TaxCalculation:
        """
        Calculate complete tax breakdown for GCC country.
        
        Args:
            country_code: GCC country code
            product_value: Product value in USD
            shipping_cost: Shipping cost in USD
            category: Product category
            
        Returns:
            Complete TaxCalculation with breakdown
        """
        # Convert to Decimal for precision
        product_value = Decimal(str(product_value))
        shipping_cost = Decimal(str(shipping_cost))
        
        # Calculate customs duty (Saudi Arabia logic)
        if country_code == 'SA':
            customs_duty = self.calculate_saudi_customs_duty(
                product_value,
                shipping_cost,
                category
            )
            customs_rate = self.saudi_customs_rates.get(category, Decimal('0.05'))
        else:
            # Simplified calculation for other GCC countries
            customs_duty = Decimal('0.00')  # Most GCC countries minimal duty
            customs_rate = Decimal('0.00')
        
        # Calculate VAT
        vat_rate = self.gcc_vat_rates.get(country_code, Decimal('0.00'))
        
        if country_code == 'SA':
            vat_amount = self.calculate_saudi_vat(
                product_value,
                shipping_cost,
                customs_duty
            )
        else:
            # VAT on product + shipping for other GCC countries
            vat_base = product_value + shipping_cost
            vat_amount = (vat_base * vat_rate).quantize(
                Decimal('0.01'),
                rounding=ROUND_HALF_UP
            )
        
        # Calculate totals
        total_taxes = customs_duty + vat_amount
        total_landed_cost = product_value + shipping_cost + total_taxes
        
        # Create detailed breakdown
        breakdown = {
            'product_value': product_value,
            'shipping_cost': shipping_cost,
            'customs_duty': customs_duty,
            'vat': vat_amount,
            'total_taxes': total_taxes,
            'total_cost': total_landed_cost
        }
        
        return TaxCalculation(
            product_value=product_value,
            shipping_cost=shipping_cost,
            customs_duty_rate=customs_rate,
            customs_duty_amount=customs_duty,
            vat_rate=vat_rate,
            vat_amount=vat_amount,
            total_taxes=total_taxes,
            total_landed_cost=total_landed_cost,
            breakdown=breakdown
        )
