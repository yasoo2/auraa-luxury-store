import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { formatDate } from '../utils/dateUtils';

const DateConversionTest = () => {
  const { language, switchLanguage } = useLanguage();
  const [testDate, setTestDate] = useState(new Date('2024-01-15'));

  const testDates = [
    new Date('2024-01-01'),
    new Date('2024-06-15'),
    new Date('2023-12-31'),
    new Date('2025-03-20'),
    new Date() // Today
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-4">
            {language === 'ar' ? 'اختبار تحويل التاريخ' : 'Date Conversion Test'}
          </h1>
          <p className="text-gray-600 mb-4">
            {language === 'ar' 
              ? 'جميع التواريخ في المتجر تعرض بالتقويم الميلادي (Gregorian) بغض النظر عن اللغة المختارة'
              : 'All dates in the store are displayed in Gregorian calendar regardless of selected language'}
          </p>

          {/* Language Toggle */}
          <div className="flex gap-4">
            <button
              onClick={() => switchLanguage('ar')}
              className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                language === 'ar'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              العربية (Gregorian)
            </button>
            <button
              onClick={() => switchLanguage('en')}
              className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                language === 'en'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              English (Gregorian)
            </button>
          </div>

          <div className="mt-4 p-4 bg-blue-100 rounded-lg">
            <p className="font-semibold text-blue-800">
              {language === 'ar' 
                ? `اللغة الحالية: العربية - يتم عرض التواريخ بالتقويم الميلادي`
                : `Current Language: English - Dates shown in Gregorian calendar`}
            </p>
          </div>
        </div>

        {/* Test Dates */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">
            {language === 'ar' ? 'أمثلة على التواريخ المحولة' : 'Converted Date Examples'}
          </h2>

          <div className="space-y-4">
            {testDates.map((date, index) => (
              <div
                key={index}
                className="border-2 border-gray-200 rounded-xl p-6 hover:border-blue-400 transition-all"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Original Gregorian Date */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600 mb-2 font-semibold">
                      {language === 'ar' ? 'التاريخ الميلادي الأصلي:' : 'Original Gregorian Date:'}
                    </p>
                    <p className="text-lg font-bold text-gray-800">
                      {date.toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>

                  {/* Converted Date (Based on Language) */}
                  <div className={`p-4 rounded-lg ${language === 'ar' ? 'bg-green-50' : 'bg-blue-50'}`}>
                    <p className="text-sm text-gray-600 mb-2 font-semibold">
                      {language === 'ar' ? 'التاريخ الهجري المحول:' : 'Converted Date:'}
                    </p>
                    <p className="text-lg font-bold text-gray-800" dir={language === 'ar' ? 'rtl' : 'ltr'}>
                      {formatDate(date, language, { format: 'full', showCalendarType: true })}
                    </p>
                  </div>
                </div>

                {/* Additional Formats */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-600 mb-2">
                    {language === 'ar' ? 'صيغ إضافية:' : 'Additional Formats:'}
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm">
                      <strong>{language === 'ar' ? 'قصير:' : 'Short:'}</strong> {formatDate(date, language, { format: 'short' })}
                    </span>
                    <span className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm">
                      <strong>{language === 'ar' ? 'متوسط:' : 'Medium:'}</strong> {formatDate(date, language, { format: 'medium' })}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Explanation */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl shadow-xl p-8 mt-6 text-white">
          <h3 className="text-2xl font-bold mb-4">
            {language === 'ar' ? '📌 نظام التاريخ في المتجر' : '📌 Date System in Store'}
          </h3>
          <ul className="space-y-3 text-lg">
            <li className="flex items-start gap-3">
              <span className="text-2xl">✅</span>
              <span>
                {language === 'ar'
                  ? 'جميع التواريخ في المتجر تعرض بالتقويم الميلادي (Gregorian)'
                  : 'All dates in the store are displayed in Gregorian calendar'}
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-2xl">✅</span>
              <span>
                {language === 'ar'
                  ? 'لا يتم التحويل إلى التاريخ الهجري حتى عند اختيار اللغة العربية'
                  : 'No conversion to Hijri calendar even when Arabic language is selected'}
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-2xl">✅</span>
              <span>
                {language === 'ar'
                  ? 'التواريخ تعرض بصيغة مناسبة للغة المختارة (عربي أو إنجليزي)'
                  : 'Dates are displayed in format appropriate for selected language (Arabic or English)'}
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-2xl">✅</span>
              <span>
                {language === 'ar'
                  ? 'يعمل بشكل متسق في جميع صفحات التطبيق'
                  : 'Works consistently across all application pages'}
              </span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default DateConversionTest;
