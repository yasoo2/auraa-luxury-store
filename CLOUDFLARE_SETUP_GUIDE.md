# دليل ربط Auraa Luxury مع Cloudflare
# Cloudflare Setup Guide for Auraa Luxury

## 📋 الإعدادات الحالية / Current Setup

### Domain Information
- **Domain:** auraaluxury.com
- **Current Registrar:** Squarespace
- **Current DNS:** Squarespace DNS
- **Hosting:** Emergent (Render/Vercel)
- **Email Service:** Gmail SMTP (info@auraaluxury.com)

### Backend API
- **Port:** 8001 (internal)
- **Framework:** FastAPI
- **External URL:** Set via REACT_APP_BACKEND_URL

### Frontend
- **Framework:** React
- **Build:** Production optimized

---

## 🎯 الخطوة 1: توثيق DNS Records الحالية

### A Records (نسخها من Squarespace)
```
Type: A
Name: @
Value: [IP من Vercel/Render]
TTL: Auto
```

```
Type: A  
Name: www
Value: [IP من Vercel/Render]
TTL: Auto
```

### CNAME Records
```
Type: CNAME
Name: www
Value: cname.vercel-dns.com (أو Render equivalent)
TTL: Auto
```

### MX Records (Gmail)
```
Type: MX
Name: @
Priority: 1
Value: smtp.google.com
TTL: Auto
```

### TXT Records

**SPF Record:**
```
Type: TXT
Name: @
Value: v=spf1 include:_spf.google.com ~all
TTL: Auto
```

**DKIM Record (Gmail):**
```
Type: TXT
Name: google._domainkey
Value: [القيمة من Google Workspace/Gmail]
TTL: Auto
```

**DMARC Record:**
```
Type: TXT
Name: _dmarc
Value: v=DMARC1; p=quarantine; rua=mailto:admin@auraaluxury.com
TTL: Auto
```

**Domain Verification (Google):**
```
Type: TXT
Name: @
Value: google-site-verification=[CODE]
TTL: Auto
```

---

## 🚀 الخطوة 2: إضافة الدومين في Cloudflare

### 2.1 إنشاء حساب/إضافة موقع

1. اذهب إلى: https://dash.cloudflare.com
2. انقر **"Add a Site"**
3. أدخل: `auraaluxury.com`
4. اختر **Free Plan** (مجاني)
5. انقر **"Continue"**

### 2.2 مراجعة DNS Records

Cloudflare سيقوم بـ scan تلقائي. تحقق من:

✅ A record للدومين الرئيسي (@)
✅ CNAME أو A record لـ www
✅ MX records للبريد الإلكتروني
✅ TXT records (SPF, DKIM, DMARC)

**⚠️ إذا ناقص أي سجل، أضفه يدوياً:**

---

## 📝 الخطوة 3: إعدادات DNS في Cloudflare

### 3.1 A Records

**للدومين الرئيسي:**
```
Type: A
Name: @
Content: [Emergent/Render IP]
Proxy status: Proxied (☁️ برتقالي)
TTL: Auto
```

**للـ www:**
```
Type: A
Name: www
Content: [نفس IP]
Proxy status: Proxied (☁️ برتقالي)
TTL: Auto
```

### 3.2 CNAME Records (بديل للـ A)

إذا كنت تستخدم CNAME بدل A:
```
Type: CNAME
Name: www
Content: [your-app].onrender.com (أو Vercel domain)
Proxy status: Proxied (☁️ برتقالي)
TTL: Auto
```

### 3.3 MX Records (البريد الإلكتروني)

**⚠️ مهم جداً: MX Records يجب أن تكون DNS Only (رمادي)**

```
Type: MX
Name: @
Mail server: smtp.google.com
Priority: 1
Proxy status: DNS only (☁️ رمادي)
TTL: Auto
```

### 3.4 TXT Records

**SPF:**
```
Type: TXT
Name: @
Content: v=spf1 include:_spf.google.com ~all
TTL: Auto
```

**DKIM:**
```
Type: TXT
Name: google._domainkey
Content: [من Google Admin Console]
TTL: Auto
```

**DMARC:**
```
Type: TXT
Name: _dmarc
Content: v=DMARC1; p=quarantine; rua=mailto:admin@auraaluxury.com
TTL: Auto
```

**Google Site Verification:**
```
Type: TXT
Name: @
Content: google-site-verification=[YOUR_CODE]
TTL: Auto
```

---

## 🔄 الخطوة 4: تغيير Nameservers

### 4.1 الحصول على Nameservers من Cloudflare

بعد إضافة DNS records، Cloudflare سيعطيك nameservers مثل:
```
lisa.ns.cloudflare.com
mark.ns.cloudflare.com
```

### 4.2 التغيير في Squarespace

1. اذهب إلى Squarespace Dashboard
2. **Settings** → **Domains** → **auraaluxury.com**
3. انقر **"Advanced Settings"**
4. انقر **"Use Custom Nameservers"**
5. أدخل nameservers من Cloudflare:
   - Nameserver 1: `lisa.ns.cloudflare.com`
   - Nameserver 2: `mark.ns.cloudflare.com`
6. احفظ التغييرات

### 4.3 وقت الانتظار

- **الحد الأدنى:** 5-10 دقائق
- **المتوسط:** 1-4 ساعات
- **الأقصى:** 24-48 ساعة

**للتحقق من DNS Propagation:**
- https://dnschecker.org
- أدخل `auraaluxury.com`

---

## 🔒 الخطوة 5: إعدادات SSL/TLS

### 5.1 اختيار وضع SSL

من Cloudflare Dashboard:
1. انقر على **SSL/TLS** في القائمة الجانبية
2. اختر التبويب **"Overview"**

**الإعدادات الموصى بها:**

**إذا Emergent/Render يوفر SSL (Recommended):**
```
SSL/TLS encryption mode: Full (strict)
```
✅ هذا يضمن تشفير كامل بين Cloudflare والسيرفر

**إذا لم يكن هناك SSL على السيرفر:**
```
SSL/TLS encryption mode: Full
```

**❌ لا تستخدم:**
- `Off` - غير آمن تماماً
- `Flexible` - ضعيف (تشفير فقط بين الزائر وCloudflare)

### 5.2 تفعيل Always Use HTTPS

1. اذهب إلى **SSL/TLS** → **Edge Certificates**
2. فعّل **"Always Use HTTPS"**
3. فعّل **"Automatic HTTPS Rewrites"**

### 5.3 تفعيل HSTS (اختياري - موصى به)

```
Enable HSTS: On
Max Age: 6 months (15768000 seconds)
Include subdomains: Yes
Preload: Yes (optional)
No-Sniff header: Yes
```

⚠️ **تحذير:** لا تفعل HSTS إلا بعد التأكد من أن HTTPS يعمل بشكل كامل!

---

## ⚙️ الخطوة 6: إعدادات إضافية في Cloudflare

### 6.1 Page Rules (قواعد الصفحات)

**1. إجبار WWW → Non-WWW (أو العكس):**

```
URL Pattern: www.auraaluxury.com/*
Settings:
  - Forwarding URL: 301 Permanent Redirect
  - Destination: https://auraaluxury.com/$1
```

**2. إجبار HTTPS:**
```
URL Pattern: http://auraaluxury.com/*
Settings:
  - Always Use HTTPS: On
```

### 6.2 Caching (التخزين المؤقت)

من **Caching** → **Configuration**:

```
Caching Level: Standard
Browser Cache TTL: 4 hours
Always Online: On
Development Mode: Off (إلا عند التطوير)
```

### 6.3 Speed Optimization

من **Speed** → **Optimization**:

```
✅ Auto Minify: JavaScript, CSS, HTML
✅ Brotli: On
✅ Early Hints: On
✅ Rocket Loader: Off (قد يسبب مشاكل مع React)
```

### 6.4 Firewall Rules (اختياري)

من **Security** → **WAF**:

```
Security Level: Medium
Challenge Passage: 30 minutes
Browser Integrity Check: On
```

**إضافة قاعدة لحماية Admin:**
```
Expression: (http.request.uri.path contains "/admin" and not ip.src in {YOUR_IP})
Action: Block
```

---

## 🧪 الخطوة 7: الاختبار الشامل

### 7.1 اختبار الموقع

**URLs للاختبار:**
```bash
✅ https://auraaluxury.com
✅ https://www.auraaluxury.com
✅ http://auraaluxury.com (يجب أن يحول إلى HTTPS)
✅ http://www.auraaluxury.com (يجب أن يحول إلى HTTPS)
```

**الأشياء التي يجب فحصها:**
- ✅ الموقع يفتح بدون أخطاء
- ✅ SSL certificate صالح (قفل أخضر)
- ✅ جميع الصور والأصول تُحمّل
- ✅ API calls تعمل
- ✅ صفحات Admin تعمل
- ✅ Checkout يعمل

### 7.2 اختبار البريد الإلكتروني

**إرسال email اختبار:**
```bash
# من terminal
telnet smtp.gmail.com 587
# أو استخدم Gmail لإرسال رسالة test إلى info@auraaluxury.com
```

**فحص DNS records:**
```bash
# فحص MX
nslookup -type=mx auraaluxury.com

# فحص SPF
nslookup -type=txt auraaluxury.com

# فحص DKIM
nslookup -type=txt google._domainkey.auraaluxury.com
```

**أدوات online:**
- MXToolbox: https://mxtoolbox.com/SuperTool.aspx
- DNS Checker: https://dnschecker.org

### 7.3 اختبار الأداء

**استخدم هذه الأدوات:**
- Google PageSpeed: https://pagespeed.web.dev
- GTmetrix: https://gtmetrix.com
- Cloudflare Analytics (من Dashboard)

### 7.4 اختبار SSL

**SSL Labs Test:**
```
https://www.ssllabs.com/ssltest/analyze.html?d=auraaluxury.com
```

الهدف: درجة A أو A+

---

## 📊 إعدادات Emergent المطلوبة

### لا تحتاج تغيير شيء في Emergent!

**لماذا؟**
- Cloudflare يعمل كـ proxy أمام الموقع
- الطلبات تصل إلى Emergent عبر Cloudflare
- لا حاجة لتغيير إعدادات Backend أو Frontend

**ملاحظة مهمة:**
- `REACT_APP_BACKEND_URL` يبقى كما هو
- Cloudflare شفاف تماماً للتطبيق

---

## ⚠️ مشاكل شائعة وحلولها

### مشكلة 1: الموقع لا يفتح بعد تغيير NS

**الحل:**
- انتظر 24 ساعة كاملة
- تحقق من DNS propagation: https://dnschecker.org
- امسح cache المتصفح (Ctrl+Shift+Delete)

### مشكلة 2: البريد الإلكتروني لا يعمل

**الحل:**
- تأكد أن MX records في وضع "DNS Only" (رمادي)
- تحقق من SPF/DKIM/DMARC records
- استخدم MXToolbox للفحص

### مشكلة 3: SSL Certificate Error

**الحل:**
- تأكد من اختيار "Full (strict)" في SSL settings
- انتظر 5-10 دقائق لتفعيل Certificate
- امسح SSL state في المتصفح

### مشكلة 4: API Calls تفشل (CORS)

**الحل:**
- تحقق من أن REACT_APP_BACKEND_URL صحيح
- تأكد أن Cloudflare في وضع Proxied
- أضف Cloudflare IPs إلى whitelist إذا لزم

### مشكلة 5: صفحات Admin بطيئة

**الحل:**
- عطّل Rocket Loader
- أضف Page Rule لتجاوز cache للـ /admin/*
- استخدم "Development Mode" مؤقتاً

---

## 🎯 أفضل الممارسات

### DNS Settings

✅ **Do:**
- استخدم Proxied (☁️) للـ A/CNAME الرئيسية
- استخدم DNS Only (☁️) للـ MX records
- احتفظ بنسخة من DNS records القديمة
- استخدم TTL منخفض (Auto) في البداية

❌ **Don't:**
- لا تضع Proxy على MX records
- لا تحذف records قديمة قبل التأكد
- لا تغير عدة إعدادات مرة واحدة

### SSL Settings

✅ **Do:**
- استخدم Full (strict) إذا أمكن
- فعّل Always Use HTTPS
- فعّل Automatic HTTPS Rewrites
- استخدم HSTS بعد التأكد من HTTPS

❌ **Don't:**
- لا تستخدم Flexible SSL
- لا تفعل HSTS قبل اختبار HTTPS
- لا تعطل SSL Verification

### Caching

✅ **Do:**
- استخدم Page Rules لتخصيص Cache
- عطّل Cache للصفحات الديناميكية (/admin, /checkout)
- استخدم Development Mode عند التطوير

❌ **Don't:**
- لا تفعل cache للـ API endpoints
- لا تنسى إيقاف Development Mode بعد الانتهاء

---

## 📱 الخطوات بعد النقل الناجح

### 1. مراقبة الأداء (أول أسبوع)

- راقب Cloudflare Analytics يومياً
- تحقق من uptime
- راقب email delivery
- تابع أي أخطاء في Logs

### 2. تحسينات إضافية

**بعد أسبوع:**
- فعّل Argo Smart Routing (مدفوع، لكن يحسن السرعة)
- أضف Workers لميزات متقدمة (optional)
- فعّل Load Balancing إذا كنت تستخدم عدة سيرفرات

**بعد شهر:**
- راجع Analytics وحسّن Page Rules
- ضبط Cache settings بناءً على الاستخدام
- أضف Firewall rules إضافية إذا لزم

### 3. Backup Plan

احتفظ بـ:
- ✅ نسخة من DNS records القديمة
- ✅ معلومات Nameservers القديمة
- ✅ لقطات شاشة من Squarespace DNS

**في حالة الطوارئ:**
يمكنك العودة لـ Squarespace DNS بتغيير Nameservers

---

## 🔧 قائمة التحقق النهائية

### قبل النقل
- [ ] نسخ جميع DNS records من Squarespace
- [ ] تحضير Cloudflare account
- [ ] إنشاء backup من الإعدادات الحالية
- [ ] إخطار الفريق بوقت النقل المتوقع

### أثناء النقل
- [ ] إضافة الموقع في Cloudflare
- [ ] نسخ جميع DNS records
- [ ] تحقق من MX/SPF/DKIM records
- [ ] تغيير Nameservers في Squarespace
- [ ] إعداد SSL settings (Full strict)
- [ ] إنشاء Page Rules الأساسية

### بعد النقل
- [ ] اختبار جميع URLs (http/https, www/non-www)
- [ ] اختبار البريد الإلكتروني
- [ ] اختبار Admin panel
- [ ] اختبار Checkout flow
- [ ] فحص SSL certificate
- [ ] فحص DNS propagation
- [ ] مراقبة Analytics لمدة 24 ساعة
- [ ] توثيق الإعدادات الجديدة

---

## 📞 جهات الاتصال والدعم

### Cloudflare Support
- Community: https://community.cloudflare.com
- Docs: https://developers.cloudflare.com
- Status: https://www.cloudflarestatus.com

### للمساعدة الفورية
- Cloudflare Discord
- Stack Overflow (تاغ: cloudflare)

---

## 📈 المزايا المتوقعة بعد Cloudflare

### السرعة
- ⚡ CDN عالمي (200+ مدينة)
- ⚡ تقليل latency بنسبة 30-50%
- ⚡ Brotli compression

### الأمان
- 🛡️ DDoS protection مجاني
- 🛡️ WAF (Web Application Firewall)
- 🛡️ Bot protection
- 🛡️ SSL/TLS مجاني

### الموثوقية
- ✅ Uptime 99.99%
- ✅ Always Online (نسخة cache إذا سقط السيرفر)
- ✅ Load balancing

### التحليلات
- 📊 Analytics مفصلة
- 📊 Security insights
- 📊 Performance metrics

---

**تم إعداد هذا الدليل خصيصاً لـ Auraa Luxury**

**التاريخ:** 2025-10-14
**الحالة:** جاهز للتنفيذ
**المدة المتوقعة:** 2-4 ساعات (+ وقت DNS propagation)

**نصيحة أخيرة:** نفذ النقل في وقت قليل الزيارات (مثل منتصف الليل) لتقليل التأثير على المستخدمين.

🎉 حظ موفق في النقل إلى Cloudflare!
