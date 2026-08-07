// Centralized feature flags (frontend)
// Reads both REACT_APP_* (Vercel) and plain names (fallback) to be robust
// `readBool(x) || true` is always true, which silently pinned seven flags on
// and made their env vars dead. Defaults belong here instead.
const readBool = (name, fallback = false) => {
  const v = process.env[`REACT_APP_${name}`] ?? process.env[name];
  if (v === undefined || v === null || v === '') return fallback;
  const s = String(v).toLowerCase();
  if (s === 'true' || s === '1') return true;
  if (s === 'false' || s === '0') return false;
  return fallback;
};

export const FLAGS = {
  I18N: readBool('FEATURE_I18N'),
  IMG_OPT: readBool('FEATURE_IMG_OPT'),
  LOGO_BOTTOM_RIGHT: readBool('FEATURE_LOGO_BOTTOM_RIGHT'),
  ANALYTICS: readBool('FEATURE_ANALYTICS'),
  MULTI_LANG_EXTENDED: readBool('FEATURE_MULTI_LANG_EXTENDED', true), // Default ON
  GCC_CURRENCIES: readBool('FEATURE_GCC_CURRENCIES', true), // Default ON
  IMG_NO_CROP: readBool('FEATURE_IMG_NO_CROP', true), // Default ON
  // Phase 1: Admin Suite MVP
  ADMIN: readBool('FEATURE_ADMIN', true), // Admin Dashboard
  BULK_IMPORT: readBool('FEATURE_BULK_IMPORT', true), // CSV Import
  // Additional Features
  PWA_SUPPORT: readBool('FEATURE_PWA_SUPPORT', true), // PWA Support
  LIVE_CHAT: readBool('FEATURE_LIVE_CHAT', true), // Live Chat
};

// Named exports for convenience
export const FEATURE_MULTI_LANG_EXTENDED = FLAGS.MULTI_LANG_EXTENDED;
export const FEATURE_PWA_SUPPORT = FLAGS.PWA_SUPPORT;
export const FEATURE_LIVE_CHAT = FLAGS.LIVE_CHAT;

export default FLAGS;