import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import {
  Package,
  Truck,
  MapPin,
  Clock,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Search,
  Filter,
  Download,
  Bell,
  Eye,
  Calendar,
  Globe
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';

const AliExpressTrackingPage = () => {
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  
  // State management
  const [activeTab, setActiveTab] = useState('orders');
  const [orders, setOrders] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [trackingInfo, setTrackingInfo] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [syncStatus, setSyncStatus] = useState({});

  const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

  useEffect(() => {
    loadOrders();
    loadSyncStatus();
  }, []);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/admin/orders`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setOrders(data.orders || []);
      }
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSyncStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/admin/aliexpress/sync/comprehensive-status`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSyncStatus(data);
      }
    } catch (error) {
      console.error('Error loading sync status:', error);
    }
  };

  const syncOrderStatuses = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/admin/aliexpress/orders/sync-statuses`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        alert(isRTL ? 'تم بدء مزامنة حالة الطلبات' : 'Order status sync started');
        loadSyncStatus();
      }
    } catch (error) {
      console.error('Error syncing order statuses:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTrackingInfo = async (trackingNumber) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/admin/aliexpress/tracking/${trackingNumber}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setTrackingInfo(prev => ({
          ...prev,
          [trackingNumber]: data
        }));
      }
    } catch (error) {
      console.error('Error getting tracking info:', error);
    }
  };

  const processNotificationQueue = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/admin/aliexpress/notifications/process-queue`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        alert(isRTL ? 'تم بدء معالجة طابور الإشعارات' : 'Notification queue processing started');
      }
    } catch (error) {
      console.error('Error processing notifications:', error);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'processing': 'text-yellow-600',
      'shipped': 'text-blue-600',
      'in_transit': 'text-purple-600',
      'delivered': 'text-green-600',
      'cancelled': 'text-red-600',
      'completed': 'text-green-700'
    };
    return colors[status] || 'text-gray-600';
  };

  const getStatusIcon = (status) => {
    const icons = {
      'processing': Clock,
      'shipped': Truck,
      'in_transit': MapPin,
      'delivered': CheckCircle,
      'cancelled': AlertCircle,
      'completed': CheckCircle
    };
    const IconComponent = icons[status] || Clock;
    return <IconComponent className="h-4 w-4" />;
  };

  const getStatusText = (status) => {
    const texts = {
      ar: {
        'processing': 'قيد المعالجة',
        'shipped': 'تم الشحن',
        'in_transit': 'في الطريق',
        'delivered': 'تم التسليم',
        'cancelled': 'ملغي',
        'completed': 'مكتمل'
      },
      en: {
        'processing': 'Processing',
        'shipped': 'Shipped',
        'in_transit': 'In Transit',
        'delivered': 'Delivered',
        'cancelled': 'Cancelled',
        'completed': 'Completed'
      }
    };
    return texts[language][status] || status;
  };

  const filteredOrders = orders.filter(order =>
    order.order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.tracking_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className={`p-6 ${isRTL ? 'rtl' : 'ltr'}`}>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isRTL ? 'تتبع طلبات علي إكسبرس' : 'AliExpress Order Tracking'}
          </h1>
          <p className="text-gray-600 mt-1">
            {isRTL ? 'إدارة ومتابعة جميع الطلبات والشحنات' : 'Manage and track all orders and shipments'}
          </p>
        </div>
        <div className="flex space-x-2">
          <Button
            onClick={processNotificationQueue}
            variant="outline"
            size="sm"
          >
            <Bell className="h-4 w-4 mr-2" />
            {isRTL ? 'معالجة الإشعارات' : 'Process Notifications'}
          </Button>
          <Button
            onClick={syncOrderStatuses}
            disabled={loading}
            size="sm"
          >
            {loading ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            {isRTL ? 'مزامنة الحالات' : 'Sync Statuses'}
          </Button>
        </div>
      </div>

      {/* Sync Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Order Tracking Status */}
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">
                {isRTL ? 'تتبع الطلبات' : 'Order Tracking'}
              </p>
              <p className="text-2xl font-semibold text-gray-900">
                {syncStatus.order_tracking?.orders_updated || 0}
              </p>
            </div>
            <Truck className="h-8 w-8 text-blue-600" />
          </div>
          <div className="mt-2">
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
              syncStatus.order_tracking?.status === 'running' 
                ? 'bg-green-100 text-green-800' 
                : 'bg-gray-100 text-gray-800'
            }`}>
              {syncStatus.order_tracking?.status || 'idle'}
            </span>
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">
                {isRTL ? 'الإشعارات المعلقة' : 'Pending Notifications'}
              </p>
              <p className="text-2xl font-semibold text-gray-900">
                {syncStatus.notifications?.pending || 0}
              </p>
            </div>
            <Bell className="h-8 w-8 text-orange-600" />
          </div>
          <div className="mt-2">
            <span className="text-xs text-gray-600">
              {isRTL ? 'تم المعالجة اليوم:' : 'Processed today:'} {syncStatus.notifications?.processed_today || 0}
            </span>
          </div>
        </div>

        {/* Content Protection */}
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">
                {isRTL ? 'العلامات المائية اليوم' : 'Watermarks Today'}
              </p>
              <p className="text-2xl font-semibold text-gray-900">
                {syncStatus.content_protection?.watermarks_today || 0}
              </p>
            </div>
            <Eye className="h-8 w-8 text-purple-600" />
          </div>
          <div className="mt-2">
            <span className="text-xs text-gray-600">
              {isRTL ? 'حوادث اليوم:' : 'Incidents today:'} {syncStatus.content_protection?.incidents_today || 0}
            </span>
          </div>
        </div>

        {/* Product Sync */}
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">
                {isRTL ? 'المنتجات المتزامنة' : 'Products Synced'}
              </p>
              <p className="text-2xl font-semibold text-gray-900">
                {syncStatus.product_sync?.products_synced || 0}
              </p>
            </div>
            <Package className="h-8 w-8 text-green-600" />
          </div>
          <div className="mt-2">
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
              syncStatus.product_sync?.status === 'running'
                ? 'bg-green-100 text-green-800'
                : 'bg-gray-100 text-gray-800'
            }`}>
              {syncStatus.product_sync?.status || 'idle'}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'orders', label: isRTL ? 'الطلبات النشطة' : 'Active Orders', icon: Package },
            { id: 'tracking', label: isRTL ? 'التتبع المفصل' : 'Detailed Tracking', icon: MapPin },
            { id: 'notifications', label: isRTL ? 'الإشعارات' : 'Notifications', icon: Bell },
            { id: 'analytics', label: isRTL ? 'التحليلات' : 'Analytics', icon: Globe }
          ].map((tab) => {
            const IconComponent = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <IconComponent className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Search and Filters */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              type="text"
              placeholder={isRTL ? 'البحث في الطلبات...' : 'Search orders...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            {isRTL ? 'فلتر' : 'Filter'}
          </Button>
        </div>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          {isRTL ? 'تصدير' : 'Export'}
        </Button>
      </div>

      {/* Content based on active tab */}
      {activeTab === 'orders' && (
        <div className="bg-white rounded-lg border shadow-sm">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {isRTL ? 'الطلبات النشطة' : 'Active Orders'}
            </h3>
            
            {filteredOrders.length === 0 ? (
              <div className="text-center py-8">
                <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">
                  {isRTL ? 'لا توجد طلبات نشطة' : 'No active orders'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {isRTL ? 'رقم الطلب' : 'Order Number'}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {isRTL ? 'العميل' : 'Customer'}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {isRTL ? 'الحالة' : 'Status'}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {isRTL ? 'رقم التتبع' : 'Tracking Number'}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {isRTL ? 'المبلغ' : 'Amount'}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {isRTL ? 'الإجراءات' : 'Actions'}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredOrders.map((order) => (
                      <tr key={order.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {order.order_number}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {order.customer_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                            {getStatusIcon(order.status)}
                            <span className="ml-1">{getStatusText(order.status)}</span>
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {order.tracking_number || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {order.total_amount} {order.currency}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedOrder(order);
                              if (order.tracking_number) {
                                getTrackingInfo(order.tracking_number);
                              }
                            }}
                          >
                            {isRTL ? 'عرض التفاصيل' : 'View Details'}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'tracking' && selectedOrder && (
        <div className="bg-white rounded-lg border shadow-sm">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {isRTL ? 'تفاصيل التتبع' : 'Tracking Details'} - {selectedOrder.order_number}
            </h3>
            
            {trackingInfo[selectedOrder.tracking_number] ? (
              <div className="space-y-4">
                {trackingInfo[selectedOrder.tracking_number].events?.map((event, index) => (
                  <div key={index} className="flex items-start space-x-4 p-4 border rounded-lg">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <MapPin className="h-4 w-4 text-blue-600" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{event.status}</p>
                      <p className="text-sm text-gray-600">{event.description}</p>
                      <p className="text-xs text-gray-500 mt-1">{event.location} • {event.timestamp}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">
                  {isRTL ? 'لا توجد معلومات تتبع متاحة' : 'No tracking information available'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'notifications' && (
        <div className="bg-white rounded-lg border shadow-sm">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {isRTL ? 'إدارة الإشعارات' : 'Notification Management'}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">
                  {isRTL ? 'البريد الإلكتروني' : 'Email'}
                </h4>
                <p className="text-sm text-gray-600">
                  {isRTL ? 'نشط - 120 رسالة اليوم' : 'Active - 120 messages today'}
                </p>
                <div className="mt-2">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                    {isRTL ? 'يعمل' : 'Operational'}
                  </span>
                </div>
              </div>
              
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">
                  {isRTL ? 'رسائل SMS' : 'SMS'}
                </h4>
                <p className="text-sm text-gray-600">
                  {isRTL ? 'نشط - 45 رسالة اليوم' : 'Active - 45 messages today'}
                </p>
                <div className="mt-2">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                    {isRTL ? 'يعمل' : 'Operational'}
                  </span>
                </div>
              </div>
              
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">
                  {isRTL ? 'واتساب' : 'WhatsApp'}
                </h4>
                <p className="text-sm text-gray-600">
                  {isRTL ? 'معطل - يتطلب تكوين' : 'Disabled - Requires setup'}
                </p>
                <div className="mt-2">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800">
                    {isRTL ? 'معطل' : 'Disabled'}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">
                {isRTL ? 'الإشعارات الحديثة' : 'Recent Notifications'}
              </h4>
              
              {[1, 2, 3].map((notif) => (
                <div key={notif} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {isRTL ? 'تأكيد شحن الطلب' : 'Order Shipping Confirmation'}
                      </p>
                      <p className="text-sm text-gray-600">
                        {isRTL ? 'تم إرسال إشعار للعميل بشحن الطلب #12345' : 'Notification sent to customer for order #12345 shipment'}
                      </p>
                    </div>
                    <div className="text-xs text-gray-500">
                      {isRTL ? 'منذ ساعتين' : '2 hours ago'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg border shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {isRTL ? 'إحصائيات الطلبات' : 'Order Statistics'}
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">{isRTL ? 'إجمالي الطلبات اليوم' : 'Total Orders Today'}</span>
                <span className="font-semibold">24</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">{isRTL ? 'الطلبات المشحونة' : 'Orders Shipped'}</span>
                <span className="font-semibold">18</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">{isRTL ? 'الطلبات المكتملة' : 'Orders Completed'}</span>
                <span className="font-semibold">15</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {isRTL ? 'حماية المحتوى' : 'Content Protection'}
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">{isRTL ? 'العلامات المائية المطبقة' : 'Watermarks Applied'}</span>
                <span className="font-semibold">156</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">{isRTL ? 'محاولات لقطة الشاشة' : 'Screenshot Attempts'}</span>
                <span className="font-semibold text-red-600">3</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">{isRTL ? 'الروابط المحمية النشطة' : 'Active Protected URLs'}</span>
                <span className="font-semibold">89</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AliExpressTrackingPage;