# 🔧 خطوات إصلاح CORS في Render Dashboard

## 📋 الخطوات (5 دقائق):

### **الخطوة 1: افتح Render Dashboard**
```
https://dashboard.render.com
```
- Login بحسابك

---

### **الخطوة 2: اختر Backend Service**
- ابحث عن service name (مثل: `auraa-backend` أو `api-auraaluxury`)
- اضغط عليه

---

### **الخطوة 3: اذهب لـ Environment**
```
Dashboard → [Your Service] → Environment (من القائمة اليسار)
```

---

### **الخطوة 4: أضف/حدّث CORS_ORIGINS**

**إذا موجود:**
- ابحث عن `CORS_ORIGINS`
- اضغط "Edit"
- حدّث القيمة لـ:
```
https://auraaluxury.com,https://www.auraaluxury.com,https://api.auraaluxury.com
```

**إذا غير موجود:**
- اضغط "Add Environment Variable"
- Key: `CORS_ORIGINS`
- Value: `https://auraaluxury.com,https://www.auraaluxury.com,https://api.auraaluxury.com`

---

### **الخطوة 5: Save & Wait**
1. اضغط **"Save Changes"**
2. Render سيقول "Redeploying..."
3. **انتظر 2-3 دقائق**
4. تحقق من Logs أن Service يعمل

---

## ✅ التحقق من النجاح:

### **في Logs يجب أن ترى:**
```
✅ Application startup complete
✅ Uvicorn running on http://0.0.0.0:xxxx
```

### **اختبر Login:**
1. افتح `www.auraaluxury.com`
2. حاول Login
3. **لن ترى** CORS error في Console ✅

---

## 🚨 إذا لم يعمل:

### **تحقق من:**
1. **Service Status:** يجب أن يكون `Live` (أخضر)
2. **Logs:** لا يوجد errors حمراء
3. **Environment Variable:** تم Save بشكل صحيح

### **حل بديل - أضف هذه المتغيرات أيضاً:**
```
Key: TURNSTILE_SECRET_KEY
Value: 0x4AAAAAAB7WqcK6E5Tv7qSs1Fh0BkAEM0w
```

---

## 📞 بعد التطبيق:

**يرجى إخباري:**
- ✅ CORS_ORIGINS تم إضافته
- ✅ Service تم restart
- ✅ Logs نظيفة
- ✅ Login يعمل / لا يعمل

**إذا لا يزال لا يعمل، شارك:**
- Screenshot من Environment Variables
- Screenshot من Logs (آخر 20 سطر)
- Screenshot من Console error

---

## 🎯 ملاحظة مهمة:

**Render Free Tier:**
- قد ينام Service بعد 15 دقيقة
- أول request قد يأخذ 30-60 ثانية (cold start)
- هذا طبيعي

**للحل الدائم:**
- Upgrade لـ Paid Plan ($7/month)
- أو أضف Health Check ping كل 10 دقائق

---

**جاهز؟ ابدأ من الخطوة 1! 🚀**
