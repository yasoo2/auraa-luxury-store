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

console.log(failed ? `\n${failed} of ${cases.length} currency checks failed` : `\nall ${cases.length} currency checks pass`);
process.exit(failed ? 1 : 0);
