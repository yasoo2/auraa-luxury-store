import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { X, Cookie } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const CookieConsent = () => {
  const [showBanner, setShowBanner] = useState(false);
  const bannerRef = useRef(null);
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

  // The banner is fixed to the bottom, so without reserving space for it, it
  // sits on top of whatever is there — on /auth that was the submit button
  // itself, which made login unclickable. Pad the page by the banner's real
  // height (it wraps to two lines on narrow screens) while it is visible.
  useEffect(() => {
    const root = document.documentElement;

    const clear = () => {
      root.style.removeProperty('--cookie-banner-h');
      document.body.style.removeProperty('padding-bottom');
    };

    if (!showBanner) {
      clear();
      return undefined;
    }

    const publishHeight = () => {
      const height = bannerRef.current?.offsetHeight || 0;
      // Padding keeps normal document flow clear of the banner. The variable
      // additionally lets full-height centred layouts (the auth card centres
      // inside min-h-screen) shrink, so they are not covered at first paint.
      document.body.style.paddingBottom = `${height}px`;
      root.style.setProperty('--cookie-banner-h', `${height}px`);
    };

    publishHeight();

    const observer = new ResizeObserver(publishHeight);
    if (bannerRef.current) observer.observe(bannerRef.current);
    window.addEventListener('resize', publishHeight);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', publishHeight);
      clear();
    };
  }, [showBanner]);

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
      ref={bannerRef}
      role="dialog"
      aria-label={t.message}
      className={`fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-r from-amber-50 to-orange-50 border-t-2 border-brand shadow-2xl transform transition-transform duration-500 ease-out ${
        showBanner ? 'translate-y-0' : 'translate-y-full'
      }`}
      style={{
        direction: isRTL ? 'rtl' : 'ltr'
      }}
    >
      <div className="container mx-auto px-4 py-3 sm:py-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
          {/* Cookie Icon & Message */}
          <div className="flex items-start gap-3 flex-1">
            <Cookie className="h-5 w-5 sm:h-6 sm:w-6 text-brand flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs sm:text-base text-gray-700 leading-snug sm:leading-relaxed">
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
