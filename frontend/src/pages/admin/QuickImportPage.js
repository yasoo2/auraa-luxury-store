import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import {
  Package,
  Download,
  CheckCircle,
  XCircle,
  RefreshCw,
  Eye,
  ArrowRight,
  TrendingUp,
  Clock,
  Filter,
  Search
} from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const QuickImportPage = () => {
  const { t, language } = useLanguage();
  const isRTL = language === 'ar';

  // State
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(null);
  const [externalProducts, setExternalProducts] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [supplierType, setSupplierType] = useState('aliexpress'); // New supplier selection
  const [importCount, setImportCount] = useState(500); // Default 500 products
  const [importQuery, setImportQuery] = useState('jewelry accessories'); // Default query
  const [filters, setFilters] = useState({
    category: '',
    pushed: false,
    search: ''
  });
  const [stats, setStats] = useState({
    total: 0,
    pushed: 0,
    pending: 0
  });
  const [importLogs, setImportLogs] = useState([]);
  const [pushing, setPushing] = useState(false);
  const [pollInterval, setPollInterval] = useState(null);

  // Load data on mount
  useEffect(() => {
    loadExternalProducts();

    return () => { if (pollInterval) clearInterval(pollInterval); };

    loadImportLogs();
  }, [filters]);

  const loadExternalProducts = async () => {
    try {
      const params = {
        source: 'aliexpress',
        pushed: filters.pushed || undefined,
        category: filters.category || undefined,
        limit: 50
      };

      const response = await axios.get(`${API_URL}/api/aliexpress/external-products`, { params });
      setExternalProducts(response.data.products);
      
      // Update stats
      setStats({
        total: response.data.total,
        pushed: response.data.products.filter(p => p.pushed_to_store).length,
        pending: response.data.products.filter(p => !p.pushed_to_store).length
      });
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const loadImportLogs = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/aliexpress/import-logs`, {
        params: { limit: 5 }
      });
      setImportLogs(response.data.logs);
    } catch (error) {
      console.error('Error loading logs:', error);
    }
  };

  // Remove old handleQuickImport - will be replaced with new multi-supplier version

  const handlePushToStore = async () => {
    if (selectedProducts.length === 0) {
      alert('يرجى اختيار منتجات للدفع');
      return;
    }

    setPushing(true);
    try {
      const response = await axios.post(`${API_URL}/api/aliexpress/push-to-store`, selectedProducts);
      
      alert(`تم دفع ${response.data.statistics.pushed} منتج للمتجر بنجاح!`);
      
      setSelectedProducts([]);
      await loadExternalProducts();
    } catch (error) {
      alert('فشل دفع المنتجات: ' + error.message);
    } finally {
      setPushing(false);
    }
  };

  const toggleProductSelection = (productId) => {
    setSelectedProducts(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const selectAllVisible = () => {
    const unpushedIds = externalProducts
      .filter(p => !p.pushed_to_store)
      .map(p => p._id);
    setSelectedProducts(unpushedIds);
  };

  // New Quick Import Function
  const handleQuickImport = async () => {
    if (!supplierType || importCount <= 0) {
      alert(isRTL ? 'يرجى تحديد نوع المورد وعدد صحيح من المنتجات' : 'Please select supplier type and valid product count');
      return;
    }

    setImporting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_URL}/api/admin/import-fast`, {
        count: importCount,
        query: importQuery,
        provider: supplierType
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
        // start polling progress
        if (pollInterval) clearInterval(pollInterval);
        const newPollInterval = setInterval(async () => {
          try {
            const token = localStorage.getItem('token');
            const jobId = response.data.task_id;
            const res = await axios.get(`${API_URL}/api/admin/import-jobs/${jobId}`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            const progress = res.data;
            setImportProgress({ job_id: progress.job_id, status: progress.status, percent: progress.percent, processed: progress.processed_items, total: progress.total_items });
            if (progress.status === 'completed' || progress.status === 'failed') {
              clearInterval(newPollInterval);
              setPollInterval(null);
            }
          } catch (e) {
            // stop polling on error
            clearInterval(newPollInterval);
            setPollInterval(null);
          }
        }, 2000);
        setPollInterval(newPollInterval);


      if (response.data.success) {
        alert(isRTL ? `تم بدء استيراد ${importCount} منتج بنجاح!` : `Successfully started importing ${importCount} products!`);
        setImportProgress({ job_id: response.data.task_id, status: 'pending', percent: 0 });
        await loadExternalProducts();
      } else {
        alert(isRTL ? 'فشل في بدء الاستيراد' : 'Failed to start import');
      }
    } catch (error) {
      console.error('Import error:', error);
      alert(isRTL ? 'حدث خطأ أثناء الاستيراد: ' + error.message : 'Error during import: ' + error.message);
    } finally {
      setImporting(false);
    }
  };

  // New Sync Now Function
  const handleSyncNow = async () => {
    setImporting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_URL}/api/admin/sync-now`, {
        provider: supplierType
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success) {
        alert(isRTL ? 'تم بدء مزامنة الأسعار والمخزون بنجاح!' : 'Successfully started price and inventory sync!');
        await loadExternalProducts();
      } else {
        alert(isRTL ? 'فشل في بدء المزامنة' : 'Failed to start sync');
      }
    } catch (error) {
      console.error('Sync error:', error);
      alert(isRTL ? 'حدث خطأ أثناء المزامنة: ' + error.message : 'Error during sync: ' + error.message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className={`p-6 ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {isRTL ? '🚀 استيراد سريع متعدد الموردين' : '🚀 Multi-Supplier Quick Import'}
        </h1>
        <p className="text-gray-600">
          {isRTL ? 'استيراد وإدارة المنتجات من موردين متعددين بنقرة واحدة' : 'Import and manage products from multiple suppliers with one click'}
        </p>
      </div>

      {/* Quick Import Controls */}
      <div className="bg-white rounded-lg border shadow-sm p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {isRTL ? 'استيراد سريع - 500 منتج' : 'Quick Import - 500 Products'}
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {/* Supplier Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {isRTL ? 'نوع المورد' : 'Supplier Type'}
            </label>
            <select 
              value={supplierType} 
              onChange={(e) => setSupplierType(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="aliexpress">{isRTL ? 'علي إكسبرس' : 'AliExpress'}</option>
              <option value="amazon">{isRTL ? 'أمازون' : 'Amazon'}</option>
              <option value="custom">{isRTL ? 'مورد مخصص' : 'Custom Supplier'}</option>
            </select>
          </div>

          {/* Import Count */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {isRTL ? 'عدد المنتجات' : 'Product Count'}
            </label>
            <input 
              type="number" 
              value={importCount} 
              onChange={(e) => setImportCount(parseInt(e.target.value) || 500)}
              min="1"
              max="5000"
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Search Query */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {isRTL ? 'كلمة البحث' : 'Search Query'}
            </label>
            <input 
              type="text" 
              value={importQuery} 
              onChange={(e) => setImportQuery(e.target.value)}
              placeholder={isRTL ? 'مجوهرات إكسسوارات' : 'jewelry accessories'}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col space-y-2">
            <button
              onClick={handleQuickImport}
              disabled={importing}
              className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold py-2 px-4 rounded-md transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {importing ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {isRTL ? 'جاري الاستيراد...' : 'Importing...'}
                </div>
              ) : (
                isRTL ? 'استيراد سريع' : 'Quick Import'
              )}
            </button>
            
            <button
              onClick={handleSyncNow}
              disabled={importing}
              className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-2 px-4 rounded-md transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRTL ? 'مزامنة الآن' : 'Sync Now'}
            </button>
          </div>
        </div>

        {/* Import Progress */}
        {importProgress && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <div className="flex items-center justify-between">
              <p className="text-sm text-blue-800">
                {isRTL ? `معرف المهمة: ${importProgress.job_id}` : `Task ID: ${importProgress.job_id}`}
              </p>
              <p className="text-sm text-blue-800 font-semibold">
                {importProgress.percent ?? 0}%
              </p>
            </div>
            <div className="w-full bg-blue-100 rounded-full h-2 mt-2">
              <div className="bg-blue-600 h-2 rounded-full transition-all duration-300" style={{ width: `${importProgress.percent ?? 0}%` }}></div>
            </div>
            <p className="text-sm text-blue-600 mt-2">
              {isRTL ? 'جاري معالجة الاستيراد في الخلفية...' : 'Processing import in background...'}
            </p>
          </div>
        )}

        {/* Supplier Info */}
        <div className="mt-4 p-4 bg-gray-50 rounded-md">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">
            {isRTL ? 'معلومات المورد المحدد:' : 'Selected Supplier Info:'}
          </h4>
          <div className="text-sm text-gray-600">
            {supplierType === 'aliexpress' && (
              <p>{isRTL ? '• استيراد من علي إكسبرس مع تطبيق هامش ربح 100%' : '• Import from AliExpress with 100% markup'}</p>
            )}
            {supplierType === 'amazon' && (
              <p>{isRTL ? '• استيراد من أمازون (قيد التطوير)' : '• Import from Amazon (under development)'}</p>
            )}
            {supplierType === 'custom' && (
              <p>{isRTL ? '• مورد مخصص (قيد التطوير)' : '• Custom supplier (under development)'}</p>
            )}
            <p>{isRTL ? '• تحديث تلقائي للأسعار والمخزون كل 10 دقائق' : '• Automatic price and inventory update every 10 minutes'}</p>
            <p>{isRTL ? '• إضافة الضرائب والجمارك حسب الدولة' : '• Add taxes and customs by country'}</p>
            <p>{isRTL ? '• تصنيف تلقائي للمنتجات (أقراط، قلادات، أساور، خواتم، ساعات، أطقم)' : '• Automatic categorization (Earrings, Necklaces, Bracelets, Rings, Watches, Sets)'}</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600 font-medium">{isRTL ? 'إجمالي المنتجات' : 'Total Products'}</p>
              <p className="text-2xl font-bold text-blue-900">{stats.total}</p>
            </div>
            <Package className="h-10 w-10 text-blue-500" />
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-600 font-medium">{isRTL ? 'في المتجر' : 'In Store'}</p>
              <p className="text-2xl font-bold text-green-900">{stats.pushed}</p>
            </div>
            <CheckCircle className="h-10 w-10 text-green-500" />
          </div>
        </div>

        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-orange-600 font-medium">{isRTL ? 'قيد الانتظار' : 'Pending'}</p>
              <p className="text-2xl font-bold text-orange-900">{stats.pending}</p>
            </div>
            <Clock className="h-10 w-10 text-orange-500" />
          </div>
        </div>
      </div>

      {/* Sync Now Button */}
      <div className="flex justify-end mb-4">
        <button
          onClick={async () => {
            try {
              await axios.post(`${API_URL}/api/admin/aliexpress/sync-now`);
              alert(isRTL ? 'تم بدء المزامنة!' : 'Sync started!');
              await loadImportLogs();
            } catch (error) {
              alert(isRTL ? 'فشل المزامنة' : 'Sync failed');
            }
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          {isRTL ? 'تحديث الآن (يدوي)' : 'Sync Now (Manual)'}
        </button>
      </div>

      {/* Quick Import Section */}
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-lg p-6 mb-6 text-white">
        <div className="flex flex-col md:flex-row items-center justify-between">
          <div className="mb-4 md:mb-0">
            <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
              <Download className="h-6 w-6" />
              {isRTL ? 'استيراد سريع - 1000 منتج' : 'Quick Import - 1000 Products'}
            </h2>
            <p className="text-white/90">
              {isRTL ? 'استيراد تلقائي لـ 1000 منتج موزعة على جميع الفئات' : 'Automatic import of 1000 products across all categories'}
            </p>
          </div>
          <button
            onClick={handleQuickImport}
            disabled={importing}
            className="bg-white text-orange-600 px-8 py-3 rounded-lg font-bold hover:bg-orange-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all"
          >
            {importing ? (
              <>
                <RefreshCw className="h-5 w-5 animate-spin" />
                {isRTL ? 'جاري الاستيراد...' : 'Importing...'}
              </>
            ) : (
              <>
                <Download className="h-5 w-5" />
                {isRTL ? 'استيراد الآن' : 'Import Now'}
              </>
            )}
          </button>
        </div>

        {/* Progress */}
        {importProgress && (
          <div className="mt-4 bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">{importProgress.message}</span>
              {importProgress.status === 'success' && <CheckCircle className="h-5 w-5 text-green-300" />}
              {importProgress.status === 'error' && <XCircle className="h-5 w-5 text-red-300" />}
            </div>
            {importProgress.status === 'running' && (
              <div className="w-full bg-white/20 rounded-full h-2">
                <div className="bg-white h-2 rounded-full transition-all duration-300" style={{ width: '50%' }}></div>
              </div>
            )}
            {importProgress.stats && (
              <div className="mt-2 text-sm grid grid-cols-4 gap-4">
                <div>
                  <span className="opacity-80">{isRTL ? 'جديد:' : 'New:'}</span>
                  <span className="font-bold ml-2">{importProgress.stats.inserted || 0}</span>
                </div>
                <div>
                  <span className="opacity-80">{isRTL ? 'محدّث:' : 'Updated:'}</span>
                  <span className="font-bold ml-2">{importProgress.stats.updated || 0}</span>
                </div>
                <div>
                  <span className="opacity-80">{isRTL ? 'متخطى:' : 'Skipped:'}</span>
                  <span className="font-bold ml-2">{importProgress.stats.skipped || 0}</span>
                </div>
                <div>
                  <span className="opacity-80">{isRTL ? 'أخطاء:' : 'Errors:'}</span>
                  <span className="font-bold ml-2">{importProgress.stats.errors?.length || 0}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* External Products Table */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 mb-6">
        <div className="p-4 border-b border-gray-200">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Eye className="h-5 w-5" />
              {isRTL ? 'المنتجات المستوردة' : 'Imported Products'}
            </h2>

            <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
              {/* Category Filter */}
              <select
                value={filters.category}
                onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                className="border border-gray-300 rounded-lg px-4 py-2"
              >
                <option value="">{isRTL ? 'جميع الفئات' : 'All Categories'}</option>
                <option value="earrings">{isRTL ? 'أقراط' : 'Earrings'}</option>
                <option value="necklaces">{isRTL ? 'قلادات' : 'Necklaces'}</option>
                <option value="bracelets">{isRTL ? 'أساور' : 'Bracelets'}</option>
                <option value="rings">{isRTL ? 'خواتم' : 'Rings'}</option>
                <option value="watches">{isRTL ? 'ساعات' : 'Watches'}</option>
                <option value="sets">{isRTL ? 'أطقم' : 'Sets'}</option>
              </select>

              {/* Status Filter */}
              <select
                value={filters.pushed}
                onChange={(e) => setFilters({ ...filters, pushed: e.target.value === 'true' })}
                className="border border-gray-300 rounded-lg px-4 py-2"
              >
                <option value="false">{isRTL ? 'قيد الانتظار' : 'Pending'}</option>
                <option value="true">{isRTL ? 'في المتجر' : 'In Store'}</option>
              </select>

              <button
                onClick={selectAllVisible}
                disabled={filters.pushed === 'true'}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {isRTL ? 'اختيار الكل' : 'Select All'}
              </button>

              <button
                onClick={handlePushToStore}
                disabled={selectedProducts.length === 0 || pushing}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
              >
                {pushing ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="h-4 w-4" />
                )}
                {isRTL ? `دفع للمتجر (${selectedProducts.length})` : `Push to Store (${selectedProducts.length})`}
              </button>
            </div>
          </div>
        </div>

        {/* Products Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedProducts.length === externalProducts.filter(p => !p.pushed_to_store).length}
                    onChange={() => selectedProducts.length > 0 ? setSelectedProducts([]) : selectAllVisible()}
                    className="rounded"
                  />
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  {isRTL ? 'الصورة' : 'Image'}
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  {isRTL ? 'الاسم' : 'Name'}
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  {isRTL ? 'الفئة' : 'Category'}
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  {isRTL ? 'السعر' : 'Price'}
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  {isRTL ? 'التقييم' : 'Rating'}
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  {isRTL ? 'الحالة' : 'Status'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {externalProducts.map((product) => (
                <tr key={product._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedProducts.includes(product._id)}
                      onChange={() => toggleProductSelection(product._id)}
                      disabled={product.pushed_to_store}
                      className="rounded"
                    />
                  </td>
                  <td className="px-4 py-3">
                    {product.images && product.images[0] && (
                      <img src={product.images[0]} alt={product.name_en} className="h-12 w-12 object-cover rounded" />
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    <div className="font-medium">{isRTL ? product.name_ar : product.name_en}</div>
                    <div className="text-xs text-gray-500">ID: {product.external_id}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                      {product.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    ${product.base_price_usd.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    ⭐ {product.rating ? product.rating.toFixed(1) : 'N/A'}
                  </td>
                  <td className="px-4 py-3">
                    {product.pushed_to_store ? (
                      <span className="inline-flex items-center gap-1 bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
                        <CheckCircle className="h-3 w-3" />
                        {isRTL ? 'في المتجر' : 'In Store'}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 bg-orange-100 text-orange-800 px-2 py-1 rounded text-xs">
                        <Clock className="h-3 w-3" />
                        {isRTL ? 'قيد الانتظار' : 'Pending'}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {externalProducts.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{isRTL ? 'لا توجد منتجات بعد. اضغط "استيراد الآن" للبدء!' : 'No products yet. Click "Import Now" to start!'}</p>
            </div>
          )}
        </div>
      </div>

      {/* Import Logs */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            {isRTL ? 'سجل الاستيراد' : 'Import Logs'}
          </h2>
        </div>
        <div className="p-4">
          {importLogs.map((log, index) => (
            <div key={index} className="mb-4 p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-gray-900">
                  {new Date(log.start_time).toLocaleString(isRTL ? 'ar-SA' : 'en-US')}
                </span>
                <span className="text-sm text-gray-600">
                  {log.duration_seconds.toFixed(1)}s
                </span>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">{isRTL ? 'تم الاستيراد:' : 'Imported:'}</span>
                  <span className="font-bold text-green-600 ml-2">{log.total_imported}</span>
                </div>
                <div>
                  <span className="text-gray-600">{isRTL ? 'متخطى:' : 'Skipped:'}</span>
                  <span className="font-bold text-yellow-600 ml-2">{log.total_skipped}</span>
                </div>
                <div>
                  <span className="text-gray-600">{isRTL ? 'أخطاء:' : 'Errors:'}</span>
                  <span className="font-bold text-red-600 ml-2">{log.total_errors}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default QuickImportPage;
