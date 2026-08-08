import React, { useState } from 'react';
import { Copy, Check, Building2, Info, CreditCard } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

/**
 * What a customer needs in order to actually send the money.
 *
 * The shop has no card gateway, so "pay" means a bank transfer the customer
 * makes themselves. That only works if the details are in front of them,
 * copyable, and carry the reference that lets the owner match the incoming
 * money to this order — a transfer with no reference is money that arrives
 * belonging to nobody.
 *
 * Every value here comes from the server. Nothing about a bank account may be
 * guessed, defaulted or filled in from an example: the failure mode is a
 * customer's money landing in a stranger's account.
 */

const CopyRow = ({ label, value, mono = true }) => {
  const [copied, setCopied] = useState(false);
  const { language } = useLanguage();
  const isRTL = language === 'ar';

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Clipboard access is refused in plenty of ordinary situations — an
      // insecure origin, a permission prompt declined. The value is on screen
      // and can be selected by hand, so say nothing rather than claim a copy
      // that did not happen.
      setCopied(false);
    }
  };

  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-amber-100 last:border-0">
      <span className="text-sm text-gray-600 shrink-0">{label}</span>
      <div className="flex items-center gap-2 min-w-0">
        <span
          dir={mono ? 'ltr' : undefined}
          className={`text-sm text-gray-900 truncate ${mono ? 'font-mono' : 'font-medium'}`}
        >
          {value}
        </span>
        <button
          type="button"
          onClick={copy}
          aria-label={isRTL ? `نسخ ${label}` : `Copy ${label}`}
          className="p-1.5 rounded hover:bg-amber-100 text-amber-700 shrink-0"
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
};

const PaymentInstructions = ({ method, amount, currency, reference, formatted, onPayByCard, paying, payError }) => {
  const { language } = useLanguage();
  const isRTL = language === 'ar';

  if (!method) return null;

  if (method.id === 'card') {
    return (
      <div
        className="border border-amber-200 bg-amber-50 rounded-lg p-4"
        data-testid="card-payment"
      >
        <div className="flex items-center gap-2 mb-2">
          <CreditCard className="h-5 w-5 text-amber-700" />
          <p className="font-semibold text-gray-900">
            {isRTL ? 'الدفع بالبطاقة' : 'Pay by card'}
          </p>
        </div>
        <p className="text-sm text-gray-700 mb-3">
          {isRTL
            ? 'Visa أو Mastercard أو American Express، من أي بلد. تتم العملية على صفحة iyzico المؤمّنة مع تحقّق 3D Secure، ولا يمرّ رقم بطاقتك بخوادمنا إطلاقاً.'
            : 'Visa, Mastercard or American Express, from any country. The payment happens on iyzico’s secured page with 3D Secure — your card number never touches our servers.'}
        </p>

        {/* The provider does not settle SAR, so the card is charged in another
            currency. Said here, before they leave, rather than discovered on
            a statement. */}
        {method.charged && (
          <p className="text-sm text-gray-800 bg-white rounded px-3 py-2 mb-3" data-testid="charged-amount">
            {isRTL ? 'سيُخصم من بطاقتك: ' : 'Your card will be charged: '}
            <strong dir="ltr">{method.charged}</strong>
          </p>
        )}

        {method.sandbox && (
          <p role="alert" className="text-sm text-red-800 bg-red-50 border border-red-200 rounded px-3 py-2 mb-3">
            {isRTL
              ? '⚠️ وضع الاختبار مفعّل — لن يُخصم مال حقيقي.'
              : '⚠️ Sandbox mode is on — no real money will move.'}
          </p>
        )}

        <button
          type="button"
          onClick={onPayByCard}
          disabled={paying}
          data-testid="pay-by-card"
          className="w-full sm:w-auto px-6 py-3 rounded-lg bg-amber-600 text-white font-semibold hover:bg-amber-700 disabled:opacity-60"
        >
          {paying
            ? (isRTL ? 'جارٍ التحويل إلى صفحة الدفع…' : 'Taking you to the payment page…')
            : (isRTL ? 'ادفع بالبطاقة الآن' : 'Pay by card now')}
        </button>

        {payError && (
          <p role="alert" data-testid="pay-error" className="mt-3 text-sm text-red-700">
            {payError}
          </p>
        )}
      </div>
    );
  }

  if (method.id !== 'bank_transfer') {
    return (
      <div
        className="border border-amber-200 bg-amber-50 rounded-lg p-4"
        data-testid="pay-on-confirmation"
      >
        <p className="font-semibold text-gray-900 mb-1">
          {isRTL ? 'الدفع عند تأكيد الطلب' : 'Payment on confirmation'}
        </p>
        <p className="text-sm text-gray-700">
          {isRTL
            ? 'نراجع طلبك ونتواصل معك لإتمام الدفع قبل الشحن. لن يُخصم منك شيء الآن.'
            : 'We review your order and contact you to settle payment before it ships. Nothing is charged now.'}
        </p>
      </div>
    );
  }

  return (
    <div
      className="border border-amber-200 bg-amber-50 rounded-lg p-4"
      data-testid="bank-transfer-instructions"
    >
      <div className="flex items-center gap-2 mb-3">
        <Building2 className="h-5 w-5 text-amber-700" />
        <p className="font-semibold text-gray-900">
          {isRTL ? 'حوالة بنكية' : 'Bank transfer'}
        </p>
      </div>

      <div className="bg-white rounded-md px-3 py-1 mb-3">
        <CopyRow
          label={isRTL ? 'اسم البنك' : 'Bank'}
          value={method.bank_name}
          mono={false}
        />
        <CopyRow
          label={isRTL ? 'اسم صاحب الحساب' : 'Account holder'}
          value={method.account_holder}
          mono={false}
        />
        <CopyRow label="IBAN" value={method.iban} />
        {method.swift && <CopyRow label="SWIFT / BIC" value={method.swift} />}
        {reference && (
          <CopyRow
            label={isRTL ? 'رقم الطلب (اكتبه في خانة البيان)' : 'Reference (put this in the note)'}
            value={reference}
          />
        )}
        {(formatted || amount != null) && (
          <CopyRow
            label={isRTL ? 'المبلغ' : 'Amount'}
            value={formatted || `${amount} ${currency || ''}`.trim()}
            mono={false}
          />
        )}
      </div>

      {method.account_currency && (
        <p className="text-xs text-gray-600 flex items-start gap-1.5 mb-2">
          <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          {isRTL
            ? `الحساب يستقبل ${method.account_currency}. قد يطبّق بنكك سعر صرف ورسوم تحويل.`
            : `The account receives ${method.account_currency}. Your bank may apply its own exchange rate and fees.`}
        </p>
      )}

      {method.instructions && (
        <p className="text-sm text-gray-700 whitespace-pre-line mb-2">{method.instructions}</p>
      )}

      <p className="text-sm text-gray-700">
        {isRTL
          ? 'بعد التحويل يصلنا إشعار، ونؤكّد استلام المبلغ ثم نبدأ التجهيز. اكتب رقم الطلب في بيان الحوالة حتى نتمكّن من مطابقتها.'
          : 'Once the transfer arrives we confirm it and start preparing your order. Quote the order number on the transfer so we can match it.'}
      </p>
    </div>
  );
};

export default PaymentInstructions;
