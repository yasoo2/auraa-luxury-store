import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, MapPin, User, Phone, Mail, Truck } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import axios from 'axios';
import { trackBeginCheckout, trackPurchase } from '../utils/analytics';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const CheckoutPage = () => {
  const { user } = useAuth();
  const { currency, language } = useLanguage();
  const isRTL = language === 'ar' || language === 'he';
  const navigate = useNavigate();
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    // Shipping Address
    firstName: user?.first_name || '',
    lastName: user?.last_name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'SA',
    // Payment
    paymentMethod: 'card',
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardName: ''
  });

  const [shippingEstimate, setShippingEstimate] = useState({ loading: false, cost: 0, days: null, error: null });

  useEffect(() => {
    fetchCart();
    detectCountry();
  }, []);

  useEffect(() => {
    // Recalculate shipping when country or cart changes
    if (cart && formData.country) {
      estimateShipping();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart, formData.country, currency]);

  const detectCountry = async () => {
    try {
      const res = await fetch(`${API}/geo/detect`);
      if (res.ok) {
        const data = await res.json();
        if (data?.country_code) {
          setFormData((prev) => ({ ...prev, country: data.country_code }));
        }
      }
    } catch (e) {
      // silent
    }
  };

  const fetchCart = async () => {
    try {
      const response = await axios.get(`${API}/cart`);
      if (!response.data || response.data.items.length === 0) {
        toast.error(isRTL ? 'السلة فارغة' : 'Cart is empty');
        navigate('/cart');
        return;
      }
      setCart(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching cart:', error);
      toast.error(isRTL ? 'فشل في تحميل بيانات السلة' : 'Failed to load cart');
      navigate('/cart');
    }
  };

  const estimateShipping = async () => {
    try {
      setShippingEstimate({ loading: true, cost: 0, days: null, error: null });
      const payload = {
        country_code: formData.country,
        preferred: 'fastest',
        currency: currency || 'SAR',
        markup_pct: 10,
        items: (cart?.items || []).map((it) => ({ product_id: it.product_id, quantity: it.quantity }))
      };
      const res = await fetch(`${API}/shipping/estimate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.status === 400) {
        const detail = await res.json();
        setShippingEstimate({ loading: false, cost: 0, days: null, error: 'unavailable' });
        toast.error(isRTL ? 'الشحن غير متاح لبلدك' : 'Shipping is not available for your country');
        return;
      }
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      const cost = data?.shipping_cost?.[currency] ?? 0;
      const days = data?.estimated_days || null;
      setShippingEstimate({ loading: false, cost, days, error: null });
    } catch (e) {
      console.error('estimateShipping error', e);
      setShippingEstimate({ loading: false, cost: 0, days: null, error: 'server' });
      toast.error(isRTL ? 'تعذر حساب الشحن' : 'Failed to estimate shipping');
    }
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (shippingEstimate.error === 'unavailable') {
      toast.error(isRTL ? 'لا يمكن إتمام الطلب: الشحن غير متاح' : 'Cannot place order: shipping unavailable');
      return;
    }
    setSubmitting(true);

    try {
      const shippingAddress = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        street: formData.street,
        city: formData.city,
        state: formData.state,
        zipCode: formData.zipCode,
        country: formData.country
      };

      const orderData = {
        shipping_address: shippingAddress,
        payment_method: formData.paymentMethod
      };

      await axios.post(`${API}/orders`, orderData);
      toast.success(isRTL ? 'تم إنشاء الطلب بنجاح!' : 'Order created successfully!');
      navigate('/profile?tab=orders');
    } catch (error) {
      console.error('Error creating order:', error);
      toast.error(isRTL ? 'فشل في إنشاء الطلب' : 'Failed to create order');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  const shippingCost = shippingEstimate.cost || 0;
  const totalAmount = (cart.total_amount || 0) + (shippingCost || 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="font-display text-4xl font-bold text-gray-900 mb-4" data-testid="checkout-title">
            {isRTL ? 'إتمام الطلب' : 'Checkout'}
          </h1>
          <p className="text-xl text-gray-600">
            {isRTL ? 'املأ بياناتك لإتمام عملية الشراء' : 'Fill your details to complete the purchase'}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Shipping & Payment Forms */}
            <div className="lg:col-span-2 space-y-8">
              {/* Shipping Address */}
              <Card className="luxury-card p-6">
                <div className="flex items-center mb-6">
                  <MapPin className="h-6 w-6 text-amber-600 ml-3" />
                  <h2 className="text-xl font-bold text-gray-900">{isRTL ? 'عنوان الشحن' : 'Shipping Address'}</h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      name="firstName"
                      placeholder={isRTL ? 'الاسم الأول' : 'First Name'}
                      value={formData.firstName}
                      onChange={handleInputChange}
                      className="pl-10"
                      required
                      data-testid="shipping-first-name"
                    />
                  </div>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      name="lastName"
                      placeholder={isRTL ? 'الاسم الأخير' : 'Last Name'}
                      value={formData.lastName}
                      onChange={handleInputChange}
                      className="pl-10"
                      required
                      data-testid="shipping-last-name"
                    />
                  </div>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      type="email"
                      name="email"
                      placeholder={isRTL ? 'البريد الإلكتروني' : 'Email'}
                      value={formData.email}
                      onChange={handleInputChange}
                      className="pl-10"
                      required
                      data-testid="shipping-email"
                    />
                  </div>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      type="tel"
                      name="phone"
                      placeholder={isRTL ? 'رقم الجوال' : 'Phone'}
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="pl-10"
                      required
                      data-testid="shipping-phone"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Input
                      name="street"
                      placeholder={isRTL ? 'عنوان الشارع ورقم المبنى' : 'Street & Building Number'}
                      value={formData.street}
                      onChange={handleInputChange}
                      required
                      data-testid="shipping-street"
                    />
                  </div>
                  <div>
                    <Input
                      name="city"
                      placeholder={isRTL ? 'المدينة' : 'City'}
                      value={formData.city}
                      onChange={handleInputChange}
                      required
                      data-testid="shipping-city"
                    />
                  </div>
                  <div>
                    <Input
                      name="state"
                      placeholder={isRTL ? 'المنطقة/المحافظة' : 'State/Province'}
                      value={formData.state}
                      onChange={handleInputChange}
                      required
                      data-testid="shipping-state"
                    />
                  </div>
                  <div>
                    <Input
                      name="zipCode"
                      placeholder={isRTL ? 'الرمز البريدي' : 'Postal Code'}
                      value={formData.zipCode}
                      onChange={handleInputChange}
                      required
                      data-testid="shipping-zip"
                    />
                  </div>
                  <div>
                    <Select value={formData.country || 'SA'} onValueChange={(value) => setFormData({ ...formData, country: value })}>
                      <SelectTrigger data-testid="shipping-country">
                        <SelectValue placeholder={isRTL ? 'اختر الدولة' : 'Select Country'} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SA">{isRTL ? 'المملكة العربية السعودية' : 'Saudi Arabia'}</SelectItem>
                        <SelectItem value="AE">{isRTL ? 'الإمارات العربية المتحدة' : 'United Arab Emirates'}</SelectItem>
                        <SelectItem value="KW">{isRTL ? 'الكويت' : 'Kuwait'}</SelectItem>
                        <SelectItem value="QA">{isRTL ? 'قطر' : 'Qatar'}</SelectItem>
                        <SelectItem value="BH">{isRTL ? 'البحرين' : 'Bahrain'}</SelectItem>
                        <SelectItem value="OM">{isRTL ? 'عُمان' : 'Oman'}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </Card>

              {/* Payment Method */}
              <Card className="luxury-card p-6">
                <div className="flex items-center mb-6">
                  <CreditCard className="h-6 w-6 text-amber-600 ml-3" />
                  <h2 className="text-xl font-bold text-gray-900">{isRTL ? 'طريقة الدفع' : 'Payment Method'}</h2>
                </div>
                
                <div className="space-y-4">
                  <Select value={formData.paymentMethod || 'card'} onValueChange={(value) => setFormData({ ...formData, paymentMethod: value })}>
                    <SelectTrigger data-testid="payment-method">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="card">💳 {isRTL ? 'بطاقة ائتمانية' : 'Credit Card'}</SelectItem>
                      <SelectItem value="bank_transfer">🏦 {isRTL ? 'تحويل بنكي' : 'Bank Transfer'}</SelectItem>
                    </SelectContent>
                  </Select>
                  {formData.paymentMethod === 'card' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      <div className="md:col-span-2">
                        <Input name="cardName" placeholder={isRTL ? 'اسم حامل البطاقة' : 'Cardholder Name'} value={formData.cardName} onChange={handleInputChange} required={formData.paymentMethod === 'card'} data-testid="card-name" />
                      </div>
                      <div className="md:col-span-2">
                        <Input name="cardNumber" placeholder={isRTL ? 'رقم البطاقة' : 'Card Number'} value={formData.cardNumber} onChange={handleInputChange} maxLength={19} required={formData.paymentMethod === 'card'} data-testid="card-number" />
                      </div>
                      <div>
                        <Input name="expiryDate" placeholder="MM/YY" value={formData.expiryDate} onChange={handleInputChange} maxLength={5} required={formData.paymentMethod === 'card'} data-testid="card-expiry" />
                      </div>
                      <div>
                        <Input name="cvv" placeholder="CVV" value={formData.cvv} onChange={handleInputChange} maxLength={4} required={formData.paymentMethod === 'card'} data-testid="card-cvv" />
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <Card className="luxury-card p-6 sticky top-24">
                <h2 className="text-xl font-bold text-gray-900 mb-6">{isRTL ? 'ملخص الطلب' : 'Order Summary'}</h2>
                
                <div className="space-y-4 mb-6">
                  {cart.items.map((item, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span className="truncate" data-testid={`summary-item-${index}`}>
                        {item.quantity}x {isRTL ? 'منتج' : 'item'}
                      </span>
                      <span>
                        {(item.price * item.quantity).toFixed(2)} {isRTL ? 'ر.س' : 'SAR'}
                      </span>
                    </div>
                  ))}
                  
                  <hr className="border-gray-200" />
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600">{isRTL ? 'المجموع الجزئي:' : 'Subtotal:'}</span>
                    <span className="font-medium" data-testid="summary-subtotal">
                      {cart.total_amount.toFixed(2)} {isRTL ? 'ر.س' : 'SAR'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">{isRTL ? 'الشحن:' : 'Shipping:'}</span>
                    <span className="font-medium">
                      {shippingEstimate.loading ? (isRTL ? 'جاري الحساب...' : 'Calculating...') : `${shippingCost.toFixed(2)} ${isRTL ? 'ر.س' : 'SAR'}`}
                    </span>
                  </div>

                  {shippingEstimate.days && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Truck className="h-4 w-4 ml-2 text-amber-600" />
                      <span>
                        {isRTL ? 'مدة التوصيل المتوقعة:' : 'Estimated delivery:'} {shippingEstimate.days.min ?? '?'} - {shippingEstimate.days.max ?? '?'} {isRTL ? 'أيام' : 'days'}
                      </span>
                    </div>
                  )}
                  
                  <hr className="border-gray-200" />
                  
                  <div className="flex justify-between text-xl font-bold">
                    <span>{isRTL ? 'المجموع:' : 'Total:'}</span>
                    <span className="text-amber-600" data-testid="summary-total">
                      {totalAmount.toFixed(2)} {isRTL ? 'ر.س' : 'SAR'}
                    </span>
                  </div>
                </div>
                
                <Button 
                  type="submit" 
                  className="btn-luxury w-full" 
                  disabled={submitting || shippingEstimate.error === 'unavailable'}
                  data-testid="place-order-button"
                >
                  {submitting ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span className="ml-2">{isRTL ? 'جاري الطلب...' : 'Placing order...'}</span>
                    </div>
                  ) : (
                    isRTL ? 'تأكيد الطلب' : 'Place Order'
                  )}
                </Button>
                
                <div className="mt-4 text-center text-sm text-gray-500">
                  <p>🔒 {isRTL ? 'معاملاتك محمية بتشفير SSL' : 'Your transactions are protected by SSL'}</p>
                </div>
              </Card>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CheckoutPage;
