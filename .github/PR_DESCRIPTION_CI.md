# CI/CD: Add GitHub Actions Pipelines

## 📋 Summary

This PR adds comprehensive CI/CD pipelines for Auraa Luxury Store, including:
- ✅ Frontend CI (lint + build validation)
- ✅ Backend CI (lint + optional tests)
- ✅ Automated deployment to Vercel (frontend)
- ✅ Automated deployment to Render (backend)

---

## 🔄 Workflows Added

### 1. **Frontend CI** (`.github/workflows/ci-frontend.yml`)
**Triggers:**
- Pull requests to `main` (frontend changes)
- Pushes to `feat/**` or `ci/**` branches (frontend changes)

**Actions:**
- Setup Node.js 20.x with Yarn cache
- Install dependencies (`yarn install --frozen-lockfile`)
- Run ESLint (optional, won't block)
- Build production bundle (`yarn build`)
- Upload build artifact

**Required Secrets:** `REACT_APP_BACKEND_URL`

---

### 2. **Backend CI** (`.github/workflows/ci-backend.yml`)
**Triggers:**
- Pull requests to `main` (backend changes)
- Pushes to `feat/**` or `ci/**` branches (backend changes)

**Actions:**
- Setup Python 3.11 with pip cache
- Install dependencies from `requirements.txt`
- Run ruff linter (optional)
- Run black formatter check (optional)
- Run pytest if tests exist (optional)

**Required Secrets:** None

---

### 3. **Deploy Frontend** (`.github/workflows/deploy-frontend.yml`)
**Triggers:**
- Push to `main` branch (frontend changes only)

**Actions:**
- Deploy to Vercel using official CLI

**Required Secrets:**
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

---

### 4. **Deploy Backend** (`.github/workflows/deploy-backend.yml`)
**Triggers:**
- Push to `main` branch (backend changes only)

**Actions:**
- Trigger Render deploy via webhook

**Required Secrets:**
- `RENDER_DEPLOY_HOOK`

---

## 📚 Documentation Added

1. **`CI_CD_SETUP.md`** - Complete setup guide
2. **`SECRETS_CHECKLIST.md`** - Checklist for required secrets
3. **This PR description** - Quick reference

---

## 🔑 Secrets to Configure

Before merging, add these secrets in:
`https://github.com/yasoo2/auraa-luxury-store/settings/secrets/actions`

### Required (for CI to work):
- ✅ `REACT_APP_BACKEND_URL` - Your backend API URL

### Optional (for auto-deploy):
- 🔵 `VERCEL_TOKEN` - Vercel authentication token
- 🔵 `VERCEL_ORG_ID` - Vercel organization ID
- 🔵 `VERCEL_PROJECT_ID` - Vercel project ID
- 🔵 `RENDER_DEPLOY_HOOK` - Render webhook URL

**Note:** If Vercel/Render secrets are not provided, workflows will skip deployment (CI checks will still run).

---

## 🧪 Testing Plan

1. **Before Merge:**
   - [ ] Add `REACT_APP_BACKEND_URL` secret
   - [ ] Verify CI workflows trigger on this PR
   - [ ] Check Actions tab for workflow status
   - [ ] Ensure Frontend CI passes
   - [ ] Ensure Backend CI passes

2. **After Merge:**
   - [ ] Monitor deployment workflows
   - [ ] Verify frontend deploys to Vercel
   - [ ] Verify backend deploys to Render (if hook configured)
   - [ ] Test live website functionality

---

## 🛡️ Branch Protection (Recommended Next Step)

After confirming CI works, enable branch protection:

1. Go to Settings → Branches → Add rule
2. Branch pattern: `main`
3. Enable:
   - ✅ Require pull request before merging
   - ✅ Require status checks to pass:
     - `Frontend CI / build`
     - `Backend CI / test`

---

## 🔄 Workflow Behavior

### Pull Request Flow:
```
PR opened → CI checks run
├─ Frontend CI: Validates builds successfully
├─ Backend CI: Validates code quality
└─ PR status: ✅ All checks passed (can merge)
```

### Main Branch Flow:
```
Merge to main
├─ Frontend changes → Deploy to Vercel (3-5 min)
├─ Backend changes → Deploy to Render (5-10 min)
└─ Live site updated automatically
```

---

## 📊 Expected Outcomes

### After Merging This PR:

1. **Every PR will be validated:**
   - Code quality checks
   - Build verification
   - No broken deployments

2. **Automatic deployments:**
   - Merge to main → Deploy to production
   - No manual steps needed
   - Consistent deployment process

3. **Better code quality:**
   - Linting catches issues early
   - Build failures caught before merge
   - Reduced production bugs

---

## ⚠️ Important Notes

- **No secrets in code:** All sensitive data uses GitHub Secrets
- **Graceful degradation:** If deploy secrets missing, CI still works (just no auto-deploy)
- **Cost:** GitHub Actions free tier: 2,000 minutes/month (sufficient for this project)
- **Vercel integration:** If Vercel already auto-deploys from GitHub, deploy workflow is optional

---

## 🔗 Related Documentation

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Vercel CLI Documentation](https://vercel.com/docs/cli)
- [Render Deploy Hooks](https://render.com/docs/deploy-hooks)

---

## ✅ Acceptance Criteria

- [x] Frontend CI workflow created
- [x] Backend CI workflow created
- [x] Frontend deploy workflow created
- [x] Backend deploy workflow created
- [x] Documentation added
- [x] Secrets checklist provided
- [ ] REACT_APP_BACKEND_URL secret added (before merge)
- [ ] CI passes on this PR
- [ ] Ready for merge

---

**Commit Message:**
```
ci: add GitHub Actions pipelines for CI/CD

- Add frontend CI with Yarn, lint, and build validation
- Add backend CI with Python, ruff, black linting
- Add Vercel deploy workflow for frontend
- Add Render deploy webhook for backend
- Include comprehensive setup documentation
```

---

**Reviewers:** Please verify workflows syntax and approve after confirming secrets are documented.

**Deployment:** Safe to merge - no breaking changes, only adds CI/CD automation.
