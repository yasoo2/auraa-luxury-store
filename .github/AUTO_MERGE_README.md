# 🤖 Auto-Merge System للمتجر Auraa Luxury

## 📋 نظرة عامة

تم إعداد نظام دمج تلقائي متقدم لمتجر Auraa Luxury لتبسيط عملية التطوير وضمان جودة الكود. يتعامل النظام تلقائياً مع حل التعارضات، بناء المشروع، واختبار الجودة قبل الدمج.

## 🔧 المكونات الرئيسية

### 1. ملفات الإعداد

- **`.gitattributes`**: قواعد دمج ملفات القفل والصور
- **`.github/workflows/auto-resolve-and-ci.yml`**: GitHub Action للدمج الأساسي
- **`.github/workflows/pr-auto-merge-enhanced.yml`**: نظام دمج محسن مع فحوصات متقدمة
- **`.github/auto-merge-config.yml`**: إعدادات تفصيلية للنظام
- **`.github/scripts/setup-auto-merge.sh`**: سكريبت الإعداد المحلي

### 2. استراتيجيات حل التعارضات

#### ملفات القفل (Lock Files)
```
package-lock.json ← تحفظ نسخة الـ PR
yarn.lock        ← تحفظ نسخة الـ PR  
pnpm-lock.yaml   ← تحفظ نسخة الـ PR
```

#### الملفات المصدرية (Source Files)
- **استراتيجية `-X theirs`**: تفضل تغييرات الـ PR على الـ main branch
- **حل تلقائي للتعارضات**: للملفات الشائعة مثل package.json، .env.example
- **مراجعة يدوية**: للتعارضات المعقدة في الكود المصدري

#### الصور والملفات الثنائية
```
*.png  -merge  ← لا دمج تلقائي
*.jpg  -merge  ← لا دمج تلقائي  
*.svg  -merge  ← لا دمج تلقائي
```

## 🚀 كيفية الاستخدام

### للمطورين الجدد

1. **إعداد البيئة المحلية**:
```bash
# تشغيل سكريبت الإعداد
./.github/scripts/setup-auto-merge.sh
```

2. **إنشاء PR جديد**:
```bash
git checkout -b feature/my-new-feature
# ... إجراء التغييرات
git add .
git commit -m "feat: add new feature"
git push origin feature/my-new-feature
# إنشاء PR عبر GitHub UI
```

### أوامر Git المحلية الجديدة

بعد تشغيل سكريبت الإعداد، تصبح هذه الأوامر متاحة:

```bash
# دمج تلقائي مع حل التعارضات
git auto-merge

# دمج ذكي من فرع محدد
git smart-merge main

# إصلاح تعارضات ملفات القفل فقط
git fix-lockfiles
```

## 🔄 سير العمل التلقائي

### عند إنشاء أو تحديث PR:

1. **🔍 فحص أولي**: 
   - التحقق من صحة الفرع
   - جلب آخر تحديثات main

2. **🤝 حل التعارضات**:
   - دمج main في PR مع استراتيجية `-X theirs`
   - حفظ ملفات القفل من الـ PR
   - حل تلقائي للتعارضات الشائعة

3. **🏗️ البناء والاختبار**:
   - تثبيت dependencies للـ frontend و backend
   - بناء المشروع
   - تشغيل الاختبارات

4. **🔐 فحوصات الجودة**:
   - فحص البيانات الحساسة
   - فحص حجم الملفات
   - فحص الثغرات الأمنية

5. **✅ التفعيل التلقائي**:
   - موافقة تلقائية إذا نجحت جميع الفحوصات
   - تفعيل auto-merge بـ squash method
   - إضافة العلامات المناسبة

## 🏷️ نظام العلامات (Labels)

### علامات النجاح:
- `✅ auto-merge-ready`: جاهز للدمج التلقائي
- `🤖 bot-processed`: تمت معالجته بواسطة البوت

### علامات الفشل:
- `❌ auto-merge-failed`: فشل الدمج التلقائي
- `🔧 needs-manual-review`: يحتاج مراجعة يدوية
- `needs-manual-merge`: يحتاج دمج يدوي

## 🛠️ استكشاف الأخطاء وإصلاحها

### مشاكل شائعة وحلولها:

#### 1. تعارضات معقدة
```bash
# إذا فشل الحل التلقائي
git fetch origin main
git merge origin/main
# حل التعارضات يدوياً
git add .
git commit
git push
```

#### 2. فشل البناء
```bash
# تنظيف وإعادة تثبيت
rm -rf node_modules package-lock.json
npm install
npm run build
```

#### 3. مشاكل ملفات القفل
```bash
# إعادة إنشاء ملفات القفل
rm package-lock.json yarn.lock
npm install  # أو yarn install
git add package-lock.json  # أو yarn.lock
git commit -m "fix: regenerate lockfile"
```

## 🔧 إعدادات متقدمة

### تخصيص استراتيجية الدمج

في `.github/auto-merge-config.yml`:

```yaml
merge_strategy:
  default_method: "squash"  # أو merge، rebase
  conflict_resolution: "theirs"  # تفضيل تغييرات PR
  
file_strategies:
  lockfiles:
    strategy: "ours"  # حفظ نسخة PR
  config_files:
    strategy: "ours"  # تفضيل تغييرات PR
```

### تخصيص فحوصات الجودة

```yaml
quality_gates:
  security:
    check_sensitive_data: true
    max_file_size_mb: 10
    
  performance:
    build_timeout_minutes: 10
    test_timeout_minutes: 5
```

## 📊 مراقبة النظام

### سجلات GitHub Actions
- انتقل إلى تبويب "Actions" في GitHub
- راجع سجلات تشغيل workflows
- تتبع معدلات نجاح/فشل الدمج التلقائي

### تقارير جودة الكود
- فحوصات الأمان في كل PR
- تقارير حجم الملفات
- إحصائيات الثغرات الأمنية

## 🤝 المساهمة في تحسين النظام

### إضافة قواعد حل تعارضات جديدة:
1. عدّل `.gitattributes`
2. حدّث `auto-resolve-and-ci.yml`
3. اختبر محلياً باستخدام `git auto-merge`

### إضافة فحوصات جودة جديدة:
1. عدّل `pr-auto-merge-enhanced.yml`
2. أضف الفحص في قسم "Quality Checks"
3. اختبر مع PR تجريبي

## 📞 الدعم

### في حالة المشاكل:
1. راجع سجلات GitHub Actions
2. تحقق من علامات PR
3. تشغيل `.github/scripts/setup-auto-merge.sh` للإعادة الإعداد
4. فتح issue مع تفاصيل المشكلة

### موارد إضافية:
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Git Merge Strategies](https://git-scm.com/docs/git-merge)
- [GitHub Auto-merge](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/incorporating-changes-from-a-pull-request/automatically-merging-a-pull-request)

---

## 📈 إحصائيات النظام

| المقياس | الهدف | الحالة الحالية |
|---------|-------|----------------|
| معدل النجاح التلقائي | >85% | 🎯 قيد المراقبة |
| متوسط وقت المعالجة | <10 دقائق | ⚡ محسن |
| تقليل التدخل اليدوي | >70% | 📈 متحسن |

---

*آخر تحديث: أكتوبر 2024*  
*النسخة: 1.0.0*