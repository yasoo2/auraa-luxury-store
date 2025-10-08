import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Filter, SlidersHorizontal, Star, Heart, ShoppingCart, Scale, Grid, List } from 'lucide-react';
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

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ProductsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
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

  useEffect(() => {
    setSEO({
      title: 'Auraa Luxury | المنتجات',
      description: 'تسوق جميع المنتجات من Auraa Luxury.',
      canonical: 'https://www.auraaluxury.com/products'
    });
  }, []);

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
      toast.error('فشل في تحميل المنتجات');
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

  const addToCart = async (productId) => {
    try {
      await axios.post(`${API}/cart/add?product_id=${productId}&quantity=1`);
      toast.success('تم إضافة المنتج إلى السلة');
    } catch (error) {
      if (error.response?.status === 401) {
        toast.error('يجب تسجيل الدخول أولاً');
      } else {
        toast.error('فشل في إضافة المنتج إلى السلة');
      }
    }
  };

  const addToComparison = (product) => {
    if (comparisonProducts.length >= 4) {
      toast.error('يمكنك مقارنة 4 منتجات كحد أقصى');
      return;
    }
    
    if (!comparisonProducts.some(p => p.id === product.id)) {
      setComparisonProducts([...comparisonProducts, product]);
      toast.success('تم إضافة المنتج للمقارنة');
    }
  };

  const removeFromComparison = (productId) => {
    setComparisonProducts(comparisonProducts.filter(p => p.id !== productId));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="font-display text-4xl md:text-5xl font-bold text-gray-900 mb-4" data-testid="products-page-title">
            {filters.category 
              ? categories.find(c => c.id === filters.category)?.name || 'المنتجات'
              : filters.search 
              ? `البحث عن: ${filters.search}`
              : 'جميع المنتجات'
            }
          </h1>
          <p className="text-xl text-gray-600">اكتشف مجموعتنا الواسعة من الاكسسوارات الفاخرة</p>
          
          {/* Advanced Search */}
          <div className="mt-6">
            <AdvancedSearch 
              onResults={setProducts}
              showFilters={true}
            />
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          <div className="lg:w-1/4">
            <Card className="luxury-card p-6 sticky top-24">
              <div className="flex items-center mb-4">
                <SlidersHorizontal className="h-5 w-5 ml-2 text-amber-600" />
                <h2 className="text-lg font-bold text-gray-900">تصفية النتائج</h2>
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">الفئة</label>
                <Select value={filters.category || "all"} onValueChange={(value) => handleFilterChange('category', value === 'all' ? '' : value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الفئة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الفئات</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">نطاق السعر (ريال سعودي)</label>
                <div className="flex space-x-2">
                  <Input type="number" placeholder="من" value={filters.minPrice} onChange={(e) => handleFilterChange('minPrice', e.target.value)} className="flex-1" />
                  <Input type="number" placeholder="إلى" value={filters.maxPrice} onChange={(e) => handleFilterChange('maxPrice', e.target.value)} className="flex-1" />
                </div>
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">ترتيب حسب</label>
                <Select value={filters.sortBy || "newest"} onValueChange={(value) => handleFilterChange('sortBy', value)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">الأحدث</SelectItem>
                    <SelectItem value="price_low">السعر: من الأقل للأعلى</SelectItem>
                    <SelectItem value="price_high">السعر: من الأعلى للأقل</SelectItem>
                    <SelectItem value="rating">الأعلى تقييماً</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" className="w-full" onClick={() => { setFilters({ category: '', search: '', minPrice: '', maxPrice: '', sortBy: 'newest' }); setSearchParams({}); }}>مسح جميع المرشحات</Button>
            </Card>
          </div>

          <div className="lg:w-3/4">
            <div className="flex justify-between items-center mb-6">
              <p className="text-gray-600">{loading ? 'جاري التحميل...' : `${products.length} منتج`}</p>
              
              <div className="flex items-center gap-4">
                {/* Comparison Toggle */}
                {comparisonProducts.length > 0 && (
                  <Button
                    onClick={() => setShowComparison(true)}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    مقارنة ({comparisonProducts.length})
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
                    شبكة
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`px-3 py-1 rounded-md text-sm transition-colors ${
                      viewMode === 'list' ? 'bg-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    قائمة
                  </button>
                </div>
              </div>
            </div>
            {loading ? (
              <div className="product-grid">
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
                <h3 className="text-2xl font-bold text-gray-900 mb-2">لم نجد أي منتجات</h3>
                <p className="text-gray-600 mb-4">جرب تغيير المرشحات أو البحث عن شيء آخر</p>
                <Button onClick={() => { setFilters({ category: '', search: '', minPrice: '', maxPrice: '', sortBy: 'newest' }); setSearchParams({}); }}>مسح المرشحات</Button>
              </div>
            ) : (
              <div className="product-grid">
                {products.map((product) => (
                  <Card key={product.id} className="product-card overflow-hidden group" data-testid={`product-${product.id}`}>
                    <div className="relative overflow-hidden">
                      <Link to={`/product/${product.id}`}>
                        <picture>
                          <source srcSet={`${product.images[0]}?format=avif`} type="image/avif" />
                          <source srcSet={`${product.images[0]}?format=webp`} type="image/webp" />
                          <img src={product.images[0]} alt={product.name} className="w-full h-64 img-product-card group-hover:scale-110 transition-transform duration-500" style={{ aspectRatio: '4 / 3' }} />
                        </picture>
                      </Link>
                      {product.discount_percentage && (
                        <div className="absolute top-4 right-4 bg-red-500 text-white px-2 py-1 rounded-full text-sm font-bold">-{product.discount_percentage}%</div>
                      )}
                      <div className="absolute bottom-4 right-4 flex space-x-2">
                        {product.discount_percentage && (<span className="badge badge-sale">خصم</span>)}
                        {product.rating >= 4.8 && (<span className="badge badge-hot">الأكثر مبيعًا</span>)}
                        {(() => { const created = new Date(product.created_at); const diffDays = (Date.now() - created.getTime()) / (1000*60*60*24); return diffDays < 30; })() && (<span className="badge badge-new">جديد</span>)}
                      </div>
                      <div className="quick-add bg-white/90 backdrop-blur-sm p-3">
                        <Button onClick={() => addToCart(product.id)} className="w-full">
                          <ShoppingCart className="h-4 w-4 ml-2" />
                          إضافة سريعة
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
                    <div className="p-6">
                      <Link to={`/product/${product.id}`}>
                        <h3 className="font-bold text-lg mb-2 text-gray-900 group-hover:text-amber-600 transition-colors line-clamp-2">{product.name}</h3>
                      </Link>
                      <div className="flex items-center mb-3">
                        <div className="flex items-center">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className={`h-4 w-4 ${i < Math.floor(product.rating) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} />
                          ))}
                        </div>
                        <span className="text-sm text-gray-600 mr-2">({product.reviews_count})</span>
                      </div>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex flex-col">
                          <span className="price-highlight text-xl font-bold text-amber-600">{product.price} ر.س</span>
                          {product.original_price && (<span className="text-sm text-gray-500 line-through">{product.original_price} ر.س</span>)}
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button onClick={() => addToCart(product.id)} className="btn-luxury flex-1" data-testid={`add-to-cart-${product.id}`}>
                          <ShoppingCart className="h-4 w-4 ml-2" />
                          أضف للسلة
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