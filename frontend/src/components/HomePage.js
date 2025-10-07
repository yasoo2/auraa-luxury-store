import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { Truck, Shield, Clock } from 'lucide-react';

import FashionModelsCarousel from './FashionModelsCarousel';
import SEOHead from './SEOHead';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { useLanguage } from '../context/LanguageContext';
import { setSEO } from '../utils/seo';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const HomePage = () => {
  const { t, language } = useLanguage();
  const isRTL = language === 'ar';
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setSEO({
      title: language === 'ar' ? 'Auraa Luxury | متجر الإكسسوارات الفاخرة' : 'Auraa Luxury | Luxury Accessories Store',
      description: language === 'ar' ? 'تسوّق أفضل الإكسسوارات الفاخرة بجودة عالية وشحن سريع.' : 'Shop premium luxury accessories with top quality and fast shipping.',
      lang: language,
      canonical: 'https://www.auraaluxury.com/',
    });
  }, [language]);

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
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white"  dir={isRTL ? 'rtl' : 'ltr'}>
      <SEOHead 
        title={isRTL ? 'أورا لاكشري - إكسسوارات فاخرة' : 'Auraa Luxury - Premium Accessories'}
        description={isRTL ? 'اكتشف مجموعة أورا لاكشري الفاخرة من الإكسسوارات الذهبية واللؤلؤية. قلادات، أقراط، أساور وساعات بأجود الخامات والتصاميم العصرية.' : 'Discover Auraa Luxury\'s premium collection of gold and pearl accessories. Necklaces, earrings, bracelets and watches crafted with finest materials and contemporary designs.'}
        keywords={isRTL ? 'أورا لاكشري، إكسسوارات فاخرة، قلادات ذهبية، أقراط لؤلؤ، أساور، ساعات، مجوهرات' : 'Auraa Luxury, premium accessories, gold necklaces, pearl earrings, bracelets, watches, jewelry'}
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
      <section className="py-12" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-gray-900 mb-6">{t('featured_products')}</h2>
          {loading ? (
            <div className="product-grid">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="luxury-card p-4 animate-pulse">
                  <div className="skeleton h-64 rounded-lg mb-4" />
                  <div className="skeleton h-6 rounded mb-2" />
                  <div className="skeleton h-4 rounded w-3/4 mb-2" />
                  <div className="skeleton h-8 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : (
            <div className="product-grid">
              {products.map((p) => (
                <Card key={p.id} className="product-card overflow-hidden group">
                  <Link to={`/product/${p.id}`}>
                    <picture>
                      <source srcSet={`${p.images?.[0]}?format=avif`} type="image/avif" />
                      <source srcSet={`${p.images?.[0]}?format=webp`} type="image/webp" />
                      <img src={p.images?.[0]} alt={p.name} className="w-full h-64 img-product-card group-hover:scale-110 transition-transform duration-500" style={{ aspectRatio: '4 / 3' }} />
                    </picture>
                  </Link>
                  <div className="p-6">
                    <Link to={`/product/${p.id}`}>
                      <h3 className="font-bold text-lg mb-2 text-gray-900 group-hover:text-amber-600 transition-colors line-clamp-2">{p.name}</h3>
                    </Link>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex flex-col">
                        <span className="price-highlight text-xl font-bold text-amber-600">{p.price} ر.س</span>
                        {p.original_price && (
                          <span className="text-sm text-gray-500 line-through">{p.original_price} ر.س</span>
                        )}
                      </div>
                      <Button asChild className="btn-luxury">
                        <Link to={`/product/${p.id}`}>{t('add_to_cart')}</Link>
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Bottom Features */}
      <section className="py-16 bg-white" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Truck className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-2 text-gray-900">{t('free_shipping')}</h3>
              <p className="text-gray-600">{t('free_shipping_desc')}</p>
            </div>
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-2 text-gray-900">{t('quality_guarantee')}</h3>
              <p className="text-gray-600">{t('quality_guarantee_desc')}</p>
            </div>
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-2 text-gray-900">{t('support_247')}</h3>
              <p className="text-gray-600">{t('support_247_desc')}</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;