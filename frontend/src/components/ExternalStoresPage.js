import React, { useState } from 'react';
import { ExternalLink, Filter, Star, Truck, Shield, DollarSign, Globe } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { useLanguage } from '../context/LanguageContext';

const ExternalStoresPage = () => {
  const { t, formatPrice, isRTL } = useLanguage();
  const [filters, setFilters] = useState({
    store: '',
    category: '',
    priceRange: '',
    sortBy: 'relevance'
  });

  // Extended mock data for external products
  const externalProducts = [
    {
      id: 'ali_001',
      name: 'Gold Plated Pearl Earrings Set',
      nameAr: 'طقم أقراط لؤلؤية مطلية بالذهب',
      price: 25.99,
      originalPrice: 45.99,
      rating: 4.7,
      reviews: 1523,
      source: 'aliexpress',
      category: 'earrings',
      image: 'https://images.unsplash.com/photo-1635767798638-3e25273a8236?w=400',
      freeShipping: true,
      deliveryTime: '7-15 days',
      url: 'https://aliexpress.com/item/example',
      seller: 'Luxury Jewelry Store'
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
      category: 'necklaces',
      image: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400',
      freeShipping: true,
      deliveryTime: '2-5 days',
      url: 'https://amazon.com/dp/example',
      seller: 'Amazon Jewelry'
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
      category: 'bracelets',
      image: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=400',
      freeShipping: true,
      deliveryTime: '10-20 days',
      url: 'https://aliexpress.com/item/example2',
      seller: 'Gold Accessories Co'
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
      category: 'rings',
      image: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=400',
      freeShipping: true,
      deliveryTime: '1-3 days',
      url: 'https://amazon.com/dp/example2',
      seller: 'Premium Rings Store'
    },
    {
      id: 'ali_003',
      name: 'Vintage Watch Collection',
      nameAr: 'مجموعة ساعات كلاسيكية',
      price: 42.00,
      originalPrice: 78.00,
      rating: 4.5,
      reviews: 987,
      source: 'aliexpress',
      category: 'watches',
      image: 'https://images.unsplash.com/photo-1758297679778-d308606a3f51?w=400',
      freeShipping: false,
      deliveryTime: '12-25 days',
      url: 'https://aliexpress.com/item/example3',
      seller: 'TimeKeepers'
    },
    {
      id: 'amazon_003',
      name: 'Complete Jewelry Set Premium',
      nameAr: 'طقم مجوهرات كامل فاخر',
      price: 199.99,
      originalPrice: 299.99,
      rating: 4.9,
      reviews: 234,
      source: 'amazon',
      category: 'sets',
      image: 'https://images.pexels.com/photos/34047369/pexels-photo-34047369.jpeg?w=400',
      freeShipping: true,
      deliveryTime: '1-2 days',
      url: 'https://amazon.com/dp/example3',
      seller: 'Luxury Collection Ltd'
    }
  ];

  const getStoreLogo = (source) => {
    switch(source) {
      case 'aliexpress':
        return { icon: '🛒', name: 'AliExpress', color: 'text-orange-600' };
      case 'amazon':
        return { icon: '📦', name: 'Amazon', color: 'text-yellow-600' };
      default:
        return { icon: '🏪', name: source, color: 'text-gray-600' };
    }
  };

  const categories = [
    { id: 'earrings', name: isRTL ? 'أقراط' : 'Earrings' },
    { id: 'necklaces', name: isRTL ? 'قلادات' : 'Necklaces' },
    { id: 'bracelets', name: isRTL ? 'أساور' : 'Bracelets' },
    { id: 'rings', name: isRTL ? 'خواتم' : 'Rings' },
    { id: 'watches', name: isRTL ? 'ساعات' : 'Watches' },
    { id: 'sets', name: isRTL ? 'أطقم' : 'Sets' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-amber-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display text-4xl md:text-5xl font-bold text-gray-900 mb-4 luxury-text">
            🌍 {isRTL ? 'المتاجر العالمية' : 'Global Stores'}
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl">
            {isRTL 
              ? 'اكتشف آلاف المنتجات من أشهر المتاجر العالمية مثل أمازون وعلي إكسبرس بأفضل الأسعار وأسرع التوصيل'
              : 'Discover thousands of products from top global stores like Amazon and AliExpress with the best prices and fastest delivery'
            }
          </p>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">2M+</div>
            <div className="text-sm text-gray-600">{isRTL ? 'منتج متاح' : 'Products Available'}</div>
          </Card>
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">24/7</div>
            <div className="text-sm text-gray-600">{isRTL ? 'دعم العملاء' : 'Customer Support'}</div>
          </Card>
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">Fast</div>
            <div className="text-sm text-gray-600">{isRTL ? 'شحن سريع' : 'Shipping'}</div>
          </Card>
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-amber-600">50+</div>
            <div className="text-sm text-gray-600">{isRTL ? 'دولة' : 'Countries'}</div>
          </Card>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters Sidebar */}
          <div className="lg:w-1/4">
            <Card className="luxury-card p-6 sticky top-24">
              <div className="flex items-center mb-4">
                <Filter className="h-5 w-5 ml-2 text-amber-600" />
                <h2 className="text-lg font-bold text-gray-900">
                  {isRTL ? 'تصفية النتائج' : 'Filter Results'}
                </h2>
              </div>

              {/* Store Filter */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {isRTL ? 'المتجر' : 'Store'}
                </label>
                <Select value={filters.store} onValueChange={(value) => setFilters({...filters, store: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder={isRTL ? 'جميع المتاجر' : 'All Stores'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">{isRTL ? 'جميع المتاجر' : 'All Stores'}</SelectItem>
                    <SelectItem value="amazon">📦 Amazon</SelectItem>
                    <SelectItem value="aliexpress">🛒 AliExpress</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Category Filter */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {isRTL ? 'الفئة' : 'Category'}
                </label>
                <Select value={filters.category} onValueChange={(value) => setFilters({...filters, category: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder={isRTL ? 'جميع الفئات' : 'All Categories'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">{isRTL ? 'جميع الفئات' : 'All Categories'}</SelectItem>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Sort */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {isRTL ? 'ترتيب حسب' : 'Sort By'}
                </label>
                <Select value={filters.sortBy} onValueChange={(value) => setFilters({...filters, sortBy: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="relevance">{isRTL ? 'الأكثر صلة' : 'Most Relevant'}</SelectItem>
                    <SelectItem value="price_low">{isRTL ? 'السعر: من الأقل للأعلى' : 'Price: Low to High'}</SelectItem>
                    <SelectItem value="price_high">{isRTL ? 'السعر: من الأعلى للأقل' : 'Price: High to Low'}</SelectItem>
                    <SelectItem value="rating">{isRTL ? 'الأعلى تقييماً' : 'Highest Rated'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* External Store Links */}
              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3">{isRTL ? 'تصفح المتاجر' : 'Browse Stores'}</h3>
                <div className="space-y-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full justify-start"
                    onClick={() => window.open('https://aliexpress.com', '_blank')}
                  >
                    🛒 AliExpress
                    <ExternalLink className="h-3 w-3 ml-auto" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full justify-start"
                    onClick={() => window.open('https://amazon.com', '_blank')}
                  >
                    📦 Amazon
                    <ExternalLink className="h-3 w-3 ml-auto" />
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          {/* Products Grid */}
          <div className="lg:w-3/4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {externalProducts.map((product) => {
                const store = getStoreLogo(product.source);
                return (
                  <Card key={product.id} className="product-card overflow-hidden group">
                    <div className="relative">
                      <img 
                        src={product.image}
                        alt={isRTL ? product.nameAr : product.name}
                        className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                      
                      {/* Store Badge */}
                      <div className={`absolute top-2 left-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full text-xs font-bold ${store.color} border`}>
                        {store.icon} {store.name}
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
                      
                      {/* Seller */}
                      <p className="text-xs text-gray-500 mb-2">{product.seller}</p>
                      
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
                          {product.rating} ({product.reviews})
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
                          {isRTL ? 'شراء الآن' : 'Buy Now'}
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExternalStoresPage;