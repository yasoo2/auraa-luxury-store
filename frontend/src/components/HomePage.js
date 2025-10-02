import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Star, TrendingUp, Shield, Truck, Clock } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { useLanguage } from '../context/LanguageContext';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const HomePage = () => {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch featured products
        const productsResponse = await axios.get(`${API}/products?limit=6`);
        setFeaturedProducts(productsResponse.data);
        
        // Fetch categories
        const categoriesResponse = await axios.get(`${API}/categories`);
        setCategories(categoriesResponse.data);
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="hero-bg min-h-screen flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-black/40 to-transparent"></div>
        <div className="relative z-10 text-center text-white px-4">
          <h1 className="font-display text-5xl md:text-7xl font-bold mb-6 leading-tight" data-testid="hero-title">
            مرحباً بك في
            <span className="block gradient-text bg-clip-text text-transparent bg-gradient-to-r from-yellow-300 via-amber-300 to-orange-300">
              Auraa Luxury
            </span>
          </h1>
          <p className="text-xl md:text-2xl mb-8 max-w-2xl mx-auto leading-relaxed opacity-90">
            اكتشف مجموعتنا الفاخرة من الاكسسوارات والمجوهرات الراقية
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link to="/products">
              <Button 
                size="lg" 
                className="btn-luxury text-lg px-8 py-4 transform hover:scale-105 transition-all duration-300"
                data-testid="shop-now-button"
              >
                تسوق الآن
                <ArrowLeft className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link to="/products?category=sets">
              <Button 
                variant="outline" 
                size="lg" 
                className="text-lg px-8 py-4 bg-white/20 backdrop-blur border-white/30 text-white hover:bg-white/30 transition-all duration-300"
              >
                الأطقم المميزة
              </Button>
            </Link>
          </div>
        </div>
        
        {/* Hero Background Image */}
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2NDJ8MHwxfHNlYXJjaHwxfHxsdXh1cnklMjBqZXdlbHJ5fGVufDB8fHx8MTc1OTQxOTg4M3ww&ixlib=rb-4.1.0&q=85"
            alt="Luxury Jewelry Background"
            className="w-full h-full object-cover"
          />
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Truck className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-2 text-gray-900">شحن مجاني</h3>
              <p className="text-gray-600">شحن مجاني لجميع الطلبات فوق 200 ريال</p>
            </div>
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-2 text-gray-900">ضمان الجودة</h3>
              <p className="text-gray-600">ضمان شامل على جميع منتجاتنا لمدة سنة كاملة</p>
            </div>
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-2 text-gray-900">دعم 24/7</h3>
              <p className="text-gray-600">فريق خدمة العملاء متاح على مدار الساعة</p>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-16 bg-gradient-to-br from-amber-50 to-orange-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="font-display text-4xl md:text-5xl font-bold text-gray-900 mb-4" data-testid="categories-title">
              تسوق حسب الفئة
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              اكتشف مجموعتنا المتنوعة من الاكسسوارات الفاخرة
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {categories.map((category) => (
              <Link 
                key={category.id} 
                to={`/products?category=${category.id}`}
                className="group"
                data-testid={`category-${category.id}`}
              >
                <Card className="luxury-card p-6 text-center h-full hover:shadow-xl transition-all duration-300">
                  <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-300">
                    {category.icon}
                  </div>
                  <h3 className="font-bold text-lg text-gray-900 mb-1">
                    {category.name}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {category.name_en}
                  </p>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-12">
            <div>
              <h2 className="font-display text-4xl md:text-5xl font-bold text-gray-900 mb-4" data-testid="featured-products-title">
                منتجات مميزة
              </h2>
              <p className="text-xl text-gray-600">
                اختيارات خاصة من أفضل منتجاتنا
              </p>
            </div>
            <Link to="/products">
              <Button variant="outline" className="hidden md:flex">
                عرض الكل
                <ArrowLeft className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="luxury-card p-4 animate-pulse">
                  <div className="skeleton h-64 rounded-lg mb-4"></div>
                  <div className="skeleton h-6 rounded mb-2"></div>
                  <div className="skeleton h-4 rounded w-3/4"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredProducts.map((product) => (
                <Link key={product.id} to={`/product/${product.id}`} className="group">
                  <Card className="product-card overflow-hidden">
                    <div className="relative overflow-hidden">
                      <img 
                        src={product.images[0]} 
                        alt={product.name}
                        className="w-full h-64 object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                      {product.discount_percentage && (
                        <div className="absolute top-4 right-4 bg-red-500 text-white px-2 py-1 rounded-full text-sm font-bold">
                          -{product.discount_percentage}%
                        </div>
                      )}
                    </div>
                    <div className="p-6">
                      <h3 className="font-bold text-lg mb-2 text-gray-900 group-hover:text-amber-600 transition-colors">
                        {product.name}
                      </h3>
                      <div className="flex items-center mb-2">
                        <div className="flex items-center">
                          {[...Array(5)].map((_, i) => (
                            <Star 
                              key={i} 
                              className={`h-4 w-4 ${
                                i < Math.floor(product.rating) 
                                  ? 'text-yellow-400 fill-current' 
                                  : 'text-gray-300'
                              }`} 
                            />
                          ))}
                        </div>
                        <span className="text-sm text-gray-600 mr-2">
                          ({product.reviews_count})
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="price-highlight text-2xl font-bold text-amber-600">
                            {product.price} ر.س
                          </span>
                          {product.original_price && (
                            <span className="text-lg text-gray-500 line-through">
                              {product.original_price} ر.س
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}

          <div className="text-center mt-8 md:hidden">
            <Link to="/products">
              <Button className="btn-luxury">
                عرض جميع المنتجات
                <ArrowLeft className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Newsletter Section */}
      <section className="py-16 bg-gradient-to-r from-amber-600 to-orange-600 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
            اشترك في نشرتنا الإخبارية
          </h2>
          <p className="text-xl mb-8 opacity-90">
            احصل على أحدث العروض والمنتجات الجديدة
          </p>
          <form className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
            <input 
              type="email" 
              placeholder="أدخل بريدك الإلكتروني"
              className="flex-1 px-4 py-3 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white"
              dir="rtl"
            />
            <Button className="bg-white text-amber-600 hover:bg-gray-100 px-6 py-3 rounded-lg font-bold transition-colors">
              اشتراك
            </Button>
          </form>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-amber-400 mb-2">5000+</div>
              <div className="text-lg text-gray-300">عميل سعيد</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-amber-400 mb-2">1000+</div>
              <div className="text-lg text-gray-300">منتج فاخر</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-amber-400 mb-2">50+</div>
              <div className="text-lg text-gray-300">مدينة نصل إليها</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-amber-400 mb-2">99%</div>
              <div className="text-lg text-gray-300">رضا العملاء</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;