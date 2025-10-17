/**
 * Date Utilities - Gregorian Date Formatting
 * All dates are displayed in Gregorian calendar regardless of language
 */

/**
 * Format date in Gregorian calendar (for all languages)
 * @param {Date|string} date - Date to format
 * @param {string} language - Current language (ar, en, etc)
 * @param {object} options - Formatting options
 * @returns {string} Formatted date string
 */
export const formatDate = (date, language = 'en', options = {}) => {
  if (!date) return '-';

  const {
    includeTime = false,
    format = 'full', // 'full', 'short', 'medium'
  } = options;

  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;

    if (isNaN(dateObj.getTime())) {
      return '-';
    }

    // Always use Gregorian calendar for all languages
    return formatGregorianDate(dateObj, language, format, includeTime);
  } catch (error) {
    console.error('Error formatting date:', error);
    return '-';
  }
};

/**
 * Format date in Gregorian calendar
 */
const formatGregorianDate = (date, language, format, includeTime) => {
  const locale = language === 'ar' ? 'ar-SA' : 'en-US';
  
  let options = {};

  switch (format) {
    case 'full':
      options = { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      };
      break;
    case 'short':
      options = { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit' 
      };
      break;
    case 'medium':
      options = { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      };
      break;
    default:
      options = { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      };
  }

  if (includeTime) {
    options.hour = '2-digit';
    options.minute = '2-digit';
  }

  return new Intl.DateTimeFormat(locale, options).format(date);
};

/**
 * Get relative time (e.g., "منذ يومين", "2 days ago")
 */
export const getRelativeTime = (date, language = 'en') => {
  if (!date) return '-';

  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffMs = now - dateObj;
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    const diffWeeks = Math.floor(diffDays / 7);
    const diffMonths = Math.floor(diffDays / 30);
    const diffYears = Math.floor(diffDays / 365);

    const isRTL = language === 'ar';

    if (diffSeconds < 60) {
      return isRTL ? 'الآن' : 'just now';
    } else if (diffMinutes < 60) {
      return isRTL 
        ? `منذ ${diffMinutes} ${diffMinutes === 1 ? 'دقيقة' : 'دقائق'}`
        : `${diffMinutes} ${diffMinutes === 1 ? 'minute' : 'minutes'} ago`;
    } else if (diffHours < 24) {
      return isRTL
        ? `منذ ${diffHours} ${diffHours === 1 ? 'ساعة' : 'ساعات'}`
        : `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
    } else if (diffDays < 7) {
      return isRTL
        ? `منذ ${diffDays} ${diffDays === 1 ? 'يوم' : 'أيام'}`
        : `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
    } else if (diffWeeks < 4) {
      return isRTL
        ? `منذ ${diffWeeks} ${diffWeeks === 1 ? 'أسبوع' : 'أسابيع'}`
        : `${diffWeeks} ${diffWeeks === 1 ? 'week' : 'weeks'} ago`;
    } else if (diffMonths < 12) {
      return isRTL
        ? `منذ ${diffMonths} ${diffMonths === 1 ? 'شهر' : 'أشهر'}`
        : `${diffMonths} ${diffMonths === 1 ? 'month' : 'months'} ago`;
    } else {
      return isRTL
        ? `منذ ${diffYears} ${diffYears === 1 ? 'سنة' : 'سنوات'}`
        : `${diffYears} ${diffYears === 1 ? 'year' : 'years'} ago`;
    }
  } catch (error) {
    console.error('Error calculating relative time:', error);
    return '-';
  }
};

/**
 * Format date for input fields (always Gregorian YYYY-MM-DD)
 */
export const formatDateForInput = (date) => {
  if (!date) return '';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toISOString().split('T')[0];
  } catch (error) {
    return '';
  }
};

/**
 * Format time only (HH:MM)
 */
export const formatTime = (date) => {
  if (!date) return '-';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const hours = dateObj.getHours().toString().padStart(2, '0');
    const minutes = dateObj.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  } catch (error) {
    return '-';
  }
};

/**
 * Format date range
 */
export const formatDateRange = (startDate, endDate, language = 'en') => {
  if (!startDate || !endDate) return '-';
  
  const start = formatDate(startDate, language, { format: 'short' });
  const end = formatDate(endDate, language, { format: 'short' });
  
  return language === 'ar' ? `من ${start} إلى ${end}` : `${start} - ${end}`;
};

export default {
  formatDate,
  getRelativeTime,
  formatDateForInput,
  formatTime,
  formatDateRange
};
