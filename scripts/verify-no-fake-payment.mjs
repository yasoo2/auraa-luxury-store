// A shop with no payment provider must not ask for a card. The old checkout
// required cardholder, number, expiry and CVV, sent none of them anywhere, and
// charged nothing — so every customer who filled them in believed they had paid.
import fs from 'node:fs';
const src = fs.readFileSync('frontend/src/components/CheckoutPage.js', 'utf8');

const checks = [
  ['لا حقل رقم بطاقة',      !/name="cardNumber"/.test(src)],
  ['لا حقل CVV',            !/name="cvv"/.test(src)],
  ['لا حقل تاريخ انتهاء',   !/name="expiryDate"/.test(src)],
  ['لا حقل اسم حامل بطاقة', !/name="cardName"/.test(src)],
  ['يقول إنه لن يُخصم شيء الآن', /لن يُخصم منك شيء الآن/.test(src)],
];

let failed = 0;
for (const [name, ok] of checks) {
  if (!ok) failed++;
  console.log(`${ok ? '✅' : '❌'} ${name}`);
}
console.log(failed ? `\n${failed} من ${checks.length} فشل` : `\nكل الفحوص تمرّ (${checks.length})`);
process.exit(failed ? 1 : 0);
