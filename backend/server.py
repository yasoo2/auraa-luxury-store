from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import jwt
from passlib.context import CryptContext
import bcrypt
from enum import Enum

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI(title="Auraa Luxury API", version="1.0.0")
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBearer()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = "auraa-luxury-secret-key-2024"
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
    phone: Optional[str] = None
    address: Optional[Dict[str, Any]] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_admin: bool = False

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    first_name: str
    last_name: str
    phone: Optional[str] = None

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

# Routes
@api_router.get("/")
async def root():
    return {"message": "Welcome to Auraa Luxury API"}

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
    return [Product(**product) for product in products]

@api_router.get("/products/{product_id}", response_model=Product)
async def get_product(product_id: str):
    product = await db.products.find_one({"id": product_id})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return Product(**product)

@api_router.post("/products", response_model=Product)
async def create_product(product_data: ProductCreate, current_user: User = Depends(get_current_user)):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    product = Product(**product_data.dict())
    await db.products.insert_one(product.dict())
    return product

# Cart routes
@api_router.get("/cart", response_model=Cart)
async def get_cart(current_user: User = Depends(get_current_user)):
    cart = await db.carts.find_one({"user_id": current_user.id})
    if not cart:
        cart = Cart(user_id=current_user.id)
        await db.carts.insert_one(cart.dict())
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

# Orders routes
@api_router.post("/orders")
async def create_order(
    shipping_address: Dict[str, Any],
    payment_method: str,
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
        shipping_address=shipping_address,
        payment_method=payment_method
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

# Sample data initialization
@api_router.post("/init-data")
async def initialize_sample_data():
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
                "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2NDJ8MHwxfHNlYXJjaHwxfHxsdXh1cnklMjBqZXdlbHJ5fGVufDB8fHx8MTc1OTQxOTg4M3ww&ixlib=rb-4.1.0&q=85"
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
                "https://images.unsplash.com/photo-1636619608432-77941d282b32?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2Mzl8MHwxfHNlYXJjaHwxfHxsdXh1cnklMjBhY2Nlc3Nvcmllc3xlbnwwfHx8fDE3NTk0MTk4ODl8MA&ixlib=rb-4.1.0&q=85"
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
                "https://images.unsplash.com/photo-1606623546924-a4f3ae5ea3e8?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2NDJ8MHwxfHNlYXJjaHwzfHxsdXh1cnklMjBqZXdlbHJ5fGVufDB8fHx8MTc1OTQxOTg4M3ww&ixlib=rb-4.1.0&q=85"
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
                "https://images.unsplash.com/photo-1586878340506-af074f2ee999?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2Mzl8MHwxfHNlYXJjaHw0fHxsdXh1cnklMjBhY2Nlc3Nvcmllc3xlbnwwfHx8fDE3NTk0MTk4ODl8MA&ixlib=rb-4.1.0&q=85"
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
                "https://images.unsplash.com/photo-1758297679778-d308606a3f51?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2Mzl8MHwxfHNlYXJjaHwzfHxsdXh1cnklMjBhY2Nlc3Nvcmllc3xlbnwwfHx8fDE3NTk0MTk4ODl8MA&ixlib=rb-4.1.0&q=85"
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

# Include the router in the main app
app.include_router(api_router)

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

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()