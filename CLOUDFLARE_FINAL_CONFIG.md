# Cloudflare Cutover - Final Configuration
# إعدادات النقل النهائية إلى Cloudflare

## 📋 الإعداد الفعلي / Actual Setup

### Email Configuration
- **Incoming Mail (Receiving):** Mailgun MX records
- **Outgoing Mail (Sending):** Gmail SMTP (info@auraaluxury.com)
- **Email Forwarding:** Mailgun → Gmail inbox

---

## 🎯 DNS Records الصحيحة / Correct DNS Records

### 1. MX Records (Mailgun - DNS Only)

⚠️ **مهم جداً: يجب أن تكون DNS Only (رمادي)**

```
Type: MX
Name: @
Priority: 10
Mail Server: mxa.mailgun.org
Proxy Status: DNS Only (☁️ رمادي)
TTL: Auto

Type: MX
Name: @
Priority: 10
Mail Server: mxb.mailgun.org
Proxy Status: DNS Only (☁️ رمادي)
TTL: Auto
```

### 2. SPF Record (Mailgun - DNS Only)

```
Type: TXT
Name: @
Content: v=spf1 include:mailgun.org ~all
Proxy Status: DNS Only (☁️ رمادي)
TTL: Auto
```

**ملاحظة:** `include:mailgun.org` لأن Mailgun يستقبل البريد ويُحوّله.

### 3. DKIM Record (Mailgun - DNS Only)

```
Type: TXT
Name: [domain key from Mailgun]
Example: k1._domainkey or smtp._domainkey
Content: [DKIM value from Mailgun Dashboard]
Proxy Status: DNS Only (☁️ رمادي)
TTL: Auto
```

**كيفية الحصول عليه:**
1. اذهب إلى Mailgun Dashboard
2. Sending → Domains → auraaluxury.com
3. DNS Records → انسخ DKIM record

### 4. DMARC Record (DNS Only)

```
Type: TXT
Name: _dmarc
Content: v=DMARC1; p=none; rua=mailto:info@auraaluxury.com
Proxy Status: DNS Only (☁️ رمادي)
TTL: Auto
```

**لماذا p=none؟**
- لأننا نستخدم Gmail SMTP للإرسال (alias)
- Mailgun للاستقبال فقط
- نريد مراقبة أولاً قبل enforcement
- بعد التأكد، يمكن تغييره إلى `p=quarantine` أو `p=reject`

---

## 🌐 Hosting Records (A/CNAME - Proxied)

### Option A: إذا كنت تستخدم Vercel

```
Type: A
Name: @
Content: 76.76.21.21
Proxy Status: Proxied (☁️ برتقالي)
TTL: Auto

Type: CNAME
Name: www
Content: cname.vercel-dns.com
Proxy Status: Proxied (☁️ برتقالي)
TTL: Auto
```

### Option B: إذا كنت تستخدم Render

```
Type: CNAME
Name: @
Content: [your-app].onrender.com
Proxy Status: Proxied (☁️ برتقالي)
TTL: Auto

Type: CNAME
Name: www
Content: [your-app].onrender.com
Proxy Status: Proxied (☁️ برتقالي)
TTL: Auto
```

---

## ⚙️ Cloudflare Settings (الإعدادات المحددة)

### SSL/TLS

```
Location: SSL/TLS → Overview
Setting: Full (strict) ✅

Location: SSL/TLS → Edge Certificates
- Always Use HTTPS: On ✅
- Automatic HTTPS Rewrites: On ✅
- Minimum TLS Version: 1.2
- Opportunistic Encryption: On ✅
- TLS 1.3: On ✅
```

### Speed Optimization

```
Location: Speed → Optimization

Auto Minify:
- [x] JavaScript ✅
- [x] CSS ✅
- [x] HTML ✅

Brotli: On ✅
Early Hints: On ✅
Rocket Loader: Off ❌ (يسبب مشاكل مع React)
```

### Caching

```
Location: Caching → Configuration

Caching Level: Standard ✅
Browser Cache TTL: 4 hours ✅
Crawler Hints: On ✅
Always Online: On ✅
```

### Security

```
Location: Security → Settings

Security Level: Medium
Challenge Passage: 30 minutes
Browser Integrity Check: On
```

---

## 📝 Checklist قبل النقل

### في Cloudflare (قبل تغيير NS)

```
[ ] تم إنشاء Cloudflare account
[ ] تم إضافة auraaluxury.com
[ ] تم نسخ جميع DNS records من Squarespace
[ ] MX records: DNS Only (رمادي) ⚠️
[ ] SPF record: DNS Only (رمادي)
[ ] DKIM record: DNS Only (رمادي)
[ ] DMARC record: DNS Only (رمادي)
[ ] A/CNAME records: Proxied (برتقالي)
[ ] SSL mode: Full (strict)
[ ] Always HTTPS: On
[ ] Auto Minify: On (JS, CSS, HTML)
[ ] Brotli: On
[ ] Rocket Loader: Off
[ ] Caching: Standard, 4h
```

---

## 🔄 خطوات النقل (Cutover Steps)

### المرحلة 1: النسخ (Copy)

**في Squarespace:**
1. DNS Settings → نسخ **جميع** Records الموجودة
2. خذ screenshot أو احفظ في ملف نصي
3. احتفظ بـ Nameservers الحالية (للطوارئ)

**في Cloudflare:**
1. Add Site → auraaluxury.com
2. انسخ كل record بالضبط
3. تأكد من Proxy Status صحيح (برتقالي/رمادي)
4. Double-check MX records

### المرحلة 2: التحقق (Verify)

**قبل تغيير NS:**
```
[ ] All MX records: DNS Only ✓
[ ] All TXT (SPF/DKIM/DMARC): DNS Only ✓
[ ] A/CNAME: Proxied ✓
[ ] SSL settings configured ✓
[ ] Speed settings configured ✓
```

### المرحلة 3: التبديل (Switch)

**في Squarespace:**
1. Domains → auraaluxury.com
2. Advanced Settings → Nameservers
3. Use Custom Nameservers
4. أدخل Cloudflare nameservers:
   ```
   NS1: [name1].ns.cloudflare.com
   NS2: [name2].ns.cloudflare.com
   ```
5. Save

**الانتظار:**
- Minimum: 5-10 minutes
- Average: 1-2 hours
- Maximum: 24-48 hours

### المرحلة 4: الاختبار (Testing)

**بعد DNS Propagation:**

#### Test 1: HTTP → HTTPS Redirect
```bash
curl -I http://auraaluxury.com
# Expected: 301/302 → https://auraaluxury.com

curl -I http://www.auraaluxury.com
# Expected: 301/302 → https://auraaluxury.com
```

#### Test 2: HTTPS Both Domains
```bash
curl -I https://auraaluxury.com
# Expected: 200 OK, SSL valid

curl -I https://www.auraaluxury.com
# Expected: 200 OK, SSL valid
```

#### Test 3: Website Functionality
```
[ ] Homepage loads
[ ] Products page works
[ ] Images load
[ ] Add to cart works
[ ] Checkout works
[ ] Admin panel accessible
[ ] Login/Register works
```

#### Test 4: Email Delivery (Incoming - Mailgun)

**إرسال Test Email:**
```bash
# من أي email خارجي، أرسل إلى:
To: info@auraaluxury.com
Subject: Test after Cloudflare cutover
Body: Testing Mailgun MX delivery

# يجب أن يصل إلى Gmail inbox
```

**فحص MX:**
```bash
nslookup -type=mx auraaluxury.com
# Expected:
# auraaluxury.com mail exchanger = 10 mxa.mailgun.org
# auraaluxury.com mail exchanger = 10 mxb.mailgun.org
```

#### Test 5: Email Sending (Outgoing - Gmail SMTP)

**من التطبيق:**
1. سجل حساب جديد (welcome email)
2. اطلب password reset
3. أرسل رسالة من contact form
4. تحقق من وصول الـ emails

#### Test 6: DNS Propagation

```
Tool: https://dnschecker.org
Domain: auraaluxury.com

Check:
[ ] A record resolves correctly
[ ] MX records show Mailgun
[ ] Global propagation complete (>80% green)
```

#### Test 7: SSL Certificate

```
Tool: https://www.ssllabs.com/ssltest/
Domain: auraaluxury.com

Expected:
[ ] Grade: A or A+
[ ] Certificate valid
[ ] No mixed content
[ ] HTTPS only
```

---

## 📊 الإعداد النهائي الكامل

### DNS Records Summary

| Type | Name | Value | Proxy | Purpose |
|------|------|-------|-------|---------|
| MX | @ | mxa.mailgun.org | DNS Only | Email (Incoming) |
| MX | @ | mxb.mailgun.org | DNS Only | Email (Incoming) |
| TXT | @ | v=spf1 include:mailgun.org ~all | DNS Only | SPF |
| TXT | [key]._domainkey | [DKIM value] | DNS Only | DKIM |
| TXT | _dmarc | v=DMARC1; p=none; rua=mailto:info@auraaluxury.com | DNS Only | DMARC |
| A | @ | [Vercel/Render IP] | Proxied | Website |
| CNAME | www | [Vercel/Render domain] | Proxied | Website |
| TXT | @ | google-site-verification=[code] | DNS Only | Google |

---

## 🔧 Post-Cutover Tasks

### خلال أول 24 ساعة:

```
[ ] راقب Cloudflare Analytics
[ ] تحقق من email delivery
[ ] راقب website uptime
[ ] تابع error rates
[ ] تحقق من SSL certificate status
[ ] راجع speed metrics
```

### بعد أسبوع:

```
[ ] راجع DMARC reports (rua emails)
[ ] حلل traffic patterns
[ ] حسّن cache rules إذا لزم
[ ] فعّل HSTS (بعد التأكد)
[ ] غيّر DMARC من p=none إلى p=quarantine (اختياري)
```

---

## ⚠️ مشاكل محتملة وحلول

### مشكلة: البريد لا يصل

**الأعراض:**
- Emails إلى info@auraaluxury.com لا تصل

**الحل:**
1. تحقق من MX records في Cloudflare:
   ```bash
   dig mx auraaluxury.com @1.1.1.1
   ```
2. يجب أن تكون DNS Only (رمادي)
3. تحقق من Mailgun Dashboard:
   - Logs → Incoming
   - هل هناك emails؟
4. تحقق من Gmail forwarding في Mailgun

### مشكلة: الموقع لا يفتح

**الأعراض:**
- auraaluxury.com error أو timeout

**الحل:**
1. تحقق من DNS propagation
2. امسح DNS cache:
   ```bash
   # Windows
   ipconfig /flushdns
   
   # Mac/Linux
   sudo dscacheutil -flushcache
   ```
3. جرب من شبكة أخرى أو VPN
4. تحقق من Cloudflare Analytics → Security

### مشكلة: SSL Error

**الأعراض:**
- Certificate not valid
- Mixed content warnings

**الحل:**
1. تحقق من SSL mode: Full (strict)
2. انتظر 5-10 دقائق
3. امسح browser SSL cache
4. تحقق من أن جميع assets على HTTPS

### مشكلة: بطء الموقع

**الأعراض:**
- Loading time طويل

**الحل:**
1. تحقق من Rocket Loader: يجب أن يكون Off
2. تحقق من Development Mode: يجب أن يكون Off
3. فعّل Brotli compression
4. راجع cache rules

---

## 🎯 معايير النجاح

### يعتبر النقل ناجحاً إذا:

```
✅ http:// يحوّل إلى https:// تلقائياً
✅ auraaluxury.com و www.auraaluxury.com يفتحان
✅ SSL certificate صالح (قفل أخضر)
✅ جميع الصور والأصول تُحمّل
✅ Add to cart و checkout يعملان
✅ Admin panel يعمل
✅ Login/register يعمل
✅ البريد يُستقبل على info@auraaluxury.com (Mailgun)
✅ البريد يُرسل من info@auraaluxury.com (Gmail SMTP)
✅ Welcome emails تصل
✅ Contact form emails تصل
✅ Password reset emails تصل
✅ PageSpeed > 80 (mobile), > 90 (desktop)
✅ SSL Labs grade: A or A+
✅ No console errors
✅ Cloudflare Analytics يعرض traffic
```

---

## 📞 جهات الاتصال للدعم

### إذا حدثت مشاكل:

**Cloudflare:**
- Status: https://www.cloudflarestatus.com
- Community: https://community.cloudflare.com
- Docs: https://developers.cloudflare.com

**Mailgun:**
- Dashboard: https://app.mailgun.com
- Support: https://www.mailgun.com/support
- Status: https://status.mailgun.com

**Vercel/Render:**
- Vercel Status: https://www.vercel-status.com
- Render Status: https://status.render.com

---

## 🔄 Rollback Plan (خطة الطوارئ)

إذا حدثت مشاكل كبيرة:

### خطوات الرجوع السريع:

1. **في Squarespace:**
   - Domains → Nameservers
   - Change to: Use Squarespace Nameservers
   - Save

2. **الانتظار:**
   - 30 دقيقة - 2 ساعة
   - الموقع سيعود للعمل كما كان

3. **ما تحتفظ به:**
   ```
   [ ] Squarespace nameservers (old)
   [ ] All DNS records (screenshot)
   [ ] Mailgun settings
   [ ] Vercel/Render settings
   ```

---

## ✅ Confirmation Checklist

### قبل Green-light:

```
[ ] ✅ جميع DNS records منسوخة في Cloudflare
[ ] ✅ MX records: DNS Only (confirmed)
[ ] ✅ SPF/DKIM/DMARC: DNS Only (confirmed)
[ ] ✅ A/CNAME: Proxied (confirmed)
[ ] ✅ SSL mode: Full (strict)
[ ] ✅ Always HTTPS: On
[ ] ✅ Speed settings configured
[ ] ✅ Cache settings configured
[ ] ✅ Security settings configured
[ ] ✅ Rollback plan ready
[ ] ✅ Support contacts saved
```

**بعد اكتمال الـ Checklist:**
✅ جاهز لتغيير Nameservers!

---

**تم التحديث:** 2025-10-14
**الحالة:** ✅ جاهز للنقل
**الوقت المتوقع:** 2-4 ساعات (+ DNS propagation)

🚀 **GREEN LIGHT** - جاهز للنقل بعد تأكيدك!
