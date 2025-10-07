# CI/CD Setup Guide

This document explains the GitHub Actions workflows configured for Auraa Luxury Store.

---

## 📋 Workflows Overview

### 1. **Frontend CI** (`ci-frontend.yml`)
**Trigger:** Pull Requests or pushes to `feat/**` or `ci/**` branches that modify `frontend/**`

**Steps:**
- ✅ Checkout code
- ✅ Setup Node.js 20.x with Yarn cache
- ✅ Install dependencies (`yarn install --frozen-lockfile`)
- ✅ Lint (optional, won't fail build)
- ✅ Build frontend (`yarn build`)
- ✅ Upload build artifact

**Required Secrets:**
- `REACT_APP_BACKEND_URL` - Your backend API URL (e.g., `https://auraa-backend.onrender.com`)

---

### 2. **Backend CI** (`ci-backend.yml`)
**Trigger:** Pull Requests or pushes to `feat/**` or `ci/**` branches that modify `backend/**`

**Steps:**
- ✅ Checkout code
- ✅ Setup Python 3.11 with pip cache
- ✅ Install dependencies from `requirements.txt`
- ✅ Lint with ruff (optional, won't fail build)
- ✅ Check formatting with black (optional)
- ✅ Run pytest tests if available (optional)

**Required Secrets:** None

---

### 3. **Deploy Frontend** (`deploy-frontend.yml`)
**Trigger:** Push to `main` branch that modifies `frontend/**`

**Steps:**
- ✅ Checkout code
- ✅ Deploy to Vercel using official CLI

**Required Secrets:**
- `VERCEL_TOKEN` - Personal access token from Vercel
- `VERCEL_ORG_ID` - Your Vercel organization ID
- `VERCEL_PROJECT_ID` - Your Vercel project ID

---

### 4. **Deploy Backend** (`deploy-backend.yml`)
**Trigger:** Push to `main` branch that modifies `backend/**`

**Steps:**
- ✅ Trigger Render deploy hook via webhook

**Required Secrets:**
- `RENDER_DEPLOY_HOOK` - Deploy webhook URL from Render service settings

---

## 🔑 How to Add Secrets

### Step 1: Go to GitHub Repository Settings
1. Navigate to your repository: `https://github.com/yasoo2/auraa-luxury-store`
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**

### Step 2: Add Required Secrets

#### **REACT_APP_BACKEND_URL** (Required for Frontend CI & Deploy)
- **Name:** `REACT_APP_BACKEND_URL`
- **Value:** Your backend API URL (e.g., `https://auraa-backend.onrender.com` or `https://api.auraaluxury.com`)

#### **VERCEL_TOKEN** (Required for Vercel Deploy)
- **Name:** `VERCEL_TOKEN`
- **How to get:**
  1. Go to [Vercel Account Settings](https://vercel.com/account/tokens)
  2. Click **Create Token**
  3. Name it "GitHub Actions CI/CD"
  4. Copy the token

#### **VERCEL_ORG_ID** (Required for Vercel Deploy)
- **Name:** `VERCEL_ORG_ID`
- **How to get:**
  1. Go to your Vercel dashboard
  2. Open your project settings
  3. Find "Organization ID" in the General tab
  4. Copy the value

#### **VERCEL_PROJECT_ID** (Required for Vercel Deploy)
- **Name:** `VERCEL_PROJECT_ID`
- **How to get:**
  1. Go to your Vercel project settings
  2. Find "Project ID" in the General tab
  3. Copy the value

#### **RENDER_DEPLOY_HOOK** (Required for Render Deploy)
- **Name:** `RENDER_DEPLOY_HOOK`
- **How to get:**
  1. Go to [Render Dashboard](https://dashboard.render.com/)
  2. Select your backend service
  3. Go to **Settings** → **Deploy Hook**
  4. Click **Create Deploy Hook**
  5. Copy the webhook URL (e.g., `https://api.render.com/deploy/srv-xxxxx?key=yyyyy`)

---

## 🛡️ Branch Protection (Optional but Recommended)

### Enable Branch Protection for `main`:

1. Go to **Settings** → **Branches** → **Add rule**
2. Set **Branch name pattern:** `main`
3. Enable:
   - ✅ **Require a pull request before merging**
   - ✅ **Require status checks to pass before merging**
     - Select: `Frontend CI / build`
     - Select: `Backend CI / test`
   - ✅ **Require branches to be up to date before merging**
4. Save changes

This ensures:
- No direct pushes to `main` without PR
- CI must pass before merging
- Code quality is maintained

---

## 🚀 Workflow Behavior

### When you create a Pull Request:
```
PR opened → CI checks run (Frontend + Backend)
├─ ✅ Pass → Can merge
└─ ❌ Fail → Must fix before merging
```

### When you merge to `main`:
```
Merge to main → Deploy workflows triggered
├─ Frontend changes → Deploy to Vercel (3-5 min)
└─ Backend changes → Deploy to Render (5-10 min)
```

### When you push to feature branch:
```
Push to feat/my-feature → CI checks run
└─ No deployment (only validation)
```

---

## 📊 Monitoring Deployments

### View CI/CD Status:
- Go to **Actions** tab in your GitHub repository
- You'll see all workflow runs with status:
  - ✅ Success (green)
  - ❌ Failed (red)
  - 🟡 In Progress (yellow)

### View Deployment Status:
- **Vercel:** Check [Vercel Dashboard](https://vercel.com/dashboard)
- **Render:** Check [Render Dashboard](https://dashboard.render.com/)

---

## ⚠️ Important Notes

1. **No Secrets in Code:**
   - Never commit API keys, tokens, or passwords
   - Always use GitHub Secrets for sensitive data

2. **Vercel Environment Variables:**
   - Also set `REACT_APP_BACKEND_URL` in Vercel project settings:
     - Project → Settings → Environment Variables

3. **First Time Setup:**
   - After adding secrets, test with a small PR first
   - Monitor Actions tab to ensure everything works

4. **Cost Considerations:**
   - GitHub Actions: 2,000 free minutes/month (private repos)
   - Vercel: Free tier includes automatic deployments
   - Render: Free tier with some limitations

---

## 🔧 Troubleshooting

### CI Fails with "Missing REACT_APP_BACKEND_URL"
- **Solution:** Add the secret in GitHub repository settings

### Deploy Fails with "Invalid Vercel Token"
- **Solution:** Regenerate token in Vercel and update GitHub secret

### Backend Deploy Hook Returns 404
- **Solution:** Verify the webhook URL is correct in Render settings

### Linting Errors Block Deployment
- **Solution:** Fix linting issues or temporarily disable strict linting in workflow

---

## 📞 Support

For issues or questions about CI/CD setup:
1. Check the **Actions** tab for detailed error logs
2. Review this documentation
3. Contact your DevOps team or repository maintainer

---

**Last Updated:** October 2024
**Maintained by:** Auraa Luxury Development Team
