# Auraa Luxury Store

متجر إلكتروني للإكسسوارات الفاخرة، ثنائي اللغة (عربي/إنجليزي) مع دعم RTL، يعمل بنموذج
الدروبشيبينغ عبر CJ Dropshipping.

A bilingual (Arabic/English) luxury accessories storefront with RTL support, built on a
dropshipping model via CJ Dropshipping.

---

## البنية · Architecture

```
┌──────────────────────┐   HTTPS   ┌────────────────────────┐        ┌───────────┐
│ Frontend             │  /api/*   │ Backend                │ motor  │ MongoDB   │
│ React 18 + CRA/CRACO ├──────────►│ FastAPI (Python 3.11)  ├───────►│ Atlas     │
│ Tailwind + Radix UI  │           │ uvicorn                │        │           │
│ Vercel               │           │ Render                 │        │           │
└──────────────────────┘           └────────────────────────┘        └───────────┘
                                              │
                                              ├──► CJ Dropshipping (product import)
                                              └──► SendGrid (email)
```

| المجلد | المحتوى |
|--------|---------|
| `backend/` | FastAPI app — `server.py` (storefront + admin), `routes/`, `services/`, `core/security.py` |
| `frontend/` | React app — `src/components`, `src/pages`, `src/context` |
| `tests/` | `test_integration.py` — full-store integration suite |
| `tests/legacy/` | Older standalone scripts, not run by CI |
| `docs/archive/` | Historical setup and migration notes |

---

## التشغيل محلياً · Local development

### Backend

```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt

export MONGO_URL="mongodb://localhost:27017"
export DB_NAME="auraa_luxury_db"
export JWT_SECRET_KEY="$(openssl rand -hex 32)"
export ENV="development"
export COOKIE_SECURE="false"       # Secure cookies are not sent over plain HTTP

uvicorn server:app --reload --port 8001
```

### Frontend

```bash
cd frontend
npm install --legacy-peer-deps
echo "REACT_APP_BACKEND_URL=http://localhost:8001" > .env.local
npm start
```

---

## الاختبارات · Tests

```bash
pip install mongomock_motor pytest
python -m pytest tests/test_integration.py -v
```

يعمل مقابل MongoDB في الذاكرة — لا يحتاج قاعدة بيانات ولا شبكة.
Runs against an in-memory MongoDB; no database or network required.

---

## متغيرات البيئة · Environment variables

### Backend (Render)

| المتغير | مطلوب | الوصف |
|---------|:-----:|-------|
| `MONGO_URL` | ✅ | MongoDB connection string |
| `DB_NAME` | ✅ | Database name |
| `JWT_SECRET_KEY` | ✅ | مفتاح توقيع الجلسات. **التطبيق يرفض الإقلاع في الإنتاج بدونه** |
| `CORS_ORIGINS` | — | نطاقات مسموحة، مفصولة بفواصل. الافتراضي نطاقات auraaluxury |
| `CORS_PREVIEW_REGEX` | — | تعبير نمطي لنطاقات المعاينة. مُقيَّد افتراضياً بمشاريع auraa على Vercel |
| `COOKIE_SECURE` | — | `false` للتطوير عبر HTTP فقط. الافتراضي `true` |
| `COOKIE_CROSS_SITE` | — | `true` (الافتراضي) لأن الواجهة والـ API على نطاقين مختلفين |
| `AUTH_RATE_LIMIT_MAX` | — | محاولات المصادقة لكل IP. الافتراضي 10 |
| `AUTH_RATE_LIMIT_WINDOW` | — | نافذة التحديد بالثواني. الافتراضي 300 |
| `REFRESH_TOKEN_EXPIRE_DAYS` | — | عمر جلسة التجديد. الافتراضي 90 يوماً |
| `CJ_API_KEY`, `CJ_DROPSHIP_EMAIL` | — | لاستيراد المنتجات من CJ |

### Frontend (Vercel)

| المتغير | الوصف |
|---------|-------|
| `REACT_APP_BACKEND_URL` | عنوان الـ API، مثل `https://api.auraaluxury.com` |
| `REACT_APP_TURNSTILE_SITE_KEY` | مفتاح Cloudflare Turnstile (اختياري) |

---

## المصادقة · Authentication

الجلسة تُنقل بطريقتين، وكلاهما مدعوم:

- **HttpOnly cookies** — يستخدمها `api.js` (fetch بلا رؤوس) وفحص الجلسة عند تحميل الصفحة.
- **`Authorization: Bearer`** — تستخدمه صفحات الإدارة التي تقرأ التوكن من `localStorage`.

`core/security.py` هو المصدر الوحيد لمفتاح التوقيع ودوال التحقق. رمز التجديد قابل للإبطال
(`jti` مُخزَّن في قاعدة البيانات) ويُدوَّر عند كل استخدام.

---

## النشر · Deployment

النشر يتم عبر **التكامل المباشر مع Git**، بلا أي GitHub Actions.

Deployment runs through Render's and Cloudflare Pages' own Git integrations —
no GitHub Actions involved.

| المكوّن | الوجهة | الآلية |
|---------|--------|--------|
| Backend | Render | `autoDeploy: true` على فرع `main` في `backend/render.yaml` |
| Frontend | Cloudflare Pages | تكامل Git المدمج، يبني عند كل دفعة إلى `main` |

### إعدادات بناء Cloudflare Pages

```
Framework preset:       None
Root directory:         frontend
Build command:          npm run build
Build output directory: build
```
مع متغيّر البيئة `REACT_APP_BACKEND_URL = https://api.auraaluxury.com`.

### ⚠️ التحقق قبل الدفع

بما أن Render وCloudflare ينشران **مباشرةً عند الدفع** ولا يشغّلان أي اختبار، فالدفعة هي
آخر نقطة يمكن فيها إيقاف كوميت معطوب. شغّل الفحص محلياً أولاً:

```bash
./scripts/verify.sh          # استيراد الخادم + الاختبارات + بناء الواجهة
```

ولأتمتة ذلك عند كل `git push`:

```bash
./scripts/install-hooks.sh   # يثبّت pre-push hook
# للتخطي مرة واحدة: git push --no-verify
```

> `.github/workflows/ci.yml` باقٍ ويشغّل نفس الفحوصات، لكنه يعمل فقط إن كانت GitHub
> Actions مُفعّلة على المستودع. `scripts/verify.sh` هو البديل الذي لا يعتمد عليها.

- فحص الصحة · Health check: `GET /health`
- خريطة الموقع · Sitemap: `GET /sitemap.xml`

---

## الحالة · Status

انظر [`SYSTEM_ANALYSIS.md`](SYSTEM_ANALYSIS.md) لتقرير تحليل النظام: الأعطال التي عولجت،
والبنود التي ما زالت مفتوحة.

See [`SYSTEM_ANALYSIS.md`](SYSTEM_ANALYSIS.md) for the system analysis: what was fixed and
what remains open.
