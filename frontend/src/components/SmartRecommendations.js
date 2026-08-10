import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Sparkles,
  TrendingUp,
  Heart,
  ShoppingCart,
  Star,
  Target,
  Eye,
  Crown,
  Gem,
  Award
} from 'lucide-react';
import { Button } from './ui/button';
import { API_BASE_URL } from '../api';

const BACKEND_URL = API_BASE_URL;
const API = `${BACKEND_URL}/api`;

const SmartRecommendations = ({ 
  userId = null, 
  currentProductId = null, 
  category = null, 
  type = 'personalized',
  limit = 6,
  showTitle = true 
}) => {
  const { language, currency } = useLanguage();
  const { addToCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const isRTL = language === 'ar';
  const navigate = useNavigate();
  
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
      setRecommendations(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      // The row hides itself when there is nothing to show. It used to fill
      // with products invented in this file — shown to a paying customer as
      // though the shop stocked them.
      console.error('Recommendations error:', error);
      setRecommendations([]);
    } finally {
      setLoading(false);
    }
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
              {/* Product documents carry `images` (plural); the singular
                  `image` never existed on the API and every card rendered
                  a broken frame. */}
              <img
                src={product.images?.[0] || product.image}
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

              {/* The "AI score" badge that used to sit here multiplied a
                  field the API never sends and stamped "NaN%" on every
                  card. No real score exists, so no badge pretends one does. */}

              {/* Quick Actions */}
              <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="p-2"
                    onClick={() => toggleWishlist(product)}
                    aria-pressed={isInWishlist(product.id)}
                    aria-label={isRTL ? 'المفضّلة' : 'Wishlist'}
                  >
                    <Heart className={`h-4 w-4 ${isInWishlist(product.id) ? 'fill-current text-red-600' : ''}`} />
                  </Button>
                  <Button
                    size="sm"
                    className="p-2"
                    onClick={() => addToCart(product.id, 1)}
                    aria-label={isRTL ? 'أضف إلى السلة' : 'Add to cart'}
                    data-testid="recommendation-add-to-cart"
                  >
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
            <Sparkles className="h-4 w-4 ms-2" />
          </Button>
        </div>
      )}
    </section>
  );
};

export default SmartRecommendations;