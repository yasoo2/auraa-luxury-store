from pydantic import BaseModel, Field, HttpUrl
from typing import List, Optional, Literal, Dict
from datetime import datetime

SourceType = Literal["manual", "aliexpress", "amazon"]

class PriceInfo(BaseModel):
    amount: float
    currency: str = "USD"

class SourceMeta(BaseModel):
    type: SourceType = "manual"
    external_id: Optional[str] = None
    external_url: Optional[HttpUrl] = None
    last_sync: Optional[datetime] = None
    last_sync_status: Optional[str] = None  # "ok" or "error:..."

class ProductIn(BaseModel):
    title: str
    description: Optional[str] = None
    images: List[str] = []
    price: PriceInfo
    stock: int = 0
    brand: Optional[str] = None
    attributes: Dict = {}
    tags: List[str] = []
    status: Literal["active", "draft"] = "active"
    source: SourceMeta = Field(default_factory=SourceMeta)

class ProductOut(ProductIn):
    id: str
    created_at: datetime
    updated_at: datetime
