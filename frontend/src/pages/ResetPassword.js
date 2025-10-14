import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Lock, ArrowLeft, CheckCircle } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card } from '../components/ui/card';
import { toast } from 'sonner';
import { useLanguage } from '../context/LanguageContext';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL || '';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const isRTL = language === 'ar' || language === 'he';
  
  const token = searchParams.get('token');
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error(
        isRTL
          ? 'كلمات المرور غير متطابقة'
          : 'Passwords do not match'
      );
      return;
    }

    if (newPassword.length < 6) {
      toast.error(
        isRTL
          ? 'يجب أن تتكون كلمة المرور من 6 أحرف على الأقل'
          : 'Password must be at least 6 characters'
      );
      return;
    }

    if (!token) {
      toast.error(
        isRTL
          ? 'رمز إعادة التعيين غير صالح'
          : 'Invalid reset token'
      );
      return;
    }

    setLoading(true);

    try {
      await axios.post(`${API}/auth/reset-password`, {
        token,
        new_password: newPassword
      });
      
      setSuccess(true);
      toast.success(
        isRTL
          ? 'تم إعادة تعيين كلمة المرور بنجاح!'
          : 'Password reset successfully!'
      );
      
      setTimeout(() => {
        navigate('/auth');
      }, 3000);
    } catch (error) {
      console.error('Reset password error:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to reset password';
      toast.error(
        isRTL
          ? 'فشل في إعادة تعيين كلمة المرور'
          : errorMessage
      );
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className={`min-h-screen bg-gradient-to-br from-amber-50 via-white to-purple-50 flex items-center justify-center p-4 ${isRTL ? 'rtl' : 'ltr'}`}>
        <Card className="w-full max-w-md p-8">
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {isRTL ? 'تم إعادة تعيين كلمة المرور!' : 'Password Reset!'}
            </h2>
            <p className="text-gray-600 mb-6">
              {isRTL
                ? 'تم إعادة تعيين كلمة المرور بنجاح. سيتم تحويلك إلى صفحة تسجيل الدخول...'
                : 'Your password has been reset successfully. Redirecting to login...'}
            </p>
            <Link to="/auth">
              <Button className="w-full">
                {isRTL ? 'تسجيل الدخول الآن' : 'Login Now'}
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  if (!token) {
    return (
      <div className={`min-h-screen bg-gradient-to-br from-amber-50 via-white to-purple-50 flex items-center justify-center p-4 ${isRTL ? 'rtl' : 'ltr'}`}>
        <Card className="w-full max-w-md p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {isRTL ? 'رابط غير صالح' : 'Invalid Link'}
          </h2>
          <p className="text-gray-600 mb-6">
            {isRTL
              ? 'رابط إعادة تعيين كلمة المرور غير صالح أو منتهي الصلاحية'
              : 'This password reset link is invalid or has expired'}
          </p>
          <Link to="/forgot-password">
            <Button className="w-full">
              {isRTL ? 'طلب رابط جديد' : 'Request New Link'}
            </Button>
          </Link>
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
            {isRTL ? 'إعادة تعيين كلمة المرور' : 'Reset Password'}
          </h1>
          <p className="text-gray-600">
            {isRTL
              ? 'أدخل كلمة مرور جديدة لحسابك'
              : 'Enter a new password for your account'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {isRTL ? 'كلمة المرور الجديدة' : 'New Password'}
            </label>
            <div className="relative">
              <Lock className={`absolute top-3 ${isRTL ? 'right-3' : 'left-3'} h-5 w-5 text-gray-400`} />
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={isRTL ? 'pr-10' : 'pl-10'}
                placeholder={isRTL ? 'أدخل كلمة مرور جديدة' : 'Enter new password'}
                required
                minLength={6}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {isRTL ? 'تأكيد كلمة المرور' : 'Confirm Password'}
            </label>
            <div className="relative">
              <Lock className={`absolute top-3 ${isRTL ? 'right-3' : 'left-3'} h-5 w-5 text-gray-400`} />
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={isRTL ? 'pr-10' : 'pl-10'}
                placeholder={isRTL ? 'أكد كلمة المرور' : 'Confirm password'}
                required
                minLength={6}
              />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading
              ? (isRTL ? 'جاري إعادة التعيين...' : 'Resetting...')
              : (isRTL ? 'إعادة تعيين كلمة المرور' : 'Reset Password')}
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default ResetPassword;
