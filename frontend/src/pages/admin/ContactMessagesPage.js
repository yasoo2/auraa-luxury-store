import React, { useCallback, useEffect, useState } from 'react';
import { Mail, Phone, RefreshCw, AlertCircle, MailOpen } from 'lucide-react';
import axios from 'axios';
import { useLanguage } from '../../context/LanguageContext';
import { API_BASE_URL } from '../../api';
import { Button } from '../../components/ui/button';
import { toast } from 'sonner';

/**
 * The messages visitors send from «اتصل بنا».
 *
 * They are mailed to the shop's address as well, but mail is the part that can
 * fail — a missing key, a provider outage, a spam folder. This screen is the
 * copy that cannot go missing, and it says on each message whether the mail
 * actually left, rather than assuming it did.
 */
const ContactMessagesPage = () => {
  const { language } = useLanguage();
  const isRTL = language === 'ar';

  const [messages, setMessages] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API_BASE_URL}/api/admin/contact-messages`);
      setMessages(data.messages || []);
      setUnread(data.unread || 0);
      setError('');
    } catch (e) {
      // An empty list would read as "nobody wrote to you", which is a very
      // different thing from "the list could not be fetched".
      setMessages([]);
      setError(e.response?.data?.detail
        || (isRTL ? 'تعذّر تحميل الرسائل' : 'Could not load the messages'));
    } finally {
      setLoading(false);
    }
  }, [isRTL]);

  useEffect(() => { load(); }, [load]);

  const markRead = async (id) => {
    try {
      await axios.post(`${API_BASE_URL}/api/admin/contact-messages/${id}/read`);
      setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, read: true } : m)));
      setUnread((n) => Math.max(0, n - 1));
    } catch (e) {
      toast.error(e.response?.data?.detail
        || (isRTL ? 'تعذّر تعليم الرسالة كمقروءة' : 'Could not mark it read'));
    }
  };

  const when = (iso) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso || '';
    return d.toLocaleString(isRTL ? 'ar-SA-u-ca-gregory-nu-latn' : 'en-US',
      { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="max-w-4xl" data-testid="contact-messages-page">
      <div className="flex items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isRTL ? 'رسائل العملاء' : 'Customer messages'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {isRTL
              ? `${messages.length} رسالة${unread ? ` — ${unread} غير مقروءة` : ''}`
              : `${messages.length} message${messages.length === 1 ? '' : 's'}${unread ? ` — ${unread} unread` : ''}`}
          </p>
        </div>
        <Button variant="outline" onClick={load} disabled={loading} data-testid="reload-messages">
          <RefreshCw className={`h-4 w-4 me-2 ${loading ? 'animate-spin' : ''}`} />
          {isRTL ? 'تحديث' : 'Refresh'}
        </Button>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-4 mb-4 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {!loading && !error && messages.length === 0 && (
        <div className="p-8 text-center text-gray-500 border border-dashed border-gray-300 rounded-lg">
          {isRTL ? 'لم يصلك أي رسالة بعد.' : 'No messages yet.'}
        </div>
      )}

      <div className="space-y-3">
        {messages.map((m) => (
          <article
            key={m.id}
            data-testid="contact-message"
            className={`p-4 rounded-lg border ${m.read ? 'bg-white border-gray-200' : 'bg-amber-50 border-amber-300'}`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <div className="font-semibold text-gray-900">{m.name}</div>
              <div className="text-xs text-gray-500" dir="ltr">{when(m.created_at)}</div>
            </div>

            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm mb-3">
              <a href={`mailto:${m.email}`} className="flex items-center gap-1 text-amber-700 hover:underline">
                <Mail className="h-4 w-4" /> <span dir="ltr">{m.email}</span>
              </a>
              {m.phone && (
                <a href={`tel:${m.phone}`} className="flex items-center gap-1 text-amber-700 hover:underline">
                  <Phone className="h-4 w-4" /> <span dir="ltr">{m.phone}</span>
                </a>
              )}
            </div>

            <p className="text-gray-800 whitespace-pre-wrap text-sm leading-relaxed">{m.message}</p>

            <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-3 border-t border-black/5">
              {/* Said, not assumed: if the mail did not leave, this screen is
                  the only place the message exists. */}
              <span className={`text-xs ${m.emailed ? 'text-gray-500' : 'text-red-700'}`}>
                {m.emailed
                  ? (isRTL ? 'أُرسلت نسخة إلى بريد المتجر' : 'A copy was emailed to the store')
                  : (isRTL ? 'لم تُرسَل نسخة بالبريد — هذه الشاشة هي نسختها الوحيدة'
                           : 'No email copy was sent — this screen is the only copy')}
              </span>
              {!m.read && (
                <Button size="sm" variant="outline" onClick={() => markRead(m.id)} data-testid="mark-read">
                  <MailOpen className="h-4 w-4 me-2" />
                  {isRTL ? 'تعليم كمقروءة' : 'Mark as read'}
                </Button>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
};

export default ContactMessagesPage;
