import React, { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import {
  Search,
  ShoppingCart,
  Download,
  Eye,
  Plus,
  DollarSign,
  Package,
  Star,
  ExternalLink,
  Loader2,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Filter,
  Settings
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';

const AliExpressPage = () => {
  const { language, currency, formatCurrency } = useLanguage();
  const isRTL = language === 'ar';
  const [searchResults, setSearchResults] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState({});
  const [syncingPrices, setSyncingPrices] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [importSettings, setImportSettings] = useState({
    markup_percentage: 50,
    category: 'imported',
    custom_name: '',
    custom_description: ''
  });

  const API_URL = process.env.REACT_APP_BACKEND_URL;

  const categories = [
    { value: 'imported', label: isRTL ? 'منتجات مستوردة' : 'Imported Products' },
    { value: 'necklaces', label: isRTL ? 'قلادات' : 'Necklaces' },
    { value: 'earrings', label: isRTL ? 'أقراط' : 'Earrings' },
    { value: 'rings', label: isRTL ? 'خواتم' : 'Rings' },
    { value: 'bracelets', label: isRTL ? 'أساور' : 'Bracelets' },
    { value: 'watches', label: isRTL ? 'ساعات' : 'Watches' },
    { value: 'sets', label: isRTL ? 'أطقم' : 'Sets' }
  ];

  const searchAliExpress = async () => {
    if (!searchTerm.trim()) return;

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${API_URL}/api/admin/aliexpress/search?keywords=${encodeURIComponent(searchTerm)}&page_size=20`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.products || []);
      } else {
        console.error('Search failed');
      }
    } catch (error) {
      console.error('Error searching AliExpress:', error);
    } finally {
      setLoading(false);
    }
  };

  const importProduct = async (product) => {
    setImporting({ ...importing, [product.product_id]: true });

    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('aliexpress_product_id', product.product_id);
      formData.append('custom_name', importSettings.custom_name || product.product_title);
      formData.append('custom_description', importSettings.custom_description || product.product_title);
      formData.append('markup_percentage', importSettings.markup_percentage);
      formData.append('category', importSettings.category);

      const response = await fetch(`${API_URL}/api/admin/aliexpress/import`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (response.ok) {
        const result = await response.json();
        alert(isRTL ? 'تم استيراد المنتج بنجاح!' : 'Product imported successfully!');
        setShowImportModal(false);
      } else {
        alert(isRTL ? 'فشل في استيراد المنتج' : 'Failed to import product');
      }
    } catch (error) {
      console.error('Error importing product:', error);
      alert(isRTL ? 'حدث خطأ أثناء الاستيراد' : 'Error occurred during import');
    } finally {
      setImporting({ ...importing, [product.product_id]: false });
      setSelectedProduct(null);
    }
  };

  const syncPrices = async () => {
    setSyncingPrices(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/admin/aliexpress/sync-prices`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        alert(
          isRTL 
            ? `تمت مزامنة الأسعار بنجاح! تم تحديث ${result.updated_count} منتج`
            : `Prices synced successfully! ${result.updated_count} products updated`
        );
      } else {
        alert(isRTL ? 'فشلت مزامنة الأسعار' : 'Price sync failed');
      }
    } catch (error) {
      console.error('Error syncing prices:', error);
      alert(isRTL ? 'حدث خطأ أثناء مزامنة الأسعار' : 'Error occurred during price sync');
    } finally {
      setSyncingPrices(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      searchAliExpress();
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {isRTL ? 'ربط علي إكسبريس' : 'AliExpress Integration'}
        </h1>
        <p className="text-gray-600">
          {isRTL ? 'البحث واستيراد المنتجات من علي إكسبريس' : 'Search and import products from AliExpress'}
        </p>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div className="lg:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              type="text"
              placeholder={isRTL ? 'ابحث عن المنتجات...' : 'Search for products...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={handleKeyPress}
              className="pl-10"
            />
          </div>

          {/* Search Button */}
          <Button 
            onClick={searchAliExpress} 
            disabled={loading || !searchTerm.trim()}
            className="bg-orange-500 hover:bg-orange-600"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Search className="h-4 w-4 mr-2" />
            )}
            {isRTL ? 'بحث' : 'Search'}
          </Button>

          {/* Sync Prices */}
          <Button 
            onClick={syncPrices} 
            disabled={syncingPrices}
            variant="outline"
          >
            {syncingPrices ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            {isRTL ? 'مزامنة الأسعار' : 'Sync Prices'}
          </Button>
        </div>
      </div>

      {/* Search Results */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-orange-500 mx-auto mb-4" />
            <p className="text-gray-600">{isRTL ? 'جارٍ البحث...' : 'Searching...'}</p>
          </div>
        </div>
      ) : searchResults.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {searchResults.map((product) => (
            <div key={product.product_id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              {/* Product Image */}
              <div className="relative h-48 bg-gray-100">
                <img
                  src={product.product_main_image_url}
                  alt={product.product_title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.src = 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400';
                  }}
                />
                {product.discount && (
                  <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded text-xs font-bold">
                    -{product.discount}
                  </div>
                )}
              </div>

              {/* Product Info */}
              <div className="p-4">
                <h3 className="font-medium text-gray-900 text-sm line-clamp-2 mb-2">
                  {product.product_title}
                </h3>

                {/* Pricing */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg font-bold text-green-600">
                    ${product.sale_price}
                  </span>
                  {product.original_price && product.original_price > product.sale_price && (
                    <span className="text-sm text-gray-500 line-through">
                      ${product.original_price}
                    </span>
                  )}
                </div>

                {/* Rating and Sales */}
                <div className="flex items-center justify-between mb-3 text-sm text-gray-600">
                  <div className="flex items-center">
                    <Star className="h-3 w-3 text-yellow-400 mr-1" />
                    <span>{product.evaluate_rate || '4.5'}</span>
                  </div>
                  <div className="flex items-center">
                    <ShoppingCart className="h-3 w-3 mr-1" />
                    <span>{product.volume || '0'} {isRTL ? 'مبيعات' : 'sold'}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => window.open(product.product_detail_url, '_blank')}
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    {isRTL ? 'عرض' : 'View'}
                  </Button>
                  
                  <Button
                    size="sm"
                    className="flex-1 bg-orange-500 hover:bg-orange-600"
                    onClick={() => {
                      setSelectedProduct(product);
                      setShowImportModal(true);
                    }}
                    disabled={importing[product.product_id]}
                  >
                    {importing[product.product_id] ? (
                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    ) : (
                      <Plus className="h-3 w-3 mr-1" />
                    )}
                    {isRTL ? 'استيراد' : 'Import'}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : searchTerm && !loading ? (
        <div className="text-center py-16">
          <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {isRTL ? 'لم يتم العثور على منتجات' : 'No Products Found'}
          </h3>
          <p className="text-gray-600">
            {isRTL ? 'حاول تغيير كلمات البحث' : 'Try different search terms'}
          </p>
        </div>
      ) : (
        <div className="text-center py-16">
          <Search className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {isRTL ? 'ابدأ البحث عن المنتجات' : 'Start Searching for Products'}
          </h3>
          <p className="text-gray-600">
            {isRTL ? 'استخدم شريط البحث للعثور على منتجات من علي إكسبريس' : 'Use the search bar to find products from AliExpress'}
          </p>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                {isRTL ? 'استيراد المنتج' : 'Import Product'}
              </h3>
            </div>

            <div className="p-6">
              {/* Product Preview */}
              <div className="flex gap-4 mb-6">
                <img
                  src={selectedProduct.product_main_image_url}
                  alt={selectedProduct.product_title}
                  className="w-24 h-24 object-cover rounded-lg"
                />
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 mb-2">{selectedProduct.product_title}</h4>
                  <div className="text-sm text-gray-600">
                    {isRTL ? 'السعر الأصلي:' : 'Original Price:'} ${selectedProduct.sale_price}
                  </div>
                  <div className="text-sm text-gray-600">
                    {isRTL ? 'السعر بعد الهامش:' : 'Price with markup:'} ${(selectedProduct.sale_price * (1 + importSettings.markup_percentage / 100)).toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Import Settings */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {isRTL ? 'اسم المنتج (اختياري)' : 'Custom Product Name (Optional)'}
                  </label>
                  <Input
                    value={importSettings.custom_name}
                    onChange={(e) => setImportSettings({...importSettings, custom_name: e.target.value})}
                    placeholder={selectedProduct.product_title}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {isRTL ? 'الوصف (اختياري)' : 'Custom Description (Optional)'}
                  </label>
                  <textarea
                    value={importSettings.custom_description}
                    onChange={(e) => setImportSettings({...importSettings, custom_description: e.target.value})}
                    placeholder={isRTL ? 'وصف مخصص للمنتج...' : 'Custom product description...'}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {isRTL ? 'نسبة الهامش (%)' : 'Markup Percentage (%)'}
                    </label>
                    <Input
                      type="number"
                      value={importSettings.markup_percentage}
                      onChange={(e) => setImportSettings({...importSettings, markup_percentage: parseFloat(e.target.value) || 0})}
                      min="0"
                      max="1000"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {isRTL ? 'الفئة' : 'Category'}
                    </label>
                    <select
                      value={importSettings.category}
                      onChange={(e) => setImportSettings({...importSettings, category: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      {categories.map(cat => (
                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowImportModal(false);
                  setSelectedProduct(null);
                }}
                className="flex-1"
              >
                {isRTL ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button
                onClick={() => importProduct(selectedProduct)}
                disabled={importing[selectedProduct.product_id]}
                className="flex-1 bg-orange-500 hover:bg-orange-600"
              >
                {importing[selectedProduct.product_id] ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                {isRTL ? 'استيراد المنتج' : 'Import Product'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AliExpressPage;