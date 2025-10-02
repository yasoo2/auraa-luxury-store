import React, { useState } from 'react';
import { Globe, DollarSign, ChevronDown } from 'lucide-react';
import { Button } from './ui/button';
import { useLanguage } from '../context/LanguageContext';

const LanguageCurrencySelector = () => {
  const { language, currency, switchLanguage, switchCurrency, t } = useLanguage();
  const [showLanguages, setShowLanguages] = useState(false);
  const [showCurrencies, setShowCurrencies] = useState(false);

  const languages = [
    { code: 'ar', name: 'العربية', flag: '🇸🇦' },
    { code: 'en', name: 'English', flag: '🇺🇸' }
  ];

  const currencies = [
    { code: 'SAR', name: t('sar'), symbol: 'ر.س' },
    { code: 'USD', name: t('usd'), symbol: '$' },
    { code: 'EUR', name: t('eur'), symbol: '€' },
    { code: 'GBP', name: t('gbp'), symbol: '£' },
    { code: 'AED', name: t('aed'), symbol: 'د.إ' }
  ];

  const currentLanguage = languages.find(lang => lang.code === language);
  const currentCurrency = currencies.find(curr => curr.code === currency);

  return (
    <div className="flex items-center space-x-2">
      {/* Language Selector */}
      <div className="relative">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowLanguages(!showLanguages)}
          className="flex items-center space-x-1 hover:bg-gray-100"
        >
          <Globe className=\"h-4 w-4\" />
          <span className=\"text-sm\">{currentLanguage?.flag}</span>
          <ChevronDown className=\"h-3 w-3\" />
        </Button>
        
        {showLanguages && (
          <div className=\"absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[120px]\">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => {
                  switchLanguage(lang.code);
                  setShowLanguages(false);
                }}
                className={`w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center space-x-2 text-sm first:rounded-t-lg last:rounded-b-lg ${\n                  language === lang.code ? 'bg-amber-50 text-amber-700' : 'text-gray-700'\n                }`}
              >
                <span>{lang.flag}</span>
                <span>{lang.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Currency Selector */}
      <div className="relative">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowCurrencies(!showCurrencies)}
          className="flex items-center space-x-1 hover:bg-gray-100"
        >
          <DollarSign className=\"h-4 w-4\" />
          <span className=\"text-sm font-medium\">{currentCurrency?.symbol}</span>
          <ChevronDown className=\"h-3 w-3\" />
        </Button>
        
        {showCurrencies && (
          <div className=\"absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[140px]\">
            {currencies.map((curr) => (
              <button
                key={curr.code}
                onClick={() => {
                  switchCurrency(curr.code);
                  setShowCurrencies(false);
                }}
                className={`w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center justify-between text-sm first:rounded-t-lg last:rounded-b-lg ${\n                  currency === curr.code ? 'bg-amber-50 text-amber-700' : 'text-gray-700'\n                }`}
              >
                <span>{curr.name}</span>\n                <span className=\"font-medium\">{curr.symbol}</span>
              </button>\n            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LanguageCurrencySelector;"