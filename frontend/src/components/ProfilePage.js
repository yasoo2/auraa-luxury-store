import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { User, Package, MapPin, Settings, Eye } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { formatDate } from '../utils/dateUtils';
import axios from 'axios';
import { API_BASE_URL } from '../api';

const BACKEND_URL = API_BASE_URL;
const API = `${BACKEND_URL}/api`;

const ProfilePage = () => {
  const { user } = useAuth();
  const { language, formatMoney } = useLanguage();
  const isRTL = language === 'ar';
  const [searchParams] = useSearchParams();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'profile');
  const [profileData, setProfileData] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    email: user?.email || '',
    phone: user?.phone || ''
  });
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [addressData, setAddressData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    street: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'Saudi Arabia'
  });

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await axios.get(`${API}/orders`);
      setOrders(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error(isRTL ? 'فشل في تحميل الطلبات' : 'Failed to load orders');
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-blue-100 text-blue-800',
      shipped: 'bg-purple-100 text-purple-800',
      delivered: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  // "في الانتظار" told the customer nothing, and its replacement "بانتظار
  // التأكيد" was worse: it told a paying customer their order sat waiting for
  // somebody's blessing. Nothing on a dropshipping shop waits for a human —
  // the only thing an order can be waiting for is the customer's own payment,
  // so that is the only wait the screen is allowed to name.
  const getStatusText = (order) => {
    if (order?.status === 'pending' && order?.payment_status !== 'paid') {
      return isRTL ? 'بانتظار الدفع' : 'Awaiting payment';
    }
    const statusTexts = isRTL ? {
      // Paid and pending = the seconds between payment and the automatic
      // send to the supplier. To the customer that is simply "being prepared".
      pending: 'قيد التجهيز',
      processing: 'قيد التجهيز',
      shipped: 'تم الشحن',
      delivered: 'تم التسليم',
      cancelled: 'ملغي'
    } : {
      pending: 'Being prepared',
      processing: 'Being prepared',
      shipped: 'Shipped',
      delivered: 'Delivered',
      cancelled: 'Cancelled'
    };
    return statusTexts[order?.status] || order?.status;
  };

  // What happens next, in the customer's words.
  //
  // This used to depend on the order status alone, so a pending order always
  // read "we will contact you to settle payment" — including for a customer
  // who had chosen bank transfer and was waiting on nobody but themselves.
  const getStatusNote = (order) => {
    const status = order?.status;
    if (status === 'pending' && order?.payment_status !== 'paid') {
      if (order?.payment_method === 'bank_transfer') {
        return isRTL
          ? 'وصلنا طلبك وننتظر وصول الحوالة. اضغط «أكمِل الدفع» لتفاصيل الحساب ورقم الطلب.'
          : 'We received your order and are waiting for the transfer. Press "Complete payment" for the account details and order number.';
      }
      if (order?.payment_method === 'card') {
        return isRTL
          ? 'لم يكتمل الدفع بالبطاقة. اضغط «أكمِل الدفع» لإتمامه — يبدأ تجهيز الطلب فور نجاحه.'
          : 'The card payment did not complete. Press "Complete payment" to finish it — preparation starts the moment it succeeds.';
      }
      return isRTL
        ? 'وصلنا طلبك. نراجعه ونتواصل معك لإتمام الدفع قبل الشحن.'
        : 'We received your order. We will review it and contact you to complete payment before shipping.';
    }
    const notes = isRTL ? {
      pending: 'تم تأكيد استلام المبلغ. نجهّز طلبك للشحن.',
      processing: 'تم تأكيد طلبك ويجري تجهيزه للشحن.',
      shipped: 'طلبك في الطريق إليك.',
      cancelled: 'أُلغي هذا الطلب. تواصل معنا إن كان ذلك غير متوقّع.',
    } : {
      pending: 'Payment confirmed. We are preparing your order for shipping.',
      processing: 'Your order is confirmed and being prepared for shipping.',
      shipped: 'Your order is on its way to you.',
      cancelled: 'This order was cancelled. Contact us if that is unexpected.',
    };
    return notes[status] || '';
  };

  const awaitingPayment = (order) =>
    order?.payment_status !== 'paid'
    && !['cancelled', 'delivered', 'shipped'].includes(order?.status);

  // A payment method the shop actually offers. Anything that was not 'card'
  // used to be labelled as an electronic payment — one that never happened,
  // on a shop with no payment provider at all.
  const getPaymentText = (method) => {
    const methods = isRTL ? {
      on_confirmation: 'الدفع عند تأكيد الطلب',
      cod: 'الدفع عند الاستلام',
      bank_transfer: 'تحويل بنكي',
      card: 'بطاقة ائتمانية',
    } : {
      on_confirmation: 'Payment on confirmation',
      cod: 'Cash on delivery',
      bank_transfer: 'Bank transfer',
      card: 'Credit card',
    };
    return methods[method] || (isRTL ? 'يُحدَّد عند التأكيد' : 'Set on confirmation');
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(
        `${API}/auth/profile`,
        profileData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        toast.success(isRTL ? 'تم تحديث الملف الشخصي بنجاح' : 'Profile updated successfully');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(isRTL ? 'فشل في تحديث الملف الشخصي' : 'Failed to update profile');
    }
  };

  const handleAddressUpdate = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(
        `${API}/auth/profile`,
        { address: addressData },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        toast.success(isRTL ? 'تم حفظ العنوان بنجاح' : 'Address saved successfully');
        setIsEditingAddress(false);
        // Update user context with new data
        window.location.reload(); // Simple reload to update user context
      }
    } catch (error) {
      console.error('Error saving address:', error);
      toast.error(isRTL ? 'فشل في حفظ العنوان' : 'Failed to save address');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="font-display text-4xl font-bold text-gray-900 mb-4" data-testid="profile-title">
            {isRTL ? 'مرحباً' : 'Welcome'} {user?.first_name}!
          </h1>
          <p className="text-xl text-gray-600">
            {isRTL ? 'إدارة حسابك وطلباتك' : 'Manage your account and orders'}
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="profile" className="flex items-center space-x-2" data-testid="profile-tab">
              <User className="h-4 w-4" />
              <span>{isRTL ? 'الملف الشخصي' : 'Profile'}</span>
            </TabsTrigger>
            <TabsTrigger value="orders" className="flex items-center space-x-2" data-testid="orders-tab">
              <Package className="h-4 w-4" />
              <span>{isRTL ? 'طلباتي' : 'My orders'}</span>
            </TabsTrigger>
            <TabsTrigger value="addresses" className="flex items-center space-x-2">
              <MapPin className="h-4 w-4" />
              <span>{isRTL ? 'عناويني' : 'My addresses'}</span>
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <Card className="luxury-card p-6">
              <div className="flex items-center mb-6">
                <User className="h-6 w-6 text-amber-600 me-3" />
                <h2 className="text-xl font-bold text-gray-900">{isRTL ? 'بياناتي الشخصية' : 'My details'}</h2>
              </div>
              
              <form onSubmit={handleProfileUpdate} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {isRTL ? 'الاسم الأول' : 'First name'}
                    </label>
                    <Input
                      value={profileData.first_name}
                      onChange={(e) => setProfileData({...profileData, first_name: e.target.value})}
                      data-testid="profile-first-name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {isRTL ? 'الاسم الأخير' : 'Last name'}
                    </label>
                    <Input
                      value={profileData.last_name}
                      onChange={(e) => setProfileData({...profileData, last_name: e.target.value})}
                      data-testid="profile-last-name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {isRTL ? 'البريد الإلكتروني' : 'Email'}
                    </label>
                    <Input
                      type="email"
                      value={profileData.email}
                      onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                      data-testid="profile-email"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {isRTL ? 'رقم الجوال' : 'Mobile number'}
                    </label>
                    <Input
                      type="tel"
                      value={profileData.phone}
                      onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
                      data-testid="profile-phone"
                    />
                  </div>
                </div>
                
                <Button type="submit" className="btn-luxury" data-testid="update-profile-button">
                  {isRTL ? 'حفظ التغييرات' : 'Save changes'}
                </Button>
              </form>
            </Card>
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders">
            <div className="space-y-6">
              {orders.length === 0 ? (
                <Card className="luxury-card p-8 text-center">
                  <Package className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{isRTL ? 'لا توجد طلبات' : 'No orders yet'}</h3>
                  <p className="text-gray-600 mb-4">
                    {isRTL ? 'لم تقم بأي طلبات بعد' : 'You have not placed any orders yet'}
                  </p>
                  <Link to="/products">
                    <Button className="btn-luxury">
                      {isRTL ? 'تابع التسوق' : 'Continue shopping'}
                    </Button>
                  </Link>
                </Card>
              ) : (
                orders.map((order) => (
                  <Card key={order.id} className="luxury-card p-6" data-testid={`order-${order.id}`}>
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 mb-2">
                          {isRTL ? 'طلب رقم:' : 'Order no.:'} #{order.order_number || order.id || '—'}
                        </h3>
                        <p className="text-gray-600">
                          {isRTL ? 'تاريخ الطلب: ' : 'Order Date: '}
                          {formatDate(order.created_at, language, { format: 'medium' })}
                        </p>
                        {/* A one-word status leaves the customer guessing.
                            Say what is happening and what comes next. */}
                        {getStatusNote(order) && (
                          <p className="text-sm text-amber-700 mt-2" data-testid="order-status-note">
                            {getStatusNote(order)}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-4 md:mt-0">
                        <Badge className={getStatusColor(order.status)}>
                          {getStatusText(order)}
                        </Badge>
                        {/* There was a "عرض التفاصيل" button here with no
                            onClick — it had never done anything since the day
                            it was added. What a customer with an unpaid order
                            actually needs is the account to pay into, so that
                            is what this button is now. */}
                        {awaitingPayment(order) && (
                          <Link to={`/order/${order.id}/pay`} data-testid="complete-payment">
                            <Button size="sm" className="bg-amber-600 hover:bg-amber-700">
                              <Eye className="h-4 w-4 me-1" />
                              {isRTL ? 'أكمِل الدفع' : 'Complete payment'}
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                    
                    <div className="border-t border-gray-200 pt-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">{isRTL ? 'عدد المنتجات:' : 'Items:'}</p>
                          <p className="font-medium">{order.items.length} {isRTL ? 'منتج' : 'items'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">{isRTL ? 'المجموع:' : 'Total:'}</p>
                          {/* Printed "ر.س" after the number whatever currency
                              the shopper had selected, so a total shown in
                              dollars was labelled in riyals. */}
                          <p className="font-medium text-amber-600">{formatMoney(order.total_amount)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">{isRTL ? 'طريقة الدفع:' : 'Payment method:'}</p>
                          <p className="font-medium">
                            {getPaymentText(order.payment_method)}
                          </p>
                        </div>
                      </div>
                      
                      {order.tracking_number && (
                        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <p className="text-sm text-blue-800">
                            {isRTL ? 'رقم التتبع:' : 'Tracking no.:'} <span className="font-mono">{order.tracking_number}</span>
                          </p>
                        </div>
                      )}
                    </div>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* Addresses Tab */}
          <TabsContent value="addresses">
            {user?.address ? (
              <Card className="luxury-card p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center">
                    <MapPin className="h-6 w-6 text-amber-600 me-3" />
                    <h3 className="text-xl font-bold text-gray-900">{isRTL ? 'عنوان الشحن' : 'Shipping address'}</h3>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const address = user?.address || {};
                      setAddressData({
                        firstName: address.firstName || '',
                        lastName: address.lastName || '',
                        phone: address.phone || '',
                        street: address.street || '',
                        city: address.city || '',
                        state: address.state || '',
                        postalCode: address.postalCode || '',
                        country: address.country || 'Saudi Arabia',
                      });
                      setIsEditingAddress(true);
                    }}
                    className="text-amber-600 border-amber-600 hover:bg-amber-50"
                  >
                    {isRTL ? 'تعديل' : 'Edit'}
                  </Button>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <p className="font-medium">{user.address.firstName} {user.address.lastName}</p>
                  <p className="text-gray-600">{user.address.street}</p>
                  <p className="text-gray-600">{user.address.city}, {user.address.state} {user.address.postalCode}</p>
                  <p className="text-gray-600">{user.address.country}</p>
                  <p className="text-gray-600">{isRTL ? 'هاتف:' : 'Phone:'} {user.address.phone}</p>
                </div>
              </Card>
            ) : (
              <Card className="luxury-card p-8 text-center">
                <MapPin className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">{isRTL ? 'لا توجد عناوين' : 'No addresses'}</h3>
                <p className="text-gray-600 mb-4">
                  {isRTL ? 'لم تقم بحفظ أي عناوين بعد' : 'You have not saved any addresses yet'}
                </p>
                <Button 
                  className="btn-luxury"
                  onClick={() => {
                    setAddressData({
                      firstName: '',
                      lastName: '',
                      phone: '',
                      street: '',
                      city: '',
                      state: '',
                      postalCode: '',
                      country: 'Saudi Arabia',
                    });
                    setIsEditingAddress(true);
                  }}
                >
                  {isRTL ? 'إضافة عنوان جديد' : 'Add a new address'}
                </Button>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Address Edit Modal */}
        {isEditingAddress && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <Card className="luxury-card p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  {user?.address ? (isRTL ? 'تعديل العنوان' : 'Edit address') : (isRTL ? 'إضافة عنوان جديد' : 'Add a new address')}
                </h2>
                <button
                  onClick={() => setIsEditingAddress(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <span className="text-2xl">×</span>
                </button>
              </div>

              <form onSubmit={handleAddressUpdate} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {isRTL ? 'الاسم الأول' : 'First name'}
                    </label>
                    <Input
                      value={addressData.firstName}
                      onChange={(e) => setAddressData({...addressData, firstName: e.target.value})}
                      required
                      placeholder={isRTL ? "أحمد" : "John"}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {isRTL ? 'الاسم الأخير' : 'Last name'}
                    </label>
                    <Input
                      value={addressData.lastName}
                      onChange={(e) => setAddressData({...addressData, lastName: e.target.value})}
                      required
                      placeholder={isRTL ? "محمد" : "Smith"}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {isRTL ? 'رقم الهاتف' : 'Phone number'}
                  </label>
                  <Input
                    type="tel"
                    value={addressData.phone}
                    onChange={(e) => setAddressData({...addressData, phone: e.target.value})}
                    required
                    placeholder="+905013715391"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {isRTL ? 'عنوان الشارع ورقم المبنى' : 'Street address and building no.'}
                  </label>
                  <Input
                    value={addressData.street}
                    onChange={(e) => setAddressData({...addressData, street: e.target.value})}
                    required
                    placeholder={isRTL ? "شارع الملك فهد، مبنى 123" : "12 King Street, Building 3"}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {isRTL ? 'المدينة' : 'City'}
                    </label>
                    <Input
                      value={addressData.city}
                      onChange={(e) => setAddressData({...addressData, city: e.target.value})}
                      required
                      placeholder={isRTL ? "الرياض" : "Istanbul"}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {isRTL ? 'المنطقة' : 'State / Region'}
                    </label>
                    <Input
                      value={addressData.state}
                      onChange={(e) => setAddressData({...addressData, state: e.target.value})}
                      required
                      placeholder={isRTL ? "الرياض" : "Istanbul"}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {isRTL ? 'الرمز البريدي' : 'Postal code'}
                    </label>
                    <Input
                      value={addressData.postalCode}
                      onChange={(e) => setAddressData({...addressData, postalCode: e.target.value})}
                      required
                      placeholder="12345"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {isRTL ? 'الدولة' : 'Country'}
                    </label>
                    <Input
                      value={addressData.country}
                      onChange={(e) => setAddressData({...addressData, country: e.target.value})}
                      required
                      placeholder={isRTL ? "السعودية" : "Türkiye"}
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button type="submit" className="btn-luxury flex-1">
                    {isRTL ? 'حفظ العنوان' : 'Save address'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsEditingAddress(false)}
                    className="flex-1"
                  >
                    إلغاء
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;