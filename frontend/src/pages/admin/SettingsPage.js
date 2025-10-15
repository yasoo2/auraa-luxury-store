import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import axios from 'axios';
import {
  Settings,
  Save,
  Store,
  Globe,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  Truck,
  Shield,
  Bell,
  Palette,
  Upload,
  Check,
  X
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const SettingsPage = () => {
  const { t, language } = useLanguage();
  const isRTL = language === 'ar';
  
  const [settings, setSettings] = useState({
    // Store Information
    store_name: 'Auraa Luxury',
    store_name_ar: 'Auraa Luxury',
    store_description: 'Premium accessories for discerning customers',
    store_description_ar: 'إكسسوارات فاخرة للعملاء المميزين',
    
    // Contact Information
    contact_email: 'info@auraa.com',
    contact_phone: '+905013715391',
    whatsapp_number: '+905013715391',
    
    // Address
    address_line1: '123 Luxury Street',
    address_line1_ar: '123 شارع الفخامة',
    city: 'Riyadh',
    city_ar: 'الرياض',
    country: 'Saudi Arabia',
    country_ar: 'المملكة العربية السعودية',
    postal_code: '12345',
    
    // Business Settings
    currency_primary: 'SAR',
    currency_secondary: 'USD',
    tax_rate: 15,
    free_shipping_threshold: 200,
    
    // Notifications
    notify_new_orders: true,
    notify_low_stock: true,
    notify_reviews: true,
    low_stock_threshold: 10,
    
    // Social Media
    facebook_url: '',
    instagram_url: '',
    twitter_url: '',
    tiktok_url: '',
    
    // Payment Methods
    payment_cod: false, // Disabled for dropshipping
    payment_stripe: false,
    payment_paypal: false,
    
    // Shipping
    shipping_local_price: 25,
    shipping_express_price: 50,
    shipping_free_threshold: 200,
    
    // Theme
    primary_color: '#D97706',
    secondary_color: '#FEF3C7',
    logo_url: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState('general');

  const tabs = [
    { 
      id: 'general', 
      name: isRTL ? 'معلومات عامة' : 'General Info', 
      icon: Store 
    },
    { 
      id: 'contact', 
      name: isRTL ? 'معلومات الاتصال' : 'Contact Info', 
      icon: Mail 
    },
    { 
      id: 'business', 
      name: isRTL ? 'إعدادات الأعمال' : 'Business Settings', 
      icon: CreditCard 
    },
    { 
      id: 'shipping', 
      name: isRTL ? 'الشحن والتوصيل' : 'Shipping & Delivery', 
      icon: Truck 
    },
    { 
      id: 'notifications', 
      name: isRTL ? 'الإشعارات' : 'Notifications', 
      icon: Bell 
    },
    { 
      id: 'social', 
      name: isRTL ? 'وسائل التواصل' : 'Social Media', 
      icon: Globe 
    }
  ];

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await axios.get(`${API}/admin/settings`);
      setSettings(prev => ({ ...prev, ...response.data }));
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const saveSettings = async () => {
    try {
      setLoading(true);
      await axios.put(`${API}/admin/settings`, settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const renderGeneralTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {isRTL ? 'اسم المتجر (English)' : 'Store Name (English)'}
          </label>
          <Input
            value={settings.store_name}
            onChange={(e) => updateSetting('store_name', e.target.value)}
            placeholder="Auraa Luxury"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {isRTL ? 'اسم المتجر (عربي)' : 'Store Name (Arabic)'}
          </label>
          <Input
            value={settings.store_name_ar}
            onChange={(e) => updateSetting('store_name_ar', e.target.value)}
            placeholder="Auraa Luxury"
            dir="rtl"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {isRTL ? 'وصف المتجر (English)' : 'Store Description (English)'}
          </label>
          <textarea
            value={settings.store_description}
            onChange={(e) => updateSetting('store_description', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            placeholder="Premium accessories for discerning customers"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {isRTL ? 'وصف المتجر (عربي)' : 'Store Description (Arabic)'}
          </label>
          <textarea
            value={settings.store_description_ar}
            onChange={(e) => updateSetting('store_description_ar', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            placeholder="إكسسوارات فاخرة للعملاء المميزين"
            dir="rtl"
          />
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {isRTL ? 'شعار المتجر' : 'Store Logo'}
        </label>
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
          <div className="text-center">
            <Upload className="mx-auto h-12 w-12 text-gray-400" />
            <div className="mt-4">
              <label htmlFor="logo-upload" className="cursor-pointer">
                <span className="mt-2 block text-sm font-medium text-gray-900">
                  {isRTL ? 'اختر ملف الشعار' : 'Choose logo file'}
                </span>
                <input id="logo-upload" name="logo-upload" type="file" className="sr-only" />
              </label>
              <p className="mt-1 text-sm text-gray-500">PNG, JPG, SVG up to 2MB</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderContactTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Mail className="inline h-4 w-4 mr-1" />
            {isRTL ? 'البريد الإلكتروني' : 'Email Address'}
          </label>
          <Input
            type="email"
            value={settings.contact_email}
            onChange={(e) => updateSetting('contact_email', e.target.value)}
            placeholder="info@auraa.com"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Phone className="inline h-4 w-4 mr-1" />
            {isRTL ? 'رقم الهاتف' : 'Phone Number'}
          </label>
          <Input
            value={settings.contact_phone}
            onChange={(e) => updateSetting('contact_phone', e.target.value)}
            placeholder="+905013715391"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {isRTL ? 'رقم الواتساب' : 'WhatsApp Number'}
        </label>
        <Input
          value={settings.whatsapp_number}
          onChange={(e) => updateSetting('whatsapp_number', e.target.value)}
          placeholder="+905013715391"
        />
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">
          <MapPin className="inline h-5 w-5 mr-2" />
          {isRTL ? 'العنوان' : 'Address'}
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {isRTL ? 'العنوان (English)' : 'Address Line 1 (English)'}
            </label>
            <Input
              value={settings.address_line1}
              onChange={(e) => updateSetting('address_line1', e.target.value)}
              placeholder="123 Luxury Street"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {isRTL ? 'العنوان (عربي)' : 'Address Line 1 (Arabic)'}
            </label>
            <Input
              value={settings.address_line1_ar}
              onChange={(e) => updateSetting('address_line1_ar', e.target.value)}
              placeholder="123 شارع الفخامة"
              dir="rtl"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {isRTL ? 'المدينة' : 'City'}
            </label>
            <Input
              value={settings.city}
              onChange={(e) => updateSetting('city', e.target.value)}
              placeholder="Riyadh"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {isRTL ? 'الدولة' : 'Country'}
            </label>
            <Input
              value={settings.country}
              onChange={(e) => updateSetting('country', e.target.value)}
              placeholder="Saudi Arabia"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {isRTL ? 'الرمز البريدي' : 'Postal Code'}
            </label>
            <Input
              value={settings.postal_code}
              onChange={(e) => updateSetting('postal_code', e.target.value)}
              placeholder="12345"
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderBusinessTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {isRTL ? 'العملة الأساسية' : 'Primary Currency'}
          </label>
          <select
            value={settings.currency_primary}
            onChange={(e) => updateSetting('currency_primary', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
          >
            <option value="SAR">SAR - ريال سعودي</option>
            <option value="USD">USD - دولار أمريكي</option>
            <option value="EUR">EUR - يورو</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {isRTL ? 'معدل الضريبة (%)' : 'Tax Rate (%)'}
          </label>
          <Input
            type="number"
            value={settings.tax_rate}
            onChange={(e) => updateSetting('tax_rate', parseFloat(e.target.value))}
            placeholder="15"
            min="0"
            max="100"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {isRTL ? 'الحد الأدنى للشحن المجاني' : 'Free Shipping Threshold'}
        </label>
        <Input
          type="number"
          value={settings.free_shipping_threshold}
          onChange={(e) => updateSetting('free_shipping_threshold', parseFloat(e.target.value))}
          placeholder="200"
          min="0"
        />
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">
          {isRTL ? 'طرق الدفع' : 'Payment Methods'}
        </h3>
        
        <div className="space-y-3">
          {[
            { key: 'payment_stripe', label: isRTL ? 'ستريب (بطاقات ائتمانية)' : 'Stripe (Credit Cards)' },
            { key: 'payment_paypal', label: isRTL ? 'باي بال' : 'PayPal' },
            { key: 'payment_bank_transfer', label: isRTL ? 'تحويل بنكي' : 'Bank Transfer' }
          ].map((payment) => (
            <label key={payment.key} className="flex items-center">
              <input
                type="checkbox"
                checked={settings[payment.key]}
                onChange={(e) => updateSetting(payment.key, e.target.checked)}
                className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
              />
              <span className="ml-2 text-sm text-gray-700">{payment.label}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );

  const renderShippingTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {isRTL ? 'سعر الشحن العادي' : 'Standard Shipping Price'}
          </label>
          <Input
            type="number"
            value={settings.shipping_local_price}
            onChange={(e) => updateSetting('shipping_local_price', parseFloat(e.target.value))}
            placeholder="25"
            min="0"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {isRTL ? 'سعر الشحن السريع' : 'Express Shipping Price'}
          </label>
          <Input
            type="number"
            value={settings.shipping_express_price}
            onChange={(e) => updateSetting('shipping_express_price', parseFloat(e.target.value))}
            placeholder="50"
            min="0"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {isRTL ? 'الحد الأدنى للشحن المجاني' : 'Free Shipping Threshold'}
          </label>
          <Input
            type="number"
            value={settings.shipping_free_threshold}
            onChange={(e) => updateSetting('shipping_free_threshold', parseFloat(e.target.value))}
            placeholder="200"
            min="0"
          />
        </div>
      </div>
    </div>
  );

  const renderNotificationsTab = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">
          {isRTL ? 'إعدادات الإشعارات' : 'Notification Settings'}
        </h3>
        
        <div className="space-y-3">
          {[
            { key: 'notify_new_orders', label: isRTL ? 'إشعار بالطلبات الجديدة' : 'Notify on new orders' },
            { key: 'notify_low_stock', label: isRTL ? 'إشعار عند نفاد المخزون' : 'Notify on low stock' },
            { key: 'notify_reviews', label: isRTL ? 'إشعار بالتقييمات الجديدة' : 'Notify on new reviews' }
          ].map((notification) => (
            <label key={notification.key} className="flex items-center">
              <input
                type="checkbox"
                checked={settings[notification.key]}
                onChange={(e) => updateSetting(notification.key, e.target.checked)}
                className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
              />
              <span className="ml-2 text-sm text-gray-700">{notification.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {isRTL ? 'حد تنبيه المخزون المنخفض' : 'Low Stock Alert Threshold'}
        </label>
        <Input
          type="number"
          value={settings.low_stock_threshold}
          onChange={(e) => updateSetting('low_stock_threshold', parseInt(e.target.value))}
          placeholder="10"
          min="1"
        />
      </div>
    </div>
  );

  const renderSocialTab = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">
          {isRTL ? 'حسابات وسائل التواصل الاجتماعي' : 'Social Media Accounts'}
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Facebook URL
            </label>
            <Input
              value={settings.facebook_url}
              onChange={(e) => updateSetting('facebook_url', e.target.value)}
              placeholder="https://facebook.com/auraaluxury"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Instagram URL
            </label>
            <Input
              value={settings.instagram_url}
              onChange={(e) => updateSetting('instagram_url', e.target.value)}
              placeholder="https://instagram.com/auraaluxury"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Twitter/X URL
            </label>
            <Input
              value={settings.twitter_url}
              onChange={(e) => updateSetting('twitter_url', e.target.value)}
              placeholder="https://twitter.com/auraaluxury"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              TikTok URL
            </label>
            <Input
              value={settings.tiktok_url}
              onChange={(e) => updateSetting('tiktok_url', e.target.value)}
              placeholder="https://tiktok.com/@auraaluxury"
            />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Settings className="h-8 w-8 text-amber-600" />
          <h1 className="text-3xl font-bold text-gray-900">
            {isRTL ? 'إعدادات المتجر' : 'Store Settings'}
          </h1>
        </div>
        <Button
          onClick={saveSettings}
          disabled={loading}
          className="bg-amber-600 hover:bg-amber-700"
        >
          {loading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
          ) : saved ? (
            <Check className="h-4 w-4 mr-2" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          {saved ? (isRTL ? 'تم الحفظ' : 'Saved') : (isRTL ? 'حفظ التغييرات' : 'Save Changes')}
        </Button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            {tabs.map((tab) => {
              const TabIcon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
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

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'general' && renderGeneralTab()}
          {activeTab === 'contact' && renderContactTab()}
          {activeTab === 'business' && renderBusinessTab()}
          {activeTab === 'shipping' && renderShippingTab()}
          {activeTab === 'notifications' && renderNotificationsTab()}
          {activeTab === 'social' && renderSocialTab()}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;