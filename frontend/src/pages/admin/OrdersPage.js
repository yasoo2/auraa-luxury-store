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
  Filter,
  Trash2
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { API_BASE_URL } from '../../api';

const BACKEND_URL = API_BASE_URL;
const API = `${BACKEND_URL}/api`;

const OrdersPage = () => {
  const { t, language, formatMoney } = useLanguage();
  const isRTL = language === 'ar';
  
  const [orders, setOrders] = useState([]);
  const [sending, setSending] = useState(false);
  const [supplierResult, setSupplierResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selected, setSelected] = useState(() => new Set());
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');

  // An order is waiting for the owner's approval once the money is in and it
  // has not been sent on. Payment is part of the test on purpose: an unpaid
  // order is not waiting for a decision, it is waiting for a customer, and
  // listing the two together hid which of the two jobs was actually pending.
  const isAwaitingApproval = (order) =>
    !order.supplier_order_id
    && (order.supplier_status || 'awaiting_approval') === 'awaiting_approval'
    && order.payment_status === 'paid';

  // Looking a status up with no fallback is the same shape of crash that
  // `order.total` just caused, three lines further down the same loop: one
  // order with a status this map has never heard of — an old document, a hand
  // edit, a value the API adds later — and the entire page renders nothing.
  const statusOf = (order) => orderStatuses[order?.status] || {
    label: order?.status || (isRTL ? 'غير معروفة' : 'Unknown'),
    color: 'bg-gray-100 text-gray-800',
    icon: Clock,
  };

  const orderStatuses = {
    // "قيد المراجعة" was the approval era talking: nothing is reviewed any
    // more — a pending order is simply new, and the payment pill next to it
    // says what it is actually waiting for.
    pending: {
      label: isRTL ? 'جديد' : 'New',
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

  const isPaid = (order) => order?.payment_status === 'paid';
  const isCard = (order) => order?.payment_method === 'card';

  // Anything with money or goods behind it — a paid record, or one bought at
  // CJ — must be cancelled before it can be deleted; the cancel is the owner
  // declaring the commitment void, CJ side included. Mirrors the server's
  // rule so the button only appears where pressing it can succeed.
  const deletable = (order) =>
    order.status === 'cancelled'
    || (!isPaid(order) && !order.supplier_order_id);

  // Every order carries a readable number like AUR-20260809-XXXX; the raw
  // UUID went on screen anyway, and nobody can tell two UUIDs apart at a
  // glance or read one over the phone.
  const orderLabel = (order) => order.order_number || `#${(order.id || '').slice(0, 8)}`;

  // There is no gateway to ask whether the money arrived — the bank statement
  // is the only source of truth, and the owner is the only one reading it.
  const confirmPayment = async (orderId, paid) => {
    setSending(true);
    setSupplierResult(null);
    try {
      const reference = paid
        ? (window.prompt(isRTL
          ? 'رقم الحوالة أو أي مرجع من كشف الحساب (اختياري):'
          : 'Transfer reference from the bank statement (optional):') ?? '')
        : '';
      const { data } = await axios.post(
        `${API}/admin/orders/${orderId}/confirm-payment`,
        { paid, reference }
      );
      const patch = (o) => ({
        ...o,
        payment_status: data.payment_status,
        payment_reference: data.payment_reference,
        payment_confirmed_at: data.payment_confirmed_at,
      });
      setOrders(orders.map(o => (o.id === orderId ? patch(o) : o)));
      setSelectedOrder(prev => (prev && prev.id === orderId ? patch(prev) : prev));
      setActionError('');
    } catch (error) {
      // Nothing on screen may say the money arrived when the server refused to
      // record it: that flag is what unlocks spending at CJ.
      setActionError(error.response?.data?.detail
        || (isRTL ? 'تعذّر حفظ حالة الدفع — لم يتغيّر شيء' : 'Could not save the payment status — nothing changed'));
    } finally {
      setSending(false);
    }
  };

  const deleteOrder = async (order) => {
    const cjNote = order.supplier_order_id
      ? (isRTL ? ' تأكد أنه ملغى لدى CJ أيضاً.' : ' Make sure it is cancelled at CJ too.')
      : '';
    const ok = window.confirm(isRTL
      ? `يُحذف سجلّ الطلب ${orderLabel(order)} نهائياً ولا يمكن استرجاعه.${cjNote} متأكد؟`
      : `The record of order ${orderLabel(order)} will be permanently deleted.${cjNote} Sure?`);
    if (!ok) return;
    setSending(true);
    try {
      await axios.delete(`${API}/admin/orders/${order.id}`);
      // Remove the row only after the server says it is gone — a row that
      // vanishes while the record survives is the same lie as a fake success.
      setOrders(prev => prev.filter(o => o.id !== order.id));
      setSelected(prev => { const next = new Set(prev); next.delete(order.id); return next; });
      if (selectedOrder && selectedOrder.id === order.id) {
        setSelectedOrder(null);
        setShowOrderModal(false);
      }
      setActionError('');
    } catch (error) {
      setActionError(error.response?.data?.detail
        || (isRTL ? 'تعذّر حذف الطلب — لم يتغيّر شيء' : 'Could not delete the order — nothing changed'));
    } finally {
      setSending(false);
    }
  };

  // Bulk deletion: only rows the server would accept are attempted, each one
  // individually, and a row leaves the screen only after its own delete
  // succeeded. Whatever was refused is counted and named, not glossed over.
  const deleteSelected = async () => {
    const targets = filteredOrders.filter((o) => selected.has(o.id));
    const eligible = targets.filter(deletable);
    const skipped = targets.length - eligible.length;
    if (eligible.length === 0) {
      setActionError(isRTL
        ? 'لا شيء من المحدد قابل للحذف — الطلب المدفوع أو المُرسَل إلى CJ يُلغى أولاً.'
        : 'Nothing selected is deletable — paid or CJ-sent orders must be cancelled first.');
      return;
    }
    const ok = window.confirm(isRTL
      ? `يُحذف نهائياً ${eligible.length} طلباً${skipped ? ` (وسيُتجاوز ${skipped} غير قابل للحذف)` : ''}. متأكد؟`
      : `${eligible.length} order(s) will be permanently deleted${skipped ? ` (${skipped} not deletable will be skipped)` : ''}. Sure?`);
    if (!ok) return;
    setSending(true);
    const removed = [];
    const failures = [];
    for (const order of eligible) {
      try {
        await axios.delete(`${API}/admin/orders/${order.id}`);
        removed.push(order.id);
      } catch (error) {
        failures.push(`${orderLabel(order)}: ${error.response?.data?.detail
          || (isRTL ? 'تعذّر الحذف' : 'delete failed')}`);
      }
    }
    setOrders(prev => prev.filter(o => !removed.includes(o.id)));
    setSelected(new Set());
    if (failures.length || skipped) {
      setActionError(isRTL
        ? `حُذف ${removed.length}. ${skipped ? `تُجوهل ${skipped} غير قابل للحذف. ` : ''}${failures.length ? `تعذّر ${failures.length}: ${failures[0]}` : ''}`
        : `Deleted ${removed.length}. ${skipped ? `${skipped} skipped. ` : ''}${failures.length ? `${failures.length} failed: ${failures[0]}` : ''}`);
    } else {
      setActionError('');
    }
    setSending(false);
  };

  const toggleSelect = (orderId) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId); else next.add(orderId);
      return next;
    });
  };

  // Opening an order must not inherit the previous one's result line. Run a dry
  // run on order A, close, open order B, and B's box would still be showing A's
  // freight quote — a number about a different parcel, presented as this one's.
  const openOrder = (order) => {
    setSupplierResult(null);
    setSelectedOrder(order);
    setShowOrderModal(true);
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
      //
      // When the server's answer carries no reason at all, say at least HOW
      // it carried none — a bare 500 and a dead connection are different
      // problems, and one generic sentence had the owner reading an old
      // saved failure as the result of a retry.
      const detail = error.response?.data?.detail
        || (isRTL
          ? `تعذّر إرسال الطلب إلى المورّد (${error.response ? `HTTP ${error.response.status}` : 'انقطع الاتصال'})`
          : `Could not send the order to the supplier (${error.response ? `HTTP ${error.response.status}` : 'network error'})`);
      // The server has just written supplier_status:"failed" to this order.
      // Mirror it — timestamp included, or the fresh local text pairs with
      // the previous failure's time and reads as history.
      const markFailed = (o) => ({ ...o, supplier_status: 'failed', supplier_error: detail,
                                   supplier_failed_at: new Date().toISOString() });
      setOrders(orders.map(o => (o.id === orderId ? markFailed(o) : o)));
      setSelectedOrder(prev => (prev && prev.id === orderId ? markFailed(prev) : prev));
      setSupplierResult({ ok: false, message: detail });
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
  const failedAtSupplier = orders.filter(
    (order) => !order.supplier_order_id && order.supplier_status === 'failed'
  );
  // Only manual methods belong in the "check your bank statement" queue. An
  // unpaid card order has no statement to check — the customer simply never
  // finished iyzico's page — and counting them here sent the owner hunting
  // through a bank account for money nobody claimed to have sent.
  const unpaid = orders.filter(
    (order) => !isPaid(order) && !isCard(order) && !['cancelled'].includes(order.status)
  );

  const filteredOrders = orders.filter(order => {
    const matchesStatus = statusFilter === 'all'
      ? true
      : statusFilter === 'awaiting_approval'
        ? isAwaitingApproval(order)
        : statusFilter === 'supplier_failed'
          ? !order.supplier_order_id && order.supplier_status === 'failed'
          : statusFilter === 'unpaid'
            ? !isPaid(order) && !isCard(order) && order.status !== 'cancelled'
            : statusFilter === 'card_incomplete'
              ? isCard(order) && !isPaid(order) && order.status !== 'cancelled'
              : order.status === statusFilter;
    // A deleted user leaves customer_name null, and .toLowerCase() on null
    // takes the whole page down the moment anyone types in the search box.
    const haystack = [order.customer_name, order.customer_email, order.id, order.order_number]
      .filter(Boolean).join(' ').toLowerCase();
    const matchesSearch = haystack.includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(isRTL ? 'ar-SA-u-ca-gregory-nu-latn' : 'en-US', {
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

      {/* Orders whose money has not landed. First in the column because it is
          first in the sequence: nothing else can happen to these until the
          customer pays, and until now the screen never said which ones. */}
      {unpaid.length > 0 && (
        <div
          className="border border-red-300 bg-red-50 rounded-lg px-4 py-3 flex flex-wrap items-center gap-3"
          data-testid="unpaid-queue"
        >
          <span className="text-red-900 font-semibold">
            {isRTL
              ? `${unpaid.length} طلب لم يصل مبلغه`
              : `${unpaid.length} order(s) not paid yet`}
          </span>
          <span className="text-sm text-red-800">
            {isRTL
              ? 'راجع كشف حسابك، ثم أكّد الاستلام من داخل الطلب.'
              : 'Check your bank statement, then confirm receipt inside the order.'}
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setStatusFilter('unpaid')}
            data-testid="show-unpaid-queue"
          >
            {isRTL ? 'أظهرها' : 'Show them'}
          </Button>
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

      {/* A send CJ refused stops the parcel exactly as dead as an unapproved
          order does, and it had no banner, no badge and no error text anywhere
          — the order simply sat in the list looking ordinary. */}
      {failedAtSupplier.length > 0 && (
        <div
          className="border border-red-300 bg-red-50 rounded-lg px-4 py-3 flex flex-wrap items-center gap-3"
          data-testid="failed-queue"
        >
          <span className="text-red-900 font-semibold">
            {isRTL
              ? `${failedAtSupplier.length} طلب فشل إرساله إلى CJ`
              : `${failedAtSupplier.length} order(s) CJ refused`}
          </span>
          <span className="text-sm text-red-800">
            {isRTL
              ? 'لم يُشترَ شيء ولن يتحرّك الطلب حتى تُعالج السبب وتعيد الإرسال.'
              : 'Nothing was bought, and nothing moves until the cause is fixed and it is re-sent.'}
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setStatusFilter('supplier_failed')}
            data-testid="show-failed-queue"
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
              <option value="unpaid">
                {isRTL ? 'حوالة لم يصل مبلغها' : 'Transfer not received'}
              </option>
              <option value="card_incomplete">
                {isRTL ? 'بطاقة لم يكتمل دفعها' : 'Card not completed'}
              </option>
              <option value="awaiting_approval">
                {isRTL ? 'بانتظار موافقتي' : 'Needs my approval'}
              </option>
              <option value="supplier_failed">
                {isRTL ? 'فشل الإرسال إلى CJ' : 'Send to CJ failed'}
              </option>
              {Object.entries(orderStatuses).map(([status, config]) => (
                <option key={status} value={status}>{config.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Bulk actions — visible only while something is selected. */}
      {selected.size > 0 && (
        <div
          className="border border-red-200 bg-red-50 rounded-lg px-4 py-3 flex flex-wrap items-center gap-3"
          data-testid="bulk-actions"
        >
          <span className="text-sm text-red-900 font-semibold">
            {isRTL ? `${selected.size} محدد` : `${selected.size} selected`}
          </span>
          <Button
            size="sm"
            onClick={deleteSelected}
            disabled={sending}
            className="bg-red-600 hover:bg-red-700 text-white"
            data-testid="delete-selected"
          >
            <Trash2 className="h-4 w-4 me-1" />
            {isRTL ? 'حذف المحدد' : 'Delete selected'}
          </Button>
          <Button size="sm" variant="outline" onClick={() => setSelected(new Set())}>
            {isRTL ? 'إلغاء التحديد' : 'Clear selection'}
          </Button>
        </div>
      )}

      {/* Orders Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-amber-600 align-middle"
                    aria-label={isRTL ? 'تحديد الكل' : 'Select all'}
                    data-testid="select-all-orders"
                    checked={filteredOrders.length > 0
                      && filteredOrders.every((o) => selected.has(o.id))}
                    onChange={() => {
                      const allPicked = filteredOrders.every((o) => selected.has(o.id));
                      setSelected(allPicked
                        ? new Set()
                        : new Set(filteredOrders.map((o) => o.id)));
                    }}
                  />
                </th>
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
                const status = statusOf(order);
                const StatusIcon = status.icon;
                return (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-amber-600 align-middle"
                        aria-label={isRTL ? `تحديد ${orderLabel(order)}` : `Select ${orderLabel(order)}`}
                        data-testid={`select-order-${order.id}`}
                        checked={selected.has(order.id)}
                        onChange={() => toggleSelect(order.id)}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      <span title={order.id} dir="ltr">{orderLabel(order)}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{order.customer_name}</div>
                        <div className="text-sm text-gray-500">{order.customer_email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatMoney(order.total_amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col gap-1">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                          <StatusIcon className="h-3 w-3 me-1" />
                          {status.label}
                        </span>
                        {/* Whether the shop has been paid was not on this
                            screen at all — the one fact that decides whether
                            an order may cost the shop money. */}
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            isPaid(order) ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}
                          data-testid="row-payment"
                        >
                          {isPaid(order)
                            ? (isRTL ? 'مدفوع' : 'Paid')
                            : isCard(order)
                              ? (isRTL ? 'بطاقة — لم يكتمل الدفع' : 'Card — not completed')
                              : (isRTL ? 'غير مدفوع' : 'Unpaid')}
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
                        ) : order.supplier_status === 'failed' ? (
                          // A refused send wrote supplier_status:"failed" to the
                          // order and then showed nothing at all here — the row
                          // looked like every other pending order while nobody
                          // was packing anything.
                          <span
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800"
                            data-testid="row-supplier-failed"
                          >
                            {isRTL ? 'فشل الإرسال إلى CJ' : 'Send to CJ failed'}
                          </span>
                        ) : null}
                        {/* The reason lived only deep inside the details
                            dialog; the owner stared at the badge and had to
                            go digging for the one line that says what to
                            fix. It belongs next to the badge. */}
                        {!order.supplier_order_id
                          && order.supplier_status === 'failed'
                          && order.supplier_error && (
                          <span
                            className="text-xs text-red-700 max-w-[18rem] truncate"
                            dir="ltr"
                            title={`${order.supplier_failed_at ? formatDate(order.supplier_failed_at) + ' — ' : ''}${order.supplier_error}`}
                            data-testid="row-supplier-error"
                          >
                            {order.supplier_error}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(order.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        {/* The approval action used to live only at the bottom of
                            the details modal, below two sections that need
                            scrolling past. The one person who has to press it
                            could not find it. It gets a door of its own here.

                            An unpaid CARD order gets no green button at all:
                            "confirm payment" is a bank-transfer action, the
                            server refuses it for cards, and a button that only
                            exists to be refused teaches the owner to distrust
                            every button on the page. */}
                        {!order.supplier_order_id && !(isCard(order) && !isPaid(order)) && (
                          <Button
                            onClick={() => openOrder(order)}
                            data-testid="row-review-and-send"
                            size="sm"
                            className={!isPaid(order)
                              ? 'bg-green-600 hover:bg-green-700 text-white'
                              : order.supplier_status === 'failed'
                                ? 'bg-red-600 hover:bg-red-700 text-white'
                                : 'bg-amber-600 hover:bg-amber-700 text-white'}
                          >
                            {!isPaid(order)
                              ? (isRTL ? 'أكّد الدفع' : 'Confirm payment')
                              : order.supplier_status === 'failed'
                                ? (isRTL ? 'أعِد المحاولة' : 'Retry')
                                : (isRTL ? 'راجِع وأرسِل' : 'Review & send')}
                          </Button>
                        )}
                        <Button
                          onClick={() => openOrder(order)}
                          variant="ghost"
                          size="sm"
                          className="text-amber-600 hover:text-amber-900"
                        >
                          <Eye className="h-4 w-4 me-1" />
                          {isRTL ? 'عرض' : 'View'}
                        </Button>
                        {deletable(order) && (
                          <Button
                            onClick={() => deleteOrder(order)}
                            disabled={sending}
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-800 hover:bg-red-50"
                            data-testid="row-delete-order"
                          >
                            <Trash2 className="h-4 w-4 me-1" />
                            {isRTL ? 'حذف' : 'Delete'}
                          </Button>
                        )}
                      </div>
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
                  {isRTL ? 'تفاصيل الطلب ' : 'Order Details '}
                  <span dir="ltr" title={selectedOrder.id}>{orderLabel(selectedOrder)}</span>
                </h2>
                <Button
                  onClick={() => setShowOrderModal(false)}
                  variant="ghost"
                  size="sm"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* Did the money arrive? Nothing else in this dialog matters
                  until that is answered, and buying the goods is refused by
                  the server until it says yes. */}
              <div
                className={`mb-4 rounded-lg p-4 border-2 ${
                  isPaid(selectedOrder)
                    ? 'border-green-200 bg-green-50'
                    : 'border-red-200 bg-red-50'
                }`}
                data-testid="payment-box"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold">
                      {isPaid(selectedOrder)
                        ? (isRTL ? 'الدفع مؤكَّد' : 'Payment confirmed')
                        : isCard(selectedOrder)
                          ? (isRTL ? 'لم يكتمل الدفع بالبطاقة' : 'Card payment not completed')
                          : (isRTL ? 'لم يصل المبلغ بعد' : 'Not paid yet')}
                    </h3>
                    <p className="text-sm text-gray-700">
                      {isRTL ? 'طريقة الدفع: ' : 'Method: '}
                      {isCard(selectedOrder)
                        ? (isRTL ? 'بطاقة عبر iyzico' : 'Card via iyzico')
                        : selectedOrder.payment_method === 'bank_transfer'
                          ? (isRTL ? 'حوالة بنكية' : 'Bank transfer')
                          : (isRTL ? 'الدفع عند تأكيد الطلب' : 'Payment on confirmation')}
                      {isCard(selectedOrder) && selectedOrder.payment_amount_charged
                        ? ` — ${selectedOrder.payment_amount_charged} ${selectedOrder.payment_currency_charged || ''}`
                        : ''}
                      {selectedOrder.payment_reference
                        ? ` — ${selectedOrder.payment_reference}` : ''}
                    </p>
                  </div>
                  {/* The confirm/undo pair is for money a human saw land in a
                      bank account. A card's truth comes from iyzico's signed
                      answer and from nowhere else, so for card orders the
                      buttons do not exist — the server refuses them anyway. */}
                  {!isCard(selectedOrder) && (isPaid(selectedOrder) ? (
                    <Button
                      onClick={() => confirmPayment(selectedOrder.id, false)}
                      disabled={sending || !!selectedOrder.supplier_order_id}
                      data-testid="unconfirm-payment"
                      variant="outline"
                      size="sm"
                    >
                      {isRTL ? 'تراجع' : 'Undo'}
                    </Button>
                  ) : (
                    <Button
                      onClick={() => confirmPayment(selectedOrder.id, true)}
                      disabled={sending}
                      data-testid="confirm-payment"
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {isRTL ? 'أكّد استلام المبلغ' : 'Confirm payment received'}
                    </Button>
                  ))}
                </div>
                {isCard(selectedOrder) && !isPaid(selectedOrder) && selectedOrder.payment_error && (
                  <p className="mt-2 text-xs text-red-700" dir="ltr" data-testid="modal-payment-error">
                    {selectedOrder.payment_error}
                  </p>
                )}
                {!isPaid(selectedOrder) && (
                  <p className="mt-2 text-xs text-gray-600">
                    {isCard(selectedOrder)
                      ? (isRTL
                        ? 'العميل لم يُكمل صفحة دفع iyzico. دفع البطاقة لا يُؤكَّد يدوياً أبداً — وإن كان طلباً تجريبياً فاحذفه من القائمة.'
                        : 'The customer never finished iyzico’s payment page. Card payments are never confirmed by hand — if this was a test order, delete it from the list.')
                      : (isRTL
                        ? 'راجع كشف حسابك أولاً. لا تُشترى البضاعة من CJ قبل هذا التأكيد.'
                        : 'Check your bank statement first. Nothing is bought from CJ before this is confirmed.')}
                  </p>
                )}
              </div>

              {/* Send to the supplier. Deliberately a separate, explicit action:
                  it commits the shop to buying the goods, so nothing does it on
                  a timer or on the customer's checkout.

                  It sits first in the modal, not last. It used to come after the
                  customer block and the item list, which on a laptop put it
                  below the fold — so the only action in this window that the
                  owner actually has to take was the only one they had to go
                  looking for. */}
              <div className="mb-6 border-2 border-amber-300 bg-amber-50 rounded-lg p-4">
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
                    {/* The reason the last attempt failed was written to the
                        order and never shown to anyone. Without it the owner
                        presses the same button again and gets the same
                        silence.

                        The timestamp is not decoration: this line shows the
                        SAVED error of the last attempt, and without a time on
                        it the owner read an old failure as the result of a
                        retry they had not actually run yet. */}
                    {selectedOrder.supplier_status === 'failed' && selectedOrder.supplier_error && (
                      <p
                        className="text-sm text-red-700 mb-3 bg-red-50 border border-red-200 rounded p-2"
                        data-testid="supplier-last-error"
                      >
                        <strong>
                          {isRTL ? 'فشلت آخر محاولة إرسال' : 'Last send attempt failed'}
                          {selectedOrder.supplier_failed_at
                            ? ` (${formatDate(selectedOrder.supplier_failed_at)})` : ''}
                          {': '}
                        </strong>
                        <span dir="ltr">{selectedOrder.supplier_error}</span>
                      </p>
                    )}
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
                        className="border-amber-600 text-amber-800 bg-white hover:bg-amber-100"
                      >
                        {isRTL ? 'فحص بلا إرسال (مجاناً)' : 'Dry run (free)'}
                      </Button>
                      {/* Disabled rather than left to fail on click: the
                          server refuses an unpaid order, and a button that
                          looks ready and then errors teaches nothing. */}
                      <Button
                        onClick={() => sendToSupplier(selectedOrder.id)}
                        disabled={sending || !isPaid(selectedOrder)}
                        data-testid="send-to-supplier"
                        title={!isPaid(selectedOrder)
                          ? (isRTL ? 'أكّد استلام المبلغ أوّلاً' : 'Confirm the payment first')
                          : undefined}
                        className="bg-amber-600 hover:bg-amber-700"
                      >
                        {sending
                          ? (isRTL ? 'جارٍ الإرسال…' : 'Sending…')
                          : (isRTL ? 'أرسل إلى CJ' : 'Send to CJ')}
                      </Button>
                    </div>
                    <p className="mt-2 text-xs text-gray-500">
                      {isRTL
                        ? '«فحص بلا إرسال» يسأل CJ عن التوفّر وتكلفة الشحن الحقيقية ولا ينشئ طلباً — ويعمل قبل تأكيد الدفع.'
                        : 'The dry run asks CJ for stock and the real freight cost; it creates nothing, and works before payment is confirmed.'}
                    </p>
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
                  {(selectedOrder.items || []).map((item, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">{item.product_name}</p>
                        <p className="text-sm text-gray-500">{isRTL ? `الكمية: ${item.quantity}` : `Quantity: ${item.quantity}`}</p>
                      </div>
                      <p className="font-semibold">{formatMoney(item.price)}</p>
                    </div>
                  ))}
                </div>
                <div className="border-t pt-3 mt-3">
                  <div className="flex justify-between items-center text-lg font-bold">
                    <span>{isRTL ? 'الإجمالي:' : 'Total:'}</span>
                    <span>{formatMoney(selectedOrder.total_amount)}</span>
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
                        <StatusIcon className="h-4 w-4 me-1" />
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