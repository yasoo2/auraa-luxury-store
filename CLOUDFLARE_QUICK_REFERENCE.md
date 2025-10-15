# Cloudflare Quick Reference - AuraaLuxury.com

## 🚀 Quick Setup (5 Minutes)

### DNS Records to Add

| Type | Name | Content | Proxy |
|------|------|---------|-------|
| A | @ | 76.76.21.21 | ✅ ON |
| CNAME | www | cname.vercel-dns.com | ✅ ON |
| CNAME | api | [your-app].onrender.com | ✅ ON |

**Replace `[your-app]` with your Render backend URL**

---

## ⚙️ Essential Cloudflare Settings

### 1. SSL/TLS → Overview
```
Encryption mode: Full (strict)
```

### 2. SSL/TLS → Edge Certificates
- ✅ Always Use HTTPS: ON
- ✅ Automatic HTTPS Rewrites: ON

### 3. Speed → Optimization
- ✅ Auto Minify (JS, CSS, HTML): ON
- ❌ Rocket Loader: OFF

### 4. Rules → Page Rules
**Create this rule:**
```
URL: api.auraaluxury.com/*
Setting: Cache Level → Bypass
```

---

## 🔗 Platform Configuration

### Vercel
1. Go to Project → Settings → Domains
2. Add:
   - `auraaluxury.com`
   - `www.auraaluxury.com`

### Render
1. Go to Service → Settings → Custom Domains
2. Add: `api.auraaluxury.com`
3. Copy the CNAME target (e.g., `yourapp.onrender.com`)
4. Use this in Cloudflare DNS for the `api` CNAME record

---

## ✅ Testing Commands

```bash
# Test DNS
dig auraaluxury.com
dig api.auraaluxury.com

# Test SSL
curl -I https://auraaluxury.com
curl -I https://api.auraaluxury.com

# Test API
curl https://api.auraaluxury.com/api/categories
```

---

## 🐛 Common Issues

| Problem | Solution |
|---------|----------|
| 502 Bad Gateway | Check Render backend is running |
| Mixed Content | Enable "Automatic HTTPS Rewrites" |
| API Calls Failing | Add Page Rule to bypass cache for API |
| SSL Not Working | Set SSL mode to "Full (strict)" |

---

## 📊 Verification Checklist

- [ ] https://auraaluxury.com loads frontend
- [ ] https://www.auraaluxury.com works
- [ ] https://api.auraaluxury.com/api/categories returns data
- [ ] No SSL warnings in browser
- [ ] API calls visible in DevTools Network tab

---

## 📧 Email Records (Keep These)

If using Gmail SMTP + Mailgun:
- MX records: Keep existing
- SPF: `v=spf1 include:mailgun.org include:_spf.google.com ~all`
- DKIM: Keep existing
- DMARC: `v=DMARC1; p=none; rua=mailto:admin@auraaluxury.com`

---

## 🔐 Environment Variables (Already Updated)

```env
# Frontend
REACT_APP_BACKEND_URL=https://api.auraaluxury.com

# Backend
CORS_ORIGINS="https://auraaluxury.com,https://www.auraaluxury.com"
```

---

## 🎯 Next Steps After Setup

1. **Restart Services**:
   ```bash
   sudo supervisorctl restart all
   ```

2. **Monitor Cloudflare Analytics**:
   - Check traffic patterns
   - Review security events
   - Monitor performance metrics

3. **Set Up Google Search Console**:
   - Add property: `auraaluxury.com`
   - Verify via DNS TXT record
   - Submit sitemap: `https://auraaluxury.com/sitemap.xml`

4. **Update GA4**:
   - Verify tracking on new domain
   - Check event collection

---

**Need Help?** Check the full guide: `CLOUDFLARE_DNS_SETUP.md`
