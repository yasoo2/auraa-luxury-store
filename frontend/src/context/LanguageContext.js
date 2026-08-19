import React, { createContext, useContext, useState, useEffect } from 'react';

const LanguageContext = createContext();

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

// Supported languages with RTL detection (as requested)
const LANGUAGES = {
  ar: { name: 'العربية', dir: 'rtl', flag: '🇸🇦' },
  en: { name: 'English', dir: 'ltr', flag: '🇬🇧' },
  tr: { name: 'Türkçe', dir: 'ltr', flag: '🇹🇷' },
  hi: { name: 'हिन्दी', dir: 'ltr', flag: '🇮🇳' },
  es: { name: 'Español', dir: 'ltr', flag: '🇪🇸' },
  fr: { name: 'Français', dir: 'ltr', flag: '🇫🇷' },
  ru: { name: 'Русский', dir: 'ltr', flag: '🇷🇺' },
  de: { name: 'Deutsch', dir: 'ltr', flag: '🇩🇪' }
};

const DEFAULT_LANGUAGE = 'en';

/**
 * The stored choice, but only if the shop still offers it.
 *
 * A language removed from the list above does not disappear from the browsers
 * that already chose it: the code read `localStorage.getItem('language')` and
 * trusted it, so a visitor left holding a retired code would have kept it
 * forever — `LANGUAGES[language]` undefined, the text direction silently
 * falling back to ltr on what may be an rtl language, `<html lang>` set to a
 * language nothing renders, and no way back except clearing site data.
 *
 * Reading it through the list closes that: an unknown code is dropped and the
 * visitor lands on the default, which is also what a fresh visitor gets.
 */
const storedLanguage = () => {
  try {
    const saved = localStorage.getItem('language');
    return LANGUAGES[saved] ? saved : DEFAULT_LANGUAGE;
  } catch {
    // Storage can be blocked outright; the shop still has to open.
    return DEFAULT_LANGUAGE;
  }
};

// Global Currencies with proper decimal places
const CURRENCIES = {
  // GCC Currencies
  USD: { symbol: '$', decimals: 2, name_en: 'US Dollar', name_ar: 'دولار أمريكي' },
  SAR: { symbol: 'ر.س', decimals: 2, name_en: 'Saudi Riyal', name_ar: 'ريال سعودي' },
  AED: { symbol: 'د.إ', decimals: 2, name_en: 'UAE Dirham', name_ar: 'درهم إماراتي' },
  QAR: { symbol: 'ر.ق', decimals: 2, name_en: 'Qatari Riyal', name_ar: 'ريال قطري' },
  KWD: { symbol: 'د.ك', decimals: 3, name_en: 'Kuwaiti Dinar', name_ar: 'دينار كويتي' },
  BHD: { symbol: 'د.ب', decimals: 3, name_en: 'Bahraini Dinar', name_ar: 'دينار بحريني' },
  OMR: { symbol: 'ر.ع', decimals: 3, name_en: 'Omani Rial', name_ar: 'ريال عماني' },
  
  // Major Global Currencies
  EUR: { symbol: '€', decimals: 2, name_en: 'Euro', name_ar: 'يورو' },
  GBP: { symbol: '£', decimals: 2, name_en: 'British Pound', name_ar: 'جنيه إسترليني' },
  JPY: { symbol: '¥', decimals: 0, name_en: 'Japanese Yen', name_ar: 'ين ياباني' },
  CAD: { symbol: 'C$', decimals: 2, name_en: 'Canadian Dollar', name_ar: 'دولار كندي' },
  AUD: { symbol: 'A$', decimals: 2, name_en: 'Australian Dollar', name_ar: 'دولار أسترالي' },
  CHF: { symbol: 'CHF', decimals: 2, name_en: 'Swiss Franc', name_ar: 'فرنك سويسري' },
  
  // Asian Currencies
  CNY: { symbol: '¥', decimals: 2, name_en: 'Chinese Yuan', name_ar: 'يوان صيني' },
  INR: { symbol: '₹', decimals: 2, name_en: 'Indian Rupee', name_ar: 'روبية هندية' },
  KRW: { symbol: '₩', decimals: 0, name_en: 'South Korean Won', name_ar: 'وون كوري جنوبي' },
  SGD: { symbol: 'S$', decimals: 2, name_en: 'Singapore Dollar', name_ar: 'دولار سنغافوري' },
  HKD: { symbol: 'HK$', decimals: 2, name_en: 'Hong Kong Dollar', name_ar: 'دولار هونغ كونغ' },
  
  // Other Regional Currencies
  TRY: { symbol: '₺', decimals: 2, name_en: 'Turkish Lira', name_ar: 'ليرة تركية' },
  EGP: { symbol: 'ج.م', decimals: 2, name_en: 'Egyptian Pound', name_ar: 'جنيه مصري' },
  JOD: { symbol: 'د.أ', decimals: 3, name_en: 'Jordanian Dinar', name_ar: 'دينار أردني' },
  LBP: { symbol: 'ل.ل', decimals: 2, name_en: 'Lebanese Pound', name_ar: 'ليرة لبنانية' }
};

// Minimal translations for t(key) fallback (extended later)
const translations = {
  ar: { language: 'اللغة', currency: 'العملة' },
  en: { language: 'Language', currency: 'Currency' },
  tr: { language: 'Dil', currency: 'Para Birimi' },
  hi: { language: 'भाषा', currency: 'मुद्रा' },
  es: { language: 'Idioma', currency: 'Moneda' },
  fr: { language: 'Langue', currency: 'Devise' },
  ru: { language: 'Язык', currency: 'Валюта' },
  de: { language: 'Sprache', currency: 'Währung' }
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    // English for first-time visitors — the owner's call for a storefront
    // selling worldwide. A visitor's own choice persists and always wins,
    // for as long as the shop still offers it.
    return storedLanguage();
  });
  
  const [currency, setCurrency] = useState(() => {
    return localStorage.getItem('currency') || 'SAR';
  });

  const [exchangeRates, setExchangeRates] = useState({ USD: 1 });
  // Distinguishes "the rates have not arrived" from "the rate is zero".
  const [ratesReady, setRatesReady] = useState(false);

  // Fetch exchange rates from backend API (server-based as requested)
  useEffect(() => {
    const fetchExchangeRates = async () => {
      try {
        const { apiGet } = await import('../api');
        const data = await apiGet('/api/auto-update/currency-rates');
        const rates = data?.rates || {};
        setExchangeRates({ USD: 1, ...rates });
        setRatesReady(Boolean(rates && Object.keys(rates).length));
      } catch (error) {
        console.error('Failed to fetch currency rates from server:', error);
        // keep previous rates; backend job will refresh later
      }
    };

    fetchExchangeRates();
    const interval = setInterval(fetchExchangeRates, 3600000); // refresh hourly
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    localStorage.setItem('language', language);
    const dir = LANGUAGES[language]?.dir || 'ltr';
    document.documentElement.dir = dir;
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    localStorage.setItem('currency', currency);
  }, [currency]);

  const t = (key) => {
    return translations[language]?.[key] || translations['en']?.[key] || key;
  };

  // Convert from USD to selected currency for display
  const formatPriceFromUSD = (priceInUSD) => {
    // Same rule as convert(): never print a zero we did not compute.
    if (typeof priceInUSD !== 'number' || !exchangeRates[currency]) return null;
    const currencyInfo = CURRENCIES[currency];
    const convertedPrice = priceInUSD * exchangeRates[currency];
    const formattedPrice = convertedPrice.toFixed(currencyInfo.decimals);
    return `${formattedPrice} ${currencyInfo.symbol}`;
  };

  /**
   * Convert between currencies, or return null when it cannot be done.
   *
   * This used to return 0 whenever a rate was missing — before the rates
   * finished loading, or when the endpoint failed. A price of zero is not a
   * missing price, it is a wrong one, and it looks entirely real: the admin
   * catalogue showed every product at "$US 0.00". Callers must decide what to
   * show when the answer is unknown; they can no longer be handed a fiction.
   */
  /**
   * Render an amount stored in the store's base currency (SAR) for display.
   *
   * Every price on the storefront used to be printed as `{price} ر.س`, with
   * the symbol hardcoded and no conversion at all — so the currency switcher
   * in the header changed the symbol on nothing and moved no number. Prices
   * are stored in SAR; this converts, and when the rate is unknown it says SAR
   * rather than dressing a riyal figure up as dollars.
   */
  const formatMoney = (amountInSAR) => {
    const sar = Number(amountInSAR);
    if (!Number.isFinite(sar)) return '';
    const value = currency === 'SAR' ? sar : convert(sar, 'SAR', currency);
    const code = value === null ? 'SAR' : currency;
    const shown = value === null ? sar : value;
    const info = CURRENCIES[code] || CURRENCIES.SAR;
    // Whole numbers in EVERY currency, rounded up — the owner's rule. The
    // stored riyal prices are already whole, but converting to the shopper's
    // currency regrew fractions in the display: 216 SAR read as $57.60.
    return `${Math.ceil(shown)} ${info?.symbol || code}`;
  };

  const convert = (amount, fromCurrency, toCurrency) => {
    if (typeof amount !== 'number' || Number.isNaN(amount)) return null;
    if (fromCurrency === toCurrency) return amount;
    const from = exchangeRates[fromCurrency];
    const to = exchangeRates[toCurrency];
    if (!from || !to) return null;
    // Rates are quoted against USD.
    const amountInUSD = fromCurrency === 'USD' ? amount : amount / from;
    return toCurrency === 'USD' ? amountInUSD : amountInUSD * to;
  };

  const switchLanguage = (newLanguage) => {
    if (LANGUAGES[newLanguage]) {
      setLanguage(newLanguage);
    }
  };

  const switchCurrency = (newCurrency) => {
    if (CURRENCIES[newCurrency]) {
      setCurrency(newCurrency);
    }
  };

  const value = {
    language,
    currency,
    t,
    formatPriceFromUSD,
    convert,
    switchLanguage,
    switchCurrency,
    languages: LANGUAGES,
    currencies: CURRENCIES,
    exchangeRates,
    ratesReady,
    formatMoney,
    isRTL: LANGUAGES[language]?.dir === 'rtl'
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};
