import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Star, Heart, ShoppingCart, Minus, Plus, ArrowLeft, Truck, Shield, RotateCcw } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { toast } from 'sonner';
import axios from 'axios';
import { setSEO } from '../utils/seo';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import { trackViewItem, trackAddToCart } from '../utils/analytics';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ProductDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { currency, language } = useLanguage();
  const isRTL = language === 'ar' || language === 'he';

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [relatedProducts, setRelatedProducts] = useState([]);

  const [shippingInfo, setShippingInfo] = useState({ loading: true, cost: 0, days: null, error: null });
  const [detectedCountry, setDetectedCountry] = useState('SA');

  const getLocalizedName = (p) => {
    if (!p) return '';
    if (language === 'ar') return p.name_ar || p.name || p.name_en || '';
    if (language === 'en') return p.name_en || p.name || p.name_ar || '';
    return p.name_en || p.name || p.name_ar || '';
  };

  const getLocalizedDescription = (p) => {
    if (!p) return '';
    if (language === 'ar') return p.description_ar || p.description || p.description_en || '';
    if (language === 'en') return p.description_en || p.description || p.description_ar || '';
    return p.description_en || p.description || p.description_ar || '';
  };

  useEffect(() => {
    fetchProduct();
  }, [id]);

  useEffect(() => {
    detectCountry();
  }, []);

  useEffect(() => {
    if (product && detectedCountry) {
      estimateShippingSingle();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product, detectedCountry, currency, language]);

  const injectJSONLD = (p) => {
    if (typeof document === 'undefined') return;
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    const data = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: getLocalizedName(p),
      image: p.images,
      description: getLocalizedDescription(p),
      brand: { '@type': 'Brand', name: 'Auraa Luxury' },
      offers: {
        '@type': 'Offer',
        priceCurrency: 'SAR',
        price: p.price,
        availability: p.in_stock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock'
      },
      aggregateRating: p.rating ? { '@type': 'AggregateRating', ratingValue: p.rating, reviewCount: p.reviews_count || 0 } : undefined
    };
    script.text = JSON.stringify(data);
    document.head.appendChild(script);
  };

  const detectCountry = async () => {
    try {
      const res = await fetch(`${API}/geo/detect`);
      if (res.ok) {
        const data = await res.json();
        if (data?.country_code) setDetectedCountry(data.country_code);
      }
    } catch (e) { /* silent */ }
  };

  const fetchProduct = async () => {
    try {
      const response = await axios.get(`${API}/products/${id}`);
      setProduct(response.data);
      const relatedResponse = await axios.get(`${API}/products?category=${response.data.category}&limit=4`);
      setRelatedProducts(relatedResponse.data.filter(p => p.id !== response.data.id));
      setLoading(false);
      setSEO({
        title: `${getLocalizedName(response.data)} | Auraa Luxury`,
        description: getLocalizedDescription(response.data)?.slice(0, 150),
        canonical: `${window.location.origin}/product/${response.data.id}`,
        ogImage: response.data.images?.[0]
      });
      injectJSONLD(response.data);
      
      // Track product view in GA4
      trackViewItem({
        id: response.data.id,
        name: getLocalizedName(response.data),
        category: response.data.category,
        price: response.data.price,
        currency: currency || 'SAR'
      });
    } catch (error) {
      console.error('Error fetching product:', error);
      toast.error(isRTL ? 'فشل في تحميل المنتج' : 'Failed to load product');
      navigate('/products');
    }
  };

  const estimateShippingSingle = async () => {
    try {
      setShippingInfo({ loading: true, cost: 0, days: null, error: null });
      const payload = {
        country_code: detectedCountry,
        preferred: 'fastest',
        currency: currency || 'SAR',
        markup_pct: 10,
        items: [{ product_id: id, quantity: 1 }]
      };
      const res = await fetch(`${API}/shipping/estimate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.status === 400) {
        setShippingInfo({ loading: false, cost: 0, days: null, error: 'unavailable' });
        return;
      }
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      const cost = data?.shipping_cost?.[currency] ?? 0;
      const days = data?.estimated_days || null;
      setShippingInfo({ loading: false, cost, days, error: null });
    } catch (e) {
      setShippingInfo({ loading: false, cost: 0, days: null, error: 'server' });
    }
  };

  const handleAddToCart = async () => {
    const result = await addToCart(product.id, quantity);
    if (result.success) {
      toast.success(isRTL ? `تم إضافة ${quantity} قطعة إلى السلة` : `${quantity} item(s) added to cart`);
    } else {
      if (result.error.includes('Authentication')) {
        toast.error(isRTL ? 'يجب تسجيل الدخول أولاً' : 'Please login first');
        navigate('/auth');
      } else {
        toast.error(result.error || (isRTL ? 'فشل في إضافة المنتج إلى السلة' : 'Failed to add to cart'));
      }
    }
  };

  const buyNow = async () => {
    try {
      await handleAddToCart();
      navigate('/cart');
    } catch (error) {}
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">{isRTL ? 'المنتج غير موجود' : 'Product not found'}</h2>
          <Link to="/products"><Button className="btn-luxury">{isRTL ? 'العودة للمنتجات' : 'Back to Products'}</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center space-x-2 mb-8 text-sm">
          <Link to="/" className="text-amber-600 hover:text-amber-700">{isRTL ? 'الرئيسية' : 'Home'}</Link>
          <span className="text-gray-500">/</span>
          <Link to="/products" className="text-amber-600 hover:text-amber-700">{isRTL ? 'المنتجات' : 'Products'}</Link>
          <span className="text-gray-500">/</span>
          <span className="text-gray-900 font-medium">{getLocalizedName(product)}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Product Images */}
          <div className="space-y-4">
            <Card className="overflow-hidden">
              <picture>
                <source srcSet={`${product.images[selectedImage]}?format=avif`} type="image/avif" />
                <source srcSet={`${product.images[selectedImage]}?format=webp`} type="image/webp" />
                <img src={product.images[selectedImage]} alt={getLocalizedName(product)} className="w-full h-96 lg:h-[500px] img-product-card" data-testid="product-main-image" style={{ aspectRatio: '4 / 3' }} />
              </picture>
            </Card>
            {product.images.length > 1 && (
              <div className="flex space-x-2 overflow-x-auto">
                {product.images.map((image, index) => (
                  <button key={index} onClick={() => setSelectedImage(index)} className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-colors ${selectedImage === index ? 'border-amber-500' : 'border-gray-200 hover:border-gray-300'}`}>
                    <picture>
                      <source srcSet={`${image}?format=avif`} type="image/avif" />
                      <source srcSet={`${image}?format=webp`} type="image/webp" />
                      <img src={image} alt={`${getLocalizedName(product)} ${index + 1}`} className="w-full h-full img-product-card" />
                    </picture>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            <div>
              <h1 className="font-display text-3xl lg:text-4xl font-bold text-gray-900 mb-4" data-testid="product-title">{getLocalizedName(product)}</h1>
              <div className="flex items-center mb-4">
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className={`h-5 w-5 ${i < Math.floor(product.rating) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} />
                  ))}
                </div>
                <span className="text-lg text-gray-600 mr-3">({product.reviews_count} {isRTL ? 'تقييم' : 'reviews'})</span>
              </div>
              <div className="flex items-center space-x-4 mb-3">
                <span className="price-highlight text-4xl font-bold text-amber-600" data-testid="product-price">{product.price} {isRTL ? 'ر.س' : 'SAR'}</span>
                {product.original_price && (
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl text-gray-500 line-through">{product.original_price} {isRTL ? 'ر.س' : 'SAR'}</span>
                    <span className="bg-red-500 text-white px-2 py-1 rounded-full text-sm font-bold">{isRTL ? 'وفر' : 'Save'} {product.discount_percentage}%</span>
                  </div>
                )}
              </div>
              {/* Shipping quick estimate */}
              <div className="flex items-center text-sm text-gray-700">
                <Truck className="h-4 w-4 ml-2 text-amber-600" />
                {shippingInfo.loading ? (
                  <span>{isRTL ? 'حساب الشحن...' : 'Estimating shipping...'}</span>
                ) : shippingInfo.error === 'unavailable' ? (
                  <span>{isRTL ? 'الشحن غير متاح لبلدك' : 'Shipping not available for your country'}</span>
                ) : (
                  <span>
                    {isRTL ? 'الشحن التقديري:' : 'Estimated shipping:'} {shippingInfo.cost.toFixed(2)} {isRTL ? 'ر.س' : 'SAR'}
                    {shippingInfo.days ? ` • ${isRTL ? 'المدة' : 'ETA'}: ${shippingInfo.days.min ?? '?'}-${shippingInfo.days.max ?? '?'} ${isRTL ? 'أيام' : 'days'}` : ''}
                  </span>
                )}
              </div>
            </div>

            {/* Description */}
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">{isRTL ? 'الوصف' : 'Description'}</h3>
              <p className="text-gray-700 leading-relaxed" data-testid="product-description">{getLocalizedDescription(product)}</p>
            </div>

            {/* Quantity & Actions */}
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <label className="text-lg font-medium text-gray-900">{isRTL ? 'الكمية:' : 'Quantity:'}</label>
                <div className="flex items-center border border-gray-300 rounded-lg">
                  <button onClick={() => quantity > 1 && setQuantity(quantity - 1)} className="p-2 hover:bg-gray-100 transition-colors" disabled={quantity <= 1} data-testid="quantity-decrease">
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="px-4 py-2 min-w-[3rem] text-center" data-testid="quantity-display">{quantity}</span>
                  <button onClick={() => setQuantity(quantity + 1)} className="p-2 hover:bg-gray-100 transition-colors" data-testid="quantity-increase">
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <span className="text-sm text-gray-600">({product.stock_quantity} {isRTL ? 'متوفر' : 'in stock'})</span>
              </div>

              <div className="flex space-x-4">
                <Button onClick={handleAddToCart} className="btn-luxury flex-1" data-testid="add-to-cart-button">
                  <ShoppingCart className="h-5 w-5 ml-2" />
                  {isRTL ? 'أضف إلى السلة' : 'Add to Cart'}
                </Button>
                <Button onClick={buyNow} variant="outline" className="flex-1 border-amber-600 text-amber-600 hover:bg-amber-50" data-testid="buy-now-button">{isRTL ? 'اشتري الآن' : 'Buy Now'}</Button>
                <Button variant="outline" size="icon" className="border-gray-300"><Heart className="h-5 w-5" /></Button>
              </div>
            </div>

            {/* Features */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center p-4 bg-white rounded-lg border border-gray-200">
                <Truck className="h-6 w-6 text-amber-600 ml-3" />
                <div>
                  <div className="font-medium text-gray-900">{isRTL ? 'توصيل سريع' : 'Fast Delivery'}</div>
                  <div className="text-sm text-gray-600">
                    {shippingInfo.days ? (
                      <span>
                        {isRTL ? 'تقدير: ' : 'ETA: '} {shippingInfo.days.min ?? '?'} - {shippingInfo.days.max ?? '?'} {isRTL ? 'أيام' : 'days'}
                      </span>
                    ) : (
                      <span>{isRTL ? '3-7 أيام عمل' : '3-7 business days'}</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center p-4 bg-white rounded-lg border border-gray-200">
                <Shield className="h-6 w-6 text-amber-600 ml-3" />
                <div>
                  <div className="font-medium text-gray-900">{isRTL ? 'ضمان الجودة' : 'Quality Guarantee'}</div>
                  <div className="text-sm text-gray-600">{isRTL ? 'ضمان سنة كاملة' : '1-year full warranty'}</div>
                </div>
              </div>
              <div className="flex items-center p-4 bg-white rounded-lg border border-gray-200">
                <RotateCcw className="h-6 w-6 text-amber-600 ml-3" />
                <div>
                  <div className="font-medium text-gray-900">{isRTL ? 'سياسة الإرجاع' : 'Return Policy'}</div>
                  <div className="text-sm text-gray-600">{isRTL ? 'خلال 30 يوم' : 'Within 30 days'}</div>
                </div>
              </div>
            </div>

            {/* External Link */}
            {product.external_url && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-800 mb-2">{isRTL ? 'هذا المنتج متوفر أيضاً في:' : 'This product is also available at:'}</p>
                <a href={product.external_url} target="_blank" rel="noopener noreferrer" className="text-amber-600 hover:text-amber-700 font-medium underline">{isRTL ? 'المتجر الأصلي' : 'Original Store'}</a>
              </div>
            )}
          </div>
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <div className="mt-16">
            <h2 className="font-display text-3xl font-bold text-gray-900 mb-8 text-center">{isRTL ? 'منتجات ذات صلة' : 'Related Products'}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {relatedProducts.map((relatedProduct) => (
                <Link key={relatedProduct.id} to={`/product/${relatedProduct.id}`}>
                  <Card className="product-card overflow-hidden group">
                    <div className="relative overflow-hidden">
                      <picture>
                        <source srcSet={`${relatedProduct.images[0]}?format=avif`} type="image/avif" />
                        <source srcSet={`${relatedProduct.images[0]}?format=webp`} type="image/webp" />
                        <img src={relatedProduct.images[0]} alt={getLocalizedName(relatedProduct)} className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-500" />
                      </picture>
                      {relatedProduct.discount_percentage && (
                        <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-bold">-{relatedProduct.discount_percentage}%</div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-bold text-lg mb-2 text-gray-900 group-hover:text-amber-600 transition-colors line-clamp-2">{getLocalizedName(relatedProduct)}</h3>
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-bold text-amber-600">{relatedProduct.price} {isRTL ? 'ر.س' : 'SAR'}</span>
                        <div className="flex items-center">
                          <Star className="h-4 w-4 text-yellow-400 fill-current ml-1" />
                          <span className="text-sm text-gray-600">{relatedProduct.rating}</span>
                        </div>
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductDetailPage;
