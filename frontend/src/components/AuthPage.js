import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, User, Phone } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { getAuthTranslation } from '../translations/auth';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import axios from 'axios';

const AuthPage = () => {
  const { login, register } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
  const TURNSTILE_SITE_KEY = process.env.REACT_APP_TURNSTILE_SITE_KEY;
  const [isLogin, setIsLogin] = useState(true);
  const [loginMethod, setLoginMethod] = useState('email'); // 'email' or 'phone'
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const turnstileRef = useRef(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    phone: ''
  });

  const from = location.state?.from?.pathname || '/';

  // Initialize Turnstile when component mounts or tab changes
  useEffect(() => {
    if (window.turnstile && turnstileRef.current && TURNSTILE_SITE_KEY) {
      // Clear existing widget
      if (turnstileRef.current.children.length > 0) {
        turnstileRef.current.innerHTML = '';
      }
      
      // Render new widget with optimized settings
      window.turnstile.render(turnstileRef.current, {
        sitekey: TURNSTILE_SITE_KEY,
        theme: 'light',
        size: 'compact', // Smaller size for faster loading
        language: language === 'ar' ? 'ar' : 'en',
        callback: function(token) {
          setTurnstileToken(token);
        },
        'error-callback': function() {
          // Don't block user on Turnstile error
          setTurnstileToken('fallback');
          console.warn('Turnstile verification failed - proceeding anyway');
        },
        'timeout-callback': function() {
          // Don't block user on timeout
          setTurnstileToken('fallback');
          console.warn('Turnstile timeout - proceeding anyway');
        }
      });
    }
  }, [isLogin, TURNSTILE_SITE_KEY, language]);

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(''); // Clear previous errors
    
    // Turnstile check - but don't strictly block
    // If no token and widget failed to load, proceed anyway
    if (!turnstileToken && window.turnstile) {
      // Wait a moment for Turnstile to complete
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // If still no token, use fallback
      if (!turnstileToken) {
        setTurnstileToken('fallback');
      }
    }
    
    try {
      let result;
      if (isLogin) {
        // Use email or phone based on login method
        const identifier = loginMethod === 'phone' ? formData.phone : formData.email;
        result = await login(identifier, formData.password, turnstileToken);
      } else {
        // Registration: Validate based on selected method
        if (loginMethod === 'email' && !formData.email) {
          const errorMsg = language === 'ar' 
            ? 'يجب إدخال البريد الإلكتروني'
            : 'Email is required';
          setError(errorMsg);
          setLoading(false);
          return;
        }
        
        if (loginMethod === 'phone' && !formData.phone) {
          const errorMsg = language === 'ar' 
            ? 'يجب إدخال رقم الهاتف'
            : 'Phone number is required';
          setError(errorMsg);
          setLoading(false);
          return;
        }
        
        // Set the identifier based on login method
        const registrationData = {
          ...formData,
          turnstile_token: turnstileToken
        };
        
        // Clear the unused field
        if (loginMethod === 'email') {
          registrationData.phone = null;
        } else {
          registrationData.email = null;
        }
        
        result = await register(registrationData);
      }
      
      if (result.success) {
        // Immediate navigation without delay
        navigate(from, { replace: true });
      } else {
        // Translate error message
        const errorKey = result.error || 'حدث خطأ';
        const translatedError = getAuthTranslation(errorKey, language) || errorKey;
        setError(translatedError);
      }
    } catch (error) {
      console.error('Auth error:', error);
      const translatedError = getAuthTranslation('oauth_session_invalid', language);
      setError(translatedError);
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setIsLogin(!isLogin);
    setError(''); // Clear error when switching modes
    setFormData({
      email: '',
      password: '',
      first_name: '',
      last_name: '',
      phone: ''
    });
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const redirectUrl = `${window.location.origin}/auth/oauth-callback`;
      const response = await axios.get(`${BACKEND_URL}/api/auth/oauth/google/url`, {
        params: { redirect_url: redirectUrl }
      });
      
      // Save provider info
      sessionStorage.setItem('oauth_provider', 'google');
      
      // Redirect to Google OAuth
      window.location.href = response.data.url;
    } catch (error) {
      console.error('Google OAuth error:', error);
      setError(getAuthTranslation('oauth_session_invalid', language));
      setLoading(false);
    }
  };

  const handleFacebookLogin = async () => {
    setLoading(true);
    try {
      const redirectUrl = `${window.location.origin}/auth/oauth-callback`;
      const response = await axios.get(`${BACKEND_URL}/api/auth/oauth/facebook/url`, {
        params: { redirect_url: redirectUrl }
      });
      
      // Save provider info
      sessionStorage.setItem('oauth_provider', 'facebook');
      
      // Redirect to Facebook OAuth
      window.location.href = response.data.url;
    } catch (error) {
      console.error('Facebook OAuth error:', error);
      setError(getAuthTranslation('oauth_session_invalid', language));
      setLoading(false);
    }
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
                {getAuthTranslation(isLogin ? 'login' : 'register', language)}
              </h2>
              <p className="text-white/80 animate-slide-in-right">
                {isLogin 
                  ? (language === 'ar' ? 'أهلاً بعودتك!' : 'Welcome back!') 
                  : (language === 'ar' ? 'انضم إلى Auraa Luxury' : 'Join Auraa Luxury')
                }
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 animate-shake">
                <p className="text-red-200 text-center text-sm font-medium">{error}</p>
              </div>
            )}

            {/* OAuth Buttons */}
            {isLogin && (
              <div className="space-y-3">
                <button
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="w-full bg-white text-gray-700 border border-gray-300 rounded-xl px-4 py-3 flex items-center justify-center space-x-2 hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <span>{getAuthTranslation('continue_with_google', language)}</span>
                </button>
                
                <button
                  onClick={handleFacebookLogin}
                  disabled={loading}
                  className="w-full bg-[#1877F2] text-white rounded-xl px-4 py-3 flex items-center justify-center space-x-2 hover:bg-[#166FE5] transition-colors disabled:opacity-50"
                >
                  <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                  <span>{getAuthTranslation('continue_with_facebook', language)}</span>
                </button>
                
                <div className="flex items-center space-x-4 my-4">
                  <div className="flex-1 border-t border-white/30"></div>
                  <span className="text-white/70 text-sm">{getAuthTranslation('or', language)}</span>
                  <div className="flex-1 border-t border-white/30"></div>
                </div>
              </div>
            )}

            {/* Login/Register Method Toggle */}
            <div className="flex space-x-2 bg-white/10 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setLoginMethod('email')}
                className={`flex-1 py-2 px-4 rounded-lg transition-all duration-300 ${
                  loginMethod === 'email'
                    ? 'bg-amber-500 text-white shadow-lg'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                <Mail className="inline h-4 w-4 mr-2" />
                {getAuthTranslation('email', language)}
              </button>
              <button
                type="button"
                onClick={() => setLoginMethod('phone')}
                className={`flex-1 py-2 px-4 rounded-lg transition-all duration-300 ${
                  loginMethod === 'phone'
                    ? 'bg-amber-500 text-white shadow-lg'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                <Phone className="inline h-4 w-4 mr-2" />
                {getAuthTranslation('phone', language)}
              </button>
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
                      placeholder={getAuthTranslation('first_name', language)}
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
                      placeholder={getAuthTranslation('last_name', language)}
                      value={formData.last_name}
                      onChange={handleInputChange}
                      className="w-full bg-white/10 border border-white/30 rounded-xl px-12 py-3 text-white placeholder-white/70 focus:outline-none focus:border-amber-400 transition-all duration-300"
                      required
                      data-testid="last-name-input"
                    />
                  </div>
                </div>
              )}

              {/* Email or Phone Input based on loginMethod */}
              {isLogin && loginMethod === 'email' && (
                <div className="relative animate-slide-in-left">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-amber-300" />
                  <input
                    type="email"
                    name="email"
                    placeholder={getAuthTranslation('email', language)}
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full bg-white/10 border border-white/30 rounded-xl px-12 py-3 text-white placeholder-white/70 focus:outline-none focus:border-amber-400 transition-all duration-300"
                    required
                    data-testid="email-input"
                  />
                </div>
              )}

              {isLogin && loginMethod === 'phone' && (
                <div className="animate-slide-in-left">
                  <PhoneInput
                    country={'sa'}
                    value={formData.phone}
                    onChange={(phone) => setFormData({ ...formData, phone: '+' + phone })}
                    inputProps={{
                      name: 'phone',
                      required: true,
                      className: 'w-full bg-white/10 border border-white/30 rounded-xl px-14 py-3 text-white placeholder-white/70 focus:outline-none focus:border-amber-400 transition-all duration-300'
                    }}
                    containerClass="phone-input-container"
                    buttonClass="phone-input-button"
                    dropdownClass="phone-input-dropdown"
                    searchClass="phone-input-search"
                    enableSearch={true}
                    searchPlaceholder={language === 'ar' ? "ابحث عن بلد..." : "Search country..."}
                    inputClass="phone-input-field"
                  />
                </div>
              )}

              {/* Register: Email OR Phone based on loginMethod */}
              {!isLogin && loginMethod === 'email' && (
                <div className="relative animate-slide-in-left">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-amber-300" />
                  <input
                    type="email"
                    name="email"
                    placeholder={getAuthTranslation('email', language)}
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full bg-white/10 border border-white/30 rounded-xl px-12 py-3 text-white placeholder-white/70 focus:outline-none focus:border-amber-400 transition-all duration-300"
                    data-testid="email-input"
                  />
                </div>
              )}

              {!isLogin && loginMethod === 'phone' && (
                <div className="animate-slide-in-left">
                  <PhoneInput
                    country={'sa'}
                    value={formData.phone}
                    onChange={(phone) => setFormData({ ...formData, phone: '+' + phone })}
                    inputProps={{
                      name: 'phone',
                      required: false,
                      className: 'w-full bg-white/10 border border-white/30 rounded-xl px-14 py-3 text-white placeholder-white/70 focus:outline-none focus:border-amber-400 transition-all duration-300'
                    }}
                    containerClass="phone-input-container"
                    buttonClass="phone-input-button"
                    dropdownClass="phone-input-dropdown"
                    searchClass="phone-input-search"
                    enableSearch={true}
                    searchPlaceholder={language === 'ar' ? "ابحث عن بلد..." : "Search country..."}
                    inputClass="phone-input-field"
                  />
                </div>
              )}

              <div className="relative animate-slide-in-right">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-amber-300" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  placeholder={getAuthTranslation('password', language)}
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full bg-white/10 border border-white/30 rounded-xl px-12 py-3 pr-12 text-white placeholder-white/70 focus:outline-none focus:border-amber-400 transition-all duration-300"
                  required
                  minLength={6}
                  data-testid="password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-amber-300 hover:text-amber-200 transition-colors duration-200"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>

              {isLogin && (
                <div className="text-right animate-fade-in-up">
                  <Link 
                    to="/forgot-password" 
                    className="text-sm text-amber-300 hover:text-amber-200 transition-colors duration-200"
                  >
                    {getAuthTranslation('forgot_password', language)}
                  </Link>
                </div>
              )}

              {/* Cloudflare Turnstile */}
              <div className="flex justify-center my-4">
                <div ref={turnstileRef} className="cf-turnstile" data-theme="light"></div>
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
                    <span className="ml-2">{language === 'ar' ? 'جاري...' : 'Loading...'}</span>
                  </div>
                ) : (
                  getAuthTranslation(isLogin ? 'login' : 'register', language)
                )}
              </button>
            </form>

            {/* Switch Mode */}
            <div className="mt-6 text-center animate-fade-in-up">
              <p className="text-white/80">
                {isLogin 
                  ? (language === 'ar' ? 'ليس لديك حساب؟' : "Don't have an account?") 
                  : (language === 'ar' ? 'لديك حساب بالفعل؟' : 'Already have an account?')
                }
                {' '}
                <button
                  type="button"
                  onClick={switchMode}
                  className="text-amber-300 hover:text-amber-200 font-medium underline transition-colors duration-200"
                  data-testid="switch-auth-mode"
                >
                  {getAuthTranslation(isLogin ? 'register' : 'login', language)}
                </button>
              </p>
            </div>

            {/* Info - Removed demo credentials for security */}

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