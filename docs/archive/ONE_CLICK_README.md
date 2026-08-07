تشغيل المتجر بزر واحد (deploy.sh)

المتطلبات:
- سجلات DNS (@ و www) تشير إلى IP السيرفر
- رابط MongoDB Atlas صالح
- يوجد مجلدا backend و frontend وملفا deploy.sh و cleanup.sh في نفس المكان

طريقة الاستخدام (على السيرفر):
1) اجعل السكربت قابلًا للتنفيذ:
   chmod +x deploy.sh cleanup.sh

2) شغّل النشر:
   ./deploy.sh --domain yourdomain.com --mongo "mongodb+srv://USER:PASS@CLUSTER/auraa_luxury?retryWrites=true&w=majority"

3) بعد دقائق:
- افتح: https://yourdomain.com
- تهيئة بيانات أول مرة (اختياري):
  curl -X POST https://yourdomain.com/api/init-data

إدارة التشغيل:
- docker compose logs -f (مشاهدة السجلات)
- docker compose restart (إعادة التشغيل)
- docker compose down (إيقاف الخدمات)
- ./cleanup.sh --purge (حذف ملفات التكوين والبناء المُولّدة)