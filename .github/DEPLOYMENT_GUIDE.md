# دليل النشر التلقائي - Auraa Luxury

## نظرة عامة
تم إعداد النشر التلقائي للمتجر باستخدام GitHub Actions مع دعم كامل للتحديثات الفورية.

## الإعدادات المطلوبة

### 1. Secrets المطلوبة في GitHub Repository
يجب إضافة هذه الـ Secrets في إعدادات Repository > Settings > Secrets and variables > Actions:

#### للـ Frontend (Vercel)
```
VERCEL_TOKEN=your_vercel_token
VERCEL_ORG_ID=your_organization_id
VERCEL_PROJECT_ID=your_project_id
```

#### للـ Backend (Render)
```
RENDER_DEPLOY_HOOK=your_render_deploy_hook_url
```

### 2. كيفية الحصول على الـ Tokens

#### Vercel Token
1. اذهب إلى https://vercel.com/account/tokens
2. أنشئ token جديد
3. انسخ التوكن وأضفه كـ Secret بإسم `VERCEL_TOKEN`

#### Vercel Project Details
```bash
# في مجلد frontend
npx vercel link
cat .vercel/project.json
```

#### Render Deploy Hook
1. اذهب إلى Render Dashboard > Your Service
2. Settings > Build & Deploy > Deploy Hook
3. انسخ الـ URL وأضفه كـ Secret بإسم `RENDER_DEPLOY_HOOK`

## كيف يعمل النشر التلقائي

### العمل الحالي
- ✅ النشر يعمل على جميع الفروع (`branches: [ '*' ]`)
- ✅ يتم الكشف التلقائي عن التغييرات في `frontend/` و `backend/`
- ✅ النشر المنفصل للـ Frontend والـ Backend حسب التغييرات
- ✅ تقارير مفصلة عن حالة النشر

### المشاكل المحتملة
1. **Secrets مفقودة**: تحقق من وجود جميع الـ Secrets المطلوبة
2. **فشل البناء**: تأكد من عدم وجود أخطاء في الكود
3. **حقوق الوصول**: تأكد من صحة الـ Tokens والحقوق

## التحقق من حالة النشر

### في GitHub
1. اذهب إلى tab "Actions" في الـ Repository
2. تحقق من حالة الـ workflows الأخيرة
3. راجع الـ logs للتفاصيل

### في Vercel
1. اذهب إلى Vercel Dashboard
2. تحقق من الـ Deployments الأخيرة
3. تأكد من نجاح البناء والنشر

### في Render
1. اذهب إلى Render Dashboard
2. تحقق من الـ Deploy logs
3. تأكد من تشغيل الخدمة

## الاستكشاف والحلول

### إذا لم يتم النشر التلقائي
1. تحقق من وجود الـ Secrets في GitHub
2. تأكد من التغييرات في المجلدات الصحيحة (`frontend/` أو `backend/`)
3. راجع الـ Actions logs للأخطاء

### للنشر اليدوي
يمكنك تشغيل النشر يدوياً من tab "Actions" > "Auto Deploy Full Stack" > "Run workflow"

## الدعم
إذا واجهت مشاكل، تحقق من:
1. صحة الـ Secrets
2. حالة خدمات Vercel و Render
3. صحة الكود وعدم وجود أخطاء في البناء