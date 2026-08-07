# Cloudflare Setup for AuraaLuxury.com - Complete Configuration
# إعداد Cloudflare الشامل لـ auraaluxury.com

## 🎯 Architecture Overview

```
Frontend (React):     auraaluxury.com, www.auraaluxury.com → Vercel
Backend (FastAPI):    api.auraaluxury.com → Render
Email (Mailgun):      MX, SPF, DKIM → Mailgun servers
CDN & Security:       Cloudflare (proxy + protection)
```

---

## 📋 Step 1: Cloudflare Account Setup

### 1.1 Add Domain to Cloudflare

```
1. Go to: https://dash.cloudflare.com
2. Click "Add a Site"
3. Enter: auraaluxury.com
4. Select: Free Plan
5. Click "Add Site"
```

**Expected Result:**
- Cloudflare will scan existing DNS records
- You'll see a list of detected records

---

## 🌐 Step 2: DNS Records Configuration

### 2.1 Frontend Records (Vercel)

**Get Vercel IP/CNAME:**
1. Go to Vercel Dashboard → Project Settings
2. Domains → Add Domain: auraaluxury.com
3. Vercel will show you either:
   - IP address (for A record)
   - OR CNAME target (cname.vercel-dns.com)

**In Cloudflare DNS:**

**Option A: Using A Record (if Vercel gives IP)**
```
Type: A
Name: @
Content: [Vercel IP address]
Proxy status: Proxied (☁️ orange)
TTL: Auto
```

```
Type: CNAME
Name: www
Content: cname.vercel-dns.com
Proxy status: Proxied (☁️ orange)
TTL: Auto
```

**Option B: Using CNAME for both (recommended)**
```
Type: CNAME
Name: @
Content: cname.vercel-dns.com
Proxy status: Proxied (☁️ orange)
TTL: Auto

Type: CNAME
Name: www
Content: cname.vercel-dns.com
Proxy status: Proxied (☁️ orange)
TTL: Auto
```

### 2.2 Backend Records (Render API)

**Get Render URL:**
1. Go to Render Dashboard
2. Select your backend service
3. Settings → Custom Domains
4. Note the URL: `your-service-name.onrender.com`

**In Cloudflare DNS:**

```
Type: CNAME
Name: api
Content: [your-service-name].onrender.com
Proxy status: Proxied (☁️ orange)
TTL: Auto
```

**Example:**
```
Type: CNAME
Name: api
Content: auraa-backend.onrender.com
Proxy status: Proxied (☁️ orange)
TTL: Auto
```

### 2.3 Email Records (Mailgun - CRITICAL!)

**⚠️ All email records MUST be DNS Only (gray cloud)**

**MX Records:**
```
Type: MX
Name: @
Priority: 10
Mail Server: mxa.mailgun.org
Proxy status: DNS Only (☁️ gray)
TTL: Auto

Type: MX
Name: @
Priority: 10
Mail Server: mxb.mailgun.org
Proxy status: DNS Only (☁️ gray)
TTL: Auto
```

**SPF Record:**
```
Type: TXT
Name: @
Content: v=spf1 include:mailgun.org ~all
Proxy status: DNS Only (☁️ gray)
TTL: Auto
```

**DKIM Record:**
```
Type: TXT
Name: [key from Mailgun Dashboard]
Example: k1._domainkey or smtp._domainkey
Content: [DKIM value from Mailgun]
Proxy status: DNS Only (☁️ gray)
TTL: Auto
```

**How to get DKIM:**
1. Go to: https://app.mailgun.com
2. Sending → Domains → auraaluxury.com
3. DNS Records → Copy DKIM record

**DMARC Record:**
```
Type: TXT
Name: _dmarc
Content: v=DMARC1; p=none; rua=mailto:info@auraaluxury.com
Proxy status: DNS Only (☁️ gray)
TTL: Auto
```

### 2.4 Other Records

**Google Verification (if needed):**
```
Type: TXT
Name: @
Content: google-site-verification=[your-code]
Proxy status: DNS Only (☁️ gray)
TTL: Auto
```

---

## 🔒 Step 3: SSL/TLS Configuration

### 3.1 SSL Mode

```
Location: Cloudflare Dashboard → SSL/TLS → Overview

Setting: Full (strict)
✅ This ensures end-to-end encryption
```

**Why Full (strict)?**
- Both Vercel and Render provide SSL certificates
- Full (strict) validates the origin certificate
- Most secure option

### 3.2 Edge Certificates

```
Location: SSL/TLS → Edge Certificates

Settings:
✅ Always Use HTTPS: On
✅ Automatic HTTPS Rewrites: On
✅ Minimum TLS Version: 1.2
✅ Opportunistic Encryption: On
✅ TLS 1.3: On
```

### 3.3 Universal SSL

```
Location: SSL/TLS → Edge Certificates

Status: Should show "Active Certificate"
Type: Universal (Free)
Hosts: auraaluxury.com, *.auraaluxury.com
```

---

## ⚙️ Step 4: Additional Cloudflare Settings

### 4.1 Page Rules (Optional but Recommended)

**Rule 1: Force WWW to Non-WWW (or vice versa)**

```
URL Pattern: www.auraaluxury.com/*
Setting: Forwarding URL
Status Code: 301 - Permanent Redirect
Destination: https://auraaluxury.com/$1
```

**Rule 2: API CORS (if needed)**

```
URL Pattern: api.auraaluxury.com/*
Settings:
- Cache Level: Bypass
- Browser Cache TTL: Respect Existing Headers
```

### 4.2 Speed Optimization

```
Location: Speed → Optimization

Settings:
✅ Auto Minify: JavaScript, CSS, HTML
✅ Brotli: On
✅ Early Hints: On
❌ Rocket Loader: Off (can break React)
```

### 4.3 Caching

```
Location: Caching → Configuration

Settings:
- Caching Level: Standard
- Browser Cache TTL: 4 hours
✅ Always Online: On
```

### 4.4 Security

```
Location: Security → Settings

Settings:
- Security Level: Medium
- Challenge Passage: 30 minutes
✅ Browser Integrity Check: On
```

---

## 🔄 Step 5: Update Nameservers at Squarespace

### 5.1 Get Cloudflare Nameservers

After adding the site to Cloudflare, you'll be given 2 nameservers:

```
Example:
arvind.ns.cloudflare.com
shubhi.ns.cloudflare.com
```

**Note:** Your actual nameservers will be different - use the ones Cloudflare provides!

### 5.2 Update in Squarespace

```
1. Log in to Squarespace
2. Go to: Settings → Domains
3. Click on: auraaluxury.com
4. Advanced Settings → Nameservers
5. Select: "Use Custom Nameservers"
6. Enter the 2 Cloudflare nameservers
7. Save Changes
```

### 5.3 Wait for DNS Propagation

```
Time: 5 minutes - 24 hours
Average: 1-4 hours
Check: https://dnschecker.org
```

---

## 🎨 Step 6: Configure Vercel

### 6.1 Add Custom Domain

```
1. Go to Vercel Dashboard
2. Select your project (Auraa Luxury frontend)
3. Settings → Domains
4. Add Domain: auraaluxury.com
5. Add Domain: www.auraaluxury.com
```

### 6.2 Verify Configuration

Vercel will check DNS records and show:
```
✅ auraaluxury.com - Valid Configuration
✅ www.auraaluxury.com - Valid Configuration
```

### 6.3 SSL Certificate

Vercel will automatically:
- Generate SSL certificate
- Configure HTTPS
- Set up redirects

---

## 🔧 Step 7: Configure Render

### 7.1 Add Custom Domain

```
1. Go to Render Dashboard
2. Select your backend service
3. Settings → Custom Domains
4. Click "Add Custom Domain"
5. Enter: api.auraaluxury.com
6. Save
```

### 7.2 Verify DNS

Render will show:
```
Status: Awaiting DNS configuration
Expected: CNAME pointing to [your-service].onrender.com
```

After DNS propagation (1-4 hours):
```
Status: ✅ Active
SSL: ✅ Certificate Issued
```

---

## 🧪 Step 8: Testing & Verification

### Test 1: Frontend Access

**URLs to test:**
```bash
# Main domain
curl -I https://auraaluxury.com
# Expected: 200 OK, SSL valid

# WWW domain
curl -I https://www.auraaluxury.com
# Expected: 200 OK or 301 redirect

# HTTP redirect
curl -I http://auraaluxury.com
# Expected: 301/302 → https://auraaluxury.com
```

**Browser test:**
```
✓ Visit: https://auraaluxury.com
✓ Check: Green lock icon (SSL valid)
✓ Check: Site loads correctly
✓ Check: All images/assets load
```

### Test 2: Backend API Access

**Test API endpoint:**
```bash
# Health check (if you have one)
curl https://api.auraaluxury.com/health
# or
curl https://api.auraaluxury.com/api/products

# Expected: Valid JSON response
```

**From frontend:**
```javascript
// Test API call from browser console
fetch('https://api.auraaluxury.com/api/products')
  .then(r => r.json())
  .then(data => console.log(data))
  
// Expected: Products data returned
```

### Test 3: Email Functionality

**Test Incoming (Mailgun):**
```
1. Send email to: info@auraaluxury.com
2. From: your personal email
3. Subject: "Test Cloudflare setup"
4. Check: Email arrives in Gmail inbox
```

**Test Outgoing (Gmail SMTP):**
```
1. Register new account on site
2. Check: Welcome email received
3. Try: Forgot password
4. Check: Reset email received
5. Submit: Contact form
6. Check: Auto-reply received
```

**Verify DNS:**
```bash
# Check MX records
nslookup -type=mx auraaluxury.com
# Expected: mxa.mailgun.org, mxb.mailgun.org

# Check SPF
nslookup -type=txt auraaluxury.com | grep spf
# Expected: v=spf1 include:mailgun.org ~all
```

### Test 4: SSL Grade

```
Tool: https://www.ssllabs.com/ssltest/
Domain: auraaluxury.com

Expected Results:
✓ Overall Rating: A or A+
✓ Certificate: Valid
✓ Protocol Support: TLS 1.2, TLS 1.3
✓ No vulnerabilities
```

### Test 5: DNS Propagation

```
Tool: https://dnschecker.org
Domain: auraaluxury.com
Types to check:
- NS (Nameservers) → Cloudflare NS
- A (or CNAME) → Vercel
- CNAME (api) → Render
- MX → Mailgun

Expected: 80%+ green checkmarks globally
```

### Test 6: Performance

```
Tool: https://pagespeed.web.dev
URL: https://auraaluxury.com

Targets:
- Mobile: 80+ score
- Desktop: 90+ score
- Core Web Vitals: All green
```

### Test 7: Functionality

**Complete user flow:**
```
✓ Homepage loads
✓ Browse products
✓ View product details
✓ Add to cart
✓ Update cart quantity
✓ Proceed to checkout
✓ Place order (test mode)
✓ Check order confirmation email
✓ Login to account
✓ View orders in profile
✓ Admin panel access (if applicable)
```

---

## 📊 Environment Variables Update

### Frontend (.env in Vercel)

```env
# Update backend URL to use api subdomain
REACT_APP_BACKEND_URL=https://api.auraaluxury.com

# Other variables remain same
REACT_APP_GA_MEASUREMENT_ID=G-C44D1325QM
```

**How to update in Vercel:**
```
1. Vercel Dashboard → Project Settings
2. Environment Variables
3. Edit REACT_APP_BACKEND_URL
4. Value: https://api.auraaluxury.com
5. Save
6. Redeploy (Settings → Deployments → Latest → Redeploy)
```

### Backend (.env in Render)

```env
# CORS should allow frontend domains
CORS_ORIGINS=https://auraaluxury.com,https://www.auraaluxury.com

# Other variables remain same
MONGODB_URI=...
SMTP_HOST=smtp.gmail.com
# etc.
```

**How to update in Render:**
```
1. Render Dashboard → Service
2. Environment → Add Environment Variable
3. Key: CORS_ORIGINS
4. Value: https://auraaluxury.com,https://www.auraaluxury.com
5. Save (will auto-redeploy)
```

---

## 🔍 Monitoring & Analytics

### Cloudflare Analytics

```
Location: Dashboard → Analytics

Metrics to monitor:
- Total Requests
- Bandwidth Usage
- Threats Blocked
- Status Codes (should be mostly 200s)
- Countries (traffic sources)
```

### Vercel Analytics

```
Location: Vercel Dashboard → Analytics

Metrics:
- Page Views
- Unique Visitors
- Top Pages
- Devices (mobile/desktop split)
```

### Render Metrics

```
Location: Render Dashboard → Metrics

Metrics:
- CPU Usage
- Memory Usage
- Response Time
- Request Count
```

---

## ⚠️ Troubleshooting Common Issues

### Issue 1: Site Not Loading After NS Change

**Symptoms:**
- auraaluxury.com doesn't load
- DNS_PROBE_FINISHED_NXDOMAIN error

**Solution:**
```
1. Wait 1-2 hours (DNS propagation)
2. Clear DNS cache:
   - Windows: ipconfig /flushdns
   - Mac: sudo dscacheutil -flushcache
3. Check DNS: nslookup auraaluxury.com
4. Try different network or use mobile data
5. Check Cloudflare Dashboard → DNS for errors
```

### Issue 2: API Calls Failing (CORS)

**Symptoms:**
- Frontend can't connect to api.auraaluxury.com
- CORS error in browser console

**Solution:**
```python
# In backend server.py, update CORS:

from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://auraaluxury.com",
        "https://www.auraaluxury.com",
        "http://localhost:3000"  # for development
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**Then redeploy backend on Render**

### Issue 3: SSL Certificate Error

**Symptoms:**
- "Not Secure" warning
- Certificate invalid

**Solution:**
```
1. Check SSL mode: Full (strict)
2. Wait 10-15 minutes for certificate generation
3. Verify in Vercel:
   - Settings → Domains → SSL should show "Secured"
4. Verify in Render:
   - Settings → Custom Domains → SSL should show "Active"
5. Clear browser SSL cache:
   - Chrome: chrome://net-internals/#hsts
   - Delete domain security policies
```

### Issue 4: Email Not Working

**Symptoms:**
- Emails to info@auraaluxury.com bounce

**Solution:**
```
1. Check MX records in Cloudflare:
   - Must be DNS Only (gray cloud)
   - mxa.mailgun.org and mxb.mailgun.org

2. Verify with MXToolbox:
   https://mxtoolbox.com/SuperTool.aspx?action=mx%3aauraaluxury.com

3. Check Mailgun Dashboard:
   - Sending → Domains → auraaluxury.com
   - Status should be "Active"

4. Wait 1-2 hours for DNS propagation
```

### Issue 5: Slow Performance

**Symptoms:**
- Site loads slowly
- High TTFB (Time To First Byte)

**Solution:**
```
Cloudflare Settings:
1. Speed → Optimization:
   - Enable all minification
   - Enable Brotli
   - Disable Rocket Loader (if using React)

2. Caching → Configuration:
   - Standard caching level
   - Browser cache TTL: 4 hours

3. Page Rules:
   - Cache static assets aggressively
   - Bypass cache for /api/*

4. Check Vercel deployment:
   - Latest build should be optimized
   - Check build logs for warnings
```

---

## 📋 Complete DNS Records Checklist

```
Frontend (Proxied ☁️ orange):
[ ] A or CNAME @ → Vercel
[ ] CNAME www → Vercel

Backend (Proxied ☁️ orange):
[ ] CNAME api → Render

Email (DNS Only ☁️ gray):
[ ] MX @ → mxa.mailgun.org (Priority 10)
[ ] MX @ → mxb.mailgun.org (Priority 10)
[ ] TXT @ → SPF record
[ ] TXT [key]._domainkey → DKIM record
[ ] TXT _dmarc → DMARC record

Other (DNS Only ☁️ gray):
[ ] TXT @ → Google verification (if needed)
```

---

## 🎯 Success Criteria

Migration is successful when:

```
Frontend:
✅ https://auraaluxury.com loads
✅ https://www.auraaluxury.com loads (or redirects)
✅ SSL certificate valid (green lock)
✅ All pages functional
✅ Images/assets load correctly

Backend:
✅ https://api.auraaluxury.com/api/[endpoint] works
✅ Frontend can call API successfully
✅ CORS configured correctly
✅ SSL certificate valid

Email:
✅ Incoming: Emails to info@auraaluxury.com arrive
✅ Outgoing: Welcome/contact/reset emails sent
✅ SPF/DKIM/DMARC pass validation

Performance:
✅ PageSpeed > 80 (mobile), > 90 (desktop)
✅ SSL Labs grade A or A+
✅ No console errors
✅ Fast load times (<3s)

Cloudflare:
✅ Analytics showing traffic
✅ No errors in dashboard
✅ DNS all active
✅ SSL active
```

---

## 📞 Support Resources

**Cloudflare:**
- Docs: https://developers.cloudflare.com
- Community: https://community.cloudflare.com
- Status: https://www.cloudflarestatus.com

**Vercel:**
- Docs: https://vercel.com/docs
- Support: https://vercel.com/support
- Status: https://www.vercel-status.com

**Render:**
- Docs: https://render.com/docs
- Support: https://render.com/support
- Status: https://status.render.com

**Mailgun:**
- Docs: https://documentation.mailgun.com
- Support: https://www.mailgun.com/support
- Status: https://status.mailgun.com

---

**Created:** 2025-10-14
**Status:** Ready for Implementation
**Architecture:** Vercel (Frontend) + Render (Backend) + Cloudflare (CDN) + Mailgun (Email)

🚀 **Ready to deploy!**
