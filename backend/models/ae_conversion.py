"""
AliExpress S2S Conversion Tracking Model
"""
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime

class AEConversion(BaseModel):
    """AliExpress conversion tracking data model"""
    order_id: str = Field(..., description="AliExpress order ID")
    order_amount: float = Field(..., description="Order amount in USD")
    commission_fee: float = Field(..., description="Commission fee in USD")
    country: str = Field(..., description="2-letter country code")
    item_id: str = Field(..., description="AliExpress item/product ID")
    order_platform: str = Field(..., description="Order platform (mobile/web)")
    source: Optional[str] = Field(None, description="Traffic source identifier")
    click_id: Optional[str] = Field(None, description="Click tracking ID")
    raw: Optional[Dict[str, Any]] = Field(None, description="Raw query parameters")
    received_at: datetime = Field(default_factory=datetime.utcnow, description="Timestamp when received")
    
    class Config:
        json_schema_extra = {
            "example": {
                "order_id": "123456789",
                "order_amount": 59.90,
                "commission_fee": 5.20,
                "country": "SA",
                "item_id": "9876543210",
                "order_platform": "mobile",
                "source": "auraa_luxury",
                "click_id": "abc123xyz789"
            }
        }

class AEClickTracking(BaseModel):
    """Click tracking for AliExpress affiliate links"""
    click_id: str = Field(..., description="Unique click identifier")
    product_id: Optional[str] = Field(None, description="Product ID")
    affiliate_url: str = Field(..., description="Original AliExpress affiliate URL")
    user_agent: Optional[str] = Field(None, description="User agent string")
    ip_address: Optional[str] = Field(None, description="User IP address")
    country: Optional[str] = Field(None, description="Detected country")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Click timestamp")
    converted: bool = Field(False, description="Whether this click resulted in a conversion")
    conversion_id: Optional[str] = Field(None, description="Related conversion order_id")
