import React from 'react';
import { useLanguage } from '../context/LanguageContext';

const TermsOfService = () => {
  const { language } = useLanguage();
  const isRTL = language === 'ar';

  return (
    <div className={`min-h-screen bg-gray-50 py-12 ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            {isRTL ? 'شروط الاستخدام' : 'Terms of Service'}
          </h1>
          
          <div className="prose prose-lg max-w-none space-y-6">
            {isRTL ? (
              <>
                <section>
                  <h2 className="text-2xl font-semibold text-gray-800 mb-4">مقدمة</h2>
                  <p className="text-gray-600 leading-relaxed">
                    مرحباً بك في أورا لاكشري. هذه الشروط والأحكام تحكم استخدامك لموقعنا الإلكتروني وخدماتنا.
                    باستخدام موقعنا، فإنك توافق على هذه الشروط بالكامل. إذا كنت لا توافق على أي جزء من هذه الشروط،
                    فيرجى عدم استخدام موقعنا.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-gray-800 mb-4">تعريفات</h2>
                  <ul className="list-disc list-inside text-gray-600 space-y-2">
                    <li><strong>"نحن"، "لنا"، "الشركة"</strong>: تشير إلى أورا لاكشري</li>
                    <li><strong>"أنت"، "العميل"، "المستخدم"</strong>: تشير إلى الشخص الذي يستخدم الموقع</li>
                    <li><strong>"الموقع"</strong>: يشير إلى موقع أورا لاكشري الإلكتروني</li>
                    <li><strong>"المنتجات"</strong>: تشير إلى المجوهرات والإكسسوارات المعروضة</li>
                    <li><strong>"الخدمات"</strong>: تشير إلى خدمات البيع والشحن والدعم</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-gray-800 mb-4">الأهلية</h2>
                  <p className="text-gray-600 mb-4">لاستخدام موقعنا، يجب أن:</p>
                  <ul className="list-disc list-inside text-gray-600 space-y-2">
                    <li>تكون بعمر 18 عاماً أو أكبر</li>
                    <li>تمتلك الأهلية القانونية لإبرام العقود</li>
                    <li>تقدم معلومات صحيحة وحديثة</li>
                    <li>لا تكون ممنوعاً من استخدام خدماتنا</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-gray-800 mb-4">حساب المستخدم</h2>
                  <h3 className="text-xl font-semibold text-gray-700 mb-3">إنشاء الحساب</h3>
                  <ul className="list-disc list-inside text-gray-600 space-y-2 mb-4">
                    <li>معلومات دقيقة وحديثة مطلوبة</li>
                    <li>كلمة مرور قوية وآمنة</li>
                    <li>مسؤولية حفظ بيانات الدخول</li>
                  </ul>

                  <h3 className="text-xl font-semibold text-gray-700 mb-3">استخدام الحساب</h3>
                  <ul className="list-disc list-inside text-gray-600 space-y-2">
                    <li>أنت مسؤول عن جميع الأنشطة في حسابك</li>
                    <li>إبلاغنا فوراً عن أي استخدام غير مصرح به</li>
                    <li>عدم مشاركة بيانات حسابك مع الآخرين</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-gray-800 mb-4">الطلبات والمدفوعات</h2>
                  
                  <h3 className="text-xl font-semibold text-gray-700 mb-3">تقديم الطلبات</h3>
                  <ul className="list-disc list-inside text-gray-600 space-y-2 mb-4">
                    <li>جميع الطلبات تخضع لتوفر المنتجات</li>
                    <li>نحتفظ بالحق في رفض أو إلغاء الطلبات</li>
                    <li>تأكيد الطلب لا يضمن القبول النهائي</li>
                  </ul>

                  <h3 className="text-xl font-semibold text-gray-700 mb-3">الأسعار والمدفوعات</h3>
                  <ul className="list-disc list-inside text-gray-600 space-y-2 mb-4">
                    <li>الأسعار بالريال السعودي شاملة ضريبة القيمة المضافة</li>
                    <li>قد تتغير الأسعار دون إشعار مسبق</li>
                    <li>الدفع مطلوب وقت تقديم الطلب</li>
                    <li>نقبل البطاقات الائتمانية والتحويل البنكي</li>
                  </ul>

                  <h3 className="text-xl font-semibold text-gray-700 mb-3">إلغاء الطلبات</h3>
                  <ul className="list-disc list-inside text-gray-600 space-y-2">
                    <li>يمكن إلغاء الطلب خلال ساعة من تقديمه</li>
                    <li>بعد بدء التجهيز، الإلغاء غير متاح</li>
                    <li>رسوم الإلغاء قد تنطبق في بعض الحالات</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-gray-800 mb-4">الشحن والتسليم</h2>
                  <h3 className="text-xl font-semibold text-gray-700 mb-3">مناطق الشحن</h3>
                  <p className="text-gray-600 mb-4">نشحن إلى جميع أنحاء المملكة العربية السعودية ودول مجلس التعاون الخليجي.</p>

                  <h3 className="text-xl font-semibold text-gray-700 mb-3">أوقات التسليم</h3>
                  <ul className="list-disc list-inside text-gray-600 space-y-2 mb-4">
                    <li>داخل الرياض: 1-2 يوم عمل</li>
                    <li>باقي مدن السعودية: 2-4 أيام عمل</li>
                    <li>دول الخليج: 3-7 أيام عمل</li>
                  </ul>

                  <h3 className="text-xl font-semibold text-gray-700 mb-3">رسوم الشحن</h3>
                  <ul className="list-disc list-inside text-gray-600 space-y-2">
                    <li>شحن مجاني للطلبات فوق 500 ريال داخل السعودية</li>
                    <li>رسوم شحن ثابتة لدول الخليج</li>
                    <li>قد تخضع للجمارك والرسوم الحكومية</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-gray-800 mb-4">الاستخدام المقبول</h2>
                  <p className="text-gray-600 mb-4">يُمنع استخدام موقعنا في:</p>
                  <ul className="list-disc list-inside text-gray-600 space-y-2">
                    <li>أي أنشطة غير قانونية أو احتيالية</li>
                    <li>انتهاك حقوق الآخرين الفكرية</li>
                    <li>نشر محتوى مسيء أو ضار</li>
                    <li>محاولة اختراق أو تعطيل الموقع</li>
                    <li>استخدام برامج آلية لاستخراج البيانات</li>
                    <li>التلاعب بالأسعار أو المراجعات</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-gray-800 mb-4">الملكية الفكرية</h2>
                  <p className="text-gray-600 mb-4">
                    جميع المحتويات على الموقع محمية بحقوق الطبع والنشر والعلامات التجارية:
                  </p>
                  <ul className="list-disc list-inside text-gray-600 space-y-2">
                    <li>النصوص والصور والرسوم</li>
                    <li>التصميم والواجهة</li>
                    <li>الشعارات والعلامات التجارية</li>
                    <li>البرمجيات والأكواد</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-gray-800 mb-4">إخلاء المسؤولية</h2>
                  <p className="text-gray-600 mb-4">
                    نقدم الموقع والخدمات "كما هي" دون ضمانات من أي نوع. لا نتحمل المسؤولية عن:
                  </p>
                  <ul className="list-disc list-inside text-gray-600 space-y-2">
                    <li>الأخطاء أو التقطعات في الخدمة</li>
                    <li>فقدان البيانات أو الأرباح</li>
                    <li>الأضرار المباشرة أو غير المباشرة</li>
                    <li>استخدام المعلومات من الموقع</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-gray-800 mb-4">تحديد المسؤولية</h2>
                  <p className="text-gray-600">
                    في أقصى الحدود المسموح بها قانونياً، تقتصر مسؤوليتنا الإجمالية على قيمة الطلب المعني 
                    أو 100 ريال سعودي، أيهما أقل.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-gray-800 mb-4">تعديل الشروط</h2>
                  <p className="text-gray-600">
                    نحتفظ بالحق في تعديل هذه الشروط في أي وقت. التغييرات المهمة ستُنشر على الموقع وترسل 
                    عبر البريد الإلكتروني. استمرار استخدامك للموقع يعني موافقتك على الشروط المُحدثة.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-gray-800 mb-4">القانون الحاكم</h2>
                  <p className="text-gray-600">
                    تخضع هذه الشروط لقوانين المملكة العربية السعودية. أي نزاع سيُحل في المحاكم المختصة في الرياض.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-gray-800 mb-4">التواصل</h2>
                  <p className="text-gray-600 mb-4">للاستفسارات حول هذه الشروط:</p>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-gray-700 font-medium">أورا لاكشري</p>
                    <p className="text-gray-600">البريد الإلكتروني: legal@auraaluxury.com</p>
                    <p className="text-gray-600">الهاتف: +90 501 371 5391</p>
                    <p className="text-gray-600">العنوان: الرياض، المملكة العربية السعودية</p>
                  </div>
                </section>

                <section>
                  <p className="text-gray-500 text-sm mt-8">
                    آخر تحديث: أكتوبر 2024<br/>
                    هذه الشروط سارية اعتباراً من تاريخ آخر تحديث.
                  </p>
                </section>
              </>
            ) : (
              <>
                <section>
                  <h2 className="text-2xl font-semibold text-gray-800 mb-4">Introduction</h2>
                  <p className="text-gray-600 leading-relaxed">
                    Welcome to Auraa Luxury. These Terms and Conditions govern your use of our website and services.
                    By using our site, you agree to these terms in full. If you do not agree with any part of these terms,
                    please do not use our website.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-gray-800 mb-4">Definitions</h2>
                  <ul className="list-disc list-inside text-gray-600 space-y-2">
                    <li><strong>"We," "Us," "Our," "Company"</strong>: refers to Auraa Luxury</li>
                    <li><strong>"You," "Customer," "User"</strong>: refers to the person using the website</li>
                    <li><strong>"Website"</strong>: refers to the Auraa Luxury website</li>
                    <li><strong>"Products"</strong>: refers to jewelry and accessories displayed</li>
                    <li><strong>"Services"</strong>: refers to sales, shipping, and support services</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-gray-800 mb-4">Eligibility</h2>
                  <p className="text-gray-600 mb-4">To use our website, you must:</p>
                  <ul className="list-disc list-inside text-gray-600 space-y-2">
                    <li>Be 18 years of age or older</li>
                    <li>Have legal capacity to enter into contracts</li>
                    <li>Provide accurate and current information</li>
                    <li>Not be prohibited from using our services</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-gray-800 mb-4">User Account</h2>
                  <h3 className="text-xl font-semibold text-gray-700 mb-3">Account Creation</h3>
                  <ul className="list-disc list-inside text-gray-600 space-y-2 mb-4">
                    <li>Accurate and current information required</li>
                    <li>Strong and secure password</li>
                    <li>Responsibility for keeping login credentials safe</li>
                  </ul>

                  <h3 className="text-xl font-semibold text-gray-700 mb-3">Account Usage</h3>
                  <ul className="list-disc list-inside text-gray-600 space-y-2">
                    <li>You are responsible for all activities on your account</li>
                    <li>Report unauthorized use immediately</li>
                    <li>Do not share your account credentials</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-gray-800 mb-4">Orders and Payments</h2>
                  
                  <h3 className="text-xl font-semibold text-gray-700 mb-3">Placing Orders</h3>
                  <ul className="list-disc list-inside text-gray-600 space-y-2 mb-4">
                    <li>All orders subject to product availability</li>
                    <li>We reserve the right to refuse or cancel orders</li>
                    <li>Order confirmation does not guarantee final acceptance</li>
                  </ul>

                  <h3 className="text-xl font-semibold text-gray-700 mb-3">Prices and Payments</h3>
                  <ul className="list-disc list-inside text-gray-600 space-y-2 mb-4">
                    <li>Prices in Saudi Riyal including VAT</li>
                    <li>Prices may change without prior notice</li>
                    <li>Payment required at time of order</li>
                    <li>We accept credit cards and bank transfer</li>
                  </ul>

                  <h3 className="text-xl font-semibold text-gray-700 mb-3">Order Cancellation</h3>
                  <ul className="list-disc list-inside text-gray-600 space-y-2">
                    <li>Orders can be cancelled within one hour of placement</li>
                    <li>After processing begins, cancellation unavailable</li>
                    <li>Cancellation fees may apply in some cases</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-gray-800 mb-4">Shipping and Delivery</h2>
                  <h3 className="text-xl font-semibold text-gray-700 mb-3">Shipping Areas</h3>
                  <p className="text-gray-600 mb-4">We ship throughout Saudi Arabia and GCC countries.</p>

                  <h3 className="text-xl font-semibold text-gray-700 mb-3">Delivery Times</h3>
                  <ul className="list-disc list-inside text-gray-600 space-y-2 mb-4">
                    <li>Riyadh: 1-2 business days</li>
                    <li>Other Saudi cities: 2-4 business days</li>
                    <li>GCC countries: 3-7 business days</li>
                  </ul>

                  <h3 className="text-xl font-semibold text-gray-700 mb-3">Shipping Costs</h3>
                  <ul className="list-disc list-inside text-gray-600 space-y-2">
                    <li>Free shipping for orders over 500 SAR within Saudi</li>
                    <li>Fixed shipping rates to GCC countries</li>
                    <li>May be subject to customs and government fees</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-gray-800 mb-4">Acceptable Use</h2>
                  <p className="text-gray-600 mb-4">It is prohibited to use our website for:</p>
                  <ul className="list-disc list-inside text-gray-600 space-y-2">
                    <li>Any illegal or fraudulent activities</li>
                    <li>Violating others' intellectual property rights</li>
                    <li>Publishing offensive or harmful content</li>
                    <li>Attempting to hack or disrupt the website</li>
                    <li>Using automated programs for data extraction</li>
                    <li>Manipulating prices or reviews</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-gray-800 mb-4">Intellectual Property</h2>
                  <p className="text-gray-600 mb-4">
                    All content on the website is protected by copyright and trademark laws:
                  </p>
                  <ul className="list-disc list-inside text-gray-600 space-y-2">
                    <li>Text, images, and graphics</li>
                    <li>Design and interface</li>
                    <li>Logos and trademarks</li>
                    <li>Software and code</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-gray-800 mb-4">Disclaimer</h2>
                  <p className="text-gray-600 mb-4">
                    We provide the website and services "as is" without warranties of any kind. We are not responsible for:
                  </p>
                  <ul className="list-disc list-inside text-gray-600 space-y-2">
                    <li>Errors or service interruptions</li>
                    <li>Loss of data or profits</li>
                    <li>Direct or indirect damages</li>
                    <li>Use of information from the website</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-gray-800 mb-4">Limitation of Liability</h2>
                  <p className="text-gray-600">
                    To the maximum extent permitted by law, our total liability is limited to the value of the order concerned 
                    or 100 Saudi Riyals, whichever is less.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-gray-800 mb-4">Modification of Terms</h2>
                  <p className="text-gray-600">
                    We reserve the right to modify these terms at any time. Significant changes will be posted on the website 
                    and sent via email. Continued use of the website means acceptance of updated terms.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-gray-800 mb-4">Governing Law</h2>
                  <p className="text-gray-600">
                    These terms are governed by Saudi Arabian law. Any disputes will be resolved in competent courts in Riyadh.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-gray-800 mb-4">Contact</h2>
                  <p className="text-gray-600 mb-4">For inquiries about these terms:</p>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-gray-700 font-medium">Auraa Luxury</p>
                    <p className="text-gray-600">Email: legal@auraaluxury.com</p>
                    <p className="text-gray-600">Phone: +966 50 123 4567</p>
                    <p className="text-gray-600">Address: Riyadh, Saudi Arabia</p>
                  </div>
                </section>

                <section>
                  <p className="text-gray-500 text-sm mt-8">
                    Last updated: October 2024<br/>
                    These terms are effective as of the last update date.
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

export default TermsOfService;