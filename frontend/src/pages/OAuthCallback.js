import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { getAuthTranslation } from '../translations/auth';
import axios from 'axios';

const OAuthCallback = () => {
  const navigate = useNavigate();
  const { setUser, setToken } = useAuth();
  const { language } = useLanguage();
  const [status, setStatus] = useState('processing');
  const [error, setError] = useState('');
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

  useEffect(() => {
    const processOAuthCallback = async () => {
      try {
        // Get session_id from URL fragment
        const fragment = window.location.hash.substring(1);
        const params = new URLSearchParams(fragment);
        const sessionId = params.get('session_id');
        
        if (!sessionId) {
          setStatus('error');
          setError(getAuthTranslation('session_id_required', language));
          setTimeout(() => navigate('/auth'), 3000);
          return;
        }
        
        // Get provider from session storage
        const provider = sessionStorage.getItem('oauth_provider') || 'google';
        
        // Process OAuth session with backend
        const response = await axios.post(
          `${BACKEND_URL}/api/auth/oauth/session`,
          { 
            session_id: sessionId,
            provider: provider
          }
        );
        
        const { access_token, user, needs_phone } = response.data;
        
        // Store token and user
        localStorage.setItem('token', access_token);
        setToken(access_token);
        setUser(user);
        
        // Clean up
        sessionStorage.removeItem('oauth_provider');
        
        // Check if phone number is needed
        if (needs_phone) {
          // Redirect to phone collection
          navigate('/profile?tab=profile&add_phone=true');
        } else {
          // Success - redirect to home or intended destination
          const from = sessionStorage.getItem('auth_redirect') || '/';
          sessionStorage.removeItem('auth_redirect');
          navigate(from);
        }
      } catch (error) {
        console.error('OAuth processing error:', error);
        setStatus('error');
        const errorMsg = error.response?.data?.detail || 'oauth_session_invalid';
        setError(getAuthTranslation(errorMsg, language));
        
        // Redirect to login after 3 seconds
        setTimeout(() => navigate('/auth'), 3000);
      }
    };

    processOAuthCallback();
  }, [navigate, setUser, setToken, language, BACKEND_URL]);

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
