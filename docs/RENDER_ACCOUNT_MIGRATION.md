# نقل الخادم إلى حساب Render جديد

> دليل خطوة بخطوة. Render **لا يدعم نقل خدمة بين حسابين مباشرةً** — الطريقة هي إنشاء
> الخدمة من جديد في الحساب الجديد ثم تحويل الدومين إليها.

الترتيب أدناه مصمَّم بحيث **يبقى الموقع الحالي يعمل** حتى تتأكد أن الجديد سليم.

---

## قبل أن تبدأ — اجمع هذه من الحساب القديم

افتح الخدمة الحالية → **Environment**، وانسخ القيم التالية إلى مكان آمن:

| المتغيّر | لماذا يهم |
|----------|-----------|
| `MONGO_URL` | بدونه لا يقلع التطبيق إطلاقاً |
| `JWT_SECRET_KEY` | **انسخه كما هو** إن أردت إبقاء المستخدمين مسجّلين. توليد قيمة جديدة = خروج كل المستخدمين فوراً |
| `CORS_ORIGINS` | نطاقات الواجهة المسموح بها |
| `CJ_DROPSHIP_API_KEY` / `CJ_DROPSHIP_EMAIL` | استيراد المنتجات |
| `SENDGRID_API_KEY` | البريد |
| `EXCHANGE_RATE_API_KEY` | أسعار الصرف |

> `DB_NAME` قيمته `auraa_luxury_db` ومعرّفة في `render.yaml`، فلا تحتاج نسخها.

---

## ⚠️ العقبة الأولى: قائمة IP في MongoDB Atlas

**هذه أكثر سبب يُفشل النقل.** الخدمة الجديدة ستخرج من عناوين IP مختلفة، فإن كانت
قائمة Atlas مقيَّدة بعناوين الحساب القديم، سيفشل الاتصال بقاعدة البيانات و`/health`
سيُرجع `"db": false`.

**قبل أي شيء آخر:**

1. ادخل [MongoDB Atlas](https://cloud.mongodb.com) → مشروعك
2. **Network Access** → **Add IP Address**
3. اختر **Allow Access from Anywhere** (`0.0.0.0/0`)

> الخطة المجانية في Render لا تعطي IP ثابتاً، فلا بديل عملي عن `0.0.0.0/0`.
> الحماية الفعلية تأتي من كلمة مرور المستخدم في سلسلة الاتصال، لا من قائمة IP.
> إن أردت تقييداً حقيقياً لاحقاً، فذلك يتطلب خطة Render مدفوعة بـ Static Outbound IP.

---

## الخطوات

### 1) أنشئ الحساب الجديد واربط GitHub

1. [dashboard.render.com](https://dashboard.render.com) → أنشئ الحساب الجديد
2. **Account Settings** → **GitHub** → **Connect GitHub**
3. امنح الوصول إلى مستودع `yasoo2/auraa-luxury-store`

### 2) أنشئ الخدمة

الطريقة الأسرع — عبر Blueprint (يقرأ `backend/render.yaml`):

1. **New** → **Blueprint**
2. اختر المستودع → Render يكتشف `backend/render.yaml`
3. سيطلب منك القيم المعلَّمة `sync: false` — الصقها من القائمة أعلاه

أو يدوياً:

1. **New** → **Web Service** → اختر المستودع
2. اضبط:

| الحقل | القيمة |
|-------|--------|
| Name | `auraa-api` |
| Region | `Oregon` |
| Branch | `main` |
| **Root Directory** | `backend` ← **مهم، وإلا فشل البناء** |
| Runtime | `Python 3` |
| Build Command | `pip install -r requirements.txt` |
| Start Command | `uvicorn server:app --host 0.0.0.0 --port $PORT` |
| Health Check Path | `/health` |
| Auto-Deploy | `Yes` |

### 3) اضبط متغيّرات البيئة

**Environment** → أضف على الأقل:

```
ENV             = production
MONGO_URL       = <من الحساب القديم>
DB_NAME         = auraa_luxury_db
JWT_SECRET_KEY  = <من الحساب القديم — أو قيمة جديدة إن قبلت خروج الجميع>
CORS_ORIGINS    = https://auraaluxury.com,https://www.auraaluxury.com
```

ثم البقية (CJ، SendGrid، سعر الصرف) حسب حاجتك.

> **التطبيق يرفض الإقلاع في الإنتاج بلا `JWT_SECRET_KEY`.** هذا مقصود: البديل هو
> التوقيع بمفتاح منشور في مستودع عام، فيستطيع أي شخص تزوير توكن مدير.

### 4) تحقق قبل تحويل الدومين

انتظر انتهاء أول نشر، ثم افتح **رابط Render المؤقت** (شيء مثل
`auraa-api-xxxx.onrender.com`):

```
https://<الرابط-الجديد>/health
  → {"status":"ok","db":true}          ✅ جاهز
  → {"status":"ok","db":false}         ❌ قاعدة البيانات — راجع قائمة IP في Atlas
  → لا يستجيب / 502                    ❌ راجع Logs في Render

https://<الرابط-الجديد>/api/products   → قائمة منتجات (أو [] إن كانت فارغة)
```

**لا تكمل قبل أن يُرجع `/health` القيمة `db: true`.**

### 5) حوّل الدومين

Render لا يسمح بنفس الدومين على خدمتين، فالترتيب مُلزِم:

1. **الحساب القديم** → الخدمة → **Settings** → **Custom Domains** → احذف
   `api.auraaluxury.com`
2. **الحساب الجديد** → الخدمة → **Settings** → **Custom Domains** → **Add**
   → `api.auraaluxury.com`
3. Render سيعطيك قيمة CNAME
4. **Cloudflare** → DNS → عدّل سجل `api` → ضع قيمة CNAME الجديدة
   - أبقِ **Proxied** (السحابة البرتقالية) كما كانت
5. انتظر صدور شهادة TLS في Render (عادة دقائق)

### 6) تحقق نهائي

```
https://api.auraaluxury.com/health   → {"status":"ok","db":true}
```

ثم افتح `https://www.auraaluxury.com/auth` وجرّب تسجيل الدخول فعلياً.

### 7) نظّف

بعد يوم أو يومين من الاستقرار، احذف الخدمة القديمة من الحساب القديم — أو أوقفها
(Suspend) إن أردت إبقاء خيار الرجوع.

---

## استكشاف الأعطال

| العرَض | السبب الأرجح |
|--------|--------------|
| `KeyError: 'DB_NAME'` في الـ Logs | `DB_NAME` غير مضبوط |
| `RuntimeError: JWT_SECRET_KEY is not set` | اضبط `JWT_SECRET_KEY` |
| `/health` يُرجع `db: false` | قائمة IP في Atlas، أو `MONGO_URL` خاطئ |
| البناء يفشل فوراً | **Root Directory** ليس `backend` |
| الواجهة تعمل لكن الـ API يفشل بخطأ CORS | أضف نطاق الواجهة إلى `CORS_ORIGINS` |
| كل المستخدمين خرجوا بعد النقل | `JWT_SECRET_KEY` تغيّر — متوقّع إن ولّدت قيمة جديدة |
| الاستجابة الأولى بطيئة جداً | الخطة المجانية توقف الخدمة عند الخمول؛ الإقلاع البارد ~50 ثانية |

---

## ماذا **لا** يتأثر

- **قاعدة البيانات** — MongoDB Atlas مستقلة عن Render. لا تُنقل ولا تتأثر، والبيانات
  كلها باقية.
- **الواجهة** — على Cloudflare Pages، لا علاقة لها بحساب Render.
- **الدومين** — مُدار في Cloudflare؛ تغيّر سجل واحد فقط.

## ما **يُفقد**

- **الصور المرفوعة** عبر `/api/admin/upload-image` — قرص Render مؤقت أصلاً، وهي تُفقد
  عند كل إعادة نشر لا عند النقل فقط. الحل الدائم: اضبط `UPLOAD_DIR` على قرص مُركَّب
  (خطة مدفوعة) أو انقل التخزين إلى خدمة كائنات.
