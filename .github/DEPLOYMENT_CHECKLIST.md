# ✅ Deployment Checklist - قائمة التحقق من النشر

## قبل النشر | Pre-Deployment

### 1. GitHub Secrets (اختر طريقة واحدة)

#### الطريقة 1: Vercel CLI (موصى بها)
- [ ] `VERCEL_TOKEN` added to GitHub Secrets
- [ ] `VERCEL_ORG_ID` added to GitHub Secrets  
- [ ] `VERCEL_PROJECT_ID` added to GitHub Secrets

#### الطريقة 2: Deploy Hook (بديلة)
- [ ] `VERCEL_DEPLOY_HOOK` added to GitHub Secrets

### 2. Vercel Project Setup
- [ ] Project exists on Vercel Dashboard
- [ ] Project is connected to GitHub repository
- [ ] Production branch is set to `main`
- [ ] Environment variables added in Vercel:
  - [ ] `REACT_APP_BACKEND_URL`
  - [ ] Any other required variables

### 3. GitHub Repository
- [ ] `.github/workflows/deploy-frontend.yml` exists
- [ ] Workflow file syntax is correct
- [ ] Branch trigger is set to `main`
- [ ] Actions are enabled in repository settings

---

## اختبار النشر | Deployment Test

### خطوة 1: اختبار محلي
```bash
cd frontend
npm install
npm run build
# تأكد أن Build ينجح بدون أخطاء
```

### خطوة 2: اختبار GitHub Action
```bash
# قم بتعديل بسيط
echo "# Test deployment - $(date)" >> README.md
git add README.md
git commit -m "test: verify CI/CD pipeline"
git push origin main
```

### خطوة 3: مراقبة النشر
- [ ] اذهب إلى GitHub Repository → Actions
- [ ] افتح آخر workflow run
- [ ] تحقق من نجاح جميع الخطوات:
  - [ ] Checkout code ✅
  - [ ] Setup Node.js ✅
  - [ ] Install Vercel CLI ✅
  - [ ] Pull Vercel Environment ✅
  - [ ] Build Project ✅
  - [ ] Deploy to Vercel ✅

### خطوة 4: تحقق من Vercel
- [ ] اذهب إلى [Vercel Dashboard](https://vercel.com/dashboard)
- [ ] افتح المشروع
- [ ] تحقق من آخر deployment:
  - [ ] Status: Ready ✅
  - [ ] Build Time: معقول (< 5 دقائق)
  - [ ] No errors in logs

### خطوة 5: تحقق من Production Site
- [ ] افتح Production URL
- [ ] تحقق من التحديثات:
  - [ ] جميع التواريخ ميلادية (لا هجري) ✅
  - [ ] صفحة Super Admin تعمل ✅
  - [ ] تسجيل الدخول يعمل ✅
  - [ ] لا توجد أخطاء في Console ✅

---

## حل المشاكل السريع | Quick Troubleshooting

### ❌ Workflow يفشل في GitHub Actions

**1. خطأ: "VERCEL_TOKEN is not set"**
```bash
# تحقق من GitHub Secrets
# Settings → Secrets and variables → Actions
# تأكد من وجود VERCEL_TOKEN
```

**2. خطأ: "Error: No Project Settings found"**
```bash
cd frontend
vercel link
cat .vercel/project.json
# استخدم VERCEL_ORG_ID و VERCEL_PROJECT_ID في GitHub Secrets
```

**3. خطأ: Build fails**
```bash
# اختبر Build محلياً
cd frontend
npm install
npm run build
# أصلح أي أخطاء تظهر
```

### ❌ Build ينجح لكن الموقع لا يتحدث

**1. تحقق من Environment Variables في Vercel:**
```
Vercel Dashboard → Project → Settings → Environment Variables
تأكد من وجود REACT_APP_BACKEND_URL وقيمته صحيحة
```

**2. Clear Cache and Redeploy:**
```
Vercel Dashboard → Deployments → Latest → ... (menu) → Redeploy
اختر "Use existing Build Cache" = OFF
```

**3. تحقق من Browser Cache:**
```
افتح الموقع في Incognito/Private mode
أو اضغط Ctrl+Shift+R (Hard Refresh)
```

---

## 🎯 التحقق النهائي | Final Verification

### Deployment Pipeline Working ✅
- [ ] Push to `main` triggers automatic deployment
- [ ] GitHub Actions shows green checkmark
- [ ] Vercel shows successful deployment
- [ ] Production site reflects latest changes
- [ ] No errors in GitHub Actions logs
- [ ] No errors in Vercel deployment logs
- [ ] No errors in browser console

### Features Working ✅
- [ ] Authentication (Login/Register) works
- [ ] All dates show in Gregorian format
- [ ] Super Admin page loads without errors
- [ ] Statistics API returns data (no 500 error)
- [ ] Multi-language switching works
- [ ] All pages load correctly
- [ ] No broken links or 404 errors

---

## 📊 نتيجة الاختبار | Test Results

**تاريخ الاختبار:** _________________

**الشخص المختبر:** _________________

**النتيجة العامة:**
- [ ] ✅ نجح - كل شيء يعمل
- [ ] ⚠️ نجح مع ملاحظات (اذكرها أدناه)
- [ ] ❌ فشل (اذكر المشاكل أدناه)

**ملاحظات:**
_________________________________________________
_________________________________________________
_________________________________________________

---

## 📞 إذا لم يعمل شيء | If Nothing Works

### خيار 1: استخدم Deploy Hook (أسرع)
1. أنشئ Deploy Hook في Vercel
2. أضف `VERCEL_DEPLOY_HOOK` في GitHub Secrets
3. فعّل workflow في `deploy.yml`

### خيار 2: النشر اليدوي
```bash
cd frontend
vercel --prod
# اتبع التعليمات
```

### خيار 3: اطلب مساعدة
- تحقق من [Vercel Support](https://vercel.com/support)
- أو راجع الـ logs بعناية
- أو استخدم Vercel CLI للتشخيص:
  ```bash
  vercel --debug
  ```

---

**آخر تحديث:** أكتوبر 2024
**الإصدار:** 1.0
