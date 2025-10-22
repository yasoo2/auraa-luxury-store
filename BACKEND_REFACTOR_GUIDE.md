# 🔄 Backend Refactor Guide - Auraa Luxury

## 📋 Overview

Backend structure has been refactored to improve:
- ✅ **Stability** - Better error handling and validation
- ✅ **Environment Variables** - Centralized configuration
- ✅ **Code Organization** - Clear separation of concerns
- ✅ **Maintainability** - Easier to update and extend

---

## 🆕 New Files Added

### 1. `config.py`
**Purpose:** Centralized configuration management with Pydantic

**Features:**
- Type-safe settings
- Automatic .env loading
- Validation on startup
- Helper methods for common tasks

**Usage:**
```python
from config import settings

# Get database URI
mongo_uri = settings.get_mongo_uri()

# Get CORS origins list
cors_origins = settings.get_cors_origins_list()

# Access any setting
api_key = settings.CJ_API_KEY
env = settings.ENV
```

---

### 2. `db.py`
**Purpose:** Database connection and utilities

**Features:**
- Async MongoDB client
- Connection health check
- Graceful shutdown
- Single source of truth for database access

**Usage:**
```python
from db import db, ping_db

# Use database
products = await db.products.find().to_list(length=10)
await db.products.insert_one({"name": "Product"})

# Health check
is_healthy = await ping_db()
```

---

### 3. `schemas/`
**Purpose:** Pydantic schemas for data validation

**Files:**
- `__init__.py` - Package exports
- `product.py` - Product schemas

**Usage:**
```python
from schemas import ProductIn, ProductOut

# Validate input
product_data = ProductIn(
    title="Gold Necklace",
    sku="GN001",
    price=299.99
)

# Serialize output
product_out = ProductOut(
    id="123",
    title="Gold Necklace",
    sku="GN001",
    price=299.99
)
```

---

### 4. `utils/`
**Purpose:** Common utility functions

**Functions:**
- `ok(data, **kwargs)` - Standard success response
- `error(message, code, **kwargs)` - Standard error response

**Usage:**
```python
from utils import ok, error

# Success response
return ok(data={"products": products}, count=len(products))
# → {"ok": True, "data": {...}, "count": 10}

# Error response
return error("Product not found", 404)
# → {"ok": False, "error": "Product not found", "code": 404}
```

---

### 5. `render.yaml`
**Purpose:** Render deployment configuration

**Features:**
- Automatic deployment setup
- Environment variable management
- Health check configuration

---

### 6. `README.md`
**Purpose:** Comprehensive documentation

**Includes:**
- Quick start guide
- API endpoints
- Configuration instructions
- Deployment guide
- Troubleshooting

---

### 7. `.env.example`
**Purpose:** Environment variables template

**Usage:**
```bash
cp .env.example .env
# Edit .env with your values
```

---

## 🔄 Migration Guide

### Before (Old Way)

```python
# server.py - Everything mixed together
import os
from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
client = AsyncIOMotorClient(MONGO_URL)
db = client["auraa_luxury_db"]

# In routes
@app.get("/products")
async def get_products():
    products = await db.products.find().to_list(length=10)
    return {"success": True, "data": products}
```

### After (New Way)

```python
# Using config and db
from config import settings
from db import db
from utils import ok

@app.get("/products")
async def get_products():
    products = await db.products.find().to_list(length=10)
    return ok(data=products, count=len(products))
```

---

## ✅ Benefits

### 1. **Type Safety**
```python
# Before: No validation
api_key = os.getenv("CJ_API_KEY")  # Could be None

# After: Type-checked
api_key = settings.CJ_API_KEY  # Optional[str], validated
```

### 2. **Centralized Configuration**
```python
# Before: Scattered throughout codebase
MONGO_URL = os.getenv("MONGO_URL")
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "").split(",")

# After: Single source of truth
mongo_uri = settings.get_mongo_uri()
cors_origins = settings.get_cors_origins_list()
```

### 3. **Easy Testing**
```python
# Override settings for tests
from config import Settings

test_settings = Settings(
    MONGO_DB_NAME="test_db",
    ENV="test"
)
```

### 4. **Better Errors**
```python
# Before: Silent failure
api_key = os.getenv("REQUIRED_KEY")  # None if missing

# After: Validation error on startup
settings = Settings()  # Raises ValidationError if required fields missing
```

---

## 🚀 Using New Structure

### Adding New Environment Variable

1. **Add to `config.py`:**
```python
class Settings(BaseSettings):
    # ... existing fields
    MY_NEW_KEY: Optional[str] = None
```

2. **Add to `.env`:**
```bash
MY_NEW_KEY=my_value
```

3. **Use in code:**
```python
from config import settings
my_key = settings.MY_NEW_KEY
```

---

### Creating New Schema

1. **Create file in `schemas/`:**
```python
# schemas/user.py
from pydantic import BaseModel, EmailStr

class UserIn(BaseModel):
    email: EmailStr
    password: str

class UserOut(BaseModel):
    id: str
    email: EmailStr
    is_admin: bool
```

2. **Export in `schemas/__init__.py`:**
```python
from .user import UserIn, UserOut
__all__ = ['UserIn', 'UserOut']
```

3. **Use in routes:**
```python
from schemas import UserIn, UserOut

@app.post("/users", response_model=UserOut)
async def create_user(user: UserIn):
    # ... validation automatic!
    pass
```

---

### Using Database

```python
from db import db

# All collections available
await db.products.find().to_list(length=10)
await db.users.find_one({"email": "test@example.com"})
await db.orders.insert_one(order_data)
```

---

## 📁 Updated Structure

```
backend/
├── config.py              ⭐ NEW - Settings
├── db.py                  ⭐ NEW - Database
├── schemas/               ⭐ NEW - Data validation
│   ├── __init__.py
│   └── product.py
├── utils/                 ⭐ NEW - Utilities
│   └── __init__.py
├── render.yaml            ⭐ NEW - Deployment config
├── README.md              ⭐ NEW - Documentation
├── .env.example           ⭐ NEW - Environment template
├── auth/                  ✅ Existing (added __init__.py)
├── routes/                ✅ Existing
├── services/              ✅ Existing
├── middleware/            ✅ Existing
├── models/                ✅ Existing
├── static/                ✅ Existing (added __init__.py)
└── server.py              ✅ Existing (can be updated to use new files)
```

---

## ⚠️ Important Notes

### 1. **Backward Compatible**
All existing code continues to work. New files are additive, not replacements.

### 2. **Gradual Migration**
You can migrate to new structure gradually:
- Keep old code working
- Add new routes using new structure
- Refactor old routes over time

### 3. **No Breaking Changes**
Existing functionality is preserved. All current routes, services, and auth work as before.

### 4. **Environment Variables**
Make sure to update Render environment variables:
- Fix typo: `CORRS_ORIGINS` → `CORS_ORIGINS`
- Verify all required variables are set

---

## 🧪 Testing

### Test Configuration
```bash
cd backend
python3 -c "from config import settings; print(settings.APP_NAME)"
```

### Test Database
```bash
python3 -c "import asyncio; from db import ping_db; asyncio.run(ping_db())"
```

### Test Schemas
```bash
python3 -c "from schemas import ProductIn; p = ProductIn(title='Test', sku='T1', price=10); print(p)"
```

### Test Utils
```bash
python3 -c "from utils import ok, error; print(ok(data={'test': 'data'}))"
```

---

## 🚀 Deployment

### Render (Automatic)
1. Push code with `render.yaml`
2. Render detects configuration
3. Auto-deploys with correct settings

### Render (Manual)
1. Update environment variables in dashboard
2. Fix: `CORRS_ORIGINS` → `CORS_ORIGINS`
3. Restart service

### Local Development
```bash
cp .env.example .env
# Edit .env
pip install -r requirements.txt
uvicorn server:app --reload
```

---

## 📚 Next Steps

1. ✅ Review new files
2. ✅ Test in development
3. ✅ Update Render environment variables
4. ✅ Deploy to production
5. 🔄 Gradually migrate old code to new structure (optional)

---

## 🐛 Troubleshooting

### "ValidationError on startup"
- Check `.env` file exists
- Verify required variables are set
- Check for typos in variable names

### "Module not found"
- Run `pip install -r requirements.txt`
- Check `pydantic-settings` is installed

### "Database connection failed"
- Verify `MONGODB_URI` or `MONGO_URL` is correct
- Check MongoDB is running/accessible
- Test with `ping_db()`

---

## ✅ Summary

**Added:**
- ✅ `config.py` - Settings management
- ✅ `db.py` - Database utilities
- ✅ `schemas/` - Data validation
- ✅ `utils/` - Helper functions
- ✅ `render.yaml` - Deployment config
- ✅ `README.md` - Documentation
- ✅ `.env.example` - Template

**Benefits:**
- ✅ Better organization
- ✅ Type safety
- ✅ Easier maintenance
- ✅ Better documentation
- ✅ Smoother deployment

**Status:**
- ✅ All tested and working
- ✅ Backward compatible
- ✅ Ready for production

🎉 **Refactor complete and ready to use!**
