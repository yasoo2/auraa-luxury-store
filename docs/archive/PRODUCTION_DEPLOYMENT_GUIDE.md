# 🚀 Cloudflare Pages + Render - Complete Deployment Guide

**Last Updated:** 2025-01-21  
**Status:** ✅ Ready for Production Deployment

---

## 📋 Prerequisites Checklist

- [x] GitHub repository: `yasoo2/auraa-luxury-store`
- [x] Cloudflare account with Pages access
- [x] Render account with backend service deployed
- [x] Domain: `auraaluxury.com` added to Cloudflare
- [x] All code changes committed to `main` branch

---

## 🎯 Deployment Overview

This guide will help you deploy:
- **Frontend** → Cloudflare Pages (www.auraaluxury.com)
- **Backend API** → Render (api.auraaluxury.com)
- **DNS** → Cloudflare DNS
- **SSL** → Automatic via Cloudflare

**Total Time:** 15-20 minutes

---

## PART 1: CLOUDFLARE PAGES SETUP

### Step 1: Create/Configure Cloudflare Pages Project

1. Go to: https://dash.cloudflare.com
2. Navigate to: **Workers & Pages**
3. Click **Create application** (or select existing project)
4. Choose **Pages** → **Connect to Git**

### Step 2: Connect GitHub Repository

- **Account:** yasoo2
- **Repository:** auraa-luxury-store
- **Branch:** main

### Step 3: Build Configuration

**OPTION A (Recommended):**
```
Framework preset: None
Root directory: /
Build command: cd frontend && npm ci --legacy-peer-deps && npm run build
Build output directory: frontend/build
```

**OPTION B (Alternative):**
```
Framework preset: None
Root directory: frontend
Build command: npm ci --legacy-peer-deps && npm run build
Build output directory: build
```

### Step 4: Environment Variables

Click **Add variable** and add these for **Production**:

| Variable Name | Value |
|---------------|-------|
| `REACT_APP_BACKEND_URL` | `https://api.auraaluxury.com` |
| `REACT_APP_TURNSTILE_SITE_KEY` | `0x4AAAAAAB7WqGc00XxvDASQ4` |
| `NODE_VERSION` | `18` |
| `DISABLE_ESLINT_PLUGIN` | `true` |

⚠️ **Important:** Make sure to use `https://api.auraaluxury.com` (NOT the onrender.com URL)

### Step 5: Save and Deploy

1. Click **Save and Deploy**
2. Wait for the first build to complete
3. Note your Pages URL: `auraa-luxury-store-v2.pages.dev`

### Step 6: Add Custom Domains

1. Go to: **Custom domains** tab
2. Click **Set up a custom domain**
3. Add **Primary domain:**
   ```
   www.auraaluxury.com
   ```
4. Click **Activate domain**
5. Add **Secondary domain:**
   ```
   auraaluxury.com
   ```
6. Wait for both domains to show **Active** status with SSL certificates

---

## PART 2: CLOUDFLARE DNS CONFIGURATION

### Step 1: Access DNS Settings

1. From Cloudflare Dashboard, select domain: **auraaluxury.com**
2. Go to: **DNS** → **Records**

### Step 2: Remove Old Records

🗑️ **Delete these if they exist:**
- Any A record for `@` or root domain
- Any old CNAME records for `@`, `www`, or `api`

### Step 3: Add New CNAME Records

**Record 1: Root Domain**
```
Type: CNAME
Name: @
Target: auraa-luxury-store-v2.pages.dev
Proxy status: Proxied (Orange cloud ☁️)
TTL: Auto
```

**Record 2: WWW Subdomain**
```
Type: CNAME
Name: www
Target: auraa-luxury-store-v2.pages.dev
Proxy status: Proxied (Orange cloud ☁️)
TTL: Auto
```

**Record 3: API Subdomain**
```
Type: CNAME
Name: api
Target: auraa-luxury-store.onrender.com
Proxy status: Proxied (Orange cloud ☁️)
TTL: Auto
```

⚠️ **Note:** Replace `auraa-luxury-store.onrender.com` with your actual Render service URL.

### Step 4: Purge Cache

1. Go to: **Caching** → **Configuration**
2. Click **Purge Everything**
3. Confirm the action
4. Wait 1-2 minutes

---

## PART 3: RENDER BACKEND CONFIGURATION

### Step 1: Add Custom Domain

1. Go to: https://dashboard.render.com
2. Select your service: **auraa-luxury-store** (or your backend service name)
3. Navigate to: **Settings** → **Custom Domain**
4. Click **Add Custom Domain**
5. Enter: `api.auraaluxury.com`
6. Click **Verify**
7. Wait for verification to complete (should be instant if DNS is correct)

### Step 2: Enable Force HTTPS

In the same Settings page:
- Look for **Force HTTPS** option (if available)
- Set to: **Enabled**

### Step 3: Update Environment Variables

1. Go to: **Environment** tab
2. Find or add the variable: `CORS_ORIGINS`
3. Set the value to:
   ```
   https://www.auraaluxury.com,https://auraaluxury.com,https://auraa-luxury-store-v2.pages.dev
   ```

⚠️ **Important:** 
- NO spaces between URLs
- Only commas as separators
- Include all three domains

### Step 4: Restart Service

1. Click **Manual Deploy**
2. Select **Deploy latest commit**
3. Wait for deployment to complete
4. Verify Status shows: **Live** ✅

---

## PART 4: CLOUDFLARE SSL & SECURITY

### Step 1: SSL/TLS Mode

1. Go to: **SSL/TLS** → **Overview**
2. Select encryption mode:
   - **Full** (recommended) or
   - **Full (strict)** if your origin certificate is valid
3. Save changes

### Step 2: Always Use HTTPS

1. Stay in **SSL/TLS** section
2. Go to: **Edge Certificates**
3. Find **Always Use HTTPS**
4. Toggle to: **On** ✅

### Step 3: Minimum TLS Version

In the same section:
- Set **Minimum TLS Version** to: **TLS 1.2** (recommended)

---

## PART 5: CLOUDFLARE CACHING RULES

### Step 1: Create API Bypass Rule

1. Go to: **Caching** → **Cache Rules**
2. Click **Create rule**
3. Configure:
   - **Rule name:** `Bypass API Cache`
   - **When incoming requests match:**
     - Field: `Hostname`
     - Operator: `equals`
     - Value: `api.auraaluxury.com`
   - **Then:**
     - Cache eligibility: `Bypass cache`
4. Click **Deploy**

---

## PART 6: AUTOMATION (OPTIONAL)

### Cloudflare Pages Auto-Deploy

✅ **Already enabled by default**
- Automatically builds and deploys on push to `main` branch
- No additional configuration needed

### Render Auto-Deploy

1. In Render Dashboard, go to: **Settings** → **Build & Deploy**
2. Set **Auto-Deploy** to: **Yes**
3. (Optional) Add path filter: `backend/**` to only deploy on backend changes

---

## 🧪 TESTING & VERIFICATION

### Test 1: Main Website

**Open in browser:**
```
https://www.auraaluxury.com
```

✅ **Expected:** Homepage loads without errors, no console warnings

---

### Test 2: Root Domain Redirect

**Open in browser:**
```
https://auraaluxury.com
```

✅ **Expected:** Automatically redirects to `https://www.auraaluxury.com`

---

### Test 3: API Health Check

**Using curl:**
```bash
curl https://api.auraaluxury.com/api/health
```

✅ **Expected Response:**
```json
{
  "status": "ok"
}
```

Or HTTP 200 status code

**Using browser:**
```
https://api.auraaluxury.com/api/health
```

---

### Test 4: User Authentication

1. Go to: https://www.auraaluxury.com
2. Click **Login** or **Register**
3. Test email/phone registration
4. Test Google OAuth login
5. Verify user dashboard loads

✅ **Expected:** All auth flows work without CORS errors

---

### Test 5: Product Features

1. Navigate to **Products** page
2. View product details
3. Add product to cart
4. Add product to wishlist
5. Check cart counter updates

✅ **Expected:** All product interactions work smoothly

---

### Test 6: Admin Panel

1. Login as Super Admin
2. Go to: https://www.auraaluxury.com/admin
3. Check sections:
   - Dashboard
   - Products Management
   - Orders
   - Users
   - Settings
   - Admin Management

✅ **Expected:** All admin features accessible and functional

---

## ✅ FINAL CHECKLIST

### Frontend (Cloudflare Pages)
- [ ] Repository connected (yasoo2/auraa-luxury-store)
- [ ] Branch set to `main`
- [ ] Build configuration correct
- [ ] All 4 environment variables added
- [ ] Custom domains added (www + root)
- [ ] Both domains show **Active** status
- [ ] SSL certificates active

### DNS (Cloudflare)
- [ ] Old A records deleted
- [ ] CNAME @ → pages.dev (Proxied)
- [ ] CNAME www → pages.dev (Proxied)
- [ ] CNAME api → onrender.com (Proxied)
- [ ] Cache purged

### Backend (Render)
- [ ] Custom domain added (api.auraaluxury.com)
- [ ] Domain verified ✅
- [ ] Force HTTPS enabled
- [ ] CORS_ORIGINS updated with all 3 domains
- [ ] Service restarted
- [ ] Status: Live ✅

### Cloudflare Security
- [ ] SSL/TLS Mode: Full or Full (strict)
- [ ] Always Use HTTPS: On
- [ ] Minimum TLS: 1.2

### Cloudflare Caching
- [ ] API bypass rule created
- [ ] Rule active for api.auraaluxury.com

### Tests Passed
- [ ] www.auraaluxury.com loads ✅
- [ ] auraaluxury.com redirects to www ✅
- [ ] api.auraaluxury.com/api/health returns 200 ✅
- [ ] Login/Register works ✅
- [ ] Products page works ✅
- [ ] Cart/Wishlist works ✅
- [ ] Admin panel accessible ✅

---

## 🆘 TROUBLESHOOTING

### Issue: "This site can't be reached"

**Possible Causes:**
- DNS not propagated yet
- CNAME records incorrect
- Cloudflare proxy issues

**Solutions:**
1. Wait 5-10 minutes for DNS propagation
2. Verify CNAME records in Cloudflare DNS
3. Check Cloudflare proxy is enabled (orange cloud)
4. Clear browser cache and try incognito mode
5. Test with: https://dnschecker.org

---

### Issue: "CORS Error" in Browser Console

**Error Message:**
```
Access to fetch at 'https://api.auraaluxury.com/api/...' from origin 'https://www.auraaluxury.com' has been blocked by CORS policy
```

**Solutions:**
1. Verify `CORS_ORIGINS` in Render environment variables
2. Ensure NO spaces between URLs in CORS_ORIGINS
3. Check all three domains are included:
   - https://www.auraaluxury.com
   - https://auraaluxury.com
   - https://auraa-luxury-store-v2.pages.dev
4. Restart Render service after changing env vars
5. Clear browser cache

---

### Issue: "502 Bad Gateway"

**Possible Causes:**
- Render service is down
- Custom domain not verified
- DNS misconfigured

**Solutions:**
1. Check Render service status (should be "Live")
2. Verify custom domain in Render settings
3. Check CNAME api record in Cloudflare DNS
4. Wait 5 minutes and retry
5. Check Render logs for errors

---

### Issue: "Mixed Content" Warning

**Error Message:**
```
Mixed Content: The page at 'https://www.auraaluxury.com' was loaded over HTTPS, but requested an insecure resource
```

**Solutions:**
1. Verify SSL/TLS mode is set to **Full**
2. Enable **Always Use HTTPS** in Cloudflare
3. Check all API calls use `https://` (not `http://`)
4. Verify `REACT_APP_BACKEND_URL` uses https://

---

### Issue: Build Fails on Cloudflare Pages

**Error:** ESLint warnings treated as errors

**Solution:**
Add environment variable in Cloudflare Pages:
```
DISABLE_ESLINT_PLUGIN=true
```

**Error:** npm dependency conflicts

**Solution:**
Ensure build command includes `--legacy-peer-deps`:
```
npm ci --legacy-peer-deps && npm run build
```

---

### Issue: Frontend Shows Old Version

**Possible Causes:**
- Browser cache
- Cloudflare cache
- Service Worker cache

**Solutions:**
1. Hard refresh browser: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
2. Clear browser cache completely
3. Try incognito/private mode
4. Purge Cloudflare cache (Caching → Purge Everything)
5. Check Service Worker is updated (DevTools → Application → Service Workers)

---

### Issue: Admin Panel Not Accessible

**Solutions:**
1. Verify you're logged in as Super Admin
2. Check user role in database
3. Verify admin routes are configured in React Router
4. Check browser console for errors
5. Ensure backend `/api/admin/*` endpoints are working

---

## 📞 SUPPORT CONTACTS

### Cloudflare Support
- Dashboard: https://dash.cloudflare.com
- Community: https://community.cloudflare.com
- Docs: https://developers.cloudflare.com/pages

### Render Support
- Dashboard: https://dashboard.render.com
- Docs: https://render.com/docs
- Community: https://community.render.com

---

## 🎉 SUCCESS!

Once all tests pass, your Auraa Luxury e-commerce store is **LIVE** and ready for customers!

**Your Production URLs:**
- 🛍️ **Store:** https://www.auraaluxury.com
- 🔌 **API:** https://api.auraaluxury.com
- 👨‍💼 **Admin:** https://www.auraaluxury.com/admin

---

## 📝 POST-DEPLOYMENT

### Recommended Next Steps

1. **Monitor Performance**
   - Check Cloudflare Analytics
   - Monitor Render metrics
   - Review error logs regularly

2. **Set Up Monitoring**
   - Configure uptime monitoring (e.g., UptimeRobot)
   - Set up error tracking (e.g., Sentry)
   - Enable Google Analytics

3. **Backup Strategy**
   - Regular database backups on Render
   - Git commits for code changes
   - Document configuration changes

4. **Security**
   - Enable Cloudflare WAF rules
   - Set up rate limiting
   - Review and rotate API keys regularly

5. **SEO**
   - Submit sitemap to Google Search Console
   - Verify all meta tags are correct
   - Set up Google Analytics 4

---

**Document Version:** 1.0  
**Last Updated:** 2025-01-21  
**Status:** ✅ Production Ready
