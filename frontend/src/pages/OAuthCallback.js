import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { getAuthTranslation } from '../translations/auth';
import axios from 'axios';
import { API_BASE_URL } from '../api';
import { clearOAuthStart, readOAuthStart } from '../lib/oauthState';
import { safeLocal, safeSession } from '../lib/safeStorage';

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
  // After a quiet stretch the wait gets an explanation. The backend host puts
  // an idle service to sleep and boots it on the first request — which is
  // often this very sign-in, since the storefront itself is served by the CDN.
  // A spinner that says nothing for a minute reads as "broken"; one that says
  // why reads as "starting".
  const [slow, setSlow] = useState(false);
  const BACKEND_URL = API_BASE_URL;
  // `auth` is the context object, and this effect calls auth.setUser(), which
  // re-creates it — so the effect re-ran, found the state it had already
  // consumed missing, and reported a state mismatch over a sign-in that had
  // just succeeded. The code is single-use anyway: run this exactly once.
  const ran = useRef(false);

  // The effect below runs on mount and NEVER again, so anything it needs that
  // can change is read through a ref instead of a dependency. Listing `auth`
  // and `language` as dependencies is what broke the sign-in: the auth
  // context object was rebuilt the moment the session check finished (one
  // second in, always), React tore the effect down — arming its `cancelled`
  // flag — and re-entered, where the run-once guard returned immediately.
  // Google's approval then came back to a page that had stopped listening:
  // every completion path checked `cancelled` and quietly did nothing, and
  // "Signing you in…" span forever. Fixed at the source too (the context is
  // memoised now), but this page must not depend on that to work.
  const live = useRef({ auth, language });
  live.current = { auth, language };

  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), 7000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (ran.current) return undefined;
    ran.current = true;

    let cancelled = false;

    // Whatever else goes wrong, the shopper must not be left watching a
    // spinner. Every path out of this page ends here.
    const leave = () => {
      const from = safeSession.get('auth_redirect') || '/';
      safeSession.remove('auth_redirect');
      navigate(from, { replace: true });
    };

    const fail = (key) => {
      if (cancelled) return;

      // Landing here a second time — Back, reload, a restored tab — finds the
      // single-use code and state already spent and would otherwise announce
      // "login failed" to somebody who is, in fact, signed in. If we already
      // hold a token, nothing is wrong: leave quietly.
      if (safeLocal.get('token')) {
        leave();
        return;
      }

      setStatus('error');
      setError(getAuthTranslation(key, live.current.language) || key);
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
          // axios's default timeout is none at all: a hung connection meant a
          // spinner that never ends. 90s is long enough to survive the host
          // booting a slept server, and finite enough that a real hang shows
          // the error screen instead of eternity.
          { withCredentials: true, timeout: 90000 }
        );

        const { access_token, user, needs_phone } = response.data;
        if (!access_token || !user) throw new Error('Invalid OAuth response from server');
        if (cancelled) return;

        safeLocal.set('token', access_token);
        const ctx = live.current.auth;
        if (ctx && typeof ctx.setToken === 'function') ctx.setToken(access_token);
        if (ctx && typeof ctx.setUser === 'function') ctx.setUser(user);

        safeSession.remove('oauth_provider');

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

    // processOAuthCallback already catches its own failures; this catches the
    // ones it cannot — a browser that throws on storage took the whole
    // function down mid-flight, including the handler meant to recover from it.
    // The floor under everything above. No matter which layer stalls — the
    // network, an interceptor, a promise that never settles — this page states
    // an outcome and moves on. A sign-in screen that spins past a minute and
    // a half is indistinguishable from a broken shop.
    let done = false;
    const deadline = setTimeout(() => {
      if (cancelled || done) return;
      console.error('OAuth callback exceeded its deadline');
      fail('oauth_session_invalid');
    }, 100000);

    processOAuthCallback()
      .catch((err) => {
        console.error('OAuth callback crashed:', err);
        if (!cancelled) fail('oauth_session_invalid');
      })
      .finally(() => { done = true; clearTimeout(deadline); });

    return () => { cancelled = true; clearTimeout(deadline); };
    // Deliberately empty: this must run exactly once, on mount. Everything
    // mutable is read through `live` above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
              {slow
                ? (language === 'ar'
                  ? 'يبدو أن الخادم كان خاملاً ويستيقظ الآن — قد يستغرق ذلك حتى دقيقة في المرة الأولى، ثم يصبح الدخول فورياً.'
                  : 'The server seems to have been asleep and is waking up — the first sign-in can take up to a minute, then it is instant.')
                : (language === 'ar' ? 'يرجى الانتظار' : 'Please wait')}
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
