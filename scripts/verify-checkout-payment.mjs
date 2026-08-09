/**
 * The money path, in a real browser.
 *
 * This shop has no card gateway. Payment is a bank transfer the customer makes
 * themselves, which only works if the checkout shows the account details the
 * server actually holds — and never shows an account it does not.
 *
 * The questions asked here are the ones that cost real money if answered
 * wrong:
 *
 *   1. With no method configured, can an order still be placed? (It must not.)
 *   2. Is the method the customer picks the one that reaches the server?
 *   3. Is the IBAN on screen the one the server sent, character for character?
 *   4. Is the radio the shopper aims at the element that actually receives the
 *      click — asked with document.elementFromPoint at its centre, not by
 *      checking that it exists in the DOM.
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';

const require = createRequire(import.meta.url);

function loadPlaywright() {
  const roots = [];
  if (process.env.PLAYWRIGHT_ROOT) roots.push(process.env.PLAYWRIGHT_ROOT);
  try {
    roots.push(execSync('npm root -g', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim());
  } catch { /* npm may not be on PATH */ }
  roots.push('/opt/node22/lib/node_modules', '/usr/local/lib/node_modules', '/usr/lib/node_modules');
  for (const id of ['playwright', ...roots.filter(Boolean).map((r) => path.join(r, 'playwright'))]) {
    try { return require(id); } catch { /* try the next location */ }
  }
  return null;
}

const playwright = loadPlaywright();
if (!playwright) {
  console.log('⏭️  playwright غير مثبَّت — تخطّي فحص مسار الدفع (npm i -g playwright)');
  process.exit(2);
}
const { chromium } = playwright;

const ROOT = process.argv[2] || 'frontend/build';
const PORT = 4189;

const IBAN = 'TR330006100519786457841326';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
                '.json': 'application/json', '.svg': 'image/svg+xml', '.txt': 'text/plain' };

// What the fake server offers. Flipped between checks.
let methods = [];
let methodsFail = false;
let placedOrder = null;

const json = (res, body, status = 200) => {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  let file = path.join(ROOT, url.pathname);
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(ROOT, 'index.html');
  if (!fs.existsSync(file)) { res.writeHead(404); res.end('nope'); return; }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));

const results = [];
const check = (n, ok, d = '') => { results.push({ n, ok }); console.log(`${ok ? '✅' : '❌'} ${n}${d ? '  — ' + d : ''}`); };

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium', channel: 'chromium', args: ['--no-proxy-server'],
});
// The service worker would serve a cached shell between the two runs below and
// hide a change in what the server offers.
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: 'block' });
await ctx.addInitScript(() => {
  try { localStorage.setItem('token', 'test-token'); } catch { /* blocked storage is another check's job */ }
});

// The built bundle points at the deployed backend, not at this process, so
// serving /api from the local file server would never be reached. Intercept
// instead: whatever host the app asks, these are the answers.
await ctx.route('**/api/**', async (route) => {
  const req = route.request();
  const p = new URL(req.url()).pathname;
  const reply = (body) => route.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify(body),
  });

  if (p.endsWith('/api/auth/me')) return reply({ id: 'u1', email: 'buyer@x.com', first_name: 'Younes' });
  if (p.endsWith('/api/payment-methods')) {
    // 404 is what the deployed backend answers until it catches up.
    if (methodsFail) return route.fulfill({ status: 404, contentType: 'application/json', body: '{"detail":"Not Found"}' });
    return reply({ methods });
  }
  if (p.endsWith('/api/geo/detect')) return reply({ country_code: 'TR' });
  if (p.endsWith('/api/cart')) {
    return reply({
      items: [{ product_id: 'p1', quantity: 1, price: 93.11, product_name: 'Stud Earrings' }],
      total_amount: 93.11,
    });
  }
  if (p.endsWith('/api/shipping/estimate')) {
    return reply({ shipping_cost: 0, free_shipping: true, estimated_days: '5-15' });
  }
  if (p.endsWith('/api/orders') && req.method() === 'POST') {
    placedOrder = JSON.parse(req.postData() || '{}');
    return reply({ id: 'o1', order_number: 'AUR-TEST-1', total_amount: 93.11 });
  }
  if (p.endsWith('/api/orders/o1/pay-session')) {
    return reply({
      payment_page_url: `http://127.0.0.1:${PORT}/fake-iyzico-page`,
      amount: 24.85, currency: 'USD',
    });
  }
  if (p.endsWith('/api/orders/o1/payment-instructions')) {
    return reply({
      order_id: 'o1', order_number: 'AUR-TEST-1', amount: 93.11, currency: 'SAR',
      payment_status: 'awaiting_payment', reference_to_quote: 'AUR-TEST-1',
      method: methods.find((m) => m.id === 'bank_transfer') || methods[0] || null,
    });
  }
  return reply({});
});

const page = await ctx.newPage();
const base = `http://127.0.0.1:${PORT}`;

const gotoCheckout = async () => {
  await page.goto(`${base}/checkout`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-testid="payment-method"], [data-testid="no-payment-methods"]', { timeout: 15000 });
};

// --- 1. Nothing configured: the shop must not take an order ----------------
methods = [];
await gotoCheckout();
check('بلا طريقة دفع: يقول ذلك صراحةً',
  await page.locator('[data-testid="no-payment-methods"]').count() === 1);
check('بلا طريقة دفع: زر إتمام الطلب معطَّل',
  await page.locator('button[type="submit"]').isDisabled());

// --- 1b. The endpoint is down: recoverable without losing the form ---------
// This is the state the live shop passes through on every deploy, because the
// frontend and the backend are built by two services that finish at different
// times.
methodsFail = true;
await page.goto(`${base}/checkout`, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('[data-testid="payment-methods-error"]', { timeout: 15000 });
check('تعذّر جلب طرق الدفع: يقول ذلك ولا يخمّن طريقة',
  await page.locator('[data-testid="payment-methods-error"]').count() === 1);

methods = [
  { id: 'bank_transfer', bank_name: 'VakifBank', account_holder: 'Auraa Luxury',
    iban: IBAN, swift: 'TVBATR2A', account_currency: 'TRY' },
  { id: 'on_confirmation' },
];
methodsFail = false;
await page.locator('[data-testid="retry-payment-methods"]').click();
await page.waitForSelector('[data-testid="payment-method"]', { timeout: 15000 });
check('وإعادة المحاولة تُصلح الحال بلا إعادة تحميل الصفحة',
  await page.locator('[data-testid="payment-method-bank_transfer"]').count() === 1);

// --- 2. Both methods offered ----------------------------------------------
await gotoCheckout();

const bank = page.locator('[data-testid="payment-method-bank_transfer"]');
check('تُعرض الطرق التي يقدّمها الخادم', await bank.count() === 1);
check('الطريقة الأولى مختارة تلقائياً', await bank.isChecked());

// The real question about a control is not whether it is in the DOM but
// whether the pixel the shopper aims at belongs to it.
const onConfirmation = page.locator('[data-testid="payment-method-on_confirmation"]');
await onConfirmation.scrollIntoViewIfNeeded();
const hit = await page.evaluate(() => {
  const el = document.querySelector('[data-testid="payment-method-on_confirmation"]');
  if (!el) return { ok: false, why: 'missing' };
  const r = el.getBoundingClientRect();
  const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
  return { ok: el === top || el.contains(top), why: top ? top.outerHTML.slice(0, 80) : 'nothing' };
});
check('زرّ الاختيار هو ما يقع تحت المؤشّر فعلاً', hit.ok, hit.why);

// --- 3. The method chosen is the method sent -------------------------------
await onConfirmation.click();
check('الاختيار ينتقل إلى الطريقة الثانية', await onConfirmation.isChecked());

// A real shopper fills the address in before the form will submit.
for (const [name, value] of Object.entries({
  firstName: 'Younes', lastName: 'S', email: 'buyer@x.com', phone: '+905000000000',
  street: 'Bagdat Cad 12', city: 'Istanbul', state: 'Istanbul', zipCode: '34000',
})) {
  await page.fill(`[name="${name}"]`, value);
}

placedOrder = null;
await page.locator('button[type="submit"]').click();
await page.waitForURL(/\/order\/o1\/pay/, { timeout: 15000 });
check('ما اختاره العميل هو ما وصل الخادم',
  placedOrder?.payment_method === 'on_confirmation', JSON.stringify(placedOrder?.payment_method));

// --- 3b. Card: no second screen between the till and the card page ---------
// The flow every shop in the world runs: address in, "ادفع الآن", gateway.
// There used to be an intermediate page asking the customer to press "pay"
// again — a step nobody expects, on the click that earns the money.
methods = [{ id: 'card', provider: 'iyzico', currency: 'USD' }];
await gotoCheckout();
for (const [name, value] of Object.entries({
  firstName: 'Younes', lastName: 'S', email: 'buyer@x.com', phone: '+905000000000',
  street: 'Bagdat Cad 12', city: 'Istanbul', state: 'Istanbul', zipCode: '34000',
})) {
  await page.fill(`[name="${name}"]`, value);
}
const payNow = await page.locator('button[type="submit"]').innerText();
check('الزرّ يسمّي فعله: «ادفع الآن»', /ادفع الآن|Pay now/.test(payNow), payNow.trim());

placedOrder = null;
let reachedGateway = true;
await page.locator('button[type="submit"]').click();
try {
  await page.waitForURL(/fake-iyzico-page/, { timeout: 15000 });
} catch {
  reachedGateway = false;
}
check('البطاقة: من «ادفع الآن» إلى صفحة الدفع مباشرة بلا محطة وسيطة',
  reachedGateway, reachedGateway ? '' : `stuck at ${page.url()}`);
check('البطاقة: الطريقة المرسلة للخادم صحيحة',
  placedOrder?.payment_method === 'card', JSON.stringify(placedOrder?.payment_method));

// --- 4. The account shown is the account the server holds ------------------
methods = [
  { id: 'bank_transfer', bank_name: 'VakifBank', account_holder: 'Auraa Luxury',
    iban: IBAN, swift: 'TVBATR2A', account_currency: 'TRY' },
  { id: 'on_confirmation' },
];
await page.goto(`${base}/order/o1/pay`, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('[data-testid="bank-transfer-instructions"]', { timeout: 15000 });
const shown = await page.locator('[data-testid="bank-transfer-instructions"]').innerText();
check('يظهر الآيبان الذي أرسله الخادم حرفاً بحرف', shown.includes(IBAN),
  shown.replace(/\s+/g, ' ').slice(0, 120));
check('ويظهر رقم الطلب ليكتبه في بيان الحوالة', shown.includes('AUR-TEST-1'));
check('ولا يظهر أي رقم حساب مكتوب في الكود',
  !/TR00|XXXX|0000 0000 0000/.test(shown));

await browser.close();
server.close();

const failed = results.filter((r) => !r.ok).length;
console.log(failed ? `\n${failed} من ${results.length} فشل` : `\nكل الفحوص تمرّ (${results.length})`);
process.exit(failed ? 1 : 0);
