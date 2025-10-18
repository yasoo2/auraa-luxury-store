# 🔐 GitHub Secrets Setup Guide - Auraa Luxury

## المطلوب للنشر التلقائي

يجب إضافة هذه الـ Secrets في Repository Settings > Secrets and variables > Actions

### 🌐 Frontend Deployment (Vercel)

#### 1. VERCEL_TOKEN
```bash
# اذهب إلى: https://vercel.com/account/tokens
# أنشئ token جديد واسمه "GitHub Actions - Auraa Luxury"
# انسخ التوكن وأضفه كـ Secret
```

#### 2. VERCEL_ORG_ID & VERCEL_PROJECT_ID
```bash
# في terminal، اذهب إلى مجلد frontend
cd frontend

# ربط المشروع بـ Vercel (إذا لم يتم من قبل)
npx vercel link

# استخراج معلومات المشروع
cat .vercel/project.json

# ستجد:
# "orgId": "your-org-id-here" <- هذا هو VERCEL_ORG_ID
# "projectId": "your-project-id-here" <- هذا هو VERCEL_PROJECT_ID
```

### ⚙️ Backend Deployment (Render)

#### 3. RENDER_DEPLOY_HOOK
```bash
# اذهب إلى: https://dashboard.render.com
# اختر خدمة الـ Backend
# Settings > Build & Deploy > Deploy Hook
# انسخ الـ URL الكامل وأضفه كـ Secret
```

### 🌍 Environment Variables (اختياري)

#### 4. REACT_APP_BACKEND_URL (اختياري)
```bash
# عادة: https://your-backend-service.render.com
# إذا لم يتم تعيينه، سيستخدم القيمة الافتراضية
```

## ✅ التحقق من الإعدادات

بعد إضافة جميع الـ Secrets:

1. **اذهب إلى Actions tab في Repository**
2. **شغل "Main Branch Auto Deploy" يدوياً**
3. **تحقق من الـ logs للتأكد من نجاح كل خطوة**

## 🧪 اختبار النشر التلقائي

```bash
# 1. اعمل تغيير بسيط في أي ملف
echo "Test deployment $(date)" >> README.md

# 2. اعمل commit و push
git add .
git commit -m "test: deployment verification"
git push origin main

# 3. تابع Actions tab لرؤية النشر التلقائي
```

## 🔍 استكشاف الأخطاء

### إذا فشل النشر:

1. **تحقق من الـ Secrets:**
   - Repository Settings > Secrets and variables > Actions
   - تأكد من وجود جميع الـ 4 secrets المطلوبة

2. **تحقق من Vercel:**
   - dashboard.vercel.com
   - تأكد من ربط المشروع بـ Git repository

3. **تحقق من Render:**
   - dashboard.render.com  
   - تأكد من تفعيل Auto-Deploy من Git

### رسائل الأخطاء الشائعة:

- `VERCEL_TOKEN not found` → أضف Vercel token
- `RENDER_DEPLOY_HOOK not set` → أضف Render deploy hook  
- `Build failed` → تحقق من أخطاء الكود
- `HTTP 401/403` → تحقق من صحة الـ tokens

## 🎯 النتيجة المتوقعة

بعد الإعداد الصحيح:
- ✅ أي push على main branch → نشر تلقائي فوري
- ✅ Frontend changes → Vercel deployment  
- ✅ Backend changes → Render deployment
- ✅ تقارير مفصلة في Actions tab
- ✅ إشعارات نجاح/فشل النشر