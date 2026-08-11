import React, { useEffect, useState } from 'react';
import { Download, Share, X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

// The install machinery, shared by the navbar/drawer button and the bottom
// banner. One rule everywhere, no "phone or computer?" question ever: the
// browser's native installer is summoned and IT knows the device.
// - Chrome/Edge/Android: beforeinstallprompt is parked on window by index.js.
// - iOS Safari never fires it, so the trigger opens a two-step guide
//   (Share → Add to Home Screen) — the only path Apple allows.
// - Installed (standalone display or appinstalled) → nothing renders, ever.

export const isIos = () =>
  typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent);

export const isStandalone = () =>
  (typeof window !== 'undefined'
    && window.matchMedia && window.matchMedia('(display-mode: standalone)').matches)
  || (typeof navigator !== 'undefined' && navigator.standalone === true);

export const useInstallState = () => {
  const [installable, setInstallable] = useState(
    () => typeof window !== 'undefined' && Boolean(window.__auraaInstallPrompt)
  );
  const [installed, setInstalled] = useState(isStandalone);

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

  return { installable, installed, markInstalled: () => setInstalled(true) };
};

// Returns 'accepted' | 'dismissed' | 'ios' (guide needed) | null (nothing to do).
export const triggerInstall = async () => {
  const prompt = typeof window !== 'undefined' ? window.__auraaInstallPrompt : null;
  if (!prompt) return isIos() ? 'ios' : null;
  prompt.prompt();
  try {
    const choice = await prompt.userChoice;
    return choice && choice.outcome === 'accepted' ? 'accepted' : 'dismissed';
  } finally {
    // A parked prompt is single-use; the browser hands out a fresh one
    // if the visitor declines and becomes eligible again.
    window.__auraaInstallPrompt = null;
  }
};

export const IosInstallGuide = ({ isRTL, onClose }) => (
  <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-[300] p-4" onClick={onClose}>
    <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-5" onClick={(e) => e.stopPropagation()} dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-gray-900">📲 {isRTL ? 'ثبّت التطبيق' : 'Install app'}</h3>
        <button onClick={onClose} aria-label={isRTL ? 'إغلاق' : 'Close'} className="p-1 text-gray-500 hover:text-gray-800">
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
);

const InstallAppButton = ({ variant = 'navbar', onDone }) => {
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  const { installable, installed, markInstalled } = useInstallState();
  const [showIosGuide, setShowIosGuide] = useState(false);

  if (installed) return null;
  if (!installable && !isIos()) return null;

  const label = isRTL ? 'ثبّت التطبيق' : 'Install app';

  const handleClick = async () => {
    const result = await triggerInstall();
    if (result === 'ios') setShowIosGuide(true);
    if (result === 'accepted') {
      markInstalled();
      if (onDone) onDone();
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
      aria-label={label}
      title={label}
      className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-amber-800 bg-amber-100 hover:bg-amber-200 rounded-full transition-colors whitespace-nowrap"
    >
      <Download className="h-4 w-4" />
      {/* The label spells itself out only where the row has real room;
          elsewhere the pill is icon-only and the banner carries the words. */}
      <span className="hidden 2xl:inline">{label}</span>
    </button>
  );

  return (
    <>
      {button}
      {showIosGuide && <IosInstallGuide isRTL={isRTL} onClose={() => setShowIosGuide(false)} />}
    </>
  );
};

export default InstallAppButton;
