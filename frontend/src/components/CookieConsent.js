import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { X, Cookie } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const CookieConsent = () => {
  const [showBanner, setShowBanner] = useState(false);
  const { language } = useLanguage();
  const isRTL = language === 'ar' || language === 'he';

  useEffect(() => {
    // Check if user has already consented
    const hasConsented = localStorage.getItem('cookie_consent');
    if (!hasConsented) {
      // Show banner after a short delay for better UX
      setTimeout(() => {
        setShowBanner(true);
      }, 1000);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookie_consent', 'accepted');
    localStorage.setItem('cookie_consent_date', new Date().toISOString());
    setShowBanner(false);
  };

  const handleClose = () => {
    // Allow closing without accepting (will show again next visit)
    setShowBanner(false);
  };

  if (!showBanner) return null;

  const translations = {
    ar: {
      message: 'نستخدم الكوكيز لتحسين تجربتك على موقعنا. بالاستمرار في التصفح فإنك توافق على',
      cookiesPolicy: 'استخدام الكوكيز',
      accept: 'موافق',
      learnMore: 'معرفة المزيد'
    },
    en: {
      message: 'We use cookies to enhance your experience on our website. By continuing to browse, you agree to our',
      cookiesPolicy: 'use of cookies',
      accept: 'Accept',
      learnMore: 'Learn More'
    }
  };

  const t = translations[language] || translations.en;

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-r from-amber-50 to-orange-50 border-t-2 border-brand shadow-2xl transform transition-transform duration-500 ease-out ${
        showBanner ? 'translate-y-0' : 'translate-y-full'
      }`}
      style={{
        direction: isRTL ? 'rtl' : 'ltr'
      }}
    >
      <div className="container mx-auto px-4 py-4 sm:py-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {/* Cookie Icon & Message */}
          <div className="flex items-start gap-3 flex-1">
            <Cookie className="h-6 w-6 text-brand flex-shrink-0 mt-1" />
            <div className="flex-1">
              <p className="text-sm sm:text-base text-gray-700 leading-relaxed">
                {t.message}{' '}
                <Link
                  to="/cookies-policy"
                  className="text-brand hover:text-accent font-semibold underline"
                  onClick={() => setShowBanner(false)}
                >
                  {t.cookiesPolicy}
                </Link>
                .
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Link
              to="/cookies-policy"
              onClick={() => setShowBanner(false)}
              className="text-sm text-brand hover:text-accent font-medium underline whitespace-nowrap"
            >
              {t.learnMore}
            </Link>
            
            <button
              onClick={handleAccept}
              className="btn-luxury text-sm px-6 py-2 whitespace-nowrap flex-shrink-0"
            >
              {t.accept}
            </button>

            <button
              onClick={handleClose}
              className="p-2 text-gray-500 hover:text-gray-700 transition-colors flex-shrink-0"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CookieConsent;
