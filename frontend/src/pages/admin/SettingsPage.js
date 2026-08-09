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
import { toast } from 'sonner';
import { API_BASE_URL } from '../../api';

const BACKEND_URL = API_BASE_URL;
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
      id: 'payment',
      name: isRTL ? 'طرق الدفع' : 'Payment',
      icon: CreditCard
    },
    {
      id: 'business',
      name: isRTL ? 'إعدادات الأعمال' : 'Business Settings',
      icon: Store
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

  // Payment lives behind its own endpoint, not in the settings blob: an IBAN
  // is not a preference, and the server refuses to publish a half-filled one.
  const [payment, setPayment] = useState({
    bank_transfer: {
      enabled: false, bank_name: '', account_holder: '', iban: '',
      swift: '', account_currency: '', instructions: '',
    },
    on_confirmation: { enabled: true },
    card: {},
    live_methods: [],
  });
  const [paymentSaving, setPaymentSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
    fetchPayment();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await axios.get(`${API}/admin/settings`);
      setSettings(prev => ({ ...prev, ...response.data }));
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error(isRTL ? 'تعذّر تحميل الإعدادات' : 'Could not load the settings');
    }
  };

  const fetchPayment = async () => {
    try {
      const { data } = await axios.get(`${API}/admin/payment-settings`);
      setPayment(prev => ({
        ...prev,
        bank_transfer: { ...prev.bank_transfer, ...(data.bank_transfer || {}) },
        on_confirmation: { ...prev.on_confirmation, ...(data.on_confirmation || {}) },
        card: data.card || {},
        live_methods: data.live_methods || [],
      }));
    } catch (error) {
      console.error('Error fetching payment settings:', error);
      toast.error(isRTL ? 'تعذّر تحميل طرق الدفع' : 'Could not load the payment methods');
    }
  };

  const savePayment = async () => {
    try {
      setPaymentSaving(true);
      const { data } = await axios.put(`${API}/admin/payment-settings`, {
        bank_transfer: payment.bank_transfer,
        on_confirmation: payment.on_confirmation,
      });
      setPayment(prev => ({ ...prev, live_methods: data.live_methods || [] }));
      toast.success(isRTL ? 'حُفظت طرق الدفع' : 'Payment methods saved');
    } catch (error) {
      // The server names the missing field. Repeating "failed" over the top of
      // that would leave the owner guessing which box is empty.
      toast.error(error.response?.data?.detail
        || (isRTL ? 'تعذّر حفظ طرق الدفع' : 'Could not save the payment methods'));
    } finally {
      setPaymentSaving(false);
    }
  };

  const updateBank = (key, value) => {
    setPayment(prev => ({
      ...prev,
      bank_transfer: { ...prev.bank_transfer, [key]: value },
    }));
  };

  const saveSettings = async () => {
    try {
      setLoading(true);
      await axios.put(`${API}/admin/settings`, settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      // Failing in the console alone left the owner watching a button that
      // never turned into "تم الحفظ" with nothing telling them why.
      console.error('Error saving settings:', error);
      toast.error(error.response?.data?.detail
        || (isRTL ? 'تعذّر حفظ الإعدادات — لم يتغيّر شيء' : 'Could not save the settings — nothing changed'));
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error(isRTL ? 'حجم الملف يجب أن يكون أقل من 2 ميجابايت' : 'File size must be less than 2MB');
      return;
    }

    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error(isRTL ? 'نوع الملف غير مدعوم. استخدم PNG, JPG أو WebP' : 'Unsupported file type. Use PNG, JPG or WebP');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      toast.loading(isRTL ? 'جاري رفع الشعار...' : 'Uploading logo...');
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API}/admin/upload-image`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      
      toast.dismiss();
      setSettings(prev => ({ ...prev, logo_url: response.data.url }));
      setSaved(false);
      toast.success(isRTL ? 'تم رفع الشعار بنجاح' : 'Logo uploaded successfully');
    } catch (error) {
      toast.dismiss();
      console.error('Error uploading logo:', error);
      toast.error(isRTL ? 'فشل في رفع الشعار' : 'Failed to upload logo');
    }
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
          {settings.logo_url ? (
            <div className="text-center">
              <img 
                src={settings.logo_url} 
                alt="Store Logo" 
                className="mx-auto h-32 w-auto object-contain mb-4"
              />
              <label htmlFor="logo-upload" className="cursor-pointer">
                <span className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                  {isRTL ? 'تغيير الشعار' : 'Change Logo'}
                </span>
                <input 
                  id="logo-upload" 
                  name="logo-upload" 
                  type="file" 
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  className="sr-only"
                  onChange={handleLogoUpload}
                />
              </label>
            </div>
          ) : (
            <div className="text-center">
              <Upload className="mx-auto h-12 w-12 text-gray-400" />
              <div className="mt-4">
                <label htmlFor="logo-upload" className="cursor-pointer">
                  <span className="mt-2 block text-sm font-medium text-gray-900">
                    {isRTL ? 'اختر ملف الشعار' : 'Choose logo file'}
                  </span>
                  <input 
                    id="logo-upload" 
                    name="logo-upload" 
                    type="file" 
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    className="sr-only"
                    onChange={handleLogoUpload}
                  />
                </label>
                <p className="mt-1 text-sm text-gray-500">PNG, JPG, WebP up to 2MB</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderContactTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Mail className="inline h-4 w-4 me-1" />
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
            <Phone className="inline h-4 w-4 me-1" />
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
          <MapPin className="inline h-5 w-5 me-2" />
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

  /**
   * The only screen that decides whether a customer can pay at all.
   *
   * The shop has no card gateway and no merchant account, so the bank account
   * is the payment method. Nothing here has a default value on purpose — an
   * example IBAN left in a placeholder is a customer's money in a stranger's
   * account, and the server refuses to publish the method until every field a
   * payer needs is filled in.
   */
  const renderPaymentTab = () => {
    const bank = payment.bank_transfer;
    const card = payment.card || {};
    const live = payment.live_methods || [];

    return (
      <div className="space-y-6">
        <div
          className={`rounded-lg border p-4 ${
            live.length ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
          }`}
          data-testid="payment-live-status"
        >
          <p className={`font-semibold ${live.length ? 'text-green-900' : 'text-red-900'}`}>
            {live.length
              ? (isRTL
                ? `المتاح للعملاء الآن: ${live.length} طريقة`
                : `Live for customers: ${live.length} method(s)`)
              : (isRTL
                ? 'لا توجد طريقة دفع متاحة — لا يستطيع أحد إتمام طلب.'
                : 'No payment method is live — nobody can complete an order.')}
          </p>
          {live.length > 0 && (
            <p className="text-sm mt-1 text-gray-700">
              {live.map((id) => (id === 'card'
                ? (isRTL ? 'بطاقة ائتمانية' : 'Card')
                : id === 'bank_transfer'
                  ? (isRTL ? 'حوالة بنكية' : 'Bank transfer')
                  : (isRTL ? 'الدفع عند تأكيد الطلب' : 'Payment on confirmation'))).join('، ')}
            </p>
          )}
        </div>

        {/* The card gateway. Read-only here on purpose: its keys live in the
            host's environment variables, because a payment secret stored in
            the database is a payment secret in every backup of it. */}
        <div
          className={`border rounded-lg p-4 ${card.configured ? 'border-green-200' : 'border-gray-200'}`}
          data-testid="card-gateway"
        >
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <span className="font-semibold text-gray-900">
              {isRTL ? 'الدفع بالبطاقة (iyzico)' : 'Card payment (iyzico)'}
            </span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
              card.configured ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'
            }`}>
              {card.configured
                ? (isRTL ? 'مُفعّل' : 'Configured')
                : (isRTL ? 'غير مُفعّل' : 'Not configured')}
            </span>
            {card.configured && card.mode === 'sandbox' && (
              <span
                role="alert"
                className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800"
                data-testid="card-sandbox-warning"
              >
                {isRTL ? '⚠️ وضع اختبار — لا يُخصم مال حقيقي' : '⚠️ Sandbox — no real money moves'}
              </span>
            )}
          </div>

          {card.configured ? (
            <p className="text-sm text-gray-600">
              {isRTL
                ? `يُخصم من العميل بعملة ${card.currency}. تفعيل البطاقة يُخفي الحوالة البنكية والدفع عند التأكيد تلقائياً.`
                : `Customers are charged in ${card.currency}. Turning the card on hides bank transfer and payment-on-confirmation automatically.`}
            </p>
          ) : (
            <div className="text-sm text-gray-600 space-y-1">
              <p>
                {isRTL
                  ? 'افتح حساباً في iyzico، ثم ضع المفتاحين في متغيّرات البيئة على Render:'
                  : 'Open an iyzico account, then put the two keys in Render’s environment variables:'}
              </p>
              <ul className="list-disc ms-5 font-mono text-xs text-gray-700">
                <li>IYZICO_API_KEY</li>
                <li>IYZICO_SECRET_KEY</li>
                <li>IYZICO_CURRENCY {isRTL ? '(اختياري، الافتراضي USD)' : '(optional, default USD)'}</li>
                <li>IYZICO_SANDBOX=true {isRTL ? '(للتجربة فقط)' : '(testing only)'}</li>
              </ul>
            </div>
          )}
        </div>

        <div className="border border-gray-200 rounded-lg p-4">
          <label className="flex items-center gap-3 mb-4 cursor-pointer">
            <input
              type="checkbox"
              checked={!!bank.enabled}
              onChange={(e) => updateBank('enabled', e.target.checked)}
              data-testid="bank-transfer-enabled"
              className="h-4 w-4 accent-amber-600"
            />
            <span className="font-semibold text-gray-900">
              {isRTL ? 'حوالة بنكية' : 'Bank transfer'}
            </span>
          </label>

          <p className="text-sm text-gray-600 mb-4">
            {isRTL
              ? 'يرى العميل هذه البيانات بعد تأكيد الطلب مع رقم الطلب ليكتبه في بيان الحوالة. راجع الأرقام حرفاً بحرف قبل الحفظ.'
              : 'The customer sees these details after placing the order, with the order number to quote. Check every character before saving.'}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {isRTL ? 'اسم البنك *' : 'Bank name *'}
              </label>
              <Input
                value={bank.bank_name || ''}
                onChange={(e) => updateBank('bank_name', e.target.value)}
                data-testid="bank-name"
                placeholder={isRTL ? 'مثال: VakıfBank' : 'e.g. VakıfBank'}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {isRTL ? 'اسم صاحب الحساب *' : 'Account holder *'}
              </label>
              <Input
                value={bank.account_holder || ''}
                onChange={(e) => updateBank('account_holder', e.target.value)}
                data-testid="account-holder"
                placeholder={isRTL ? 'كما هو مكتوب في البنك بالضبط' : 'Exactly as the bank has it'}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">IBAN *</label>
              <Input
                value={bank.iban || ''}
                onChange={(e) => updateBank('iban', e.target.value)}
                data-testid="iban"
                dir="ltr"
                className="font-mono"
                placeholder="TR00 0000 0000 0000 0000 0000 00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                SWIFT / BIC {isRTL ? '(للحوالات من خارج البلد)' : '(for transfers from abroad)'}
              </label>
              <Input
                value={bank.swift || ''}
                onChange={(e) => updateBank('swift', e.target.value)}
                data-testid="swift"
                dir="ltr"
                className="font-mono"
                placeholder="TVBATR2A"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {isRTL ? 'عملة الحساب' : 'Account currency'}
              </label>
              <Input
                value={bank.account_currency || ''}
                onChange={(e) => updateBank('account_currency', e.target.value)}
                data-testid="account-currency"
                dir="ltr"
                placeholder="TRY"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {isRTL ? 'ملاحظات للعميل (اختياري)' : 'Note to the customer (optional)'}
              </label>
              <textarea
                value={bank.instructions || ''}
                onChange={(e) => updateBank('instructions', e.target.value)}
                data-testid="bank-instructions"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>
          </div>
        </div>

        <div className="border border-gray-200 rounded-lg p-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={!!payment.on_confirmation.enabled}
              onChange={(e) => setPayment(prev => ({
                ...prev,
                on_confirmation: { enabled: e.target.checked },
              }))}
              data-testid="on-confirmation-enabled"
              className="h-4 w-4 accent-amber-600"
            />
            <span className="font-semibold text-gray-900">
              {isRTL ? 'الدفع عند تأكيد الطلب' : 'Payment on confirmation'}
            </span>
          </label>
          <p className="text-sm text-gray-600 mt-2">
            {isRTL
              ? 'يُسجَّل الطلب وتتواصل أنت مع العميل لتحصيل المبلغ. أبقِه مفعّلاً حتى تتأكّد أن الحوالة البنكية تعمل.'
              : 'The order is recorded and you contact the customer to collect payment. Keep it on until bank transfer is proven.'}
          </p>
        </div>

        <Button
          onClick={savePayment}
          disabled={paymentSaving}
          data-testid="save-payment"
          className="bg-amber-600 hover:bg-amber-700"
        >
          <Save className="h-4 w-4 me-2" />
          {paymentSaving
            ? (isRTL ? 'جارٍ الحفظ…' : 'Saving…')
            : (isRTL ? 'حفظ طرق الدفع' : 'Save payment methods')}
        </Button>
      </div>
    );
  };

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
            { key: 'payment_paypal', label: isRTL ? 'باي بال' : 'PayPal' }
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
            <Check className="h-4 w-4 me-2" />
          ) : (
            <Save className="h-4 w-4 me-2" />
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
          {activeTab === 'payment' && renderPaymentTab()}
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