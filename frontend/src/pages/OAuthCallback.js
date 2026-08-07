import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { getAuthTranslation } from '../translations/auth';
import axios from 'axios';
import { API_BASE_URL } from '../api';
import { clearOAuthStart, readOAuthStart } from '../lib/oauthState';

/**
 * Where Google sends the browser back to.
 *
 * Google returns `?code=...&state=...` in the query string (the old broker used
 * a `#fragment`, which is why this page used to read window.location.hash and
 * find nothing). The code is single-use and worthless without the client
 * secret, so it is safe for it to pass through the address bar — the exchange
 * itself happens server-side.
 */
const OAuthCallback = () => {
  const navigate = useNavigate();
  const auth = useAuth();
  const { language } = useLanguage();
  const [status, setStatus] = useState('processing');
  const [error, setError] = useState('');
  const BACKEND_URL = API_BASE_URL;
  // `auth` is the context object, and this effect calls auth.setUser(), which
  // re-creates it — so the effect re-ran, found the state it had already
  // consumed missing, and reported a state mismatch over a sign-in that had
  // just succeeded. The code is single-use anyway: run this exactly once.
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return undefined;
    ran.current = true;

    let cancelled = false;

    const leave = () => {
      const from = sessionStorage.getItem('auth_redirect') || '/';
      sessionStorage.removeItem('auth_redirect');
      navigate(from, { replace: true });
    };

    const fail = (key) => {
      if (cancelled) return;

      // Landing here a second time — Back, reload, a restored tab — finds the
      // single-use code and state already spent and would otherwise announce
      // "login failed" to somebody who is, in fact, signed in. If we already
      // hold a token, nothing is wrong: leave quietly.
      if (localStorage.getItem('token')) {
        leave();
        return;
      }

      setStatus('error');
      setError(getAuthTranslation(key, language) || key);
      setTimeout(() => navigate('/auth', { replace: true }), 4000);
    };

    const processOAuthCallback = async () => {
      const params = new URLSearchParams(window.location.search);

      // Google reports a refusal (the user pressed Cancel, the client is
      // misconfigured) here rather than by failing the redirect.
      if (params.get('error')) {
        console.error('Google returned an error:', params.get('error'));
        return fail('oauth_session_invalid');
      }

      const code = params.get('code');
      const returnedState = params.get('state');
      const started = readOAuthStart();
      const expectedState = started.state;
      const redirectUri = started.redirectUri
        || `${window.location.origin}/auth/oauth-callback`;

      if (!code) return fail('session_id_required');

      // The state we generated before leaving must come back untouched.
      if (!expectedState || returnedState !== expectedState) {
        console.error('OAuth state mismatch — refusing to complete sign-in');
        return fail('oauth_state_mismatch');
      }
      clearOAuthStart();

      try {
        const response = await axios.post(
          `${BACKEND_URL}/api/auth/oauth/google/callback`,
          { code, redirect_uri: redirectUri, provider: 'google' },
          { withCredentials: true }
        );

        const { access_token, user, needs_phone } = response.data;
        if (!access_token || !user) throw new Error('Invalid OAuth response from server');
        if (cancelled) return;

        localStorage.setItem('token', access_token);
        if (auth && typeof auth.setToken === 'function') auth.setToken(access_token);
        if (auth && typeof auth.setUser === 'function') auth.setUser(user);

        sessionStorage.removeItem('oauth_provider');

        // replace, not push: the callback URL must not stay in history, or
        // pressing Back lands the user right back on a spent authorization
        // code.
        if (needs_phone) {
          navigate('/profile?tab=profile&add_phone=true', { replace: true });
        } else {
          leave();
        }
      } catch (err) {
        console.error('OAuth processing error:', err);
        fail(err.response?.data?.detail || 'oauth_session_invalid');
      }
    };

    processOAuthCallback();
    return () => { cancelled = true; };
  }, [navigate, auth, language, BACKEND_URL]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
        {status === 'processing' && (
          <>
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-amber-600 mx-auto mb-4"></div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              {language === 'ar' ? 'جاري تسجيل الدخول...' : 'Signing you in...'}
            </h2>
            <p className="text-gray-600">
              {language === 'ar' ? 'يرجى الانتظار' : 'Please wait'}
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              {language === 'ar' ? 'فشل تسجيل الدخول' : 'Login Failed'}
            </h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <p className="text-sm text-gray-500">
              {language === 'ar' ? 'جاري إعادة التوجيه...' : 'Redirecting...'}
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default OAuthCallback;
