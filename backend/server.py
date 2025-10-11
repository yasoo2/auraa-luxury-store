from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, Query, File, UploadFile, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
import uuid
import shutil
import aiofiles
from PIL import Image
import io
from datetime import datetime, timezone, timedelta
import jwt
from passlib.context import CryptContext
from enum import Enum

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI(title="لورا لاكشري API", version="1.0.0")
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBearer()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'auraa-luxury-secret-key-2024')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Enums
class OrderStatus(str, Enum):
    pending = "pending"
    processing = "processing"
    shipped = "shipped"
    delivered = "delivered"
    cancelled = "cancelled"

class CategoryType(str, Enum):
    earrings = "earrings"
    necklaces = "necklaces"
    bracelets = "bracelets"
    rings = "rings"
    watches = "watches"
    sets = "sets"

# Models
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    first_name: str
    last_name: str
    phone: str
    address: Optional[Dict[str, Any]] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_admin: bool = False

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    first_name: str
    last_name: str
    phone: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Product(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    price: float
    original_price: Optional[float] = None
    discount_percentage: Optional[int] = None
    category: CategoryType
    images: List[str]
    in_stock: bool = True
    stock_quantity: int = 100
    rating: float = 0.0
    reviews_count: int = 0
    external_url: Optional[str] = None  # AliExpress/Amazon link
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ProductCreate(BaseModel):
    name: str
    description: str
    price: float
    original_price: Optional[float] = None
    discount_percentage: Optional[int] = None
    category: CategoryType
    images: List[str]
    stock_quantity: int = 100
    external_url: Optional[str] = None

class CartItem(BaseModel):
    product_id: str
    quantity: int
    price: float

class Cart(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    items: List[CartItem] = []
    total_amount: float = 0.0
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Order(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    items: List[CartItem]
    total_amount: float
    shipping_address: Dict[str, Any]
    payment_method: str
    status: OrderStatus = OrderStatus.pending
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    tracking_number: Optional[str] = None

class Review(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    product_id: str
    rating: int  # 1-5
    comment: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Wishlist(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    product_ids: List[str] = []
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# New: Integration settings model
class IntegrationSettings(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: str = "integrations"
    # AliExpress (Dropshipping OAuth)
    aliexpress_app_key: Optional[str] = None
    aliexpress_app_secret: Optional[str] = None
    aliexpress_refresh_token: Optional[str] = None
    # Amazon PA-API groundwork
    amazon_access_key: Optional[str] = None
    amazon_secret_key: Optional[str] = None
    amazon_partner_tag: Optional[str] = None
    amazon_region: Optional[str] = None
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Helper functions
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user = await db.users.find_one({"id": user_id})
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return User(**user)

async def get_admin_user(current_user: User = Depends(get_current_user)):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

# Routes
@api_router.get("/")
async def root():
    return {"message": "Welcome to لورا لاكشري API"}

# Auth routes
@api_router.post("/auth/register")
async def register(user_data: UserCreate):
    # Check if user exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    hashed_password = get_password_hash(user_data.password)
    user_dict = user_data.dict()
    del user_dict["password"]
    user_obj = User(**user_dict)
    
    # Store user with hashed password
    user_doc = user_obj.dict()
    user_doc["password"] = hashed_password
    await db.users.insert_one(user_doc)
    
    # Create access token
    access_token = create_access_token(data={"sub": user_obj.id})
    return {"access_token": access_token, "token_type": "bearer", "user": user_obj}

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email})
    if not user or not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    access_token = create_access_token(data={"sub": user["id"]})
    user_obj = User(**{k: v for k, v in user.items() if k != "password"})
    return {"access_token": access_token, "token_type": "bearer", "user": user_obj}

@api_router.get("/auth/me", response_model=User)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    return current_user

# Product routes
@api_router.get("/products", response_model=List[Product])
async def get_products(
    category: Optional[CategoryType] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 20
):
    query = {}
    
    if category:
        query["category"] = category
    if min_price is not None:
        query["price"] = {"$gte": min_price}
    if max_price is not None:
        if "price" in query:
            query["price"]["$lte"] = max_price
        else:
            query["price"] = {"$lte": max_price}
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}}
        ]
    
    products = await db.products.find(query).skip(skip).limit(limit).to_list(length=None)
    
    # Filter out corrupted products that don't match the schema
    valid_products = []
    for product in products:
        try:
            # Try to create Product instance to validate
            valid_product = Product(**product)
            valid_products.append(valid_product)
        except Exception as e:
            # Log the corrupted product for debugging
            logger.warning(f"Skipping corrupted product: {product.get('_id', 'unknown')} - Error: {str(e)}")
            continue
    
    return valid_products

@api_router.get("/products/{product_id}", response_model=Product)
async def get_product(product_id: str):
    product = await db.products.find_one({"id": product_id})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return Product(**product)

@api_router.post("/products", response_model=Product)
async def create_product(product_data: ProductCreate, admin: User = Depends(get_admin_user)):
    product = Product(**product_data.dict())
    await db.products.insert_one(product.dict())
    return product

@api_router.put("/products/{product_id}", response_model=Product)
async def update_product(
    product_id: str,
    product_data: ProductCreate,
    admin: User = Depends(get_admin_user)
):
    result = await db.products.update_one(
        {"id": product_id},
        {"$set": product_data.dict(exclude_unset=True)}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    
    product = await db.products.find_one({"id": product_id})
    return Product(**product)

@api_router.delete("/products/{product_id}")
async def delete_product(product_id: str, admin: User = Depends(get_admin_user)):
    result = await db.products.delete_one({"id": product_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"message": "Product deleted successfully"}

# Cart routes
@api_router.get("/cart", response_model=Cart)
async def get_cart(current_user: User = Depends(get_current_user)):
    cart = await db.carts.find_one({"user_id": current_user.id})
    if not cart:
        cart = Cart(user_id=current_user.id)
        await db.carts.insert_one(cart.dict())
        return cart
    return Cart(**cart)

@api_router.post("/cart/add")
async def add_to_cart(
    product_id: str,
    quantity: int = 1,
    current_user: User = Depends(get_current_user)
):
    # Get product
    product = await db.products.find_one({"id": product_id})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Get or create cart
    cart = await db.carts.find_one({"user_id": current_user.id})
    if not cart:
        cart = Cart(user_id=current_user.id).dict()
        await db.carts.insert_one(cart)
    
    # Add item to cart
    cart_items = cart.get("items", [])
    existing_item = next((item for item in cart_items if item["product_id"] == product_id), None)
    
    if existing_item:
        existing_item["quantity"] += quantity
    else:
        cart_items.append({
            "product_id": product_id,
            "quantity": quantity,
            "price": product["price"]
        })
    
    # Calculate total
    total = sum(item["quantity"] * item["price"] for item in cart_items)
    
    await db.carts.update_one(
        {"user_id": current_user.id},
        {
            "$set": {
                "items": cart_items,
                "total_amount": total,
                "updated_at": datetime.now(timezone.utc)
            }
        }
    )
    
    return {"message": "Item added to cart"}

@api_router.delete("/cart/remove/{product_id}")
async def remove_from_cart(product_id: str, current_user: User = Depends(get_current_user)):
    cart = await db.carts.find_one({"user_id": current_user.id})
    if not cart:
        raise HTTPException(status_code=404, detail="Cart not found")
    
    cart_items = [item for item in cart.get("items", []) if item["product_id"] != product_id]
    total = sum(item["quantity"] * item["price"] for item in cart_items)
    
    await db.carts.update_one(
        {"user_id": current_user.id},
        {
            "$set": {
                "items": cart_items,
                "total_amount": total,
                "updated_at": datetime.now(timezone.utc)
            }
        }
    )
    
    return {"message": "Item removed from cart"}

class OrderCreate(BaseModel):
    shipping_address: Dict[str, Any]
    payment_method: str

# Orders routes
@api_router.post("/orders")
async def create_order(
    order_data: OrderCreate,
    current_user: User = Depends(get_current_user)
):
    # Get cart
    cart = await db.carts.find_one({"user_id": current_user.id})
    if not cart or not cart.get("items"):
        raise HTTPException(status_code=400, detail="Cart is empty")
    
    # Create order
    order = Order(
        user_id=current_user.id,
        items=cart["items"],
        total_amount=cart["total_amount"],
        shipping_address=order_data.shipping_address,
        payment_method=order_data.payment_method
    )
    
    await db.orders.insert_one(order.dict())
    
    # Clear cart
    await db.carts.update_one(
        {"user_id": current_user.id},
        {"$set": {"items": [], "total_amount": 0.0}}
    )
    
    return order

@api_router.get("/orders", response_model=List[Order])
async def get_orders(current_user: User = Depends(get_current_user)):
    orders = await db.orders.find({"user_id": current_user.id}).sort("created_at", -1).to_list(length=None)
    return [Order(**order) for order in orders]

# External Products (Simulated API integration)
@api_router.get("/external-products")
async def get_external_products(
    store: Optional[str] = None,
    category: Optional[str] = None,
    limit: int = 20
):
    """Simulated external products from AliExpress and Amazon"""
    mock_products = [
        {
            "id": "ali_001",
            "name": "Gold Plated Pearl Earrings Set", 
            "name_ar": "طقم أقراط لؤلؤية مطلية بالذهب",
            "price": 25.99,
            "original_price": 45.99,
            "rating": 4.7,
            "reviews": 1523,
            "source": "aliexpress",
            "category": "earrings",
            "image": "https://images.unsplash.com/photo-1635767798638-3e25273a8236?w=400",
            "external_url": "https://aliexpress.com/item/example",
            "free_shipping": True,
            "delivery_time": "7-15 days"
        },
        {
            "id": "amazon_001",
            "name": "Sterling Silver Chain Necklace",
            "name_ar": "قلادة فضية استرلينية أنيقة", 
            "price": 89.99,
            "original_price": 129.99,
            "rating": 4.8,
            "reviews": 892,
            "source": "amazon",
            "category": "necklaces",
            "image": "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400",
            "external_url": "https://amazon.com/dp/example",
            "free_shipping": True,
            "delivery_time": "2-5 days"
        }
    ]
    
    # Filter by store if specified
    if store:
        mock_products = [p for p in mock_products if p["source"] == store]
    
    # Filter by category if specified  
    if category:
        mock_products = [p for p in mock_products if p["category"] == category]
    
    return mock_products[:limit]

# Categories route
@api_router.get("/categories")
async def get_categories():
    return [
        {"id": "earrings", "name": "أقراط", "name_en": "Earrings", "icon": "💎"},
        {"id": "necklaces", "name": "قلادات", "name_en": "Necklaces", "icon": "📿"},
        {"id": "bracelets", "name": "أساور", "name_en": "Bracelets", "icon": "⭕"},
        {"id": "rings", "name": "خواتم", "name_en": "Rings", "icon": "💍"},
        {"id": "watches", "name": "ساعات", "name_en": "Watches", "icon": "⌚"},
        {"id": "sets", "name": "أطقم", "name_en": "Sets", "icon": "✨"}
    ]

# Admin: Integration settings routes (no external calls yet)

def _mask_secret(value: Optional[str]) -> Optional[str]:
    if not value:
        return None
    if len(value) <= 6:
        return "***"
    return value[:3] + "***" + value[-3:]

@api_router.get("/admin/integrations", response_model=IntegrationSettings)
async def get_integration_settings(current_user: User = Depends(get_current_user)):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    doc = await db.settings.find_one({"type": "integrations"})
    if not doc:
        settings = IntegrationSettings()
        await db.settings.insert_one(settings.dict())
        return settings
    # Mask secrets in response
    masked = {**doc}
    masked["aliexpress_app_secret"] = _mask_secret(doc.get("aliexpress_app_secret"))
    masked["aliexpress_refresh_token"] = _mask_secret(doc.get("aliexpress_refresh_token"))
    masked["amazon_secret_key"] = _mask_secret(doc.get("amazon_secret_key"))
    return IntegrationSettings(**masked)

class IntegrationSettingsUpdate(BaseModel):
    aliexpress_app_key: Optional[str] = None
    aliexpress_app_secret: Optional[str] = None
    aliexpress_refresh_token: Optional[str] = None
    amazon_access_key: Optional[str] = None
    amazon_secret_key: Optional[str] = None
    amazon_partner_tag: Optional[str] = None
    amazon_region: Optional[str] = None

@api_router.post("/admin/integrations", response_model=IntegrationSettings)
async def upsert_integration_settings(payload: IntegrationSettingsUpdate, current_user: User = Depends(get_current_user)):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    existing = await db.settings.find_one({"type": "integrations"})
    if not existing:
        settings = IntegrationSettings(**payload.dict(exclude_unset=True))
        await db.settings.insert_one(settings.dict())
        return settings
    updates = payload.dict(exclude_unset=True)
    updates["updated_at"] = datetime.now(timezone.utc)
    await db.settings.update_one({"id": existing["id"]}, {"$set": updates})
    updated = await db.settings.find_one({"id": existing["id"]})
    return IntegrationSettings(**updated)

# Initialize admin user and sample data
@api_router.post("/init-data")
async def initialize_sample_data():
    return {"message": "Disabled seeding in production"}

# Disabled legacy initializer kept for reference below
# @api_router.post("/init-data")
# async def initialize_sample_data():
    # Create admin user if doesn't exist
    admin_user = await db.users.find_one({"email": "admin@auraa.com"})
    if not admin_user:
        admin_data = {
            "email": "admin@auraa.com",
            "first_name": "Admin",
            "last_name": "لاكشري",
            "phone": "+966501234567",
            "password": get_password_hash("admin123"),
            "is_admin": True
        }
        admin_obj = User(**{k: v for k, v in admin_data.items() if k != "password"})
        admin_doc = admin_obj.dict()
        admin_doc["password"] = admin_data["password"]
        await db.users.insert_one(admin_doc)
    
    # Check if products already exist
    existing_products = await db.products.find_one({})
    if existing_products:
        return {"message": "Sample data already exists"}
    
    sample_products = [
        {
            "name": "قلادة ذهبية فاخرة",
            "description": "قلادة ذهبية أنيقة مع تصميم فريد، مثالية للمناسبات الخاصة",
            "price": 299.99,
            "original_price": 399.99,
            "discount_percentage": 25,
            "category": "necklaces",
            "images": [
                "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?crop=entropy&amp;cs=srgb&amp;fm=jpg&amp;ixid=M3w3NDQ2NDJ8MHwxfHNlYXJjaHwxfHxsdXh1cnklMjBqZXdlbHJ5fGVufDB8fHx8MTc1OTQxOTg4M3ww&amp;ixlib=rb-4.1.0&amp;q=85"
            ],
            "rating": 4.8,
            "reviews_count": 124
        },
        {
            "name": "أقراط لؤلؤية كلاسيكية",
            "description": "أقراط لؤلؤية رائعة بتصميم كلاسيكي خالد",
            "price": 149.99,
            "original_price": 199.99,
            "discount_percentage": 25,
            "category": "earrings",
            "images": [
                "https://images.unsplash.com/photo-1636619608432-77941d282b32?crop=entropy&amp;cs=srgb&amp;fm=jpg&amp;ixid=M3w3NDQ2Mzl8MHwxfHNlYXJjaHwxfHxsdXh1cnklMjBhY2Nlc3Nvcmllc3xlbnwwfHx8fDE3NTk0MTk4ODl8MA&amp;ixlib=rb-4.1.0&amp;q=85"
            ],
            "rating": 4.9,
            "reviews_count": 89
        },
        {
            "name": "خاتم ألماس أزرق فاخر",
            "description": "خاتم مرصع بحجر كريم أزرق مع إطار ذهبي",
            "price": 599.99,
            "original_price": 799.99,
            "discount_percentage": 25,
            "category": "rings",
            "images": [
                "https://images.unsplash.com/photo-1606623546924-a4f3ae5ea3e8?crop=entropy&amp;cs=srgb&amp;fm=jpg&amp;ixid=M3w3NDQ2NDJ8MHwxfHNlYXJjaHwzfHxsdXh1cnklMjBqZXdlbHJ5fGVufDB8fHx8MTc1OTQxOTg4M3ww&amp;ixlib=rb-4.1.0&amp;q=85"
            ],
            "rating": 5.0,
            "reviews_count": 67
        },
        {
            "name": "سوار ذهبي متعدد الطبقات",
            "description": "مجموعة أساور ذهبية أنيقة مع تصميمات متنوعة",
            "price": 249.99,
            "original_price": 329.99,
            "discount_percentage": 24,
            "category": "bracelets",
            "images": [
                "https://images.unsplash.com/photo-1586878340506-af074f2ee999?crop=entropy&amp;cs=srgb&amp;fm=jpg&amp;ixid=M3w3NDQ2Mzl8MHwxfHNlYXJjaHw0fHxsdXh1cnklMjBhY2Nlc3Nvcmllc3xlbnwwfHx8fDE3NTk0MTk4ODl8MA&amp;ixlib=rb-4.1.0&amp;q=85"
            ],
            "rating": 4.7,
            "reviews_count": 156
        },
        {
            "name": "ساعة ذهبية فاخرة",
            "description": "ساعة يد ذهبية مع تصميم كلاسيكي وحركة سويسرية",
            "price": 899.99,
            "original_price": 1199.99,
            "discount_percentage": 25,
            "category": "watches",
            "images": [
                "https://images.unsplash.com/photo-1758297679778-d308606a3f51?crop=entropy&amp;cs=srgb&amp;fm=jpg&amp;ixid=M3w3NDQ2Mzl8MHwxfHNlYXJjaHwzfHxsdXh1cnklMjBhY2Nlc3Nvcmllc3xlbnwwfHx8fDE3NTk0MTk4ODl8MA&amp;ixlib=rb-4.1.0&amp;q=85"
            ],
            "rating": 4.9,
            "reviews_count": 234
        },
        {
            "name": "طقم مجوهرات ذهبي كامل",
            "description": "طقم كامل من المجوهرات الذهبية يشمل قلادة وأقراط وسوار",
            "price": 799.99,
            "original_price": 1099.99,
            "discount_percentage": 27,
            "category": "sets",
            "images": [
                "https://images.pexels.com/photos/34047369/pexels-photo-34047369.jpeg"
            ],
            "rating": 4.8,
            "reviews_count": 98
        }
    ]
    
    products = [Product(**product_data) for product_data in sample_products]
    await db.products.insert_many([product.dict() for product in products])
    
    return {"message": f"Initialized {len(products)} sample products"}

@api_router.post("/initialize-admin")
async def initialize_admin():
    """Initialize default admin user for deployment"""
    try:
        # Check if admin already exists
        existing_admin = await db.users.find_one({"email": "admin@auraa.com"})
        
        if existing_admin:
            return {"message": "Admin user already exists", "admin_exists": True}
        
        # Create admin user
        hashed_password = pwd_context.hash("admin123")
        
        admin_data = {
            "_id": str(uuid.uuid4()),
            "email": "admin@auraa.com",
            "first_name": "Admin",
            "last_name": "لاكشري",
            "phone": "+966501234567",
            "hashed_password": hashed_password,
            "is_admin": True,
            "address": None,
            "created_at": datetime.now(timezone.utc)
        }
        
        # Insert admin user
        await db.users.insert_one(admin_data)
        
        logger.info("Default admin user created successfully")
        
        return {
            "message": "Admin user created successfully",
            "admin_email": "admin@auraa.com",
            "admin_created": True
        }
        
    except Exception as e:
        logger.error(f"Error creating admin user: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error creating admin user: {str(e)}")

@api_router.post("/setup-deployment")
async def setup_deployment():
    """Complete setup for deployment with admin user and sample data"""
    try:
        setup_results = {}
        
        # 1. Create admin user
        try:
            existing_admin = await db.users.find_one({"email": "admin@auraa.com"})
            
            if not existing_admin:
                hashed_password = pwd_context.hash("admin123")
                
                admin_data = {
                    "_id": str(uuid.uuid4()),
                    "email": "admin@auraa.com",
                    "first_name": "Admin",
                    "last_name": "Luxury",
                    "phone": "+966501234567",
                    "hashed_password": hashed_password,
                    "is_admin": True,
                    "address": None,
                    "created_at": datetime.now(timezone.utc)
                }
                
                await db.users.insert_one(admin_data)
                setup_results["admin_created"] = True
                logger.info("Admin user created during deployment setup")
            else:
                setup_results["admin_exists"] = True
                logger.info("Admin user already exists")
                
        except Exception as e:
            setup_results["admin_error"] = str(e)
        
        # 2. Initialize sample products
        try:
            product_count = await db.products.count_documents({})
            
            if product_count == 0:
                # Use the existing initialize_sample_data logic
                result = await initialize_sample_data()
                setup_results["products_created"] = True
                setup_results["product_message"] = result["message"]
            else:
                setup_results["products_exist"] = True
                setup_results["existing_product_count"] = product_count
                
        except Exception as e:
            setup_results["products_error"] = str(e)
        
        # 3. Initialize exchange rates if available
        try:
            if currency_service:
                await currency_service.update_exchange_rates()
                setup_results["currency_rates_updated"] = True
        except Exception as e:
            setup_results["currency_error"] = str(e)
        
        return {
            "message": "Deployment setup completed",
            "setup_results": setup_results,
            "ready_for_use": setup_results.get("admin_created") or setup_results.get("admin_exists")
        }
        
    except Exception as e:
        logger.error(f"Error in deployment setup: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Deployment setup error: {str(e)}")

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Import new services
from services.currency_service import get_currency_service
from services.scheduler_service import get_scheduler_service
from services.product_sync_service import get_product_sync_service
from services.aliexpress_service import get_aliexpress_service
from fastapi import UploadFile, File

# Auto-Update Services Initialization
currency_service = None
scheduler_service = None
product_sync_service = None

@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    global currency_service, scheduler_service, product_sync_service
    
    currency_service = get_currency_service(db)
    scheduler_service = get_scheduler_service(db)
    product_sync_service = get_product_sync_service(db)
    
    # Start scheduler
    await scheduler_service.start_scheduler()
    
    # Initialize exchange rates
    await currency_service.update_exchange_rates()
    
    logger.info("لورا لاكشري Auto-Update services started successfully")

# Auto-Update API Endpoints

@api_router.get("/auto-update/status")
async def get_auto_update_status(admin: User = Depends(get_admin_user)):
    """Get status of all auto-update services"""
    curr_service = get_currency_service(db)
    sched_service = get_scheduler_service(db)
    
    currency_status = {
        "last_update": None,
        "supported_currencies": curr_service.supported_currencies,
        "cache_duration_hours": curr_service.cache_duration.total_seconds() / 3600
    }
    
    # Get last currency update from database
    last_currency_update = await db.exchange_rates.find_one(
        {},
        sort=[("updated_at", -1)]
    )
    if last_currency_update:
        currency_status["last_update"] = last_currency_update["updated_at"].isoformat()
    
    scheduler_status = sched_service.get_scheduler_status()
    
    return {
        "currency_service": currency_status,
        "scheduler": scheduler_status,
        "auto_updates_enabled": True
    }

@api_router.post("/auto-update/trigger-currency-update")
async def trigger_currency_update(admin: User = Depends(get_admin_user)):
    """Manually trigger currency rate update"""
    curr_service = get_currency_service(db)
    success = await curr_service.update_exchange_rates()
    
    if success:
        return {"message": "Currency rates updated successfully"}
    else:
        raise HTTPException(status_code=500, detail="Failed to update currency rates")

@api_router.post("/auto-update/sync-products")
async def trigger_product_sync(
    source: str = "aliexpress",
    search_query: Optional[str] = "luxury accessories",
    limit: int = 10,
    admin: User = Depends(get_admin_user)
):
    """Manually trigger product synchronization"""
    try:
        prod_sync_service = get_product_sync_service(db)
        products = await prod_sync_service.search_products(
            query=search_query,
            source=source,
            min_price=50.0,  # Minimum for luxury items
            limit=limit
        )
        
        added_count = 0
        for product_data in products:
            try:
                await prod_sync_service.add_new_product(product_data)
                added_count += 1
            except Exception as e:
                logger.error(f"Error adding product: {str(e)}")
                continue
        
        return {
            "message": f"Product sync completed",
            "products_found": len(products),
            "products_added": added_count,
            "source": source
        }
        
    except Exception as e:
        logger.error(f"Error in product sync: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Product sync failed: {str(e)}")

@api_router.get("/auto-update/currency-rates")
async def get_current_currency_rates():
    """Get current exchange rates"""
    curr_service = get_currency_service(db)
    rates = {}
    
    for currency in curr_service.supported_currencies:
        if currency != "USD":  # USD is base currency
            rate = await curr_service.get_cached_rate("USD", currency)
            if rate:
                rates[currency] = rate
    
    return {
        "base_currency": "USD",
        "rates": rates,
        "last_updated": datetime.utcnow().isoformat()
    }

class CurrencyConversionRequest(BaseModel):
    amount: float
    from_currency: str
    to_currency: str

@api_router.post("/auto-update/convert-currency")
async def convert_currency_endpoint(request: CurrencyConversionRequest):
    """Convert amount between currencies"""
    try:
        curr_service = get_currency_service(db)
        converted = await curr_service.convert_currency(request.amount, request.from_currency, request.to_currency)
        
        if converted is None:
            raise HTTPException(status_code=400, detail="Currency conversion failed")
        
        formatted_result = await curr_service.format_currency(converted, request.to_currency, "en")
        
        return {
            "original_amount": request.amount,
            "from_currency": request.from_currency,
            "to_currency": request.to_currency,
            "converted_amount": converted,
            "formatted_result": formatted_result
        }
        
    except Exception as e:
        logger.error(f"Currency conversion error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

class BulkImportRequest(BaseModel):
    """Request model for bulk product import"""
    import_type: str  # "csv" or "excel"
    scheduled_at: Optional[datetime] = None

@api_router.post("/auto-update/bulk-import")
async def schedule_bulk_import(
    file: UploadFile = File(...),
    import_request: BulkImportRequest = Depends(),
    admin: User = Depends(get_admin_user)
):
    """Schedule bulk product import from CSV/Excel file"""
    try:
        # Validate file type
        if import_request.import_type not in ["csv", "excel"]:
            raise HTTPException(status_code=400, detail="Import type must be 'csv' or 'excel'")
        
        # Save uploaded file
        upload_dir = "/tmp/bulk_imports"
        os.makedirs(upload_dir, exist_ok=True)
        
        file_extension = "csv" if import_request.import_type == "csv" else "xlsx"
        file_path = f"{upload_dir}/{uuid.uuid4().hex}.{file_extension}"
        
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        # Schedule import task
        task_doc = {
            "_id": str(uuid.uuid4()),
            "type": f"{import_request.import_type}_import",
            "file_path": file_path,
            "status": "pending",
            "scheduled_at": import_request.scheduled_at or datetime.utcnow(),
            "created_by": admin.id,
            "created_at": datetime.utcnow()
        }
        
        await db.bulk_import_tasks.insert_one(task_doc)
        
        return {
            "message": "Bulk import scheduled successfully",
            "task_id": task_doc["_id"],
            "import_type": import_request.import_type,
            "scheduled_at": task_doc["scheduled_at"].isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error scheduling bulk import: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/auto-update/bulk-import-tasks")
async def get_bulk_import_tasks(admin: User = Depends(get_admin_user)):
    """Get list of bulk import tasks"""
    tasks = await db.bulk_import_tasks.find({}).sort("created_at", -1).to_list(length=50)
    
    for task in tasks:
        # Remove file path for security
        if "file_path" in task:
            del task["file_path"]
    
    return tasks

@api_router.get("/auto-update/scheduled-task-logs")
async def get_scheduled_task_logs(
    task_type: Optional[str] = None,
    limit: int = 100,
    admin: User = Depends(get_admin_user)
):
    """Get logs of scheduled tasks"""
    query = {}
    if task_type:
        query["task_type"] = task_type
    
    logs = await db.scheduled_task_logs.find(query).sort("timestamp", -1).limit(limit).to_list(length=None)
    
    return logs

@api_router.post("/auto-update/update-all-prices")
async def update_all_product_prices(admin: User = Depends(get_admin_user)):
    """Manually trigger price update for all products"""
    try:
        curr_service = get_currency_service(db)
        updated_count = 0
        
        # Get all products
        async for product in db.products.find({}):
            try:
                base_price_usd = product.get("base_price_usd")
                if not base_price_usd:
                    continue
                
                # Get current multi-currency prices
                multi_currency_prices = await curr_service.get_multi_currency_prices(
                    base_price_usd, "USD"
                )
                
                # Apply luxury markup
                markup_percentage = product.get("markup_percentage", 50.0)
                final_prices = await curr_service.apply_luxury_markup(
                    multi_currency_prices, markup_percentage
                )
                
                # Update product
                update_data = {
                    "price_usd": final_prices.get("USD"),
                    "price_sar": final_prices.get("SAR"),
                    "price_aed": final_prices.get("AED"),
                    "price_qar": final_prices.get("QAR"),
                    "updated_at": datetime.utcnow()
                }
                
                await db.products.update_one(
                    {"_id": product["_id"]},
                    {"$set": update_data}
                )
                
                updated_count += 1
                
            except Exception as e:
                logger.error(f"Error updating price for product {product.get('_id')}: {str(e)}")
                continue
        
        return {
            "message": "Price update completed",
            "updated_count": updated_count
        }
        
    except Exception as e:
        logger.error(f"Error updating all prices: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# AliExpress Integration Endpoints
@api_router.get("/admin/aliexpress/search")
async def search_aliexpress_products(
    keywords: str,
    category_id: str = None,
    min_price: float = None,
    max_price: float = None,
    page_size: int = 20,
    page_no: int = 1,
    admin: User = Depends(get_admin_user)
):
    """Search products on AliExpress"""
    try:
        aliexpress_service = get_aliexpress_service(db)
        await aliexpress_service.initialize()
        
        results = await aliexpress_service.search_products(
            keywords=keywords,
            category_id=category_id,
            min_price=min_price,
            max_price=max_price,
            page_size=page_size,
            page_no=page_no
        )
        
        await aliexpress_service.close()
        return results
        
    except Exception as e:
        logger.error(f"Error searching AliExpress: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/admin/aliexpress/product/{product_id}")
async def get_aliexpress_product_details(
    product_id: str,
    admin: User = Depends(get_admin_user)
):
    """Get detailed product information from AliExpress"""
    try:
        aliexpress_service = get_aliexpress_service(db)
        await aliexpress_service.initialize()
        
        details = await aliexpress_service.get_product_details(product_id)
        
        await aliexpress_service.close()
        
        if not details:
            raise HTTPException(status_code=404, detail="Product not found")
            
        return details
        
    except Exception as e:
        logger.error(f"Error getting product details: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/admin/aliexpress/import")
async def import_aliexpress_product(
    aliexpress_product_id: str,
    custom_name: str = None,
    custom_description: str = None,
    markup_percentage: float = 50.0,
    category: str = "imported",
    admin: User = Depends(get_admin_user)
):
    """Import a product from AliExpress to local store"""
    try:
        aliexpress_service = get_aliexpress_service(db)
        await aliexpress_service.initialize()
        
        imported_product = await aliexpress_service.import_product_to_store(
            aliexpress_product_id=aliexpress_product_id,
            custom_name=custom_name,
            custom_description=custom_description,
            markup_percentage=markup_percentage,
            category=category
        )
        
        await aliexpress_service.close()
        
        logger.info(f"Product imported successfully: {aliexpress_product_id}")
        return {"success": True, "product": imported_product}
        
    except Exception as e:
        logger.error(f"Error importing product: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/admin/aliexpress/sync-prices")
async def sync_aliexpress_prices(
    admin: User = Depends(get_admin_user)
):
    """Sync prices for all AliExpress products"""
    try:
        aliexpress_service = get_aliexpress_service(db)
        await aliexpress_service.initialize()
        
        results = await aliexpress_service.sync_product_prices()
        
        await aliexpress_service.close()
        
        logger.info(f"Price sync completed: {results['updated_count']} products updated")
        return results
        
    except Exception as e:
        logger.error(f"Error syncing prices: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Image Upload Endpoint
@api_router.post("/admin/upload-image")
async def upload_image(
    file: UploadFile = File(...),
    admin: User = Depends(get_admin_user)
):
    """Upload and process product image"""
    try:
        # Check file type
        if not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        # Check file size (max 10MB)
        max_size = 10 * 1024 * 1024  # 10MB
        file_content = await file.read()
        if len(file_content) > max_size:
            raise HTTPException(status_code=400, detail="File too large. Maximum size is 10MB")
        
        # Generate unique filename
        file_extension = file.filename.split('.')[-1].lower()
        if file_extension not in ['jpg', 'jpeg', 'png', 'webp']:
            raise HTTPException(status_code=400, detail="Invalid file type. Only JPG, PNG, and WebP are allowed")
        
        unique_filename = f"{uuid.uuid4()}.{file_extension}"
        file_path = f"/app/backend/static/uploads/{unique_filename}"
        
        # Process and save image
        image = Image.open(io.BytesIO(file_content))
        
        # Convert to RGB if necessary
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        # Resize image to reasonable dimensions (max 1200px width)
        max_width = 1200
        if image.width > max_width:
            ratio = max_width / image.width
            new_height = int(image.height * ratio)
            image = image.resize((max_width, new_height), Image.Resampling.LANCZOS)
        
        # Save optimized image
        image.save(file_path, format='JPEG', quality=85, optimize=True)
        
        # Return the URL
        image_url = f"/static/uploads/{unique_filename}"
        
        logger.info(f"Image uploaded successfully: {unique_filename}")
        return {"url": image_url, "filename": unique_filename}
        
    except Exception as e:
        logger.error(f"Error uploading image: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on application shutdown"""
    try:
        sched_service = get_scheduler_service(db)
        if sched_service:
            await sched_service.stop_scheduler()
    except:
        pass
    
    client.close()
    logger.info("لورا لاكشري services shut down successfully")

# ============================================================================
# AliExpress Integration
# ============================================================================

from services.aliexpress.auth import AliExpressAuthenticator
from services.aliexpress.product_sync import ProductSyncService
from services.aliexpress.customs_calculator import CustomsCalculator
from services.aliexpress.scheduler import AliExpressSyncScheduler
from services.aliexpress.models import AliExpressProduct
from services.aliexpress.bulk_import import BulkImportService
from services.aliexpress.category_mapper import CategoryMapper
from services.aliexpress.sync_service import AliExpressSyncService
from services.geoip_service import GeoIPService

# Initialize AliExpress services
aliexpress_auth = None
aliexpress_product_sync = None
aliexpress_customs_calc = None
aliexpress_scheduler = None
aliexpress_bulk_import = None
aliexpress_sync_service = None  # New unified sync service
category_mapper = None
geoip_service = None

@app.on_event("startup")
async def init_aliexpress_services():
    """Initialize AliExpress services on startup."""
    global aliexpress_auth, aliexpress_product_sync, aliexpress_customs_calc, aliexpress_scheduler
    global aliexpress_bulk_import, aliexpress_sync_service, category_mapper, geoip_service
    
    try:
        # Initialize GeoIP service (always available)
        geoip_service = GeoIPService()
        logger.info("✅ GeoIP service initialized")
        
        # Initialize category mapper (always available)
        category_mapper = CategoryMapper()
        logger.info("✅ Category mapper initialized")
        
        app_key = os.getenv('ALIEXPRESS_APP_KEY', '')
        app_secret = os.getenv('ALIEXPRESS_APP_SECRET', '')
        
        if app_key and app_secret:
            logger.info("Initializing AliExpress services...")
            
            # Initialize authenticator
            aliexpress_auth = AliExpressAuthenticator(app_key, app_secret)
            
            # Initialize product sync service (low-level)
            aliexpress_product_sync = ProductSyncService(
                aliexpress_auth,
                db,
                os.getenv('ALIEXPRESS_API_URL', 'http://gw.api.taobao.com/router/rest')
            )
            
            # Initialize unified sync service (high-level)
            aliexpress_sync_service = AliExpressSyncService(
                aliexpress_auth,
                db,
                os.getenv('ALIEXPRESS_API_URL', 'http://gw.api.taobao.com/router/rest')
            )
            
            # Initialize customs calculator
            aliexpress_customs_calc = CustomsCalculator()
            
            # Initialize bulk import service
            aliexpress_bulk_import = BulkImportService(
                aliexpress_auth,
                db,
                os.getenv('ALIEXPRESS_API_URL', 'http://gw.api.taobao.com/router/rest')
            )
            
            # Initialize and start scheduler
            sync_interval = int(os.getenv('ALIEXPRESS_SYNC_INTERVAL_MINUTES', '10'))
            aliexpress_scheduler = AliExpressSyncScheduler(
                aliexpress_sync_service,
                db,
                sync_interval
            )
            
            # Start scheduler if enabled
            if os.getenv('ENABLE_SCHEDULER', 'true').lower() == 'true':
                aliexpress_scheduler.start_scheduler()
                logger.info(f"AliExpress scheduler started with {sync_interval} minute interval")
            
            logger.info("✅ AliExpress services initialized successfully")
        else:
            logger.warning("⚠️ AliExpress credentials not found - services disabled")
    
    except Exception as e:
        logger.error(f"❌ Failed to initialize AliExpress services: {e}")

@app.on_event("shutdown")
async def shutdown_aliexpress_services():
    """Shutdown AliExpress services on app shutdown."""
    global aliexpress_scheduler
    
    try:
        if aliexpress_scheduler:
            aliexpress_scheduler.stop_scheduler()
            logger.info("AliExpress scheduler stopped")
    except Exception as e:
        logger.error(f"Error stopping AliExpress scheduler: {e}")

# AliExpress Product Endpoints
@api_router.post("/aliexpress/sync-product")
async def sync_aliexpress_product(product_id: str):
    """
    Synchronize a single product from AliExpress.
    
    Args:
        product_id: AliExpress product ID
        
    Returns:
        Sync result with product data
    """
    if not aliexpress_sync_service:
        raise HTTPException(status_code=503, detail="AliExpress service not available")
    
    try:
        result = await aliexpress_sync_service.sync_product(product_id)
        
        if result:
            return {
                "success": True,
                "message": "Product synced successfully",
                "product_id": product_id,
                "mongodb_id": result
            }
        else:
            raise HTTPException(status_code=404, detail="Product not found on AliExpress")
    
    except Exception as e:
        logger.error(f"Error syncing product {product_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/aliexpress/sync-batch")
async def sync_aliexpress_batch(product_ids: List[str]):
    """
    Synchronize multiple products in batch.
    
    Args:
        product_ids: List of AliExpress product IDs
        
    Returns:
        Batch sync statistics
    """
    if not aliexpress_sync_service:
        raise HTTPException(status_code=503, detail="AliExpress service not available")
    
    try:
        results = await aliexpress_sync_service.sync_products_batch(product_ids)
        return {
            "success": True,
            "statistics": results
        }
    
    except Exception as e:
        logger.error(f"Error in batch sync: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/aliexpress/product/{product_id}")
async def get_aliexpress_product(product_id: str):
    """
    Get AliExpress product from local database.
    
    Args:
        product_id: AliExpress product ID
        
    Returns:
        Product details with country availability
    """
    try:
        product = await db.products.find_one({'product_id': product_id})
        
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        
        # Remove MongoDB _id field
        product.pop('_id', None)
        
        return product
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching product: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/aliexpress/product/{product_id}/availability/{country_code}")
async def check_product_availability(product_id: str, country_code: str):
    """
    Check product availability for specific country.
    
    Args:
        product_id: AliExpress product ID
        country_code: ISO country code (SA, AE, etc.)
        
    Returns:
        Availability info with shipping options
    """
    if not aliexpress_sync_service:
        raise HTTPException(status_code=503, detail="AliExpress service not available")
    
    try:
        availability = await aliexpress_sync_service.check_country_availability(
            product_id,
            country_code.upper()
        )
        
        return availability.model_dump()
    
    except Exception as e:
        logger.error(f"Error checking availability: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/aliexpress/customs/calculate")
async def calculate_customs(
    product_id: str,
    country_code: str,
    shipping_cost: float
):
    """
    Calculate customs duties and VAT for product.
    
    Args:
        product_id: AliExpress product ID
        country_code: Destination country code
        shipping_cost: Shipping cost in USD
        
    Returns:
        Tax calculation breakdown
    """
    if not aliexpress_sync_service or not aliexpress_customs_calc:
        raise HTTPException(status_code=503, detail="AliExpress service not available")
    
    try:
        # Get product details
        product = await aliexpress_sync_service.get_product_details(product_id)
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        
        # Determine category
        category = aliexpress_customs_calc.categorize_product(product.title)
        
        # Calculate taxes
        tax_calc = aliexpress_customs_calc.calculate_gcc_taxes(
            country_code.upper(),
            product.sale_price,
            shipping_cost,
            category
        )
        
        return tax_calc.model_dump()
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error calculating customs: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/aliexpress/scheduler/status")
async def get_scheduler_status():
    """
    Get status of AliExpress synchronization scheduler.
    
    Returns:
        Scheduler status and job information
    """
    if not aliexpress_scheduler:
        raise HTTPException(status_code=503, detail="Scheduler not available")
    
    try:
        jobs_status = aliexpress_scheduler.get_all_jobs_status()
        
        return {
            "status": "running",
            "jobs": jobs_status
        }
    
    except Exception as e:
        logger.error(f"Error getting scheduler status: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/aliexpress/scheduler/trigger-sync")
async def trigger_immediate_sync():
    """
    Trigger immediate product synchronization.
    
    Returns:
        Sync results
    """
    if not aliexpress_scheduler:
        raise HTTPException(status_code=503, detail="Scheduler not available")
    
    try:
        results = await aliexpress_scheduler.trigger_immediate_sync()
        return results
    
    except Exception as e:
        logger.error(f"Error triggering sync: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Bulk Import Endpoints (Admin Only)
@api_router.post("/admin/aliexpress/import-fast")
async def import_fast(
    count: int = Query(default=1000, le=1000),
    query: str = Query(default="jewelry accessories")
):
    """
    🚀 Fast Import: Import products from AliExpress with query.
    
    Args:
        count: Number of products to import (max 1000)
        query: Search query
        
    Returns:
        Import statistics with breakdown by category
    """
    if not aliexpress_sync_service:
        raise HTTPException(status_code=503, detail="Sync service not available")
    
    # Check feature flag
    if os.getenv('FEATURE_ALI_IMPORT', 'false').lower() != 'true':
        raise HTTPException(status_code=403, detail="Import feature disabled")
    
    try:
        logger.info(f"Starting fast import: {count} products, query: {query}")
        
        results = await aliexpress_sync_service.import_bulk_accessories(
            limit=count,
            query=query
        )
        
        return {
            "success": True,
            "message": f"Import completed: {results['inserted']} new, {results['updated']} updated",
            "statistics": results
        }
    
    except Exception as e:
        logger.error(f"Fast import failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/admin/aliexpress/sync-now")
async def sync_now():
    """
    Trigger immediate price/stock/shipping sync.
    
    Returns:
        Sync statistics
    """
    if not aliexpress_sync_service:
        raise HTTPException(status_code=503, detail="Sync service not available")
    
    try:
        logger.info("Manual sync triggered")
        
        results = await aliexpress_sync_service.sync_prices_stock_shipping()
        
        return {
            "success": True,
            "message": f"Sync completed: {results['products_updated']} updated",
            "statistics": results
        }
    
    except Exception as e:
        logger.error(f"Sync failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/admin/aliexpress/sync-status")
async def get_sync_status():
    """
    Get last sync status and statistics.
    
    Returns:
        Last sync log
    """
    try:
        # Get most recent sync log
        cursor = db.sync_logs.find().sort('start_time', -1).limit(1)
        logs = await cursor.to_list(length=1)
        
        if logs:
            log = logs[0]
            log['_id'] = str(log['_id'])
            return log
        else:
            return {
                "message": "No sync logs yet",
                "status": "idle"
            }
    
    except Exception as e:
        logger.error(f"Error getting sync status: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/aliexpress/external-products")
async def get_external_products(
    source: Optional[str] = None,
    category: Optional[str] = None,
    pushed: Optional[bool] = None,
    skip: int = 0,
    limit: int = 50
):
    """
    Get external products (not yet in store).
    
    Args:
        source: Filter by source ('aliexpress')
        category: Filter by category
        pushed: Filter by pushed_to_store status
        skip: Pagination skip
        limit: Pagination limit
        
    Returns:
        List of external products with pagination
    """
    try:
        # Build filter
        filter_query = {}
        if source:
            filter_query['source'] = source
        if category:
            filter_query['category'] = category
        if pushed is not None:
            filter_query['pushed_to_store'] = pushed
        
        # Get total count
        total = await db.external_products.count_documents(filter_query)
        
        # Get products
        cursor = db.external_products.find(filter_query).skip(skip).limit(limit)
        products = await cursor.to_list(length=limit)
        
        # Remove MongoDB _id
        for product in products:
            product['_id'] = str(product['_id'])
        
        return {
            "total": total,
            "skip": skip,
            "limit": limit,
            "products": products
        }
    
    except Exception as e:
        logger.error(f"Error fetching external products: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/aliexpress/push-to-store")
async def push_products_to_store(product_ids: List[str]):
    """
    Push selected external products to main store.
    
    Args:
        product_ids: List of external product IDs to push
        
    Returns:
        Push statistics
    """
    if not aliexpress_bulk_import:
        raise HTTPException(status_code=503, detail="Bulk import service not available")
    
    try:
        profit_margin = float(os.getenv('MIN_PROFIT_MARGIN', '0.20'))
        
        results = await aliexpress_bulk_import.push_to_store(
            product_ids,
            profit_margin=profit_margin
        )
        
        return {
            "success": True,
            "message": f"Pushed {results['pushed']} products to store",
            "statistics": results
        }
    
    except Exception as e:
        logger.error(f"Error pushing to store: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/aliexpress/import-logs")
async def get_import_logs(limit: int = 10):
    """
    Get recent import logs.
    
    Args:
        limit: Number of logs to retrieve
        
    Returns:
        List of import logs
    """
    try:
        cursor = db.import_logs.find().sort('start_time', -1).limit(limit)
        logs = await cursor.to_list(length=limit)
        
        for log in logs:
            log['_id'] = str(log['_id'])
        
        return {
            "total": len(logs),
            "logs": logs
        }
    
    except Exception as e:
        logger.error(f"Error fetching import logs: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# GeoIP and Country-specific Pricing
@api_router.get("/geo/detect")
async def detect_user_country(request: Request):
    """
    Detect user's country from IP and provide configuration.
    
    Returns:
        Country code and configuration
    """
    if not geoip_service:
        raise HTTPException(status_code=503, detail="GeoIP service not available")
    
    try:
        # Get client IP
        client_ip = request.client.host
        
        # Detect country
        country_code = await geoip_service.detect_country_from_ip(client_ip)
        
        # Get country config
        config = geoip_service.get_country_config(country_code)
        
        return {
            "country_code": country_code,
            "config": config,
            "detected_from": "ip"
        }
    
    except Exception as e:
        logger.error(f"Error detecting country: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/geo/countries")
async def get_supported_countries():
    """Get list of all supported GCC countries."""
    if not geoip_service:
        raise HTTPException(status_code=503, detail="GeoIP service not available")
    
    try:
        countries = geoip_service.get_all_gcc_countries()
        configs = {code: geoip_service.get_country_config(code) for code in countries}
        
        return {
            "countries": configs
        }
    
    except Exception as e:
        logger.error(f"Error fetching countries: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Mount static files
app.mount("/static", StaticFiles(directory="/app/backend/static"), name="static")

# Include the router in the main app (MUST be after all routes are defined)
app.include_router(api_router)