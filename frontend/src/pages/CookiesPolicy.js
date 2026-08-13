import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Cookie, Shield, BarChart, Target, Settings } from 'lucide-react';

const CookiesPolicy = () => {
  const { language } = useLanguage();
  const isRTL = language === 'ar' || language === 'he';

  const content = {
    ar: {
      title: 'سياسة الكوكيز',
      lastUpdated: 'آخر تحديث: 19 أكتوبر 2025',
      intro: {
        title: 'ما هي الكوكيز؟',
        text: 'الكوكيز هي ملفات نصية صغيرة يتم تخزينها على جهازك عند زيارة موقعنا الإلكتروني. تساعدنا هذه الملفات في تحسين تجربتك على الموقع من خلال تذكر تفضيلاتك وتوفير محتوى مخصص لك.'
      },
      sections: [
        {
          icon: Shield,
          title: 'كوكيز الجلسة (Session Cookies)',
          description: 'كوكيز ضرورية لتشغيل الموقع بشكل صحيح',
          items: [
            'تسجيل الدخول والمصادقة: للحفاظ على جلستك نشطة أثناء التصفح',
            'إدارة السلة: لحفظ المنتجات التي أضفتها إلى سلة التسوق',
            'الأمان: لحماية حسابك ومنع الوصول غير المصرح به',
            'هذه الكوكيز ضرورية ولا يمكن تعطيلها'
          ]
        },
        {
          icon: Settings,
          title: 'كوكيز التفضيلات (Preference Cookies)',
          description: 'كوكيز تساعد في تذكر اختياراتك',
          items: [
            'اللغة المفضلة: لعرض الموقع باللغة التي اخترتها (عربي، إنجليزي، إلخ)',
            'العملة: لعرض الأسعار بالعملة التي تفضلها',
            'التخطيط والتصميم: لتذكر تفضيلاتك في عرض الموقع',
            'يمكن تعطيل هذه الكوكيز لكن قد يؤثر ذلك على تجربتك'
          ]
        },
        {
          icon: BarChart,
          title: 'كوكيز التحليلات (Analytics Cookies)',
          description: 'كوكيز تساعدنا في فهم كيفية استخدام الزوار للموقع',
          items: [
            'Google Analytics: لتحليل حركة المرور وسلوك المستخدمين',
            'عدد الزيارات والصفحات المشاهدة',
            'مدة الجلسة ومعدل الارتداد',
            'البيانات المجمعة مجهولة الهوية ولا تحدد هويتك الشخصية'
          ]
        },
        {
          icon: Target,
          title: 'كوكيز الإعلانات (Advertising Cookies)',
          description: 'كوكيز تساعد في عرض إعلانات ملائمة لك',
          items: [
            'Facebook Pixel: لتتبع التحويلات وتحسين الحملات الإعلانية',
            'إعلانات مخصصة: لعرض إعلانات تهمك بناءً على اهتماماتك',
            'إعادة الاستهداف: لتذكيرك بالمنتجات التي شاهدتها',
            'يمكن تعطيل هذه الكوكيز من خلال إعدادات المتصفح'
          ]
        }
      ],
      management: {
        title: 'كيفية إدارة الكوكيز',
        text: 'يمكنك التحكم في الكوكيز من خلال إعدادات متصفحك:',
        browsers: [
          'Google Chrome: الإعدادات > الخصوصية والأمان > الكوكيز',
          'Firefox: الإعدادات > الخصوصية والأمان > الكوكيز',
          'Safari: التفضيلات > الخصوصية > إدارة بيانات الموقع',
          'Edge: الإعدادات > الخصوصية > الكوكيز'
        ],
        note: 'تعطيل الكوكيز الضرورية قد يؤثر على وظائف الموقع الأساسية.'
      },
      duration: {
        title: 'مدة تخزين الكوكيز',
        items: [
          'كوكيز الجلسة: تُحذف عند إغلاق المتصفح',
          'كوكيز التفضيلات: تُحفظ لمدة 12 شهراً',
          'كوكيز التحليلات: تُحفظ لمدة 24 شهراً',
          'كوكيز الإعلانات: تُحفظ لمدة 90 يوماً'
        ]
      },
      changes: {
        title: 'التحديثات على السياسة',
        text: 'قد نقوم بتحديث سياسة الكوكيز من وقت لآخر. سيتم نشر أي تغييرات على هذه الصفحة مع تحديث تاريخ "آخر تحديث" أعلاه.'
      },
      contact: {
        title: 'تواصل معنا',
        text: 'إذا كان لديك أي أسئلة حول سياسة الكوكيز، يرجى التواصل معنا عبر:'
      }
    },
    en: {
      title: 'Cookie Policy',
      lastUpdated: 'Last Updated: October 19, 2025',
      intro: {
        title: 'What are Cookies?',
        text: 'Cookies are small text files stored on your device when you visit our website. These files help us improve your experience by remembering your preferences and providing personalized content.'
      },
      sections: [
        {
          icon: Shield,
          title: 'Session Cookies',
          description: 'Essential cookies required for the website to function properly',
          items: [
            'Login & Authentication: To keep your session active while browsing',
            'Cart Management: To save products you\'ve added to your shopping cart',
            'Security: To protect your account and prevent unauthorized access',
            'These cookies are essential and cannot be disabled'
          ]
        },
        {
          icon: Settings,
          title: 'Preference Cookies',
          description: 'Cookies that remember your choices',
          items: [
            'Preferred Language: To display the website in your chosen language (Arabic, English, etc.)',
            'Currency: To show prices in your preferred currency',
            'Layout & Design: To remember your display preferences',
            'These cookies can be disabled but may affect your experience'
          ]
        },
        {
          icon: BarChart,
          title: 'Analytics Cookies',
          description: 'Cookies that help us understand how visitors use the website',
          items: [
            'Google Analytics: To analyze traffic and user behavior',
            'Number of visits and page views',
            'Session duration and bounce rate',
            'Collected data is anonymized and does not identify you personally'
          ]
        },
        {
          icon: Target,
          title: 'Advertising Cookies',
          description: 'Cookies that help display relevant ads',
          items: [
            'Facebook Pixel: To track conversions and optimize ad campaigns',
            'Personalized Ads: To show ads based on your interests',
            'Retargeting: To remind you of products you\'ve viewed',
            'These cookies can be disabled through browser settings'
          ]
        }
      ],
      management: {
        title: 'How to Manage Cookies',
        text: 'You can control cookies through your browser settings:',
        browsers: [
          'Google Chrome: Settings > Privacy and Security > Cookies',
          'Firefox: Settings > Privacy and Security > Cookies',
          'Safari: Preferences > Privacy > Manage Website Data',
          'Edge: Settings > Privacy > Cookies'
        ],
        note: 'Disabling essential cookies may affect core website functionality.'
      },
      duration: {
        title: 'Cookie Storage Duration',
        items: [
          'Session Cookies: Deleted when browser is closed',
          'Preference Cookies: Stored for 12 months',
          'Analytics Cookies: Stored for 24 months',
          'Advertising Cookies: Stored for 90 days'
        ]
      },
      changes: {
        title: 'Policy Updates',
        text: 'We may update this Cookie Policy from time to time. Any changes will be posted on this page with an updated "Last Updated" date above.'
      },
      contact: {
        title: 'Contact Us',
        text: 'If you have any questions about our Cookie Policy, please contact us via:'
      }
    }
  };

  const t = content[language] || content.en;

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="bg-gradient-to-r from-brand to-accent text-white py-12 sm:py-16">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-3 mb-4">
            <Cookie className="h-10 w-10 sm:h-12 sm:w-12" />
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold">{t.title}</h1>
          </div>
          <p className="text-white/90 text-sm sm:text-base">{t.lastUpdated}</p>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8 sm:py-12">
        <div className="max-w-4xl mx-auto">
          {/* Introduction */}
          <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8 mb-8">
            <h2 className="text-2xl font-bold text-brand mb-4">{t.intro.title}</h2>
            <p className="text-gray-700 leading-relaxed text-base sm:text-lg">
              {t.intro.text}
            </p>
          </div>

          {/* Cookie Types */}
          {t.sections.map((section, index) => {
            const Icon = section.icon;
            return (
              <div key={index} className="bg-white rounded-xl shadow-lg p-6 sm:p-8 mb-6">
                <div className="flex items-start gap-4 mb-4">
                  <div className="bg-brand/10 p-3 rounded-lg flex-shrink-0">
                    <Icon className="h-6 w-6 text-brand" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-800 mb-2">{section.title}</h3>
                    <p className="text-gray-600 text-sm sm:text-base">{section.description}</p>
                  </div>
                </div>
                <ul className="space-y-2 text-gray-700">
                  {section.items.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-brand mt-1 flex-shrink-0">•</span>
                      <span className="text-sm sm:text-base">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}

          {/* Management */}
          <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8 mb-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">{t.management.title}</h3>
            <p className="text-gray-700 mb-4 text-sm sm:text-base">{t.management.text}</p>
            <ul className="space-y-2 mb-4">
              {t.management.browsers.map((browser, idx) => (
                <li key={idx} className="flex items-start gap-2 text-gray-700">
                  <span className="text-brand mt-1">•</span>
                  <span className="text-sm sm:text-base">{browser}</span>
                </li>
              ))}
            </ul>
            <div className="bg-amber-50 border-l-4 border-brand p-4 rounded">
              <p className="text-gray-700 text-sm sm:text-base">
                <strong className="text-brand">{isRTL ? 'تنبيه:' : 'Note:'}</strong> {t.management.note}
              </p>
            </div>
          </div>

          {/* Duration */}
          <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8 mb-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">{t.duration.title}</h3>
            <ul className="space-y-2">
              {t.duration.items.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2 text-gray-700">
                  <span className="text-brand mt-1">•</span>
                  <span className="text-sm sm:text-base">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Changes */}
          <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8 mb-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">{t.changes.title}</h3>
            <p className="text-gray-700 text-sm sm:text-base leading-relaxed">{t.changes.text}</p>
          </div>

          {/* Contact */}
          <div className="bg-gradient-to-r from-brand to-accent text-white rounded-xl shadow-lg p-6 sm:p-8">
            <h3 className="text-xl font-bold mb-4">{t.contact.title}</h3>
            <p className="mb-4 text-sm sm:text-base">{t.contact.text}</p>
            <div className="space-y-2 text-sm sm:text-base">
              <p>{isRTL ? 'البريد الإلكتروني: ' : 'Email: '}<span dir="ltr">younes.sowady2011@gmail.com</span></p>
              <p>{isRTL ? 'واتساب: ' : 'WhatsApp: '}<span dir="ltr">+90 501 371 5391</span></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CookiesPolicy;
