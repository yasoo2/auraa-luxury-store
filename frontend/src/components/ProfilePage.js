import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { User, Package, MapPin, Settings, Eye } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ProfilePage = () => {
  const { user } = useAuth();
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
      toast.error('فشل في تحميل الطلبات');
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

  const getStatusText = (status) => {
    const statusTexts = {
      pending: 'في الانتظار',
      processing: 'قيد المعالجة',
      shipped: 'تم الشحن',
      delivered: 'تم التسليم',
      cancelled: 'ملغي'
    };
    return statusTexts[status] || status;
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
        toast.success('تم تحديث الملف الشخصي بنجاح');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('فشل في تحديث الملف الشخصي');
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
        toast.success('تم حفظ العنوان بنجاح');
        setIsEditingAddress(false);
        // Update user context with new data
        window.location.reload(); // Simple reload to update user context
      }
    } catch (error) {
      console.error('Error saving address:', error);
      toast.error('فشل في حفظ العنوان');
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
            مرحباً {user?.first_name}!
          </h1>
          <p className="text-xl text-gray-600">
            إدارة حسابك وطلباتك
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="profile" className="flex items-center space-x-2" data-testid="profile-tab">
              <User className="h-4 w-4" />
              <span>الملف الشخصي</span>
            </TabsTrigger>
            <TabsTrigger value="orders" className="flex items-center space-x-2" data-testid="orders-tab">
              <Package className="h-4 w-4" />
              <span>طلباتي</span>
            </TabsTrigger>
            <TabsTrigger value="addresses" className="flex items-center space-x-2">
              <MapPin className="h-4 w-4" />
              <span>عناويني</span>
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <Card className="luxury-card p-6">
              <div className="flex items-center mb-6">
                <User className="h-6 w-6 text-amber-600 ml-3" />
                <h2 className="text-xl font-bold text-gray-900">بياناتي الشخصية</h2>
              </div>
              
              <form onSubmit={handleProfileUpdate} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      الاسم الأول
                    </label>
                    <Input
                      value={profileData.first_name}
                      onChange={(e) => setProfileData({...profileData, first_name: e.target.value})}
                      data-testid="profile-first-name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      الاسم الأخير
                    </label>
                    <Input
                      value={profileData.last_name}
                      onChange={(e) => setProfileData({...profileData, last_name: e.target.value})}
                      data-testid="profile-last-name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      البريد الإلكتروني
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
                      رقم الجوال
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
                  حفظ التغييرات
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
                  <h3 className="text-xl font-bold text-gray-900 mb-2">لا توجد طلبات</h3>
                  <p className="text-gray-600 mb-4">
                    لم تقم بأي طلبات بعد
                  </p>
                  <Button className="btn-luxury">
                    تابع التسوق
                  </Button>
                </Card>
              ) : (
                orders.map((order) => (
                  <Card key={order.id} className="luxury-card p-6" data-testid={`order-${order.id}`}>
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 mb-2">
                          طلب رقم: #{order.id.slice(-8)}
                        </h3>
                        <p className="text-gray-600">
                          تاريخ الطلب: {new Date(order.created_at).toLocaleDateString('ar-SA')}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2 mt-4 md:mt-0">
                        <Badge className={getStatusColor(order.status)}>
                          {getStatusText(order.status)}
                        </Badge>
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 ml-1" />
                          عرض التفاصيل
                        </Button>
                      </div>
                    </div>
                    
                    <div className="border-t border-gray-200 pt-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">عدد المنتجات:</p>
                          <p className="font-medium">{order.items.length} منتج</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">المجموع:</p>
                          <p className="font-medium text-amber-600">{order.total_amount} ر.س</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">طريقة الدفع:</p>
                          <p className="font-medium">
                            {order.payment_method === 'card' ? 'بطاقة ائتمانية' : 'تحويل بنكي'}
                          </p>
                        </div>
                      </div>
                      
                      {order.tracking_number && (
                        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <p className="text-sm text-blue-800">
                            رقم التتبع: <span className="font-mono">{order.tracking_number}</span>
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
                    <MapPin className="h-6 w-6 text-amber-600 ml-3" />
                    <h3 className="text-xl font-bold text-gray-900">عنوان الشحن</h3>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditingAddress(true)}
                    className="text-amber-600 border-amber-600 hover:bg-amber-50"
                  >
                    تعديل
                  </Button>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <p className="font-medium">{user.address.firstName} {user.address.lastName}</p>
                  <p className="text-gray-600">{user.address.street}</p>
                  <p className="text-gray-600">{user.address.city}, {user.address.state} {user.address.postalCode}</p>
                  <p className="text-gray-600">{user.address.country}</p>
                  <p className="text-gray-600">هاتف: {user.address.phone}</p>
                </div>
              </Card>
            ) : (
              <Card className="luxury-card p-8 text-center">
                <MapPin className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">لا توجد عناوين</h3>
                <p className="text-gray-600 mb-4">
                  لم تقم بحفظ أي عناوين بعد
                </p>
                <Button 
                  className="btn-luxury"
                  onClick={() => setIsEditingAddress(true)}
                >
                  إضافة عنوان جديد
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
                  {user?.address ? 'تعديل العنوان' : 'إضافة عنوان جديد'}
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
                      الاسم الأول
                    </label>
                    <Input
                      value={addressData.firstName}
                      onChange={(e) => setAddressData({...addressData, firstName: e.target.value})}
                      required
                      placeholder="أحمد"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      الاسم الأخير
                    </label>
                    <Input
                      value={addressData.lastName}
                      onChange={(e) => setAddressData({...addressData, lastName: e.target.value})}
                      required
                      placeholder="محمد"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    رقم الهاتف
                  </label>
                  <Input
                    type="tel"
                    value={addressData.phone}
                    onChange={(e) => setAddressData({...addressData, phone: e.target.value})}
                    required
                    placeholder="+966501234567"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    عنوان الشارع ورقم المبنى
                  </label>
                  <Input
                    value={addressData.street}
                    onChange={(e) => setAddressData({...addressData, street: e.target.value})}
                    required
                    placeholder="شارع الملك فهد، مبنى 123"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      المدينة
                    </label>
                    <Input
                      value={addressData.city}
                      onChange={(e) => setAddressData({...addressData, city: e.target.value})}
                      required
                      placeholder="الرياض"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      المنطقة
                    </label>
                    <Input
                      value={addressData.state}
                      onChange={(e) => setAddressData({...addressData, state: e.target.value})}
                      required
                      placeholder="الرياض"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      الرمز البريدي
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
                      الدولة
                    </label>
                    <Input
                      value={addressData.country}
                      onChange={(e) => setAddressData({...addressData, country: e.target.value})}
                      required
                      placeholder="السعودية"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button type="submit" className="btn-luxury flex-1">
                    حفظ العنوان
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