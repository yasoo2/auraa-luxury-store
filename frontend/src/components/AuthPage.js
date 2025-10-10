// frontend/src/components/AuthPage.js
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, User } from 'lucide-react'; // أزلنا Phone لأنه لن نستخدم أيقونة مع الحقل الجديد
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card } from './ui/card';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';

// ✅ استيراد حقل الهاتف مع الأعلام
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';

const AuthPage = () => {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: 'admin@auraa.com',
    password: 'admin123',
    first_name: '',
    last_name: '',
    phone: '' // سيتم تخزينه بصيغة دولية مثل +90555...
  });

  const from = location.state?.from?.pathname || '/';

  const handleInputChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  // ✅ تحقّق بسيط للرقم الدولي (E.164 تقريبياً)
  const isValidInternationalPhone = (val) => {
    if (!val) return false;
    const digits = val.replace(/\D/g, '');
    return val.startsWith('+') && digits.length >= 8;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      let result;

      if (isLogin) {
        // تسجيل الدخول
        result = await login(formData.email, formData.password);
      } else {
        // ✅ تحقق احترافي قبل إنشاء الحساب
        if (!formData.first_name.trim() || !formData.last_name.trim()) {
          toast.error('الاسم الأول والاسم الأخير إجباريان');
          setLoading(false);
          return;
        }
        if (!formData.email.trim()) {
          toast.error('البريد الإلكتروني إجباري');
          setLoading(false);
          return;
        }
        if (!isValidInternationalPhone(formData.phone)) {
          toast.error('فضلاً اختر الدولة وتأكد من صحة رقم الهاتف (مثال: +9055…)');
          setLoading(false);
          return;
        }
        if (!formData.password || formData.password.length < 6) {
          toast.error('كلمة المرور يجب أن تكون 6 أحرف/أرقام على الأقل');
          setLoading(false);
          return;
        }

        // إنشاء الحساب
        result = await register(formData);
      }
      
      console.log('Login result:', result);
      if (result.success) {
        console.log('Login successful, navigating to:', from);
        navigate(from, { replace: true });
      } else {

      }
    } catch (error) {
      console.error('Auth error:', error);
      alert('حدث خطأ غير متوقع: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setIsLogin(!isLogin);
    setFormData({
      email: '',
      password: '',
      first_name: '',
      last_name: '',
      phone: ''
    });
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Luxury Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-amber-900 to-black">
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23fbbf24' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }}></div>
        <div className="absolute inset-0 animate-gold-shimmer opacity-30"></div>
      </div>
      
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          {/* Luxury Card */}
          <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-3xl p-8 shadow-2xl animate-luxury-zoom-in">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="flex items-center justify-center mb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600 rounded-full flex items-center justify-center animate-rotate-glow shadow-lg">
                  <span className="text-white font-bold text-2xl font-display">A</span>
                </div>
              </div>
              <h1 className="font-display text-3xl font-bold text-white animate-text-sparkle mb-2">Auraa Luxury</h1>
              <h2 className="text-xl font-semibold text-amber-200 mb-2 animate-fade-in-up" data-testid="auth-title">
                {isLogin ? 'تسجيل الدخول' : 'إنشاء حساب جديد'}
              </h2>
              <p className="text-white/80 animate-slide-in-right">
                {isLogin ? 'أهلاً بعودتك!' : 'انضم إلى عائلة Auraa Luxury'}
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {!isLogin && (
                <div className="grid grid-cols-2 gap-4 animate-fade-in-up">
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-amber-300" />
                    <input
                      type="text"
                      name="first_name"
                      placeholder="الاسم الأول"
                      value={formData.first_name}
                      onChange={handleInputChange}
                      className="w-full bg-white/10 border border-white/30 rounded-xl px-12 py-3 text-white placeholder-white/70 focus:outline-none focus:border-amber-400 transition-all duration-300"
                      required
                      data-testid="first-name-input"
                    />
                  </div>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-amber-300" />
                    <input
                      type="text"
                      name="last_name"
                      placeholder="الاسم الأخير"
                      value={formData.last_name}
                      onChange={handleInputChange}
                      className="w-full bg-white/10 border border-white/30 rounded-xl px-12 py-3 text-white placeholder-white/70 focus:outline-none focus:border-amber-400 transition-all duration-300"
                      required
                      data-testid="last-name-input"
                    />
                  </div>
                </div>
              )}

              <div className="relative animate-slide-in-left">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-amber-300" />
                <input
                  type="email"
                  name="email"
                  placeholder="البريد الإلكتروني"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full bg-white/10 border border-white/30 rounded-xl px-12 py-3 text-white placeholder-white/70 focus:outline-none focus:border-amber-400 transition-all duration-300"
                  required
                  data-testid="email-input"
                />
              </div>

              {!isLogin && (
                <div className="relative animate-fade-in-up">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-amber-300" />
                  <input
                    type="tel"
                    name="phone"
                    placeholder="رقم الجوال (اختياري)"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full bg-white/10 border border-white/30 rounded-xl px-12 py-3 text-white placeholder-white/70 focus:outline-none focus:border-amber-400 transition-all duration-300"
                    data-testid="phone-input"
                  />
                </div>
              )}


              </div>

              <button 
                type="submit" 
                disabled={loading}
                data-testid="auth-submit-button"
                className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-white font-bold py-3 px-6 rounded-xl transition-all duration-300 hover:scale-105 animate-pulse-gold shadow-2xl animate-luxury-zoom-in"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span className="ml-2">جاري...</span>
                  </div>
                ) : (
                  isLogin ? 'تسجيل الدخول' : 'إنشاء حساب'
                )}
              </button>
            </form>

            {/* Switch Mode */}
            <div className="mt-6 text-center animate-fade-in-up">
              <p className="text-white/80">
                {isLogin ? 'ليس لديك حساب؟' : 'لديك حساب بالفعل؟'}
                {' '}
                <button
                  type="button"
                  onClick={switchMode}
                  className="text-amber-300 hover:text-amber-200 font-medium underline transition-colors duration-200"
                  data-testid="switch-auth-mode"
                >
                  {isLogin ? 'إنشاء حساب جديد' : 'تسجيل الدخول'}
                </button>
              </p>
            </div>

            {/* Demo Account Info */}
            <div className="mt-6 p-4 bg-amber-500/20 border border-amber-300/30 rounded-xl backdrop-blur-sm animate-float">
              <h4 className="font-medium text-amber-200 mb-2">حساب تجريبي:</h4>
              <div className="text-sm text-amber-100">
                <p>البريد: admin@auraa.com</p>
                <p>كلمة المرور: admin123</p>
              </div>
            </div>

            {/* Security Notice */}
            <div className="mt-6 text-center text-sm text-white/60 animate-fade-in-up">
              <p>🔒 بياناتك محمية ومشفرة</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
