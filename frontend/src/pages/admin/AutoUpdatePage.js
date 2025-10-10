import React, { useState, useEffect } from 'react';
import { 
  RefreshCw, 
  Calendar, 
  DollarSign, 
  Package, 
  Upload, 
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Settings,
  Activity,
  Download
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { useLanguage } from '../../context/LanguageContext';

const AutoUpdatePage = () => {
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  
  const [autoUpdateStatus, setAutoUpdateStatus] = useState(null);
  const [currencyRates, setCurrencyRates] = useState(null);
  const [scheduledLogs, setScheduledLogs] = useState([]);
  const [bulkImportTasks, setBulkImportTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

  useEffect(() => {
    fetchAutoUpdateStatus();
    fetchCurrencyRates();
    fetchScheduledLogs();
    fetchBulkImportTasks();
  }, []);

  const fetchAutoUpdateStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/auto-update/status`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setAutoUpdateStatus(data);
      }
    } catch (error) {
      console.error('Error fetching auto-update status:', error);
    }
  };

  const fetchCurrencyRates = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/auto-update/currency-rates`);
      
      if (response.ok) {
        const data = await response.json();
        setCurrencyRates(data);
      }
    } catch (error) {
      console.error('Error fetching currency rates:', error);
    }
  };

  const fetchScheduledLogs = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/auto-update/scheduled-task-logs?limit=50`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setScheduledLogs(data);
      }
    } catch (error) {
      console.error('Error fetching scheduled logs:', error);
    }
  };

  const fetchBulkImportTasks = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/auto-update/bulk-import-tasks`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setBulkImportTasks(data);
      }
    } catch (error) {
      console.error('Error fetching bulk import tasks:', error);
    }
  };

  const triggerCurrencyUpdate = async () => {
    setRefreshing(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/auto-update/trigger-currency-update`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        alert(isRTL ? 'تم تحديث أسعار العملات بنجاح' : 'Currency rates updated successfully');
        await fetchCurrencyRates();
        await fetchAutoUpdateStatus();
      } else {
        alert(isRTL ? 'فشل في تحديث أسعار العملات' : 'Failed to update currency rates');
      }
    } catch (error) {
      console.error('Error triggering currency update:', error);
      alert(isRTL ? 'حدث خطأ أثناء التحديث' : 'Error occurred during update');
    } finally {
      setRefreshing(false);
    }
  };

  const syncProducts = async (source = 'aliexpress') => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/auto-update/sync-products?source=${source}&limit=10`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        alert(`${isRTL ? 'تمت مزامنة' : 'Synced'} ${data.products_added} ${isRTL ? 'منتجات جديدة' : 'new products'}`);
        await fetchScheduledLogs();
      } else {
        alert(isRTL ? 'فشل في مزامنة المنتجات' : 'Failed to sync products');
      }
    } catch (error) {
      console.error('Error syncing products:', error);
      alert(isRTL ? 'حدث خطأ أثناء المزامنة' : 'Error occurred during sync');
    } finally {
      setLoading(false);
    }
  };

  const updateAllPrices = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/auto-update/update-all-prices`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        alert(`${isRTL ? 'تم تحديث' : 'Updated'} ${data.updated_count} ${isRTL ? 'أسعار المنتجات' : 'product prices'}`);
        await fetchScheduledLogs();
      } else {
        alert(isRTL ? 'فشل في تحديث الأسعار' : 'Failed to update prices');
      }
    } catch (error) {
      console.error('Error updating prices:', error);
      alert(isRTL ? 'حدث خطأ أثناء تحديث الأسعار' : 'Error occurred during price update');
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return isRTL ? 'غير متوفر' : 'Not available';
    
    const date = new Date(dateString);
    return date.toLocaleString(isRTL ? 'ar-SA' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success':
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'processing':
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status) => {
    const variant = status === 'success' || status === 'completed' ? 'default' : 
                   status === 'failed' || status === 'error' ? 'destructive' : 'secondary';
    
    return (
      <Badge variant={variant} className="flex items-center gap-1">
        {getStatusIcon(status)}
        <span className="capitalize">{status}</span>
      </Badge>
    );
  };

  return (
    <div className={`space-y-6 p-6 ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {isRTL ? 'التحديثات التلقائية' : 'Auto Updates'}
          </h1>
          <p className="text-gray-600 mt-1">
            {isRTL ? 'إدارة تحديثات العملات والمنتجات التلقائية' : 'Manage automatic currency and product updates'}
          </p>
        </div>
        
        <Button 
          onClick={() => {
            fetchAutoUpdateStatus();
            fetchCurrencyRates();
            fetchScheduledLogs();
            fetchBulkImportTasks();
          }}
          variant="outline" 
          className="flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          {isRTL ? 'تحديث البيانات' : 'Refresh Data'}
        </Button>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">{isRTL ? 'نظرة عامة' : 'Overview'}</TabsTrigger>
          <TabsTrigger value="currency">{isRTL ? 'العملات' : 'Currency'}</TabsTrigger>
          <TabsTrigger value="products">{isRTL ? 'المنتجات' : 'Products'}</TabsTrigger>
          <TabsTrigger value="logs">{isRTL ? 'السجلات' : 'Logs'}</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Scheduler Status */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Activity className="h-5 w-5 text-blue-500" />
                  {isRTL ? 'حالة المجدول' : 'Scheduler Status'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {autoUpdateStatus?.scheduler ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">
                        {isRTL ? 'الحالة:' : 'Status:'}
                      </span>
                      <Badge variant={autoUpdateStatus.scheduler.status === 'running' ? 'default' : 'destructive'}>
                        {autoUpdateStatus.scheduler.status === 'running' ? 
                          (isRTL ? 'يعمل' : 'Running') : 
                          (isRTL ? 'متوقف' : 'Stopped')
                        }
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-600">
                      <strong>{isRTL ? 'المهام النشطة:' : 'Active Jobs:'}</strong> {autoUpdateStatus.scheduler.jobs?.length || 0}
                    </div>
                  </div>
                ) : (
                  <div className="text-gray-500">{isRTL ? 'جاري التحميل...' : 'Loading...'}</div>
                )}
              </CardContent>
            </Card>

            {/* Currency Status */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-green-500" />
                  {isRTL ? 'حالة العملات' : 'Currency Status'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {autoUpdateStatus?.currency_service ? (
                  <div className="space-y-3">
                    <div className="text-sm">
                      <strong>{isRTL ? 'آخر تحديث:' : 'Last Update:'}</strong>
                      <div className="text-gray-600 mt-1">
                        {formatDateTime(autoUpdateStatus.currency_service.last_update)}
                      </div>
                    </div>
                    <div className="text-sm">
                      <strong>{isRTL ? 'العملات المدعومة:' : 'Supported Currencies:'}</strong>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {autoUpdateStatus.currency_service.supported_currencies?.map(currency => (
                          <Badge key={currency} variant="outline" className="text-xs">
                            {currency}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-gray-500">{isRTL ? 'جاري التحميل...' : 'Loading...'}</div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Settings className="h-5 w-5 text-purple-500" />
                  {isRTL ? 'إجراءات سريعة' : 'Quick Actions'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  onClick={triggerCurrencyUpdate}
                  disabled={refreshing}
                  className="w-full"
                  size="sm"
                >
                  {refreshing ? (
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <DollarSign className="h-4 w-4 mr-2" />
                  )}
                  {isRTL ? 'تحديث العملات' : 'Update Currency'}
                </Button>
                
                <Button 
                  onClick={updateAllPrices}
                  disabled={loading}
                  variant="outline"
                  className="w-full"
                  size="sm"
                >
                  {loading ? (
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Package className="h-4 w-4 mr-2" />
                  )}
                  {isRTL ? 'تحديث الأسعار' : 'Update Prices'}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Currency Tab */}
        <TabsContent value="currency" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{isRTL ? 'أسعار صرف العملات' : 'Exchange Rates'}</span>
                <Button 
                  onClick={triggerCurrencyUpdate}
                  disabled={refreshing}
                  size="sm"
                >
                  {refreshing ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                </Button>
              </CardTitle>
              <CardDescription>
                {currencyRates && (
                  <span className="text-sm text-gray-500">
                    {isRTL ? 'آخر تحديث:' : 'Last updated:'} {formatDateTime(currencyRates.last_updated)}
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {currencyRates?.rates ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {Object.entries(currencyRates.rates).map(([currency, rate]) => (
                    <div key={currency} className="p-4 border rounded-lg">
                      <div className="text-lg font-semibold">{currency}</div>
                      <div className="text-2xl font-bold text-green-600">
                        {typeof rate === 'number' ? rate.toFixed(4) : rate}
                      </div>
                      <div className="text-sm text-gray-500">
                        {isRTL ? 'مقابل الدولار' : 'per USD'}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  {isRTL ? 'جاري تحميل أسعار العملات...' : 'Loading currency rates...'}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Products Tab */}
        <TabsContent value="products" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Product Sync */}
            <Card>
              <CardHeader>
                <CardTitle>{isRTL ? 'مزامنة المنتجات' : 'Product Sync'}</CardTitle>
                <CardDescription>
                  {isRTL ? 'استيراد منتجات جديدة من المصادر الخارجية' : 'Import new products from external sources'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  onClick={() => syncProducts('aliexpress')}
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? (
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Package className="h-4 w-4 mr-2" />
                  )}
                  {isRTL ? 'مزامنة من AliExpress' : 'Sync from AliExpress'}
                </Button>
                
                <Button 
                  onClick={() => syncProducts('amazon')}
                  disabled={loading}
                  variant="outline"
                  className="w-full"
                >
                  {loading ? (
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Package className="h-4 w-4 mr-2" />
                  )}
                  {isRTL ? 'مزامنة من Amazon' : 'Sync from Amazon'}
                </Button>
              </CardContent>
            </Card>

            {/* Bulk Import */}
            <Card>
              <CardHeader>
                <CardTitle>{isRTL ? 'الاستيراد المجمع' : 'Bulk Import'}</CardTitle>
                <CardDescription>
                  {isRTL ? 'استيراد المنتجات من ملفات CSV أو Excel' : 'Import products from CSV or Excel files'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600 mb-2">
                    {isRTL ? 'اسحب وأفلت ملف CSV أو Excel هنا' : 'Drag and drop CSV or Excel file here'}
                  </p>
                  <Button variant="outline" size="sm">
                    <Upload className="h-4 w-4 mr-2" />
                    {isRTL ? 'اختر ملف' : 'Choose File'}
                  </Button>
                </div>
                
                {bulkImportTasks.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium">{isRTL ? 'المهام الأخيرة:' : 'Recent Tasks:'}</h4>
                    {bulkImportTasks.slice(0, 3).map((task, index) => (
                      <div key={index} className="flex items-center justify-between p-2 border rounded">
                        <span className="text-sm">{task.type || 'Import'}</span>
                        {getStatusBadge(task.status)}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{isRTL ? 'سجلات المهام المجدولة' : 'Scheduled Task Logs'}</CardTitle>
              <CardDescription>
                {isRTL ? 'سجل تنفيذ المهام التلقائية' : 'Execution log of automated tasks'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {scheduledLogs.length > 0 ? (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {scheduledLogs.map((log, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(log.status)}
                        <div>
                          <div className="font-medium text-sm">
                            {log.task_type?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </div>
                          <div className="text-xs text-gray-500">
                            {log.message}
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatDateTime(log.timestamp)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  {isRTL ? 'لا توجد سجلات متاحة' : 'No logs available'}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AutoUpdatePage;