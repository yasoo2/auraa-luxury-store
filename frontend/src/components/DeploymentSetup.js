import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { CheckCircle, AlertCircle, Loader, Settings } from 'lucide-react';

const DeploymentSetup = () => {
  const [setupStatus, setSetupStatus] = useState('idle');
  const [setupResults, setSetupResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

  const runDeploymentSetup = async () => {
    setLoading(true);
    setSetupStatus('running');
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/setup-deployment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSetupResults(data);
        setSetupStatus('completed');
      } else {
        const errorData = await response.json();
        setSetupStatus('error');
        setSetupResults({ error: errorData.detail || 'Setup failed' });
      }
    } catch (error) {
      setSetupStatus('error');
      setSetupResults({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'running':
        return <Loader className="h-5 w-5 text-blue-500 animate-spin" />;
      default:
        return <Settings className="h-5 w-5 text-gray-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-amber-900 to-black flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-white/10 backdrop-blur-lg border border-white/20 shadow-2xl">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600 rounded-full flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-2xl">A</span>
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-white">لورا لاكشري</CardTitle>
          <CardDescription className="text-white/80">
            إعداد النشر الأولي
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {setupStatus === 'idle' && (
            <div className="text-center space-y-4">
              <p className="text-white/90">
                قم بتشغيل إعداد النشر لإنشاء حساب المدير والبيانات الأساسية
              </p>
              <Button 
                onClick={runDeploymentSetup}
                disabled={loading}
                className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400"
              >
                {loading ? (
                  <Loader className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Settings className="h-4 w-4 mr-2" />
                )}
                تشغيل إعداد النشر
              </Button>
            </div>
          )}

          {setupStatus === 'running' && (
            <div className="text-center space-y-4">
              <Loader className="h-8 w-8 animate-spin mx-auto text-amber-400" />
              <p className="text-white/90">جاري إعداد النشر...</p>
            </div>
          )}

          {setupStatus === 'completed' && setupResults && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-green-400">
                <CheckCircle className="h-5 w-5" />
                <span className="font-semibold">تم الإعداد بنجاح!</span>
              </div>
              
              <div className="space-y-2 text-sm">
                {setupResults.setup_results?.admin_created && (
                  <div className="flex items-center gap-2 text-white/90">
                    <CheckCircle className="h-4 w-4 text-green-400" />
                    <span>تم إنشاء حساب الإدارة</span>
                  </div>
                )}
                
                {setupResults.setup_results?.admin_exists && (
                  <div className="flex items-center gap-2 text-white/90">
                    <CheckCircle className="h-4 w-4 text-blue-400" />
                    <span>حساب الإدارة موجود مسبقاً</span>
                  </div>
                )}
                
                {setupResults.setup_results?.products_created && (
                  <div className="flex items-center gap-2 text-white/90">
                    <CheckCircle className="h-4 w-4 text-green-400" />
                    <span>تم إنشاء المنتجات التجريبية</span>
                  </div>
                )}
                
                {setupResults.setup_results?.products_exist && (
                  <div className="flex items-center gap-2 text-white/90">
                    <CheckCircle className="h-4 w-4 text-blue-400" />
                    <span>المنتجات موجودة مسبقاً ({setupResults.setup_results.existing_product_count})</span>
                  </div>
                )}
              </div>

              <div className="bg-green-500/20 border border-green-400/30 rounded-lg p-4">
                <h4 className="font-semibold text-green-300 mb-2">بيانات تسجيل الدخول:</h4>
                <div className="text-sm text-green-100 space-y-1">
                  <p>البريد الإلكتروني: admin@auraa.com</p>
                  <p>كلمة المرور: admin123</p>
                </div>
              </div>

              <Button 
                onClick={() => window.location.href = '/auth'}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400"
              >
                انتقل إلى تسجيل الدخول
              </Button>
            </div>
          )}

          {setupStatus === 'error' && setupResults && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-red-400">
                <AlertCircle className="h-5 w-5" />
                <span className="font-semibold">حدث خطأ في الإعداد</span>
              </div>
              
              <div className="bg-red-500/20 border border-red-400/30 rounded-lg p-4">
                <p className="text-red-100 text-sm">
                  {setupResults.error || 'خطأ غير معروف'}
                </p>
              </div>

              <Button 
                onClick={runDeploymentSetup}
                variant="outline"
                className="w-full border-red-400/50 text-red-300 hover:bg-red-500/20"
              >
                إعادة المحاولة
              </Button>
            </div>
          )}
          
          <div className="text-center">
            <a 
              href="/auth" 
              className="text-amber-300 hover:text-amber-200 text-sm underline"
            >
              تسجيل الدخول مباشرة (إذا كان الحساب موجود)
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DeploymentSetup;