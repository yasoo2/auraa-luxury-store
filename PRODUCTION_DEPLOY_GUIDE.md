# 🚀 دليل Deploy للـ Production - api.auraaluxury.com

## ⚠️ ملاحظة مهمة:
أنا AI Agent أعمل في **Development Environment** فقط. لا يمكنني الوصول لـ Production servers مباشرة.

**ما قمت به:**
✅ جميع التعديلات المطلوبة موجودة في الكود هنا
✅ تم اختبارها في Development وتعمل بنجاح
✅ الكود جاهز للـ Deploy

**ما تحتاج أن تفعله أنت:**
📦 Deploy الكود للـ Production Backend (`api.auraaluxury.com`)

---

## 📋 ملخص التعديلات الجاهزة للـ Deploy:

### 1. **CORS Configuration** (ملف: `/app/backend/server.py`)
```python
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=[
        "https://auraaluxury.com",
        "https://www.auraaluxury.com",      # ✅ Added
        "https://api.auraaluxury.com",
        "https://auraa-admin-1.preview.emergentagent.com",
        "http://localhost:3000",
        "http://localhost:8001",
        "*"
    ],
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)
```

### 2. **Cloudflare Turnstile Integration**
- ✅ Backend verification function
- ✅ Frontend widget integration
- ✅ Rate limiting (5 attempts/15 min)
- ✅ Fallback على timeout/errors

### 3. **Cookie Domain Fix**
- ✅ Dynamic cookie domain based on environment
- ✅ يعمل على Development, Preview, و Production

### 4. **Admin Management Fixes**
- ✅ Fixed endpoint: `/api/admin/users/all`
- ✅ Tab موجود داخل Admin Dashboard
- ✅ محذوف من Navbar

### 5. **Speed Optimizations**
- ✅ Reduced Turnstile timeout (10s → 3s)
- ✅ Removed unnecessary delays
- ✅ Instant navigation
- ✅ Non-blocking Turnstile

---

## 🔑 Environment Variables المطلوبة في Production:

### **Backend (.env أو Platform Settings):**
```bash
# Database
MONGO_URL=mongodb://...
DB_NAME=your_db_name

# JWT
JWT_SECRET_KEY=your_secret_key

# Cloudflare Turnstile (جديد ⭐)
TURNSTILE_SECRET_KEY=0x4AAAAAAB7WqcK6E5Tv7qSs1Fh0BkAEM0w

# CORS (اختياري - الكود يحتوي على fallback)
CORS_ORIGINS=https://auraaluxury.com,https://www.auraaluxury.com,https://api.auraaluxury.com

# SMTP (للـ emails)
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USERNAME=apikey
SMTP_PASSWORD=your_sendgrid_api_key
SMTP_FROM_EMAIL=info@auraaluxury.com
SMTP_FROM_NAME=Auraa Luxury Support

# OAuth (إذا كنت تستخدم)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=...
```

### **Frontend (.env أو Vercel Settings):**
```bash
# Backend URL
REACT_APP_BACKEND_URL=https://api.auraaluxury.com

# Cloudflare Turnstile (جديد ⭐)
REACT_APP_TURNSTILE_SITE_KEY=0x4AAAAAAB7WqcQ0XXvDASQ4
```

---

## 📦 خطوات Deploy (حسب Platform):

### **إذا Backend على Render:**
1. اذهب لـ https://dashboard.render.com
2. اختر Backend service (`api.auraaluxury.com`)
3. **Environment**:
   - أضف `TURNSTILE_SECRET_KEY` (إذا غير موجود)
   - تحقق من باقي المتغيرات
4. **Deploy**:
   - اذهب لـ "Manual Deploy"
   - اختر "Clear build cache & deploy"
   - أو اضغط "Redeploy"
5. **انتظر** حتى ينتهي Deploy (~5-10 دقائق)

### **إذا Backend على Railway:**
1. اذهب لـ https://railway.app
2. اختر Backend project
3. **Variables**:
   - أضف `TURNSTILE_SECRET_KEY`
   - تحقق من المتغيرات الأخرى
4. **Deploy**:
   - Railway يعمل auto-deploy من GitHub
   - أو اضغط "Redeploy" في Settings
5. **انتظر** حتى ينتهي

### **إذا Backend على Vercel:**
1. اذهب لـ https://vercel.com
2. اختر Backend project
3. **Settings → Environment Variables**:
   - أضف `TURNSTILE_SECRET_KEY`
4. **Deployments**:
   - اذهب لـ Deployments tab
   - اضغط "Redeploy" على آخر deployment
5. **انتظر** حتى ينتهي

### **إذا Backend على AWS/VPS/Custom:**
1. **SSH للسيرفر:**
   ```bash
   ssh user@your-server
   ```

2. **Pull آخر كود:**
   ```bash
   cd /path/to/backend
   git pull origin main
   ```

3. **Update .env file:**
   ```bash
   nano .env
   # أضف TURNSTILE_SECRET_KEY
   ```

4. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

5. **Restart service:**
   ```bash
   # حسب setup
   sudo systemctl restart backend
   # أو
   pm2 restart backend
   # أو
   sudo supervisorctl restart backend
   ```

---

## ✅ Checklist بعد Deploy:

### **Backend:**
- [ ] Deploy نجح بدون errors
- [ ] Service يعمل (status: running)
- [ ] Environment variables موجودة كلها
- [ ] Logs نظيفة بدون errors

### **Testing:**
1. **CORS Test:**
   - افتح `www.auraaluxury.com`
   - افتح Developer Console (F12)
   - حاول Login
   - **تحقق**: لا يوجد CORS error ✅

2. **Turnstile Test:**
   - صفحة Login/Register
   - يظهر Turnstile widget
   - يمكن Complete verification
   - Login/Register يعمل ✅

3. **Rate Limiting Test:**
   - حاول Login 6 مرات بـ password خطأ
   - المحاولة السادسة يجب أن تُرفض
   - رسالة: "Too many attempts. Try again in X seconds" ✅

4. **Admin Management Test:**
   - Login كـ Super Admin
   - Admin Dashboard → Tab "إدارة المسؤولين"
   - يعرض جميع المسؤولين (3 users)
   - يمكن تغيير roles/passwords ✅

5. **Speed Test:**
   - Login يجب أن يكون < 2 ثانية
   - Navigation فورية بعد Login ✅

---

## 🐛 إذا واجهت مشاكل:

### **Problem: CORS error لا يزال موجود**
**Solution:**
1. تحقق من CORS في `/app/backend/server.py`
2. تأكد من `www.auraaluxury.com` في القائمة
3. Restart backend service
4. Clear browser cache
5. Test في Incognito mode

### **Problem: Turnstile لا يعمل**
**Solution:**
1. تحقق من `TURNSTILE_SECRET_KEY` في backend
2. تحقق من `TURNSTILE_SITE_KEY` في frontend
3. تأكد من Domain مسموح في Cloudflare Dashboard
4. Check backend logs للـ verification errors

### **Problem: Admin management لا يظهر users**
**Solution:**
1. تحقق من endpoint: `/api/admin/users/all`
2. Login كـ Super Admin (not regular admin)
3. Check browser console للـ errors
4. Check backend logs

### **Problem: Login بطيء**
**Solution:**
1. تحقق من Turnstile timeout (3s)
2. Check network tab في DevTools
3. تأكد من لا يوجد rate limiting active
4. Test من location آخر

---

## 📞 للدعم:

إذا واجهت مشكلة:
1. Check backend logs
2. Check browser console
3. شارك Screenshot للـ error
4. أعطني details عن المشكلة

---

## 🎉 بعد النجاح:

بعد Deploy ناجح واختبار:
- ✅ CORS يعمل
- ✅ Turnstile يعمل
- ✅ Rate Limiting يعمل
- ✅ Admin Management يعمل
- ✅ Speed محسّن

**الموقع جاهز للاستخدام في Production! 🚀**

---

**ملاحظة:** إذا لا تستطيع Deploy الآن، يمكنك:
1. إنشاء staging environment للاختبار
2. أو انتظار حتى يكون لديك صلاحية
3. أو مشاركة الوصول مع developer آخر للـ deploy

**الكود جاهز 100% - فقط ينتظر Deploy! ✨**
