# AliExpress S2S Tracking System

## 📋 Overview

This document describes the AliExpress Server-to-Server (S2S) tracking implementation for Auraa Luxury store. The system tracks conversions and clicks from AliExpress affiliate links.

---

## 🎯 Features

### 1. Conversion Tracking (`/api/postback`)
- Receives postback notifications from AliExpress when orders are paid
- Stores conversion data in MongoDB
- Tracks commission and revenue
- Links conversions to click_id for attribution

### 2. Click Tracking (`/api/out`)
- Generates unique click_id for each affiliate link click
- Tracks user information (IP, user agent, country)
- Redirects to AliExpress with injected click_id
- Enables conversion attribution

### 3. Admin Analytics
- View all conversions with filtering
- Track click-to-conversion rates
- Revenue and commission reporting
- Country-based analytics

---

## 🔧 API Endpoints

### **GET `/api/postback`**

Receives conversion data from AliExpress.

**Query Parameters:**
- `order_id` (required): AliExpress order ID
- `order_amount` (required): Order amount in USD
- `commission_fee` (required): Commission fee in USD
- `country` (required): 2-letter country code
- `item_id` (required): Product/item ID
- `order_platform` (required): Platform (mobile/web)
- `source` (optional): Traffic source identifier
- `click_id` (optional): Click tracking ID

**Response:** `OK` (200) or `ERR` (500)

**Example:**
```bash
curl "https://auraaluxury.com/api/postback?order_id=123456&order_amount=59.9&commission_fee=5.2&country=SA&item_id=9876&order_platform=mobile&source=auraa_luxury"
```

---

### **GET `/api/out`**

Tracks click and redirects to AliExpress.

**Query Parameters:**
- `url` (required): AliExpress affiliate URL
- `product_id` (optional): Internal product ID

**Response:** 302 Redirect to AliExpress with click_id

**Example:**
```bash
# Frontend usage:
<a href="/api/out?url=https://www.aliexpress.com/item/12345.html?aff_fcid=xxx">
  Buy Now
</a>
```

---

### **GET `/api/admin/conversions`** 🔒 Admin Only

Get conversion tracking data.

**Query Parameters:**
- `limit` (optional, default: 50, max: 500)
- `skip` (optional, default: 0)
- `order_id` (optional): Filter by order ID
- `country` (optional): Filter by country code
- `from_date` (optional): ISO date string
- `to_date` (optional): ISO date string

**Response:**
```json
{
  "success": true,
  "conversions": [...],
  "total": 150,
  "statistics": {
    "total_orders": 150,
    "total_revenue": 8950.50,
    "total_commission": 895.05,
    "avg_order_value": 59.67
  }
}
```

---

### **GET `/api/admin/clicks`** 🔒 Admin Only

Get click tracking data.

**Query Parameters:**
- `limit` (optional, default: 50, max: 500)
- `skip` (optional, default: 0)
- `converted_only` (optional): Show only converted clicks

**Response:**
```json
{
  "success": true,
  "clicks": [...],
  "total": 500,
  "statistics": {
    "total_clicks": 500,
    "converted_clicks": 75,
    "conversion_rate": 15.0
  }
}
```

---

## 🔐 AliExpress Configuration

### S2S Postback Setup in AliExpress Portals:

1. Go to **AliExpress Portals** → **Tools** → **S2S Tracking**
2. Click **Create S2S**
3. Configure:
   - **S2S URL:** `https://auraaluxury.com/api/postback`
   - **Message Type:** Order Payment
   - **Currency:** Dollar
   
4. **Configuration Parameters (GET):**
   ```
   order_id={order_id}
   order_amount={order_amount}
   commission_fee={commission_fee}
   country={country}
   item_id={item_id}
   order_platform={order_platform}
   ```

5. **Fixed Parameters:**
   ```
   source=auraa_luxury
   ```

6. Click **Preview** to test the URL format
7. Click **Test** to send a test postback
8. Save configuration

---

## 📊 Database Schema

### Collection: `ae_conversions`

```javascript
{
  "_id": ObjectId,
  "order_id": "123456789",
  "order_amount": 59.90,
  "commission_fee": 5.20,
  "country": "SA",
  "item_id": "9876543210",
  "order_platform": "mobile",
  "source": "auraa_luxury",
  "click_id": "abc123_1234567890",
  "raw": { /* full query params */ },
  "received_at": ISODate("2024-01-15T10:30:00Z")
}
```

### Collection: `ae_clicks`

```javascript
{
  "_id": ObjectId,
  "click_id": "abc123_1234567890",
  "product_id": "prod_123",
  "affiliate_url": "https://aliexpress.com/...",
  "user_agent": "Mozilla/5.0...",
  "ip_address": "192.168.1.1",
  "country": "SA",
  "created_at": ISODate("2024-01-15T10:25:00Z"),
  "converted": true,
  "conversion_id": "123456789",
  "converted_at": ISODate("2024-01-15T10:30:00Z")
}
```

---

## 🚀 Implementation Guide

### Step 1: Backend (Already Implemented)
- ✅ Endpoints added to `server.py`
- ✅ MongoDB collections configured
- ✅ Logging and error handling

### Step 2: Frontend Integration

**Replace direct AliExpress links with tracked links:**

Before:
```jsx
<a href={product.aliexpress_url}>Buy Now</a>
```

After:
```jsx
<a href={`/api/out?url=${encodeURIComponent(product.aliexpress_url)}&product_id=${product.id}`}>
  Buy Now
</a>
```

### Step 3: Admin Dashboard (Optional)

Create admin page to view conversions:

```jsx
// pages/admin/AliExpressConversions.js
const ConversionsPage = () => {
  const [conversions, setConversions] = useState([]);
  
  useEffect(() => {
    fetch('/api/admin/conversions')
      .then(res => res.json())
      .then(data => setConversions(data.conversions));
  }, []);
  
  return (
    <div>
      <h1>AliExpress Conversions</h1>
      {/* Display conversions table */}
    </div>
  );
};
```

---

## 🧪 Testing

### Test Postback (Local):
```bash
curl "http://localhost:8001/api/postback?order_id=TEST123&order_amount=100&commission_fee=10&country=SA&item_id=999&order_platform=web&source=test"
```

### Test Click Tracking (Local):
```bash
curl -L "http://localhost:8001/api/out?url=https://www.aliexpress.com/item/12345.html"
```

### Test Admin Endpoints:
```bash
# Get conversions
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:8001/api/admin/conversions?limit=10"

# Get clicks
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:8001/api/admin/clicks?limit=10"
```

---

## 📈 Analytics & Reporting

### Key Metrics:
- **Total Orders:** Count of successful conversions
- **Total Revenue:** Sum of all order_amount
- **Total Commission:** Sum of all commission_fee
- **Average Order Value:** Total revenue / Total orders
- **Click-to-Conversion Rate:** (Converted clicks / Total clicks) × 100
- **Revenue by Country:** Group conversions by country
- **Commission by Product:** Group conversions by item_id

### MongoDB Aggregation Examples:

**Revenue by Country:**
```javascript
db.ae_conversions.aggregate([
  {
    $group: {
      _id: "$country",
      total_revenue: { $sum: "$order_amount" },
      total_orders: { $sum: 1 }
    }
  },
  { $sort: { total_revenue: -1 } }
])
```

**Daily Conversions:**
```javascript
db.ae_conversions.aggregate([
  {
    $group: {
      _id: {
        $dateToString: { format: "%Y-%m-%d", date: "$received_at" }
      },
      orders: { $sum: 1 },
      revenue: { $sum: "$order_amount" }
    }
  },
  { $sort: { _id: -1 } }
])
```

---

## 🔒 Security

### Current Implementation:
- ✅ HTTPS enforced (Vercel/Emergent automatic)
- ✅ All postbacks logged
- ✅ Admin endpoints require authentication
- ✅ Input validation on all parameters

### Future Enhancements:
1. **Signature Verification:**
   - Add `sig` parameter to Fixed Parameters in AliExpress
   - Verify signature on each postback
   
2. **Rate Limiting:**
   - Limit postback requests per IP
   - Prevent abuse

3. **IP Whitelist:**
   - Only accept postbacks from AliExpress IPs

---

## 🔄 Future Integrations

### 1. Facebook Conversions API
Send conversions to Facebook for ROAS tracking:
```python
# In postback handler
await send_to_facebook_capi({
    "event_name": "Purchase",
    "event_time": int(time.time()),
    "user_data": {...},
    "custom_data": {
        "value": order_amount,
        "currency": "USD"
    }
})
```

### 2. Google Analytics 4
Track conversions in GA4:
```python
await send_to_ga4({
    "name": "purchase",
    "params": {
        "transaction_id": order_id,
        "value": order_amount,
        "currency": "USD"
    }
})
```

### 3. TikTok Events API
Similar integration for TikTok ads tracking.

---

## 📝 Maintenance

### Regular Tasks:
1. **Monitor Logs:** Check for failed postbacks
2. **Clean Old Data:** Archive clicks older than 90 days
3. **Verify Conversions:** Cross-check with AliExpress reports
4. **Update Statistics:** Generate monthly reports

### Log Files:
- Backend logs: Check for "AliExpress conversion" entries
- Error logs: Monitor "Error processing AliExpress postback"

---

## ❓ Troubleshooting

### Issue: Postbacks not received
- ✅ Check S2S configuration in AliExpress Portals
- ✅ Verify URL is correct: `https://auraaluxury.com/api/postback`
- ✅ Test with Preview/Test buttons in AliExpress
- ✅ Check backend logs for incoming requests

### Issue: Conversions not linking to clicks
- ✅ Ensure click_id is passed in postback
- ✅ Verify click_id format in AliExpress URL
- ✅ Check ae_clicks collection for matching click_id

### Issue: 500 errors on postback
- ✅ Check backend logs for exceptions
- ✅ Verify MongoDB connection
- ✅ Ensure all required parameters are sent

---

## 📞 Support

For issues or questions:
- Check logs: `/var/log/supervisor/backend.*.log`
- MongoDB: Use Compass to inspect `ae_conversions` and `ae_clicks`
- Test locally before deploying to production

---

## ✅ Checklist

Before going live:
- [ ] S2S configured in AliExpress Portals
- [ ] Test postback sent successfully
- [ ] Frontend links updated to use `/api/out`
- [ ] Admin dashboard tested
- [ ] Logs monitored
- [ ] MongoDB indexes created for performance

**Recommended Indexes:**
```javascript
db.ae_conversions.createIndex({ "order_id": 1 })
db.ae_conversions.createIndex({ "received_at": -1 })
db.ae_conversions.createIndex({ "country": 1 })
db.ae_clicks.createIndex({ "click_id": 1 }, { unique: true })
db.ae_clicks.createIndex({ "created_at": -1 })
```

---

**System Status:** ✅ Production Ready
**Last Updated:** 2024-10-13
**Version:** 1.0
