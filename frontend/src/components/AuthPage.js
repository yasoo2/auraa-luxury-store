import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, User, Phone } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { getAuthTranslation } from '../translations/auth';
import JewelExhibit from './JewelExhibit';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import axios from 'axios';
import { API_BASE_URL } from '../api';

const AuthPage = () => {
  const { login, register } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const BACKEND_URL = API_BASE_URL;
  const [isLogin, setIsLogin] = useState(true);
  const [loginMethod, setLoginMethod] = useState('email'); // 'email' or 'phone'
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  // Null until the backend answers: the Google button stays hidden until we
  // know the deployment actually has credentials, so it can never be a button
  // that fails when clicked.
  const [googleEnabled, setGoogleEnabled] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    phone: '',
    country: 'SA' // Default to Saudi Arabia
  });

  const from = location.state?.from?.pathname || '/';

  useEffect(() => {
    let cancelled = false;
    axios
      .get(`${BACKEND_URL}/api/auth/oauth/providers`)
      .then((res) => { if (!cancelled) setGoogleEnabled(!!res.data?.google); })
      .catch(() => { if (!cancelled) setGoogleEnabled(false); });
    return () => { cancelled = true; };
  }, [BACKEND_URL]);

  // The Turnstile widget used to be rendered here. It was failing to load on
  // this domain — it drew nothing but a bare "Troubleshoot" link, 150px of it,
  // directly above the submit button — and it protected nothing: the widget's
  // own error handler let the user through with a 'fallback' token, and the
  // backend never verified the token at all. Turning it into real protection
  // means a valid sitekey plus a server-side siteverify call; until both
  // exist, the box is cost without benefit.

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

    try {
      let result;
      if (isLogin) {
        // Use email or phone based on login method
        const identifier = loginMethod === 'phone' ? formData.phone : formData.email;
        result = await login(identifier, formData.password, undefined, rememberMe);
      } else {
        // Validate that at least email or phone is provided
        if (!formData.email && !formData.phone) {
          setError(getAuthTranslation('email_or_phone_required', language));
          setLoading(false);
          return;
        }
        // Add remember_me to registration data
        const registrationData = { ...formData, remember_me: rememberMe };
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
    // Register is the taller form. Switching to it while scrolled down left the
    // first fields above the viewport, so start the new form from its top.
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setFormData({
      email: '',
      password: '',
      first_name: '',
      last_name: '',
      phone: '',
      country: 'SA'
    });
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const redirectUrl = `${window.location.origin}/auth/oauth-callback`;

      // A random value we hand to Google and check again when the browser
      // comes back. Without it, an attacker could hand a victim a prepared
      // callback URL and sign them into the attacker's account.
      const state = Array.from(crypto.getRandomValues(new Uint8Array(16)))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
      sessionStorage.setItem('oauth_state', state);
      sessionStorage.setItem('oauth_redirect_uri', redirectUrl);
      sessionStorage.setItem('auth_redirect', from);

      const response = await axios.get(`${BACKEND_URL}/api/auth/oauth/google/url`, {
        params: { redirect_url: redirectUrl, state }
      });

      window.location.href = response.data.url;
    } catch (error) {
      console.error('Google OAuth error:', error);
      const detail = error.response?.data?.detail;
      setError(getAuthTranslation(detail || 'oauth_session_invalid', language));
      setLoading(false);
    }
  };

  const phoneField = (opts) => (
    <PhoneInput
      country={'sa'}
      value={formData.phone}
      onChange={(phone, country) =>
        setFormData({ ...formData, phone: '+' + phone, country: (country?.countryCode || 'sa').toUpperCase() })
      }
      inputProps={{ name: 'phone', required: opts.required, placeholder: opts.placeholder }}
      containerClass="phone-input-container"
      buttonClass="phone-input-button"
      dropdownClass="phone-input-dropdown"
      searchClass="phone-input-search"
      enableSearch={true}
      searchPlaceholder={language === 'ar' ? 'ابحث عن بلد...' : 'Search country...'}
      inputClass="phone-input-field"
    />
  );

  return (
    /* The page is its own dark stage: one warm light from above, the piece on
       one side, the form on the other. The stage uses min-height rather than a
       fixed height so a taller form (register mode, an error banner, a browser
       with large default text) pushes the page instead of being clipped. */
    <div className="auth-page">
      <div className="auth-stage">
        <div className="auth-stage__light" aria-hidden="true" />
        <div className="auth-stage__floor" aria-hidden="true" />

        <div className="auth-case">
          <JewelExhibit language={language} />

          <div className="auth-rule" aria-hidden="true" />

          <div className="auth-form">
            <div className="auth-form__kicker">
              {language === 'ar' ? 'حسابك' : 'YOUR ACCOUNT'}
            </div>
            <h1 className="auth-form__title" data-testid="auth-title">
              {getAuthTranslation(isLogin ? 'login' : 'register', language)}
            </h1>

            {error && (
              <div className="auth-alert" role="alert">
                {error}
              </div>
            )}

            {isLogin && googleEnabled && (
              <>
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="auth-oauth"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <span>{getAuthTranslation('continue_with_google', language)}</span>
                </button>

                <div className="auth-sep">{getAuthTranslation('or', language)}</div>
              </>
            )}

            {isLogin && (
              <div className="auth-seg" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={loginMethod === 'email'}
                  onClick={() => setLoginMethod('email')}
                  className={loginMethod === 'email' ? 'is-on' : ''}
                >
                  <Mail aria-hidden="true" />
                  {getAuthTranslation('email', language)}
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={loginMethod === 'phone'}
                  onClick={() => setLoginMethod('phone')}
                  className={loginMethod === 'phone' ? 'is-on' : ''}
                >
                  <Phone aria-hidden="true" />
                  {getAuthTranslation('phone', language)}
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit} className="auth-fields">
              {!isLogin && (
                <div className="auth-row2">
                  <div className="auth-field">
                    <User className="auth-field__icon" aria-hidden="true" />
                    <input
                      type="text"
                      name="first_name"
                      placeholder={getAuthTranslation('first_name', language)}
                      value={formData.first_name}
                      onChange={handleInputChange}
                      required
                      data-testid="first-name-input"
                    />
                  </div>
                  <div className="auth-field">
                    <User className="auth-field__icon" aria-hidden="true" />
                    <input
                      type="text"
                      name="last_name"
                      placeholder={getAuthTranslation('last_name', language)}
                      value={formData.last_name}
                      onChange={handleInputChange}
                      required
                      data-testid="last-name-input"
                    />
                  </div>
                </div>
              )}

              {isLogin && loginMethod === 'email' && (
                <div className="auth-field">
                  <Mail className="auth-field__icon" aria-hidden="true" />
                  <input
                    type="email"
                    name="email"
                    placeholder={getAuthTranslation('email', language)}
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    data-testid="email-input"
                  />
                </div>
              )}

              {isLogin && loginMethod === 'phone' && phoneField({ required: true })}

              {!isLogin && (
                <>
                  <div className="auth-field">
                    <Mail className="auth-field__icon" aria-hidden="true" />
                    <input
                      type="email"
                      name="email"
                      placeholder={language === 'ar' ? 'البريد الإلكتروني (اختياري)' : 'Email (optional)'}
                      value={formData.email}
                      onChange={handleInputChange}
                      data-testid="email-input"
                    />
                  </div>

                  {phoneField({
                    required: false,
                    placeholder: language === 'ar' ? 'رقم الهاتف (اختياري)' : 'Phone (optional)'
                  })}

                  <p className="auth-hint">{getAuthTranslation('email_or_phone_required', language)}</p>
                </>
              )}

              <div className="auth-field">
                <Lock className="auth-field__icon" aria-hidden="true" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  placeholder={getAuthTranslation('password', language)}
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  minLength={6}
                  data-testid="password-input"
                />
                <button
                  type="button"
                  className="auth-field__toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={
                    showPassword
                      ? (language === 'ar' ? 'إخفاء كلمة المرور' : 'Hide password')
                      : (language === 'ar' ? 'إظهار كلمة المرور' : 'Show password')
                  }
                >
                  {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                </button>
              </div>

              <div className="auth-meta">
                <label htmlFor="rememberMe">
                  <input
                    type="checkbox"
                    id="rememberMe"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  {language === 'ar' ? 'تذكّرني' : 'Remember me'}
                </label>
                {isLogin && (
                  <Link to="/forgot-password">{getAuthTranslation('forgot_password', language)}</Link>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                data-testid="auth-submit-button"
                className="auth-submit"
              >
                {loading
                  ? getAuthTranslation('loading', language)
                  : getAuthTranslation(isLogin ? 'login' : 'register', language)}
              </button>
            </form>

            <p className="auth-switch">
              {isLogin
                ? getAuthTranslation('no_account', language)
                : getAuthTranslation('have_account', language)}
              {' '}
              <button type="button" onClick={switchMode} data-testid="switch-auth-mode">
                {getAuthTranslation(isLogin ? 'register' : 'login', language)}
              </button>
            </p>

            <p className="auth-note">
              {language === 'ar' ? '🔒 بياناتك محمية ومشفّرة' : '🔒 Your data is encrypted and protected'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
