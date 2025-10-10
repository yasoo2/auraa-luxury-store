import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, User, Phone } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';

const SimpleAuthPage = () => {
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
    phone: ''
  });

  const from = location.state?.from?.pathname || '/';

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      let result;
      if (isLogin) {
        result = await login(formData.email, formData.password);
      } else {
        result = await register(formData);
      }
      
      console.log('Login result:', result);
      if (result.success) {
        console.log('Login successful, navigating to:', from);
        alert('تم تسجيل الدخول بنجاح');
        navigate(from, { replace: true });
      } else {
        console.log('Login failed:', result.error);
        alert(result.error || 'حدث خطأ');
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
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-2xl">A</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">لورا لاكشري</h1>
          <h2 className="text-xl font-semibold text-gray-700 mb-2" data-testid="auth-title">
            {isLogin ? 'تسجيل الدخول' : 'إنشاء حساب جديد'}
          </h2>
          <p className="text-gray-600">
            {isLogin ? 'أهلاً بعودتك!' : 'انضم إلى عائلة Auraa Luxury'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {!isLogin && (
            <div className="grid grid-cols-2 gap-4">
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  name="first_name"
                  placeholder="الاسم الأول"
                  value={formData.first_name}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-xl px-12 py-3 text-gray-900 placeholder-gray-500 focus:outline-none focus:border-amber-400 transition-all duration-300"
                  required
                  data-testid="first-name-input"
                />
              </div>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  name="last_name"
                  placeholder="الاسم الأخير"
                  value={formData.last_name}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-xl px-12 py-3 text-gray-900 placeholder-gray-500 focus:outline-none focus:border-amber-400 transition-all duration-300"
                  required
                  data-testid="last-name-input"
                />
              </div>
            </div>
          )}

          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="email"
              name="email"
              placeholder="البريد الإلكتروني"
              value={formData.email}
              onChange={handleInputChange}
              className="w-full border border-gray-300 rounded-xl px-12 py-3 text-gray-900 placeholder-gray-500 focus:outline-none focus:border-amber-400 transition-all duration-300"
              required
              data-testid="email-input"
            />
          </div>

          {!isLogin && (
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="tel"
                name="phone"
                placeholder="رقم الجوال (اختياري)"
                value={formData.phone}
                onChange={handleInputChange}
                className="w-full border border-gray-300 rounded-xl px-12 py-3 text-gray-900 placeholder-gray-500 focus:outline-none focus:border-amber-400 transition-all duration-300"
                data-testid="phone-input"
              />
            </div>
          )}

          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              placeholder="كلمة المرور"
              value={formData.password}
              onChange={handleInputChange}
              className="w-full border border-gray-300 rounded-xl px-12 py-3 pr-12 text-gray-900 placeholder-gray-500 focus:outline-none focus:border-amber-400 transition-all duration-300"
              required
              minLength={6}
              data-testid="password-input"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors duration-200"
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            data-testid="auth-submit-button"
            className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-bold py-3 px-6 rounded-xl transition-all duration-300 hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
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
        <div className="mt-6 text-center">
          <p className="text-gray-600">
            {isLogin ? 'ليس لديك حساب؟' : 'لديك حساب بالفعل؟'}
            {' '}
            <button
              type="button"
              onClick={switchMode}
              className="text-amber-600 hover:text-amber-700 font-medium underline transition-colors duration-200"
              data-testid="switch-auth-mode"
            >
              {isLogin ? 'إنشاء حساب جديد' : 'تسجيل الدخول'}
            </button>
          </p>
        </div>

        {/* Demo Account Info */}
        <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <h4 className="font-medium text-amber-800 mb-2">حساب تجريبي:</h4>
          <div className="text-sm text-amber-700">
            <p>البريد: admin@auraa.com</p>
            <p>كلمة المرور: admin123</p>
          </div>
        </div>

        {/* Security Notice */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>🔒 بياناتك محمية ومشفرة</p>
        </div>
      </div>
    </div>
  );
};

export default SimpleAuthPage;