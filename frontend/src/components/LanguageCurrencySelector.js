import React, { useState } from 'react';
import { Globe, DollarSign, ChevronDown } from 'lucide-react';
import { Button } from './ui/button';
import { useLanguage } from '../context/LanguageContext';
import FLAGS from '../config/flags';

const LanguageCurrencySelector = () => {
  const { language, currency, switchLanguage, switchCurrency, languages, currencies } = useLanguage();
  const [showLanguages, setShowLanguages] = useState(false);
  const [showCurrencies, setShowCurrencies] = useState(false);

  // Convert languages object to array
  const languagesList = Object.entries(languages).map(([code, info]) => ({
    code,
    ...info
  }));

  // Convert currencies object to array
  const currenciesList = Object.entries(currencies).map(([code, info]) => ({
    code,
    ...info
  }));

  const currentLanguage = languagesList.find(lang => lang.code === language);
  const currentCurrency = currenciesList.find(curr => curr.code === currency);

  return (
    <div className="flex items-center space-x-2">
      <div className="relative">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowLanguages(!showLanguages)}
          className="flex items-center space-x-1 hover:bg-gray-100"
        >
          <Globe className="h-4 w-4" />
          <span className="text-sm">{currentLanguage?.flag}</span>
          <ChevronDown className="h-3 w-3" />
        </Button>
        
        {showLanguages && (
          <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[120px]">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => {
                  switchLanguage(lang.code);
                  setShowLanguages(false);
                }}
                className={`w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center space-x-2 text-sm first:rounded-t-lg last:rounded-b-lg ${
                  language === lang.code ? 'bg-amber-50 text-amber-700' : 'text-gray-700'
                }`}
              >
                <span>{lang.flag}</span>
                <span>{lang.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="relative">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowCurrencies(!showCurrencies)}
          className="flex items-center space-x-1 hover:bg-gray-100"
        >
          <DollarSign className="h-4 w-4" />
          <span className="text-sm font-medium">{currentCurrency?.symbol}</span>
          <ChevronDown className="h-3 w-3" />
        </Button>
        
        {showCurrencies && (
          <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[140px]">
            {currencies.map((curr) => (
              <button
                key={curr.code}
                onClick={() => {
                  switchCurrency(curr.code);
                  setShowCurrencies(false);
                }}
                className={`w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center justify-between text-sm first:rounded-t-lg last:rounded-b-lg ${
                  currency === curr.code ? 'bg-amber-50 text-amber-700' : 'text-gray-700'
                }`}
              >
                <span>{curr.name}</span>
                <span className="font-medium">{curr.symbol}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LanguageCurrencySelector;