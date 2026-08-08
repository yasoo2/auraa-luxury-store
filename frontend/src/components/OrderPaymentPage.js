import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { apiGet, apiPost } from '../api';
import PaymentInstructions from './PaymentInstructions';

/**
 * The page a customer lands on after placing an order: what they owe, how to
 * send it, and what happens next.
 *
 * Checkout used to end at the profile's order list, where the order said
 * "بانتظار" — waiting — and nothing said waiting for what, or that the next
 * move was the customer's. People assumed they had paid.
 */
const OrderPaymentPage = () => {
  const { orderId } = useParams();
  const { language, formatMoney } = useLanguage();
  const isRTL = language === 'ar';

  const [info, setInfo] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState('');

  const payByCard = async () => {
    setPaying(true);
    setPayError('');
    try {
      const data = await apiPost(`/api/orders/${orderId}/pay-session`, {});
      if (!data?.payment_page_url) {
        throw new Error('no payment page');
      }
      window.location.assign(data.payment_page_url);
    } catch (err) {
      // Staying put and saying why beats a blank redirect: the customer still
      // has an unpaid order and needs to know it is still unpaid.
      setPayError(err?.message
        || (isRTL ? 'تعذّر فتح صفحة الدفع. حاول مرة أخرى.' : 'Could not open the payment page. Try again.'));
      setPaying(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await apiGet(`/api/orders/${orderId}/payment-instructions`);
        if (!cancelled) setInfo(data);
      } catch (err) {
        if (!cancelled) {
          setError(isRTL
            ? 'تعذّر تحميل تفاصيل الدفع لهذا الطلب.'
            : 'Could not load the payment details for this order.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  const paid = info?.payment_status === 'paid';

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 py-10" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-amber-100 p-6 md:p-8">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-600" />
            </div>
          ) : error ? (
            <div
              role="alert"
              data-testid="payment-instructions-error"
              className="flex items-start gap-3 text-red-800 bg-red-50 border border-red-200 rounded-lg p-4"
            >
              <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          ) : (
            <>
              <div className="flex items-start gap-3 mb-6">
                <CheckCircle2 className="h-8 w-8 text-green-600 shrink-0" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {isRTL ? 'تم استلام طلبك' : 'Your order is in'}
                  </h1>
                  <p className="text-gray-600 mt-1">
                    {isRTL ? 'رقم الطلب: ' : 'Order number: '}
                    <span dir="ltr" className="font-mono font-semibold text-gray-900">
                      {info.order_number || info.order_id}
                    </span>
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between border-y border-gray-100 py-4 mb-6">
                <span className="text-gray-600">{isRTL ? 'المبلغ المطلوب' : 'Amount due'}</span>
                <span className="text-2xl font-bold text-gray-900">
                  {formatMoney(info.amount)}
                </span>
              </div>

              {paid ? (
                <div
                  className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-lg p-4"
                  data-testid="payment-confirmed"
                >
                  <CheckCircle2 className="h-5 w-5 text-green-700 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold text-green-900">
                      {isRTL ? 'تم تأكيد استلام المبلغ' : 'Payment confirmed'}
                    </p>
                    <p className="text-sm text-green-800">
                      {isRTL
                        ? 'طلبك قيد التجهيز الآن. ستصلك تفاصيل الشحن عند خروج الطلب.'
                        : 'Your order is being prepared. You will get the shipping details when it leaves.'}
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start gap-3 mb-4 text-amber-900">
                    <Clock className="h-5 w-5 mt-0.5 shrink-0" />
                    <p className="text-sm">
                      {isRTL
                        ? 'لم يُخصم منك شيء بعد. أكمل الدفع بالتفاصيل التالية حتى نبدأ التجهيز.'
                        : 'Nothing has been charged yet. Complete the payment below so we can start preparing it.'}
                    </p>
                  </div>
                  <PaymentInstructions
                    method={info.method}
                    amount={info.amount}
                    currency={info.currency}
                    reference={info.reference_to_quote}
                    formatted={formatMoney(info.amount)}
                    onPayByCard={payByCard}
                    paying={paying}
                    payError={payError || info.payment_error}
                  />
                  {info.method?.unavailable && (
                    <p
                      role="alert"
                      data-testid="method-unavailable"
                      className="mt-3 text-sm text-red-700"
                    >
                      {isRTL
                        ? 'طريقة الدفع المختارة لم تعد متاحة — تواصل معنا لإتمام الدفع.'
                        : 'The chosen payment method is no longer available — please contact us to settle payment.'}
                    </p>
                  )}
                </>
              )}

              <div className="flex flex-wrap gap-3 mt-8">
                <Link
                  to="/profile?tab=orders"
                  className="px-5 py-2.5 rounded-lg bg-amber-600 text-white font-medium hover:bg-amber-700"
                >
                  {isRTL ? 'طلباتي' : 'My orders'}
                </Link>
                <Link
                  to="/products"
                  className="px-5 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50"
                >
                  {isRTL ? 'متابعة التسوّق' : 'Keep shopping'}
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderPaymentPage;
