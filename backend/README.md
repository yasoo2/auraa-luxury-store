# 🏪 Auraa Luxury API (FastAPI)

High-end luxury e-commerce platform backend with multi-language support, multi-currency, and advanced features.

## 🚀 Quick Start

### Local Development

1. **Clone and setup:**
   ```bash
   cd backend
   cp .env.example .env
   # Edit .env with your values
   ```

2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Run the server:**
   ```bash
   uvicorn server:app --reload --port 8001
   ```

4. **Access:**
   - API: http://localhost:8001
   - Health check: http://localhost:8001/health
   - Docs: http://localhost:8001/docs

---

## 📦 Features

### Core Features
- ✅ **Authentication** - JWT + Refresh Tokens, Google OAuth
- ✅ **Products** - CRUD with images, categories, multi-language
- ✅ **Orders** - Full order management and tracking
- ✅ **Payments** - Stripe, PayPal, Apple Pay, Google Pay
- ✅ **Email** - Gmail SMTP with templates
- ✅ **Admin Dashboard** - Full management panel
- ✅ **Multi-language** - Arabic, English, Turkish
- ✅ **Multi-currency** - 9 currencies with auto-conversion

### Advanced Features
- ✅ **CJ Dropshipping** - Product import with rate limiting
- ✅ **AliExpress** - Product sync (partial)
- ✅ **Background Jobs** - Async product import
- ✅ **Rate Limiting** - Protection from 429 errors
- ✅ **Pricing Service** - Auto-pricing with profit margins
- ✅ **Currency Service** - Real-time exchange rates

---

## 🔧 Configuration

### Environment Variables

See `.env.example` for all available variables.

**Required:**
- `MONGODB_URI` or `MONGO_URL` - MongoDB connection
- `MONGO_DB_NAME` - Database name
- `JWT_SECRET_KEY` - Secret for JWT tokens
- `CORS_ORIGINS` - Allowed origins (comma-separated)

**Optional but recommended:**
- `CJ_API_KEY` - For CJ Dropshipping
- `GOOGLE_CLIENT_ID` - For Google OAuth
- `SMTP_USER` - For email sending
- `STRIPE_SECRET_KEY` - For payments

---

## 🌐 Deploy to Render

### Automatic (recommended)

1. **Connect GitHub:**
   - Go to https://dashboard.render.com
   - Click "New" → "Blueprint"
   - Connect your GitHub repo
   - Render will detect `render.yaml` automatically

2. **Configure Secrets:**
   - Add required environment variables in Render Dashboard
   - At minimum: `MONGODB_URI`, `CORS_ORIGINS`, `JWT_SECRET_KEY`

3. **Deploy:**
   - Click "Apply"
   - Render will build and deploy automatically

### Manual

1. **Create Web Service:**
   - Type: Web Service
   - Environment: Python
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn server:app --host 0.0.0.0 --port $PORT`

2. **Set Environment Variables:**
   - Add all required variables from `.env.example`

3. **Deploy:**
   - Click "Create Web Service"

---

## 📚 API Endpoints

### Health & Status
- `GET /health` - Health check
- `GET /readiness` - Readiness check
- `GET /api/health` - API health

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user
- `POST /api/auth/refresh` - Refresh token
- `GET /api/auth/google` - Google OAuth
- `GET /api/auth/google/callback` - Google callback

### Products
- `GET /api/products` - List products
- `GET /api/products/{id}` - Get product
- `POST /api/products` - Create product (admin)
- `PUT /api/products/{id}` - Update product (admin)
- `DELETE /api/products/{id}` - Delete product (admin)

### Orders
- `GET /api/orders` - List orders
- `GET /api/orders/{id}` - Get order
- `POST /api/orders` - Create order
- `PUT /api/orders/{id}/status` - Update status (admin)

### Admin
- `GET /admin/users` - List users
- `GET /admin/users/all` - All users (super admin)
- `POST /admin/super-admin-delete/{id}` - Delete user
- `POST /admin/super-admin-reset-password` - Reset password

### CJ Dropshipping
- `GET /admin/cj/ping` - Test connection
- `GET /admin/cj/test-auth` - Test authentication
- `POST /admin/cj/import/bulk` - Bulk import products
- `GET /admin/cj/products/list` - List CJ products

### Staging (Quick Import)
- `GET /api/products/staging` - Get staging products
- `PUT /api/products/staging/{id}` - Update staging product
- `DELETE /api/products/staging/{id}` - Delete staging product
- `POST /api/products/publish-staging` - Publish to live

Full API documentation: `/docs` (Swagger UI)

---

## 🛠️ Development

### Project Structure

```
backend/
├── auth/              # Authentication logic
├── config.py          # Settings & environment
├── db.py              # Database connection
├── middleware/        # Custom middleware
├── models/            # Data models
├── routes/            # API routes
│   ├── cj_admin.py   # CJ Dropshipping admin
│   └── ...
├── schemas/           # Pydantic schemas
│   ├── product.py
│   └── ...
├── services/          # Business logic
│   ├── cj_client.py  # CJ API client (rate limited)
│   ├── import_service.py  # Bulk import
│   ├── pricing_service.py # Auto pricing
│   ├── currency_service.py # Currency conversion
│   └── ...
├── utils/             # Utility functions
├── server.py          # Main FastAPI app
└── requirements.txt   # Dependencies
```

### Adding New Routes

1. Create route file in `routes/`:
   ```python
   from fastapi import APIRouter
   router = APIRouter(prefix="/api/myroute")
   
   @router.get("/")
   async def my_endpoint():
       return {"message": "Hello"}
   ```

2. Register in `server.py`:
   ```python
   from routes.myroute import router as myroute_router
   app.include_router(myroute_router)
   ```

### Using Config

```python
from config import settings

# Get values
mongo_uri = settings.get_mongo_uri()
cors_origins = settings.get_cors_origins_list()
api_key = settings.CJ_API_KEY
```

### Using Database

```python
from db import db

# Use db
products = await db.products.find().to_list(length=10)
await db.products.insert_one({"name": "Product"})
```

---

## 🧪 Testing

### Manual Testing

```bash
# Health check
curl http://localhost:8001/health

# Login
curl -X POST http://localhost:8001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier": "admin@auraa.com", "password": "admin123"}'

# Get products
curl http://localhost:8001/api/products
```

### Automated Testing

```bash
# Run test suite
pytest

# With coverage
pytest --cov=. --cov-report=html
```

---

## 📊 Monitoring

### Logs

**Development:**
```bash
tail -f /var/log/supervisor/backend.err.log
```

**Production (Render):**
- Go to Render Dashboard
- Select your service
- Click "Logs" tab

### Health Checks

- `/health` - Basic health
- `/readiness` - Database connectivity
- `/api/health` - Full system check

---

## 🔒 Security

### Best Practices

- ✅ Use environment variables for secrets
- ✅ Enable CORS only for trusted origins
- ✅ Use HTTPS in production
- ✅ Rate limit sensitive endpoints
- ✅ Validate all inputs
- ✅ Use HttpOnly cookies for tokens
- ✅ Keep dependencies updated

### Rate Limiting

CJ API calls are rate limited:
- Default: 2 requests/second
- Max concurrency: 3
- Auto-retry on 429/5xx errors
- Exponential backoff

---

## 🐛 Troubleshooting

### Common Issues

**"MONGODB_URI not found"**
- Copy `.env.example` to `.env`
- Fill in your MongoDB connection string

**"CJ API authentication failed"**
- Check `CJ_API_KEY` in `.env`
- Verify key is valid in CJ Dashboard

**"CORS error"**
- Add your frontend URL to `CORS_ORIGINS`
- Format: comma-separated, no spaces

**"Module not found"**
- Run `pip install -r requirements.txt`
- Check Python version (3.10+)

---

## 📝 License

Proprietary - All rights reserved © 2025 Auraa Luxury

---

## 📞 Support

For issues or questions:
- Check documentation: `/docs`
- Review logs: `/var/log/supervisor/backend.err.log`
- Contact: info.auraaluxury@gmail.com

---

**Built with FastAPI, MongoDB, and ❤️**
