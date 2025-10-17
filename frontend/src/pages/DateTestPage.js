import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { formatDate, getRelativeTime } from '../utils/dateUtils';
import { Calendar, Clock, Globe } from 'lucide-react';

const DateTestPage = () => {
  const { language } = useLanguage();
  const isRTL = language === 'ar';

  // Test dates
  const testDates = [
    new Date('2024-01-15'),
    new Date('2024-10-17'),
    new Date('2023-05-20'),
    new Date(),
  ];

  return (
    <div className={`min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 p-8 ${isRTL ? 'rtl' : 'ltr'}`}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Calendar className="h-8 w-8 text-amber-600" />
            <h1 className="text-3xl font-bold text-gray-800">
              {isRTL ? 'اختبار تحويل التواريخ' : 'Date Conversion Test'}
            </h1>
          </div>
          <p className="text-gray-600">
            {isRTL 
              ? 'عربي = هجري | إنجليزي = ميلادي'
              : 'Arabic = Hijri | English = Gregorian'
            }
          </p>
        </div>

        {/* Current Language Info */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl p-6 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Globe className="h-5 w-5" />
            <span className="font-semibold">
              {isRTL ? 'اللغة الحالية:' : 'Current Language:'}
            </span>
          </div>
          <p className="text-2xl font-bold">
            {language === 'ar' ? 'العربية (التقويم الهجري)' : 'English (Gregorian Calendar)'}
          </p>
        </div>

        {/* Test Dates */}
        <div className="space-y-4">
          {testDates.map((date, index) => (
            <div key={index} className="bg-white rounded-xl shadow-lg p-6">
              <div className="grid md:grid-cols-2 gap-6">
                {/* Full Format */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 mb-2">
                    {isRTL ? 'التنسيق الكامل' : 'Full Format'}
                  </h3>
                  <p className="text-xl font-bold text-gray-800">
                    {formatDate(date, language, { format: 'full', showCalendarType: true })}
                  </p>
                </div>

                {/* Medium Format */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 mb-2">
                    {isRTL ? 'التنسيق المتوسط' : 'Medium Format'}
                  </h3>
                  <p className="text-xl font-bold text-gray-800">
                    {formatDate(date, language, { format: 'medium' })}
                  </p>
                </div>

                {/* Short Format */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 mb-2">
                    {isRTL ? 'التنسيق القصير' : 'Short Format'}
                  </h3>
                  <p className="text-xl font-bold text-gray-800">
                    {formatDate(date, language, { format: 'short' })}
                  </p>
                </div>

                {/* With Time */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 mb-2 flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {isRTL ? 'مع الوقت' : 'With Time'}
                  </h3>
                  <p className="text-xl font-bold text-gray-800">
                    {formatDate(date, language, { format: 'medium', includeTime: true })}
                  </p>
                </div>
              </div>

              {/* Relative Time */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <span className="text-sm text-gray-500">
                  {isRTL ? 'الوقت النسبي:' : 'Relative Time:'}
                </span>
                <span className="ml-2 text-amber-600 font-semibold">
                  {getRelativeTime(date, language)}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Info Box */}
        <div className="mt-8 bg-amber-100 border-l-4 border-amber-500 p-6 rounded-lg">
          <h3 className="font-bold text-amber-800 mb-2">
            {isRTL ? 'ملاحظة' : 'Note'}
          </h3>
          <p className="text-amber-700">
            {isRTL
              ? 'التواريخ تتحول تلقائياً بين التقويم الهجري والميلادي حسب اللغة المختارة. جرب تغيير اللغة من القائمة أعلاه!'
              : 'Dates automatically switch between Hijri and Gregorian calendars based on the selected language. Try changing the language from the menu above!'
            }
          </p>
        </div>
      </div>
    </div>
  );
};

export default DateTestPage;
