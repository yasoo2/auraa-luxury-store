import React, { useEffect, useState } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { apiGet, apiPost, apiPut, apiDelete } from '../../api';

const QuickImportPage = () => {
  const [language, setLanguage] = useState('ar');
  const [backendReady, setBackendReady] = useState(false);
  const [productCount, setProductCount] = useState(50);
  // "sweep" fills every category of the shop evenly; "keyword" fetches one
  // search only. One generic keyword filled the shop with lookalikes.
  const [importMode, setImportMode] = useState('sweep');
  const [keyword, setKeyword] = useState('luxury jewelry accessories');
  const [isImporting, setIsImporting] = useState(false);
  const [importCounter, setImportCounter] = useState(0);
  const [byCategory, setByCategory] = useState({});
  const [stagingProducts, setStagingProducts] = useState([]);
  const [editingProduct, setEditingProduct] = useState(null);
  const [isPublishing, setIsPublishing] = useState(false);

  const CATEGORY_LABELS = {
    earrings: { ar: 'أقراط', en: 'Earrings' },
    necklaces: { ar: 'قلادات', en: 'Necklaces' },
    bracelets: { ar: 'أساور', en: 'Bracelets' },
    rings: { ar: 'خواتم', en: 'Rings' },
    watches: { ar: 'ساعات', en: 'Watches' },
    sets: { ar: 'أطقم', en: 'Sets' },
  };

  useEffect(() => {
    checkBackendHealth();
  }, []);

  const checkBackendHealth = async () => {
    try {
      const healthResponse = await apiGet('/api/health');
      const readyResponse = await apiGet('/api/readiness');
      
      if (healthResponse?.status === 'ok' && readyResponse?.status === 'ready') {
        setBackendReady(true);
        toast.success('✅ الخلفية جاهزة!', { autoClose: 2000 });
      } else {
        setBackendReady(false);
        toast.warning('⚠️ الخلفية غير جاهزة تماماً', { autoClose: 3000 });
      }
    } catch (error) {
      setBackendReady(false);
      toast.error('❌ فشل الاتصال بالخلفية', { autoClose: 3000 });
    }
  };

  const handleImportNow = async () => {
    if (!backendReady) {
      toast.error('❌ الخلفية غير جاهزة');
      return;
    }

    if (productCount < 1 || productCount > 1000) {
      toast.error('❌ الرجاء إدخال عدد بين 1 و 1000');
      return;
    }

    setIsImporting(true);
    setImportCounter(0);
    setByCategory({});
    setStagingProducts([]);

    toast.info(`🚀 بدء استيراد ${productCount} منتج...`);

    try {
      // Start import job
      const response = await apiPost('/api/imports/start', {
        source: 'cj',
        count: productCount,
        batch_size: 20,
        mode: importMode,
        keyword: importMode === 'keyword' ? keyword : 'luxury jewelry accessories'
      });

      const jobId = response.jobId;
      
      // Poll for progress and get products in real-time
      pollImportProgress(jobId);

    } catch (error) {
      console.error('Import error:', error);
      toast.error(`❌ فشل الاستيراد: ${error.response?.data?.detail || error.message}`);
      setIsImporting(false);
    }
  };

  const pollImportProgress = async (jobId) => {
    const pollInterval = setInterval(async () => {
      try {
        const status = await apiGet(`/api/imports/${jobId}/status`);

        setImportCounter(status.processed || 0);
        setByCategory(status.by_category || {});

        // Get imported products from staging area
        if (status.processed > 0) {
          const products = await apiGet(`/api/products/staging?job_id=${jobId}`);
          setStagingProducts(products || []);
        }

        if (status.state === 'completed') {
          clearInterval(pollInterval);
          setIsImporting(false);
          // The report speaks in the job's real numbers. `processed` counts
          // items *looked at* — reporting it as "imported" once told the
          // owner fifty products arrived when every one had been refused as
          // a duplicate and the shop gained nothing.
          const imported = status.imported || 0;
          const skipped = status.skipped_existing || 0;
          const failed = status.failed || 0;
          const details = [];
          if (skipped > 0) details.push(`${skipped} موجود مسبقاً`);
          if (failed > 0) details.push(`${failed} فشل`);
          const suffix = details.length ? ` (${details.join('، ')})` : '';
          if (imported > 0) {
            const cats = Object.entries(status.by_category || {})
              .map(([cat, n]) => `${CATEGORY_LABELS[cat]?.ar || cat} ${n}`)
              .join('، ');
            toast.success(`✅ اكتمل الاستيراد: ${imported} منتج جديد${suffix}${cats ? ` — ${cats}` : ''}`, { autoClose: 10000 });
          } else {
            toast.warning(`⚠️ لم يُستورد أي منتج جديد${suffix || ' — لم يصل شيء من المورد'}`);
          }
        } else if (status.state === 'failed') {
          clearInterval(pollInterval);
          setIsImporting(false);
          toast.error(`❌ فشل الاستيراد: ${status.error}`);
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 2000);
  };

  const handleEditProduct = (product) => {
    setEditingProduct({ ...product });
  };

  const handleSaveProduct = async () => {
    if (!editingProduct) return;

    try {
      await apiPut(`/api/products/staging/${editingProduct.id}`, editingProduct);
      
      // Update in staging list
      setStagingProducts(prev => 
        prev.map(p => p.id === editingProduct.id ? editingProduct : p)
      );
      
      setEditingProduct(null);
      toast.success('✅ تم حفظ التعديلات');
    } catch (error) {
      toast.error('❌ فشل حفظ التعديلات');
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (!window.confirm('هل تريد حذف هذا المنتج؟')) return;

    try {
      await apiDelete(`/api/products/staging/${productId}`);
      setStagingProducts(prev => prev.filter(p => p.id !== productId));
      toast.success('✅ تم حذف المنتج');
    } catch (error) {
      toast.error('❌ فشل حذف المنتج');
    }
  };

  const handlePublishLive = async () => {
    if (stagingProducts.length === 0) {
      toast.error('❌ لا توجد منتجات للنشر');
      return;
    }

    if (!window.confirm(`هل تريد نشر ${stagingProducts.length} منتج إلى المتجر؟`)) {
      return;
    }

    setIsPublishing(true);
    toast.info('🚀 جاري نشر المنتجات...');

    try {
      const response = await apiPost('/api/products/publish-staging', {
        product_ids: stagingProducts.map(p => p.id)
      });

      toast.success(`✅ تم نشر ${response.published} منتج إلى المتجر!`);
      setStagingProducts([]);
      setImportCounter(0);
    } catch (error) {
      toast.error(`❌ فشل النشر: ${error.message || 'حدث خطأ'}`);
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black p-8">
      <ToastContainer position="top-right" theme="dark" />
      
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600 drop-shadow-lg">
            ✨ {language === 'ar' ? 'الاستيراد السريع' : 'Quick Import'} ✨
          </h1>
          <button
            onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
            className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
          >
            {language === 'ar' ? 'EN' : 'عربي'}
          </button>
        </div>

        {/* Backend Status - GREEN */}
        <div className={`p-4 rounded-lg mb-6 ${backendReady ? 'bg-green-900/30 border-green-500' : 'bg-red-900/30 border-red-500'} border-2`}>
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${backendReady ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
            <span className="text-white font-semibold">
              {backendReady 
                ? (language === 'ar' ? '🟢 Live - النظام جاهز' : '🟢 Live - System Ready')
                : (language === 'ar' ? '🔴 غير جاهز' : '🔴 Not Ready')
              }
            </span>
            <button
              onClick={checkBackendHealth}
              className="ml-auto px-3 py-1 bg-gray-700 text-white rounded hover:bg-gray-600 text-sm"
            >
              {language === 'ar' ? 'إعادة الفحص' : 'Recheck'}
            </button>
          </div>
        </div>

        {/* Import Control - Input + RED Button */}
        <div className="bg-gray-800 p-6 rounded-lg mb-6">
          {/* Mode: sweep every shelf, or chase one search phrase */}
          <div className="mb-4">
            <label className="block text-white font-semibold mb-2">
              {language === 'ar' ? '🧭 وضع الاستيراد' : '🧭 Import Mode'}
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <label className={`flex-1 flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer ${importMode === 'sweep' ? 'border-amber-500 bg-amber-500/10' : 'border-gray-600 bg-gray-700/40'}`}>
                <input
                  type="radio"
                  name="import-mode"
                  checked={importMode === 'sweep'}
                  onChange={() => setImportMode('sweep')}
                  disabled={isImporting}
                  className="mt-1"
                  data-testid="import-mode-sweep"
                />
                <span className="text-white text-sm">
                  <span className="font-bold block">{language === 'ar' ? '🧺 تغطية كل الفئات (موصى به)' : '🧺 Sweep all categories (recommended)'}</span>
                  {language === 'ar'
                    ? 'يمسح أقراطاً وقلادات وأساور وخواتم وساعات وأطقماً وزينة بكلمات بحث متعددة، ويوزّع العدد عليها بالتساوي'
                    : 'Searches earrings, necklaces, bracelets, rings, watches, sets and adornments with many phrasings, splitting the count evenly'}
                </span>
              </label>
              <label className={`flex-1 flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer ${importMode === 'keyword' ? 'border-amber-500 bg-amber-500/10' : 'border-gray-600 bg-gray-700/40'}`}>
                <input
                  type="radio"
                  name="import-mode"
                  checked={importMode === 'keyword'}
                  onChange={() => setImportMode('keyword')}
                  disabled={isImporting}
                  className="mt-1"
                  data-testid="import-mode-keyword"
                />
                <span className="text-white text-sm">
                  <span className="font-bold block">{language === 'ar' ? '🔍 كلمة بحث واحدة' : '🔍 Single keyword'}</span>
                  {language === 'ar' ? 'لجلب نوع محدد تختاره أنت' : 'Fetch one specific kind you choose'}
                </span>
              </label>
            </div>
            {importMode === 'keyword' && (
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                disabled={isImporting}
                className="mt-3 w-full px-4 py-3 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder={language === 'ar' ? 'مثال: pearl earrings' : 'e.g. pearl earrings'}
                data-testid="import-keyword-input"
              />
            )}
          </div>

          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="block text-white font-semibold mb-2">
                {language === 'ar' ? '📦 عدد المنتجات (1-1000)' : '📦 Number of Products (1-1000)'}
              </label>
              <input
                type="number"
                min="1"
                max="1000"
                value={productCount}
                onChange={(e) => setProductCount(parseInt(e.target.value) || 1)}
                disabled={isImporting}
                className="w-full px-4 py-3 bg-gray-700 text-white rounded-lg text-xl font-bold focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="50"
              />
            </div>

            {/* RED Import Button */}
            <button
              onClick={handleImportNow}
              disabled={!backendReady || isImporting}
              className={`px-8 py-12 rounded-xl font-bold text-white text-xl transition-all duration-300 transform ${
                backendReady && !isImporting
                  ? 'bg-gradient-to-r from-red-500 to-red-700 hover:scale-105 hover:shadow-2xl cursor-pointer'
                  : 'bg-gray-700 text-gray-400 cursor-not-allowed'
              } ${isImporting ? 'animate-pulse' : ''}`}
            >
              <div className="flex flex-col items-center gap-2">
                <div className="text-3xl">{isImporting ? '⏳' : '🔴'}</div>
                <div>{language === 'ar' ? 'استيراد الآن' : 'Import Now'}</div>
                {isImporting && (
                  <div className="text-sm font-normal">
                    {language === 'ar' ? `جاري التحميل: ${importCounter}` : `Loading: ${importCounter}`}
                  </div>
                )}
              </div>
            </button>
          </div>
        </div>

        {/* Import Counter */}
        {isImporting && (
          <div className="bg-gray-800 p-4 rounded-lg mb-6 text-center">
            <div className="text-3xl font-bold text-amber-400 mb-2">
              {importCounter} / {productCount}
            </div>
            <div className="text-white">
              {language === 'ar' ? '📦 جاري تنزيل المنتجات...' : '📦 Downloading Products...'}
            </div>
          </div>
        )}

        {/* Where the new arrivals landed, shelf by shelf */}
        {Object.keys(byCategory).length > 0 && (
          <div className="bg-gray-800 p-4 rounded-lg mb-6" data-testid="import-by-category">
            <div className="text-white font-semibold mb-3">
              {language === 'ar' ? '🗂️ توزيع الجديد على الفئات' : '🗂️ New arrivals by category'}
            </div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(byCategory).map(([cat, n]) => (
                <span key={cat} className="px-3 py-1.5 bg-amber-500/15 border border-amber-500/40 text-amber-300 rounded-full text-sm">
                  {(language === 'ar' ? CATEGORY_LABELS[cat]?.ar : CATEGORY_LABELS[cat]?.en) || cat}: {n}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Staging Products List */}
        {stagingProducts.length > 0 && (
          <div className="bg-gray-800 p-6 rounded-lg mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-white">
                {language === 'ar' ? `📦 المنتجات المستوردة (${stagingProducts.length})` : `📦 Imported Products (${stagingProducts.length})`}
              </h2>
              
              {/* GREEN Live Button */}
              <button
                onClick={handlePublishLive}
                disabled={isPublishing || stagingProducts.length === 0}
                className={`px-6 py-3 rounded-lg font-bold text-white text-lg transition-all duration-300 ${
                  !isPublishing && stagingProducts.length > 0
                    ? 'bg-gradient-to-r from-green-500 to-green-700 hover:scale-105 hover:shadow-xl cursor-pointer'
                    : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🟢</span>
                  <span>{language === 'ar' ? 'Live - نشر للمتجر' : 'Live - Publish'}</span>
                </div>
              </button>
            </div>

            {/* Products Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {stagingProducts.map((product, index) => (
                <div key={product.id} className="bg-gray-700 rounded-lg p-4 hover:bg-gray-600 transition">
                  <div className="text-amber-400 font-bold mb-2">#{index + 1}</div>
                  
                  {product.images && product.images[0] && (
                    <img 
                      src={product.images[0]} 
                      alt={product.name}
                      className="w-full h-48 object-cover rounded mb-3"
                    />
                  )}
                  
                  <h3 className="text-white font-bold mb-2 truncate">{product.name}</h3>
                  <p className="text-green-400 font-bold text-xl mb-0.5">{product.price} SAR</p>
                  {Number(product.supplier_price) > 0 && (
                    <p className="text-xs text-red-400 mb-2">
                      التكلفة <span dir="ltr">${Number(product.supplier_price).toFixed(2)}</span>
                    </p>
                  )}
                  <p className="text-gray-400 text-sm mb-3 line-clamp-2">{product.description}</p>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditProduct(product)}
                      className="flex-1 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                    >
                      ✏️ {language === 'ar' ? 'تعديل' : 'Edit'}
                    </button>
                    <button
                      onClick={() => handleDeleteProduct(product.id)}
                      className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {editingProduct && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold text-white mb-4">
                {language === 'ar' ? '✏️ تعديل المنتج' : '✏️ Edit Product'}
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-white mb-2">
                    {language === 'ar' ? 'الاسم' : 'Name'}
                  </label>
                  <input
                    type="text"
                    value={editingProduct.name || ''}
                    onChange={(e) => setEditingProduct({...editingProduct, name: e.target.value})}
                    className="w-full px-4 py-2 bg-gray-700 text-white rounded"
                  />
                </div>

                <div>
                  <label className="block text-white mb-2">
                    {language === 'ar' ? 'الاسم بالعربي' : 'Name (Arabic)'}
                  </label>
                  <input
                    type="text"
                    value={editingProduct.name_ar || ''}
                    onChange={(e) => setEditingProduct({...editingProduct, name_ar: e.target.value})}
                    className="w-full px-4 py-2 bg-gray-700 text-white rounded"
                  />
                </div>

                <div>
                  <label className="block text-white mb-2">
                    {language === 'ar' ? 'السعر (ريال)' : 'Price (SAR)'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingProduct.price || 0}
                    onChange={(e) => setEditingProduct({...editingProduct, price: parseFloat(e.target.value)})}
                    className="w-full px-4 py-2 bg-gray-700 text-white rounded"
                  />
                </div>

                <div>
                  <label className="block text-white mb-2">
                    {language === 'ar' ? 'الوصف' : 'Description'}
                  </label>
                  <textarea
                    value={editingProduct.description || ''}
                    onChange={(e) => setEditingProduct({...editingProduct, description: e.target.value})}
                    className="w-full px-4 py-2 bg-gray-700 text-white rounded h-24"
                  />
                </div>

                <div>
                  <label className="block text-white mb-2">
                    {language === 'ar' ? 'رابط الصورة' : 'Image URL'}
                  </label>
                  <input
                    type="text"
                    value={editingProduct.images?.[0] || ''}
                    onChange={(e) => setEditingProduct({...editingProduct, images: [e.target.value]})}
                    className="w-full px-4 py-2 bg-gray-700 text-white rounded"
                  />
                </div>

                <div className="flex gap-4 mt-6">
                  <button
                    onClick={handleSaveProduct}
                    className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold"
                  >
                    ✅ {language === 'ar' ? 'حفظ' : 'Save'}
                  </button>
                  <button
                    onClick={() => setEditingProduct(null)}
                    className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-500"
                  >
                    ❌ {language === 'ar' ? 'إلغاء' : 'Cancel'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Info Section */}
        <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700 mt-6">
          <h3 className="text-xl font-bold text-white mb-4">
            {language === 'ar' ? '📋 كيفية الاستخدام' : '📋 How to Use'}
          </h3>
          <ol className="space-y-2 text-gray-300" style={{direction: language === 'ar' ? 'rtl' : 'ltr'}}>
            <li>1️⃣ {language === 'ar' ? 'اختر الوضع: تغطية كل الفئات (موصى به) أو كلمة بحث واحدة' : 'Pick a mode: sweep all categories (recommended) or a single keyword'}</li>
            <li>2️⃣ {language === 'ar' ? 'أدخل العدد (1-1000) واضغط "استيراد الآن" 🔴 — يُجلب الجديد فقط ويُتخطى ما تملكه' : 'Enter the count (1-1000) and press "Import Now" 🔴 — only NEW products arrive, owned ones are skipped'}</li>
            <li>3️⃣ {language === 'ar' ? 'كرّر الاستيراد متى شئت لمراكمة الآلاف: كل تشغيلة تحفر أعمق في المورد' : 'Repeat whenever you like to stack up thousands: every run digs deeper into the supplier'}</li>
            <li>4️⃣ {language === 'ar' ? 'عدّل المنتجات (السعر، الاسم، الصورة، الوصف)' : 'Edit products (price, name, image, description)'}</li>
            <li>5️⃣ {language === 'ar' ? 'اضغط على زر "Live" الأخضر 🟢 لنشر المنتجات للمتجر' : 'Click the green "Live" button 🟢 to publish to store'}</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default QuickImportPage;
