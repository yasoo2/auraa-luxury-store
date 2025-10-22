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
  he: { name: 'עברית', dir: 'rtl', flag: '🇮🇱' },
  es: { name: 'Español', dir: 'ltr', flag: '🇪🇸' },
  fr: { name: 'Français', dir: 'ltr', flag: '🇫🇷' },
  ru: { name: 'Русский', dir: 'ltr', flag: '🇷🇺' },
  de: { name: 'Deutsch', dir: 'ltr', flag: '🇩🇪' }
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
  he: { language: 'שפה', currency: 'מטבע' },
  es: { language: 'Idioma', currency: 'Moneda' },
  fr: { language: 'Langue', currency: 'Devise' },
  ru: { language: 'Язык', currency: 'Валюта' },
  de: { language: 'Sprache', currency: 'Währung' }
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('language') || 'ar';
  });
  
  const [currency, setCurrency] = useState(() => {
    return localStorage.getItem('currency') || 'SAR';
  });

  const [exchangeRates, setExchangeRates] = useState({ USD: 1 });

  // Fetch exchange rates from backend API (server-based as requested)
  useEffect(() => {
    const fetchExchangeRates = async () => {
      try {
        const { apiGet } = await import('../api');
        const data = await apiGet('/api/auto-update/currency-rates');
        const rates = data?.rates || {};
        setExchangeRates({ USD: 1, ...rates });
      } catch (error) {
        console.error('Failed to fetch currency rates from server:', error);
        // keep previous rates; backend job will refresh later
      }
    };

    fetchExchangeRates();
    const interval = setInterval(fetchExchangeRates, 3600000); // refresh hourly
    return () => clearInterval(interval);
  }, [BACKEND_URL]);

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
    if (!priceInUSD || !exchangeRates[currency]) return `0 ${CURRENCIES[currency]?.symbol || ''}`;
    const currencyInfo = CURRENCIES[currency];
    const convertedPrice = priceInUSD * exchangeRates[currency];
    const formattedPrice = convertedPrice.toFixed(currencyInfo.decimals);
    return `${formattedPrice} ${currencyInfo.symbol}`;
  };

  const convert = (amount, fromCurrency, toCurrency) => {
    if (!amount || !exchangeRates[fromCurrency] || !exchangeRates[toCurrency]) return 0;
    // amount is in fromCurrency relative to USD rates table
    const amountInUSD = fromCurrency === 'USD' ? amount : (amount / exchangeRates[fromCurrency]);
    const result = toCurrency === 'USD' ? amountInUSD : (amountInUSD * exchangeRates[toCurrency]);
    return result;
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
    isRTL: LANGUAGES[language]?.dir === 'rtl'
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};
