# 🔑 دليل الحصول على Vercel Secrets - خطوة بخطوة

## المطلوب: 3 Secrets

---

## 1️⃣ VERCEL_TOKEN

### كيفية الحصول عليه:

**الخطوة 1:** اذهب إلى:
```
https://vercel.com/account/tokens
```

**الخطوة 2:** اضغط على **"Create Token"**

**الخطوة 3:** 
- Token Name: `github-actions-auraa-luxury`
- Scope: **Full Account** (اختر هذا)
- Expiration: **No Expiration** (أو حسب تفضيلك)

**الخطوة 4:** اضغط **"Create"**

**الخطوة 5:** 📋 **انسخ الـ Token فوراً!** (لن تستطيع رؤيته مرة أخرى)

```
مثال: vercel_abc123xyz456...
```

✅ **احتفظ به في مكان آمن مؤقتاً**

---

## 2️⃣ VERCEL_ORG_ID

### الطريقة 1: عبر Vercel Dashboard

**الخطوة 1:** اذهب إلى:
```
https://vercel.com/dashboard
```

**الخطوة 2:** اضغط على **Settings** (أعلى اليمين)

**الخطوة 3:** اختر **"General"** من القائمة الجانبية

**الخطوة 4:** ابحث عن:
- **Your ID** (إذا كنت Personal account)
- **Team ID** (إذا كنت Team account)

**الخطوة 5:** 📋 انسخ الـ ID

```
مثال: team_abc123xyz456...
```

### الطريقة 2: عبر Terminal (أسهل)

```bash
cd /app/frontend
npx vercel link
```

**اتبع التعليمات:**
1. Set up and link this project? **Y**
2. Which scope? اختر Account/Team
3. Link to existing project? **Y**
4. What's the name? اكتب اسم المشروع

**بعد الانتهاء:**
```bash
cat .vercel/project.json
```

**ستجد:**
```json
{
  "orgId": "team_abc123...",  ← هذا هو VERCEL_ORG_ID
  "projectId": "prj_xyz789..."  ← هذا هو VERCEL_PROJECT_ID
}
```

✅ **انسخ قيمة `orgId`**

---

## 3️⃣ VERCEL_PROJECT_ID

### الطريقة 1: عبر Vercel Dashboard

**الخطوة 1:** افتح مشروعك في Vercel:
```
https://vercel.com/dashboard
```

**الخطوة 2:** اختر مشروع **Auraa Luxury** (أو اسم Frontend project)

**الخطوة 3:** اذهب إلى **Settings** → **General**

**الخطوة 4:** في قسم "Project ID"، 📋 انسخ الـ ID

```
مثال: prj_abc123xyz456...
```

### الطريقة 2: عبر Terminal (نفس الطريقة السابقة)

```bash
cd /app/frontend
cat .vercel/project.json
```

✅ **انسخ قيمة `projectId`**

---

## ✅ Checklist - تأكد من الحصول على الثلاثة:

- [ ] `VERCEL_TOKEN` = `vercel_...`
- [ ] `VERCEL_ORG_ID` = `team_...` أو `user_...`
- [ ] `VERCEL_PROJECT_ID` = `prj_...`

---

## 🎯 الخطوة التالية:

**بعد الحصول على الثلاثة، انتقل إلى:**

### GitHub Repository → Settings → Secrets and variables → Actions

**ثم اتبع الخطوات في:** `ADD_GITHUB_SECRETS.md`

---

## ⚠️ ملاحظات مهمة:

1. **VERCEL_TOKEN** حساس جداً - لا تشاركه مع أحد
2. إذا نسيت الـ Token، يجب إنشاء واحد جديد
3. الـ IDs ليست سرية لكن احتفظ بها بشكل آمن
4. يمكنك استخدام Terminal method لجميع القيم دفعة واحدة

---

## 🆘 مشاكل؟

### لا يوجد لديك مشروع على Vercel؟
```bash
cd /app/frontend
npx vercel --prod
# اتبع التعليمات لإنشاء مشروع جديد
```

### `vercel link` يسأل عن مشروع غير موجود؟
- تأكد أنك في مجلد `/app/frontend`
- تأكد أن لديك حساب Vercel
- جرب: `npx vercel login` أولاً

### لا تستطيع الوصول لـ Vercel Dashboard؟
- تحقق من بريدك الإلكتروني المسجل
- أو أنشئ حساب جديد: https://vercel.com/signup

---

**بعد الحصول على الـ Secrets، استخدم ملف `ADD_GITHUB_SECRETS.md` للمتابعة!**
