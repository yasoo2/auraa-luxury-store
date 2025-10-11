"""
AliExpress Data Models
Pydantic models for AliExpress products, shipping, and tax calculations.
"""

from typing import List, Optional, Dict
from datetime import datetime
from pydantic import BaseModel, Field, HttpUrl
from enum import Enum
from decimal import Decimal


class ShippingMethod(BaseModel):
    """Shipping method details for a specific country."""
    service_name: str
    shipping_cost: float
    delivery_time_min: int
    delivery_time_max: int
    tracking_available: bool = True
    currency: str = "USD"


class ProductVariant(BaseModel):
    """Product variant/SKU information."""
    sku_id: str
    sku_attr: str
    sku_price: float
    sku_stock: int
    sku_available: bool


class CountryAvailability(BaseModel):
    """Product availability for specific country."""
    country_code: str
    available: bool
    shipping_methods: List[ShippingMethod] = []
    estimated_customs: Optional[float] = None
    estimated_vat: Optional[float] = None
    total_landed_cost: Optional[float] = None


class AliExpressProduct(BaseModel):
    """Complete product model with country-specific data."""
    product_id: str
    title: str
    description: Optional[str] = None
    category_id: Optional[str] = None
    images: List[str] = []
    original_price: float
    sale_price: float
    currency: str = "USD"
    variants: List[ProductVariant] = []
    country_availability: Dict[str, CountryAvailability] = {}
    seller_id: Optional[str] = None
    rating: Optional[float] = None
    orders_count: Optional[int] = None
    last_synced: datetime = Field(default_factory=datetime.utcnow)
    sync_status: str = "active"


class ShippingSpeed(str, Enum):
    """Shipping speed categories."""
    ECONOMY = "economy"
    STANDARD = "standard"
    EXPRESS = "express"


class ShippingRecommendation(BaseModel):
    """Recommended shipping option with reasoning."""
    method: ShippingMethod
    speed_category: ShippingSpeed
    recommendation_score: float
    reasoning: str
    total_cost: float
    estimated_delivery: datetime


class ProductCategory(str, Enum):
    """Product categories with different customs duty rates."""
    ELECTRONICS = "electronics"
    CLOTHING = "clothing"
    ACCESSORIES = "accessories"
    HOME_GOODS = "home_goods"
    TOYS = "toys"
    BEAUTY = "beauty"
    SPORTS = "sports"
    OTHER = "other"


class TaxCalculation(BaseModel):
    """Complete tax and customs calculation breakdown."""
    product_value: Decimal
    shipping_cost: Decimal
    customs_duty_rate: Decimal
    customs_duty_amount: Decimal
    vat_rate: Decimal
    vat_amount: Decimal
    total_taxes: Decimal
    total_landed_cost: Decimal
    breakdown: Dict[str, Decimal]
