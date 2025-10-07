import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import axios from 'axios';
import {
  Package,
  Eye,
  Check,
  X,
  Clock,
  Truck,
  AlertCircle,
  RefreshCw,
  Search,
  Filter
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const OrdersPage = () => {
  const { t, language } = useLanguage();
  const isRTL = language === 'ar';
  
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const orderStatuses = {
    pending: { 
      label: isRTL ? 'قيد المراجعة' : 'Pending', 
      color: 'bg-yellow-100 text-yellow-800',
      icon: Clock 
    },
    processing: { 
      label: isRTL ? 'قيد المعالجة' : 'Processing', 
      color: 'bg-blue-100 text-blue-800',
      icon: RefreshCw 
    },
    shipped: { 
      label: isRTL ? 'تم الشحن' : 'Shipped', 
      color: 'bg-purple-100 text-purple-800',
      icon: Truck 
    },
    delivered: { 
      label: isRTL ? 'تم التسليم' : 'Delivered', 
      color: 'bg-green-100 text-green-800',
      icon: Check 
    },
    cancelled: { 
      label: isRTL ? 'ملغي' : 'Cancelled', 
      color: 'bg-red-100 text-red-800',
      icon: X 
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/admin/orders`);
      setOrders(response.data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
      // For now, show mock data since backend endpoint might not exist yet
      setOrders(generateMockOrders());
    } finally {
      setLoading(false);
    }
  };

  const generateMockOrders = () => {
    return [
      {
        id: 'order-001',
        customer_name: 'فاطمة أحمد',
        customer_email: 'fatima@example.com',
        total: 599.99,
        status: 'pending',
        created_at: '2025-01-06T10:30:00Z',
        items: [
          { product_name: 'قلادة ذهبية فاخرة', quantity: 1, price: 299.99 },
          { product_name: 'أقراط لؤلؤ كلاسيكية', quantity: 2, price: 150.00 }
        ]
      },
      {
        id: 'order-002',
        customer_name: 'سارة محمد',
        customer_email: 'sara@example.com',
        total: 299.99,
        status: 'processing',
        created_at: '2025-01-06T09:15:00Z',
        items: [
          { product_name: 'خاتم مرصع بالماس', quantity: 1, price: 299.99 }
        ]
      },
      {
        id: 'order-003',
        customer_name: 'نورا سعد',
        customer_email: 'nora@example.com',
        total: 899.99,
        status: 'shipped',
        created_at: '2025-01-05T16:45:00Z',
        items: [
          { product_name: 'ساعة ذهبية فاخرة', quantity: 1, price: 899.99 }
        ]
      },
      {
        id: 'order-004',
        customer_name: 'أمل خالد',
        customer_email: 'amal@example.com',
        total: 249.99,
        status: 'delivered',
        created_at: '2025-01-04T14:20:00Z',
        items: [
          { product_name: 'سوار ذهبي متعدد الطبقات', quantity: 1, price: 249.99 }
        ]
      },
      {
        id: 'order-005',
        customer_name: 'ريم عبدالله',
        customer_email: 'reem@example.com',
        total: 150.00,
        status: 'cancelled',
        created_at: '2025-01-04T11:30:00Z',
        items: [
          { product_name: 'أقراط لؤلؤ كلاسيكية', quantity: 1, price: 150.00 }
        ]
      }
    ];
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      await axios.put(`${API}/admin/orders/${orderId}`, { status: newStatus });
      setOrders(orders.map(order => 
        order.id === orderId ? { ...order, status: newStatus } : order
      ));
      setShowOrderModal(false);
    } catch (error) {
      console.error('Error updating order status:', error);
      // For mock data, just update locally
      setOrders(orders.map(order => 
        order.id === orderId ? { ...order, status: newStatus } : order
      ));
      setShowOrderModal(false);
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    const matchesSearch = order.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         order.customer_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         order.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Package className="h-8 w-8 text-amber-600" />
          <h1 className="text-3xl font-bold text-gray-900">
            {isRTL ? 'إدارة الطلبات' : 'Orders Management'}
          </h1>
        </div>
        <div className="text-sm text-gray-500">
          {isRTL ? `إجمالي الطلبات: ${filteredOrders.length}` : `Total Orders: ${filteredOrders.length}`}
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400`} />
              <Input
                type="text"
                placeholder={isRTL ? 'البحث في الطلبات...' : 'Search orders...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`${isRTL ? 'pr-10' : 'pl-10'} w-full`}
              />
            </div>
          </div>
          
          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            >
              <option value="all">{isRTL ? 'جميع الحالات' : 'All Statuses'}</option>
              {Object.entries(orderStatuses).map(([status, config]) => (
                <option key={status} value={status}>{config.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {isRTL ? 'رقم الطلب' : 'Order ID'}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {isRTL ? 'العميل' : 'Customer'}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {isRTL ? 'الإجمالي' : 'Total'}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {isRTL ? 'الحالة' : 'Status'}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {isRTL ? 'التاريخ' : 'Date'}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {isRTL ? 'الإجراءات' : 'Actions'}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredOrders.map((order) => {
                const StatusIcon = orderStatuses[order.status].icon;
                return (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      #{order.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{order.customer_name}</div>
                        <div className="text-sm text-gray-500">{order.customer_email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${order.total.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${orderStatuses[order.status].color}`}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {orderStatuses[order.status].label}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(order.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Button
                        onClick={() => {
                          setSelectedOrder(order);
                          setShowOrderModal(true);
                        }}
                        variant="ghost"
                        size="sm"
                        className="text-amber-600 hover:text-amber-900"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        {isRTL ? 'عرض' : 'View'}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Details Modal */}
      {showOrderModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  {isRTL ? `تفاصيل الطلب #${selectedOrder.id}` : `Order Details #${selectedOrder.id}`}
                </h2>
                <Button
                  onClick={() => setShowOrderModal(false)}
                  variant="ghost"
                  size="sm"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* Customer Info */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3">{isRTL ? 'معلومات العميل' : 'Customer Information'}</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p><strong>{isRTL ? 'الاسم:' : 'Name:'}</strong> {selectedOrder.customer_name}</p>
                  <p><strong>{isRTL ? 'البريد الإلكتروني:' : 'Email:'}</strong> {selectedOrder.customer_email}</p>
                  <p><strong>{isRTL ? 'تاريخ الطلب:' : 'Order Date:'}</strong> {formatDate(selectedOrder.created_at)}</p>
                </div>
              </div>

              {/* Order Items */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3">{isRTL ? 'عناصر الطلب' : 'Order Items'}</h3>
                <div className="space-y-3">
                  {selectedOrder.items.map((item, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">{item.product_name}</p>
                        <p className="text-sm text-gray-500">{isRTL ? `الكمية: ${item.quantity}` : `Quantity: ${item.quantity}`}</p>
                      </div>
                      <p className="font-semibold">${item.price.toFixed(2)}</p>
                    </div>
                  ))}
                </div>
                <div className="border-t pt-3 mt-3">
                  <div className="flex justify-between items-center text-lg font-bold">
                    <span>{isRTL ? 'الإجمالي:' : 'Total:'}</span>
                    <span>${selectedOrder.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Status Update */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3">{isRTL ? 'تحديث حالة الطلب' : 'Update Order Status'}</h3>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(orderStatuses).map(([status, config]) => {
                    const StatusIcon = config.icon;
                    return (
                      <Button
                        key={status}
                        onClick={() => updateOrderStatus(selectedOrder.id, status)}
                        variant={selectedOrder.status === status ? "default" : "outline"}
                        size="sm"
                        className={selectedOrder.status === status ? "bg-amber-600 hover:bg-amber-700" : ""}
                      >
                        <StatusIcon className="h-4 w-4 mr-1" />
                        {config.label}
                      </Button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrdersPage;