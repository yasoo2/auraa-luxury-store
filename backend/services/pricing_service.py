"""
Advanced Pricing Service
Handles complex pricing calculations including:
- Base product cost from supplier
- Shipping costs
- Profit margins (200%)
- Country-specific taxes
- Dynamic shipping fees based on country
"""

import logging
from typing import Dict, Optional
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

# Country-specific configurations
COUNTRY_CONFIGS = {
    "SA": {  # Saudi Arabia
        "tax_rate": 0.15,  # 15% VAT
        "shipping_base": 25.0,  # SAR
        "currency": "SAR"
    },
    "AE": {  # UAE
        "tax_rate": 0.05,  # 5% VAT
        "shipping_base": 20.0,  # AED
        "currency": "AED"
    },
    "KW": {  # Kuwait
        "tax_rate": 0.00,  # No VAT
        "shipping_base": 5.0,  # KWD
        "currency": "KWD"
    },
    "QA": {  # Qatar
        "tax_rate": 0.00,  # No VAT
        "shipping_base": 20.0,  # QAR
        "currency": "QAR"
    },
    "BH": {  # Bahrain
        "tax_rate": 0.05,  # 5% VAT
        "shipping_base": 3.0,  # BHD
        "currency": "BHD"
    },
    "OM": {  # Oman
        "tax_rate": 0.05,  # 5% VAT
        "shipping_base": 4.0,  # OMR
        "currency": "OMR"
    },
    # Everywhere else. Was 15% — the Saudi rate — applied to every country on
    # earth. A Saudi seller's exports are zero-rated, and what a foreign buyer
    # owes is import duty at their own border: theirs to pay, and ours to state
    # rather than quietly add.
    "default": {
        "tax_rate": 0.0,
        "shipping_base": 25.0,
        "currency": "USD",
        "import_duty_may_apply": True,
    }
}

# Exchange rates to SAR (Saudi Riyal base)
EXCHANGE_RATES = {
    "SAR": 1.0,
    "AED": 1.02,  # 1 AED ≈ 1.02 SAR
    "KWD": 12.17,  # 1 KWD ≈ 12.17 SAR
    "QAR": 1.03,  # 1 QAR ≈ 1.03 SAR
    "BHD": 9.95,  # 1 BHD ≈ 9.95 SAR
    "OMR": 9.75,  # 1 OMR ≈ 9.75 SAR
    "USD": 3.75,  # 1 USD ≈ 3.75 SAR
    "EUR": 4.10,  # 1 EUR ≈ 4.10 SAR
}

# The store's starting numbers — what applies before the owner ever touches
# the pricing screen, and what «إعادة الضبط» returns to.
DEFAULT_PROFIT_MARGIN_PERCENT = 200.0
DEFAULT_MINIMUM_PROFIT_SAR = 10.0


async def load_pricing_settings(db) -> Dict:
    """The margin the owner set in الإدارة, or the store's defaults."""
    doc = await db.settings.find_one({"key": "pricing"}) or {}
    return {
        "profit_margin_percent": float(doc.get("profit_margin_percent", DEFAULT_PROFIT_MARGIN_PERCENT)),
        "minimum_profit_sar": float(doc.get("minimum_profit_sar", DEFAULT_MINIMUM_PROFIT_SAR)),
    }


class PricingService:
    """
    Advanced pricing calculator for products
    """

    def __init__(self):
        self.profit_margin = DEFAULT_PROFIT_MARGIN_PERCENT / 100.0
        self.minimum_profit_sar = DEFAULT_MINIMUM_PROFIT_SAR

    def calculate_final_price(
        self,
        base_cost: float,
        shipping_cost: float = 0.0,
        country_code: str = "SA",
        additional_costs: float = 0.0,
        weight_kg: float = 0.5,
        original_currency: str = "USD",
        profit_margin_percent: float = None,
        minimum_profit_sar: float = None,
    ) -> Dict:
        """
        Calculate final product price with all factors
        
        Args:
            base_cost: Original product cost from supplier
            shipping_cost: Shipping cost from supplier
            country_code: Customer's country (for tax calculation)
            additional_costs: Any additional handling/processing costs
            weight_kg: Product weight (affects shipping)
            original_currency: Currency of base_cost
            
        Returns:
            Dict with price breakdown
        """
        # The margin the caller carries (from the owner's saved settings)
        # wins; the constructor numbers are only the store's starting point.
        margin = (self.profit_margin if profit_margin_percent is None
                  else profit_margin_percent / 100.0)
        min_profit = (self.minimum_profit_sar if minimum_profit_sar is None
                      else float(minimum_profit_sar))

        # No try/except: a product whose price cannot be computed must fail
        # loudly and not be priced at all. This used to swallow any error and
        # answer with `base_cost * 4` — an invented price on a real shop.
        # Convert base cost to SAR if needed
        if original_currency != "SAR":
            conversion_rate = EXCHANGE_RATES.get(original_currency, EXCHANGE_RATES["USD"])
            base_cost_sar = base_cost * conversion_rate
            shipping_cost_sar = shipping_cost * conversion_rate
        else:
            base_cost_sar = base_cost
            shipping_cost_sar = shipping_cost

        # Get country configuration
        country_config = COUNTRY_CONFIGS.get(country_code, COUNTRY_CONFIGS["default"])

        # Calculate country-specific shipping
        local_shipping = self._calculate_local_shipping(weight_kg, country_config)

        # Calculate total cost before profit
        total_cost = base_cost_sar + shipping_cost_sar + additional_costs + local_shipping

        # Apply profit margin
        price_with_profit = total_cost * (1 + margin)

        # Ensure minimum profit
        minimum_price = total_cost + min_profit
        if price_with_profit < minimum_price:
            price_with_profit = minimum_price
            
        # Calculate tax
        tax_amount = price_with_profit * country_config["tax_rate"]

        # Final price (rounded)
        final_price = round(price_with_profit + tax_amount, 2)

        # Convert to local currency if needed
        target_currency = country_config["currency"]
        if target_currency != "SAR":
            final_price_local = final_price / EXCHANGE_RATES.get(target_currency, 1.0)
            final_price_local = round(final_price_local, 2)
        else:
            final_price_local = final_price

        # Calculate actual profit
        actual_profit = price_with_profit - total_cost
        profit_percentage = (actual_profit / total_cost) * 100 if total_cost > 0 else 0

        return {
            "final_price_sar": final_price,
            "final_price_local": final_price_local,
            "local_currency": target_currency,
            "breakdown": {
                "base_cost_sar": round(base_cost_sar, 2),
                "supplier_shipping_sar": round(shipping_cost_sar, 2),
                "local_shipping_sar": round(local_shipping, 2),
                "additional_costs_sar": round(additional_costs, 2),
                "total_cost_sar": round(total_cost, 2),
                "profit_amount_sar": round(actual_profit, 2),
                "profit_percentage": round(profit_percentage, 2),
                "profit_margin_percent_applied": round(margin * 100, 2),
                "tax_amount_sar": round(tax_amount, 2),
                "tax_rate": country_config["tax_rate"] * 100,
            },
            "original_currency": original_currency,
            "country_code": country_code,
            "calculated_at": datetime.now(timezone.utc).isoformat()
        }
    
    def _calculate_local_shipping(self, weight_kg: float, country_config: Dict) -> float:
        """
        Calculate shipping cost based on weight and country
        
        Args:
            weight_kg: Product weight in kilograms
            country_config: Country configuration dict
            
        Returns:
            Shipping cost in SAR
        """
        base_shipping = country_config["shipping_base"]
        
        # Add weight-based charges (5 SAR per kg above 0.5kg)
        if weight_kg > 0.5:
            extra_weight = weight_kg - 0.5
            weight_charge = extra_weight * 5.0
        else:
            weight_charge = 0.0
        
        # Convert to SAR if needed
        currency = country_config["currency"]
        if currency != "SAR":
            base_shipping_sar = base_shipping * EXCHANGE_RATES.get(currency, 1.0)
        else:
            base_shipping_sar = base_shipping
        
        total_shipping = base_shipping_sar + weight_charge
        
        return round(total_shipping, 2)
    
    def calculate_bulk_prices(
        self,
        products: list,
        country_code: str = "SA"
    ) -> list:
        """
        Calculate prices for multiple products
        
        Args:
            products: List of product dicts with 'price' and optional 'shipping_cost'
            country_code: Target country
            
        Returns:
            List of products with updated pricing
        """
        updated_products = []
        
        for product in products:
            try:
                base_cost = float(product.get('price', 0) or product.get('sellPrice', 0))
                shipping_cost = float(product.get('shipping_cost', 0) or 0)
                weight = float(product.get('weight', 0.5))
                original_currency = product.get('currency', 'USD')
                
                pricing = self.calculate_final_price(
                    base_cost=base_cost,
                    shipping_cost=shipping_cost,
                    country_code=country_code,
                    weight_kg=weight,
                    original_currency=original_currency
                )
                
                # Add pricing to product
                product['calculated_price_sar'] = pricing['final_price_sar']
                product['calculated_price_local'] = pricing['final_price_local']
                product['price_currency'] = pricing['local_currency']
                product['price_breakdown'] = pricing['breakdown']
                product['pricing_calculated_at'] = pricing['calculated_at']
                
                # Update the main price field
                product['price'] = pricing['final_price_sar']
                product['original_price'] = base_cost  # Keep original for reference
                
                updated_products.append(product)
                
            except Exception as e:
                logger.error(f"Error pricing product {product.get('id', 'unknown')}: {e}")
                # Keep original product if pricing fails
                updated_products.append(product)
        
        return updated_products


# Global instance
pricing_service = PricingService()
