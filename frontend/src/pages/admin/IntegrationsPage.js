import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import axios from 'axios';
import {
  Settings,
  Plug,
  ExternalLink,
  Check,
  X,
  AlertCircle,
  RefreshCw,
  Download,
  Upload,
  FileSpreadsheet,
  RotateCcw,
  Key,
  Shield,
  Globe,
  Zap,
  Save,
  Eye,
  EyeOff,
  ShoppingCart,
  DollarSign,
  MessageCircle
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const IntegrationsPage = () => {
  const { t, language } = useLanguage();
  const isRTL = language === 'ar';
  
  const [integrations, setIntegrations] = useState({});
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState({});
  const [showSecrets, setShowSecrets] = useState({});
  const [activeTab, setActiveTab] = useState('aliexpress');

  const availableIntegrations = {
    aliexpress: {
      name: 'AliExpress Dropshipping',
      description: isRTL ? 'استيراد تلقائي للمنتجات من علي إكسبرس' : 'Automatic product import from AliExpress',
      icon: '🛒',
      color: 'from-orange-400 to-red-500',
      fields: [
        { key: 'api_key', label: isRTL ? 'مفتاح API' : 'API Key', type: 'password' },
        { key: 'app_key', label: isRTL ? 'مفتاح التطبيق' : 'App Key', type: 'password' },
        { key: 'secret_key', label: isRTL ? 'المفتاح السري' : 'Secret Key', type: 'password' },
        { key: 'tracking_id', label: isRTL ? 'معرف التتبع' : 'Tracking ID', type: 'text' },
        { key: 'commission_rate', label: isRTL ? 'معدل العمولة (%)' : 'Commission Rate (%)', type: 'number' }
      ],
      features: [
        isRTL ? 'استيراد تلقائي للمنتجات' : 'Automatic product import',
        isRTL ? 'تحديث الأسعار والمخزون' : 'Price and inventory sync',
        isRTL ? 'معالجة الطلبات' : 'Order processing',
        isRTL ? 'تتبع الشحنات' : 'Shipment tracking'
      ]
    },
    amazon: {
      name: 'Amazon Affiliate',
      description: isRTL ? 'دمج مع برنامج الشراكة في أمازون' : 'Amazon Affiliate Program integration',
      icon: '📦',
      color: 'from-yellow-400 to-orange-500',
      fields: [
        { key: 'associate_id', label: isRTL ? 'معرف الشريك' : 'Associate ID', type: 'text' },
        { key: 'access_key', label: isRTL ? 'مفتاح الوصول' : 'Access Key', type: 'password' },
        { key: 'secret_key', label: isRTL ? 'المفتاح السري' : 'Secret Key', type: 'password' },
        { key: 'region', label: isRTL ? 'المنطقة' : 'Region', type: 'select', options: ['US', 'UK', 'DE', 'FR', 'JP'] },
        { key: 'commission_rate', label: isRTL ? 'معدل العمولة (%)' : 'Commission Rate (%)', type: 'number' }
      ],
      features: [
        isRTL ? 'إضافة منتجات أمازون' : 'Amazon product listings',
        isRTL ? 'روابط تابعة آمنة' : 'Secure affiliate links',
        isRTL ? 'تتبع العمولات' : 'Commission tracking',
        isRTL ? 'تحليلات الأداء' : 'Performance analytics'
      ]
    },
    shopify: {
      name: 'Shopify Integration',
      description: isRTL ? 'مزامنة مع متجر شوبيفاي' : 'Sync with Shopify store',
      icon: '🛍️',
      color: 'from-green-400 to-blue-500',
      fields: [
        { key: 'shop_domain', label: isRTL ? 'نطاق المتجر' : 'Shop Domain', type: 'text' },
        { key: 'access_token', label: isRTL ? 'رمز الوصول' : 'Access Token', type: 'password' },
        { key: 'webhook_secret', label: isRTL ? 'مفتاح الويب هوك' : 'Webhook Secret', type: 'password' }
      ],
      features: [
        isRTL ? 'مزامنة المنتجات' : 'Product synchronization',
        isRTL ? 'مزامنة الطلبات' : 'Order synchronization',
        isRTL ? 'مزامنة العملاء' : 'Customer synchronization',
        isRTL ? 'إدارة المخزون' : 'Inventory management'
      ]
    },
    paypal: {
      name: 'PayPal Payments',
      description: isRTL ? 'قبول المدفوعات عبر باي بال' : 'Accept payments via PayPal',
      icon: '💳',
      color: 'from-blue-400 to-indigo-500',
      fields: [
        { key: 'client_id', label: isRTL ? 'معرف العميل' : 'Client ID', type: 'text' },
        { key: 'client_secret', label: isRTL ? 'سر العميل' : 'Client Secret', type: 'password' },
        { key: 'mode', label: isRTL ? 'الوضع' : 'Mode', type: 'select', options: ['sandbox', 'live'] }
      ],
      features: [
        isRTL ? 'معالجة المدفوعات' : 'Payment processing',
        isRTL ? 'استرداد الأموال' : 'Refund handling',
        isRTL ? 'تقارير المعاملات' : 'Transaction reports',
        isRTL ? 'حماية المشتري' : 'Buyer protection'
      ]
    },
    stripe: {
      name: 'Stripe Payments',
      description: isRTL ? 'قبول المدفوعات عبر ستريب' : 'Accept payments via Stripe',
      icon: '💰',
      color: 'from-purple-400 to-pink-500',
      fields: [
        { key: 'publishable_key', label: isRTL ? 'المفتاح العام' : 'Publishable Key', type: 'text' },
        { key: 'secret_key', label: isRTL ? 'المفتاح السري' : 'Secret Key', type: 'password' },
        { key: 'webhook_secret', label: isRTL ? 'مفتاح الويب هوك' : 'Webhook Secret', type: 'password' }
      ],
      features: [
        isRTL ? 'معالجة البطاقات الائتمانية' : 'Credit card processing',
        isRTL ? 'مدفوعات متكررة' : 'Recurring payments',
        isRTL ? 'تحليلات متقدمة' : 'Advanced analytics',
        isRTL ? 'حماية من الاحتيال' : 'Fraud protection'
      ]
    },
    whatsapp: {
      name: 'WhatsApp Business',
      description: isRTL ? 'دمج مع واتساب للأعمال' : 'WhatsApp Business integration',
      icon: '📱',
      color: 'from-green-400 to-green-600',
      fields: [
        { key: 'phone_number', label: isRTL ? 'رقم الهاتف' : 'Phone Number', type: 'text' },
        { key: 'access_token', label: isRTL ? 'رمز الوصول' : 'Access Token', type: 'password' },
        { key: 'verify_token', label: isRTL ? 'رمز التحقق' : 'Verify Token', type: 'password' }
      ],
      features: [
        isRTL ? 'إشعارات الطلبات' : 'Order notifications',
        isRTL ? 'دعم العملاء' : 'Customer support',
        isRTL ? 'رسائل تسويقية' : 'Marketing messages',
        isRTL ? 'تأكيدات التسليم' : 'Delivery confirmations'
      ]
    }
  };

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const fetchIntegrations = async () => {
    try {
      const response = await axios.get(`${API}/admin/integrations`);
      setIntegrations(response.data || {});
    } catch (error) {
      console.error('Error fetching integrations:', error);
    }
  };

  const saveIntegration = async (integrationType, data) => {
    try {
      setLoading(true);
      await axios.post(`${API}/admin/integrations`, {
        type: integrationType,
        ...data
      });
      await fetchIntegrations();
    } catch (error) {
      console.error('Error saving integration:', error);
    } finally {
      setLoading(false);
    }
  };

  const testIntegration = async (integrationType) => {
    try {
      setTesting({ ...testing, [integrationType]: true });
      const response = await axios.post(`${API}/admin/integrations/test`, {
        type: integrationType
      });
      
      // Show success message
      alert(isRTL ? 'تم اختبار التكامل بنجاح!' : 'Integration test successful!');
    } catch (error) {
      console.error('Error testing integration:', error);
      alert(isRTL ? 'فشل في اختبار التكامل' : 'Integration test failed');
    } finally {
      setTesting({ ...testing, [integrationType]: false });
    }
  };

  const syncProducts = async (integrationType) => {
    try {
      setLoading(true);
      await axios.post(`${API}/admin/integrations/sync`, {
        type: integrationType
      });
      alert(isRTL ? 'تم بدء مزامنة المنتجات' : 'Product sync initiated');
    } catch (error) {
      console.error('Error syncing products:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleShowSecret = (integrationType, fieldKey) => {
    const key = `${integrationType}_${fieldKey}`;
    setShowSecrets({ ...showSecrets, [key]: !showSecrets[key] });
  };

  const renderIntegrationCard = (integrationType, integration) => {
    const currentData = integrations[integrationType] || {};
    const isConnected = currentData.is_active || false;

    return (
      <div key={integrationType} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className={`h-2 bg-gradient-to-r ${integration.color}`}></div>
        
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <div className="text-3xl mr-3">{integration.icon}</div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900">{integration.name}</h3>
                <p className="text-sm text-gray-600">{integration.description}</p>
              </div>
            </div>
            <div className="flex items-center">
              {isConnected ? (
                <div className="flex items-center text-green-600">
                  <Check className="h-5 w-5 mr-1" />
                  <span className="text-sm font-medium">{isRTL ? 'متصل' : 'Connected'}</span>
                </div>
              ) : (
                <div className="flex items-center text-red-600">
                  <X className="h-5 w-5 mr-1" />
                  <span className="text-sm font-medium">{isRTL ? 'غير متصل' : 'Not Connected'}</span>
                </div>
              )}
            </div>
          </div>

          {/* Features */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-700 mb-2">{isRTL ? 'الميزات:' : 'Features:'}</h4>
            <div className="grid grid-cols-2 gap-2">
              {integration.features.map((feature, index) => (
                <div key={index} className="flex items-center text-sm text-gray-600">
                  <Check className="h-3 w-3 text-green-500 mr-2 flex-shrink-0" />
                  {feature}
                </div>
              ))}
            </div>
          </div>

          {/* Configuration Fields */}
          <div className="space-y-4 mb-6">
            {integration.fields.map((field) => (
              <div key={field.key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {field.label}
                </label>
                {field.type === 'select' ? (
                  <select
                    defaultValue={currentData[field.key] || ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  >
                    <option value="">{isRTL ? 'اختر...' : 'Select...'}</option>
                    {field.options.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                ) : (
                  <div className="relative">
                    <Input
                      type={field.type === 'password' && !showSecrets[`${integrationType}_${field.key}`] ? 'password' : 'text'}
                      defaultValue={
                        field.type === 'password' && currentData[field.key] 
                          ? '••••••••••••••••'
                          : currentData[field.key] || ''
                      }
                      placeholder={field.label}
                      className="w-full"
                    />
                    {field.type === 'password' && (
                      <button
                        type="button"
                        onClick={() => toggleShowSecret(integrationType, field.key)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      >
                        {showSecrets[`${integrationType}_${field.key}`] ? (
                          <EyeOff className="h-4 w-4 text-gray-400" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-400" />
                        )}
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => saveIntegration(integrationType, {})}
              disabled={loading}
              className="bg-amber-600 hover:bg-amber-700"
            >
              <Save className="h-4 w-4 mr-2" />
              {isRTL ? 'حفظ الإعدادات' : 'Save Settings'}
            </Button>

            {isConnected && (
              <>
                <Button
                  onClick={() => testIntegration(integrationType)}
                  disabled={testing[integrationType]}
                  variant="outline"
                >
                  {testing[integrationType] ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Zap className="h-4 w-4 mr-2" />
                  )}
                  {isRTL ? 'اختبار الاتصال' : 'Test Connection'}
                </Button>

                {(integrationType === 'aliexpress' || integrationType === 'amazon') && (
                  <Button
                    onClick={() => syncProducts(integrationType)}
                    disabled={loading}
                    variant="outline"
                  >
                    <Sync className="h-4 w-4 mr-2" />
                    {isRTL ? 'مزامنة المنتجات' : 'Sync Products'}
                  </Button>
                )}
              </>
            )}

            <Button
              onClick={() => window.open(`https://developers.${integrationType}.com`, '_blank')}
              variant="ghost"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              {isRTL ? 'الوثائق' : 'Documentation'}
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Plug className="h-8 w-8 text-amber-600" />
          <h1 className="text-3xl font-bold text-gray-900">
            {isRTL ? 'إدارة التكاملات' : 'Integrations Management'}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={fetchIntegrations}
            variant="outline"
            size="sm"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            {isRTL ? 'تحديث' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200">
          <div className="flex items-center">
            <Check className="h-8 w-8 text-green-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-green-600">{isRTL ? 'التكاملات النشطة' : 'Active Integrations'}</p>
              <p className="text-2xl font-bold text-green-900">
                {Object.values(integrations).filter(i => i?.is_active).length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
          <div className="flex items-center">
            <Settings className="h-8 w-8 text-blue-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-blue-600">{isRTL ? 'إجمالي التكاملات' : 'Total Integrations'}</p>
              <p className="text-2xl font-bold text-blue-900">{Object.keys(availableIntegrations).length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-4 rounded-lg border border-amber-200">
          <div className="flex items-center">
            <Shield className="h-8 w-8 text-amber-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-amber-600">{isRTL ? 'الحالة الأمنية' : 'Security Status'}</p>
              <p className="text-2xl font-bold text-amber-900">{isRTL ? 'آمن' : 'Secure'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Integration Categories */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex space-x-8" aria-label="Tabs">
            {[
              { id: 'all', name: isRTL ? 'جميع التكاملات' : 'All Integrations', icon: Globe },
              { id: 'ecommerce', name: isRTL ? 'التجارة الإلكترونية' : 'E-commerce', icon: ShoppingCart },
              { id: 'payments', name: isRTL ? 'المدفوعات' : 'Payments', icon: DollarSign },
              { id: 'communication', name: isRTL ? 'التواصل' : 'Communication', icon: MessageCircle }
            ].map((tab) => {
              const TabIcon = tab.icon;
              return (
                <button
                  key={tab.id}
                  className={`${
                    activeTab === tab.id
                      ? 'border-amber-500 text-amber-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
                >
                  <TabIcon className="h-4 w-4" />
                  {tab.name}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Integrations Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Object.entries(availableIntegrations).map(([type, integration]) => 
            renderIntegrationCard(type, integration)
          )}
        </div>
      </div>

      {/* Bulk Operations */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {isRTL ? 'العمليات المجمعة' : 'Bulk Operations'}
        </h3>
        <div className="flex flex-wrap gap-4">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            {isRTL ? 'تصدير الإعدادات' : 'Export Settings'}
          </Button>
          <Button variant="outline">
            <Upload className="h-4 w-4 mr-2" />
            {isRTL ? 'استيراد الإعدادات' : 'Import Settings'}
          </Button>
          <Button variant="outline">
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            {isRTL ? 'استيراد منتجات مجمع' : 'Bulk Product Import'}
          </Button>
          <Button variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            {isRTL ? 'مزامنة جميع التكاملات' : 'Sync All Integrations'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default IntegrationsPage;