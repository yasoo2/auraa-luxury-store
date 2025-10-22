from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

class ProductIn(BaseModel):
    """Product input schema"""
    title: str
    name: Optional[str] = None
    name_ar: Optional[str] = None
    sku: str
    price: float
    currency: str = "SAR"
    images: List[str] = []
    description: Optional[str] = None
    description_ar: Optional[str] = None
    stock: int = 0
    in_stock: bool = True
    category: Optional[str] = None
    weight_kg: Optional[float] = None
    
class ProductOut(BaseModel):
    """Product output schema"""
    id: str
    title: str
    name: Optional[str] = None
    name_ar: Optional[str] = None
    sku: str
    price: float
    currency: str = "SAR"
    images: List[str] = []
    description: Optional[str] = None
    description_ar: Optional[str] = None
    stock: int = 0
    in_stock: bool = True
    category: Optional[str] = None
    weight_kg: Optional[float] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    
    class Config:
        from_attributes = True
