/**
 * Does the shop fit on a phone?
 *
 * Horizontal overflow is the single most visible way a page looks broken:
 * the whole document slides sideways, headings sit half off-screen, and a
 * sticky header detaches from the content under it. It is invisible on a
 * desktop browser, which is where it always gets written.
 *
 * Also checks the shop's own wordmark, because a media query written for the
 * carousel once inflated it from 20px to 32px on every phone — the kind of
 * bug that a person sees instantly and a test suite never mentions.
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
  console.log('⏭️  playwright غير مثبَّت — تخطّي فحص التخطيط (npm i -g playwright)');
  process.exit(2);
}
const { chromium } = playwright;

const ROOT = process.argv[2] || 'frontend/build';
const PORT = 4190;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
                '.json': 'application/json', '.svg': 'image/svg+xml', '.txt': 'text/plain' };

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

const IMG = 'data:image/svg+xml;base64,' + Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="400" height="400" fill="#e8dcc8"/></svg>'
).toString('base64');

// Long Arabic names on purpose: a card that fits "خاتم" and bursts on a real
// CJ title has not been tested with anything the shop actually sells.
const products = Array.from({ length: 6 }, (_, i) => ({
  id: `p${i + 1}`,
  name: `طقم أقراط ستانلس ستيل مطلي ذهب ١٨ قيراط تصميم فاخر رقم ${i + 1}`,
  description: 'وصف طويل بالعربية.',
  price: 93.11 + i, category: 'earrings', images: [IMG], image: IMG,
  rating: 4.5, reviews_count: 12, in_stock: true, stock_quantity: 25,
  is_active: true, sku: `SKU-${i + 1}`,
}));

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium', channel: 'chromium', args: ['--no-proxy-server'],
});
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
await ctx.addInitScript(() => { try { localStorage.setItem('token', 't'); } catch { /* blocked */ } });
await ctx.route('**/api/**', (route) => {
  const p = new URL(route.request().url()).pathname;
  const reply = (b) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(b) });
  if (p.endsWith('/api/auth/me')) return reply({ id: 'u1', email: 'b@x.com', first_name: 'يونس', is_admin: true });
  if (/\/api\/products\/p\d/.test(p)) return reply(products[0]);
  if (p.includes('/api/products')) return reply(products);
  if (p.endsWith('/api/cart')) {
    return reply({ items: products.slice(0, 2).map((x) => ({ product_id: x.id, quantity: 1, price: x.price, product_name: x.name, image: IMG })), total_amount: 188.22 });
  }
  if (p.endsWith('/api/payment-methods')) return reply({ methods: [{ id: 'card', provider: 'iyzico', currency: 'USD' }] });
  if (p.endsWith('/api/geo/detect')) return reply({ country_code: 'SA' });
  if (p.endsWith('/api/shipping/estimate')) return reply({ shipping_cost: 0, free_shipping: true, estimated_days: '5-15' });
  return reply([]);
});
const page = await ctx.newPage();
const base = `http://127.0.0.1:${PORT}`;

const PAGES = [['الرئيسية', '/'], ['المنتجات', '/products'], ['المنتج', '/product/p1'],
               ['السلة', '/cart'], ['السداد', '/checkout'], ['المفضّلة', '/wishlist'],
               ['الدخول', '/auth'], ['تتبّع الطلب', '/order-tracking'],
               ['حسابي', '/profile?tab=orders'], ['سياسة الإرجاع', '/return-policy'],
               ['اتصل بنا', '/contact']];

for (const [name, route] of PAGES) {
  await page.goto(`${base}${route}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(900);

  const overflow = await page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const worst = [];

    for (const el of document.querySelectorAll('body *')) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      // Only what a person is meant to read. A decorative blur bleeding off
      // the edge is a design choice; a sentence half off-screen is a bug.
      if (el.checkVisibility && !el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) continue;
      const ownText = [...el.childNodes]
        .filter((n) => n.nodeType === 3 && n.textContent.trim())
        .map((n) => n.textContent.trim()).join(' ');
      if (!ownText) continue;

      // A few pixels of rounding is not a broken page; a whole element
      // hanging off the side is.
      const over = Math.max(r.right - vw, -r.left);
      if (over > 4) {
        worst.push({ over: Math.round(over), tag: el.tagName.toLowerCase(),
                     text: ownText.slice(0, 40) });
      }
    }
    worst.sort((a, b) => b.over - a.over);
    return { worst: worst.slice(0, 3) };
  });

  // Measured per element, not from documentElement.scrollWidth.
  //
  // App.css sets `body { overflow-x: hidden }`, which clips the overflow
  // instead of preventing it: scrollWidth never grows, so a scrollWidth
  // assertion passes on every page no matter how far the content hangs off.
  // A 900px canary dropped into this page sat at left:-510 — half of it
  // unreachable — and the check still reported green.
  check(`${name}: لا يخرج نصّ خارج الشاشة`, overflow.worst.length === 0,
    overflow.worst.map((w) => `${w.tag}(+${w.over}px) "${w.text}"`).join(' | '));
}

// Thumb-sized targets on the actions the shop depends on.
//
// Not every control: a breadcrumb and a carousel dot are conventionally small
// and a blanket rule would be noise nobody acts on. These are the ones that,
// missed, cost a sale — "إتمام الطلب" was 36px tall, and the cart icon 32.
const TOUCH = [
  ['السلة', '/cart', '[data-testid="checkout-button"], a[href="/checkout"]'],
  ['المنتج', '/product/p1', '[data-testid="add-to-cart-button"]'],
  ['الشريط العلوي', '/', '[data-testid="cart-link"]'],
];
for (const [name, route, selector] of TOUCH) {
  await page.goto(`${base}${route}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(900);
  const box = await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { w: Math.round(r.width), h: Math.round(r.height) };
  }, selector);
  check(`${name}: الزرّ الأساسي بحجم يناسب الإصبع`,
    box !== null && box.h >= 44 && box.w >= 44,
    box ? `${box.w}×${box.h}` : `${selector} not found`);
}

// Every currency the shop knows must be reachable in its picker. The list
// rendered 22 rows with no scroll of its own: on a sticky navbar everything
// below the viewport's edge — including the lira the shop's own owner went
// hunting for — could not be reached by any means. The check scrolls INSIDE
// the menu and demands the page itself never move: reaching an option by
// scrolling the whole page away is not a working dropdown.
await page.setViewportSize({ width: 1280, height: 700 });
await page.goto(`${base}/`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(700);
await page.click('[data-testid="currency-toggle"]');
await page.waitForSelector('[data-testid="currency-menu"]', { timeout: 5000 });
const lira = await page.evaluate(() => {
  const el = document.querySelector('[data-testid="currency-option-TRY"]');
  if (!el) return { ok: false, why: 'TRY not in the menu' };
  el.scrollIntoView({ block: 'nearest' });
  const r = el.getBoundingClientRect();
  const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
  const hit = el === top || el.contains(top) || (top && top.contains(el));
  if (!hit) return { ok: false, why: `covered by ${top ? top.tagName : 'nothing'}` };
  if (window.scrollY !== 0) return { ok: false, why: `page scrolled ${window.scrollY}px to reach it` };
  return { ok: true, why: '' };
});
check('الليرة التركية قابلة للوصول والنقر في قائمة العملات', lira.ok, lira.why);
await page.setViewportSize({ width: 390, height: 844 });

// The wordmark, at the width where it broke.
await page.goto(`${base}/`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(700);
const brand = await page.evaluate(() => {
  const el = [...document.querySelectorAll('a[href="/"] span')].find(s => s.textContent.trim() === 'Auraa');
  if (!el) return null;
  return { size: parseFloat(getComputedStyle(el).fontSize), height: Math.round(el.getBoundingClientRect().height) };
});
check('شعار المتجر بحجمه المقصود على الهاتف', brand !== null && brand.size <= 24,
  brand ? `${brand.size}px` : 'not found');

// Dates, asked of the browser rather than of Node: Node's ICU resolves
// `ar-SA` to the Gregorian calendar and Chromium resolves it to
// islamic-umalqura, so a unit test here would have reported the bug fixed
// while every real visitor still saw ٢٥ صفر ١٤٤٨.
//
// The source scan is what catches a regression — this confirms the two
// locales still mean what the scan assumes they mean.
const calendars = await page.evaluate(() => ({
  bare: new Intl.DateTimeFormat('ar-SA').resolvedOptions().calendar,
  pinned: new Intl.DateTimeFormat('ar-SA-u-ca-gregory').resolvedOptions().calendar,
}));
check('التقويم الميلادي مثبَّت وليس افتراضياً',
  calendars.pinned === 'gregory' && calendars.bare !== 'gregory',
  `ar-SA=${calendars.bare}, pinned=${calendars.pinned}`);

// Every date on every screen must use the pinned locale. This is the check
// with teeth: revert one call site and it fails.
const sources = [];
const walkSrc = (dir) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== 'node_modules') walkSrc(full); }
    else if (/\.jsx?$/.test(e.name)) sources.push(full);
  }
};
walkSrc('frontend/src');
const hijri = [];
for (const file of sources) {
  const text = fs.readFileSync(file, 'utf8');
  for (const line of text.split('\n')) {
    if (!/'ar-SA'/.test(line)) continue;
    if (/toLocaleDateString|toLocaleString|DateTimeFormat/.test(line)) {
      hijri.push(`${path.basename(file)}: ${line.trim().slice(0, 70)}`);
    }
  }
}
check('لا شاشة تعرض تاريخاً بالتقويم الهجري', hijri.length === 0, hijri.join(' | '));

await browser.close();
server.close();

const failed = results.filter((r) => !r.ok).length;
console.log(failed ? `\n${failed} من ${results.length} فشل` : `\nكل الفحوص تمرّ (${results.length})`);
process.exit(failed ? 1 : 0);
