import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Crown, Award, Shield, Users, Heart, Sparkles, Globe, Gift } from 'lucide-react';

const AboutUs = () => {
  const { language } = useLanguage();
  const isRTL = language === 'ar';

  // لا نعرض أرقام مبيعات أو رضا أو وعود تشغيلية لا تدعمها بيانات متحققة.
  // تبقى الشبكة البصرية نفسها، لكن برسائل مفيدة وصادقة للمتسوق.
  const stats = [
    { number: isRTL ? 'مختارات' : 'Curated', label: isRTL ? 'إكسسوارات للعرض' : 'Accessories to explore', icon: Users },
    { number: isRTL ? 'وصف واضح' : 'Clear details', label: isRTL ? 'معلومات تساعدك على الاختيار' : 'Information for informed choices', icon: Crown },
    { number: isRTL ? 'تسوّق آمن' : 'Secure shopping', label: isRTL ? 'حماية للحساب والطلب' : 'Account and order protection', icon: Shield },
    { number: isRTL ? 'متابعة' : 'Support', label: isRTL ? 'قنوات تواصل متاحة' : 'Available contact channels', icon: Heart }
  ];

  const values = [
    {
      icon: Crown,
      title: isRTL ? 'الجودة الفائقة' : 'Superior Quality',
      description: isRTL 
        ? 'نحرص على تقديم صور ووصف واضحين للمنتج لتتمكني من اتخاذ قرار الشراء بثقة.'
        : 'We provide clear product photos and descriptions to help you shop with confidence.'
    },
    {
      icon: Sparkles,
      title: isRTL ? 'التصميم المميز' : 'Distinctive Design',
      description: isRTL 
        ? 'تجمع مجموعتنا بين أنماط متنوعة لتسهيل العثور على القطعة التي تناسب ذوقك.'
        : 'Our collection brings together varied styles to help you find a piece that suits your taste.'
    },
    {
      icon: Shield,
      title: isRTL ? 'الثقة والأمان' : 'Trust & Security',
      description: isRTL 
        ? 'نوضح خيارات الطلب والدفع وسياسة الإرجاع، ونحافظ على بيانات الحساب والطلب بعناية.'
        : 'We make ordering, payment, and return options clear while protecting account and order data.'
    },
    {
      icon: Globe,
      title: isRTL ? 'الوصول العالمي' : 'Global Reach',
      description: isRTL 
        ? 'تابعي تفاصيل الطلب من المتجر، وتواصلي معنا مباشرة عند الحاجة إلى المساعدة.'
        : 'Follow your order details in the store and contact us directly whenever you need help.'
    }
  ];

  const experienceHighlights = [
    {
      name: isRTL ? 'تصفّح منظم' : 'Organized browsing',
      position: isRTL ? 'فئات وبحث وفلاتر' : 'Categories, search, and filters',
      description: isRTL
        ? 'استخدمي الفئات والبحث والفلاتر للوصول إلى المنتجات بسهولة.'
        : 'Use categories, search, and filters to find products with ease.'
    },
    {
      name: isRTL ? 'اختيار مدروس' : 'Thoughtful choices',
      position: isRTL ? 'مفضلة ومقارنة وسلة' : 'Wishlist, comparison, and cart',
      description: isRTL
        ? 'احفظي المنتجات أو قارني بينها قبل إتمام الطلب.'
        : 'Save products or compare them before completing an order.'
    },
    {
      name: isRTL ? 'متابعة واضحة' : 'Clear follow-up',
      position: isRTL ? 'طلبات وتواصل مباشر' : 'Orders and direct contact',
      description: isRTL
        ? 'راجعي تفاصيل طلبك وتواصلي مع المتجر من خلال القنوات المتاحة.'
        : 'Review order details and contact the store through available channels.'
    }
  ];

  return (
    <div className={`min-h-screen bg-white ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      
      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-amber-50 to-yellow-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <div className="bg-gradient-to-r from-amber-400 to-yellow-500 p-4 rounded-full">
                <Crown className="h-12 w-12 text-white" />
              </div>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              {isRTL ? 'مرحباً بكم في أورا لاكشري' : 'Welcome to Auraa Luxury'}
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              {isRTL 
                ? 'رحلة بدأت بحلم لتقديم أجمل المجوهرات والإكسسوارات الفاخرة للمرأة العربية، حيث نؤمن أن كل امرأة تستحق أن تشع بريقاً مميزاً يعكس شخصيتها الفريدة'
                : 'A journey that began with a dream to offer the most beautiful luxury jewelry and accessories for Arab women, where we believe every woman deserves to shine with a distinctive brilliance that reflects her unique personality'
              }
            </p>
          </div>
        </div>
        
        {/* Decorative Elements */}
        <div className="absolute top-10 left-10 opacity-20">
          <Sparkles className="h-16 w-16 text-amber-400" />
        </div>
        <div className="absolute bottom-10 right-10 opacity-20">
          <Gift className="h-16 w-16 text-yellow-400" />
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => {
              const IconComponent = stat.icon;
              return (
                <div key={index} className="text-center">
                  <div className="flex justify-center mb-4">
                    <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-3 rounded-full">
                      <IconComponent className="h-8 w-8 text-white" />
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-gray-900 mb-2">{stat.number}</div>
                  <div className="text-gray-600 font-medium">{stat.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Story Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">
                {isRTL ? 'قصتنا' : 'Our Story'}
              </h2>
              <div className="space-y-4 text-gray-600 leading-relaxed">
                <p>
                  {isRTL 
                    ? 'Auraa Luxury متجر إلكتروني يتيح استعراض الإكسسوارات والمجوهرات واختيار ما يناسب أسلوبك بسهولة. نعرض المنتجات بتفاصيل تساعدك على المقارنة واتخاذ قرار واضح.'
                    : 'Auraa Luxury is an online store for exploring jewelry and accessories and choosing what suits your style with ease. We present products with details that support clear comparisons and decisions.'
                  }
                </p>
                <p>
                  {isRTL 
                    ? 'تُصمّم تجربة المتجر لتكون مباشرة: تصفح المنتجات، أضيفي ما يعجبك إلى المفضلة أو السلة، وراجعي معلومات الطلب في مكان واحد.'
                    : 'The store experience is designed to be direct: browse products, save favorites or add items to the cart, and review order information in one place.'
                  }
                </p>
                <p>
                  {isRTL 
                    ? 'نستمع إلى الملاحظات ونراجع تجربة المتجر باستمرار لنحافظ على رحلة تسوق منظمة وواضحة من الاستكشاف حتى متابعة الطلب.'
                    : 'We listen to feedback and continually review the storefront experience to keep the journey organized and clear from discovery through order tracking.'
                  }
                </p>
              </div>
            </div>
            
            <div className="relative">
              <div className="bg-gradient-to-r from-amber-400 to-yellow-500 rounded-lg p-8 shadow-2xl">
                <div className="bg-white rounded-lg p-6 text-center">
                  <Crown className="h-16 w-16 text-amber-500 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    {isRTL ? 'رسالتنا' : 'Our Mission'}
                  </h3>
                  <p className="text-gray-600">
                    {isRTL 
                      ? 'نسعى لتمكين كل امرأة من إبراز جمالها الطبيعي وثقتها بنفسها من خلال مجوهرات فاخرة تعكس شخصيتها الفريدة'
                      : 'We strive to empower every woman to showcase her natural beauty and confidence through luxury jewelry that reflects her unique personality'
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              {isRTL ? 'قيمنا الأساسية' : 'Our Core Values'}
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              {isRTL 
                ? 'القيم التي تقودنا في رحلتنا لتقديم أفضل تجربة مجوهرات فاخرة'
                : 'The values that guide us in our journey to provide the best luxury jewelry experience'
              }
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, index) => {
              const IconComponent = value.icon;
              return (
                <div key={index} className="bg-white p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow">
                  <div className="flex justify-center mb-4">
                    <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-3 rounded-full">
                      <IconComponent className="h-8 w-8 text-white" />
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3 text-center">
                    {value.title}
                  </h3>
                  <p className="text-gray-600 text-center leading-relaxed">
                    {value.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              {isRTL ? 'تجربة تسوق مصممة بوضوح' : 'A clearly designed shopping experience'}
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              {isRTL 
                ? 'خطوات وأدوات عملية تساعدك على الاستكشاف والاختيار ومتابعة طلبك.'
                : 'Practical steps and tools for exploring, choosing, and following your order.'
              }
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {experienceHighlights.map((member, index) => (
              <div key={index} className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
                <div className="h-64 bg-gradient-to-r from-gray-200 to-gray-300 flex items-center justify-center">
                  <Users className="h-20 w-20 text-gray-500" />
                </div>
                <div className="p-6 text-center">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {member.name}
                  </h3>
                  <p className="text-amber-600 font-medium mb-3">
                    {member.position}
                  </p>
                  <p className="text-gray-600 text-sm">
                    {member.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-20 bg-gradient-to-r from-purple-600 to-pink-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex justify-center mb-6">
            <div className="bg-white/20 p-4 rounded-full">
              <Heart className="h-12 w-12 text-white" />
            </div>
          </div>
          <h2 className="text-3xl font-bold text-white mb-6">
            {isRTL ? 'انضمي إلى عائلة أورا لاكشري' : 'Join the Auraa Luxury Family'}
          </h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            {isRTL 
              ? 'استعرضي المنتجات المتاحة واختاري القطعة التي تناسب ذوقك.'
              : 'Explore available products and choose the piece that suits your style.'
            }
          </p>
          <div className="space-y-4 sm:space-y-0 sm:space-x-4 sm:flex sm:justify-center">
            <a 
              href="/products"
              className="inline-flex items-center px-8 py-4 bg-white text-purple-600 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Crown className="h-5 w-5 me-2" />
              {isRTL ? 'تسوقي الآن' : 'Shop Now'}
            </a>
            <a 
              href="/contact"
              className="inline-flex items-center px-8 py-4 bg-white/20 text-white font-semibold rounded-lg hover:bg-white/30 transition-colors border border-white/30"
            >
              {isRTL ? 'تواصلي معنا' : 'Contact Us'}
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AboutUs;