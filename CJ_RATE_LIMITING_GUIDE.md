# 🛡️ دليل نظام الحماية من خطأ 429 - CJ Dropshipping

## 🎯 نظرة عامة

تم تطبيق نظام حماية متقدم من خطأ **429: too_many_requests** من CJ Dropshipping API عبر **3 طبقات**:

1. ✅ **Rate Limiter** - حد أقصى للطلبات في الثانية
2. ✅ **Retry + Backoff** - إعادة المحاولة التلقائية مع تأخير تصاعدي
3. ✅ **Batching + Concurrency** - استيراد على دفعات مع حد أقصى للتوازي

---

## 📦 الملفات الجديدة

### 1. `/backend/services/cj_client.py`
**الوصف:** Client مركزي لجميع طلبات CJ API

**المميزات:**
- ✅ Rate Limiting: حد أقصى 2 طلب/ثانية (قابل للتعديل)
- ✅ Retry مع Exponential Backoff (حتى 5 محاولات)
- ✅ Semaphore للتحكم في التوازي (حد أقصى 3 طلبات متزامنة)
- ✅ لوجينج تفصيلي لكل طلب
- ✅ معالجة ذكية للأخطاء (401/403 لا تُعاد، 429/5xx تُعاد)

**الوظائف:**
```python
await list_products(page_num, page_size, keyword)  # جلب قائمة المنتجات
await get_product_details(pid)                     # تفاصيل منتج واحد
await authenticate()                               # توثيق
```

---

### 2. `/backend/services/import_service.py`
**الوصف:** خدمة الاستيراد على دفعات

**المميزات:**
- ✅ استيراد 1-1000 منتج على دفعات (50 منتج/دفعة)
- ✅ راحة 2 ثانية بين كل دفعة
- ✅ معالجة الأخطاء لكل دفعة على حدة
- ✅ تقرير مفصل بالنجاح والفشل

**الوظائف:**
```python
await bulk_import_products(total_count, keyword)   # استيراد على دفعات
await fetch_product_details_batch(product_ids)     # جلب تفاصيل بالدفعات
```

---

### 3. `/backend/routes/cj_admin.py`
**الوصف:** مسارات إدارية للاختبار والاستيراد

**المسارات:**
- `GET /admin/cj/ping` - فحص سريع للاتصال
- `GET /admin/cj/test-auth` - اختبار التوثيق
- `POST /admin/cj/import/bulk` - استيراد على دفعات
- `GET /admin/cj/products/list` - جلب قائمة (معاينة)

---

## 🔧 الإعدادات

### في `/backend/.env`:

```env
# CJ Dropshipping Settings
CJ_DROPSHIP_EMAIL="Info.auraaluxury@gmail.com"
CJ_DROPSHIP_API_KEY="942ad21128534fba953d489b4d6688ee"

# Rate Limiting Settings (NEW)
CJ_BASE="https://developers.cjdropshipping.com/api2.0"
CJ_RPS=2                # Requests Per Second
CJ_MAX_CONCURRENCY=3    # Max concurrent requests
```

### تعديل الإعدادات:

**زيادة السرعة (بحذر!):**
```env
CJ_RPS=5                # 5 طلبات/ثانية
CJ_MAX_CONCURRENCY=5    # 5 طلبات متزامنة
```

**للأمان الأقصى:**
```env
CJ_RPS=1                # طلب واحد/ثانية فقط
CJ_MAX_CONCURRENCY=1    # طلب واحد في كل مرة
```

---

## 🚀 كيفية الاستخدام

### 1. اختبار الاتصال

**من المتصفح أو Postman:**
```
GET https://luxury-import-sys.preview.emergentagent.com/admin/cj/ping
```

**الاستجابة المتوقعة:**
```json
{
  "ok": true,
  "message": "✅ CJ API is reachable",
  "data": {...}
}
```

---

### 2. اختبار التوثيق

```
GET https://luxury-import-sys.preview.emergentagent.com/admin/cj/test-auth
```

**الاستجابة المتوقعة:**
```json
{
  "ok": true,
  "message": "✅ Authentication successful",
  "data": {...}
}
```

---

### 3. استيراد منتجات

**من Postman:**
```
POST https://luxury-import-sys.preview.emergentagent.com/admin/cj/import/bulk

Body (JSON):
{
  "count": 50,
  "keyword": "luxury jewelry"
}
```

**الاستجابة:**
```json
{
  "ok": true,
  "message": "✅ Import complete: 50/50 products",
  "results": {
    "total_requested": 50,
    "total_fetched": 50,
    "ok": 50,
    "failed": 0,
    "batches": [
      {
        "batch": 1,
        "page": 1,
        "size": 50,
        "status": "success"
      }
    ],
    "products": [...]
  }
}
```

---

### 4. من صفحة Quick Import

الصفحة الآن تستخدم النظام الجديد تلقائياً! فقط:

1. أدخل العدد (1-1000)
2. اضغط 🔴 استيراد الآن
3. النظام يستورد على دفعات مع rate limiting تلقائي

---

## 📊 كيف يعمل النظام؟

### طلب واحد:

```
Frontend → Backend → Rate Limiter (2 req/sec) → Semaphore (max 3) → CJ API
                  ↓
              429 Error?
                  ↓
         Retry with Backoff (2s, 4s, 8s, 16s, 30s)
                  ↓
            Success ✅
```

### استيراد 100 منتج:

```
100 منتج
  ↓
قسّمها إلى دفعات (50 منتج × 2)
  ↓
Batch 1: 50 منتج
  ├── Rate Limited (2 req/sec)
  ├── Max 3 concurrent
  ├── Retry on 429/5xx
  └── ✅ Success
  ↓
Sleep 2 seconds
  ↓
Batch 2: 50 منتج
  ├── Rate Limited
  ├── Max 3 concurrent
  ├── Retry on 429/5xx
  └── ✅ Success
```

---

## 🔍 مراقبة الأداء

### في Logs:

```bash
# في Render أو Local
tail -f /var/log/supervisor/backend.err.log | grep "CJ"
```

**ما ستراه:**
```
🌐 CJ API Request: POST /v1/product/list
✅ CJ API Success: POST /v1/product/list
📦 Batch 1/2: Fetching page 1
✅ Batch 1 success: 50 products (50/100)
😴 Sleeping 2s before next batch...
📦 Batch 2/2: Fetching page 2
✅ Batch 2 success: 50 products (100/100)
✅ Bulk import complete: 100/100 products fetched
```

**في حالة Retry:**
```
⚠️ CJ API 429 - will retry: Rate limit exceeded
⏳ CJ API retry attempt 1 after error
[Sleep 2 seconds...]
🌐 CJ API Request: POST /v1/product/list (retry)
✅ CJ API Success: POST /v1/product/list
```

---

## ⚠️ استكشاف الأخطاء

### مشكلة: "CJ_DROPSHIP_API_KEY not configured"

**الحل:**
1. تأكد من وجود المفتاح في `/backend/.env`
2. أعد تشغيل Backend: `sudo supervisorctl restart backend`

---

### مشكلة: ما زلت أحصل على 429

**السبب المحتمل:** الإعدادات عالية جداً

**الحل:**
```env
# خفّض القيم في .env
CJ_RPS=1
CJ_MAX_CONCURRENCY=1
```

أعد التشغيل وجرّب مرة أخرى.

---

### مشكلة: الاستيراد بطيء جداً

**السبب:** الإعدادات محافظة للغاية

**الحل:**
```env
# زِد القيم تدريجياً
CJ_RPS=3
CJ_MAX_CONCURRENCY=5
```

**ملاحظة:** راقب الـ Logs! إذا ظهرت 429، خفّض القيم.

---

### مشكلة: "Authentication failed"

**الحل:**
1. تأكد من CJ API Key صحيح
2. جرّب endpoint التوثيق: `GET /admin/cj/test-auth`
3. إذا فشل، احصل على API Key جديد من CJ Dashboard

---

## 🎯 أفضل الممارسات

### 1. ابدأ بإعدادات محافظة
```env
CJ_RPS=2
CJ_MAX_CONCURRENCY=3
```

### 2. راقب الأداء
- شاهد الـ Logs
- لاحظ إذا ظهرت 429
- إذا كان سلساً، زِد القيم تدريجياً

### 3. لا تستورد أكثر من 200-300 منتج في طلب واحد
- الأفضل: 50-100 منتج/طلب
- استخدم طلبات متعددة للأعداد الكبيرة

### 4. الوقت المثالي للاستيراد
- تجنب ساعات الذروة (إذا كانت CJ لديها ذروة معينة)
- استورد في أوقات هادئة

---

## 📈 القياسات

### مع الإعدادات الافتراضية (RPS=2, Concurrency=3):

| العدد | الوقت المتوقع | الدفعات |
|-------|---------------|---------|
| 50    | ~30 ثانية    | 1       |
| 100   | ~1 دقيقة     | 2       |
| 200   | ~2 دقيقة     | 4       |
| 500   | ~5 دقائق     | 10      |
| 1000  | ~10 دقائق    | 20      |

**ملاحظة:** الأوقات تقريبية وتعتمد على استجابة CJ API

---

## 🔐 الأمان

### الحماية من:
- ✅ **Rate Limiting Abuse** - حد أقصى للطلبات
- ✅ **DDoS على CJ API** - تحكم في التوازي
- ✅ **Retry Storms** - backoff تصاعدي ذكي
- ✅ **Invalid Credentials** - معالجة 401/403 فوراً
- ✅ **Network Issues** - retry على أخطاء الشبكة

---

## 📝 الخلاصة

**النظام الآن:**
- ✅ محمي من 429 بـ 3 طبقات
- ✅ يعيد المحاولة تلقائياً
- ✅ يستورد على دفعات
- ✅ لوجينج تفصيلي
- ✅ قابل للتخصيص

**المطلوب منك:**
1. تحديث CJ API Key (إذا لزم الأمر)
2. اختبار endpoint `/admin/cj/ping`
3. استيراد منتجات تجريبية (10-50 منتج)
4. مراقبة الأداء
5. تعديل الإعدادات حسب الحاجة

🚀 **جاهز للاستيراد الآمن والسريع!**

---

**آخر تحديث:** 22 أكتوبر 2025  
**الإصدار:** 1.0
