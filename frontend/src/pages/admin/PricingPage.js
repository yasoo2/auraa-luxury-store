import React, { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { useLanguage } from '../../context/LanguageContext';
import { apiGet, apiPost, apiPut } from '../../api';

// The profit margin lived as a constant in the backend code — changing it
// meant asking for a deploy. This screen makes it the owner's dial: the saved
// margin shapes every future import, and «إعادة التسعير» rewrites the
// auto-priced catalogue in place. Prices the owner typed by hand are pinned
// and never overwritten.
const PricingPage = () => {
  const { language } = useLanguage();
  const isRTL = language === 'ar';

  const [settings, setSettings] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [margin, setMargin] = useState('');
  const [minProfit, setMinProfit] = useState('');
  const [saving, setSaving] = useState(false);
  const [repricing, setRepricing] = useState(false);
  const [repriceReport, setRepriceReport] = useState(null);

  const fetchSettings = useCallback(async () => {
    setLoadError(null);
    try {
      const data = await apiGet('/api/admin/pricing-settings');
      setSettings(data);
      setMargin(String(data.profit_margin_percent));
      setMinProfit(String(data.minimum_profit_sar));
    } catch (error) {
      setLoadError(error.message || 'failed');
    }
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const handleSave = async () => {
    const marginNum = parseFloat(margin);
    const minNum = parseFloat(minProfit);
    if (Number.isNaN(marginNum) || marginNum < 0 || marginNum > 1000) {
      toast.error(isRTL ? 'نسبة الربح يجب أن تكون بين 0 و1000' : 'Profit margin must be between 0 and 1000');
      return;
    }
    if (Number.isNaN(minNum) || minNum < 0 || minNum > 10000) {
      toast.error(isRTL ? 'الحد الأدنى للربح يجب أن يكون بين 0 و10000 ر.س' : 'Minimum profit must be between 0 and 10000 SAR');
      return;
    }
    setSaving(true);
    try {
      const updated = await apiPut('/api/admin/pricing-settings', {
        profit_margin_percent: marginNum,
        minimum_profit_sar: minNum,
      });
      setSettings((prev) => ({ ...prev, ...updated }));
      toast.success(isRTL
        ? `تم الحفظ: الربح ${updated.profit_margin_percent}% — يسري على كل استيراد قادم`
        : `Saved: ${updated.profit_margin_percent}% margin — applies to every future import`);
    } catch (error) {
      toast.error((isRTL ? 'فشل الحفظ: ' : 'Save failed: ') + (error.message || ''));
    } finally {
      setSaving(false);
    }
  };

  const handleReprice = async () => {
    const confirmed = window.confirm(isRTL
      ? 'سيُعاد حساب سعر كل منتج سُعّر تلقائياً بالهامش المحفوظ الآن. الأسعار التي عدّلتها يدوياً لن تُمسّ. متابعة؟'
      : 'Every auto-priced product will be recomputed with the currently saved margin. Hand-edited prices stay untouched. Continue?');
    if (!confirmed) return;

    setRepricing(true);
    setRepriceReport(null);
    try {
      const report = await apiPost('/api/admin/pricing-settings/reprice', {});
      setRepriceReport(report);
      toast.success(isRTL
        ? `أعيد تسعير ${report.repriced} منتجاً بهامش ${report.profit_margin_percent}%`
        : `Repriced ${report.repriced} products at ${report.profit_margin_percent}% margin`);
    } catch (error) {
      toast.error((isRTL ? 'فشلت إعادة التسعير: ' : 'Reprice failed: ') + (error.message || ''));
    } finally {
      setRepricing(false);
    }
  };

  if (loadError) {
    return (
      <div className="p-6" dir={isRTL ? 'rtl' : 'ltr'}>
        <Card className="p-6 border-red-300 bg-red-50">
          <p className="text-red-700 font-semibold mb-3">
            {isRTL ? 'تعذّر تحميل إعدادات التسعير' : 'Could not load pricing settings'}
          </p>
          <p className="text-sm text-red-600 mb-4" dir="ltr">{loadError}</p>
          <Button onClick={fetchSettings} variant="outline">{isRTL ? 'إعادة المحاولة' : 'Retry'}</Button>
        </Card>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="flex justify-center items-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
          {isRTL ? '💰 التسعير والربح' : '💰 Pricing & Profit'}
        </h1>
        <p className="text-gray-600 mt-1">
          {isRTL
            ? 'الهامش المحفوظ هنا يسري على كل استيراد قادم، وإعادة التسعير تطبّقه على الكتالوج الحالي.'
            : 'The margin saved here shapes every future import; repricing applies it to the current catalogue.'}
        </p>
      </div>

      {/* Margin settings */}
      <Card className="p-5 sm:p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">
          {isRTL ? 'نسبة الربح' : 'Profit margin'}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {isRTL ? 'الربح فوق التكلفة (%)' : 'Profit over cost (%)'}
            </label>
            <Input
              type="number"
              min="0"
              max="1000"
              step="5"
              value={margin}
              onChange={(e) => setMargin(e.target.value)}
              disabled={saving}
              data-testid="pricing-margin-input"
            />
            <p className="text-xs text-gray-500 mt-1">
              {isRTL
                ? `مثال: 200% تعني منتج تكلفته 10 يُعرض بنحو 30 قبل الضريبة. الافتراضي ${settings.defaults?.profit_margin_percent ?? 200}%.`
                : `e.g. 200% means a cost of 10 lists at about 30 before tax. Default ${settings.defaults?.profit_margin_percent ?? 200}%.`}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {isRTL ? 'الحد الأدنى للربح (ر.س)' : 'Minimum profit (SAR)'}
            </label>
            <Input
              type="number"
              min="0"
              max="10000"
              step="1"
              value={minProfit}
              onChange={(e) => setMinProfit(e.target.value)}
              disabled={saving}
              data-testid="pricing-min-profit-input"
            />
            <p className="text-xs text-gray-500 mt-1">
              {isRTL
                ? 'لا يقلّ ربح أي منتج عن هذا المبلغ مهما صغرت تكلفته.'
                : 'No product earns less than this, however small its cost.'}
            </p>
          </div>
        </div>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="mt-4 btn-luxury"
          data-testid="pricing-save"
        >
          {saving ? (isRTL ? 'جارٍ الحفظ…' : 'Saving…') : (isRTL ? 'حفظ الإعدادات' : 'Save settings')}
        </Button>
      </Card>

      {/* Reprice the catalogue */}
      <Card className="p-5 sm:p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-2">
          {isRTL ? 'إعادة تسعير الكتالوج' : 'Reprice the catalogue'}
        </h2>
        <p className="text-sm text-gray-600 mb-4 max-w-2xl">
          {isRTL
            ? 'يعيد حساب سعر كل منتج سُعّر تلقائياً عند الاستيراد بالهامش المحفوظ أعلاه. أي سعر عدّلته بيدك يبقى كما كتبته — لا يُمسّ أبداً.'
            : 'Recomputes every product that was auto-priced at import using the margin saved above. Any price you edited by hand stays exactly as you wrote it.'}
        </p>
        <Button
          onClick={handleReprice}
          disabled={repricing}
          variant="outline"
          data-testid="pricing-reprice"
        >
          {repricing ? (isRTL ? 'جارٍ إعادة التسعير…' : 'Repricing…') : (isRTL ? 'إعادة تسعير الآن' : 'Reprice now')}
        </Button>
        {repriceReport && (
          <div className="mt-4 p-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-800" data-testid="reprice-report">
            {isRTL
              ? `أعيد تسعير ${repriceReport.repriced} منتجاً بهامش ${repriceReport.profit_margin_percent}%${repriceReport.kept_manual ? ` — وتُرك ${repriceReport.kept_manual} منتجاً بسعره اليدوي` : ''}.`
              : `Repriced ${repriceReport.repriced} products at ${repriceReport.profit_margin_percent}%${repriceReport.kept_manual ? ` — ${repriceReport.kept_manual} hand-priced products left untouched` : ''}.`}
          </div>
        )}
      </Card>

      {/* Where the true cost shows */}
      <Card className="p-5 sm:p-6 bg-amber-50 border-amber-200">
        <h2 className="text-lg font-bold text-amber-900 mb-2">
          {isRTL ? 'أين أرى التكلفة الحقيقية؟' : 'Where do I see the true cost?'}
        </h2>
        <p className="text-sm text-amber-800 max-w-2xl">
          {isRTL
            ? 'افتح أي منتج من «المنتجات» في الإدارة: ستجد لوحة «التكلفة الحقيقية» فيها سعر المورد قبل أي إضافة، وتفصيل الربح والضريبة والشحن، والسعر النهائي. هذه اللوحة للمديرين فقط — الزبائن لا يرون تكلفة المورد أبداً، والمسارات العامة لا ترسلها أصلاً.'
            : 'Open any product from Admin → Products: a "True cost" panel shows the supplier price before any additions, the profit/tax/shipping breakdown, and the final price. Admins only — customers never see supplier costs, and the public API never sends them.'}
        </p>
      </Card>
    </div>
  );
};

export default PricingPage;
