import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Clock, Package, RefreshCw, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

const ReturnPolicy = () => {
  const { language } = useLanguage();
  const isRTL = language === 'ar';

  return (
    <div className={`min-h-screen bg-gray-50 py-12 ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            {isRTL ? 'سياسة الإرجاع والاستبدال' : 'Return & Exchange Policy'}
          </h1>
          
          <div className="prose prose-lg max-w-none space-y-6">
            {isRTL ? (
              <>
                {/* Arabic Content */}
                <section>
                  <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
                    <div className="flex items-center">
                      <CheckCircle className="h-6 w-6 text-blue-400 me-3" />
                      <p className="text-blue-800 font-medium">
                        نضمن لك تجربة شراء مريحة مع إمكانية الإرجاع لمدة 14 يوماً
                      </p>
                    </div>
                  </div>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-gray-800 mb-4 flex items-center">
                    <Clock className="h-6 w-6 text-amber-500 me-2" />
                    فترة الإرجاع
                  </h2>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <ul className="list-disc list-inside text-gray-600 space-y-2">
                      <li><strong>14 يوماً</strong> من تاريخ استلام المنتج</li>
                      <li>يبدأ احتساب الفترة من يوم التسليم الفعلي</li>
                      <li>الطلبات المُرسلة بعد انتهاء المدة لن تُقبل</li>
                      <li>أيام العطل والجمع لا تُحتسب ضمن الفترة</li>
                    </ul>
                  </div>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-gray-800 mb-4 flex items-center">
                    <CheckCircle className="h-6 w-6 text-green-500 me-2" />
                    شروط الإرجاع المقبول
                  </h2>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="bg-green-50 p-4 rounded-lg">
                      <h3 className="font-semibold text-green-800 mb-2">المنتجات المقبولة</h3>
                      <ul className="list-disc list-inside text-green-700 text-sm space-y-1">
                        <li>المنتج في حالته الأصلية</li>
                        <li>لم يتم استخدامه أو تلفه</li>
                        <li>العبوة الأصلية سليمة</li>
                        <li>جميع الملحقات متوفرة</li>
                        <li>بطاقة الضمان موجودة</li>
                      </ul>
                    </div>
                    <div className="bg-red-50 p-4 rounded-lg">
                      <h3 className="font-semibold text-red-800 mb-2">المنتجات المرفوضة</h3>
                      <ul className="list-disc list-inside text-red-700 text-sm space-y-1">
                        <li>منتجات مُخصصة أو محفورة</li>
                        <li>مجوهرات تم تعديلها</li>
                        <li>منتجات تالفة بسبب سوء الاستخدام</li>
                        <li>منتجات بدون عبوة أو ملحقات</li>
                        <li>منتجات فى تصفية نهائية</li>
                      </ul>
                    </div>
                  </div>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-gray-800 mb-4 flex items-center">
                    <RefreshCw className="h-6 w-6 text-blue-500 me-2" />
                    إجراءات الإرجاع
                  </h2>
                  
                  <div className="space-y-4">
                    <div className="flex items-start space-x-4 bg-blue-50 p-4 rounded-lg">
                      <div className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">1</div>
                      <div>
                        <h3 className="font-semibold text-blue-800">طلب الإرجاع</h3>
                        <p className="text-blue-700 text-sm">تواصل معنا عبر الهاتف أو البريد الإلكتروني لطلب الإرجاع</p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-4 bg-amber-50 p-4 rounded-lg">
                      <div className="bg-amber-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">2</div>
                      <div>
                        <h3 className="font-semibold text-amber-800">الموافقة والتعليمات</h3>
                        <p className="text-amber-700 text-sm">سنراجع طلبك ونرسل تعليمات الإرسال إذا تم قبوله</p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-4 bg-purple-50 p-4 rounded-lg">
                      <div className="bg-purple-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">3</div>
                      <div>
                        <h3 className="font-semibold text-purple-800">إرسال المنتج</h3>
                        <p className="text-purple-700 text-sm">أرسل المنتج باستخدام تعليماتنا (الشحن على حسابنا)</p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-4 bg-green-50 p-4 rounded-lg">
                      <div className="bg-green-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">4</div>
                      <div>
                        <h3 className="font-semibold text-green-800">الفحص والمعالجة</h3>
                        <p className="text-green-700 text-sm">نفحص المنتج ونعالج الاسترداد خلال 3-5 أيام عمل</p>
                      </div>
                    </div>
                  </div>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-gray-800 mb-4">طرق الاسترداد</h2>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="border border-gray-200 p-4 rounded-lg">
                      <h3 className="font-semibold text-gray-800 mb-2">🏦 استرداد نقدي</h3>
                      <ul className="text-gray-600 text-sm space-y-1">
                        <li>• إلى نفس طريقة الدفع الأصلية</li>
                        <li>• يستغرق 5-10 أيام عمل</li>
                        <li>• قد تطبق رسوم معالجة 2%</li>
                      </ul>
                    </div>

                    <div className="border border-gray-200 p-4 rounded-lg">
                      <h3 className="font-semibold text-gray-800 mb-2">🎁 رصيد المتجر</h3>
                      <ul className="text-gray-600 text-sm space-y-1">
                        <li>• فوري بدون رسوم</li>
                        <li>• صالح لمدة سنة كاملة</li>
                        <li>• قابل للتراكم والاستخدام الجزئي</li>
                      </ul>
                    </div>
                  </div>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-gray-800 mb-4">الاستبدال</h2>
                  
                  <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
                    <h3 className="font-semibold text-amber-800 mb-2">شروط الاستبدال</h3>
                    <ul className="list-disc list-inside text-amber-700 space-y-2">
                      <li>متاح فقط لنفس المنتج بلون أو مقاس مختلف</li>
                      <li>فرق السعر (إن وجد) يُدفع أو يُسترد</li>
                      <li>المنتج الجديد يجب أن يكون متوفراً</li>
                      <li>نفس شروط الإرجاع تنطبق على الاستبدال</li>
                    </ul>
                  </div>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-gray-800 mb-4 flex items-center">
                    <AlertTriangle className="h-6 w-6 text-red-500 me-2" />
                    حالات خاصة
                  </h2>

                  <div className="space-y-4">
                    <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                      <h3 className="font-semibold text-red-800 mb-2">المنتجات التالفة أو الخاطئة</h3>
                      <ul className="list-disc list-inside text-red-700 space-y-1">
                        <li>تواصل معنا فوراً (خلال 48 ساعة)</li>
                        <li>إرسال صور للمنتج والعبوة</li>
                        <li>نتحمل كامل تكاليف الإرجاع والاستبدال</li>
                        <li>استبدال فوري أو استرداد كامل</li>
                      </ul>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                      <h3 className="font-semibold text-blue-800 mb-2">التأخير في الشحن</h3>
                      <ul className="list-disc list-inside text-blue-700 space-y-1">
                        <li>إلغاء مجاني إذا تأخر الشحن أكثر من 7 أيام</li>
                        <li>تعويض 10% من قيمة الطلب كرصيد متجر</li>
                        <li>خيار الانتظار مع تحديث دوري</li>
                      </ul>
                    </div>
                  </div>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-gray-800 mb-4">معلومات مهمة</h2>
                  
                  <div className="bg-gray-100 p-4 rounded-lg">
                    <ul className="list-disc list-inside text-gray-700 space-y-2">
                      <li><strong>تكاليف الشحن:</strong> نتحمل تكلفة الإرجاع للمنتجات التالفة أو الخاطئة فقط</li>
                      <li><strong>الفحص:</strong> نحتفظ بحق فحص المنتجات المُرجعة قبل الاسترداد</li>
                      <li><strong>المنتجات المُخفضة:</strong> لا يُمكن إرجاعها إلا في حالة العيب</li>
                      <li><strong>التواصل:</strong> نرسل تحديثات دورية عن حالة طلب الإرجاع</li>
                      <li><strong>الاستثناءات:</strong> بعض المنتجات قد تخضع لشروط خاصة</li>
                    </ul>
                  </div>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-gray-800 mb-4">كيفية التواصل</h2>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h3 className="font-semibold text-blue-800 mb-2">📞 الهاتف</h3>
                      <p className="text-blue-700">+90 501 371 5391</p>
                      <p className="text-blue-600 text-sm">الأحد - الخميس: 9 ص - 9 م</p>
                    </div>

                    <div className="bg-green-50 p-4 rounded-lg">
                      <h3 className="font-semibold text-green-800 mb-2">📧 البريد الإلكتروني</h3>
                      <p className="text-green-700">returns@auraaluxury.com</p>
                      <p className="text-green-600 text-sm">رد خلال 24 ساعة</p>
                    </div>
                  </div>
                </section>

                <section className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
                  <p className="text-amber-800 text-center font-medium">
                    🛡️ نحن نقدر رضاكم ونسعى لتقديم أفضل خدمة عملاء في المملكة
                  </p>
                </section>

                <section>
                  <p className="text-gray-500 text-sm text-center">
                    آخر تحديث: أكتوبر 2024 | سارية على جميع الطلبات اعتباراً من هذا التاريخ
                  </p>
                </section>
              </>
            ) : (
              <>
                {/* English Content */}
                <section>
                  <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
                    <div className="flex items-center">
                      <CheckCircle className="h-6 w-6 text-blue-400 me-3" />
                      <p className="text-blue-800 font-medium">
                        We guarantee a comfortable shopping experience with 14-day returns
                      </p>
                    </div>
                  </div>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-gray-800 mb-4 flex items-center">
                    <Clock className="h-6 w-6 text-amber-500 me-2" />
                    Return Period
                  </h2>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <ul className="list-disc list-inside text-gray-600 space-y-2">
                      <li><strong>14 days</strong> from the date of receiving the product</li>
                      <li>Period starts from actual delivery day</li>
                      <li>Requests sent after the deadline will not be accepted</li>
                      <li>Holidays and weekends are not counted in the period</li>
                    </ul>
                  </div>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-gray-800 mb-4 flex items-center">
                    <CheckCircle className="h-6 w-6 text-green-500 me-2" />
                    Acceptable Return Conditions
                  </h2>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="bg-green-50 p-4 rounded-lg">
                      <h3 className="font-semibold text-green-800 mb-2">Accepted Products</h3>
                      <ul className="list-disc list-inside text-green-700 text-sm space-y-1">
                        <li>Product in original condition</li>
                        <li>Unused and undamaged</li>
                        <li>Original packaging intact</li>
                        <li>All accessories included</li>
                        <li>Warranty card present</li>
                      </ul>
                    </div>
                    <div className="bg-red-50 p-4 rounded-lg">
                      <h3 className="font-semibold text-red-800 mb-2">Rejected Products</h3>
                      <ul className="list-disc list-inside text-red-700 text-sm space-y-1">
                        <li>Customized or engraved products</li>
                        <li>Modified jewelry</li>
                        <li>Products damaged by misuse</li>
                        <li>Products without packaging or accessories</li>
                        <li>Final sale items</li>
                      </ul>
                    </div>
                  </div>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-gray-800 mb-4 flex items-center">
                    <RefreshCw className="h-6 w-6 text-blue-500 me-2" />
                    Return Process
                  </h2>
                  
                  <div className="space-y-4">
                    <div className="flex items-start space-x-4 bg-blue-50 p-4 rounded-lg">
                      <div className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">1</div>
                      <div>
                        <h3 className="font-semibold text-blue-800">Request Return</h3>
                        <p className="text-blue-700 text-sm">Contact us by phone or email to request a return</p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-4 bg-amber-50 p-4 rounded-lg">
                      <div className="bg-amber-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">2</div>
                      <div>
                        <h3 className="font-semibold text-amber-800">Approval & Instructions</h3>
                        <p className="text-amber-700 text-sm">We'll review your request and send shipping instructions if approved</p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-4 bg-purple-50 p-4 rounded-lg">
                      <div className="bg-purple-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">3</div>
                      <div>
                        <h3 className="font-semibold text-purple-800">Ship Product</h3>
                        <p className="text-purple-700 text-sm">Send the product using our instructions (shipping at our expense)</p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-4 bg-green-50 p-4 rounded-lg">
                      <div className="bg-green-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">4</div>
                      <div>
                        <h3 className="font-semibold text-green-800">Inspection & Processing</h3>
                        <p className="text-green-700 text-sm">We inspect the product and process refund within 3-5 business days</p>
                      </div>
                    </div>
                  </div>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-gray-800 mb-4">Refund Methods</h2>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="border border-gray-200 p-4 rounded-lg">
                      <h3 className="font-semibold text-gray-800 mb-2">🏦 Cash Refund</h3>
                      <ul className="text-gray-600 text-sm space-y-1">
                        <li>• To original payment method</li>
                        <li>• Takes 5-10 business days</li>
                        <li>• 2% processing fee may apply</li>
                      </ul>
                    </div>

                    <div className="border border-gray-200 p-4 rounded-lg">
                      <h3 className="font-semibold text-gray-800 mb-2">🎁 Store Credit</h3>
                      <ul className="text-gray-600 text-sm space-y-1">
                        <li>• Instant with no fees</li>
                        <li>• Valid for one full year</li>
                        <li>• Stackable and partially usable</li>
                      </ul>
                    </div>
                  </div>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-gray-800 mb-4">Exchange</h2>
                  
                  <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
                    <h3 className="font-semibold text-amber-800 mb-2">Exchange Conditions</h3>
                    <ul className="list-disc list-inside text-amber-700 space-y-2">
                      <li>Available only for same product in different color or size</li>
                      <li>Price difference (if any) is paid or refunded</li>
                      <li>New product must be available</li>
                      <li>Same return conditions apply to exchanges</li>
                    </ul>
                  </div>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-gray-800 mb-4 flex items-center">
                    <AlertTriangle className="h-6 w-6 text-red-500 me-2" />
                    Special Cases
                  </h2>

                  <div className="space-y-4">
                    <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                      <h3 className="font-semibold text-red-800 mb-2">Damaged or Wrong Products</h3>
                      <ul className="list-disc list-inside text-red-700 space-y-1">
                        <li>Contact us immediately (within 48 hours)</li>
                        <li>Send photos of product and packaging</li>
                        <li>We cover all return and exchange costs</li>
                        <li>Instant exchange or full refund</li>
                      </ul>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                      <h3 className="font-semibold text-blue-800 mb-2">Shipping Delays</h3>
                      <ul className="list-disc list-inside text-blue-700 space-y-1">
                        <li>Free cancellation if shipping delayed more than 7 days</li>
                        <li>10% compensation of order value as store credit</li>
                        <li>Option to wait with regular updates</li>
                      </ul>
                    </div>
                  </div>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-gray-800 mb-4">Important Information</h2>
                  
                  <div className="bg-gray-100 p-4 rounded-lg">
                    <ul className="list-disc list-inside text-gray-700 space-y-2">
                      <li><strong>Shipping costs:</strong> We cover return shipping only for damaged or wrong products</li>
                      <li><strong>Inspection:</strong> We reserve the right to inspect returned products before refund</li>
                      <li><strong>Sale products:</strong> Cannot be returned except for defects</li>
                      <li><strong>Communication:</strong> We send regular updates on return request status</li>
                      <li><strong>Exceptions:</strong> Some products may have special conditions</li>
                    </ul>
                  </div>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-gray-800 mb-4">How to Contact Us</h2>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h3 className="font-semibold text-blue-800 mb-2">📞 Phone</h3>
                      <p className="text-blue-700">+90 501 371 5391</p>
                      <p className="text-blue-600 text-sm">Sunday - Thursday: 9 AM - 9 PM</p>
                    </div>

                    <div className="bg-green-50 p-4 rounded-lg">
                      <h3 className="font-semibold text-green-800 mb-2">📧 Email</h3>
                      <p className="text-green-700">returns@auraaluxury.com</p>
                      <p className="text-green-600 text-sm">Reply within 24 hours</p>
                    </div>
                  </div>
                </section>

                <section className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
                  <p className="text-amber-800 text-center font-medium">
                    🛡️ We value your satisfaction and strive to provide the best customer service in the Kingdom
                  </p>
                </section>

                <section>
                  <p className="text-gray-500 text-sm text-center">
                    Last updated: October 2024 | Effective for all orders from this date
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

export default ReturnPolicy;