# 🚀 Automatic Deployment Setup

## ✅ Completed Configuration

### 1. Backend URL ✅
- **REACT_APP_BACKEND_URL**: `https://auraa-luxury-store.onrender.com`
- Updated in frontend/.env and vercel.json

### 2. GitHub Workflow ✅  
- **File**: `.github/workflows/deploy.yml`
- **Trigger**: Push to main branch
- **Action**: Calls Vercel Deploy Hook

### 3. Vercel Build Settings ✅
- **Framework**: Create React App
- **Root Directory**: `frontend` 
- **Build Command**: `npm ci && npm run build`
- **Output Directory**: `build`
- **Node Version**: 20
- **Environment Variables**: REACT_APP_BACKEND_URL configured

## 🔧 Next Steps (Manual Setup Required)

### Step 1: Create Vercel Deploy Hook
1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Git** 
3. Scroll to **Deploy Hooks**
4. Click **Create Hook**
   - **Name**: `prod-on-merge`
   - **Branch**: `main`
5. Copy the generated webhook URL

### Step 2: Add GitHub Secret
1. Go to: `https://github.com/yasoo2/auraa-luxury-store/settings/secrets/actions`
2. Click **New repository secret**
3. Add:
   - **Name**: `VERCEL_DEPLOY_HOOK`
   - **Value**: [The webhook URL from Step 1]

## 🎯 How It Works

1. **Developer merges PR to main** 
2. **GitHub Action triggers** (deploy.yml)
3. **Action calls Vercel Deploy Hook**
4. **Vercel builds from main branch**  
5. **Site deploys to production domain**

## 🧪 Testing

### Test the Setup:
1. Create a small change in frontend
2. Commit and push to main branch  
3. Check **Actions** tab on GitHub
4. Verify deploy hook was called
5. Check Vercel dashboard for new deployment

### Verify Environment:
- Frontend connects to: `https://auraa-luxury-store.onrender.com`
- All API calls use production backend
- No localhost references in production

## 📁 File Changes Made

- ✅ `frontend/.env` - Updated backend URL
- ✅ `frontend/vercel.json` - Production build config
- ✅ `frontend/package.json` - Formatted for reliability  
- ✅ `.github/workflows/deploy.yml` - Deploy automation
- ✅ `.env.secrets` - Template for secrets management

## 🔒 Security Notes

- ✅ All sensitive URLs stored as GitHub Secrets
- ✅ No hardcoded production URLs in code
- ✅ Environment-specific configuration  
- ✅ Webhook URL kept private in repository secrets

---

**Status**: Ready for Deploy Hook setup
**Next**: Add VERCEL_DEPLOY_HOOK secret to GitHub