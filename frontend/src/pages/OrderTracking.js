import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { Package, Truck, MapPin, CheckCircle, Clock, Search, Eye, AlertCircle } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card } from '../components/ui/card';
import { toast } from 'sonner';
import { formatDate as formatDateUtil } from '../utils/dateUtils';

const OrderTracking = () => {
  const { language } = useLanguage();
  const { user, isAuthenticated } = useAuth();
  const isRTL = language === 'ar' || language === 'he';

  const [trackingNumber, setTrackingNumber] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [trackingData, setTrackingData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [userOrders, setUserOrders] = useState([]);

  const API_URL = process.env.REACT_APP_BACKEND_URL; // Must use env var only

  useEffect(() => {
    if (isAuthenticated && user) {
      loadUserOrders();
    }
  }, [isAuthenticated, user]);

  const loadUserOrders = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/orders/my-orders`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUserOrders(data.orders || []);
      }
    } catch (error) {
      console.error('Error loading user orders:', error);
    }
  };

  const handleTrackByNumber = async () => {
    if (!trackingNumber && !orderNumber) {
      toast.error(isRTL ? 'يرجى إدخال رقم التتبع أو رقم الطلب' : 'Please enter tracking number or order number');
      return;
    }

    setLoading(true);
    try {
      const searchParam = trackingNumber || orderNumber;
      const response = await fetch(`${API_URL}/api/orders/track/${searchParam}`);

      if (response.ok) {
        const data = await response.json();
        setTrackingData(data);
      } else {
        toast.error(isRTL ? 'لم يتم العثور على الطلب' : 'Order not found');
        setTrackingData(null);
      }
    } catch (error) {
      console.error('Error tracking order:', error);
      toast.error(isRTL ? 'حدث خطأ في البحث' : 'Error occurred while searching');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'pending': 'text-yellow-600 bg-yellow-100',
      'processing': 'text-blue-600 bg-blue-100',
      'shipped': 'text-purple-600 bg-purple-100',
      'in_transit': 'text-indigo-600 bg-indigo-100',
      'delivered': 'text-green-600 bg-green-100',
      'cancelled': 'text-red-600 bg-red-100'
    };
    return colors[status] || 'text-gray-600 bg-gray-100';
  };

  const getStatusIcon = (status) => {
    const icons = {
      'pending': Clock,
      'processing': Package,
      'shipped': Truck,
      'in_transit': MapPin,
      'delivered': CheckCircle,
      'cancelled': AlertCircle
    };
    const IconComponent = icons[status] || Clock;
    return <IconComponent className="h-4 w-4" />;
  };

  const statusTexts = {
    ar: {
      pending: 'في انتظار المعالجة',
      processing: 'قيد المعالجة',
      shipped: 'تم الشحن',
      in_transit: 'في الطريق',
      delivered: 'تم التسليم',
      cancelled: 'ملغي'
    },
    en: {
      pending: 'Pending',
      processing: 'Processing',
      shipped: 'Shipped',
      in_transit: 'In Transit',
      delivered: 'Delivered',
      cancelled: 'Cancelled'
    },
    tr: {
      pending: 'Beklemede',
      processing: 'İşleniyor',
      shipped: 'Gönderildi',
      in_transit: 'Yolda',
      delivered: 'Teslim edildi',
      cancelled: 'İptal edildi'
    },
    hi: {
      pending: 'लंबित',
      processing: 'प्रक्रिया में',
      shipped: 'भेजा गया',
      in_transit: 'रास्ते में',
      delivered: 'सुपुर्द',
      cancelled: 'रद्द'
    },
    he: {
      pending: 'בהמתנה',
      processing: 'בעיבוד',
      shipped: 'נשלח',
      in_transit: 'בדרך',
      delivered: 'נמסר',
      cancelled: 'בוטל'
    },
    es: {
      pending: 'Pendiente',
      processing: 'Procesando',
      shipped: 'Enviado',
      in_transit: 'En tránsito',
      delivered: 'Entregado',
      cancelled: 'Cancelado'
    },
    fr: {
      pending: 'En attente',
      processing: 'En traitement',
      shipped: 'Expédié',
      in_transit: 'En transit',
      delivered: 'Livré',
      cancelled: 'Annulé'
    },
    ru: {
      pending: 'В ожидании',
      processing: 'Обрабатывается',
      shipped: 'Отправлено',
      in_transit: 'В пути',
      delivered: 'Доставлено',
      cancelled: 'Отменено'
    },
    de: {
      pending: 'Ausstehend',
      processing: 'Wird bearbeitet',
      shipped: 'Versandt',
      in_transit: 'Unterwegs',
      delivered: 'Zugestellt',
      cancelled: 'Storniert'
    }
  };

  const getStatusText = (status) => {
    const langKey = statusTexts[language] ? language : 'en';
    return statusTexts[langKey][status] || status;
  };

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      const localeMap = {
        ar: 'ar-SA', en: 'en-US', tr: 'tr-TR', hi: 'hi-IN', he: 'he-IL', es: 'es-ES', fr: 'fr-FR', ru: 'ru-RU', de: 'de-DE'
      };
      const baseLocale = localeMap[language] || 'en-US';
      const gregorianLocale = `${baseLocale}-u-ca-gregory`;
      return new Intl.DateTimeFormat(gregorianLocale, { year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
    } catch {
      return dateString;
    }
  };

  return (
    <div className={`min-h-screen bg-gray-50 py-12 ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            {isRTL ? 'تتبع الطلبات' : 'Order Tracking'}
          </h1>
          <p className="text-gray-600">
            {isRTL 
              ? 'تتبع حالة طلبك باستخدام رقم التتبع أو رقم الطلب'
              : 'Track your order status using tracking number or order number'
            }
          </p>
        </div>

        {/* Tracking Search */}
        <Card className="p-6 mb-8">
          <div className="flex items-center mb-4">
            <Search className="h-6 w-6 text-blue-600 mr-3" />
            <h2 className="text-xl font-semibold text-gray-900">
              {isRTL ? 'البحث عن الطلب' : 'Search for Order'}
            </h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {isRTL ? 'رقم التتبع' : 'Tracking Number'}
              </label>
              <Input
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder={isRTL ? 'أدخل رقم التتبع' : 'Enter tracking number'}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {isRTL ? 'أو رقم الطلب' : 'Or Order Number'}
              </label>
              <Input
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                placeholder={isRTL ? 'أدخل رقم الطلب' : 'Enter order number'}
              />
            </div>
            
            <div className="flex items-end">
              <Button 
                onClick={handleTrackByNumber}
                disabled={loading}
                className="w-full"
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {isRTL ? 'جاري البحث...' : 'Searching...'}
                  </div>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    {isRTL ? 'تتبع' : 'Track'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </Card>

        {/* Tracking Results */}
        {trackingData && (
          <Card className="p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">
                {isRTL ? 'تفاصيل الطلب' : 'Order Details'}
              </h3>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(trackingData.status)}`}>
                {getStatusIcon(trackingData.status)}
                <span className="ml-1">{getStatusText(trackingData.status)}</span>
              </span>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">
                  {isRTL ? 'معلومات الطلب' : 'Order Information'}
                </h4>
                <div className="space-y-2 text-sm">
                  <p><span className="text-gray-600">{isRTL ? 'رقم الطلب:' : 'Order Number:'}</span> {trackingData.order_number}</p>
                  <p><span className="text-gray-600">{isRTL ? 'رقم التتبع:' : 'Tracking Number:'}</span> {trackingData.tracking_number}</p>
                  <p><span className="text-gray-600">{isRTL ? 'تاريخ الطلب:' : 'Order Date:'}</span> {formatDate(trackingData.created_at)}</p>
                  <p><span className="text-gray-600">{isRTL ? 'المبلغ الإجمالي:' : 'Total Amount:'}</span> {trackingData.total_amount} {trackingData.currency}</p>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-2">
                  {isRTL ? 'عنوان التسليم' : 'Delivery Address'}
                </h4>
                <div className="text-sm text-gray-600">
                  <p>{trackingData.shipping_address?.name}</p>
                  <p>{trackingData.shipping_address?.address1}</p>
                  <p>{trackingData.shipping_address?.city}, {trackingData.shipping_address?.country}</p>
                  <p>{trackingData.shipping_address?.phone}</p>
                </div>
              </div>
            </div>

            {/* Tracking Timeline */}
            {trackingData.tracking_events && trackingData.tracking_events.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-4">
                  {isRTL ? 'تتبع الشحنة' : 'Shipment Tracking'}
                </h4>
                <div className="space-y-4">
                  {trackingData.tracking_events.map((event, index) => (
                    <div key={index} className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          {getStatusIcon(event.status)}
                        </div>
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{event.description}</p>
                        <p className="text-sm text-gray-600">{event.location}</p>
                        <p className="text-xs text-gray-500 mt-1">{formatDate(event.timestamp)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        )}

        {/* User Orders (if authenticated) */}
        {isAuthenticated && userOrders.length > 0 && (
          <Card className="p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              {isRTL ? 'طلباتك الأخيرة' : 'Your Recent Orders'}
            </h3>
            
            <div className="space-y-4">
              {userOrders.slice(0, 5).map((order) => (
                <div key={order.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <span className="font-medium text-gray-900">#{order.order_number}</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                        {getStatusText(order.status)}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setOrderNumber(order.order_number);
                        handleTrackByNumber();
                      }}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      {isRTL ? 'تتبع' : 'Track'}
                    </Button>
                  </div>
                  
                  <div className="grid md:grid-cols-3 gap-4 text-sm text-gray-600">
                    <div>
                      <span className="font-medium">{isRTL ? 'التاريخ:' : 'Date:'}</span> {formatDate(order.created_at)}
                    </div>
                    <div>
                      <span className="font-medium">{isRTL ? 'المبلغ:' : 'Amount:'}</span> {order.total_amount} {order.currency}
                    </div>
                    <div>
                      <span className="font-medium">{isRTL ? 'العناصر:' : 'Items:'}</span> {order.items?.length || 0}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Help Section */}
        <Card className="p-6 mt-8 bg-blue-50 border-blue-200">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-blue-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {isRTL ? 'تحتاج مساعدة؟' : 'Need Help?'}
            </h3>
            <p className="text-gray-600 mb-4">
              {isRTL 
                ? 'إذا كان لديك أي استفسار حول طلبك، لا تتردد في التواصل معنا'
                : 'If you have any questions about your order, don\'t hesitate to contact us'
              }
            </p>
            <div className="space-y-2 sm:space-y-0 sm:space-x-4 sm:flex sm:justify-center">
              <a href="/contact" className="inline-block">
                <Button variant="outline" className="w-full sm:w-auto">
                  {isRTL ? 'تواصل معنا' : 'Contact Us'}
                </Button>
              </a>
              <a href="tel:+905013715391" className="inline-block">
                <Button className="w-full sm:w-auto">
                  {isRTL ? 'اتصل الآن' : 'Call Now'}
                </Button>
              </a>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default OrderTracking;
