/**
 * Every country the store can ship to.
 *
 * The checkout offered six: Saudi Arabia, the UAE, Kuwait, Qatar, Bahrain and
 * Oman. A shopper anywhere else could not name where they live, so the store
 * was global in its catalogue and Gulf-only at the till.
 *
 * Names come from the browser's own Intl.DisplayNames rather than a translated
 * table kept here. A hand-written list of 250 country names in two languages
 * goes stale, disagrees with itself, and misspells the places nobody on the
 * team has visited — and the browser already knows them, in every language the
 * store speaks.
 */

// ISO 3166-1 alpha-2. Codes only; the names are resolved at render time.
export const COUNTRY_CODES = [
  'AD', 'AE', 'AF', 'AG', 'AI', 'AL', 'AM', 'AO', 'AR', 'AS', 'AT', 'AU', 'AW',
  'AX', 'AZ', 'BA', 'BB', 'BD', 'BE', 'BF', 'BG', 'BH', 'BI', 'BJ', 'BL', 'BM',
  'BN', 'BO', 'BQ', 'BR', 'BS', 'BT', 'BW', 'BY', 'BZ', 'CA', 'CC', 'CD', 'CF',
  'CG', 'CH', 'CI', 'CK', 'CL', 'CM', 'CN', 'CO', 'CR', 'CU', 'CV', 'CW', 'CX',
  'CY', 'CZ', 'DE', 'DJ', 'DK', 'DM', 'DO', 'DZ', 'EC', 'EE', 'EG', 'EH', 'ER',
  'ES', 'ET', 'FI', 'FJ', 'FK', 'FM', 'FO', 'FR', 'GA', 'GB', 'GD', 'GE', 'GF',
  'GG', 'GH', 'GI', 'GL', 'GM', 'GN', 'GP', 'GQ', 'GR', 'GT', 'GU', 'GW', 'GY',
  'HK', 'HN', 'HR', 'HT', 'HU', 'ID', 'IE', 'IL', 'IM', 'IN', 'IO', 'IQ', 'IR',
  'IS', 'IT', 'JE', 'JM', 'JO', 'JP', 'KE', 'KG', 'KH', 'KI', 'KM', 'KN', 'KR',
  'KW', 'KY', 'KZ', 'LA', 'LB', 'LC', 'LI', 'LK', 'LR', 'LS', 'LT', 'LU', 'LV',
  'LY', 'MA', 'MC', 'MD', 'ME', 'MF', 'MG', 'MH', 'MK', 'ML', 'MM', 'MN', 'MO',
  'MP', 'MQ', 'MR', 'MS', 'MT', 'MU', 'MV', 'MW', 'MX', 'MY', 'MZ', 'NA', 'NC',
  'NE', 'NF', 'NG', 'NI', 'NL', 'NO', 'NP', 'NR', 'NU', 'NZ', 'OM', 'PA', 'PE',
  'PF', 'PG', 'PH', 'PK', 'PL', 'PM', 'PR', 'PS', 'PT', 'PW', 'PY', 'QA', 'RE',
  'RO', 'RS', 'RU', 'RW', 'SA', 'SB', 'SC', 'SD', 'SE', 'SG', 'SH', 'SI', 'SJ',
  'SK', 'SL', 'SM', 'SN', 'SO', 'SR', 'SS', 'ST', 'SV', 'SX', 'SY', 'SZ', 'TC',
  'TD', 'TG', 'TH', 'TJ', 'TK', 'TL', 'TM', 'TN', 'TO', 'TR', 'TT', 'TV', 'TW',
  'TZ', 'UA', 'UG', 'US', 'UY', 'UZ', 'VA', 'VC', 'VE', 'VG', 'VI', 'VN', 'VU',
  'WF', 'WS', 'YE', 'YT', 'ZA', 'ZM', 'ZW',
];

// Where most of this shop's customers are, kept at the top of the list so the
// common case stays one click away on a list of two hundred.
export const PRIORITY_CODES = ['SA', 'AE', 'KW', 'QA', 'BH', 'OM', 'US', 'GB'];

const displayNamesFor = (language) => {
  try {
    return new Intl.DisplayNames([language === 'ar' ? 'ar' : 'en'], { type: 'region' });
  } catch (err) {
    return null;
  }
};

/** Country name in the given language, falling back to the code itself. */
export const countryName = (code, language = 'en') => {
  const names = displayNamesFor(language);
  if (!names) return code;
  try {
    return names.of(code) || code;
  } catch (err) {
    return code;
  }
};

/**
 * The full list, sorted the way the reader reads, with the shop's main markets
 * first. Sorting uses the locale's own collation — Arabic names sorted by
 * JavaScript's default comparison come out in an order no Arabic speaker
 * recognises.
 */
export const countryOptions = (language = 'en') => {
  const label = (code) => ({ code, name: countryName(code, language) });
  const collator = new Intl.Collator(language === 'ar' ? 'ar' : 'en');

  const priority = PRIORITY_CODES.map(label);
  const rest = COUNTRY_CODES
    .filter((code) => !PRIORITY_CODES.includes(code))
    .map(label)
    .sort((a, b) => collator.compare(a.name, b.name));

  return { priority, rest };
};
