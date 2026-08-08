// A shop with no payment provider must not ask for a card. The old checkout
// required cardholder, number, expiry and CVV, sent none of them anywhere, and
// charged nothing — so every customer who filled them in believed they had paid.
import fs from 'node:fs';
const src = fs.readFileSync('frontend/src/components/CheckoutPage.js', 'utf8');

const profile = fs.readFileSync('frontend/src/components/ProfilePage.js', 'utf8');

const checks = [
  // The shop has no payment provider, so no screen may say a payment happened.
  // Anything that was not 'card' used to be labelled "دفع إلكتروني" — an
  // electronic payment, on a shop that has never taken one.
  ['لا يدّعي أنّ دفعاً إلكترونياً حدث', !/دفع إلكتروني/.test(profile)],
  ['يسمّي طريقة الدفع الحقيقية', /الدفع عند تأكيد الطلب/.test(profile)],
  // "في الانتظار" told the customer nothing: waiting for what, by whom?
  ['حالة الطلب تقول ما يحدث', /بانتظار التأكيد/.test(profile)],
  ['ويشرح ما سيحدث بعدها', /نتواصل معك لإتمام الدفع/.test(profile)],
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
