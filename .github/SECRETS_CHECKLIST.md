# GitHub Secrets Checklist

Before deploying, ensure all required secrets are configured in GitHub repository settings.

## 📍 Where to Add Secrets

Go to: `https://github.com/yasoo2/auraa-luxury-store/settings/secrets/actions`

---

## ✅ Required Secrets

### 1. REACT_APP_BACKEND_URL (Required)
- **Purpose:** Backend API URL for frontend builds
- **Example Value:** `https://auraa-backend.onrender.com`
- **Where Used:** Frontend CI & Deploy
- **Priority:** 🔴 Critical

---

## 🔵 Optional Secrets (For Auto-Deploy)

### 2. VERCEL_TOKEN
- **Purpose:** Authenticate with Vercel API
- **How to Get:**
  1. Go to https://vercel.com/account/tokens
  2. Click "Create Token"
  3. Name it "GitHub Actions"
  4. Copy the token
- **Where Used:** Frontend Deploy
- **Priority:** 🟡 Optional (if using Vercel auto-deploy from GitHub)

### 3. VERCEL_ORG_ID
- **Purpose:** Your Vercel organization ID
- **How to Get:**
  1. Open Vercel dashboard
  2. Go to your project → Settings → General
  3. Copy "Organization ID"
- **Where Used:** Frontend Deploy
- **Priority:** 🟡 Optional

### 4. VERCEL_PROJECT_ID
- **Purpose:** Your Vercel project ID
- **How to Get:**
  1. Open Vercel dashboard
  2. Go to your project → Settings → General
  3. Copy "Project ID"
- **Where Used:** Frontend Deploy
- **Priority:** 🟡 Optional

### 5. RENDER_DEPLOY_HOOK
- **Purpose:** Webhook URL to trigger backend deployment
- **How to Get:**
  1. Go to https://dashboard.render.com/
  2. Select your backend service
  3. Go to Settings → Deploy Hook
  4. Click "Create Deploy Hook"
  5. Copy the full webhook URL
- **Example:** `https://api.render.com/deploy/srv-xxxxx?key=yyyyy`
- **Where Used:** Backend Deploy
- **Priority:** 🟡 Optional

---

## 📝 Quick Setup Steps

1. **Add REACT_APP_BACKEND_URL** (Required):
   ```
   Name: REACT_APP_BACKEND_URL
   Value: https://your-backend-url.com
   ```

2. **Test CI without Deploy** (Skip Vercel/Render secrets):
   - CI will check code quality
   - No automatic deployment
   - Good for initial testing

3. **Enable Full Auto-Deploy** (Add all secrets):
   - Merges to `main` → Deploy automatically
   - Production updates without manual steps

---

## ✅ Verification Checklist

After adding secrets:

- [ ] Create a test PR to verify CI runs
- [ ] Check Actions tab for workflow status
- [ ] Merge PR to main to test deploy (if secrets added)
- [ ] Verify frontend deploys to Vercel
- [ ] Verify backend deploys to Render
- [ ] Test live website functionality

---

## ⚠️ Security Notes

- ❌ Never commit secrets to code
- ❌ Never share secrets publicly
- ✅ Use GitHub Secrets for all sensitive data
- ✅ Rotate tokens periodically
- ✅ Use environment-specific values (staging vs production)

---

**Status:** Ready for CI/CD setup
**Last Updated:** October 2024
