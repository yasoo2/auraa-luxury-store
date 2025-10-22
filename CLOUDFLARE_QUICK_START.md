# ⚡ Cloudflare Migration - Quick Start

## 🎯 TL;DR

**Frontend:** Cloudflare Pages  
**Backend:** Render (proxied by Cloudflare)  
**Result:** Everything through Cloudflare!

---

## 📋 5-Minute Setup

### 1. Frontend → Cloudflare Pages

```bash
1. Go to: https://dash.cloudflare.com
2. Workers & Pages → Create → Pages → Connect Git
3. Select repo
4. Build settings:
   - Build command: cd frontend && npm install --legacy-peer-deps && npm run build
   - Build output: frontend/build
5. Environment variables:
   - REACT_APP_API_URL=https://api.auraaluxury.com
   - REACT_APP_BACKEND_URL=https://api.auraaluxury.com
   - DISABLE_ESLINT_PLUGIN=true
6. Deploy!
7. Add custom domain: www.auraaluxury.com
```

### 2. Backend → Link via Cloudflare

```bash
1. Get Render URL: https://auraa-api-xxxx.onrender.com
2. In Cloudflare DNS:
   - Type: CNAME
   - Name: api
   - Target: auraa-api-xxxx.onrender.com
   - Proxy: ON (🟠)
3. In Render → Custom Domain:
   - Add: api.auraaluxury.com
4. Done!
```

### 3. Test

```bash
# Frontend
curl https://www.auraaluxury.com

# Backend
curl https://api.auraaluxury.com/health
```

---

## ✅ Checklist

- [ ] Pages deployed
- [ ] www.auraaluxury.com works
- [ ] DNS: api → Render
- [ ] api.auraaluxury.com works
- [ ] Frontend calls backend successfully

---

## 📖 Full Guide

See: `CLOUDFLARE_MIGRATION_COMPLETE_GUIDE.md`

---

🚀 **Done in 5 minutes!**