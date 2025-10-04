## Summary
صف بوضوح التغييرات في هذا الـ PR.

## Checklist
- [ ] تبديل اللغة يُحدّث كل الصفحات (Auth, Cart, Checkout, Profile, Products) واتجاه RTL/LTR صحيح.
- [ ] الصور متجاوبة ومضغوطة وتستخدم صيغ حديثة؛ الإكسسوارات بارزة بصريًا.
- [ ] الشعار أسفل يمين (FEATURE_LOGO_BOTTOM_RIGHT مفعل) والتراتبية Auraa > LUXURY > ACCESSORIES.
- [ ] إزالة نص Footer غير الضروري.
- [ ] SEO محلي (title/meta/OG/hreflang) وJSON-LD مُضاف للمنتجات.
- [ ] الأداء: lazy-load، تحسينات الشبكة؛ Lighthouse Perf ≥ 90 وCLS ≤ 0.1.
- [ ] UX: مؤشرات تحميل/أخطاء واضحة؛ تحسين شريط التنقل على الموبايل.
- [ ] Analytics خلف أعلام بيئة (OFF في Preview، ON في Production فقط).
- [ ] الكود نظيف: لا أخطاء Console؛ يمر lint/build.
- [ ] لم تتغير عقود الـ API.

## Testing evidence
أرفق screenshots/video ورابط Vercel Preview.

## Rollback plan
كيفية الرجوع سريعًا (إطفاء الـ flags / revert commit / العودة إلى tag الإنتاج).