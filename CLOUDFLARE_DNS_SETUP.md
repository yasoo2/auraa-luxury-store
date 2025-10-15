# Cloudflare DNS Configuration for AuraaLuxury.com

## Prerequisites
✅ Nameservers already updated to Cloudflare
✅ Domain: auraaluxury.com
✅ Frontend: Deployed on Vercel
✅ Backend API: Deployed on Render

---

## Step 1: DNS Records Configuration

### Required DNS Records

#### 1. Root Domain (auraaluxury.com) - Frontend
```
Type: A
Name: @ (or auraaluxury.com)
Content: 76.76.21.21
Proxy status: Proxied (Orange Cloud ON)
TTL: Auto
```

#### 2. WWW Subdomain - Frontend
```
Type: CNAME
Name: www
Content: cname.vercel-dns.com
Proxy status: Proxied (Orange Cloud ON)
TTL: Auto
```

#### 3. API Subdomain (api.auraaluxury.com) - Backend
```
Type: CNAME
Name: api
Content: [YOUR-RENDER-APP].onrender.com
Proxy status: Proxied (Orange Cloud ON)
TTL: Auto
```
⚠️ **Replace `[YOUR-RENDER-APP]` with your actual Render backend URL**
Example: `auraa-luxury-store.onrender.com`

---

### Email DNS Records (Keep Existing)

If you're using Mailgun or Gmail SMTP, keep these records:

#### MX Records
```
Type: MX
Name: @ (or auraaluxury.com)
Mail server: [Your mail server - e.g., mxa.mailgun.org]
Priority: 10
Proxy status: DNS only (Grey Cloud)
```

#### SPF Record
```
Type: TXT
Name: @
Content: v=spf1 include:mailgun.org include:_spf.google.com ~all
Proxy status: DNS only (Grey Cloud)
```

#### DKIM Record
```
Type: TXT
Name: [provided by your email service]
Content: [DKIM key provided by your email service]
Proxy status: DNS only (Grey Cloud)
```

#### DMARC Record
```
Type: TXT
Name: _dmarc
Content: v=DMARC1; p=none; rua=mailto:admin@auraaluxury.com
Proxy status: DNS only (Grey Cloud)
```

---

## Step 2: Cloudflare Settings Configuration

### SSL/TLS Settings

1. **Navigate to**: SSL/TLS → Overview
   ```
   SSL/TLS encryption mode: Full (strict)
   ```

2. **Navigate to**: SSL/TLS → Edge Certificates
   - ✅ Always Use HTTPS: **ON**
   - ✅ Automatic HTTPS Rewrites: **ON**
   - ✅ Minimum TLS Version: **TLS 1.2**
   - ✅ Opportunistic Encryption: **ON**
   - ✅ TLS 1.3: **ON**

---

### Speed Settings

**Navigate to**: Speed → Optimization

1. **Auto Minify**:
   - ✅ JavaScript: **ON**
   - ✅ CSS: **ON**
   - ✅ HTML: **ON**

2. **Rocket Loader**: **OFF**
   (Can interfere with React applications)

3. **Brotli**: **ON**

---

### Caching Configuration

**Navigate to**: Caching → Configuration

1. **Caching Level**: Standard

2. **Browser Cache TTL**: Respect Existing Headers

---

### Page Rules (Critical for API)

**Navigate to**: Rules → Page Rules → Create Page Rule

#### Rule 1: Bypass Cache for API Routes
```
URL Pattern: api.auraaluxury.com/*
Settings:
  - Cache Level: Bypass
  - Disable Performance
Priority: 1 (Highest)
```

**How to Configure:**
1. Click "Create Page Rule"
2. Enter URL: `api.auraaluxury.com/*`
3. Add Setting → Choose "Cache Level" → Select "Bypass"
4. Save and Deploy

---

### Security Settings

**Navigate to**: Security → Settings

1. **Security Level**: Medium
2. **Bot Fight Mode**: ON
3. **Challenge Passage**: 30 minutes

---

## Step 3: Vercel Configuration

### Update Vercel Project Domains

1. Go to your Vercel project settings
2. Navigate to **Domains**
3. Add these domains:
   - `auraaluxury.com`
   - `www.auraaluxury.com`

4. Vercel will provide DNS verification:
   - For root domain: A record pointing to `76.76.21.21`
   - For www: CNAME pointing to `cname.vercel-dns.com`

---

## Step 4: Render Configuration

### Update Render Custom Domain

1. Go to your Render dashboard
2. Select your backend service
3. Navigate to **Settings** → **Custom Domains**
4. Add: `api.auraaluxury.com`
5. Render will provide a CNAME target (e.g., `yourapp.onrender.com`)

---

## Step 5: Environment Variables Verification

### Frontend Environment (.env)
```env
REACT_APP_BACKEND_URL=https://api.auraaluxury.com
```

### Backend Environment (.env)
```env
CORS_ORIGINS="https://auraaluxury.com,https://www.auraaluxury.com"
```

✅ **Already updated in the codebase**

---

## Step 6: Testing & Verification

### DNS Propagation Check
```bash
# Check root domain
dig auraaluxury.com

# Check www subdomain
dig www.auraaluxury.com

# Check API subdomain
dig api.auraaluxury.com
```

### SSL Certificate Verification
```bash
# Check SSL certificate
curl -I https://auraaluxury.com
curl -I https://www.auraaluxury.com
curl -I https://api.auraaluxury.com
```

### API Connectivity Test
```bash
# Test backend API
curl https://api.auraaluxury.com/api/categories
```

### Browser Tests
1. Visit `https://auraaluxury.com` - Should load frontend
2. Visit `https://www.auraaluxury.com` - Should redirect to root or load frontend
3. Open browser DevTools → Network tab
4. Navigate through the site
5. Verify API calls go to `https://api.auraaluxury.com/api/*`

---

## Step 7: Google Analytics & Search Console

### Update GA4 Configuration
- Verify GA4 is tracking the new domain
- Update any hardcoded URLs in GA4 settings

### Google Search Console Verification

**Method 1: DNS TXT Record (Recommended)**
1. Go to Google Search Console
2. Add property: `auraaluxury.com`
3. Choose "DNS record" verification method
4. Google will provide a TXT record
5. Add to Cloudflare DNS:
   ```
   Type: TXT
   Name: @
   Content: google-site-verification=[YOUR-CODE]
   Proxy status: DNS only
   ```

**Method 2: HTML File Upload**
1. Download verification file from GSC
2. Upload to Vercel's `public` folder
3. Verify at `https://auraaluxury.com/google[verification].html`

---

## Troubleshooting

### Issue: "Mixed Content" Errors
**Solution**: Ensure all resources (images, scripts) use HTTPS

### Issue: API Calls Failing
**Solution**: 
1. Check CORS settings in backend
2. Verify Page Rule for cache bypass
3. Check Render custom domain status

### Issue: SSL Certificate Not Working
**Solution**:
1. Set SSL/TLS mode to "Full (strict)"
2. Wait for Cloudflare's Universal SSL (up to 24 hours)
3. Verify Render has SSL enabled

### Issue: 502 Bad Gateway
**Solution**:
1. Check Render backend is running
2. Verify DNS CNAME points to correct Render URL
3. Check Render logs for errors

---

## Post-Migration Checklist

- [ ] DNS records added in Cloudflare
- [ ] SSL/TLS set to Full (strict)
- [ ] Always Use HTTPS enabled
- [ ] Page Rule for API cache bypass created
- [ ] Vercel domains configured
- [ ] Render custom domain added
- [ ] Frontend loads at https://auraaluxury.com
- [ ] API responds at https://api.auraaluxury.com/api/*
- [ ] Email (MX/SPF/DKIM/DMARC) records preserved
- [ ] Google Search Console verified
- [ ] GA4 tracking new domain

---

## Support & Next Steps

### If Everything Works:
1. Monitor Cloudflare Analytics
2. Set up Cloudflare Alerts
3. Review security settings
4. Consider enabling additional Cloudflare features (Argo, Image Optimization)

### If Issues Persist:
1. Check Cloudflare DNS propagation (can take 24-48 hours)
2. Review Render and Vercel deployment logs
3. Verify environment variables are correctly set
4. Test API endpoints directly using curl

---

**Last Updated**: 2025-01-28
**Status**: Ready for Implementation
