# 🚀 Vercel Deployment Guide - دليل النشر على Vercel

## 📋 نظرة عامة | Overview

هذا المشروع يستخدم طريقتين للنشر التلقائي على Vercel:
1. **الطريقة الأساسية (Recommended):** استخدام Vercel CLI مع Secrets
2. **الطريقة البديلة (Backup):** استخدام Vercel Deploy Hook

---

## ✅ الطريقة 1: Vercel CLI (موصى بها)

### الملف المستخدم:
`.github/workflows/deploy-frontend.yml`

### المتطلبات:
يجب إضافة 3 أسرار في GitHub Repository:

#### 1. `VERCEL_TOKEN`
**كيفية الحصول عليه:**
1. اذهب إلى [Vercel Dashboard](https://vercel.com/account/tokens)
2. اضغط على **"Create Token"**
3. أدخل اسم للـ Token (مثال: `github-actions`)
4. اختر Scope: **Full Account**
5. اضغط **"Create"**
6. 📋 انسخ الـ Token (لن تستطيع رؤيته مرة أخرى!)

#### 2. `VERCEL_ORG_ID`
**كيفية الحصول عليه:**
1. اذهب إلى [Vercel Dashboard](https://vercel.com/dashboard)
2. اختر **Team Settings** (أو Account Settings)
3. ستجد **Team ID** أو **User ID**
4. 📋 انسخه

**أو عبر Terminal:**
```bash
cd frontend
npx vercel link
cat .vercel/project.json
```

#### 3. `VERCEL_PROJECT_ID`
**كيفية الحصول عليه:**
1. افتح مشروعك في Vercel
2. اذهب إلى **Settings** → **General**
3. ستجد **Project ID**
4. 📋 انسخه

**أو عبر Terminal:**
```bash
cd frontend
npx vercel link
cat .vercel/project.json
```

### إضافة Secrets في GitHub:
1. اذهب إلى Repository في GitHub
2. **Settings** → **Secrets and variables** → **Actions**
3. اضغط **"New repository secret"**
4. أضف كل secret:
   - Name: `VERCEL_TOKEN`, Value: `[القيمة من الخطوة 1]`
   - Name: `VERCEL_ORG_ID`, Value: `[القيمة من الخطوة 2]`
   - Name: `VERCEL_PROJECT_ID`, Value: `[القيمة من الخطوة 3]`

### التفعيل:
بمجرد إضافة الـ Secrets، أي push إلى `main` branch سيقوم بـ:
1. ✅ Build الـ Frontend
2. ✅ Deploy على Vercel Production
3. ✅ تحديث الموقع تلقائياً

---

## 🔄 الطريقة 2: Vercel Deploy Hook (بديلة)

### الملف المستخدم:
`.github/workflows/deploy.yml`

### المتطلبات:
يجب إضافة secret واحد فقط في GitHub Repository:

#### `VERCEL_DEPLOY_HOOK`
**كيفية الحصول عليه:**
1. افتح مشروعك في Vercel Dashboard
2. **Settings** → **Git**
3. اضغط **"Create Hook"** في قسم Deploy Hooks
4. أدخل اسم (مثال: `github-main`)
5. اختر Branch: **main** (أو production branch)
6. اضغط **"Create Hook"**
7. 📋 انسخ الـ URL الذي يظهر

### إضافة Secret في GitHub:
1. اذهب إلى Repository في GitHub
2. **Settings** → **Secrets and variables** → **Actions**
3. اضغط **"New repository secret"**
4. أضف:
   - Name: `VERCEL_DEPLOY_HOOK`
   - Value: `[الـ URL من الخطوة السابقة]`

### التفعيل:
هذه الطريقة حالياً **manual trigger only** (يدوي فقط).
لتفعيل النشر التلقائي:
1. افتح `.github/workflows/deploy.yml`
2. أزل التعليق من:
   ```yaml
   # push:
   #   branches: [ "main" ]
   ```

### متى تستخدم هذه الطريقة؟
- ✅ إذا لم تستطع الحصول على Vercel Token
- ✅ كـ backup method إذا فشلت الطريقة الأولى
- ✅ للنشر اليدوي السريع

---

## 🧪 اختبار النشر | Test Deployment

### اختبار الطريقة الأولى (CLI):
```bash
# قم بتعديل بسيط وارفعه
echo "# Test deployment" >> README.md
git add README.md
git commit -m "test: verify deployment pipeline"
git push origin main
```

### اختبار الطريقة الثانية (Hook):
1. اذهب إلى GitHub Repository
2. **Actions** tab
3. اختر workflow: **"Deploy via Vercel Hook"**
4. اضغط **"Run workflow"**
5. اختر branch: `main`
6. اضغط **"Run workflow"**

---

## 🔍 استكشاف الأخطاء | Troubleshooting

### خطأ: "VERCEL_TOKEN is not set"
**الحل:**
- تأكد من إضافة `VERCEL_TOKEN` في GitHub Secrets
- تحقق من كتابة الاسم بشكل صحيح (حساس لحالة الأحرف)

### خطأ: "Error: No Project Settings found"
**الحل:**
```bash
cd frontend
vercel link
# اتبع التعليمات لربط المشروع
cat .vercel/project.json
# استخدم القيم في GitHub Secrets
```

### خطأ: "Deployment failed with exit code 1"
**الحل:**
1. افتح **Actions** tab في GitHub
2. اضغط على الـ workflow الفاشل
3. افتح **deploy** job
4. اقرأ الـ logs لمعرفة السبب الدقيق

### خطأ: "Error: Invalid token"
**الحل:**
- الـ Token منتهي أو غير صحيح
- أنشئ token جديد وحدّث Secret في GitHub

### Build ينجح لكن الموقع لا يتحدث
**الحل:**
- تأكد من أن Vercel Project متصل بنفس Repository
- تحقق من Vercel Dashboard → Deployments
- قد يكون هناك conflict - حاول **Clear Cache and Redeploy**

---

## 📊 مقارنة الطرق | Comparison

| الميزة | Vercel CLI | Deploy Hook |
|--------|-----------|-------------|
| **Setup Complexity** | متوسط | سهل |
| **Control Level** | عالي | منخفض |
| **Build Process** | في GitHub Actions | في Vercel |
| **Cache Support** | ✅ نعم | ✅ نعم |
| **Environment Variables** | ✅ كاملة | ⚠️ من Vercel فقط |
| **Logs Detail** | ✅ تفصيلية | ⚠️ في Vercel فقط |
| **Speed** | أسرع (build محلي) | أبطأ قليلاً |
| **Recommended** | ✅ نعم | كـ backup |

---

## 🎯 التوصية النهائية | Final Recommendation

**استخدم الطريقة 1 (Vercel CLI)** لأنها:
- ✅ توفر سيطرة أكبر
- ✅ logs أوضح
- ✅ أسرع في Build
- ✅ دعم أفضل لـ Environment Variables

**احتفظ بالطريقة 2 (Deploy Hook)** كـ backup method للنشر اليدوي السريع.

---

## 📝 ملاحظات إضافية | Additional Notes

### Environment Variables في Frontend:
تأكد من إضافة المتغيرات المطلوبة في Vercel Dashboard:
1. اذهب إلى Project → **Settings** → **Environment Variables**
2. أضف:
   - `REACT_APP_BACKEND_URL`
   - أي متغيرات أخرى مطلوبة

### تحديث التغييرات على Production:
بعد إعداد كل شيء:
```bash
git add .
git commit -m "chore: update deployment configuration"
git push origin main
```
سيتم نشر التحديثات تلقائياً! ✅

---

## 🆘 الدعم | Support

إذا واجهت أي مشاكل:
1. تحقق من [Vercel Documentation](https://vercel.com/docs)
2. افحص GitHub Actions logs
3. تحقق من Vercel Dashboard → Deployments → Logs
4. استخدم Troubleshooting section أعلاه

---

**آخر تحديث:** أكتوبر 2024
**الحالة:** ✅ جاهز للاستخدام
