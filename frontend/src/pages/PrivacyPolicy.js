import React from 'react';
import { useLanguage } from '../context/LanguageContext';

const PrivacyPolicy = () => {
  const { language } = useLanguage();
  const isRTL = language === 'ar';

  return (
    <div className={`min-h-screen bg-gray-50 py-12 ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            {isRTL ? 'سياسة الخصوصية' : 'Privacy Policy'}
          </h1>
          
          <div className="prose prose-lg max-w-none space-y-6">
            {isRTL ? (
              <>
                <section>
                  <h2 className="text-2xl font-semibold text-gray-800 mb-4">مقدمة</h2>
                  <p className="text-gray-600 leading-relaxed">
                    تلتزم شركة أورا لاكشري ("نحن"، "لنا"، "الشركة") بحماية خصوصيتك واحترام بياناتك الشخصية. 
                    توضح سياسة الخصوصية هذه كيفية جمع واستخدام وحماية معلوماتك الشخصية عند استخدام موقعنا الإلكتروني 
                    وخدماتنا.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-gray-800 mb-4">المعلومات التي نجمعها</h2>
                  
                  <h3 className="text-xl font-semibold text-gray-700 mb-3">المعلومات الشخصية</h3>
                  <ul className="list-disc list-inside text-gray-600 space-y-2 mb-4">
                    <li>الاسم الكامل</li>
                    <li>عنوان البريد الإلكتروني</li>
                    <li>رقم الهاتف</li>
                    <li>عنوان الشحن والفوترة</li>
                    <li>تاريخ الميلاد (اختياري)</li>
                  </ul>

                  <h3 className="text-xl font-semibold text-gray-700 mb-3">معلومات الطلبات</h3>
                  <ul className="list-disc list-inside text-gray-600 space-y-2 mb-4">
                    <li>تاريخ ووقت الطلبات</li>
                    <li>المنتجات المطلوبة</li>
                    <li>طرق الدفع المستخدمة</li>
                    <li>سجل المراسلات مع خدمة العملاء</li>
                  </ul>

                  <h3 className="text-xl font-semibold text-gray-700 mb-3">المعلومات التقنية</h3>
                  <ul className="list-disc list-inside text-gray-600 space-y-2">
                    <li>عنوان IP</li>
                    <li>نوع المتصفح والجهاز</li>
                    <li>نظام التشغيل</li>
                    <li>صفحات الموقع التي تزورها</li>
                    <li>الوقت المستغرق في الموقع</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-gray-800 mb-4">كيفية استخدام معلوماتك</h2>
                  <ul className="list-disc list-inside text-gray-600 space-y-2">
                    <li>معالجة وتنفيذ طلباتك</li>
                    <li>التواصل معك حول طلباتك وحسابك</li>
                    <li>تحسين خدماتنا ومنتجاتنا</li>
                    <li>إرسال العروض والتحديثات (بموافقتك)</li>
                    <li>منع الاحتيال وضمان الأمان</li>
                    <li>الامتثال للمتطلبات القانونية</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-gray-800 mb-4">مشاركة المعلومات</h2>
                  <p className="text-gray-600 mb-4">
                    لا نبيع أو نؤجر أو نشارك معلوماتك الشخصية مع أطراف ثالثة، إلا في الحالات التالية:
                  </p>
                  <ul className="list-disc list-inside text-gray-600 space-y-2">
                    <li>مع شركات الشحن لتسليم طلباتك</li>
                    <li>مع مقدمي خدمات الدفع لمعالجة المدفوعات</li>
                    <li>مع مقدمي الخدمات التقنية لصيانة الموقع</li>
                    <li>عند الطلب من السلطات القانونية المختصة</li>
                    <li>لحماية حقوقنا أو حقوق الآخرين</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-gray-800 mb-4">حماية البيانات</h2>
                  <p className="text-gray-600 mb-4">
                    نطبق تدابير أمنية متقدمة لحماية بياناتك، تشمل:
                  </p>
                  <ul className="list-disc list-inside text-gray-600 space-y-2">
                    <li>تشفير البيانات الحساسة (SSL/TLS)</li>
                    <li>أنظمة حماية من الاختراق</li>
                    <li>مراقبة مستمرة للأمان</li>
                    <li>تحديث دوري لأنظمة الحماية</li>
                    <li>تدريب الموظفين على حماية البيانات</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-gray-800 mb-4">حقوقك</h2>
                  <p className="text-gray-600 mb-4">لديك الحق في:</p>
                  <ul className="list-disc list-inside text-gray-600 space-y-2">
                    <li>الوصول إلى بياناتك الشخصية</li>
                    <li>تصحيح البيانات غير الدقيقة</li>
                    <li>حذف بياناتك (في حالات معينة)</li>
                    <li>تقييد معالجة بياناتك</li>
                    <li>نقل بياناتك لخدمة أخرى</li>
                    <li>الاعتراض على معالجة بياناتك</li>
                    <li>سحب موافقتك في أي وقت</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-gray-800 mb-4">ملفات تعريف الارتباط (Cookies)</h2>
                  <p className="text-gray-600 mb-4">
                    نستخدم ملفات تعريف الارتباط لتحسين تجربتك على الموقع:
                  </p>
                  <ul className="list-disc list-inside text-gray-600 space-y-2">
                    <li>ملفات ضرورية لتشغيل الموقع</li>
                    <li>ملفات لتحليل الاستخدام</li>
                    <li>ملفات لحفظ تفضيلاتك</li>
                    <li>ملفات للإعلانات المستهدفة (بموافقتك)</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-gray-800 mb-4">الاحتفاظ بالبيانات</h2>
                  <p className="text-gray-600">
                    نحتفظ ببياناتك الشخصية طالما كان حسابك نشطاً أو حسب الحاجة لتقديم الخدمات.
                    بعد إغلاق الحساب، نحتفظ ببعض البيانات لفترة محدودة للأغراض القانونية والتنظيمية.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-gray-800 mb-4">التواصل معنا</h2>
                  <p className="text-gray-600 mb-4">
                    للاستفسارات حول سياسة الخصوصية أو لممارسة حقوقك:
                  </p>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-gray-700 font-medium">أورا لاكشري</p>
                    <p className="text-gray-600">البريد الإلكتروني: privacy@auraaluxury.com</p>
                    <p className="text-gray-600">الهاتف: +90 501 371 5391</p>
                    <p className="text-gray-600">العنوان: الرياض، المملكة العربية السعودية</p>
                  </div>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-gray-800 mb-4">التحديثات</h2>
                  <p className="text-gray-600">
                    قد نحدث سياسة الخصوصية من وقت لآخر. سنقوم بإشعارك بأي تغييرات مهمة عبر البريد الإلكتروني 
                    أو إشعار على الموقع. يُرجى مراجعة هذه الصفحة دورياً للاطلاع على آخر التحديثات.
                  </p>
                  <p className="text-gray-500 mt-4 text-sm">
                    آخر تحديث: أكتوبر 2024
                  </p>
                </section>
              </>
            ) : (
              <>
                <section>
                  <h2 className="text-2xl font-semibold text-gray-800 mb-4">Introduction</h2>
                  <p className="text-gray-600 leading-relaxed">
                    Auraa Luxury ("we," "us," "our," "the company") is committed to protecting your privacy and respecting your personal data. 
                    This Privacy Policy explains how we collect, use, and protect your personal information when you use our website and services.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-gray-800 mb-4">Information We Collect</h2>
                  
                  <h3 className="text-xl font-semibold text-gray-700 mb-3">Personal Information</h3>
                  <ul className="list-disc list-inside text-gray-600 space-y-2 mb-4">
                    <li>Full name</li>
                    <li>Email address</li>
                    <li>Phone number</li>
                    <li>Shipping and billing address</li>
                    <li>Date of birth (optional)</li>
                  </ul>

                  <h3 className="text-xl font-semibold text-gray-700 mb-3">Order Information</h3>
                  <ul className="list-disc list-inside text-gray-600 space-y-2 mb-4">
                    <li>Order date and time</li>
                    <li>Products ordered</li>
                    <li>Payment methods used</li>
                    <li>Customer service correspondence</li>
                  </ul>

                  <h3 className="text-xl font-semibold text-gray-700 mb-3">Technical Information</h3>
                  <ul className="list-disc list-inside text-gray-600 space-y-2">
                    <li>IP address</li>
                    <li>Browser and device type</li>
                    <li>Operating system</li>
                    <li>Pages visited</li>
                    <li>Time spent on site</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-gray-800 mb-4">How We Use Your Information</h2>
                  <ul className="list-disc list-inside text-gray-600 space-y-2">
                    <li>Process and fulfill your orders</li>
                    <li>Communicate about your orders and account</li>
                    <li>Improve our services and products</li>
                    <li>Send offers and updates (with your consent)</li>
                    <li>Prevent fraud and ensure security</li>
                    <li>Comply with legal requirements</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-gray-800 mb-4">Information Sharing</h2>
                  <p className="text-gray-600 mb-4">
                    We do not sell, rent, or share your personal information with third parties, except in the following cases:
                  </p>
                  <ul className="list-disc list-inside text-gray-600 space-y-2">
                    <li>With shipping companies to deliver your orders</li>
                    <li>With payment service providers to process payments</li>
                    <li>With technical service providers for website maintenance</li>
                    <li>When required by competent legal authorities</li>
                    <li>To protect our rights or the rights of others</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-gray-800 mb-4">Data Protection</h2>
                  <p className="text-gray-600 mb-4">
                    We implement advanced security measures to protect your data, including:
                  </p>
                  <ul className="list-disc list-inside text-gray-600 space-y-2">
                    <li>Encryption of sensitive data (SSL/TLS)</li>
                    <li>Intrusion protection systems</li>
                    <li>Continuous security monitoring</li>
                    <li>Regular security system updates</li>
                    <li>Employee training on data protection</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-gray-800 mb-4">Your Rights</h2>
                  <p className="text-gray-600 mb-4">You have the right to:</p>
                  <ul className="list-disc list-inside text-gray-600 space-y-2">
                    <li>Access your personal data</li>
                    <li>Correct inaccurate data</li>
                    <li>Delete your data (in certain cases)</li>
                    <li>Restrict processing of your data</li>
                    <li>Transfer your data to another service</li>
                    <li>Object to processing of your data</li>
                    <li>Withdraw your consent at any time</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-gray-800 mb-4">Contact Us</h2>
                  <p className="text-gray-600 mb-4">
                    For inquiries about this privacy policy or to exercise your rights:
                  </p>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-gray-700 font-medium">Auraa Luxury</p>
                    <p className="text-gray-600">Email: privacy@auraaluxury.com</p>
                    <p className="text-gray-600">Phone: +966 50 123 4567</p>
                    <p className="text-gray-600">Address: Riyadh, Saudi Arabia</p>
                  </div>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-gray-800 mb-4">Updates</h2>
                  <p className="text-gray-600">
                    We may update this privacy policy from time to time. We will notify you of any significant changes 
                    via email or a notice on the website. Please review this page periodically for the latest updates.
                  </p>
                  <p className="text-gray-500 mt-4 text-sm">
                    Last updated: October 2024
                  </p>
                </section>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;