import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Filter, SlidersHorizontal, Star, Heart, ShoppingCart, Scale, Grid, List, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { toast } from 'sonner';
import axios from 'axios';
import { setSEO } from '../utils/seo';
import AdvancedSearch from './AdvancedSearch';
import SmartRecommendations from './SmartRecommendations';
import ProductComparison from './ProductComparison';
import LiveChat from './LiveChat';
import HeartButton from './HeartButton';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ProductsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { addToCart } = useCart();
  const { language } = useLanguage();
  const isRTL = language === 'ar' || language === 'he';
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    category: searchParams.get('category') || '',
    search: searchParams.get('search') || '',
    minPrice: '',
    maxPrice: '',
    sortBy: 'newest'
  });
  
  // New state for advanced features
  const [showComparison, setShowComparison] = useState(false);
  const [comparisonProducts, setComparisonProducts] = useState([]);
  const [viewMode, setViewMode] = useState('grid'); // grid, list
  const [showFilters, setShowFilters] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  
  const getLocalizedName = (p) => {
    if (!p) return '';
    if (language === 'ar') return p.name_ar || p.name || p.name_en || '';
    if (language === 'en') return p.name_en || p.name || p.name_ar || '';
    // Other languages fallback to English, then default name
    return p.name_en || p.name || p.name_ar || '';
  };

  const getLocalizedDescription = (p) => {
    if (!p) return '';
    if (language === 'ar') return p.description_ar || p.description || p.description_en || '';
    if (language === 'en') return p.description_en || p.description || p.description_ar || '';
    return p.description_en || p.description || p.description_ar || '';
  };

  useEffect(() => {
    setSEO({
      title: isRTL ? 'Auraa Luxury | المنتجات' : 'Auraa Luxury | Products',
      description: isRTL ? 'تسوق جميع المنتجات من Auraa Luxury.' : 'Shop all products from Auraa Luxury.',
      canonical: `${window.location.origin}/products`
    });
  }, [language]);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [searchParams]);

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API}/categories`);
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.category) params.append('category', filters.category);
      if (filters.search) params.append('search', filters.search);
      if (filters.minPrice) params.append('min_price', filters.minPrice);
      if (filters.maxPrice) params.append('max_price', filters.maxPrice);
      const response = await axios.get(`${API}/products?${params}`);
      let fetchedProducts = response.data;
      switch (filters.sortBy) {
        case 'price_low':
          fetchedProducts.sort((a, b) => a.price - b.price);
          break;
        case 'price_high':
          fetchedProducts.sort((a, b) => b.price - a.price);
          break;
        case 'rating':
          fetchedProducts.sort((a, b) => b.rating - a.rating);
          break;
        default:
          fetchedProducts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      }
      setProducts(fetchedProducts);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error(isRTL ? 'فشل في تحميل المنتجات' : 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    const newParams = new URLSearchParams();
    Object.entries(newFilters).forEach(([k, v]) => {
      if (v) newParams.set(k, v);
    });
    setSearchParams(newParams);
  };

  const handleAddToCart = async (productId) => {
    const result = await addToCart(productId, 1);
    if (result.success) {
      toast.success(isRTL ? 'تم إضافة المنتج إلى السلة' : 'Added to cart');
    } else {
      if (result.error.includes('Authentication')) {
        toast.error(isRTL ? 'يجب تسجيل الدخول أولاً' : 'Please login first');
      } else {
        toast.error(result.error || (isRTL ? 'فشل في إضافة المنتج إلى السلة' : 'Failed to add to cart'));
      }
    }
  };

  const addToComparison = (product) => {
    if (comparisonProducts.length >= 4) {
      toast.error(isRTL ? 'يمكنك مقارنة 4 منتجات كحد أقصى' : 'You can compare up to 4 products');
      return;
    }
    
    if (!comparisonProducts.some(p => p.id === product.id)) {
      setComparisonProducts([...comparisonProducts, product]);
      toast.success(isRTL ? 'تم إضافة المنتج للمقارنة' : 'Added to comparison');
    }
  };

  const removeFromComparison = (productId) => {
    setComparisonProducts(comparisonProducts.filter(p => p.id !== productId));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="font-display text-4xl md:text-5xl font-bold text-gray-900 mb-4" data-testid="products-page-title">
            {filters.category 
              ? (categories.find(c => c.id === filters.category)?.name_en && !isRTL ? categories.find(c => c.id === filters.category)?.name_en : categories.find(c => c.id === filters.category)?.name) || (isRTL ? 'المنتجات' : 'Products')
              : filters.search 
              ? (isRTL ? `البحث عن: ${filters.search}` : `Search: ${filters.search}`)
              : (isRTL ? 'جميع المنتجات' : 'All Products')
            }
          </h1>
          <p className="text-xl text-gray-600">{isRTL ? 'اكتشف مجموعتنا الواسعة من الاكسسوارات الفاخرة' : 'Discover our wide collection of luxury accessories'}</p>
          
          {/* Advanced Search */}
          <div className="mt-6">
            <AdvancedSearch 
              onResults={setProducts}
              showFilters={true}
            />
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-4 lg:gap-8">
          {/* Mobile Filter Toggle */}
          <div className="lg:hidden">
            <Button
              onClick={() => setShowMobileFilters(!showMobileFilters)}
              variant="outline"
              className="w-full mb-4"
            >
              <Filter className="h-4 w-4 mr-2" />
              {isRTL ? 'المرشحات' : 'Filters'}
              {showMobileFilters ? <ChevronUp className="h-4 w-4 ml-2" /> : <ChevronDown className="h-4 w-4 ml-2" />}
            </Button>
          </div>

          <div className={`lg:w-1/4 ${showMobileFilters || 'hidden'} lg:block`}>
            <Card className="luxury-card p-4 sm:p-6 sticky top-24">
              <div className="flex items-center mb-4">
                <SlidersHorizontal className="h-5 w-5 ml-2 text-amber-600" />
                <h2 className="text-base sm:text-lg font-bold text-gray-900">{isRTL ? 'تصفية النتائج' : 'Filter Results'}</h2>
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">{isRTL ? 'الفئة' : 'Category'}</label>
                <Select value={filters.category || 'all'} onValueChange={(value) => handleFilterChange('category', value === 'all' ? '' : value)}>
                  <SelectTrigger>
                    <SelectValue placeholder={isRTL ? 'اختر الفئة' : 'Select Category'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{isRTL ? 'جميع الفئات' : 'All Categories'}</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>{!isRTL && category.name_en ? category.name_en : category.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">{isRTL ? 'نطاق السعر (ريال سعودي)' : 'Price range (SAR)'}</label>
                <div className="flex space-x-2">
                  <Input type="number" placeholder={isRTL ? 'من' : 'Min'} value={filters.minPrice} onChange={(e) => handleFilterChange('minPrice', e.target.value)} className="flex-1" />
                  <Input type="number" placeholder={isRTL ? 'إلى' : 'Max'} value={filters.maxPrice} onChange={(e) => handleFilterChange('maxPrice', e.target.value)} className="flex-1" />
                </div>
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">{isRTL ? 'ترتيب حسب' : 'Sort by'}</label>
                <Select value={filters.sortBy || 'newest'} onValueChange={(value) => handleFilterChange('sortBy', value)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">{isRTL ? 'الأحدث' : 'Newest'}</SelectItem>
                    <SelectItem value="price_low">{isRTL ? 'السعر: من الأقل للأعلى' : 'Price: Low to High'}</SelectItem>
                    <SelectItem value="price_high">{isRTL ? 'السعر: من الأعلى للأقل' : 'Price: High to Low'}</SelectItem>
                    <SelectItem value="rating">{isRTL ? 'الأعلى تقييماً' : 'Top Rated'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" className="w-full" onClick={() => { setFilters({ category: '', search: '', minPrice: '', maxPrice: '', sortBy: 'newest' }); setSearchParams({}); }}>{isRTL ? 'مسح جميع المرشحات' : 'Clear all filters'}</Button>
            </Card>
          </div>

          <div className="lg:w-3/4">
            <div className="flex justify-between items-center mb-6">
              <p className="text-gray-600">{loading ? (isRTL ? 'جاري التحميل...' : 'Loading...') : `${products.length} ${isRTL ? 'منتج' : 'items'}`}</p>
              
              <div className="flex items-center gap-4">
                {/* Comparison Toggle */}
                {comparisonProducts.length > 0 && (
                  <Button
                    onClick={() => setShowComparison(true)}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    {isRTL ? 'مقارنة' : 'Compare'} ({comparisonProducts.length})
                  </Button>
                )}
                
                {/* View Mode Toggle */}
                <div className="flex bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`px-3 py-1 rounded-md text-sm transition-colors ${
                      viewMode === 'grid' ? 'bg-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {isRTL ? 'شبكة' : 'Grid'}
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`px-3 py-1 rounded-md text-sm transition-colors ${
                      viewMode === 'list' ? 'bg-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {isRTL ? 'قائمة' : 'List'}
                  </button>
                </div>
              </div>
            </div>
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-6">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="luxury-card p-4 animate-pulse">
                    <div className="skeleton h-64 rounded-lg mb-4"></div>
                    <div className="skeleton h-6 rounded mb-2"></div>
                    <div className="skeleton h-4 rounded w-3/4 mb-2"></div>
                    <div className="skeleton h-8 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{isRTL ? 'لم نجد أي منتجات' : 'No products found'}</h3>
                <p className="text-gray-600 mb-4">{isRTL ? 'جرب تغيير المرشحات أو البحث عن شيء آخر' : 'Try adjusting filters or search for something else'}</p>
                <Button onClick={() => { setFilters({ category: '', search: '', minPrice: '', maxPrice: '', sortBy: 'newest' }); setSearchParams({}); }}>{isRTL ? 'مسح المرشحات' : 'Clear filters'}</Button>
              </div>
            ) : (
              <div className={viewMode === 'grid' 
                ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-6" 
                : "flex flex-col space-y-4"
              }>
                {products.map((product) => (
                  <Card key={product.id} className={viewMode === 'grid' 
                    ? "product-card overflow-hidden group" 
                    : "product-card overflow-hidden group flex flex-row"
                  } data-testid={`product-${product.id}`}>
                    <div className={viewMode === 'grid' 
                      ? "relative overflow-hidden" 
                      : "relative overflow-hidden w-48 flex-shrink-0"
                    }>
                      <Link to={`/product/${product.id}`}>
                        <picture>
                          <source srcSet={`${product.images[0]}?format=avif`} type="image/avif" />
                          <source srcSet={`${product.images[0]}?format=webp`} type="image/webp" />
                          <img src={product.images[0]} alt={getLocalizedName(product)} className={viewMode === 'grid' 
                            ? "w-full h-48 sm:h-56 lg:h-64 object-cover group-hover:scale-110 transition-transform duration-500" 
                            : "w-full h-48 object-cover group-hover:scale-110 transition-transform duration-500"
                          } />
                        </picture>
                      </Link>
                      {product.discount_percentage && (
                        <div className="absolute top-4 right-4 bg-red-500 text-white px-2 py-1 rounded-full text-sm font-bold">-{product.discount_percentage}%</div>
                      )}
                      <div className="absolute bottom-4 right-4 flex space-x-2">
                        {product.discount_percentage && (<span className="badge badge-sale">{isRTL ? 'خصم' : 'Sale'}</span>)}
                        {product.rating >= 4.8 && (<span className="badge badge-hot">{isRTL ? 'الأكثر مبيعًا' : 'Best Seller'}</span>)}
                        {(() => { const created = new Date(product.created_at); const diffDays = (Date.now() - created.getTime()) / (1000*60*60*24); return diffDays < 30; })() && (<span className="badge badge-new">{isRTL ? 'جديد' : 'New'}</span>)}
                      </div>
                      <div className="quick-add bg-white/90 backdrop-blur-sm p-3">
                        <Button onClick={() => handleAddToCart(product.id)} className="w-full">
                          <ShoppingCart className="h-4 w-4 ml-2" />
                          {isRTL ? 'إضافة سريعة' : 'Quick add'}
                        </Button>
                      </div>
                      <div className="absolute top-4 left-4">
                        <HeartButton 
                          product={product}
                          variant="floating"
                          size="md"
                          showAnimation={true}
                        />
                      </div>
                    </div>
                    <div className={viewMode === 'grid' ? "p-6" : "p-6 flex-1 flex flex-col justify-between"}>
                      <div>
                        <Link to={`/product/${product.id}`}>
                          <h3 className={viewMode === 'grid' 
                            ? "font-bold text-lg mb-2 text-gray-900 group-hover:text-amber-600 transition-colors line-clamp-2" 
                            : "font-bold text-xl mb-2 text-gray-900 group-hover:text-amber-600 transition-colors"
                          }>{getLocalizedName(product)}</h3>
                        </Link>
                        {viewMode === 'list' && (
                          <p className="text-gray-600 text-sm mb-3 line-clamp-2">{getLocalizedDescription(product)}</p>
                        )}
                        <div className="flex items-center mb-3">
                          <div className="flex items-center">
                            {[...Array(5)].map((_, i) => (
                              <Star key={i} className={`h-4 w-4 ${i < Math.floor(product.rating) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} />
                            ))}
                          </div>
                          <span className="text-sm text-gray-600 mr-2">({product.reviews_count})</span>
                        </div>
                        <div className={viewMode === 'grid' ? "flex items-center justify-between mb-4" : "flex items-center space-x-4 mb-4"}>
                          <div className="flex flex-col">
                            <span className="price-highlight text-xl font-bold text-amber-600">{product.price} {isRTL ? 'ر.س' : 'SAR'}</span>
                            {product.original_price && (<span className="text-sm text-gray-500 line-through">{product.original_price} {isRTL ? 'ر.س' : 'SAR'}</span>)}
                          </div>
                        </div>
                      </div>
                      <div className={viewMode === 'grid' ? "flex space-x-2" : "flex space-x-2 mt-4"}>
                        <Button onClick={() => handleAddToCart(product.id)} className="btn-luxury flex-1" data-testid={`add-to-cart-${product.id}`}>
                          <ShoppingCart className="h-4 w-4 ml-2" />
                          {isRTL ? 'أضف للسلة' : 'Add to Cart'}
                        </Button>
                        <Button 
                          onClick={() => addToComparison(product)}
                          variant="outline"
                          size="sm"
                          className={`p-2 ${comparisonProducts.some(p => p.id === product.id) ? 'bg-purple-100 text-purple-600' : ''}`}
                        >
                          <Scale className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {/* Smart Recommendations */}
        {!loading && products.length > 0 && (
          <div className="mt-16">
            <SmartRecommendations 
              type="personalized"
              category={filters.category}
              limit={6}
            />
          </div>
        )}
      </div>

      {/* Product Comparison Modal */}
      {showComparison && (
        <ProductComparison
          initialProducts={comparisonProducts}
          isModal={true}
          onClose={() => setShowComparison(false)}
        />
      )}
      
      {/* Live Chat */}
      <LiveChat userId={null} productId={null} />
    </div>
  );
};

export default ProductsPage;
