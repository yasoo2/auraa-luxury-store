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
import { API_BASE_URL } from '../../api';

const BACKEND_URL = API_BASE_URL;
const API = `${BACKEND_URL}/api`;

const OrdersPage = () => {
  const { t, language } = useLanguage();
  const isRTL = language === 'ar';
  
  const [orders, setOrders] = useState([]);
  const [sending, setSending] = useState(false);
  const [supplierResult, setSupplierResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');

  // An order is waiting for the owner while it has not been sent on. Read from
  // supplier_status, and tolerant of orders placed before that field existed.
  const isAwaitingApproval = (order) =>
    !order.supplier_order_id && (order.supplier_status || 'awaiting_approval') === 'awaiting_approval';

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
      setLoadError('');
    } catch (error) {
      // An invented order list is indistinguishable from a real one on screen.
      // "No orders" is at least true; a red banner says why.
      console.error('Error fetching orders:', error);
      setOrders([]);
      setLoadError(error.response?.data?.detail
        || (isRTL ? 'تعذّر تحميل الطلبات' : 'Could not load orders'));
    } finally {
      setLoading(false);
    }
  };

  const previewAtSupplier = async (orderId) => {
    setSending(true);
    setSupplierResult(null);
    try {
      const { data } = await axios.post(`${API}/admin/orders/${orderId}/supplier-preview`);
      const opt = data.would_use || {};
      setSupplierResult({
        ok: true,
        message: `${data.message} ${isRTL ? 'الشحن المقترح:' : 'Proposed shipping:'} `
          + `${opt.name || '—'} (${opt.price ?? '—'}) — `
          + `${data.items.length} ${isRTL ? 'سطر جاهز' : 'line(s) resolved'}`,
      });
    } catch (error) {
      setSupplierResult({
        ok: false,
        message: error.response?.data?.detail
          || (isRTL ? 'تعذّر الفحص' : 'The check failed'),
      });
    } finally {
      setSending(false);
    }
  };

  const sendToSupplier = async (orderId) => {
    setSending(true);
    setSupplierResult(null);
    try {
      const { data } = await axios.post(`${API}/admin/orders/${orderId}/send-to-supplier`);
      setOrders(orders.map(o => o.id === orderId
        ? { ...o, supplier_order_id: data.supplier_order_id,
            supplier_shipping_method: data.shipping_method, status: 'processing' }
        : o));
      setSelectedOrder(prev => prev && prev.id === orderId
        ? { ...prev, supplier_order_id: data.supplier_order_id,
            supplier_shipping_method: data.shipping_method }
        : prev);
      setSupplierResult({ ok: true, message: data.message });
    } catch (error) {
      // Nothing on screen may claim the order was sent when it was not: the
      // owner would wait for a parcel nobody is packing.
      setSupplierResult({
        ok: false,
        message: error.response?.data?.detail
          || (isRTL ? 'تعذّر إرسال الطلب إلى المورّد' : 'Could not send the order to the supplier'),
      });
    } finally {
      setSending(false);
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      await axios.put(`${API}/admin/orders/${orderId}`, { status: newStatus });
      setOrders(orders.map(order =>
        order.id === orderId ? { ...order, status: newStatus } : order
      ));
      setActionError('');
      setShowOrderModal(false);
    } catch (error) {
      // The old version updated the row and closed the dialog even when the
      // save failed — so "تم الشحن" appeared on screen and never reached the
      // database. Leave the row alone and say so.
      console.error('Error updating order status:', error);
      setActionError(error.response?.data?.detail
        || (isRTL ? 'تعذّر حفظ حالة الطلب — لم يتغيّر شيء' : 'Could not save the order status — nothing changed'));
    }
  };

  const awaitingApproval = orders.filter(isAwaitingApproval);

  const filteredOrders = orders.filter(order => {
    const matchesStatus = statusFilter === 'all'
      ? true
      : statusFilter === 'awaiting_approval'
        ? isAwaitingApproval(order)
        : order.status === statusFilter;
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

      {(loadError || actionError) && (
        <div
          role="alert"
          data-testid="orders-error"
          className="border border-red-300 bg-red-50 text-red-800 rounded-lg px-4 py-3 text-sm"
        >
          {loadError || actionError}
        </div>
      )}

      {/* The approval queue, named and counted.
          Whether an order is waiting for the owner lived only inside the
          details dialog, so the one thing that stops a parcel moving was
          invisible until you opened each order one by one. */}
      {awaitingApproval.length > 0 && (
        <div
          className="border border-amber-300 bg-amber-50 rounded-lg px-4 py-3 flex flex-wrap items-center gap-3"
          data-testid="approval-queue"
        >
          <span className="text-amber-900 font-semibold">
            {isRTL
              ? `${awaitingApproval.length} طلب بانتظار موافقتك`
              : `${awaitingApproval.length} order(s) waiting for your approval`}
          </span>
          <span className="text-sm text-amber-800">
            {isRTL
              ? 'لن يُشترى شيء من المورّد حتى توافق.'
              : 'Nothing is bought from the supplier until you approve.'}
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setStatusFilter('awaiting_approval')}
            data-testid="show-approval-queue"
          >
            {isRTL ? 'أظهرها' : 'Show them'}
          </Button>
        </div>
      )}

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
              <option value="awaiting_approval">
                {isRTL ? 'بانتظار موافقتي' : 'Needs my approval'}
              </option>
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
                      <div className="flex flex-col gap-1">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${orderStatuses[order.status].color}`}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {orderStatuses[order.status].label}
                        </span>
                        {isAwaitingApproval(order) ? (
                          <span
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800"
                            data-testid="row-awaiting"
                          >
                            {isRTL ? 'بانتظار موافقتك' : 'Needs your approval'}
                          </span>
                        ) : order.supplier_order_id ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            {isRTL ? 'أُرسل إلى CJ' : 'Sent to CJ'}
                          </span>
                        ) : null}
                      </div>
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

              {/* Send to the supplier. Deliberately a separate, explicit action:
                  it commits the shop to buying the goods, so nothing does it
                  on a timer or on the customer's checkout. */}
              <div className="mb-6 border border-amber-200 bg-amber-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-1">
                  {isRTL ? 'الشراء من المورّد' : 'Buy from the supplier'}
                </h3>
                {selectedOrder.supplier_order_id ? (
                  <p className="text-sm text-green-800" data-testid="supplier-sent">
                    {isRTL ? 'أُرسل إلى CJ برقم ' : 'Sent to CJ as '}
                    <span dir="ltr" className="font-mono">{selectedOrder.supplier_order_id}</span>
                    {selectedOrder.supplier_shipping_method
                      ? ` — ${selectedOrder.supplier_shipping_method}` : ''}
                  </p>
                ) : (
                  <>
                    <p className="text-sm text-gray-600 mb-3">
                      {isRTL
                        ? 'يُنشئ الطلب لدى CJ ولا يدفعه — الدفع يبقى بيدك من رصيدك هناك.'
                        : 'Creates the order on CJ without paying it — payment stays in your hands.'}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {/* Rehearse first. Runs the whole path — variants,
                          freight, the lot — and creates nothing at CJ. */}
                      <Button
                        onClick={() => previewAtSupplier(selectedOrder.id)}
                        disabled={sending}
                        data-testid="preview-at-supplier"
                        variant="outline"
                        size="sm"
                      >
                        {isRTL ? 'فحص بلا إرسال' : 'Dry run'}
                      </Button>
                      <Button
                        onClick={() => sendToSupplier(selectedOrder.id)}
                        disabled={sending}
                        data-testid="send-to-supplier"
                        className="bg-amber-600 hover:bg-amber-700"
                        size="sm"
                      >
                        {sending
                          ? (isRTL ? 'جارٍ الإرسال…' : 'Sending…')
                          : (isRTL ? 'أرسل إلى CJ' : 'Send to CJ')}
                      </Button>
                    </div>
                  </>
                )}
                {supplierResult && (
                  <p
                    role="alert"
                    data-testid="supplier-result"
                    className={`mt-3 text-sm ${supplierResult.ok ? 'text-green-800' : 'text-red-700'}`}
                  >
                    {supplierResult.message}
                  </p>
                )}
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