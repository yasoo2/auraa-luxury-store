import React, { useState, useEffect } from 'react';
import { ExternalLink, Star, ShoppingCart, Truck, Shield } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { useLanguage } from '../context/LanguageContext';

const ExternalStoresSection = () => {
  const { t, formatPrice, isRTL } = useLanguage();
  const [externalProducts, setExternalProducts] = useState([]);

  // Simulated external products (in real app, these would come from APIs)
  const mockExternalProducts = [
    {
      id: 'ali_001',
      name: 'Gold Plated Pearl Earrings Set',
      nameAr: 'طقم أقراط لؤلؤية مطلية بالذهب',
      price: 25.99,
      originalPrice: 45.99,
      rating: 4.7,
      reviews: 1523,
      source: 'aliexpress',
      image: 'https://images.unsplash.com/photo-1635767798638-3e25273a8236?w=400',
      freeShipping: true,
      deliveryTime: '7-15 days',
      url: 'https://aliexpress.com/item/example'
    },
    {
      id: 'amazon_001', 
      name: 'Sterling Silver Chain Necklace',
      nameAr: 'قلادة فضية استرلينية أنيقة',
      price: 89.99,
      originalPrice: 129.99,
      rating: 4.8,
      reviews: 892,
      source: 'amazon',
      image: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400',
      freeShipping: true,
      deliveryTime: '2-5 days',
      url: 'https://amazon.com/dp/example'
    },
    {
      id: 'ali_002',
      name: 'Luxury Gold Bracelet Collection',
      nameAr: 'مجموعة أساور ذهبية فاخرة',
      price: 35.50,
      originalPrice: 65.00,
      rating: 4.6,
      reviews: 2106,
      source: 'aliexpress',
      image: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=400',
      freeShipping: true,
      deliveryTime: '10-20 days',
      url: 'https://aliexpress.com/item/example2'
    },
    {
      id: 'amazon_002',
      name: 'Diamond Style Ring Set',
      nameAr: 'طقم خواتم بتصميم الماس',
      price: 156.99,
      originalPrice: 220.00,
      rating: 4.9,
      reviews: 456,
      source: 'amazon',
      image: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=400',
      freeShipping: true,
      deliveryTime: '1-3 days',
      url: 'https://amazon.com/dp/example2'
    }
  ];

  useEffect(() => {
    setExternalProducts(mockExternalProducts);
  }, []);

  const getStoreLogo = (source) => {
    switch(source) {
      case 'aliexpress':
        return '🛒 AliExpress';
      case 'amazon':
        return '📦 Amazon';
      default:
        return source;
    }
  };

  const getStoreColor = (source) => {
    switch(source) {
      case 'aliexpress':
        return 'bg-orange-500';
      case 'amazon':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <section className="py-16 bg-gradient-to-br from-gray-50 to-amber-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="font-display text-4xl md:text-5xl font-bold text-gray-900 mb-4 luxury-text">
            {isRTL ? 'منتجات من المتاجر العالمية' : 'Global Store Products'}
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            {isRTL 
              ? 'اكتشف مجموعة واسعة من الاكسسوارات المميزة من أشهر المتاجر العالمية مثل أمازون وعلي إكسبرس'
              : 'Discover a wide range of premium accessories from top global stores like Amazon and AliExpress'
            }
          </p>
        </div>

        {/* Store Badges */}
        <div className="flex justify-center space-x-6 mb-12">
          <div className="flex items-center space-x-2 bg-white px-4 py-2 rounded-full shadow-md">
            <span className="text-2xl">🛒</span>
            <span className="font-semibold text-orange-600">AliExpress</span>
            <Badge className="bg-green-100 text-green-800">Live</Badge>
          </div>
          <div className="flex items-center space-x-2 bg-white px-4 py-2 rounded-full shadow-md">
            <span className="text-2xl">📦</span>
            <span className="font-semibold text-yellow-600">Amazon</span>
            <Badge className="bg-green-100 text-green-800">Live</Badge>
          </div>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {externalProducts.map((product) => (
            <Card key={product.id} className="product-card overflow-hidden group">
              <div className="relative">
                <img 
                  src={product.image}
                  alt={isRTL ? product.nameAr : product.name}
                  className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-500"
                />
                
                {/* Store Badge */}
                <div className={`absolute top-2 left-2 ${getStoreColor(product.source)} text-white px-2 py-1 rounded-full text-xs font-bold`}>
                  {getStoreLogo(product.source)}
                </div>
                
                {/* Discount Badge */}
                <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-bold">
                  -{Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}%
                </div>
                
                {/* Free Shipping */}
                {product.freeShipping && (
                  <div className="absolute bottom-2 left-2 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-bold flex items-center">
                    <Truck className="h-3 w-3 mr-1" />
                    {isRTL ? 'شحن مجاني' : 'Free Ship'}
                  </div>
                )}
              </div>
              
              <div className="p-4">
                <h3 className="font-bold text-sm mb-2 text-gray-900 line-clamp-2">
                  {isRTL ? product.nameAr : product.name}
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
                    ({product.reviews})
                  </span>
                </div>
                
                {/* Price */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex flex-col">
                    <span className="text-lg font-bold text-amber-600">
                      {formatPrice(product.price)}
                    </span>
                    <span className="text-xs text-gray-500 line-through">
                      {formatPrice(product.originalPrice)}
                    </span>
                  </div>
                </div>
                
                {/* Delivery Time */}
                <div className="text-xs text-gray-600 mb-3 flex items-center">
                  <Shield className="h-3 w-3 mr-1" />
                  {isRTL ? `التوصيل: ${product.deliveryTime}` : `Delivery: ${product.deliveryTime}`}
                </div>
                
                {/* Actions */}
                <div className="flex space-x-2">
                  <Button 
                    size="sm"
                    className="btn-luxury flex-1 text-xs"
                    onClick={() => window.open(product.url, '_blank')}
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    {isRTL ? 'شراء خارجي' : 'Buy External'}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
        
        {/* Call to Action */}
        <div className="text-center mt-12">
          <div className="bg-white p-8 rounded-2xl shadow-lg max-w-2xl mx-auto">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              {isRTL ? 'اكتشف المزيد من المنتجات' : 'Discover More Products'}
            </h3>
            <p className="text-gray-600 mb-6">
              {isRTL 
                ? 'تصفح آلاف المنتجات من أشهر المتاجر العالمية بأفضل الأسعار'
                : 'Browse thousands of products from top global stores at the best prices'
              }
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                className="btn-luxury"
                onClick={() => window.open('https://aliexpress.com', '_blank')}
              >
                🛒 {isRTL ? 'تصفح علي إكسبرس' : 'Browse AliExpress'}
              </Button>
              <Button 
                variant="outline"
                className="border-yellow-500 text-yellow-700 hover:bg-yellow-50"
                onClick={() => window.open('https://amazon.com', '_blank')}
              >
                📦 {isRTL ? 'تصفح أمازون' : 'Browse Amazon'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ExternalStoresSection;