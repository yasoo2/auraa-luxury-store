import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { Truck, Shield, Clock } from 'lucide-react';

import FashionModelsCarousel from './FashionModelsCarousel';
import SEOHead from './SEOHead';
import HeartButton from './HeartButton';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { useLanguage } from '../context/LanguageContext';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const HomePage = () => {
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeatured = async () => {
      try {
        const res = await axios.get(`${API}/products?limit=8`);
        setProducts(res.data || []);
      } catch (e) {
        // silent
      } finally {
        setLoading(false);
      }
    };
    fetchFeatured();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-amber-50 to-stone-100 relative overflow-hidden" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Luxury Background Pattern */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute inset-0 animate-gold-shimmer" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23fbbf24' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }}></div>
      </div>
      <SEOHead 
        title={isRTL ? 'لورا لاكشري - إكسسوارات فاخرة' : 'لورا لاكشري - Premium Accessories'}
        description={isRTL ? 'اكتشف مجموعة لورا لاكشري الفاخرة من الإكسسوارات الذهبية واللؤلؤية. قلادات، أقراط، أساور وساعات بأجود الخامات والتصاميم العصرية.' : 'Discover لورا لاكشري\'s premium collection of gold and pearl accessories. Necklaces, earrings, bracelets and watches crafted with finest materials and contemporary designs.'}
        keywords={isRTL ? 'لورا لاكشري، إكسسوارات فاخرة، قلادات ذهبية، أقراط لؤلؤ، أساور، ساعات، مجوهرات' : 'لورا لاكشري, premium accessories, gold necklaces, pearl earrings, bracelets, watches, jewelry'}
        type="website"
        breadcrumbs={[
          { name: isRTL ? 'الرئيسية' : 'Home', url: window.location.origin }
        ]}
      />
      
      {/* Main Hero Section with Carousel */}
      <section className="relative bg-black"  dir={isRTL ? 'rtl' : 'ltr'}>
        <FashionModelsCarousel />
      </section>

      {/* Featured Products */}
      <section className="py-20 relative" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          {/* Section Title */}
          <div className="text-center mb-16">
            <h2 className="font-display text-4xl md:text-6xl font-bold bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-800 bg-clip-text text-transparent animate-text-sparkle mb-4">
              {isRTL ? 'منتجات مميزة' : 'Featured Products'}
            </h2>
            <div className="w-24 h-1 bg-gradient-to-r from-amber-400 to-yellow-500 mx-auto animate-pulse-gold"></div>
            <p className="text-gray-600 mt-6 text-lg animate-fade-in-up">
              {isRTL ? 'اكتشف مجموعتنا الحصرية من الإكسسوارات الفاخرة' : 'Discover our exclusive luxury accessories collection'}
            </p>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="bg-white/60 backdrop-blur-sm p-6 rounded-2xl animate-pulse shadow-xl">
                  <div className="bg-gray-300 h-64 rounded-xl mb-4" />
                  <div className="bg-gray-300 h-6 rounded mb-2" />
                  <div className="bg-gray-300 h-4 rounded w-3/4 mb-2" />
                  <div className="bg-gray-300 h-8 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {products.map((p, index) => (
                <div key={p.id} className="group relative animate-luxury-zoom-in" style={{animationDelay: `${index * 0.1}s`}}>
                  <div className="bg-white/80 backdrop-blur-sm border border-amber-200/50 rounded-2xl overflow-hidden shadow-2xl hover:shadow-amber-300/50 transition-all duration-500 hover:scale-105 animate-float">
                    <div className="relative overflow-hidden">
                      <Link to={`/product/${p.id}`}>
                        <img 
                          src={p.images?.[0]} 
                          alt={p.name} 
                          className="w-full h-64 object-cover transition-all duration-700 group-hover:scale-110" 
                        />
                        {/* Luxury overlay effect */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        <div className="absolute inset-0 animate-gold-shimmer opacity-0 group-hover:opacity-30 transition-opacity duration-300"></div>
                      </Link>
                      
                      {/* Heart Button */}
                      <div className="absolute top-4 right-4 z-10">
                        <HeartButton 
                          product={p}
                          variant="floating"
                          size="md"
                          showAnimation={true}
                        />
                      </div>

                      {/* Luxury Badge */}
                      <div className="absolute top-4 left-4 bg-gradient-to-r from-amber-500 to-yellow-500 text-white px-3 py-1 rounded-full text-xs font-bold animate-pulse-gold">
                        {isRTL ? 'مميز' : 'Featured'}
                      </div>
                    </div>

                    <div className="p-6">
                      <Link to={`/product/${p.id}`}>
                        <h3 className="font-bold text-lg mb-3 text-gray-900 group-hover:text-amber-600 transition-colors duration-300 line-clamp-2 font-display">
                          {p.name}
                        </h3>
                      </Link>
                      
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex flex-col">
                          <span className="text-2xl font-bold bg-gradient-to-r from-amber-600 to-yellow-600 bg-clip-text text-transparent">
                            {p.price} ر.س
                          </span>
                          {p.original_price && (
                            <span className="text-sm text-gray-500 line-through">{p.original_price} ر.س</span>
                          )}
                        </div>
                      </div>

                      <button className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-white font-bold py-3 px-6 rounded-xl transition-all duration-300 hover:scale-105 animate-pulse-gold shadow-lg">
                        <Link to={`/product/${p.id}`} className="block w-full h-full text-white no-underline">
                          {isRTL ? 'اكتشف المنتج' : 'Discover Product'}
                        </Link>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Luxury Features Section */}
      <section className="py-20 bg-gradient-to-r from-slate-900 via-amber-900 to-slate-900 relative overflow-hidden" dir={isRTL ? 'rtl' : 'ltr'}>
        {/* Background Pattern */}
        <div className="absolute inset-0 animate-gold-shimmer" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23fbbf24' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }}></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          {/* Section Title */}
          <div className="text-center mb-16">
            <h2 className="font-display text-4xl md:text-5xl font-bold text-white animate-text-sparkle mb-4">
              {isRTL ? 'لماذا لورا لاكشري؟' : 'Why Lora Luxury?'}
            </h2>
            <div className="w-24 h-1 bg-gradient-to-r from-amber-400 to-yellow-500 mx-auto animate-pulse-gold"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-8 animate-fade-in-up group" style={{animationDelay: '0.1s'}}>
              <div className="w-20 h-20 bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600 rounded-full flex items-center justify-center mx-auto mb-6 animate-rotate-glow group-hover:scale-110 transition-transform duration-300 shadow-2xl">
                <Truck className="h-10 w-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-white font-display">
                {isRTL ? 'شحن مجاني' : 'Free Shipping'}
              </h3>
              <p className="text-white/80 leading-relaxed">
                {isRTL ? 'شحن سريع ومجاني لجميع الطلبات داخل المملكة العربية السعودية' : 'Fast and free shipping for all orders within Saudi Arabia'}
              </p>
              <div className="mt-4 w-12 h-0.5 bg-gradient-to-r from-amber-400 to-yellow-500 mx-auto animate-pulse-gold"></div>
            </div>

            <div className="text-center p-8 animate-fade-in-up group" style={{animationDelay: '0.2s'}}>
              <div className="w-20 h-20 bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600 rounded-full flex items-center justify-center mx-auto mb-6 animate-rotate-glow group-hover:scale-110 transition-transform duration-300 shadow-2xl">
                <Shield className="h-10 w-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-white font-display">
                {isRTL ? 'ضمان الجودة' : 'Quality Guarantee'}
              </h3>
              <p className="text-white/80 leading-relaxed">
                {isRTL ? 'منتجات عالية الجودة مع ضمان الاستبدال والإرجاع خلال 30 يوم' : 'High quality products with 30-day return and exchange guarantee'}
              </p>
              <div className="mt-4 w-12 h-0.5 bg-gradient-to-r from-amber-400 to-yellow-500 mx-auto animate-pulse-gold"></div>
            </div>

            <div className="text-center p-8 animate-fade-in-up group" style={{animationDelay: '0.3s'}}>
              <div className="w-20 h-20 bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600 rounded-full flex items-center justify-center mx-auto mb-6 animate-rotate-glow group-hover:scale-110 transition-transform duration-300 shadow-2xl">
                <Clock className="h-10 w-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-white font-display">
                {isRTL ? 'دعم 24/7' : '24/7 Support'}
              </h3>
              <p className="text-white/80 leading-relaxed">
                {isRTL ? 'فريق خدمة عملاء متاح على مدار الساعة لمساعدتك في أي وقت' : 'Customer service team available 24/7 to help you anytime'}
              </p>
              <div className="mt-4 w-12 h-0.5 bg-gradient-to-r from-amber-400 to-yellow-500 mx-auto animate-pulse-gold"></div>
            </div>
          </div>

          {/* Call to Action */}
          <div className="text-center mt-16 animate-luxury-zoom-in">
            <Link 
              to="/products"
              className="inline-block bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-white font-bold py-4 px-8 rounded-full transition-all duration-300 hover:scale-105 animate-pulse-gold shadow-2xl font-display text-lg"
            >
              {isRTL ? 'اكتشف مجموعتنا الكاملة' : 'Discover Our Complete Collection'}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;