# 🔐 إضافة GitHub Secrets - خطوة بخطوة

## المتطلبات:
✅ يجب أن تكون حصلت على الـ 3 secrets من `GET_VERCEL_SECRETS.md`:
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

---

## 📍 الخطوات:

### 1. افتح GitHub Repository

اذهب إلى:
```
https://github.com/[username]/[repository-name]
```

### 2. اذهب إلى Settings

في أعلى Repository، اضغط على **"Settings"**

⚠️ **ملاحظة:** إذا لم تجد Settings، تأكد أن لديك صلاحيات Admin على الـ Repository

### 3. افتح Secrets and variables

في القائمة الجانبية اليسرى:
```
Security
  ↓
Secrets and variables
  ↓
Actions  ← اضغط هنا
```

### 4. إضافة Secret الأول: VERCEL_TOKEN

**الخطوة 1:** اضغط **"New repository secret"** (الزر الأخضر أعلى اليمين)

**الخطوة 2:** املأ النموذج:
```
Name: VERCEL_TOKEN
Secret: [الصق الـ Token من Vercel]
```

**الخطوة 3:** اضغط **"Add secret"**

✅ **تم! يجب أن ترى:**
```
VERCEL_TOKEN - Updated now
```

### 5. إضافة Secret الثاني: VERCEL_ORG_ID

**كرر نفس الخطوات:**

1. اضغط **"New repository secret"**
2. املأ:
   ```
   Name: VERCEL_ORG_ID
   Secret: [الصق الـ Org ID من Vercel]
   ```
3. اضغط **"Add secret"**

✅ **الآن لديك:**
```
VERCEL_TOKEN - Updated now
VERCEL_ORG_ID - Updated now
```

### 6. إضافة Secret الثالث: VERCEL_PROJECT_ID

**كرر مرة أخرى:**

1. اضغط **"New repository secret"**
2. املأ:
   ```
   Name: VERCEL_PROJECT_ID
   Secret: [الصق الـ Project ID من Vercel]
   ```
3. اضغط **"Add secret"**

✅ **النتيجة النهائية - يجب أن ترى:**
```
VERCEL_TOKEN - Updated now
VERCEL_ORG_ID - Updated now
VERCEL_PROJECT_ID - Updated now
```

---

## 🎉 تم بنجاح!

### ✅ Checklist النهائي:

- [ ] VERCEL_TOKEN مضاف ✅
- [ ] VERCEL_ORG_ID مضاف ✅
- [ ] VERCEL_PROJECT_ID مضاف ✅
- [ ] جميع الـ Secrets تظهر في القائمة ✅
- [ ] لا توجد أخطاء في الإملاء ✅

---

## 🚀 الخطوة التالية: Test Deployment

**الآن جاهز للاختبار!**

انتقل إلى ملف: `TEST_DEPLOYMENT.md`

---

## ⚠️ استكشاف الأخطاء:

### لا تستطيع رؤية Settings؟
- تأكد أنك صاحب Repository
- أو أن لديك صلاحيات Admin
- اطلب من صاحب Repository إضافتك كـ Admin

### Secret لا يحفظ؟
- تأكد من عدم وجود مسافات زائدة في البداية أو النهاية
- تأكد من صحة القيمة المنسوخة
- جرب مرة أخرى

### نسيت إضافة Secret؟
- لا مشكلة! يمكنك الرجوع وإضافته في أي وقت
- Repository Secrets → New repository secret

### تريد تحديث Secret؟
- اضغط على اسم الـ Secret
- اضغط **"Update secret"**
- الصق القيمة الجديدة
- اضغط **"Update secret"**

### تريد حذف Secret؟
- اضغط على اسم الـ Secret
- scroll للأسفل
- اضغط **"Remove secret"**
- أكد الحذف

---

## 📸 مثال توضيحي:

**يجب أن تبدو صفحة Secrets هكذا:**

```
Repository secrets

[ New repository secret ]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
VERCEL_TOKEN
Updated now
[Update] [Remove]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
VERCEL_ORG_ID
Updated now
[Update] [Remove]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
VERCEL_PROJECT_ID
Updated now
[Update] [Remove]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 🔒 ملاحظات أمنية:

1. ✅ **لا تشارك الـ Secrets مع أحد**
2. ✅ **لا تضعها في الكود أو commit**
3. ✅ **GitHub لن يظهر قيمة Secret بعد الإضافة** (أمان)
4. ✅ **Secrets مشفرة ومؤمنة في GitHub**
5. ⚠️ **إذا تسربت، احذفها فوراً وأنشئ جديدة**

---

## ✅ جاهز للاختبار!

**بعد التأكد من إضافة جميع الـ Secrets:**

👉 **افتح:** `TEST_DEPLOYMENT.md`

---

**تحتاج مساعدة؟** ارجع إلى:
- `GET_VERCEL_SECRETS.md` - للحصول على Secrets
- `.github/VERCEL_DEPLOYMENT_GUIDE.md` - للدليل الشامل
- `.github/DEPLOYMENT_CHECKLIST.md` - للـ checklist الكامل
