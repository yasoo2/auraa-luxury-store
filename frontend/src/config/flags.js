// Centralized feature flags (frontend)
// Reads both REACT_APP_* (Vercel) and plain names (fallback) to be robust
const readBool = (name) => {
  const v = process.env[`REACT_APP_${name}`] ?? process.env[name];
  if (v === undefined || v === null) return false;
  return String(v).toLowerCase() === 'true' || String(v) === '1';
};

export const FLAGS = {
  I18N: readBool('FEATURE_I18N'),
  IMG_OPT: readBool('FEATURE_IMG_OPT'),
  LOGO_BOTTOM_RIGHT: readBool('FEATURE_LOGO_BOTTOM_RIGHT'),
  ANALYTICS: readBool('FEATURE_ANALYTICS'),
  MULTI_LANG_EXTENDED: readBool('FEATURE_MULTI_LANG_EXTENDED') || true, // Default ON
  GCC_CURRENCIES: readBool('FEATURE_GCC_CURRENCIES') || true, // Default ON
  IMG_NO_CROP: readBool('FEATURE_IMG_NO_CROP') || true, // Default ON
};

export default FLAGS;