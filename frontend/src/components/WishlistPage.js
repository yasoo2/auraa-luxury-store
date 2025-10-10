import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useWishlist } from '../context/WishlistContext';
import { useAuth } from '../context/AuthContext';
import { 
  Heart, 
  ShoppingCart, 
  Trash2, 
  Share2, 
  Star,
  ArrowLeft,
  HeartOff,
  Eye
} from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import HeartButton from './HeartButton';

const WishlistPage = () => {
  const { t, language } = useLanguage();
  const isRTL = language === 'ar';
  const { user } = useAuth();
  const { 
    wishlistItems, 
    removeFromWishlist, 
    clearWishlist, 
    getWishlistCount,
    syncWithServer 
  } = useWishlist();

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat(isRTL ? 'ar-SA' : 'en-US', {
      style: 'currency',
      currency: 'SAR'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString(
      isRTL ? 'ar-SA' : 'en-US',
      { year: 'numeric', month: 'long', day: 'numeric' }
    );
  };

  const addAllToCart = () => {
    // This would integrate with cart functionality
    wishlistItems.forEach(item => {
      // Add each item to cart
      console.log('Adding to cart:', item);
    });
  };

  const shareWishlist = () => {
    if (navigator.share) {
      navigator.share({
        title: isRTL ? 'قائمة المفضلة - لورا لاكشري' : 'My Wishlist - لورا لاكشري',
        text: isRTL ? 
          `تحقق من قائمة المفضلة الخاصة بي في أورا لاكشري - ${getWishlistCount()} منتج` :
          `Check out my wishlist at Auraa Luxury - ${getWishlistCount()} items`,
        url: window.location.href
      });
    } else {
      // Fallback for browsers that don't support Web Share API
      navigator.clipboard.writeText(window.location.href);
      alert(isRTL ? 'تم نسخ الرابط' : 'Link copied to clipboard');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <Link 
              to="/" 
              className="p-2 hover:bg-white rounded-full transition-colors mr-4"
            >
              <ArrowLeft className={`h-5 w-5 text-gray-600 ${isRTL ? 'rotate-180' : ''}`} />
            </Link>
            <div className="flex items-center">
              <Heart className="h-8 w-8 text-red-500 mr-3 fill-current" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  {isRTL ? 'المفضلة' : 'My Wishlist'}
                </h1>
                <p className="text-gray-600 mt-1">
                  {getWishlistCount() > 0 
                    ? isRTL 
                      ? `${getWishlistCount()} منتج في المفضلة`
                      : `${getWishlistCount()} items in your wishlist`
                    : isRTL 
                      ? 'لا توجد منتجات في المفضلة'
                      : 'No items in your wishlist'
                  }
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          {wishlistItems.length > 0 && (
            <div className="flex flex-wrap gap-4">
              <Button 
                onClick={addAllToCart}
                className="bg-amber-600 hover:bg-amber-700"
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                {isRTL ? 'أضف الكل للسلة' : 'Add All to Cart'}
              </Button>
              
              <Button 
                onClick={shareWishlist}
                variant="outline"
              >
                <Share2 className="h-4 w-4 mr-2" />
                {isRTL ? 'مشاركة المفضلة' : 'Share Wishlist'}
              </Button>
              
              <Button 
                onClick={clearWishlist}
                variant="outline"
                className="text-red-600 border-red-300 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {isRTL ? 'مسح الكل' : 'Clear All'}
              </Button>
            </div>
          )}
        </div>

        {/* Wishlist Content */}
        {wishlistItems.length === 0 ? (
          <div className="text-center py-16">
            <HeartOff className="h-24 w-24 text-gray-300 mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {isRTL ? 'قائمة المفضلة فارغة' : 'Your Wishlist is Empty'}
            </h2>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              {isRTL 
                ? 'ابدأ بإضافة المنتجات التي تحبها إلى المفضلة لتجدها هنا لاحقاً'
                : 'Start adding products you love to your wishlist to find them here later'
              }
            </p>
            <Button asChild className="bg-amber-600 hover:bg-amber-700">
              <Link to="/products">
                {isRTL ? 'تسوق الآن' : 'Start Shopping'}
              </Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {wishlistItems.map((item) => (
              <Card key={item.id} className="group overflow-hidden hover:shadow-xl transition-all duration-300">
                <div className="relative">
                  <Link to={`/product/${item.id}`}>
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-64 object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </Link>
                  
                  {/* Heart Button - Always filled red since it's in wishlist */}
                  <div className="absolute top-4 right-4">
                    <HeartButton 
                      product={item}
                      variant="floating"
                      size="md"
                      showAnimation={true}
                    />
                  </div>

                  {/* Added Date */}
                  <div className="absolute bottom-4 left-4">
                    <span className="bg-black/60 text-white text-xs px-2 py-1 rounded-full">
                      {formatDate(item.added_at)}
                    </span>
                  </div>

                  {/* Quick Actions Overlay */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <div className="flex gap-2">
                      <Button size="sm" asChild className="bg-white text-gray-900 hover:bg-gray-100">
                        <Link to={`/product/${item.id}`}>
                          <Eye className="h-4 w-4 mr-1" />
                          {isRTL ? 'عرض' : 'View'}
                        </Link>
                      </Button>
                      <Button size="sm" className="bg-amber-600 hover:bg-amber-700">
                        <ShoppingCart className="h-4 w-4 mr-1" />
                        {isRTL ? 'أضف' : 'Add'}
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  <Link to={`/product/${item.id}`}>
                    <h3 className="font-bold text-lg mb-2 text-gray-900 group-hover:text-amber-600 transition-colors line-clamp-2">
                      {item.name}
                    </h3>
                  </Link>
                  
                  {/* Rating */}
                  {item.rating && (
                    <div className="flex items-center mb-3">
                      <div className="flex items-center">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${
                              i < Math.floor(item.rating)
                                ? 'text-yellow-400 fill-current'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-sm text-gray-600 ml-2">({item.rating})</span>
                    </div>
                  )}

                  {/* Price */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex flex-col">
                      <span className="text-xl font-bold text-amber-600">
                        {formatCurrency(item.price)}
                      </span>
                      {item.original_price && item.original_price > item.price && (
                        <span className="text-sm text-gray-500 line-through">
                          {formatCurrency(item.original_price)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button 
                      className="flex-1 bg-amber-600 hover:bg-amber-700"
                      onClick={() => console.log('Add to cart:', item.id)}
                    >
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      {isRTL ? 'أضف للسلة' : 'Add to Cart'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeFromWishlist(item.id)}
                      className="text-red-600 border-red-300 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Bottom Actions */}
        {wishlistItems.length > 0 && (
          <div className="mt-12 text-center">
            <div className="bg-white rounded-lg p-8 shadow-sm border border-gray-200">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                {isRTL ? 'هل تحب هذه المجموعة؟' : 'Love This Collection?'}
              </h3>
              <p className="text-gray-600 mb-6">
                {isRTL 
                  ? 'شاركها مع أصدقائك أو احفظها كقائمة تسوق لاحقاً'
                  : 'Share it with friends or save it as a shopping list for later'
                }
              </p>
              <div className="flex justify-center gap-4">
                <Button 
                  onClick={shareWishlist}
                  className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  {isRTL ? 'مشاركة المفضلة' : 'Share Wishlist'}
                </Button>
                <Button 
                  onClick={addAllToCart}
                  className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  {isRTL ? 'أضف الكل للسلة' : 'Add All to Cart'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Sync Status */}
        {user && (
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500">
              {isRTL 
                ? 'تتم مزامنة المفضلة تلقائياً مع حسابك'
                : 'Your wishlist is automatically synced with your account'
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default WishlistPage;