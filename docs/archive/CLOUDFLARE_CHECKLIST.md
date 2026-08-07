# Cloudflare Setup Checklist - Quick Reference
# قائمة التحقق السريعة لإعداد Cloudflare

## ⏱️ قبل البدء (15 دقيقة)

```
[ ] سجل الدخول إلى Squarespace
[ ] انسخ جميع DNS Records (أو خذ screenshots)
[ ] سجل في Cloudflare (إذا لم يكن لديك حساب)
[ ] جهز قهوة ☕
```

---

## 📋 DNS Records المطلوبة (نسخها من Squarespace)

### ✅ Hosting Records

```
Type: A or CNAME
Name: @
Value: ______________________ (من Vercel/Render)

Type: A or CNAME  
Name: www
Value: ______________________ (نفس القيمة أو CNAME)
```

### ✅ Email Records (Gmail SMTP)

```
MX Record:
Priority: 1
Mail Server: smtp.google.com

SPF (TXT):
v=spf1 include:_spf.google.com ~all

DKIM (TXT):
Name: google._domainkey
Value: ______________________

DMARC (TXT):
Name: _dmarc
Value: v=DMARC1; p=quarantine; rua=mailto:admin@auraaluxury.com
```

### ✅ Other Records

```
Google Verification (TXT):
google-site-verification=______________________

CAA Records (if any):
______________________
```

---

## 🚀 خطوات النقل (30 دقيقة)

### الخطوة 1: Cloudflare Dashboard

```
[ ] اذهب إلى: https://dash.cloudflare.com
[ ] اضغط "Add a Site"
[ ] أدخل: auraaluxury.com
[ ] اختر: Free Plan
[ ] اضغط "Continue"
```

### الخطوة 2: مراجعة DNS

```
[ ] تحقق من جميع Records تم استيرادها
[ ] أضف أي records ناقصة يدوياً
[ ] تأكد من MX records موجودة
[ ] تأكد من SPF/DKIM موجودة
```

### الخطوة 3: تعديل Proxy Status

```
A Record (@):        [x] Proxied (☁️ برتقالي)
A Record (www):      [x] Proxied (☁️ برتقالي)
MX Records:          [ ] DNS Only (☁️ رمادي) ⚠️ مهم!
TXT Records:         [ ] DNS Only (☁️ رمادي)
```

### الخطوة 4: Nameservers

```
Cloudflare Nameservers:
NS1: ______________________.ns.cloudflare.com
NS2: ______________________.ns.cloudflare.com

[ ] انسخهم
[ ] اذهب إلى Squarespace → Domains
[ ] Nameservers → Use Custom
[ ] الصق النيم سيرفرات
[ ] احفظ
```

### الخطوة 5: SSL Settings

```
[ ] SSL/TLS → Overview
[ ] اختر: Full (strict)
[ ] SSL/TLS → Edge Certificates
[ ] فعّل: Always Use HTTPS
[ ] فعّل: Automatic HTTPS Rewrites
```

### الخطوة 6: Page Rules

```
Rule 1: Force HTTPS
URL: http://*auraaluxury.com/*
Setting: Always Use HTTPS

Rule 2: WWW Redirect (اختياري)
URL: www.auraaluxury.com/*
Setting: 301 Redirect → https://auraaluxury.com/$1
```

---

## 🧪 الاختبار (15 دقيقة)

### انتظر DNS Propagation
```
⏰ الوقت المتوقع: 5 دقائق - 24 ساعة
📍 تحقق من: https://dnschecker.org
```

### اختبار URLs

```
[ ] https://auraaluxury.com - يفتح؟
[ ] https://www.auraaluxury.com - يفتح؟
[ ] http://auraaluxury.com - يحول لـ HTTPS؟
[ ] SSL Certificate - قفل أخضر؟
```

### اختبار الوظائف

```
[ ] الصفحة الرئيسية تعمل
[ ] صفحات المنتجات تعمل
[ ] الصور تُحمّل
[ ] Add to Cart يعمل
[ ] Checkout يعمل
[ ] Admin Panel يعمل
[ ] تسجيل الدخول يعمل
```

### اختبار البريد الإلكتروني

```
[ ] أرسل email test إلى info@auraaluxury.com
[ ] تحقق من الوصول
[ ] أرسل email من info@auraaluxury.com
[ ] تحقق من الوصول

أدوات الفحص:
https://mxtoolbox.com/SuperTool.aspx
```

### اختبار الأداء

```
[ ] Google PageSpeed: https://pagespeed.web.dev
[ ] SSL Labs: https://www.ssllabs.com/ssltest/
[ ] GTmetrix: https://gtmetrix.com

الهدف:
- PageSpeed: 80+ (Mobile), 90+ (Desktop)
- SSL Grade: A or A+
```

---

## 🔧 إعدادات إضافية (اختياري - 10 دقائق)

### Speed Optimization

```
[ ] Speed → Optimization
    [x] Auto Minify: JS, CSS, HTML
    [x] Brotli
    [x] Early Hints
    [ ] Rocket Loader (قد يسبب مشاكل - اتركه Off)
```

### Caching

```
[ ] Caching → Configuration
    Caching Level: Standard
    Browser Cache TTL: 4 hours
    [x] Always Online
```

### Security

```
[ ] Security → Settings
    Security Level: Medium
    Challenge Passage: 30 minutes
    [x] Browser Integrity Check
```

### Firewall (اختياري)

```
[ ] Security → WAF
[ ] Create Firewall Rule:
    Expression: (http.request.uri.path contains "/admin")
    Action: Challenge or Block (حسب الحاجة)
```

---

## ⚠️ مشاكل شائعة وحلول سريعة

### المشكلة: الموقع لا يفتح

```
✓ الحل:
  1. انتظر 30 دقيقة إضافية
  2. امسح Cache المتصفح (Ctrl+Shift+Delete)
  3. جرب Incognito Mode
  4. جرب من جهاز آخر أو شبكة أخرى
  5. تحقق من DNS: https://dnschecker.org
```

### المشكلة: SSL Error

```
✓ الحل:
  1. تأكد من SSL mode: Full (strict)
  2. انتظر 10 دقائق
  3. SSL/TLS → Edge Certificates → Universal SSL (should be Active)
  4. امسح SSL state: chrome://net-internals/#hsts
```

### المشكلة: البريد لا يعمل

```
✓ الحل:
  1. تأكد MX records في وضع "DNS Only"
  2. تحقق من SPF: nslookup -type=txt auraaluxury.com
  3. استخدم MXToolbox للفحص
  4. انتظر 1-2 ساعة
```

### المشكلة: Admin بطيء

```
✓ الحل:
  1. Speed → Optimization → Rocket Loader: Off
  2. أنشئ Page Rule:
     URL: auraaluxury.com/admin/*
     Setting: Cache Level → Bypass
  3. استخدم Development Mode مؤقتاً
```

### المشكلة: API Calls تفشل

```
✓ الحل:
  1. تحقق من REACT_APP_BACKEND_URL في .env
  2. تأكد من Proxy Status: Proxied
  3. تحقق من CORS settings في Backend
  4. فحص Network tab في DevTools
```

---

## 📞 أرقام مهمة

### Cloudflare Support
- Community: https://community.cloudflare.com
- Docs: https://developers.cloudflare.com
- Status: https://www.cloudflarestatus.com

### موقع Auraa Luxury
- الموقع: https://auraaluxury.com
- البريد: info@auraaluxury.com
- واتساب: +90 501 371 5391

---

## 🎯 Rollback Plan (خطة الطوارئ)

إذا حدث خطأ كبير:

```
1. اذهب إلى Squarespace
2. Domains → Nameservers
3. غير إلى: Use Squarespace Nameservers
4. انتظر 30 دقيقة - 2 ساعة
5. الموقع سيعود للعمل كما كان
```

**احتفظ بهذه المعلومات:**
```
Squarespace Nameservers (Old):
NS1: _______________________
NS2: _______________________

All DNS Records: [screenshot or text file]
```

---

## ✅ Success Checklist

```
[✓] الموقع يفتح على HTTPS
[✓] SSL Certificate صالح
[✓] جميع الصفحات تعمل
[✓] البريد الإلكتروني يعمل
[✓] Checkout يعمل
[✓] Admin Panel يعمل
[✓] الأداء محسّن
[✓] Analytics تعمل
[✓] No errors في Console
```

---

## 📊 بعد النقل - المراقبة

### أول 24 ساعة

```
[ ] راقب Cloudflare Analytics كل ساعتين
[ ] تحقق من uptime
[ ] راقب error rates
[ ] تابع email delivery
[ ] تحقق من logs
```

### أول أسبوع

```
[ ] راجع Analytics يومياً
[ ] راقب السرعة (PageSpeed)
[ ] تحقق من SSL status
[ ] راجع Security events
[ ] اجمع feedback من المستخدمين
```

### بعد شهر

```
[ ] راجع Performance تقرير كامل
[ ] حسّن Cache rules
[ ] أضف Page Rules إضافية
[ ] فعّل ميزات Pro (إذا لزم)
```

---

## 🎉 التهانينا!

إذا وصلت هنا وكل الاختبارات ✅ :

```
🎊 أحسنت! موقع Auraa Luxury الآن على Cloudflare
⚡ أسرع
🛡️ أكثر أماناً
📈 جاهز للنمو
```

---

**ملاحظة نهائية:**
هذه Checklist مصممة لـ Auraa Luxury خصيصاً. احتفظ بها للرجوع إليها.

**وقت التنفيذ الإجمالي:** 1-2 ساعة (+ DNS propagation)

**أفضل وقت للنقل:** 
- منتصف الليل إلى الفجر (أقل زيارات)
- عطلة نهاية الأسبوع
- تجنب أوقات الذروة

**جاهز؟ لنبدأ! 🚀**
