# 🔐 إعداد GitHub Secrets للنشر التلقائي

## ✅ تم إنشاء ملف Workflow
**المسار:** `.github/workflows/deploy-on-merge.yml`

---

## 🔑 Secrets المطلوبة

يجب إضافة 3 Secrets في GitHub Repository:

### 1. RENDER_DEPLOY_HOOK_URL_BACKEND
**الوصف:** رابط Deploy Hook من Render للباك-إند

**كيفية الحصول عليه:**
1. اذهب إلى https://dashboard.render.com
2. اختر مشروع الباك-إند (Backend Service)
3. اذهب إلى **Settings** → **Deploy Hook**
4. انسخ الرابط (يبدأ بـ `https://api.render.com/deploy/...`)

**مثال:**
```
https://api.render.com/deploy/srv-xxxxxxxxxxxxx?key=xxxxxxxxxx
```

---

### 2. CLOUDFLARE_API_TOKEN
**الوصف:** API Token من Cloudflare لتفريغ الكاش

**كيفية الحصول عليه:**
1. اذهب إلى https://dash.cloudflare.com/profile/api-tokens
2. اضغط **Create Token**
3. اختر قالب **Edit zone DNS** أو **Custom Token**
4. أعطي الصلاحيات التالية:
   - **Zone** → **Cache Purge** → **Purge**
   - **Zone** → **Zone** → **Read**
5. حدد النطاق (Zone): `auraaluxury.com`
6. اضغط **Continue to summary** ثم **Create Token**
7. انسخ الـ Token (يظهر مرة واحدة فقط!)

**مثال:**
```
xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

### 3. CLOUDFLARE_ZONE_ID
**الوصف:** Zone ID من Cloudflare

**كيفية الحصول عليه:**
1. اذهب إلى https://dash.cloudflare.com
2. اختر موقعك: `auraaluxury.com`
3. في الشريط الجانبي الأيمن، ستجد **Zone ID**
4. انسخه

**مثال:**
```
xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## 📝 إضافة Secrets في GitHub

### الخطوات:

1. **اذهب إلى Repository في GitHub:**
   ```
   https://github.com/[username]/[repository-name]
   ```

2. **اضغط على Settings** (في شريط التنقل العلوي)

3. **في القائمة اليسرى، اختر:**
   ```
   Security → Secrets and variables → Actions
   ```

4. **اضغط على "New repository secret"**

5. **أضف كل Secret على حدة:**

   **Secret 1:**
   - Name: `RENDER_DEPLOY_HOOK_URL_BACKEND`
   - Value: [الرابط من Render]
   - اضغط **Add secret**

   **Secret 2:**
   - Name: `CLOUDFLARE_API_TOKEN`
   - Value: [Token من Cloudflare]
   - اضغط **Add secret**

   **Secret 3:**
   - Name: `CLOUDFLARE_ZONE_ID`
   - Value: [Zone ID من Cloudflare]
   - اضغط **Add secret**

---

## 🚀 كيف يعمل الـ Workflow؟

**عند عمل Push للفرع الرئيسي (main):**

1. ✅ يتم تشغيل الـ Workflow تلقائياً
2. ✅ يرسل طلب لـ Render لنشر الباك-إند
3. ✅ يفرغ كاش Cloudflare للفرونت-إند
4. ✅ يمكنك متابعة التقدم في **Actions** tab في GitHub

---

## 🔍 متابعة التنفيذ

**لرؤية نتائج الـ Workflow:**

1. اذهب إلى Repository في GitHub
2. اضغط على تبويب **Actions**
3. ستجد قائمة بجميع عمليات النشر
4. اضغط على أي workflow لرؤية التفاصيل

**الحالات:**
- ✅ **نجح** - أخضر
- ❌ **فشل** - أحمر
- 🟡 **قيد التنفيذ** - برتقالي

---

## ⚠️ ملاحظات مهمة

### 1. اسم الفرع الرئيسي
الـ Workflow يعمل على الفرع `main` فقط. إذا كان فرعك الرئيسي اسمه `master`، غيّر في الملف:

```yaml
on:
  push:
    branches: [ master ]  # غيّر من main إلى master
```

### 2. Cloudflare Pages
**مهم:** Cloudflare Pages ينشر تلقائياً عند Push، لكن الكاش يبقى. لذلك نحتاج تفريغ الكاش يدوياً.

### 3. Render Backend
Render ينتظر Deploy Hook لبدء النشر. الـ Workflow يرسله تلقائياً.

### 4. وقت التنفيذ
- Render Backend: 2-5 دقائق
- Cloudflare Cache Purge: 10-30 ثانية

---

## 🧪 اختبار الـ Workflow

**لاختبار أن كل شيء يعمل:**

1. عدّل أي ملف في الريبو (مثلاً README.md)
2. اعمل Commit & Push إلى main
3. اذهب إلى **Actions** في GitHub
4. شاهد الـ Workflow يعمل!

---

## ❌ استكشاف الأخطاء

### خطأ: "Secret not found"
**الحل:** تأكد من إضافة جميع الـ Secrets بالأسماء الصحيحة تماماً

### خطأ: "Unauthorized" من Cloudflare
**الحل:** تأكد من صلاحيات الـ API Token

### خطأ: "Deploy Hook failed"
**الحل:** تأكد من رابط Render Deploy Hook صحيح وصالح

---

## 📊 الخلاصة

**بعد إعداد الـ Secrets:**
- ✅ كل Push إلى main = نشر تلقائي للباك-إند
- ✅ تفريغ تلقائي لكاش Cloudflare
- ✅ لا حاجة لتدخل يدوي

**وفّر وقتك!** 🚀

---

**ملف الـ Workflow:** `.github/workflows/deploy-on-merge.yml`  
**آخر تحديث:** 21 أكتوبر 2025
