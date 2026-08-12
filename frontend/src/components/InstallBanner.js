import React, { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import {
  isIos, useInstallState, triggerInstall, IosInstallGuide,
} from './InstallAppButton';

// The owner's ask, verbatim: a bar like the cookie bar that tells the visitor
// plainly to install the app, comes back on EVERY visit until they install —
// and never again after that.
//
// - Shows only when the app is genuinely installable (parked prompt) or on
//   iOS (where the guide is the only path). Installed → gone forever.
// - «لاحقاً» hides it for the current visit only (sessionStorage): the next
//   visit brings it back, exactly as requested.
// - Waits for the cookie bar to be answered first — both live at the bottom
//   edge and stacking two bars on a first visit buries them both.
const InstallBanner = () => {
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  const { installable, installed, markInstalled } = useInstallState();
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [snoozedThisVisit, setSnoozedThisVisit] = useState(() => {
    try { return sessionStorage.getItem('install_banner_snoozed') === '1'; }
    catch { return false; }
  });
  const [cookieAnswered, setCookieAnswered] = useState(() => {
    try { return Boolean(localStorage.getItem('cookie_consent')); }
    catch { return true; }
  });

  // The cookie bar writes localStorage and unmounts without an event; a
  // light poll notices the answer and lets this banner take the stage.
  useEffect(() => {
    if (cookieAnswered) return undefined;
    const timer = setInterval(() => {
      try {
        if (localStorage.getItem('cookie_consent')) setCookieAnswered(true);
      } catch { setCookieAnswered(true); }
    }, 1500);
    return () => clearInterval(timer);
  }, [cookieAnswered]);

  if (installed || snoozedThisVisit || !cookieAnswered) return null;
  if (!installable && !isIos()) return null;

  const snooze = () => {
    try { sessionStorage.setItem('install_banner_snoozed', '1'); } catch { /* private mode */ }
    setSnoozedThisVisit(true);
  };

  const handleInstall = async () => {
    const result = await triggerInstall();
    if (result === 'ios') setShowIosGuide(true);
    if (result === 'accepted') markInstalled();
  };

  return (
    <>
      <div
        data-testid="install-banner"
        dir={isRTL ? 'rtl' : 'ltr'}
        className="fixed bottom-0 inset-inline-start-0 inset-inline-end-0 left-0 right-0 z-40 bg-[#101724] text-white border-t-2 border-[#c9a24b] shadow-2xl"
      >
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <img src="/favicon.svg?v=3" alt="" className="w-10 h-10 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="font-bold text-sm sm:text-base text-[#e8cc84]">
              {isRTL ? 'ثبّت تطبيق Auraa Luxury' : 'Install the Auraa Luxury app'}
            </p>
            <p className="text-xs sm:text-sm text-gray-300">
              {isRTL
                ? 'تسوّق أسرع من شاشتك الرئيسية — يعمل على الهاتف والكمبيوتر.'
                : 'Shop faster from your home screen — works on phone and computer.'}
            </p>
          </div>
          <button
            onClick={handleInstall}
            data-testid="install-banner-cta"
            className="flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-[#c9a24b] to-[#a67c2e] hover:from-[#e8cc84] hover:to-[#c9a24b] text-[#101724] font-bold text-sm rounded-lg transition-colors whitespace-nowrap"
          >
            <Download className="h-4 w-4" />
            {isRTL ? 'ثبّت الآن' : 'Install now'}
          </button>
          <button
            onClick={snooze}
            data-testid="install-banner-later"
            aria-label={isRTL ? 'لاحقاً' : 'Later'}
            className="p-2 text-gray-400 hover:text-white transition-colors flex-shrink-0"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
      {showIosGuide && <IosInstallGuide isRTL={isRTL} onClose={() => setShowIosGuide(false)} />}
    </>
  );
};

export default InstallBanner;
