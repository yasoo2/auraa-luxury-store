/**
 * The store must never print a price it did not compute.
 *
 * convert() used to answer 0 whenever a rate was missing — before the rates
 * finished loading, or when the endpoint failed. Zero is not a missing price,
 * it is a wrong one, and it looks entirely real: the admin catalogue showed a
 * live 175-riyal product as "$US 0.00". This pins the distinction between
 * "cannot convert" (null) and "genuinely zero" (0).
 *
 *   node scripts/verify-currency.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const src = fs.readFileSync(path.join(root, 'frontend/src/context/LanguageContext.js'), 'utf8');

const start = src.indexOf('const convert = (');
if (start === -1) {
  console.error('convert() not found in LanguageContext.js');
  process.exit(1);
}
const rest = src.slice(start);
const fn = rest.slice(0, rest.indexOf('\n  };') + 5);
const build = (rates) => new Function('exchangeRates', `${fn} return convert;`)(rates);

const LOADED = { USD: 1, SAR: 3.75 };
const NOT_LOADED = { USD: 1 };

const cases = [
  ['SAR→USD once the rates are in', LOADED,     [375, 'SAR', 'USD'], 100],
  ['USD→SAR once the rates are in', LOADED,     [100, 'USD', 'SAR'], 375],
  ['the same currency needs no rate', NOT_LOADED, [175, 'SAR', 'SAR'], 175],
  ['rates not loaded yet → unknown', NOT_LOADED, [175, 'SAR', 'USD'], null],
  ['a currency we have no rate for → unknown', LOADED, [175, 'SAR', 'XYZ'], null],
  ['a real zero stays zero', LOADED,            [0, 'SAR', 'USD'],   0],
];

let failed = 0;
for (const [name, rates, args, want] of cases) {
  const got = build(rates)(...args);
  const ok = want === null ? got === null : Math.abs(got - want) < 1e-9;
  if (!ok) failed++;
  console.log(`${ok ? '✅' : '❌'} ${name}: ${JSON.stringify(got)}${ok ? '' : ` (expected ${JSON.stringify(want)})`}`);
}

// --- formatMoney -----------------------------------------------------------
//
// Every storefront price used to be printed as `{price} ر.س` with the symbol
// written into the markup, so the header's currency switcher relabelled
// nothing and converted nothing. One formatter now owns it, and it must never
// dress a riyal figure up as dollars when it could not convert.
const fmStart = src.indexOf('const formatMoney = (');
if (fmStart === -1) {
  console.error('formatMoney() not found in LanguageContext.js');
  process.exit(1);
}
const fmRest = src.slice(fmStart);
const fmFn = fmRest.slice(0, fmRest.indexOf('\n  };') + 5);

const CURRENCIES = { SAR: { symbol: 'ر.س', decimals: 2 }, USD: { symbol: '$', decimals: 2 } };
const buildFormat = (rates, currency) =>
  new Function('exchangeRates', 'currency', 'CURRENCIES',
    `${fn}\n${fmFn}\nreturn formatMoney;`)(rates, currency, CURRENCIES);

const money = [
  // Whole numbers in every currency, rounded up — the owner's standing rule:
  // «في اي عمله لا اريد اي كسور».
  ['SAR stays SAR',                 NOT_LOADED, 'SAR', 175, '175 ر.س'],
  ['converts once rates are in',    LOADED,     'USD', 375, '100 $'],
  ['no rate → the true SAR figure', NOT_LOADED, 'USD', 175, '175 ر.س'],
  ['fractions round UP, never down', NOT_LOADED, 'SAR', 93.11, '94 ر.س'],
  ['converted fractions round UP too', LOADED,  'USD', 376, '101 $'],
];

for (const [name, rates, currency, amount, want] of money) {
  const got = buildFormat(rates, currency)(amount);
  const ok = got === want;
  if (!ok) failed++;
  console.log(`${ok ? '✅' : '❌'} ${name}: ${JSON.stringify(got)}${ok ? '' : ` (expected ${JSON.stringify(want)})`}`);
}

console.log(failed ? `\n${failed} of ${cases.length + money.length} currency checks failed` : `\nall ${cases.length + money.length} currency checks pass`);
process.exit(failed ? 1 : 0);
