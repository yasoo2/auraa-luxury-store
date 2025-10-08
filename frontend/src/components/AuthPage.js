// frontend/src/components/AuthPage.js
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, User } from 'lucide-react'; // أزلنا Phone لأنه لن نستخدم أيقونة مع الحقل الجديد
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card } from './ui/card';
import { toast } from 'sonner';
import { useAuth } from '../App';

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
    email: '',
    password: '',
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
      
      if (result.success) {
        toast.success(isLogin ? 'تم تسجيل الدخول بنجاح' : 'تم إنشاء الحساب بنجاح');
        navigate(from, { replace: true });
      } else {
        toast.error(result.error || 'حدث خطأ');
      }
    } catch (error) {
      toast.error('حدث خطأ غير متوقع');
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
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center">
      <div className="max-w-md w-full mx-4">
        <Card className="luxury-card p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">A</span>
              </div>
              <span className="font-display text-2xl font-bold gradient-text">Auraa Luxury</span>
            </div>
            <h1 className="font-display text-3xl font-bold text-gray-900 mb-2" data-testid="auth-title">
              {isLogin ? 'تسجيل الدخول' : 'إنشاء حساب جديد'}
            </h1>
            <p className="text-gray-600">
              {isLogin ? 'مرحباً بعودتك!' : 'انضم إلى عائلة Auraa Luxury'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {!isLogin && (
              <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    type="text"
                    name="first_name"
                    placeholder="الاسم الأول"
                    value={formData.first_name}
                    onChange={handleInputChange}
                    className="pl-10"
                    required
                    data-testid="first-name-input"
                  />
                </div>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    type="text"
                    name="last_name"
                    placeholder="الاسم الأخير"
                    value={formData.last_name}
                    onChange={handleInputChange}
                    className="pl-10"
                    required
                    data-testid="last-name-input"
                  />
                </div>
              </div>
            )}

            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                type="email"
                name="email"
                placeholder="البريد الإلكتروني"
                value={formData.email}
                onChange={handleInputChange}
                className="pl-10"
                required
                data-testid="email-input"
              />
            </div>

            {/* ✅ حقل الهاتف الاحترافي مع أعلام الدول + المقدّمات */}
            {!isLogin && (
              <div className="relative">
                <label className="block mb-2 font-medium">رقم الجوال</label>
                <PhoneInput
                  country={'tr'} // البلد الافتراضي (يمكن تغييره لما تحب)
                  value={formData.phone.replace(/^\+?/, '')} 
                  onChange={(val /*, countryData, e, formattedValue */) => {
                    // نضمن حفظه بصيغة دولية تبدأ بـ +
                    const normalized = `+${String(val || '').replace(/^\+?/, '')}`;
                    setFormData((prev) => ({ ...prev, phone: normalized }));
                  }}
                  enableSearch
                  inputStyle={{ width: '100%' }}
                  dropdownStyle={{ zIndex: 9999 }}
                  placeholder="اختر الدولة ثم اكتب الرقم"
                />
                <p className="text-xs opacity-70 mt-1">
                  سيتم حفظ الرقم بصيغة دولية (E.164) مثل ‎+90555… لسهولة التواصل والشحن.
                </p>
              </div>
            )}

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                type={showPassword ? 'text' : 'password'}
                name="password"
                placeholder="كلمة المرور"
                value={formData.password}
                onChange={handleInputChange}
                className="pl-10 pr-10"
                required
                minLength={6}
                data-testid="password-input"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>

            <Button 
              type="submit" 
              className="btn-luxury w-full" 
              disabled={loading}
              data-testid="auth-submit-button"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span className="ml-2">جاري...</span>
                </div>
              ) : (
                isLogin ? 'تسجيل الدخول' : 'إنشاء حساب'
              )}
            </Button>
          </form>

          {/* Switch Mode */}
          <div className="mt-6 text-center">
            <p className="text-gray-600">
              {isLogin ? 'ليس لديك حساب؟' : 'لديك حساب بالفعل؟'}
              {' '}
              <button
                type="button"
                onClick={switchMode}
                className="text-amber-600 hover:text-amber-700 font-medium underline"
                data-testid="switch-auth-mode"
              >
                {isLogin ? 'إنشاء حساب جديد' : 'تسجيل الدخول'}
              </button>
            </p>
          </div>

          {/* Demo Account Info */}
          <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
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
        </Card>
      </div>
    </div>
  );
};

export default AuthPage;
