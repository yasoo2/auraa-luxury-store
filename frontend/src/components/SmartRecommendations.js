import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Link } from 'react-router-dom';
import axios from 'axios';
import {
  Sparkles,
  TrendingUp,
  Heart,
  ShoppingCart,
  Star,
  Zap,
  Target,
  Users,
  Eye,
  Clock,
  Gift,
  Crown,
  Gem,
  Award
} from 'lucide-react';
import { Button } from './ui/button';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const SmartRecommendations = ({ 
  userId = null, 
  currentProductId = null, 
  category = null, 
  type = 'personalized',
  limit = 6,
  showTitle = true 
}) => {
  const { t, language, currency } = useLanguage();
  const isRTL = language === 'ar';
  
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recommendationType, setRecommendationType] = useState(type);

  const recommendationTypes = {
    personalized: {
      title: isRTL ? 'مقترح خصيصاً لك' : 'Recommended for You',
      icon: Target,
      color: 'from-purple-500 to-pink-500',
      description: isRTL ? 'بناءً على تفضيلاتك وتاريخ تسوقك' : 'Based on your preferences and shopping history'
    },
    similar: {
      title: isRTL ? 'منتجات مماثلة' : 'Similar Products',
      icon: Gem,
      color: 'from-blue-500 to-indigo-500',
      description: isRTL ? 'منتجات تشبه ما تتصفحه حالياً' : 'Products similar to what you\'re viewing'
    },
    trending: {
      title: isRTL ? 'الأكثر رواجاً' : 'Trending Now',
      icon: TrendingUp,
      color: 'from-green-500 to-emerald-500',
      description: isRTL ? 'المنتجات الأكثر شيوعاً هذا الأسبوع' : 'Most popular products this week'
    },
    bestsellers: {
      title: isRTL ? 'الأكثر مبيعاً' : 'Best Sellers',
      icon: Award,
      color: 'from-yellow-500 to-orange-500',
      description: isRTL ? 'المنتجات الأكثر مبيعاً في فئتها' : 'Top selling products in their category'
    },
    recentlyViewed: {
      title: isRTL ? 'شاهدت مؤخراً' : 'Recently Viewed',
      icon: Eye,
      color: 'from-gray-500 to-slate-500',
      description: isRTL ? 'المنتجات التي تصفحتها مؤخراً' : 'Products you viewed recently'
    },
    complements: {
      title: isRTL ? 'منتجات مكملة' : 'Perfect Matches',
      icon: Crown,
      color: 'from-amber-500 to-yellow-500',
      description: isRTL ? 'منتجات تتناسق مع هذا المنتج' : 'Products that complement this item'
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, [userId, currentProductId, category, recommendationType]);

  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      
      // Build request parameters
      const params = new URLSearchParams();
      params.set('type', recommendationType);
      params.set('limit', limit);
      
      if (userId) params.set('userId', userId);
      if (currentProductId) params.set('productId', currentProductId);
      if (category) params.set('category', category);

      const response = await axios.get(`${API}/recommendations?${params.toString()}`);
      setRecommendations(response.data || generateMockRecommendations());
    } catch (error) {
      console.error('Recommendations error:', error);
      setRecommendations(generateMockRecommendations());
    } finally {
      setLoading(false);
    }
  };

  const generateMockRecommendations = () => {
    const mockProducts = [
      {
        id: 'rec-1',
        name: isRTL ? 'قلادة ذهبية مع قلب' : 'Gold Heart Necklace',
        name_en: 'Gold Heart Necklace',
        price: 299.99,
        original_price: 399.99,
        currency: 'SAR',
        image: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400&h=400&fit=crop',
        rating: 4.8,
        reviews_count: 142,
        category: 'necklaces',
        is_new: false,
        is_bestseller: true,
        discount_percentage: 25,
        recommendation_score: 0.92,
        recommendation_reason: isRTL ? 'يتناسب مع ذوقك الكلاسيكي' : 'Matches your classic taste',
        ai_tags: [isRTL ? 'أنيق' : 'Elegant', isRTL ? 'كلاسيكي' : 'Classic']
      },
      {
        id: 'rec-2',
        name: isRTL ? 'أقراط لؤلؤ فاخرة' : 'Luxury Pearl Earrings',
        name_en: 'Luxury Pearl Earrings',
        price: 199.99,
        currency: 'SAR',
        image: 'https://images.unsplash.com/photo-1506755855567-92ff770e8d00?w=400&h=400&fit=crop',
        rating: 4.9,
        reviews_count: 89,
        category: 'earrings',
        is_new: true,
        is_bestseller: false,
        recommendation_score: 0.88,
        recommendation_reason: isRTL ? 'العملاء الذين اشتروا منتجات مماثلة أحبوا هذا أيضاً' : 'Customers who bought similar items also loved this',
        ai_tags: [isRTL ? 'فاخر' : 'Luxury', isRTL ? 'لؤلؤ طبيعي' : 'Natural Pearl']
      },
      {
        id: 'rec-3',
        name: isRTL ? 'سوار ذهبي مطعم بالألماس' : 'Diamond-Studded Gold Bracelet',
        name_en: 'Diamond-Studded Gold Bracelet',
        price: 699.99,
        currency: 'SAR',
        image: 'https://images.unsplash.com/photo-1611652022419-a9419f74343d?w=400&h=400&fit=crop',
        rating: 4.7,
        reviews_count: 76,
        category: 'bracelets',
        is_new: false,
        is_bestseller: true,
        recommendation_score: 0.85,
        recommendation_reason: isRTL ? 'رائج حالياً في منطقتك' : 'Trending in your area',
        ai_tags: [isRTL ? 'ماس' : 'Diamond', isRTL ? 'راقي' : 'Premium']
      },
      {
        id: 'rec-4',
        name: isRTL ? 'خاتم خطوبة كلاسيكي' : 'Classic Engagement Ring',
        name_en: 'Classic Engagement Ring',
        price: 1299.99,
        currency: 'SAR',
        image: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=400&h=400&fit=crop',
        rating: 4.9,
        reviews_count: 234,
        category: 'rings',
        is_new: false,
        is_bestseller: true,
        recommendation_score: 0.90,
        recommendation_reason: isRTL ? 'الأكثر شيوعاً هذا الشهر' : 'Most popular this month',
        ai_tags: [isRTL ? 'خطوبة' : 'Engagement', isRTL ? 'كلاسيكي' : 'Classic']
      },
      {
        id: 'rec-5',
        name: isRTL ? 'ساعة نسائية أنيقة' : 'Elegant Women\'s Watch',
        name_en: 'Elegant Women\'s Watch',
        price: 899.99,
        original_price: 1199.99,
        currency: 'SAR',
        image: 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=400&h=400&fit=crop',
        rating: 4.6,
        reviews_count: 156,
        category: 'watches',
        is_new: true,
        is_bestseller: false,
        discount_percentage: 25,
        recommendation_score: 0.83,
        recommendation_reason: isRTL ? 'يكمل إطلالتك المهنية' : 'Complements your professional look',
        ai_tags: [isRTL ? 'أنيق' : 'Elegant', isRTL ? 'عملي' : 'Practical']
      },
      {
        id: 'rec-6',
        name: isRTL ? 'طقم مجوهرات متناسق' : 'Matching Jewelry Set',
        name_en: 'Matching Jewelry Set',
        price: 599.99,
        currency: 'SAR',
        image: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=400&h=400&fit=crop',
        rating: 4.8,
        reviews_count: 98,
        category: 'sets',
        is_new: false,
        is_bestseller: true,
        recommendation_score: 0.87,
        recommendation_reason: isRTL ? 'توفير ممتاز عند شراؤه كطقم' : 'Great value when bought as a set',
        ai_tags: [isRTL ? 'طقم' : 'Set', isRTL ? 'متناسق' : 'Coordinated']
      }
    ];

    return mockProducts.slice(0, limit);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat(isRTL ? 'ar-SA' : 'en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const handleProductClick = (productId) => {
    // Track recommendation click
    axios.post(`${API}/recommendations/track`, {
      productId,
      type: recommendationType,
      userId
    }).catch(console.error);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  if (recommendations.length === 0) {
    return null;
  }

  const currentType = recommendationTypes[recommendationType];
  const TypeIcon = currentType.icon;

  return (
    <section className="py-8" dir={isRTL ? 'rtl' : 'ltr'}>
      {showTitle && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <div className={`p-3 rounded-full bg-gradient-to-r ${currentType.color} mr-4`}>
                <TypeIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{currentType.title}</h2>
                <p className="text-sm text-gray-600 mt-1">{currentType.description}</p>
              </div>
            </div>
            
            {/* Recommendation Type Switcher */}
            <div className="flex gap-2">
              {Object.entries(recommendationTypes).slice(0, 4).map(([key, typeInfo]) => {
                const Icon = typeInfo.icon;
                return (
                  <button
                    key={key}
                    onClick={() => setRecommendationType(key)}
                    className={`p-2 rounded-lg transition-colors ${
                      recommendationType === key
                        ? 'bg-amber-100 text-amber-600'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                    title={typeInfo.title}
                  >
                    <Icon className="h-5 w-5" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Products Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        {recommendations.map((product, index) => (
          <Link
            key={product.id}
            to={`/product/${product.id}`}
            onClick={() => handleProductClick(product.id)}
            className="group bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-200"
          >
            {/* Product Image */}
            <div className="relative aspect-square overflow-hidden">
              <img
                src={product.image}
                alt={product.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
              />
              
              {/* Badges */}
              <div className="absolute top-2 left-2 flex flex-col gap-1">
                {product.is_new && (
                  <span className="px-2 py-1 bg-green-500 text-white text-xs font-semibold rounded-full">
                    {isRTL ? 'جديد' : 'New'}
                  </span>
                )}
                {product.is_bestseller && (
                  <span className="px-2 py-1 bg-amber-500 text-white text-xs font-semibold rounded-full">
                    {isRTL ? 'الأكثر مبيعاً' : 'Best Seller'}
                  </span>
                )}
                {product.discount_percentage && (
                  <span className="px-2 py-1 bg-red-500 text-white text-xs font-semibold rounded-full">
                    -{product.discount_percentage}%
                  </span>
                )}
              </div>

              {/* AI Recommendation Score */}
              <div className="absolute top-2 right-2">
                <div className="flex items-center bg-purple-100 text-purple-700 px-2 py-1 rounded-full text-xs">
                  <Sparkles className="h-3 w-3 mr-1" />
                  {Math.round(product.recommendation_score * 100)}%
                </div>
              </div>

              {/* Quick Actions */}
              <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" className="p-2">
                    <Heart className="h-4 w-4" />
                  </Button>
                  <Button size="sm" className="p-2">
                    <ShoppingCart className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Product Info */}
            <div className="p-4">
              <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 text-sm">
                {product.name}
              </h3>
              
              {/* AI Recommendation Reason */}
              <p className="text-xs text-purple-600 mb-2 flex items-center">
                <Zap className="h-3 w-3 mr-1 flex-shrink-0" />
                {product.recommendation_reason}
              </p>

              {/* Rating */}
              <div className="flex items-center mb-2">
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`h-3 w-3 ${
                        i < Math.floor(product.rating)
                          ? 'text-yellow-400 fill-current'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-xs text-gray-600 ml-1">
                  ({product.reviews_count})
                </span>
              </div>

              {/* Price */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-900">
                    {formatCurrency(product.price)}
                  </span>
                  {product.original_price && (
                    <span className="text-sm text-gray-500 line-through">
                      {formatCurrency(product.original_price)}
                    </span>
                  )}
                </div>
              </div>

              {/* AI Tags */}
              <div className="flex flex-wrap gap-1 mt-2">
                {product.ai_tags?.slice(0, 2).map((tag, tagIndex) => (
                  <span
                    key={tagIndex}
                    className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* View More Button */}
      {recommendations.length >= limit && (
        <div className="text-center mt-8">
          <Button
            onClick={() => navigate('/products')}
            variant="outline"
            className="px-8 py-3"
          >
            {isRTL ? 'عرض المزيد من التوصيات' : 'View More Recommendations'}
            <Sparkles className="h-4 w-4 ml-2" />
          </Button>
        </div>
      )}
    </section>
  );
};

export default SmartRecommendations;