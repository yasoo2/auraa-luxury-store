import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Crown, Award, Shield, Users, Heart, Sparkles, Globe, Gift } from 'lucide-react';

const AboutUs = () => {
  const { language } = useLanguage();
  const isRTL = language === 'ar';

  const stats = [
    { number: '50,000+', label: isRTL ? 'عميل راضٍ' : 'Happy Customers', icon: Users },
    { number: '10,000+', label: isRTL ? 'قطعة مجوهرات' : 'Jewelry Pieces', icon: Crown },
    { number: '99.9%', label: isRTL ? 'معدل الرضا' : 'Satisfaction Rate', icon: Heart },
    { number: '24/7', label: isRTL ? 'خدمة العملاء' : 'Customer Support', icon: Shield }
  ];

  const values = [
    {
      icon: Crown,
      title: isRTL ? 'الجودة الفائقة' : 'Superior Quality',
      description: isRTL 
        ? 'نختار بعناية أجود المواد والأحجار الكريمة لضمان قطع تدوم مدى الحياة'
        : 'We carefully select the finest materials and precious stones to ensure pieces that last a lifetime'
    },
    {
      icon: Sparkles,
      title: isRTL ? 'التصميم المميز' : 'Distinctive Design',
      description: isRTL 
        ? 'تصاميم حصرية تجمع بين الأناقة الكلاسيكية والعصرية لتناسب جميع الأذواق'
        : 'Exclusive designs that blend classic and contemporary elegance to suit all tastes'
    },
    {
      icon: Shield,
      title: isRTL ? 'الثقة والأمان' : 'Trust & Security',
      description: isRTL 
        ? 'ضمان شامل على جميع منتجاتنا مع خدمة عملاء متميزة وسياسة إرجاع مرنة'
        : 'Comprehensive warranty on all our products with exceptional customer service and flexible return policy'
    },
    {
      icon: Globe,
      title: isRTL ? 'الوصول العالمي' : 'Global Reach',
      description: isRTL 
        ? 'نصل إليك أينما كنت في المملكة ودول الخليج مع شحن سريع وآمن'
        : 'We reach you wherever you are in the Kingdom and Gulf countries with fast and secure shipping'
    }
  ];

  const team = [
    {
      name: isRTL ? 'سارة أحمد' : 'Sarah Ahmed',
      position: isRTL ? 'مؤسسة ومديرة إبداعية' : 'Founder & Creative Director',
      image: '/api/placeholder/300/300',
      description: isRTL 
        ? 'خبرة 15 عام في عالم المجوهرات والتصميم الفاخر'
        : '15 years experience in jewelry and luxury design'
    },
    {
      name: isRTL ? 'أحمد محمد' : 'Ahmed Mohammed',
      position: isRTL ? 'مدير العمليات' : 'Operations Manager',
      image: '/api/placeholder/300/300',
      description: isRTL 
        ? 'متخصص في إدارة سلاسل التوريد والجودة'
        : 'Specialist in supply chain management and quality'
    },
    {
      name: isRTL ? 'فاطمة علي' : 'Fatima Ali',
      position: isRTL ? 'مديرة خدمة العملاء' : 'Customer Service Manager',
      image: '/api/placeholder/300/300',
      description: isRTL 
        ? 'ملتزمة بتقديم أفضل تجربة خدمة عملاء'
        : 'Committed to providing the best customer service experience'
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
                    ? 'في عام 2020، وُلدت أورا لاكشري من حلم بسيط: أن نجعل المجوهرات الفاخرة متاحة لكل امرأة عربية تبحث عن التميز والأناقة. بدأنا كفريق صغير يؤمن بقوة الجمال وتأثيره الإيجابي على حياة المرأة.'
                    : 'In 2020, Auraa Luxury was born from a simple dream: to make luxury jewelry accessible to every Arab woman seeking distinction and elegance. We started as a small team believing in the power of beauty and its positive impact on women\'s lives.'
                  }
                </p>
                <p>
                  {isRTL 
                    ? 'اليوم، نفخر بكوننا وجهة موثوقة للمجوهرات الفاخرة في المملكة العربية السعودية ودول الخليج. نجحنا في بناء مجتمع من العملاء المميزين الذين يثقون بنا لإضافة لمسة من البريق والأناقة إلى حياتهم اليومية.'
                    : 'Today, we are proud to be a trusted destination for luxury jewelry in Saudi Arabia and the Gulf countries. We have successfully built a community of distinguished customers who trust us to add a touch of sparkle and elegance to their daily lives.'
                  }
                </p>
                <p>
                  {isRTL 
                    ? 'رؤيتنا تتجاوز بيع المجوهرات، فنحن نؤمن بأن كل قطعة نقدمها تحمل قصة، وكل عميلة تختارنا تصبح جزءاً من عائلة أورا لاكشري الكبيرة.'
                    : 'Our vision goes beyond selling jewelry; we believe that every piece we offer carries a story, and every customer who chooses us becomes part of the greater Auraa Luxury family.'
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
              {isRTL ? 'فريقنا المتميز' : 'Our Distinguished Team'}
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              {isRTL 
                ? 'نخبة من المتخصصين المتحمسين لتقديم أفضل خدمة وتجربة لعملائنا'
                : 'A select group of specialists passionate about providing the best service and experience to our customers'
              }
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {team.map((member, index) => (
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
              ? 'اكتشفي مجموعتنا الحصرية من المجوهرات الفاخرة واجعلي كل يوم مناسبة خاصة'
              : 'Discover our exclusive collection of luxury jewelry and make every day a special occasion'
            }
          </p>
          <div className="space-y-4 sm:space-y-0 sm:space-x-4 sm:flex sm:justify-center">
            <a 
              href="/products"
              className="inline-flex items-center px-8 py-4 bg-white text-purple-600 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Crown className="h-5 w-5 mr-2" />
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