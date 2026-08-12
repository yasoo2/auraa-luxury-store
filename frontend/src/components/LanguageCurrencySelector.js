import React, { useState, useEffect, useRef } from 'react';
import { Globe, DollarSign, ChevronDown } from 'lucide-react';
import { Button } from './ui/button';
import { useLanguage } from '../context/LanguageContext';

const LanguageCurrencySelector = () => {
  const { language, currency, switchLanguage, switchCurrency, languages, currencies } = useLanguage();
  const [showLanguages, setShowLanguages] = useState(false);
  const [showCurrencies, setShowCurrencies] = useState(false);
  const languageRef = useRef(null);
  const currencyRef = useRef(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (languageRef.current && !languageRef.current.contains(event.target)) {
        setShowLanguages(false);
      }
      if (currencyRef.current && !currencyRef.current.contains(event.target)) {
        setShowCurrencies(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

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

  // Both menus anchor with `start-0` (a logical edge), not `left-0`. Inside
  // the RTL mobile drawer the trigger sits by the right screen edge; a menu
  // pinned by its LEFT corner grew rightward off-screen, and the drawer
  // answered with a horizontal scroll that clipped its own edges — exactly
  // what the owner photographed on a Fold's narrow cover display.
  return (
    <div className="flex items-center gap-2">
      {/* The two triggers read their colour from the bar they sit on
          (--nav-fg), and fall back to `inherit` anywhere else — this
          control is also used off the header. The hover was
          bg-gray-100, a near-white wash that on the dark bar flashed
          a pale block under the icon. */}
      <div className="relative" ref={languageRef}>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setShowLanguages(!showLanguages);
            setShowCurrencies(false); // Close currency dropdown when opening language
          }}
          data-testid="language-toggle"
          className="flex items-center gap-1 text-[color:var(--nav-fg,inherit)] hover:bg-white/10 hover:text-[color:var(--nav-fg,inherit)]"
        >
          <Globe className="h-4 w-4" />
          <span className="text-sm">{currentLanguage?.flag}</span>
          <ChevronDown className="h-3 w-3" />
        </Button>

        {showLanguages && (
          <div data-testid="language-menu" className="absolute top-full start-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[140px] max-w-[calc(100vw-1rem)] max-h-[300px] overflow-y-auto" style={{ backgroundColor: 'white', opacity: 1, backdropFilter: 'none' }}>
            {languagesList.map((lang) => (
              <button
                key={lang.code}
                onClick={() => {
                  switchLanguage(lang.code);
                  setShowLanguages(false);
                }}
                className={`w-full px-3 py-2 text-start hover:bg-gray-50 flex items-center gap-2 text-sm first:rounded-t-lg last:rounded-b-lg ${
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

      <div className="relative" ref={currencyRef}>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setShowCurrencies(!showCurrencies);
            setShowLanguages(false); // Close language dropdown when opening currency
          }}
          data-testid="currency-toggle"
          className="flex items-center gap-1 text-[color:var(--nav-fg,inherit)] hover:bg-white/10 hover:text-[color:var(--nav-fg,inherit)]"
        >
          <DollarSign className="h-4 w-4" />
          <span data-testid="currency-toggle-symbol" className="text-sm font-medium">{currentCurrency?.symbol}</span>
          <ChevronDown className="h-3 w-3" />
        </Button>
        
        {showCurrencies && (
          /* max-h + overflow, same as the language list above. This one was
             missing both: 22 currencies rendered as an unscrollable column
             running past the bottom of the screen, so everything below the
             fold — including the lira the shop's own owner went hunting for —
             could not be reached at all. */
          <div data-testid="currency-menu" className="absolute top-full start-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[160px] max-w-[calc(100vw-1rem)] max-h-[300px] overflow-y-auto" style={{ backgroundColor: 'white', opacity: 1, backdropFilter: 'none' }}>
            {currenciesList.map((curr) => (
              <button
                key={curr.code}
                data-testid={`currency-option-${curr.code}`}
                onClick={() => {
                  switchCurrency(curr.code);
                  setShowCurrencies(false);
                }}
                className={`w-full px-3 py-2 text-start hover:bg-gray-50 flex items-center justify-between text-sm first:rounded-t-lg last:rounded-b-lg ${
                  currency === curr.code ? 'bg-amber-50 text-amber-700' : 'text-gray-700'
                }`}
              >
                <span>{language === 'ar' ? curr.name_ar : curr.name_en}</span>
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