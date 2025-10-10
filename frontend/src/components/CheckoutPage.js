import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, MapPin, User, Phone, Mail } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const CheckoutPage = () => {
  const { user } = useAuth();
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

  useEffect(() => {
    fetchCart();
  }, []);

  const fetchCart = async () => {
    try {
      const response = await axios.get(`${API}/cart`);
      if (!response.data || response.data.items.length === 0) {
        toast.error('السلة فارغة');
        navigate('/cart');
        return;
      }
      setCart(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching cart:', error);
      toast.error('فشل في تحميل بيانات السلة');
      navigate('/cart');
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
      
      toast.success('تم إنشاء الطلب بنجاح!');
      navigate('/profile?tab=orders');
    } catch (error) {
      console.error('Error creating order:', error);
      toast.error('فشل في إنشاء الطلب');
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

  const shippingCost = cart.total_amount >= 200 ? 0 : 15;
  const totalAmount = cart.total_amount + shippingCost;

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="font-display text-4xl font-bold text-gray-900 mb-4" data-testid="checkout-title">
            إتمام الطلب
          </h1>
          <p className="text-xl text-gray-600">
            املأ بياناتك لإتمام عملية الشراء
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
                  <h2 className="text-xl font-bold text-gray-900">عنوان الشحن</h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      name="firstName"
                      placeholder="الاسم الأول"
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
                      placeholder="الاسم الأخير"
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
                      placeholder="البريد الإلكتروني"
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
                      placeholder="رقم الجوال"
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
                      placeholder="عنوار الشارع ورقم المبنى"
                      value={formData.street}
                      onChange={handleInputChange}
                      required
                      data-testid="shipping-street"
                    />
                  </div>
                  <div>
                    <Input
                      name="city"
                      placeholder="المدينة"
                      value={formData.city}
                      onChange={handleInputChange}
                      required
                      data-testid="shipping-city"
                    />
                  </div>
                  <div>
                    <Input
                      name="state"
                      placeholder="المنطقة/المحافظة"
                      value={formData.state}
                      onChange={handleInputChange}
                      required
                      data-testid="shipping-state"
                    />
                  </div>
                  <div>
                    <Input
                      name="zipCode"
                      placeholder="الرمز البريدي"
                      value={formData.zipCode}
                      onChange={handleInputChange}
                      required
                      data-testid="shipping-zip"
                    />
                  </div>
                  <div>
                    <Select value={formData.country || "SA"} onValueChange={(value) => setFormData({...formData, country: value})}>
                      <SelectTrigger data-testid="shipping-country">
                        <SelectValue placeholder="اختر الدولة" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SA">المملكة العربية السعودية</SelectItem>
                        <SelectItem value="AE">الإمارات العربية المتحدة</SelectItem>
                        <SelectItem value="KW">الكويت</SelectItem>
                        <SelectItem value="QA">قطر</SelectItem>
                        <SelectItem value="BH">البحرين</SelectItem>
                        <SelectItem value="OM">عمان</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </Card>

              {/* Payment Method */}
              <Card className="luxury-card p-6">
                <div className="flex items-center mb-6">
                  <CreditCard className="h-6 w-6 text-amber-600 ml-3" />
                  <h2 className="text-xl font-bold text-gray-900">طريقة الدفع</h2>
                </div>
                
                <div className="space-y-4">
                  <Select value={formData.paymentMethod || "card"} onValueChange={(value) => setFormData({...formData, paymentMethod: value})}>
                    <SelectTrigger data-testid="payment-method">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="card">💳 بطاقة ائتمانية</SelectItem>
                      <SelectItem value="cod">💰 دفع عند الاستلام</SelectItem>
                      <SelectItem value="bank_transfer">🏦 تحويل بنكي</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  {formData.paymentMethod === 'card' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      <div className="md:col-span-2">
                        <Input
                          name="cardName"
                          placeholder="اسم حامل البطاقة"
                          value={formData.cardName}
                          onChange={handleInputChange}
                          required={formData.paymentMethod === 'card'}
                          data-testid="card-name"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Input
                          name="cardNumber"
                          placeholder="رقم البطاقة"
                          value={formData.cardNumber}
                          onChange={handleInputChange}
                          maxLength={19}
                          required={formData.paymentMethod === 'card'}
                          data-testid="card-number"
                        />
                      </div>
                      <div>
                        <Input
                          name="expiryDate"
                          placeholder="MM/YY"
                          value={formData.expiryDate}
                          onChange={handleInputChange}
                          maxLength={5}
                          required={formData.paymentMethod === 'card'}
                          data-testid="card-expiry"
                        />
                      </div>
                      <div>
                        <Input
                          name="cvv"
                          placeholder="CVV"
                          value={formData.cvv}
                          onChange={handleInputChange}
                          maxLength={4}
                          required={formData.paymentMethod === 'card'}
                          data-testid="card-cvv"
                        />
                      </div>
                    </div>
                  )}
                  
                  {formData.paymentMethod === 'cod' && (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                      <p className="text-amber-800">
                        💰 سيتم تحصيل المبلغ عند استلام الطلب
                      </p>
                    </div>
                  )}
                  
                  {formData.paymentMethod === 'bank_transfer' && (
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-blue-800">
                        🏦 سيتم إرسال تفاصيل التحويل البنكي عبر البريد الإلكتروني
                      </p>
                    </div>
                  )}
                </div>
              </Card>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <Card className="luxury-card p-6 sticky top-24">
                <h2 className="text-xl font-bold text-gray-900 mb-6">ملخص الطلب</h2>
                
                <div className="space-y-4 mb-6">
                  {cart.items.map((item, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span className="truncate" data-testid={`summary-item-${index}`}>
                        {item.quantity}x منتج
                      </span>
                      <span>{(item.price * item.quantity).toFixed(2)} ر.س</span>
                    </div>
                  ))}
                  
                  <hr className="border-gray-200" />
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600">المجموع الجزئي:</span>
                    <span className="font-medium" data-testid="summary-subtotal">
                      {cart.total_amount.toFixed(2)} ر.س
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600">الشحن:</span>
                    <span className={`font-medium ${shippingCost === 0 ? 'text-green-600' : ''}`}>
                      {shippingCost === 0 ? 'مجاني' : `${shippingCost.toFixed(2)} ر.س`}
                    </span>
                  </div>
                  
                  <hr className="border-gray-200" />
                  
                  <div className="flex justify-between text-xl font-bold">
                    <span>المجموع:</span>
                    <span className="text-amber-600" data-testid="summary-total">
                      {totalAmount.toFixed(2)} ر.س
                    </span>
                  </div>
                </div>
                
                <Button 
                  type="submit" 
                  className="btn-luxury w-full" 
                  disabled={submitting}
                  data-testid="place-order-button"
                >
                  {submitting ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span className="ml-2">جاري الطلب...</span>
                    </div>
                  ) : (
                    'تأكيد الطلب'
                  )}
                </Button>
                
                <div className="mt-4 text-center text-sm text-gray-500">
                  <p>🔒 معاملاتك محمية بتشفير SSL</p>
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