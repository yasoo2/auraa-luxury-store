# ⚙️ GitHub Actions Settings - Quick Reference

## 🎯 الإعدادات المطلوبة

### 1. Workflow Permissions

**الموقع:** `Settings → Actions → General → Workflow permissions`

```
✅ Read and write permissions
✅ Allow GitHub Actions to create and approve pull requests
```

**لماذا؟**
- ✅ السماح للـ workflows بـ push وإنشاء commits
- ✅ السماح بإنشاء والموافقة على Pull Requests تلقائياً
- ✅ إضافة labels للـ PRs
- ✅ تحديث deployment status

---

### 2. Repository Secrets

**الموقع:** `Settings → Secrets and variables → Actions`

#### Required Secrets for Vercel Deployment:

```
VERCEL_TOKEN
├─ Description: Vercel authentication token
├─ How to get: https://vercel.com/account/tokens
└─ Format: vercel_xxx...

VERCEL_ORG_ID
├─ Description: Your Vercel organization/team ID
├─ How to get: vercel link → cat .vercel/project.json
└─ Format: team_xxx... or user_xxx...

VERCEL_PROJECT_ID
├─ Description: Your Vercel project ID
├─ How to get: vercel link → cat .vercel/project.json
└─ Format: prj_xxx...
```

#### Optional Secrets:

```
GITHUB_TOKEN
├─ Description: Auto-provided by GitHub
├─ Used for: API access, labels, comments
└─ No setup needed (automatic)
```

---

### 3. Branch Protection Rules (Optional but Recommended)

**الموقع:** `Settings → Branches → Add rule`

**For `main` branch:**

```yaml
✅ Require status checks to pass before merging
   Select: "deploy" or "enhanced-auto-merge"
   
✅ Require branches to be up to date before merging

✅ Allow auto-merge (important!)

⚠️ Require pull request reviews (optional)
   Reviewers: 0-1 (للسماح بالـ auto-merge)

❌ Do not select "Include administrators"
   (لتسهيل الاختبار)
```

---

## 🔍 كيفية التحقق من الإعدادات

### تحقق من Permissions:

```bash
# اذهب إلى:
https://github.com/[your-username]/[repo-name]/settings/actions

# تحت "Workflow permissions":
✓ Read and write permissions
✓ Allow GitHub Actions to create and approve pull requests
```

### تحقق من Secrets:

```bash
# اذهب إلى:
https://github.com/[your-username]/[repo-name]/settings/secrets/actions

# يجب أن ترى:
Repository secrets
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
VERCEL_TOKEN         Updated now
VERCEL_ORG_ID        Updated now
VERCEL_PROJECT_ID    Updated now
```

### اختبر الـ Workflows:

```bash
# 1. Deploy Workflow:
git push origin main
# راقب: Actions → Deploy Frontend to Vercel

# 2. Auto-Merge Workflow:
# إنشاء PR واختبار الدمج التلقائي
```

---

## 📋 Troubleshooting Checklist

### إذا فشل Deploy:

```
□ VERCEL_TOKEN موجود وصحيح؟
□ VERCEL_ORG_ID موجود وصحيح؟
□ VERCEL_PROJECT_ID موجود وصحيح؟
□ Workflow permissions مفعّلة؟
□ الكود يعمل محلياً (npm run build)؟
```

### إذا فشل Auto-Merge:

```
□ Workflow permissions تسمح بـ write؟
□ Branch protection rules لا تمنع auto-merge؟
□ Status checks مطلوبة ونجحت؟
□ PR ليس فيه conflicts يدوية؟
```

---

## 🚀 Quick Setup Commands

### إعداد Vercel Secrets:

```bash
# 1. احصل على Token
open https://vercel.com/account/tokens

# 2. احصل على Project IDs
cd /app/frontend
vercel link
cat .vercel/project.json

# 3. أضف في GitHub:
# Settings → Secrets → New repository secret
# Name: VERCEL_TOKEN, Value: [paste token]
# Name: VERCEL_ORG_ID, Value: [from project.json]
# Name: VERCEL_PROJECT_ID, Value: [from project.json]
```

### اختبار سريع:

```bash
# Test deployment
git commit --allow-empty -m "test: CI/CD"
git push origin main

# Test auto-merge
git checkout -b test/ci
echo "test" >> test.txt
git add test.txt
git commit -m "test: auto-merge"
git push origin test/ci
# ثم أنشئ PR في GitHub UI
```

---

## 📊 الإعدادات الموصى بها

### For Development:

```yaml
Branch Protection (main):
├─ Require status checks: ✓ (minimal)
├─ Require reviews: ✗ (للسرعة)
├─ Allow auto-merge: ✓
└─ Restrict pushes: ✗

Workflow Permissions:
├─ Read and write: ✓
└─ Allow PR creation: ✓
```

### For Production:

```yaml
Branch Protection (main):
├─ Require status checks: ✓ (all critical)
├─ Require reviews: ✓ (1 reviewer)
├─ Allow auto-merge: ✓ (for bot PRs)
└─ Restrict pushes: ✓ (admins only)

Workflow Permissions:
├─ Read and write: ✓
└─ Allow PR creation: ✓

Additional:
├─ CODEOWNERS file
├─ Required status checks
└─ Signed commits (optional)
```

---

## 🔐 Security Best Practices

### Secrets Management:

```
✅ Never commit secrets to code
✅ Use GitHub Secrets for sensitive data
✅ Rotate tokens regularly (every 90 days)
✅ Use least privilege (only necessary permissions)
✅ Monitor secret usage in Actions logs
```

### Workflow Security:

```
✅ Review third-party actions before use
✅ Pin action versions (@v4 instead of @main)
✅ Limit workflow permissions
✅ Use environment-specific secrets
✅ Enable branch protection
```

---

## 📚 الموارد الإضافية

### الملفات المحدثة:
- `.github/workflows/deploy-frontend.yml`
- `.github/workflows/pr-auto-merge-enhanced.yml`

### الوثائق:
- `CI_CD_TROUBLESHOOTING.md` - دليل استكشاف الأخطاء الكامل

### روابط خارجية:
- [GitHub Actions Docs](https://docs.github.com/actions)
- [Vercel CLI Docs](https://vercel.com/docs/cli)
- [Branch Protection Rules](https://docs.github.com/repositories/configuring-branches-and-merges-in-your-repository/defining-the-mergeability-of-pull-requests/about-protected-branches)

---

## ✅ Quick Verification

```bash
# 1. Check Permissions
curl -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/repos/[owner]/[repo]/actions/permissions

# 2. Check Secrets (will not show values, just names)
# GitHub UI only: Settings → Secrets

# 3. Check Workflows
gh workflow list
gh run list --workflow=deploy-frontend.yml

# 4. Check Branch Protection
gh api repos/[owner]/[repo]/branches/main/protection
```

---

**آخر تحديث:** أكتوبر 2024
**المسؤول:** GitHub Actions Admin
**الحالة:** ✅ محدّث ومُختبر
