# تحليل شامل للنظام — Auraa Luxury Store

> تاريخ التحليل: 2026-08-07 · الفرع: `claude/system-analysis-l9rvdf` · آخر كوميت: `5d9cf9f`

كل النتائج أدناه **مُثبتة تجريبياً** بتشغيل التطبيق فعلياً (FastAPI TestClient) وليست مبنية على قراءة الكود فقط.

---

## ⚠️ حالة الإصلاح

هذا المستند يصف حالة النظام **قبل** الإصلاح. تم لاحقاً تنفيذ **المرحلة 1** بالكامل في نفس الفرع.

**السبب الجذري المكتشف:** `server.py.backup` (النسخة الكاملة بـ63 نقطة) يحتوي **خطأ صياغي واحد** — فاصلة ناقصة في السطر 246:

```python
    skip: int = 0,
    limit: int = 20        # ← فاصلة ناقصة
    language: Optional[str] = Query(None, ...)
):
```

بدل إصلاح الفاصلة، تم تجريد `server.py` من 63 نقطة إلى 8. **حرف واحد ناقص أسقط المتجر بأكمله.**

| البند | الحالة |
|------|--------|
| 1. ترتيب `logger` | ✅ مُصلح — التطبيق يقلع الآن رغم فشل CJ |
| 2. `jwt.JWTError` → `PyJWTError` | ✅ مُصلح — 401 بدل 500 |
| 3. عقد تسجيل الدخول | ✅ مُصلح — دخول بالبريد **والهاتف** |
| 4. `/health` + `/api/health` | ✅ مُضاف |
| 5. مسار OAuth | ✅ مُصلح — `POST /api/auth/oauth/session` |
| 6. واجهات المتجر | ✅ مُستعادة — 38 مسار (كان 18) |
| `/wishlist` | ❌ **غير مُنفَّذ في أي ملف** — ميزة ناقصة لا خطأ |
| المرحلة 2 (الأمن) | ⏳ لم تُنفَّذ بعد |

**التحقق:** 34 اختبار end-to-end ناجح (تسجيل → دخول بالبريد/الهاتف → منتجات → سلة → طلب → تتبّع → حراسة الصلاحيات).

---

## 1. الخلاصة التنفيذية

المتجر **غير قابل للتشغيل في وضعه الحالي**. ليست مشكلة أداء أو تحسينات — بل ثلاث أعطال قاتلة تمنع أي مستخدم من الشراء أو حتى تسجيل الدخول:

| # | العطل | الأثر |
|---|-------|-------|
| 1 | تسجيل الدخول يُرجع **422 دائماً** بسبب عدم تطابق العقد بين الواجهة والخادم | لا يمكن لأي مستخدم الدخول — إطلاقاً |
| 2 | **18 مسار فقط** مُفعّل في الخادم مقابل ~70 تستدعيها الواجهة | لا منتجات، لا سلة، لا طلبات، لا دفع |
| 3 | `healthCheckPath: /health` في Render لكن المسار **غير موجود** | فشل النشر / إعادة تشغيل مستمرة |

بالإضافة إلى **ثغرة CORS** تسمح لأي نطاق `*.vercel.app` بقراءة استجابات مُصادَقة، وغياب كامل للتحقق من الصلاحيات على المسارات الحسّاسة.

**التقدير:** الإصلاحات القاتلة (1-6) تحتاج ~1-2 يوم عمل. إعادة ربط الـ routes المفقودة هي العمل الأكبر.

---

## 2. معمارية النظام

```
┌────────────────────────┐        ┌──────────────────────────┐       ┌──────────────┐
│  Frontend (React 18)   │        │   Backend (FastAPI)      │       │  MongoDB     │
│  CRA + CRACO           │ HTTPS  │   Python 3.11            │ motor │  (Atlas)     │
│  Tailwind + Radix UI   ├───────►│   uvicorn                ├──────►│              │
│  react-router v7       │  /api  │                          │       │              │
│  Vercel / CF Pages     │        │   Render (Oregon, free)  │       │              │
└────────────────────────┘        └──────────────────────────┘       └──────────────┘
         │                                    │
         │ Service Worker (PWA)               ├──► CJ Dropshipping API (استيراد منتجات)
         │ Cache + offline sync               ├──► SendGrid (بريد)
         └────────────────────────            └──► Google OAuth / Stripe (مُعرّفة، غير مفعّلة)
```

**المكوّنات:** ~120 ملف React، ~40 وحدة Python، طبقة خدمات (CJ، تسعير، عملات، بريد، جدولة، GeoIP)، دعم ثنائي اللغة (عربي/إنجليزي) مع RTL.

---

## 3. الأعطال القاتلة (Blockers)

### 3.1 تسجيل الدخول مكسور كلياً — 422 في كل الحالات

الواجهة ترسل `identifier`، الخادم يطلب `email`:

```js
// frontend/src/context/AuthContext.js:48
const credentials = { identifier, password, remember_me: rememberMe };
```
```python
# backend/routes/auth.py:34
class UserLogin(BaseModel):
    email: EmailStr      # ← حقل مطلوب، الواجهة لا ترسله أبداً
    password: str
    turnstile_token: Optional[str] = None
```

**مُثبت تجريبياً:**
```
POST /api/auth/login {"identifier":"user@example.com","password":"pw","remember_me":true}
→ HTTP 422 {"detail":[{"type":"missing","loc":["body","email"],"msg":"Field required"}]}
```

ويتفاقم الخطأ: الواجهة تُترجم `401`→"كلمة مرور خاطئة" و`404`→"حساب غير موجود"، لكن `422` تسقط في `else` فيرى المستخدم رسالة عامة `login_failed` بلا أي دلالة. كما أن `AuthPage.js:96` يسمح بالدخول برقم الهاتف، بينما `EmailStr` سيرفض أي رقم هاتف حتى لو صُحّح اسم الحقل.

**الإصلاح:** توحيد العقد على `identifier` مع البحث في `email` أو `phone`:
```python
class UserLogin(BaseModel):
    identifier: str
    password: str
    remember_me: bool = False
    turnstile_token: Optional[str] = None

user = await db.users.find_one({"$or": [{"email": creds.identifier},
                                        {"phone": creds.identifier}]})
```

### 3.2 معظم واجهات المتجر غير مُسجّلة — 404

`server.py` (511 سطر) يُسجّل **8 نقاط** فقط + مسارات المصادقة. النسخة الاحتياطية `server.py.backup` (89KB) تحتوي **63 نقطة**. أي أن الملف تم اختصاره وفقدت معه معظم وظائف المتجر.

**المسارات الحيّة فعلياً (18):**
```
/sitemap.xml                      /api/auth/{register,login,logout,me,refresh}
/api/readiness                    /api/auth/oauth/google/{url,callback}
/api/imports/start                /admin/cj/{ping,test-auth,import/bulk,products/list}
/api/imports/{job_id}/status      /api/products/staging  (+ PUT/DELETE)
/api/products/publish-staging
```

**مُثبت تجريبياً** — نقاط تستدعيها الواجهة وترجع 404:
```
GET /api/products            → 404      GET /api/categories          → 404
GET /api/cart                → 404      GET /api/wishlist            → 404
GET /api/orders              → 404      GET /api/admin/users         → 404
GET /api/health              → 404      GET /api/setup/check-admin   → 404
GET /api/auth/forgot-password→ 404
```

**وحدات routes مكتوبة لكن غير مربوطة نهائياً (34 نقطة معطّلة):**

| الملف | عدد النقاط | الحالة |
|-------|-----------|--------|
| `routes/super_admin.py` | 12 | غير مُسجّل |
| `routes/cj_routes.py` | 9 | غير مُسجّل |
| `routes/super_admin_simple.py` | 4 | غير مُسجّل |
| `routes/cj_import_routes.py` | 4 | غير مُسجّل |
| `routes/test_cj_routes.py` | 3 | غير مُسجّل |
| `routes/admin_products_routes.py` | 2 | غير مُسجّل |

ملاحظة إضافية: `routes/cj_admin.py` مربوط على `app` مباشرة بلا بادئة `/api`، فصار على `/admin/cj/*` بينما الواجهة تنادي `/api/...` — عدم اتساق يجب توحيده.

### 3.3 فحص الصحة في Render يشير لمسار غير موجود

```yaml
# backend/render.yaml:9
healthCheckPath: /health     # ← لا يوجد أي مسار /health في التطبيق
```
Render سيعتبر الخدمة غير سليمة ويعيد تشغيلها باستمرار أو يفشل النشر. الواجهة أيضاً تستدعي `/api/health` غير الموجود.

**الإصلاح:** إضافة `@app.get("/health")` يُرجع `{"status":"ok"}` (ويفضّل فحص اتصال Mongo).

---

## 4. الثغرات الأمنية

### 4.1 🔴 حرج — CORS يعكس أي نطاق `*.vercel.app` مع credentials

```python
# backend/server.py:95-102
elif ".vercel.app" in origin:            is_allowed = True
elif ".emergentagent.com" in origin:     is_allowed = True
```

**مُثبت تجريبياً:**
```
https://evil-attacker.vercel.app       → ACAO='https://evil-attacker.vercel.app'  creds='true'
https://totally-evil.emergentagent.com → ACAO='https://totally-evil.emergentagent.com' creds='true'
```

أي شخص ينشر موقعاً مجانياً على Vercel يستطيع قراءة استجابات مُصادَقة نيابةً عن أي مستخدم مسجّل (سرقة بيانات حساب، طلبات، عناوين). الفحص `".vercel.app" in origin` أضعف حتى من فحص اللاحقة — فـ `https://vercel.app.evil.com` يمرّ أيضاً.

**الإصلاح:** قائمة بيضاء صريحة، أو تعبير نمطي مُقيّد لنطاقات المعاينة المملوكة للمشروع فقط:
```python
PREVIEW_RE = re.compile(r"^https://auraa-[a-z0-9-]+\.vercel\.app$")
is_allowed = origin in allowed_origins or bool(PREVIEW_RE.match(origin or ""))
```

### 4.2 🔴 حرج — نقاط كتابة بلا أي مصادقة

كل هذه النقاط الحيّة تقبل الطلبات من أي شخص على الإنترنت بلا `Depends(...)`:

```python
@api_router.post("/imports/start")                    # يشغّل استيراد 1000 منتج (استنزاف حصة CJ + الموارد)
@api_router.put("/products/staging/{product_id}")     # تعديل بيانات المنتجات
@api_router.delete("/products/staging/{product_id}")  # حذف المنتجات
@api_router.post("/products/publish-staging")         # نشر منتجات للمتجر الحيّ
```
ومسارات `/admin/cj/*` كذلك (`import/bulk` يقبل `count` حتى 1000).

**الإصلاح:** `Depends(require_admin)` على كل نقطة إدارية.

### 4.3 🔴 حرج — الحماية من التخمين (rate limiting) غير مُفعّلة

`middleware/rate_limiter.py` مكتوب بالكامل (5 محاولات / 5 دقائق) لكنه **لم يُسجّل أبداً** في `server.py`. الوسيط الوحيد الفعّال هو `CustomCORSMiddleware`. أي أن `/api/auth/login` مفتوح لهجمات التخمين بلا حد.

> عند تفعيله: `request.client.host` خلف Render/Cloudflare يُرجع IP الوسيط لا المستخدم، فسيُحدّ جميع المستخدمين ككيان واحد. يجب قراءة `X-Forwarded-For` أو `CF-Connecting-IP`.

### 4.4 🟠 عالٍ — مفاتيح JWT غير متسقة مع قيم افتراضية مكشوفة

```python
routes/auth.py:20     SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'your-secret-key-change-in-production')
middleware/auth.py:11 SECRET_KEY = os.getenv('SECRET_KEY',     'your-secret-key-change-in-production')
```
اسمان مختلفان لمتغيّرين مختلفين. `render.yaml` يعرّف `JWT_SECRET_KEY` فقط، لذا `middleware/auth.py` سيقع دائماً على القيمة الافتراضية المكشوفة في المستودع العام. يجب أن يفشل التطبيق عند الإقلاع إن لم يُضبط السر، لا أن يستخدم قيمة معروفة.

### 4.5 🟠 عالٍ — `verify_super_admin` تُرجع مدير وهمي لأي توكن

```python
# backend/middleware/auth.py:15-31
async def verify_super_admin(token: str = None) -> Dict:
    if not token: raise HTTPException(401, ...)
    return {"id": "test-super-admin", "email": "admin@test.com", "is_super_admin": True}
```
لا تتحقق من التوقيع ولا من صلاحية التوكن — أي نص عشوائي يمنح صلاحيات المدير الأعلى. حالياً غير مستغلّة لأن المسارات التي تستخدمها غير مُسجّلة، لكنها **قنبلة موقوتة** تنفجر لحظة ربط `super_admin.py`.

### 4.6 🟠 عالٍ — Refresh token صالح 10 سنوات بلا إبطال

```python
REFRESH_TOKEN_EXPIRE_DAYS = 3650   # 10 سنوات
```
لا توجد قائمة إبطال، ولا تخزين في قاعدة البيانات، و`/logout` يمسح الكوكي من المتصفح فقط — التوكن يبقى صالحاً للاستخدام إن سُرّب. عملياً: تسريب واحد = اختراق دائم. الموجود `services/refresh_token_manager.py` غير مربوط.

### 4.7 🟡 متوسط — `/admin/*` بلا حارس مسار

```jsx
// frontend/src/App.js:104
<Route path="/admin/*" element={<AdminDashboard />} />
```
لا يوجد `ProtectedRoute`. `AdminDashboard.js:52` يعيد التوجيه داخلياً بعد التحميل، لكن هذا حماية واجهة فقط — يظل الحاجز الحقيقي هو الخادم، وهو غائب (بند 4.2).

---

## 5. أخطاء برمجية مؤكدة

### 5.1 `logger` مُستخدم قبل تعريفه — انهيار كامل عند الإقلاع

```python
# backend/server.py:30-35
try:
    from services.cj_dropshipping import CJDropshippingService
    cj_service = CJDropshippingService()
except Exception as e:
    logger.warning(f"CJ service initialization failed: {e}")   # ← السطر 34
    cj_service = None
...
logger = logging.getLogger(__name__)                            # ← السطر 45
```

`logger` يُعرّف في السطر 45، أي بعد استخدامه بـ 11 سطراً. الكتلة موجودة أصلاً لالتقاط فشل خدمة CJ بأمان — لكنها بدل ذلك تُسقط التطبيق بأكمله.

**مُثبت تجريبياً** (بمحاكاة فشل استيراد CJ):
```
BOOT CRASH -> NameError : name 'logger' is not defined
```

عملياً: أي تعطّل مؤقت في CJ أو نقص متغيّر بيئة = الخادم لا يقلع إطلاقاً. **الإصلاح:** نقل تهيئة الـ logging إلى ما قبل الكتلة.

### 5.2 `jwt.JWTError` غير موجود في PyJWT — 500 بدل 401

```python
# backend/routes/auth.py:293, 337
except jwt.JWTError:      # ← PyJWT لا يعرّف JWTError إطلاقاً (هذا اسم من python-jose)
```

تحقّق من المكتبة المثبّتة (`PyJWT==2.10.1`):
```
PyJWT version: 2.10.1
has JWTError:   False     ← غير موجود
has PyJWTError: True      ← الاسم الصحيح
```

**مُثبت تجريبياً:**
```
GET  /api/auth/me       بتوكن تالف → HTTP 500 {"detail":"Failed to get user info"}
POST /api/auth/refresh  بكوكي تالف → HTTP 500 {"detail":"Token refresh failed"}
```

الأثر مضاعف: `frontend/src/config/axios.js:40` يعالج `401` فقط لتجديد التوكن. وبما أن الخادم يرد `500`، فآلية التجديد التلقائي **لا تعمل أبداً** عند تلف التوكن — تنتهي جلسة المستخدم بلا تعافٍ. **الإصلاح:** `except jwt.PyJWTError:` (أو `jwt.InvalidTokenError`).

### 5.3 Google OAuth مسار استيراد خاطئ — 501 دائماً

```python
# backend/routes/auth.py:215
from services.auth.oauth_service import get_google_oauth_url
```
لا يوجد مجلد `services/auth/`. الملف الفعلي في `backend/auth/oauth_service.py`.

**مُثبت تجريبياً:**
```
GET /api/auth/oauth/google/url → 501 {"detail":"OAuth not implemented"}
```
`except ImportError` يبتلع الخطأ ويحوّله إلى "غير مُنفَّذ"، فيبدو وكأنها ميزة ناقصة لا خطأ مسار. **الإصلاح:** `from auth.oauth_service import ...`.

### 5.4 كل feature flags مثبّتة على `true`

```js
// frontend/src/config/flags.js
ADMIN: readBool('FEATURE_ADMIN') || true,   // ← دائماً true مهما كانت قيمة المتغيّر
```
`x || true` يساوي `true` دائماً. **7 من 10** أعلام مصابة (`MULTI_LANG_EXTENDED`, `GCC_CURRENCIES`, `IMG_NO_CROP`, `ADMIN`, `BULK_IMPORT`, `PWA_SUPPORT`, `LIVE_CHAT`) — لا يمكن إطفاء أي منها. **الإصلاح:** `readBool('FEATURE_ADMIN', true)` بتمرير قيمة افتراضية للدالة.

### 5.5 استيراد لتصدير غير موجود

`frontend/src/config/api.js` يستورد `hasApiKey` من `../api`، لكن `api.js` لا يُصدّره. ينتج تحذير بناء في webpack والقيمة `undefined` عند الاستخدام.

---

## 6. النشر والبنية التحتية

### 6.1 `vercel.json` في الجذر — تعارض وفقدان مسارات SPA

```json
{
  "builds":  [...],          // صيغة قديمة
  "routes":  [{"src":"/(.*)","dest":"frontend/build/$1"}],
  "buildCommand": "...",     // صيغة حديثة — تُتجاهل بوجود builds
  "headers": [...]           // تُتجاهل بوجود routes
}
```
ثلاث مشاكل: (1) خلط الصيغة القديمة بالحديثة فتُتجاهل الثانية، (2) `headers` معطّلة بسبب وجود `routes` — فتُفقد سياسة الكاش المقصودة، (3) **لا يوجد fallback إلى `index.html`** فأي رابط عميق مثل `/products` أو `/admin` يُرجع 404 عند التحديث المباشر.

**الإصلاح:** الاعتماد على `frontend/vercel.json` وحذف الجذري، أو استبداله بـ `rewrites`:
```json
{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
```

### 6.2 سياسة كاش تُلغي فائدة الـ CDN

```json
"source": "/(.*)", "Cache-Control": "no-cache, no-store, must-revalidate, max-age=0"
```
تُطبَّق على كل شيء بما فيه الأصول المُبصمة بالهاش. حتى لو فُعِّلت (وهي معطّلة حالياً بالبند 6.1)، فهي تُلغي التخزين المؤقت بالكامل وتضاعف زمن التحميل وتكلفة النطاق.

### 6.3 لا يوجد أي اختبار في CI

`.github/workflows/deploy-on-merge.yml` هو سير العمل الوحيد: يستدعي Render deploy hook ويُفرّغ كاش Cloudflare عند كل دفعة إلى `main`. **لا بناء، لا فحص lint، لا اختبارات** قبل النشر.

هذا يفسّر مباشرة كيف وصلت الأعطال أعلاه إلى الإنتاج: خطأ `logger` وخطأ `jwt.JWTError` وعدم تطابق عقد الدخول — كلها كان اختبار دخان واحد ليكشفها.

> يوجد **25 سكربت اختبار Python** في جذر المستودع (`backend_test.py` بحجم 100KB وغيره) لكن أياً منها لا يعمل آلياً.

**الإصلاح المقترح:** خطوة CI قبل النشر:
```yaml
- run: pip install -r backend/requirements.txt
- run: python -c "import server"           # يكشف أخطاء الإقلاع
- run: cd frontend && npm ci && npm run build
```

---

## 7. جودة المستودع

| المؤشّر | القيمة | الملاحظة |
|---------|--------|----------|
| ملفات `.md` في الجذر | **68** | 17 منها عن Cloudflare وحده، متضاربة ومكرّرة |
| سكربتات اختبار في الجذر | **25** | لا تعمل في CI |
| `README.md` | **فارغ (0 بايت)** | لا توجد نقطة دخول للمشروع |
| ملفات نسخ احتياطية مُتتبَّعة | 12 | `server.py.backup`, `server.py.broken`, `package.json.backup-final`, `AuthContext_old.js` … |
| صور مُتتبَّعة | 3.6MB | `screenshot_desktop.png` (2.1MB), `screenshot_ipad_pro.png` (1.4MB) |
| `test_result.md` | 183KB | سجل اختبارات ضخم داخل Git |
| رسائل الكوميت | `auto-commit for <uuid>` | لا تاريخ مفيد للمشروع |

**تعارض حالة أحرف يكسر الاستنساخ على macOS/Windows:**
```
frontend/src/pages/admin/QuickImportPage_OLD.js
frontend/src/pages/admin/QuickImportPage_old.js
```
ملفان يختلفان بحالة الأحرف فقط — على أنظمة الملفات غير الحسّاسة للحالة يتلف الاستنساخ ويصبح `git status` متسخاً دائماً. يجب حذف كليهما (فهما ميتان أصلاً).

كما يوجد ملف فارغ باسم `=20` (بقايا ترميز quoted-printable من لصق خاطئ).

**نقطة إيجابية:** لا توجد أي ملفات `.env` أو أسرار مُتتبَّعة في Git — `.gitignore` يؤدي دوره هنا.

---

## 8. خطة الإصلاح المُرتّبة

### المرحلة 1 — إعادة المتجر للعمل (يوم واحد)

| # | الإصلاح | الملف | الأثر |
|---|---------|-------|-------|
| 1 | نقل `logger = logging.getLogger()` قبل كتلة CJ | `server.py:30-45` | يمنع انهيار الإقلاع |
| 2 | `jwt.JWTError` → `jwt.PyJWTError` | `routes/auth.py:293,337` | يُعيد 401 فيعمل التجديد التلقائي |
| 3 | توحيد عقد الدخول على `identifier` | `routes/auth.py:34` + `AuthContext.js:48` | **يُعيد تسجيل الدخول** |
| 4 | إضافة `GET /health` و`GET /api/health` | `server.py` | يُصلح نشر Render |
| 5 | تصحيح مسار OAuth إلى `auth.oauth_service` | `routes/auth.py:215,234` | يُفعّل دخول Google |
| 6 | ربط الـ routers الستة غير المُسجّلة تحت `/api` | `server.py:492-510` | يُعيد المنتجات/السلة/الطلبات/الإدارة |

### المرحلة 2 — إغلاق الثغرات (يوم واحد)

| # | الإصلاح | الملف |
|---|---------|-------|
| 7 | تقييد CORS بقائمة بيضاء صريحة (إزالة `in origin`) | `server.py:95-102` |
| 8 | `Depends(require_admin)` على كل نقاط الاستيراد/الـ staging | `server.py`, `routes/cj_admin.py` |
| 9 | تسجيل `RateLimitMiddleware` + قراءة `CF-Connecting-IP` | `server.py`, `middleware/rate_limiter.py` |
| 10 | تنفيذ حقيقي لـ `verify_super_admin` (تحقق توقيع + قاعدة بيانات) | `middleware/auth.py` |
| 11 | توحيد اسم متغيّر السر + الفشل عند غيابه | `routes/auth.py`, `middleware/auth.py`, `render.yaml` |
| 12 | تقليص عمر refresh token إلى 30-90 يوماً + تخزين قابل للإبطال | `routes/auth.py:23` |

### المرحلة 3 — البنية والجودة (2-3 أيام)

13. خطوة CI للبناء والاختبار قبل النشر — **الأولوية الأعلى في هذه المرحلة**، فهي ما يمنع تكرار كل ما سبق
14. توحيد `vercel.json` بـ SPA rewrite + سياسة كاش صحيحة
15. إضافة `ProtectedRoute` حول مسارات `/admin/*`
16. إصلاح `|| true` في `flags.js` وتصدير `hasApiKey` أو حذف استيراده
17. تنظيف المستودع: حذف ملفات `.backup`/`_old`/تعارض الحالة، دمج 68 وثيقة في `docs/`، كتابة `README.md`

---

## 9. نقاط القوة

الأعطال أعلاه كلها في طبقة الربط والتهيئة، لا في التصميم:

- **بنية واضحة**: فصل سليم بين `routes/` و`services/` و`models/` و`middleware/`
- **طبقة خدمات ناضجة**: تسعير، تحويل عملات، GeoIP، جدولة، مزامنة منتجات — مكتوبة ومنظّمة
- **توطين حقيقي**: دعم عربي/إنجليزي كامل مع RTL وعملات الخليج
- **واجهة حديثة**: Radix UI + Tailwind، مكوّنات متاحة (accessible) وقابلة لإعادة الاستخدام
- **PWA**: service worker مع مزامنة خلفية للسلة والمفضّلة والطلبات
- **SEO**: sitemap ديناميكي يُولَّد من قاعدة البيانات
- **معالجة أخطاء بالعربية**: رسائل مُوطّنة للمستخدم النهائي
- **`middleware/rate_limiter.py` و`services/refresh_token_manager.py`** مكتوبان بالفعل — يحتاجان الربط فقط، لا الكتابة

الكود الجيد موجود. المشكلة أن `server.py` اختُصر من 63 نقطة إلى 8، وأن غياب CI سمح لذلك بالوصول إلى الإنتاج دون أن يلاحظه أحد.

---

## 10. منهجية التحقق

كل عطل مذكور أعلاه أُثبت بالتشغيل الفعلي لا بالقراءة:

```bash
# بيئة معزولة + تبعيات الحد الأدنى
python3 -m venv venv && ./venv/bin/pip install fastapi==0.110.1 motor==3.3.1 \
    PyJWT==2.10.1 pydantic==2.11.9 pydantic-settings bcrypt passlib ...

# إقلاع التطبيق وحصر المسارات الحيّة  → 18 مساراً
MONGO_URL=... DB_NAME=... python -c "import server; print(len(server.app.routes))"

# اختبار السلوك عبر TestClient (بلا شبكة)
TestClient(app).post('/api/auth/login', json={'identifier':...})   → 422
TestClient(app).get('/api/auth/me', headers={'Authorization':'Bearer garbage'})  → 500
TestClient(app).options('/api/auth/login', headers={'Origin':'https://evil-attacker.vercel.app'})
                                                                    → ACAO يعكس النطاق
# محاكاة فشل استيراد CJ للتحقق من قنبلة الإقلاع        → NameError: logger
```

**حدود التحليل:** لم يُختبر بناء الواجهة (`npm run build`) لأن `node_modules` غير مثبّتة؛ نتائج القسم 5.4 و5.5 مبنية على تحليل ثابت للكود. ولم يُختبر أي شيء مقابل قاعدة بيانات أو خدمات خارجية حيّة.
