/**
 * A screen must not read a field the server has never sent.
 *
 * The admin orders page rendered `order.total.toFixed(2)`. The API sends
 * `total_amount`, so `order.total` was undefined and the whole page died with
 * "Cannot read properties of undefined (reading 'toFixed')" — no orders, no
 * approval queue, nothing, on a live shop. The identical mistake had already
 * been fixed once in the checkout (`cart.total_price`), and the other screens
 * were never checked.
 *
 *   node scripts/verify-no-phantom-fields.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const srcDir = path.join(root, 'frontend/src');

// field the UI reads  →  what the API actually sends
const PHANTOMS = [
  [/\border\.total\b(?!_)/, 'order.total', 'order.total_amount'],
  [/\bselectedOrder\.total\b(?!_)/, 'selectedOrder.total', 'selectedOrder.total_amount'],
  [/\bcart\.total_price\b/, 'cart.total_price', 'cart.total_amount'],
];

const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
  const full = path.join(dir, entry.name);
  if (entry.isDirectory()) return walk(full);
  return entry.name.endsWith('.js') ? [full] : [];
});

// analytics.js documents a caller-supplied shape of its own; it reads nothing
// from the API.
const files = walk(srcDir).filter((f) => !f.endsWith('utils/analytics.js'));

const hits = [];
for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');
  for (const [pattern, wrong, right] of PHANTOMS) {
    text.split('\n').forEach((line, i) => {
      if (pattern.test(line) && !line.trimStart().startsWith('//') && !line.trimStart().startsWith('*')) {
        hits.push(`${path.relative(root, file)}:${i + 1} — ${wrong} (المقصود ${right})`);
      }
    });
  }
}

if (hits.length) {
  hits.forEach((h) => console.log(`❌ ${h}`));
  console.log(`\n${hits.length} حقل غير موجود يُقرأ في الواجهة`);
  process.exit(1);
}
console.log(`✅ لا حقل غير موجود يُقرأ (${PHANTOMS.length} نمطاً مفحوصاً عبر ${files.length} ملفاً)`);
