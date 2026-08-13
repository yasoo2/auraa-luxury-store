import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, MapPin, User, Phone, Mail, Truck } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { countryOptions } from '../data/countries';
import axios from 'axios';
import { trackBeginCheckout, trackPurchase } from '../utils/analytics';
import { apiGet, apiPost } from '../api';
import { API_BASE_URL } from '../api';

const BACKEND_URL = API_BASE_URL;
const API = `${BACKEND_URL}/api`;

const createOrderRequestKey = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `order-${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const CheckoutPage = () => {
  const { user } = useAuth();
  const { currency, language, formatMoney } = useLanguage();
  const isRTL = language === 'ar' || language === 'he';
  const navigate = useNavigate();
  const orderRequestKey = useRef(createOrderRequestKey());
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
    // Payment. Left empty on purpose: which methods exist is the server's
    // answer, and pre-selecting one here is how you end up posting a method
    // the shop does not offer.
    paymentMethod: '',
  });

  const countries = useMemo(() => countryOptions(language), [language]);
  const [shippingEstimate, setShippingEstimate] = useState({ loading: false, cost: 0, days: null, error: null });
  const [paymentMethods, setPaymentMethods] = useState({ loading: true, methods: [], error: '' });

  useEffect(() => {
    fetchCart();
    detectCountry();
    fetchPaymentMethods();
  }, []);

  useEffect(() => {
    // Recalculate shipping when country or cart changes
    if (cart && formData.country) {
      estimateShipping();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart, formData.country, currency]);

  const fetchPaymentMethods = async () => {
    try {
      const data = await apiGet('/api/payment-methods');
      const methods = data?.methods || [];
      setPaymentMethods({ loading: false, methods, error: '' });
      // Whatever the server offers first, not a name hardcoded here.
      setFormData((prev) => ({
        ...prev,
        paymentMethod: prev.paymentMethod || methods[0]?.id || '',
      }));
    } catch (err) {
      // Guessing that bank transfer is available and showing an IBAN we do not
      // have would be worse than saying the till is down.
      setPaymentMethods({
        loading: false,
        methods: [],
        error: isRTL
          ? 'تعذّر تحميل طرق الدفع. حدِّث الصفحة أو تواصل معنا.'
          : 'Could not load the payment methods. Refresh, or get in touch.',
      });
    }
  };

  const detectCountry = async () => {
    try {
      const data = await apiGet('/api/geo/detect');
      if (data?.country_code) {
        setFormData((prev) => ({ ...prev, country: data.country_code }));
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
      
      // Track begin_checkout in GA4
      // The cart's total is `total_amount` — the server has never had a
      // `total_price`. Reading the missing name reported an undefined basket
      // value to analytics, and below it turned the purchase total into NaN.
      trackBeginCheckout({
        items: response.data.items,
        total: response.data.total_amount,
        currency: currency || 'SAR'
      });
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
      const data = await apiPost('/api/shipping/estimate', payload);
      // `shipping_cost` is a number and `estimated_days` a string like "5-10".
      const cost = Number(data?.shipping_cost ?? 0);
      const days = data?.estimated_days || null;
      setShippingEstimate({
        loading: false,
        cost,
        days,
        free: Boolean(data?.free_shipping) || cost === 0,
        importDuty: Boolean(data?.import_duty_may_apply),
        error: null,
      });
    } catch (e) {
      console.error('estimateShipping error', e);
      // Check if error is 400 (unavailable)
      if (e.message && e.message.includes('400')) {
        setShippingEstimate({ loading: false, cost: 0, days: null, error: 'unavailable' });
        toast.error(isRTL ? 'الشحن غير متاح لبلدك' : 'Shipping is not available for your country');
      } else {
        setShippingEstimate({ loading: false, cost: 0, days: null, error: 'server' });
        toast.error(isRTL ? 'تعذر حساب الشحن' : 'Failed to estimate shipping');
      }
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
    if (!formData.paymentMethod) {
      toast.error(isRTL ? 'اختر طريقة الدفع أولاً' : 'Choose a payment method first');
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

      const response = await axios.post(`${API}/orders`, orderData, {
        headers: { 'Idempotency-Key': orderRequestKey.current },
      });
      const order = response.data;
      
      // Track purchase in GA4
      trackPurchase({
        id: order.id || order.order_id,
        items: cart.items,
        // `|| 15` invented a shipping charge whenever the real one was zero —
        // which, now that delivery is inside the price, is always.
        total: (cart.total_amount || 0) + (shippingEstimate.cost || 0),
        shipping: shippingEstimate.cost || 0,
        tax: 0,
        currency: currency || 'SAR'
      });
      
      if (formData.paymentMethod === 'card') {
        // Like every shop on earth: address in, card next — straight to the
        // gateway's page, with no intermediate screen asking the customer to
        // press "pay" a second time. The order already exists, so if they
        // abandon here nothing is lost and /order/:id/pay is the way back.
        try {
          const session = await apiPost(`/api/orders/${order.id}/pay-session`, {});
          if (!session?.payment_page_url) throw new Error('no payment page');
          window.location.assign(session.payment_page_url);
          return;
        } catch (err) {
          console.error('Could not open the payment page:', err);
          navigate(`/order/${order.id}/pay`);
          return;
        }
      }

      toast.success(isRTL ? 'تم استلام طلبك' : 'Your order is in');
      // Not the order list. The customer still has to pay, and the list said
      // only "بانتظار" — waiting — without ever saying it was waiting on them.
      navigate(`/order/${order.id}/pay`);
    } catch (error) {
      // The server says which product went out of stock, which address field
      // is missing, that the till is down. Replacing all of that with "فشل في
      // إنشاء الطلب" left the customer with nothing to act on.
      console.error('Error creating order:', error);
      toast.error(error.response?.data?.detail
        || (isRTL ? 'فشل في إنشاء الطلب' : 'Failed to create order'));
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
                  <MapPin className="h-6 w-6 text-amber-600 me-3" />
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
                      {/* Six countries used to be listed here. The shop sells
                          worldwide, so a shopper anywhere else could not say
                          where they live. */}
                      <SelectContent className="max-h-72">
                        {countries.priority.map(({ code, name }) => (
                          <SelectItem key={code} value={code}>{name}</SelectItem>
                        ))}
                        <div className="my-1 border-t border-gray-200" />
                        {countries.rest.map(({ code, name }) => (
                          <SelectItem key={code} value={code}>{name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </Card>

              {/* Payment Method */}
              <Card className="luxury-card p-6">
                <div className="flex items-center mb-6">
                  <CreditCard className="h-6 w-6 text-amber-600 me-3" />
                  <h2 className="text-xl font-bold text-gray-900">{isRTL ? 'طريقة الدفع' : 'Payment Method'}</h2>
                </div>
                
                {/*
                  There used to be a card form here — cardholder, number,
                  expiry, CVV, all required — and the store has no payment
                  provider of any kind. The fields were never sent anywhere and
                  nothing was ever charged, so every customer who filled them in
                  read "order placed" and believed they had paid. Asking for a
                  card and taking nothing is the worst thing this shop could
                  tell someone.

                  Until a real gateway is connected, the checkout says what
                  actually happens: the order is placed, and payment is settled
                  with the customer before it ships. That matches the flow the
                  shop really runs, where the owner reviews every order by hand.
                */}
                <div className="space-y-4">
                  {/* Said before they order, not after customs holds the
                      parcel. */}
                  {shippingEstimate.importDuty && (
                    <div
                      className="border border-gray-200 bg-gray-50 rounded-lg p-4 text-sm text-gray-700 mb-4"
                      data-testid="import-duty-notice"
                    >
                      {isRTL
                        ? 'الشحن الدولي: قد تفرض جماركُ بلدك رسوماً عند الاستلام، وهي على المشتري ولا يحصّلها المتجر.'
                        : 'International delivery: your country’s customs may charge import duty on arrival. It is payable by you and is not collected by the store.'}
                    </div>
                  )}
                  {paymentMethods.loading ? (
                    <div className="h-20 bg-gray-100 rounded-lg animate-pulse" />
                  ) : paymentMethods.error ? (
                    <div
                      role="alert"
                      data-testid="payment-methods-error"
                      className="border border-red-200 bg-red-50 text-red-800 rounded-lg p-4 text-sm"
                    >
                      <p className="mb-3">{paymentMethods.error}</p>
                      {/* A dropped request, a backend mid-deploy: all
                          recoverable, and all of them used to mean reloading
                          the page and filling the address in again. */}
                      <Button
                        type="button"
                        onClick={() => {
                          setPaymentMethods({ loading: true, methods: [], error: '' });
                          fetchPaymentMethods();
                        }}
                        data-testid="retry-payment-methods"
                        variant="outline"
                        size="sm"
                      >
                        {isRTL ? 'إعادة المحاولة' : 'Try again'}
                      </Button>
                    </div>
                  ) : paymentMethods.methods.length === 0 ? (
                    <div
                      role="alert"
                      data-testid="no-payment-methods"
                      className="border border-red-200 bg-red-50 text-red-800 rounded-lg p-4 text-sm"
                    >
                      {isRTL
                        ? 'لا توجد طريقة دفع متاحة حالياً، فلا يمكن إتمام الطلب. تواصل معنا.'
                        : 'No payment method is available right now, so the order cannot be completed. Please get in touch.'}
                    </div>
                  ) : (
                    <div className="space-y-3" data-testid="payment-method">
                      {paymentMethods.methods.map((method) => {
                        const selected = formData.paymentMethod === method.id;
                        return (
                          <label
                            key={method.id}
                            className={`block border rounded-lg p-4 cursor-pointer transition ${
                              selected
                                ? 'border-amber-400 bg-amber-50'
                                : 'border-gray-200 hover:border-amber-200'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <input
                                type="radio"
                                name="paymentMethod"
                                value={method.id}
                                checked={selected}
                                onChange={handleInputChange}
                                data-testid={`payment-method-${method.id}`}
                                className="mt-1 accent-amber-600"
                              />
                              <div className="min-w-0">
                                <p className="font-semibold text-gray-900">
                                  {method.id === 'card'
                                    ? (isRTL ? 'بطاقة ائتمانية أو مدى' : 'Credit or debit card')
                                    : method.id === 'bank_transfer'
                                      ? (isRTL ? 'حوالة بنكية' : 'Bank transfer')
                                      : (isRTL ? 'الدفع عند تأكيد الطلب' : 'Payment on confirmation')}
                                </p>
                                <p className="text-sm text-gray-700">
                                  {method.id === 'card'
                                    ? (isRTL
                                      ? 'Visa و Mastercard و American Express من أي بلد، عبر صفحة iyzico المؤمّنة مع 3D Secure. لا يمرّ رقم بطاقتك بخوادمنا.'
                                      : 'Visa, Mastercard and American Express from any country, through iyzico’s secured page with 3D Secure. Your card number never touches our servers.')
                                    : method.id === 'bank_transfer'
                                      ? (isRTL
                                        ? `حوّل المبلغ إلى حساب المتجر في ${method.bank_name}. تظهر تفاصيل الحساب بعد تأكيد الطلب.`
                                        : `Transfer the amount to the store's account at ${method.bank_name}. The details appear once the order is placed.`)
                                      : (isRTL
                                        ? 'نراجع طلبك ونتواصل معك لإتمام الدفع قبل الشحن. لن يُخصم منك شيء الآن.'
                                        : 'We review your order and contact you to settle payment before it ships. Nothing is charged now.')}
                                </p>
                                {method.sandbox && (
                                  <p role="alert" className="mt-1 text-xs text-red-700 font-semibold">
                                    {isRTL
                                      ? '⚠️ وضع الاختبار مفعّل — لن يُخصم مال حقيقي.'
                                      : '⚠️ Sandbox mode is on — no real money will move.'}
                                  </p>
                                )}
                              </div>
                            </div>
                          </label>
                        );
                      })}
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
                        {formatMoney(item.price * item.quantity)}
                      </span>
                    </div>
                  ))}
                  
                  <hr className="border-gray-200" />
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600">{isRTL ? 'المجموع الجزئي:' : 'Subtotal:'}</span>
                    <span className="font-medium" data-testid="summary-subtotal">
                      {formatMoney(cart.total_amount || 0)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">{isRTL ? 'الشحن:' : 'Shipping:'}</span>
                    <span className="font-medium">
                      {shippingEstimate.loading
                        ? (isRTL ? 'جاري الحساب...' : 'Calculating...')
                        : shippingCost === 0
                          ? (isRTL ? 'مجاني' : 'Free')
                          : `${formatMoney(shippingCost)}`}
                    </span>
                  </div>

                  {shippingEstimate.days && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Truck className="h-4 w-4 me-2 text-amber-600" />
                      <span>
                        {isRTL ? 'مدة التوصيل المتوقعة:' : 'Estimated delivery:'} {shippingEstimate.days} {isRTL ? 'أيام' : 'days'}
                      </span>
                    </div>
                  )}
                  
                  <hr className="border-gray-200" />
                  
                  <div className="flex justify-between text-xl font-bold">
                    <span>{isRTL ? 'المجموع:' : 'Total:'}</span>
                    <span className="text-amber-600" data-testid="summary-total">
                      {formatMoney(totalAmount)}
                    </span>
                  </div>
                </div>
                
                <Button 
                  type="submit" 
                  className="btn-luxury w-full" 
                  disabled={submitting
                    || shippingEstimate.error === 'unavailable'
                    // Placing an order the shop cannot be paid for is the one
                    // outcome this page must not produce.
                    || !formData.paymentMethod}
                  data-testid="place-order-button"
                >
                  {submitting ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span className="ms-2">
                        {formData.paymentMethod === 'card'
                          ? (isRTL ? 'جارٍ فتح صفحة الدفع…' : 'Opening the payment page…')
                          : (isRTL ? 'جاري الطلب...' : 'Placing order...')}
                      </span>
                    </div>
                  ) : (
                    // The button says what pressing it does. With a card
                    // selected it starts a payment, and calling that "تأكيد
                    // الطلب" is how customers end up not knowing they paid.
                    formData.paymentMethod === 'card'
                      ? (isRTL ? 'ادفع الآن' : 'Pay now')
                      : (isRTL ? 'تأكيد الطلب' : 'Place Order')
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
