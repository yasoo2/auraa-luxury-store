import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Link } from 'react-router-dom';
import axios from 'axios';
import {
  Scale,
  X,
  Plus,
  Star,
  Check,
  Minus,
  ShoppingCart,
  Heart,
  Share2,
  Eye,
  Award,
  Gem,
  Palette,
  Ruler,
  Package,
  Shield,
  Truck,
  RefreshCw
} from 'lucide-react';
import { Button } from './ui/button';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ProductComparison = ({ initialProducts = [], onClose = null, isModal = false }) => {
  const { t, language, currency } = useLanguage();
  const isRTL = language === 'ar';
  
  const [comparisonProducts, setComparisonProducts] = useState(initialProducts);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [comparisonData, setComparisonData] = useState({});

  const maxComparisons = 4;

  // Comparison criteria
  const comparisonCriteria = [
    {
      key: 'basic_info',
      title: isRTL ? 'المعلومات الأساسية' : 'Basic Information',
      icon: Package,
      fields: [
        { key: 'name', label: isRTL ? 'اسم المنتج' : 'Product Name', type: 'text' },
        { key: 'category', label: isRTL ? 'الفئة' : 'Category', type: 'text' },
        { key: 'brand', label: isRTL ? 'العلامة التجارية' : 'Brand', type: 'text' },
        { key: 'sku', label: isRTL ? 'رقم المنتج' : 'SKU', type: 'text' }
      ]
    },
    {
      key: 'pricing',
      title: isRTL ? 'الأسعار' : 'Pricing',
      icon: Award,
      fields: [
        { key: 'price', label: isRTL ? 'السعر الحالي' : 'Current Price', type: 'price' },
        { key: 'original_price', label: isRTL ? 'السعر الأصلي' : 'Original Price', type: 'price' },
        { key: 'discount_percentage', label: isRTL ? 'نسبة الخصم' : 'Discount', type: 'percentage' },
        { key: 'value_rating', label: isRTL ? 'تقييم القيمة' : 'Value Rating', type: 'rating' }
      ]
    },
    {
      key: 'specifications',
      title: isRTL ? 'المواصفات' : 'Specifications',
      icon: Gem,
      fields: [
        { key: 'material', label: isRTL ? 'المادة' : 'Material', type: 'text' },
        { key: 'color', label: isRTL ? 'اللون' : 'Color', type: 'color' },
        { key: 'size', label: isRTL ? 'الحجم' : 'Size', type: 'text' },
        { key: 'weight', label: isRTL ? 'الوزن' : 'Weight', type: 'text' },
        { key: 'dimensions', label: isRTL ? 'الأبعاد' : 'Dimensions', type: 'text' }
      ]
    },
    {
      key: 'quality',
      title: isRTL ? 'الجودة والتقييمات' : 'Quality & Ratings',
      icon: Star,
      fields: [
        { key: 'rating', label: isRTL ? 'التقييم العام' : 'Overall Rating', type: 'rating' },
        { key: 'reviews_count', label: isRTL ? 'عدد المراجعات' : 'Review Count', type: 'number' },
        { key: 'quality_score', label: isRTL ? 'نقاط الجودة' : 'Quality Score', type: 'rating' },
        { key: 'durability', label: isRTL ? 'المتانة' : 'Durability', type: 'rating' }
      ]
    },
    {
      key: 'availability',
      title: isRTL ? 'التوفر والشحن' : 'Availability & Shipping',
      icon: Truck,
      fields: [
        { key: 'stock_status', label: isRTL ? 'حالة المخزون' : 'Stock Status', type: 'status' },
        { key: 'shipping_time', label: isRTL ? 'وقت الشحن' : 'Shipping Time', type: 'text' },
        { key: 'warranty', label: isRTL ? 'الضمان' : 'Warranty', type: 'text' },
        { key: 'return_policy', label: isRTL ? 'سياسة الإرجاع' : 'Return Policy', type: 'text' }
      ]
    }
  ];

  useEffect(() => {
    if (comparisonProducts.length > 0) {
      fetchComparisonData();
    }
  }, [comparisonProducts]);

  const fetchComparisonData = async () => {
    try {
      const productIds = comparisonProducts.map(p => p.id);
      const response = await axios.post(`${API}/products/compare`, { productIds });
      setComparisonData(response.data || generateMockComparisonData());
    } catch (error) {
      console.error('Comparison data error:', error);
      setComparisonData(generateMockComparisonData());
    }
  };

  const generateMockComparisonData = () => {
    const mockData = {};
    comparisonProducts.forEach((product, index) => {
      mockData[product.id] = {
        ...product,
        brand: 'Auraa Luxury',
        sku: `AL-${product.id.slice(-4).toUpperCase()}`,
        material: index % 3 === 0 ? (isRTL ? 'ذهب عيار 18' : '18K Gold') : 
                 index % 3 === 1 ? (isRTL ? 'فضة استرليني' : 'Sterling Silver') : 
                 (isRTL ? 'لؤلؤ طبيعي' : 'Natural Pearl'),
        color: index % 4 === 0 ? (isRTL ? 'ذهبي' : 'Gold') :
               index % 4 === 1 ? (isRTL ? 'فضي' : 'Silver') :
               index % 4 === 2 ? (isRTL ? 'ذهبي وردي' : 'Rose Gold') :
               (isRTL ? 'أبيض' : 'White'),
        size: index % 3 === 0 ? 'M' : index % 3 === 1 ? 'L' : 'S',
        weight: `${(Math.random() * 50 + 10).toFixed(1)}g`,
        dimensions: `${(Math.random() * 5 + 2).toFixed(1)} x ${(Math.random() * 5 + 2).toFixed(1)}cm`,
        quality_score: Math.random() * 1 + 4,
        durability: Math.random() * 1 + 4,
        value_rating: Math.random() * 1 + 4,
        stock_status: index % 3 === 0 ? 'in_stock' : index % 3 === 1 ? 'low_stock' : 'pre_order',
        shipping_time: index % 2 === 0 ? (isRTL ? '2-3 أيام' : '2-3 days') : (isRTL ? '5-7 أيام' : '5-7 days'),
        warranty: index % 2 === 0 ? (isRTL ? 'سنة واحدة' : '1 Year') : (isRTL ? 'سنتان' : '2 Years'),
        return_policy: isRTL ? '30 يوم إرجاع مجاني' : '30-day free returns'
      };
    });
    return mockData;
  };

  const searchProducts = async (query) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      setIsSearching(true);
      const response = await axios.get(`${API}/search?q=${encodeURIComponent(query)}&limit=10`);
      const results = response.data || [];
      
      // Filter out already compared products
      const filtered = results.filter(product => 
        !comparisonProducts.some(cp => cp.id === product.id)
      );
      
      setSearchResults(filtered);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const addProductToComparison = (product) => {
    if (comparisonProducts.length < maxComparisons) {
      setComparisonProducts([...comparisonProducts, product]);
      setSearchQuery('');
      setSearchResults([]);
    }
  };

  const removeProductFromComparison = (productId) => {
    setComparisonProducts(comparisonProducts.filter(p => p.id !== productId));
  };

  const formatValue = (field, value, productId) => {
    if (!value && value !== 0) return '-';

    switch (field.type) {
      case 'price':
        return formatCurrency(value);
      case 'percentage':
        return value ? `${value}%` : '-';
      case 'rating':
        return (
          <div className="flex items-center">
            <div className="flex">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`h-4 w-4 ${
                    i < Math.floor(value) ? 'text-yellow-400 fill-current' : 'text-gray-300'
                  }`}
                />
              ))}
            </div>
            <span className="ml-1 text-sm text-gray-600">{value.toFixed(1)}</span>
          </div>
        );
      case 'status':
        const statusColors = {
          in_stock: 'text-green-600 bg-green-100',
          low_stock: 'text-yellow-600 bg-yellow-100',
          out_of_stock: 'text-red-600 bg-red-100',
          pre_order: 'text-blue-600 bg-blue-100'
        };
        const statusLabels = {
          in_stock: isRTL ? 'متوفر' : 'In Stock',
          low_stock: isRTL ? 'مخزون قليل' : 'Low Stock',
          out_of_stock: isRTL ? 'غير متوفر' : 'Out of Stock',
          pre_order: isRTL ? 'طلب مسبق' : 'Pre-order'
        };
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[value] || 'text-gray-600 bg-gray-100'}`}>
            {statusLabels[value] || value}
          </span>
        );
      case 'color':
        return (
          <div className="flex items-center">
            <div 
              className="w-4 h-4 rounded-full border border-gray-300 mr-2"
              style={{ 
                backgroundColor: value === 'Gold' || value === 'ذهبي' ? '#FFD700' :
                               value === 'Silver' || value === 'فضي' ? '#C0C0C0' :
                               value === 'Rose Gold' || value === 'ذهبي وردي' ? '#E8B4B8' :
                               '#FFFFFF'
              }}
            />
            {value}
          </div>
        );
      case 'number':
        return value.toLocaleString();
      default:
        return value;
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat(isRTL ? 'ar-SA' : 'en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const getBestValue = (field, products) => {
    if (field.type === 'price') {
      return Math.min(...products.map(p => comparisonData[p.id]?.[field.key] || Infinity));
    }
    if (field.type === 'rating') {
      return Math.max(...products.map(p => comparisonData[p.id]?.[field.key] || 0));
    }
    return null;
  };

  const isBestValue = (field, value, products) => {
    const bestValue = getBestValue(field, products);
    if (bestValue === null) return false;
    
    if (field.type === 'price') {
      return value === bestValue;
    }
    if (field.type === 'rating') {
      return Math.abs(value - bestValue) < 0.1;
    }
    return false;
  };

  const containerClass = isModal 
    ? "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
    : "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8";

  const contentClass = isModal
    ? "bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto"
    : "";

  return (
    <div className={containerClass} dir={isRTL ? 'rtl' : 'ltr'}>
      <div className={contentClass}>
        {/* Header */}
        <div className={`${isModal ? 'p-6' : ''} border-b border-gray-200`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Scale className="h-8 w-8 text-amber-600 mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {isRTL ? 'مقارنة المنتجات' : 'Product Comparison'}
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  {isRTL ? `قارن حتى ${maxComparisons} منتجات جنباً إلى جنب` : `Compare up to ${maxComparisons} products side by side`}
                </p>
              </div>
            </div>
            {onClose && (
              <Button onClick={onClose} variant="ghost" size="sm">
                <X className="h-5 w-5" />
              </Button>
            )}
          </div>

          {/* Add Product Search */}
          {comparisonProducts.length < maxComparisons && (
            <div className="mt-4">
              <div className="relative">
                <Input
                  type="text"
                  placeholder={isRTL ? 'ابحث عن منتجات لإضافتها للمقارنة...' : 'Search for products to add to comparison...'}
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    searchProducts(e.target.value);
                  }}
                  className="w-full"
                />
                {isSearching && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <RefreshCw className="h-4 w-4 animate-spin text-gray-400" />
                  </div>
                )}
              </div>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                  {searchResults.map((product) => (
                    <button
                      key={product.id}
                      onClick={() => addProductToComparison(product)}
                      className="w-full flex items-center p-3 hover:bg-gray-50 transition-colors text-left"
                    >
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-12 h-12 object-cover rounded-lg mr-3"
                      />
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 text-sm">{product.name}</h4>
                        <p className="text-sm text-gray-600">{formatCurrency(product.price)}</p>
                      </div>
                      <Plus className="h-5 w-5 text-amber-600" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Comparison Content */}
        <div className={`${isModal ? 'p-6' : 'pt-6'}`}>
          {comparisonProducts.length === 0 ? (
            <div className="text-center py-12">
              <Scale className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {isRTL ? 'لا توجد منتجات للمقارنة' : 'No products to compare'}
              </h3>
              <p className="text-gray-600">
                {isRTL ? 'ابحث عن المنتجات وأضفها للمقارنة' : 'Search for products and add them to comparison'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                {/* Product Headers */}
                <thead>
                  <tr>
                    <th className="text-left p-4 bg-gray-50 border border-gray-200 min-w-48">
                      {isRTL ? 'المقارنة' : 'Comparison'}
                    </th>
                    {comparisonProducts.map((product) => (
                      <th key={product.id} className="p-4 bg-gray-50 border border-gray-200 min-w-64">
                        <div className="relative">
                          <button
                            onClick={() => removeProductFromComparison(product.id)}
                            className="absolute -top-2 -right-2 p-1 bg-red-100 text-red-600 rounded-full hover:bg-red-200 transition-colors"
                          >
                            <X className="h-4 w-4" />
                          </button>
                          
                          <img
                            src={product.image}
                            alt={product.name}
                            className="w-24 h-24 object-cover rounded-lg mx-auto mb-3"
                          />
                          <h3 className="font-semibold text-gray-900 mb-2 text-sm">
                            {product.name}
                          </h3>
                          <p className="text-lg font-bold text-amber-600">
                            {formatCurrency(product.price)}
                          </p>
                          
                          <div className="flex gap-2 mt-3">
                            <Button size="sm" className="flex-1">
                              <ShoppingCart className="h-4 w-4 mr-1" />
                              {isRTL ? 'أضف' : 'Add'}
                            </Button>
                            <Button size="sm" variant="outline">
                              <Heart className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>

                {/* Comparison Data */}
                <tbody>
                  {comparisonCriteria.map((section) => {
                    const SectionIcon = section.icon;
                    return (
                      <React.Fragment key={section.key}>
                        {/* Section Header */}
                        <tr>
                          <td 
                            colSpan={comparisonProducts.length + 1}
                            className="p-4 bg-amber-50 border border-gray-200 font-semibold text-gray-900"
                          >
                            <div className="flex items-center">
                              <SectionIcon className="h-5 w-5 text-amber-600 mr-2" />
                              {section.title}
                            </div>
                          </td>
                        </tr>
                        
                        {/* Section Fields */}
                        {section.fields.map((field) => (
                          <tr key={field.key} className="hover:bg-gray-50">
                            <td className="p-4 border border-gray-200 font-medium text-gray-700">
                              {field.label}
                            </td>
                            {comparisonProducts.map((product) => {
                              const value = comparisonData[product.id]?.[field.key];
                              const isHighlighted = isBestValue(field, value, comparisonProducts);
                              
                              return (
                                <td 
                                  key={product.id} 
                                  className={`p-4 border border-gray-200 ${
                                    isHighlighted ? 'bg-green-50 border-green-200' : ''
                                  }`}
                                >
                                  <div className="flex items-center justify-between">
                                    {formatValue(field, value, product.id)}
                                    {isHighlighted && (
                                      <Check className="h-4 w-4 text-green-600 ml-2" />
                                    )}
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {comparisonProducts.length > 0 && (
          <div className={`${isModal ? 'p-6' : ''} border-t border-gray-200 flex items-center justify-between`}>
            <div className="flex items-center gap-4">
              <Button variant="outline">
                <Share2 className="h-4 w-4 mr-2" />
                {isRTL ? 'مشاركة المقارنة' : 'Share Comparison'}
              </Button>
              <Button variant="outline">
                <Eye className="h-4 w-4 mr-2" />
                {isRTL ? 'حفظ المقارنة' : 'Save Comparison'}
              </Button>
            </div>
            
            <div className="text-sm text-gray-600">
              {isRTL ? 
                `${comparisonProducts.length} من ${maxComparisons} منتجات` :
                `${comparisonProducts.length} of ${maxComparisons} products`
              }
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductComparison;