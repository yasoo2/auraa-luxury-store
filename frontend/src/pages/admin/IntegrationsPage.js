import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { Plug, CheckCircle, XCircle, RefreshCw, ShieldCheck, AlertTriangle } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { API_BASE_URL } from '../../api';

const API = `${API_BASE_URL}/api`;

/**
 * Supplier connections.
 *
 * This page used to POST integration settings to /admin/integrations, which
 * the server has never had — so credentials typed here went nowhere and the
 * "test connection" button reported nothing real.
 *
 * Credentials deliberately stay in the deployment environment rather than the
 * database: an API key in Mongo is one query away from anyone who gets read
 * access, and the server already reads CJ's key from its environment. So this
 * page reports the truth about that connection and lets you exercise it.
 */
const IntegrationsPage = () => {
  const { language } = useLanguage();
  const isRTL = language === 'ar';

  const [auth, setAuth] = useState({ state: 'checking', detail: '' });
  const [reach, setReach] = useState({ state: 'checking', detail: '' });
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);

  const probe = useCallback(async () => {
    setAuth({ state: 'checking', detail: '' });
    setReach({ state: 'checking', detail: '' });

    try {
      const { data } = await axios.get(`${API}/admin/cj/test-auth`);
      setAuth({ state: data?.ok ? 'ok' : 'fail', detail: data?.message || '' });
    } catch (e) {
      setAuth({
        state: 'fail',
        detail: e.response?.data?.detail
          || (isRTL ? 'تعذّر التحقق من بيانات الاعتماد' : 'Could not verify the credentials'),
      });
    }

    try {
      const { data } = await axios.get(`${API}/admin/cj/ping`);
      setReach({ state: data?.ok ? 'ok' : 'fail', detail: data?.message || '' });
    } catch (e) {
      setReach({
        state: 'fail',
        detail: e.response?.data?.detail
          || (isRTL ? 'خدمة CJ لا تستجيب' : 'CJ is not responding'),
      });
    }
  }, [isRTL]);

  useEffect(() => { probe(); }, [probe]);

  const runSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const { data } = await axios.post(`${API}/auto-update/sync-products`);
      setSyncResult({ ok: true, message: data?.message || (isRTL ? 'بدأت المزامنة' : 'Sync started') });
    } catch (e) {
      setSyncResult({
        ok: false,
        message: e.response?.data?.detail
          || (isRTL ? 'تعذّر بدء المزامنة' : 'Could not start the sync'),
      });
    } finally {
      setSyncing(false);
    }
  };

  const Status = ({ state, label, detail }) => {
    const tone = state === 'ok'
      ? 'text-green-700 bg-green-50 border-green-200'
      : state === 'checking'
        ? 'text-gray-600 bg-gray-50 border-gray-200'
        : 'text-red-700 bg-red-50 border-red-200';
    const Icon = state === 'ok' ? CheckCircle : state === 'checking' ? RefreshCw : XCircle;
    return (
      <div className={`flex items-start gap-3 border rounded-lg px-4 py-3 ${tone}`}>
        <Icon className={`h-5 w-5 mt-0.5 flex-none ${state === 'checking' ? 'animate-spin' : ''}`} />
        <div className="min-w-0">
          <div className="font-semibold">{label}</div>
          {detail && <div className="text-sm opacity-80 break-words">{detail}</div>}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="flex items-center gap-3">
        <Plug className="h-8 w-8 text-amber-600" />
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {isRTL ? 'التكاملات' : 'Integrations'}
          </h1>
          <p className="text-gray-600 mt-1">
            {isRTL ? 'حالة الاتصال بالموردين، مقيسة الآن' : 'Supplier connections, measured now'}
          </p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">CJ Dropshipping</h2>
            <p className="text-sm text-gray-600">
              {isRTL ? 'مصدر المنتجات المستوردة' : 'The source of imported products'}
            </p>
          </div>
          <button
            type="button"
            onClick={probe}
            data-testid="cj-recheck"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4" />
            {isRTL ? 'إعادة الفحص' : 'Re-check'}
          </button>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <Status
            state={auth.state}
            label={isRTL ? 'بيانات الاعتماد' : 'Credentials'}
            detail={auth.detail}
          />
          <Status
            state={reach.state}
            label={isRTL ? 'الوصول إلى الخدمة' : 'Service reachable'}
            detail={reach.detail}
          />
        </div>

        <div className="flex items-start gap-3 text-sm text-gray-600 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
          <ShieldCheck className="h-5 w-5 text-amber-600 flex-none mt-0.5" />
          <p>
            {isRTL
              ? 'مفاتيح CJ محفوظة في متغيّرات البيئة على Render، لا في قاعدة البيانات — فمن يقرأ القاعدة لا يقرأ مفاتيحك. لتغييرها: لوحة Render ← Environment.'
              : 'CJ keys live in the Render environment, not the database — reading the database does not reveal them. To change them: Render dashboard → Environment.'}
          </p>
        </div>

        <div className="border-t border-gray-200 pt-5">
          <button
            type="button"
            onClick={runSync}
            disabled={syncing || auth.state !== 'ok'}
            data-testid="cj-sync"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-amber-600 text-white font-semibold hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            {isRTL ? 'مزامنة أسعار ومخزون المنتجات' : 'Sync product prices and stock'}
          </button>
          <p className="text-sm text-gray-500 mt-2">
            {auth.state !== 'ok'
              ? (isRTL ? 'يتطلّب اتصالاً سليماً بـ CJ.' : 'Requires a working CJ connection.')
              : (isRTL
                ? 'يحدّث المنتجات المستوردة من CJ بأحدث سعر ومخزون لدى المورّد.'
                : 'Refreshes CJ-imported products with the supplier’s current price and stock.')}
          </p>

          {syncResult && (
            <div
              role="alert"
              data-testid="cj-sync-result"
              className={`mt-3 flex items-start gap-2 border rounded-lg px-4 py-3 text-sm ${
                syncResult.ok
                  ? 'border-green-200 bg-green-50 text-green-800'
                  : 'border-red-200 bg-red-50 text-red-800'
              }`}
            >
              {syncResult.ok
                ? <CheckCircle className="h-4 w-4 mt-0.5 flex-none" />
                : <AlertTriangle className="h-4 w-4 mt-0.5 flex-none" />}
              <span>{syncResult.message}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default IntegrationsPage;
