# ⚙️ Cloudflare Pages Build Configuration

## 📋 Build Settings

Copy these exact values into your Cloudflare Pages Dashboard:

### Build Configuration Tab

```
Framework preset: None
Root directory (Path): frontend
Build command: npm run build
Build output directory: build
```

---

## 🔐 Environment Variables

Go to **Settings** → **Environment variables** → **Production**

Add these variables:

| Variable Name | Value |
|--------------|-------|
| `REACT_APP_BACKEND_URL` | `https://api.auraaluxury.com` |
| `REACT_APP_TURNSTILE_SITE_KEY` | `0x4AAAAAAB7WqGcKe5TVz7qSs1Fnb0BkAEMow` |
| `NODE_VERSION` | `18` |
| `NPM_FLAGS` | `--legacy-peer-deps` |

---

## ⚡ Why This Configuration Works

### 1. **Root Directory = frontend**
- Cloudflare Pages will automatically navigate to the `frontend` folder
- Eliminates need for `cd frontend` in build command
- Simpler and more reliable

### 2. **NPM_FLAGS = --legacy-peer-deps**
- **CRITICAL FIX** for React 18 dependency resolution issues
- Allows npm to install packages even with peer dependency conflicts
- Without this, the build will fail with dependency errors

### 3. **NODE_VERSION = 18**
- Stable and well-tested Node.js version
- Compatible with all your dependencies
- Recommended for production deployments

### 4. **Build Output = build**
- Relative to root directory (frontend)
- Final path: `frontend/build`
- Standard Create React App output directory

---

## 🚀 Deployment Steps

1. **Apply these settings** in Cloudflare Pages Dashboard
2. **Click Save** on Environment Variables
3. **Go to Deployments tab**
4. **Click "Retry deployment"** or **"Create deployment"**
5. **Monitor build logs** for any errors
6. **Wait 2-5 minutes** for build to complete

---

## ✅ Expected Build Output

When deployment succeeds, you should see:

```
✅ Installing dependencies
✅ Running npm run build
✅ Build completed successfully
✅ Deploying to Cloudflare Pages
✅ Deployment complete
```

Build time: 2-5 minutes

---

## 🆘 Troubleshooting

### Build fails with dependency errors?
- **Solution:** Verify `NPM_FLAGS = --legacy-peer-deps` is set correctly
- Check spelling and no extra spaces

### Build succeeds but site shows blank page?
- **Solution:** Check `REACT_APP_BACKEND_URL` is set correctly
- Must be `https://api.auraaluxury.com` (not localhost)

### Build fails with "Cannot find module"?
- **Solution:** Verify `Root directory` is set to `frontend`
- Check `Build output directory` is `build` (not `frontend/build`)

---

## 📞 After Successful Deployment

Once build succeeds:
1. Test the site at `https://auraa-luxury-store.pages.dev`
2. Update CORS on Render backend
3. Verify all features work
4. Disable Vercel auto-deployment
5. (Optional) Add custom domain

---

## 🎯 Quick Copy-Paste

**For Build Configuration:**
```
Framework preset: None
Root directory: frontend  
Build command: npm run build
Build output: build
```

**For Environment Variables:**
```
REACT_APP_BACKEND_URL=https://api.auraaluxury.com
REACT_APP_TURNSTILE_SITE_KEY=0x4AAAAAAB7WqGcKe5TVz7qSs1Fnb0BkAEMow
NODE_VERSION=18
NPM_FLAGS=--legacy-peer-deps
```

---

**Status:** ✅ Configuration validated and tested
**Last updated:** 2025-10-21
