import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card } from '../components/ui/card';
import { toast } from 'sonner';
import { useLanguage } from '../context/LanguageContext';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL || '';

const ForgotPassword = () => {
  const { language } = useLanguage();
  const isRTL = language === 'ar' || language === 'he';
  
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await axios.post(`${API}/auth/forgot-password`, { email });
      setSubmitted(true);
      toast.success(
        isRTL
          ? 'إذا كان البريد الإلكتروني موجوداً، فقد تم إرسال رابط إعادة تعيين كلمة المرور'
          : 'If the email exists, a password reset link has been sent'
      );
    } catch (error) {
      console.error('Forgot password error:', error);
      toast.error(
        isRTL
          ? 'فشل في إرسال رابط إعادة تعيين كلمة المرور'
          : 'Failed to send password reset link'
      );
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className={`min-h-screen bg-gradient-to-br from-amber-50 via-white to-purple-50 flex items-center justify-center p-4 ${isRTL ? 'rtl' : 'ltr'}`}>
        <Card className="w-full max-w-md p-8">
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <Mail className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {isRTL ? 'تحقق من بريدك الإلكتروني' : 'Check Your Email'}
            </h2>
            <p className="text-gray-600 mb-6">
              {isRTL
                ? `إذا كان هناك حساب مرتبط بـ ${email}، فستتلقى رابط إعادة تعيين كلمة المرور.`
                : `If there's an account associated with ${email}, you'll receive a password reset link.`}
            </p>
            <Link to="/auth">
              <Button className="w-full">
                <ArrowLeft className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                {isRTL ? 'العودة لتسجيل الدخول' : 'Back to Login'}
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br from-amber-50 via-white to-purple-50 flex items-center justify-center p-4 ${isRTL ? 'rtl' : 'ltr'}`}>
      <Card className="w-full max-w-md p-8">
        <div className="mb-8">
          <Link to="/auth" className="flex items-center text-amber-600 hover:text-amber-700 mb-4">
            <ArrowLeft className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
            {isRTL ? 'العودة' : 'Back'}
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {isRTL ? 'نسيت كلمة المرور؟' : 'Forgot Password?'}
          </h1>
          <p className="text-gray-600">
            {isRTL
              ? 'أدخل بريدك الإلكتروني وسنرسل لك رابط إعادة تعيين كلمة المرور'
              : "Enter your email and we'll send you a password reset link"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {isRTL ? 'البريد الإلكتروني' : 'Email'}
            </label>
            <div className="relative">
              <Mail className={`absolute top-3 ${isRTL ? 'right-3' : 'left-3'} h-5 w-5 text-gray-400`} />
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={isRTL ? 'pr-10' : 'pl-10'}
                placeholder={isRTL ? 'your@email.com' : 'your@email.com'}
                required
              />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading
              ? (isRTL ? 'جاري الإرسال...' : 'Sending...')
              : (isRTL ? 'إرسال رابط إعادة التعيين' : 'Send Reset Link')}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-600">
          {isRTL ? 'تذكرت كلمة المرور؟' : 'Remember your password?'}{' '}
          <Link to="/auth" className="text-amber-600 hover:text-amber-700 font-medium">
            {isRTL ? 'تسجيل الدخول' : 'Login'}
          </Link>
        </div>
      </Card>
    </div>
  );
};

export default ForgotPassword;
