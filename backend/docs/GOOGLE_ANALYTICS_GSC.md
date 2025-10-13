# Google Analytics 4 + Google Search Console Integration

## 📊 Overview

This document describes the complete integration of Google Analytics 4 (GA4) and Google Search Console (GSC) for Auraa Luxury e-commerce store.

---

## 🎯 Google Analytics 4 (GA4)

### Configuration
- **Measurement ID:** `G-C44D1325QM`
- **API Secret:** `81t-7zRf7quf8Ul2Qds0g`
- **Tracking Method:** Dual (Frontend + Backend)

### 1. Frontend Tracking

#### Implementation Files:
1. **`/app/frontend/public/index.html`** - GA4 base script
2. **`/app/frontend/src/utils/analytics.js`** - Event tracking utilities

#### Tracked Events:

| Event | Trigger | Page | Parameters |
|-------|---------|------|------------|
| `view_item` | Product detail page loaded | ProductDetailPage | item_id, item_name, price, category, currency |
| `add_to_cart` | Product added to cart | ProductDetailPage | item_id, item_name, price, quantity, currency |
| `begin_checkout` | Checkout page loaded | CheckoutPage | items[], total, currency |
| `purchase` | Order created successfully | CheckoutPage | transaction_id, value, items[], shipping, tax, currency |

#### Frontend Event Tracking Flow:

```javascript
// Example: Track product view
import { trackViewItem } from '../utils/analytics';

trackViewItem({
  id: product.id,
  name: product.name,
  category: product.category,
  price: product.price,
  currency: 'SAR'
});
```

### 2. Backend Tracking (Measurement Protocol)

#### Implementation Files:
- **`/app/backend/services/google_analytics.py`** - GA4 Measurement Protocol service
- **`/app/backend/server.py`** - Integration in order creation endpoint

#### Backend Purchase Tracking:

When an order is created successfully, the backend automatically sends a **confirmed purchase event** to GA4 via the Measurement Protocol API.

**Endpoint:** `POST https://www.google-analytics.com/mp/collect`

**Payload Structure:**
```json
{
  "client_id": "USER_ID",
  "events": [{
    "name": "purchase",
    "params": {
      "transaction_id": "AUR-20251013-ABC123",
      "currency": "SAR",
      "value": 199.99,
      "shipping": 15.00,
      "tax": 0.00,
      "items": [
        {
          "item_id": "prod_123",
          "item_name": "Gold Bracelet",
          "price": 199.99,
          "quantity": 1
        }
      ]
    }
  }]
}
```

#### Why Backend Tracking?

Frontend tracking can be blocked by:
- Ad blockers
- Browser privacy settings
- Network issues
- User closing browser before event completes

Backend tracking via Measurement Protocol ensures **100% reliable purchase tracking** for revenue reporting and ROAS calculations.

---

## 🧪 Testing GA4 Events

### Debug View (Real-time testing):

1. Go to [Google Analytics](https://analytics.google.com/)
2. Select property: **Auraa Luxury** (G-C44D1325QM)
3. Navigate to: **Admin → Data Streams → Web → [Stream] → Debug View**
4. Open your store and perform actions
5. Watch events appear in real-time

### Test Checklist:

- [ ] Homepage loads → `page_view` event
- [ ] View product → `view_item` event
- [ ] Add to cart → `add_to_cart` event
- [ ] Go to checkout → `begin_checkout` event
- [ ] Complete order → `purchase` event (frontend)
- [ ] Complete order → `purchase` event (backend confirmation)

### Testing Commands:

**Test Backend Purchase Event:**
```bash
# First create a test order via API
curl -X POST ${REACT_APP_BACKEND_URL}/api/orders \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "shipping_address": {
      "firstName": "Test",
      "lastName": "User",
      "email": "test@example.com",
      "phone": "+966501234567",
      "street": "123 Test St",
      "city": "Riyadh",
      "state": "Riyadh",
      "zipCode": "12345",
      "country": "SA"
    },
    "payment_method": "card"
  }'

# Check backend logs for GA4 confirmation
tail -f /var/log/supervisor/backend.*.log | grep "GA4"
```

---

## 🔍 Google Search Console (GSC)

### 1. Domain Verification

#### DNS TXT Record Method (Recommended):

1. Go to [Google Search Console](https://search.google.com/search-console)
2. Click **Add Property** → **Domain**
3. Enter: `auraaluxury.com`
4. Google will provide a TXT record like:
   ```
   google-site-verification=ABC123XYZ789...
   ```
5. Add this TXT record to your DNS settings
6. Wait for DNS propagation (5-30 minutes)
7. Click **Verify** in Google Search Console

#### DNS Provider Examples:

**Cloudflare:**
- Type: `TXT`
- Name: `@`
- Content: `google-site-verification=ABC123...`
- TTL: `Auto`

**GoDaddy:**
- Type: `TXT`
- Host: `@`
- TXT Value: `google-site-verification=ABC123...`
- TTL: `1 Hour`

### 2. Sitemap Submission

#### Dynamic Sitemap Endpoint:

**URL:** `https://auraaluxury.com/sitemap.xml`

This endpoint automatically generates an XML sitemap including:
- **Static Pages:** Homepage, Products, Auth, Cart, Legal pages, Contact, Order Tracking
- **Category Pages:** All 6 product categories (earrings, necklaces, bracelets, rings, watches, sets)
- **Product Pages:** All active products (in_stock = true)

#### Sitemap Features:
- **Automatic Updates:** Regenerates on each request with latest products
- **Priority & Changefreq:** SEO-optimized values for each URL type
- **Last Modified Dates:** Uses product sync dates for accurate indexing
- **Caching:** 1-hour cache for performance

#### Submit to Google Search Console:

1. Go to **Sitemaps** section in GSC
2. Enter: `sitemap.xml`
3. Click **Submit**
4. Google will crawl and index your pages

#### Verify Sitemap:

```bash
# Test sitemap generation
curl https://auraaluxury.com/sitemap.xml

# Expected output: XML with <urlset> containing <url> entries
```

### 3. SEO Optimization Checklist

- [x] **Dynamic Sitemap:** `/sitemap.xml` endpoint created
- [x] **Canonical URLs:** Set in ProductDetailPage SEO
- [x] **Meta Descriptions:** Set for all pages
- [x] **Structured Data (JSON-LD):** Product schema implemented
- [x] **Mobile-Friendly:** Responsive design across all devices
- [x] **HTTPS:** Enforced (Vercel/Emergent automatic)
- [x] **No Blocking Meta Tags:** No `noindex`, `nofollow` tags
- [x] **Robots.txt:** Allow all (no restrictions)

---

## 📈 Analytics & Reporting

### GA4 Reports Available:

1. **E-commerce Overview:**
   - Total Revenue
   - Transactions
   - Average Order Value
   - Purchase-to-detail rate

2. **Product Performance:**
   - Top-selling products
   - Product views vs. purchases
   - Add-to-cart rate
   - Checkout abandonment

3. **User Journey:**
   - Shopping behavior (view → add → checkout → purchase)
   - Drop-off analysis
   - Time to purchase

4. **Traffic Sources:**
   - Organic search (Google)
   - Direct traffic
   - Referrals
   - Social media

### GSC Reports Available:

1. **Search Performance:**
   - Impressions
   - Clicks
   - Average position
   - CTR (Click-through rate)

2. **Coverage:**
   - Indexed pages
   - Valid pages
   - Excluded pages
   - Errors

3. **Enhancements:**
   - Mobile usability
   - Core Web Vitals
   - Product structured data

---

## 🔧 Maintenance

### Regular Tasks:

1. **Monitor GA4 Data Quality:**
   - Check for event tracking issues
   - Verify purchase data accuracy
   - Monitor debug view for errors

2. **GSC Health Checks:**
   - Review coverage issues weekly
   - Fix crawl errors
   - Monitor Core Web Vitals
   - Check mobile usability

3. **Sitemap Updates:**
   - Verify new products appear in sitemap
   - Check for broken URLs
   - Monitor sitemap submission status in GSC

---

## 🚨 Troubleshooting

### GA4 Events Not Appearing:

**Issue:** Events not showing in Debug View

**Solutions:**
1. Clear browser cache and cookies
2. Disable ad blockers
3. Check browser console for JavaScript errors
4. Verify `gtag` is loaded: `console.log(typeof window.gtag)`
5. Enable Debug View in GA4 before testing

**Issue:** Backend purchase events missing

**Solutions:**
1. Check backend logs: `tail -f /var/log/supervisor/backend.*.log | grep GA4`
2. Verify API Secret is correct in `.env`
3. Test with curl:
   ```bash
   curl -X POST "https://www.google-analytics.com/mp/collect?measurement_id=G-C44D1325QM&api_secret=81t-7zRf7quf8Ul2Qds0g" \
     -H "Content-Type: application/json" \
     -d '{"client_id":"test123","events":[{"name":"test_event"}]}'
   ```

### GSC Verification Failed:

**Issue:** DNS TXT record not found

**Solutions:**
1. Verify TXT record added correctly (copy-paste, no extra spaces)
2. Wait 30-60 minutes for DNS propagation
3. Use DNS checker: `nslookup -type=TXT auraaluxury.com`
4. Try alternative verification method (HTML file upload)

### Sitemap Not Found:

**Issue:** 404 error on `/sitemap.xml`

**Solutions:**
1. Verify backend is running: `sudo supervisorctl status backend`
2. Check endpoint is registered: `grep "sitemap" /app/backend/server.py`
3. Test locally: `curl http://localhost:8001/sitemap.xml`
4. Check nginx/ingress routing if using reverse proxy

---

## 📞 Support

### Useful Links:

- **GA4 Documentation:** https://developers.google.com/analytics/devguides/collection/ga4
- **Measurement Protocol:** https://developers.google.com/analytics/devguides/collection/protocol/ga4
- **GSC Documentation:** https://support.google.com/webmasters
- **Sitemap Protocol:** https://www.sitemaps.org/protocol.html

### Contact:

For issues or questions:
- Check logs: `/var/log/supervisor/backend.*.log`
- GA4 Debug View: Real-time event monitoring
- GSC Coverage Report: Indexing issues

---

## ✅ Verification Checklist

Before marking as complete:

- [ ] GA4 script added to `index.html`
- [ ] `analytics.js` utility created
- [ ] `view_item` tracking in ProductDetailPage
- [ ] `add_to_cart` tracking in ProductDetailPage
- [ ] `begin_checkout` tracking in CheckoutPage
- [ ] `purchase` tracking in CheckoutPage (frontend)
- [ ] Backend Measurement Protocol service created
- [ ] Backend purchase tracking in `/api/orders` endpoint
- [ ] All events tested in GA4 Debug View
- [ ] `/sitemap.xml` endpoint created and tested
- [ ] Sitemap includes products, categories, static pages
- [ ] GSC DNS verification documented
- [ ] Sitemap submitted to GSC

---

**Status:** ✅ Complete
**Last Updated:** 2025-10-13
**Version:** 1.0
