import React, { useEffect, useState } from 'react';
import { Download, Share, X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

// The install corner. One button, no "phone or computer?" question ever:
// the browser's native installer is summoned and IT knows the device.
// - Chrome/Edge/Android: beforeinstallprompt is parked on window by index.js;
//   clicking calls prompt() and the OS takes over.
// - iOS Safari never fires that event, so the button opens a two-step guide
//   (Share → Add to Home Screen) — the only path Apple allows.
// - Already installed (standalone display or appinstalled) → renders nothing.
const isIos = () =>
  typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent);

const isStandalone = () =>
  (typeof window !== 'undefined'
    && window.matchMedia && window.matchMedia('(display-mode: standalone)').matches)
  || (typeof navigator !== 'undefined' && navigator.standalone === true);

const InstallAppButton = ({ variant = 'navbar', onDone }) => {
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  const [installable, setInstallable] = useState(
    () => typeof window !== 'undefined' && Boolean(window.__auraaInstallPrompt)
  );
  const [installed, setInstalled] = useState(isStandalone);
  const [showIosGuide, setShowIosGuide] = useState(false);

  useEffect(() => {
    const onInstallable = () => setInstallable(true);
    const onInstalled = () => setInstalled(true);
    window.addEventListener('auraa-installable', onInstallable);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('auraa-installable', onInstallable);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (installed) return null;
  const ios = isIos();
  if (!installable && !ios) return null;

  const label = isRTL ? 'ثبّت التطبيق' : 'Install app';

  const handleClick = async () => {
    if (ios && !window.__auraaInstallPrompt) {
      setShowIosGuide(true);
      return;
    }
    const prompt = window.__auraaInstallPrompt;
    if (!prompt) return;
    prompt.prompt();
    try {
      const choice = await prompt.userChoice;
      if (choice && choice.outcome === 'accepted') {
        setInstalled(true);
        if (onDone) onDone();
      }
    } finally {
      // A parked prompt is single-use; the browser hands out a fresh one
      // if the visitor declines and becomes eligible again.
      window.__auraaInstallPrompt = null;
    }
  };

  const button = variant === 'drawer' ? (
    <button
      onClick={handleClick}
      data-testid="install-app"
      className="flex items-center w-full px-3 py-3 text-base font-medium text-amber-800 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors"
    >
      <Download className="h-5 w-5 me-2" />
      📲 {label}
    </button>
  ) : (
    <button
      onClick={handleClick}
      data-testid="install-app"
      className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-amber-800 bg-amber-100 hover:bg-amber-200 rounded-full transition-colors whitespace-nowrap"
    >
      <Download className="h-4 w-4" />
      {label}
    </button>
  );

  return (
    <>
      {button}
      {showIosGuide && (
        <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-[300] p-4" onClick={() => setShowIosGuide(false)}>
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-5" onClick={(e) => e.stopPropagation()} dir={isRTL ? 'rtl' : 'ltr'}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-gray-900">📲 {label}</h3>
              <button onClick={() => setShowIosGuide(false)} aria-label={isRTL ? 'إغلاق' : 'Close'} className="p-1 text-gray-500 hover:text-gray-800">
                <X className="h-5 w-5" />
              </button>
            </div>
            <ol className="space-y-3 text-sm text-gray-700">
              <li className="flex items-center gap-2">
                <span className="font-bold">1.</span>
                <Share className="h-4 w-4 text-blue-600" />
                {isRTL ? 'اضغط زر «مشاركة» في شريط سفاري' : 'Tap the Share button in Safari'}
              </li>
              <li className="flex items-center gap-2">
                <span className="font-bold">2.</span>
                <span>➕</span>
                {isRTL ? 'اختر «إضافة إلى الصفحة الرئيسية»' : 'Choose “Add to Home Screen”'}
              </li>
            </ol>
          </div>
        </div>
      )}
    </>
  );
};

export default InstallAppButton;
