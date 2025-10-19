import React, { useState, useEffect } from 'react';
import { Package, Truck, CheckCircle, Clock, MapPin, ExternalLink, Search } from 'lucide-react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const OrderTrackingPage = () => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [trackingSearch, setTrackingSearch] = useState('');
  
  const isRTL = language === 'ar' || language === 'he';
  
  const translations = {
    en: {
      title: 'My Orders',
      subtitle: 'Track your orders and view order history',
      searchPlaceholder: 'Search by order ID or tracking number',
      orderNumber: 'Order',
      date: 'Date',
      status: 'Status',
      total: 'Total',
      items: 'items',
      trackingNumber: 'Tracking Number',
      estimatedDelivery: 'Estimated Delivery',
      viewDetails: 'View Details',
      trackShipment: 'Track Shipment',
      noOrders: 'No orders yet',
      noOrdersDesc: 'Start shopping to see your orders here',
      shopNow: 'Shop Now',
      loading: 'Loading orders...',
      statuses: {
        pending: 'Pending',
        processing: 'Processing',
        shipped: 'Shipped',
        in_transit: 'In Transit',
        delivered: 'Delivered',
        cancelled: 'Cancelled'
      }
    },
    ar: {
      title: 'طلباتي',
      subtitle: 'تتبع طلباتك وعرض سجل الطلبات',
      searchPlaceholder: 'البحث برقم الطلب أو رقم التتبع',
      orderNumber: 'طلب',
      date: 'التاريخ',
      status: 'الحالة',
      total: 'الإجمالي',
      items: 'منتجات',
      trackingNumber: 'رقم التتبع',
      estimatedDelivery: 'التسليم المتوقع',
      viewDetails: 'عرض التفاصيل',
      trackShipment: 'تتبع الشحنة',
      noOrders: 'لا توجد طلبات بعد',
      noOrdersDesc: 'ابدأ التسوق لرؤية طلباتك هنا',
      shopNow: 'تسوق الآن',
      loading: 'جاري تحميل الطلبات...',
      statuses: {
        pending: 'قيد الانتظار',
        processing: 'قيد المعالجة',
        shipped: 'تم الشحن',
        in_transit: 'في الطريق',
        delivered: 'تم التسليم',
        cancelled: 'ملغي'
      }
    }
  };
  
  const t = translations[language] || translations.en;
  
  useEffect(() => {
    if (user) {
      fetchOrders();
    }
  }, [user]);
  
  const fetchOrders = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/orders`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      setOrders(response.data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };
  
  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'processing':
        return <Package className="w-5 h-5 text-blue-500" />;
      case 'shipped':
      case 'in_transit':
        return <Truck className="w-5 h-5 text-purple-500" />;
      case 'delivered':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      default:
        return <Package className="w-5 h-5 text-gray-500" />;
    }
  };
  
  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'shipped':
      case 'in_transit':
        return 'bg-purple-100 text-purple-800';
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };
  
  const filteredOrders = orders.filter(order => {
    if (!trackingSearch) return true;
    const search = trackingSearch.toLowerCase();
    return (
      order.id?.toLowerCase().includes(search) ||
      order.tracking_number?.toLowerCase().includes(search) ||
      order.order_number?.toLowerCase().includes(search)
    );
  });
  
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600">{t.loading}</p>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{t.title}</h1>
        <p className="text-gray-600">{t.subtitle}</p>
      </div>
      
      {/* Search Bar */}
      {orders.length > 0 && (
        <Card className="p-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={trackingSearch}
              onChange={(e) => setTrackingSearch(e.target.value)}
              placeholder={t.searchPlaceholder}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
            />
          </div>
        </Card>
      )}
      
      {/* Orders List */}
      {filteredOrders.length > 0 ? (
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <Card key={order.id} className="p-6 hover:shadow-lg transition-shadow">
              <div className="space-y-4">
                {/* Order Header */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(order.status)}
                    <div>
                      <div className="font-semibold">
                        {t.orderNumber} #{order.order_number || order.id?.slice(0, 8)}
                      </div>
                      <div className="text-sm text-gray-600">
                        {formatDate(order.created_at)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                      {t.statuses[order.status] || order.status}
                    </span>
                    <div className="text-right">
                      <div className="text-sm text-gray-600">{t.total}</div>
                      <div className="font-bold text-lg">${order.total?.toFixed(2)}</div>
                    </div>
                  </div>
                </div>
                
                {/* Order Items */}
                <div className="space-y-2">
                  {order.items?.slice(0, 3).map((item, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <div className="w-16 h-16 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                        {item.image && (
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{item.name}</div>
                        <div className="text-sm text-gray-600">
                          Qty: {item.quantity} × ${item.price?.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  ))}
                  {order.items?.length > 3 && (
                    <div className="text-sm text-gray-600 pl-19">
                      +{order.items.length - 3} more {t.items}
                    </div>
                  )}
                </div>
                
                {/* Tracking Info */}
                {order.tracking_number && (
                  <div className="bg-blue-50 p-4 rounded-lg space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="w-4 h-4 text-blue-600" />
                      <span className="font-medium">{t.trackingNumber}:</span>
                      <span className="font-mono">{order.tracking_number}</span>
                    </div>
                    {order.estimated_delivery && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Truck className="w-4 h-4" />
                        <span>{t.estimatedDelivery}:</span>
                        <span>{formatDate(order.estimated_delivery)}</span>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Shipping Progress */}
                {(order.status === 'shipped' || order.status === 'in_transit') && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Shipping Progress</span>
                      <span className="font-medium">
                        {order.status === 'shipped' ? '25%' : '75%'}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{
                          width: order.status === 'shipped' ? '25%' : '75%'
                        }}
                      ></div>
                    </div>
                  </div>
                )}
                
                {/* Action Buttons */}
                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.location.href = `/orders/${order.id}`}
                  >
                    {t.viewDetails}
                  </Button>
                  
                  {order.tracking_number && order.tracking_url && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(order.tracking_url, '_blank')}
                      className="flex items-center gap-2"
                    >
                      <ExternalLink className="w-4 h-4" />
                      {t.trackShipment}
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-12 text-center">
          <Package className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium mb-2">{t.noOrders}</h3>
          <p className="text-gray-600 mb-6">{t.noOrdersDesc}</p>
          <Button onClick={() => window.location.href = '/products'}>
            {t.shopNow}
          </Button>
        </Card>
      )}
    </div>
  );
};

export default OrderTrackingPage;

