import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const API_BASE = process.env.REACT_APP_BACKEND_URL || '';

// جميع الأزرار المطلوبة في صفحة الاستيراد السريع
const IMPORT_BUTTONS = [
  // CJ Dropshipping Buttons
  { 
    label: 'استيراد 50 منتج (CJ)', 
    labelEn: 'Import 50 (CJ)',
    source: 'cj', 
    count: 50,
    color: 'from-green-500 to-green-700',
    keyword: 'luxury jewelry'
  },
  { 
    label: 'استيراد 100 منتج (CJ)', 
    labelEn: 'Import 100 (CJ)',
    source: 'cj', 
    count: 100,
    color: 'from-blue-500 to-blue-700',
    keyword: 'luxury watches'
  },
  { 
    label: 'استيراد 200 منتج (CJ)', 
    labelEn: 'Import 200 (CJ)',
    source: 'cj', 
    count: 200,
    color: 'from-purple-500 to-purple-700',
    keyword: 'luxury accessories'
  },
  { 
    label: 'استيراد 500 منتج (CJ)', 
    labelEn: 'Import 500 (CJ)',
    source: 'cj', 
    count: 500,
    color: 'from-orange-500 to-orange-700',
    keyword: 'luxury'
  },
  // AliExpress Buttons (if needed)
  { 
    label: 'استيراد 50 منتج (AliExpress)', 
    labelEn: 'Import 50 (AliExpress)',
    source: 'aliexpress', 
    count: 50,
    color: 'from-red-500 to-red-700',
    keyword: 'jewelry'
  },
];

export default function QuickImportPage() {
  const [backendReady, setBackendReady] = useState(false);
  const [loadingKey, setLoadingKey] = useState(null);
  const [currentJobId, setCurrentJobId] = useState(null);
  const [progress, setProgress] = useState({ processed: 0, total: 0, percent: 0 });
  const pollIntervalRef = useRef(null);
  const [language, setLanguage] = useState('ar');

  // فحص صحة Backend عند التحميل
  useEffect(() => {
    checkBackendHealth();
    
    // Check every 30 seconds
    const healthCheckInterval = setInterval(checkBackendHealth, 30000);
    
    return () => {
      clearInterval(healthCheckInterval);
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  const checkBackendHealth = async () => {
    try {
      const healthRes = await axios.get('/api/health', { 
        timeout: 5000
      });
      
      const readinessRes = await axios.get('/api/readiness', { 
        timeout: 5000
      });
      
      const isHealthy = healthRes.data?.status === 'ok';
      const isReady = readinessRes.data?.status === 'ready';
      
      setBackendReady(isHealthy && isReady);
      
      if (!isReady) {
        console.warn('Backend not fully ready:', readinessRes.data);
      }
    } catch (error) {
      console.error('Backend health check failed:', error);
      setBackendReady(false);
    }
  };

  const startPolling = (jobId) => {
    console.log('🔄 Starting progress polling for job:', jobId);
    
    // Clear any existing poll
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }

    pollIntervalRef.current = setInterval(async () => {
      try {
        const response = await axios.get(`/api/imports/${jobId}/status`);
        
        const status = response.data;
        
        console.log('📊 Import status:', status);

        if (status?.error) {
          toast.dismiss();
          toast.error(`❌ ${language === 'ar' ? 'فشل تتبع المهمة' : 'Job tracking failed'}: ${status.error}`);
          stopPolling();
          return;
        }

        setProgress({
          processed: status.processed || 0,
          total: status.total || 0,
          percent: status.percent || 0
        });

        if (status.state === 'completed') {
          toast.dismiss();
          toast.success(
            `✅ ${language === 'ar' ? 'تم الاستيراد بنجاح' : 'Import completed'}: ${status.imported || status.processed} ${language === 'ar' ? 'منتج' : 'products'}`,
            { autoClose: 5000 }
          );
          stopPolling();
        } else if (status.state === 'failed') {
          toast.dismiss();
          toast.error(
            `❌ ${language === 'ar' ? 'فشل الاستيراد' : 'Import failed'}: ${status.error || 'Unknown error'}`,
            { autoClose: 7000 }
          );
          stopPolling();
        } else if (status.state === 'running' || status.state === 'in_progress') {
          toast.dismiss();
          toast.info(
            `📦 ${language === 'ar' ? 'جاري الاستيراد' : 'Importing'}: ${status.processed}/${status.total} (${status.percent}%)`,
            { autoClose: 2000 }
          );
        }
      } catch (error) {
        console.error('Polling error:', error);
        // Continue polling even on error
      }
    }, 3000); // Poll every 3 seconds
  };

  const stopPolling = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    setLoadingKey(null);
    setCurrentJobId(null);
    setProgress({ processed: 0, total: 0, percent: 0 });
  };

  const handleImport = async (button, index) => {
    if (!backendReady) {
      toast.error(language === 'ar' ? 'الخلفية غير جاهزة. يرجى المحاولة لاحقاً.' : 'Backend not ready. Please try again later.');
      return;
    }

    if (loadingKey !== null) {
      toast.warning(language === 'ar' ? 'يوجد استيراد قيد التنفيذ بالفعل' : 'Import already in progress');
      return;
    }

    setLoadingKey(index);
    
    try {
      console.log(`🚀 Starting import: ${button.source} - ${button.count} products`);
      
      toast.info(`🚀 ${language === 'ar' ? 'بدء الاستيراد' : 'Starting import'} (${button.source} - ${button.count})...`);

      const response = await axios.post(
        '/api/imports/start',
        {
          source: button.source,
          count: button.count,
          batch_size: 50,
          keyword: button.keyword
        },
        { 
          timeout: 10000
        }
      );

      const data = response.data;
      
      console.log('✅ Import job created:', data);

      if (!data?.jobId) {
        throw new Error('No jobId received from server');
      }

      setCurrentJobId(data.jobId);
      
      toast.dismiss();
      toast.success(
        `✅ ${language === 'ar' ? 'تم بدء الاستيراد' : 'Import started'}: ${data.acceptedCount} ${language === 'ar' ? 'منتج' : 'products'}. ${language === 'ar' ? 'جاري المتابعة...' : 'Tracking progress...'}`,
        { autoClose: 3000 }
      );

      // Start polling for progress
      startPolling(data.jobId);

    } catch (error) {
      console.error('❌ Import start error:', error);
      
      const errorMsg = error.response?.data?.detail || error.message || 'Unknown error';
      
      toast.dismiss();
      toast.error(
        `⚠️ ${language === 'ar' ? 'خطأ أثناء بدء الاستيراد' : 'Error starting import'}: ${errorMsg}`,
        { autoClose: 7000 }
      );
      
      setLoadingKey(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black p-4">
      <ToastContainer position="top-right" theme="dark" />
      
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600">
            {language === 'ar' ? '✨ الاستيراد السريع ✨' : '✨ Quick Import ✨'}
          </h1>
          <button
            onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
            className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
          >
            {language === 'ar' ? 'EN' : 'عربي'}
          </button>
        </div>

        {/* Backend Status Indicator */}
        <div className={`p-4 rounded-lg mb-6 ${backendReady ? 'bg-green-900/30 border-green-500' : 'bg-red-900/30 border-red-500'} border-2`}>
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${backendReady ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
            <span className="text-white font-semibold">
              {backendReady 
                ? (language === 'ar' ? '✅ الخلفية جاهزة' : '✅ Backend Ready')
                : (language === 'ar' ? '❌ الخلفية غير جاهزة' : '❌ Backend Not Ready')
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

        {/* Progress Bar */}
        {currentJobId && progress.total > 0 && (
          <div className="bg-gray-800 p-6 rounded-lg mb-6">
            <div className="flex justify-between mb-2">
              <span className="text-white font-semibold">
                {language === 'ar' ? 'التقدم' : 'Progress'}: {progress.processed}/{progress.total}
              </span>
              <span className="text-amber-400 font-bold">{progress.percent}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-4">
              <div
                className="bg-gradient-to-r from-amber-400 to-amber-600 h-4 rounded-full transition-all duration-500"
                style={{ width: `${progress.percent}%` }}
              ></div>
            </div>
            <p className="text-gray-400 text-sm mt-2">
              Job ID: {currentJobId}
            </p>
          </div>
        )}
      </div>

      {/* Import Buttons Grid */}
      <div className="max-w-7xl mx-auto">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {IMPORT_BUTTONS.map((button, index) => (
            <button
              key={`${button.source}-${button.count}-${index}`}
              onClick={() => handleImport(button, index)}
              disabled={!backendReady || loadingKey === index}
              className={`
                px-6 py-8 rounded-xl font-bold text-white text-lg
                transition-all duration-300 transform
                ${backendReady && loadingKey !== index
                  ? `bg-gradient-to-r ${button.color} hover:scale-105 hover:shadow-2xl cursor-pointer`
                  : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                }
                ${loadingKey === index ? 'animate-pulse' : ''}
                shadow-lg
              `}
              title={backendReady ? `Import ${button.count} products from ${button.source}` : 'Backend not ready'}
            >
              <div className="flex flex-col items-center gap-2">
                <div className="text-2xl">
                  {loadingKey === index ? '⏳' : '📦'}
                </div>
                <div>
                  {language === 'ar' ? button.label : button.labelEn}
                </div>
                {loadingKey === index && (
                  <div className="text-sm font-normal">
                    {language === 'ar' ? 'جاري الاستيراد...' : 'Importing...'}
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Info Section */}
      <div className="max-w-7xl mx-auto mt-8">
        <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700">
          <h3 className="text-xl font-bold text-white mb-4">
            {language === 'ar' ? 'معلومات مهمة' : 'Important Information'}
          </h3>
          <ul className="space-y-2 text-gray-300">
            <li>✅ {language === 'ar' ? 'يتم الاستيراد في الخلفية - يمكنك إغلاق المتصفح' : 'Import runs in background - you can close browser'}</li>
            <li>📊 {language === 'ar' ? 'تتبع التقدم في الوقت الفعلي' : 'Real-time progress tracking'}</li>
            <li>🔄 {language === 'ar' ? 'معالجة تلقائية للأخطاء وإعادة المحاولة' : 'Automatic error handling and retry'}</li>
            <li>🚫 {language === 'ar' ? 'حماية من تكرار المنتجات' : 'Duplicate product protection'}</li>
            <li>⏱️ {language === 'ar' ? 'الوقت المتوقع: 50 منتج (~2 دقيقة)، 500 منتج (~20 دقيقة)' : 'Expected time: 50 products (~2 min), 500 products (~20 min)'}</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
