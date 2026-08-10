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
// 30 of them: more than one server page (24), so the pagination flow below
// exercises a second page for real instead of trusting the first.
const products = Array.from({ length: 30 }, (_, i) => ({
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
  if (p.endsWith('/api/auth/me')) return reply({ id: 'u1', email: 'b@x.com', first_name: 'يونس', is_admin: true, is_super_admin: true });
  if (p.endsWith('/api/health')) return reply({ status: 'ok', db: true, version: 'dev' });
  if (p.endsWith('/api/readiness')) return reply({ status: 'ready', checks: {} });
  if (p.endsWith('/api/admin/users')) {
    // Long emails and mixed names — the shape that stretches a users table.
    return reply(Array.from({ length: 4 }, (_, i) => ({
      id: `u${i + 1}`, name: `مستخدم تجريبي طويل الاسم رقم ${i + 1}`,
      email: `halaafeakomgggg.the.longest.address${i + 1}@gmail.com`,
      is_admin: i === 0, is_super_admin: false, is_active: true,
      created_at: '2026-08-01T10:00:00Z', last_login: '2026-08-09T20:00:00Z',
      orders_count: 3, total_spent: 325.59,
    })));
  }
  if (p.endsWith('/api/admin/products')) return reply(products);
  if (p.endsWith('/api/admin/analytics')) return reply(null);
  if (p.endsWith('/api/admin/cms-pages') || p.endsWith('/api/admin/media')) return reply([]);
  if (p.endsWith('/api/admin/settings') || p.endsWith('/api/admin/payment-settings')
      || p.endsWith('/api/admin/theme') || p.endsWith('/api/auto-update/status')) {
    return reply({});
  }
  if (p.endsWith('/api/auto-update/currency-rates')) {
    return reply({ base: 'USD', rates: { USD: 1, SAR: 3.75, TRY: 47.7 }, source: 'fallback' });
  }
  if (p.endsWith('/api/admin/orders')) {
    // The shape that actually broke the admin: a long English CJ error, long
    // emails, and enough nowrap columns to force the table wider than any
    // screen. The page must scroll the table, not hang off the edge.
    const err = "CJ refused the order: CJ error 400: {'code': 1600300, 'result': False, "
      + "'message': 'shippingCountry must be not empty', 'requestId': 'de3bef4aab5f4ceb9c8b17892c8aad73'}";
    return reply([
      { id: '0d4bef52-61eb-498b-bd89-0327be6db222', order_number: 'AUR-20260809-890981CC',
        customer_name: 'Halaa feakom Gggg', customer_email: 'halaafeakomgggg@gmail.com',
        total_amount: 325.59, status: 'pending', payment_status: 'paid', payment_method: 'card',
        supplier_status: 'failed', supplier_error: err, supplier_order_id: null,
        created_at: '2026-08-09T20:28:00Z', items: [{ product_name: 'طقم أقراط فاخر', quantity: 1, price: 325.59 }] },
      { id: 'c37d2d86-0a25-4f26-8fcb-9cffeca55601', order_number: 'AUR-20260808-84A7FAA1',
        customer_name: 'Younes Sowady', customer_email: 'ysowady@gmail.com',
        total_amount: 121.96, status: 'pending', payment_status: 'awaiting_payment', payment_method: 'card',
        supplier_status: null, supplier_error: null, supplier_order_id: null,
        created_at: '2026-08-08T10:17:00Z', items: [] },
    ]);
  }
  if (/\/api\/products\/p\d/.test(p)) return reply(products[0]);
  if (p.includes('/api/products')) {
    // Pages exactly like the real endpoint: skip/limit with limit defaulting
    // to 20. Replying with the whole catalogue at once would hide the bug
    // this guards against — a storefront that never asks past page one.
    const q = new URL(route.request().url()).searchParams;
    const skip = Number(q.get('skip')) || 0;
    const limit = Number(q.get('limit')) || 20;
    return reply(products.slice(skip, skip + limit));
  }
  if (p.endsWith('/api/cart')) {
    return reply({ items: products.slice(0, 2).map((x) => ({ product_id: x.id, quantity: 1, price: x.price, product_name: x.name, image: IMG })), total_amount: 188.22 });
  }
  if (p.endsWith('/api/payment-methods')) return reply({ methods: [{ id: 'card', provider: 'iyzico', currency: 'USD' }] });
  if (p.endsWith('/api/geo/detect')) return reply({ country_code: 'SA' });
  if (p.endsWith('/api/categories')) {
    // Real shape: both names on every document. The mobile drawer used to
    // print `name` — the Arabic one — whatever language the visitor chose.
    return reply([
      { id: 'necklaces', name: 'قلادات', name_en: 'Necklaces', icon: '📿' },
      { id: 'rings', name: 'خواتم', name_en: 'Rings', icon: '💍' },
      { id: 'sets', name: 'أطقم', name_en: 'Sets', icon: '✨' },
    ]);
  }
  // The REAL response shape: Product documents carry `images` (plural) and
  // no recommendation_score — the card once invented a score off the missing
  // field and printed "NaN%" to customers.
  if (p.includes('/api/recommendations')) return reply(products.slice(0, 6));
  if (p.endsWith('/api/shipping/estimate')) return reply({ shipping_cost: 0, free_shipping: true, estimated_days: '5-15' });
  return reply([]);
});
const page = await ctx.newPage();
const base = `http://127.0.0.1:${PORT}`;

const PAGES = [['الرئيسية', '/'], ['المنتجات', '/products'], ['المنتج', '/product/p1'],
               ['السلة', '/cart'], ['السداد', '/checkout'], ['المفضّلة', '/wishlist'],
               ['الدخول', '/auth'], ['تتبّع الطلب', '/order-tracking'],
               ['حسابي', '/profile?tab=orders'], ['سياسة الإرجاع', '/return-policy'],
               ['اتصل بنا', '/contact'],
               // The whole admin, not just orders: the owner runs the shop
               // from a phone, and every one of these screens has to survive
               // 390px — squeezed tables, filter bars, stat grids and all.
               ['إدارة الطلبات', '/admin/orders'],
               ['إدارة المنتجات', '/admin/products'],
               ['إدارة المستخدمين', '/admin/users'],
               ['الاستيراد السريع', '/admin/quick-import'],
               ['الاستيراد المجمّع', '/admin/bulk-import'],
               ['التحليلات', '/admin/analytics'],
               ['التكاملات', '/admin/integrations'],
               ['التحديثات التلقائية', '/admin/auto-update'],
               ['إدارة الصفحات', '/admin/cms-pages'],
               ['تخصيص التصميم', '/admin/theme'],
               ['مكتبة الوسائط', '/admin/media'],
               ['المستخدمون سوبر', '/admin/users-management'],
               ['إدارة المديرين', '/admin/admin-management'],
               ['الإعدادات', '/admin/settings']];

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
      // Toasts fly in from off-screen by design; sampling one mid-animation
      // reports its travel, not the page's layout. Their responsive CSS is
      // the library's own contract, not this page's.
      if (el.closest('[class*="Toastify"]')) continue;
      const ownText = [...el.childNodes]
        .filter((n) => n.nodeType === 3 && n.textContent.trim())
        .map((n) => n.textContent.trim()).join(' ');
      if (!ownText) continue;

      // Text inside a WORKING horizontal scroller is reachable — the reader
      // scrolls the container, like the admin orders table. It only counts
      // as working when the scroller itself sits fully on screen; a scroller
      // that has itself been pushed off the edge (the flex min-width bug
      // this check caught) rescues nothing. body{overflow-x:hidden} clips
      // rather than scrolls, and never qualifies.
      let scrolled = false;
      for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
        const ox = getComputedStyle(a).overflowX;
        if ((ox === 'auto' || ox === 'scroll') && a.scrollWidth > a.clientWidth + 1) {
          const ar = a.getBoundingClientRect();
          if (ar.left >= -4 && ar.right <= vw + 4) { scrolled = true; break; }
        }
      }
      if (scrolled) continue;

      // A few pixels of rounding is not a broken page; a whole element
      // hanging off the side is.
      const over = Math.max(r.right - vw, -r.left);
      if (over > 4) {
        worst.push({ over: Math.round(over), tag: el.tagName.toLowerCase(),
                     text: ownText.slice(0, 40) });
      }
    }
    worst.sort((a, b) => b.over - a.over);
    // A blank page has no text to overflow — a crashed route would sail
    // through this check greener than a working one. Report how much text
    // actually rendered so emptiness fails instead of passing by default.
    //
    // And no page may ever show the literal text "NaN": it is always some
    // arithmetic run on a field that does not exist — an invented number
    // printed to a customer. The recommendations card did exactly that.
    const text = document.body.innerText;
    return { worst: worst.slice(0, 3), textLen: text.trim().length,
             hasNaN: /\bNaN\b/.test(text) };
  });

  // Measured per element, not from documentElement.scrollWidth.
  //
  // App.css sets `body { overflow-x: hidden }`, which clips the overflow
  // instead of preventing it: scrollWidth never grows, so a scrollWidth
  // assertion passes on every page no matter how far the content hangs off.
  // A 900px canary dropped into this page sat at left:-510 — half of it
  // unreachable — and the check still reported green.
  check(`${name}: لا يخرج نصّ خارج الشاشة`,
    overflow.worst.length === 0 && overflow.textLen >= 40 && !overflow.hasNaN,
    overflow.hasNaN
      ? 'الصفحة تعرض "NaN" — حسبة على حقل غير موجود'
      : overflow.textLen < 40
        ? `الصفحة شبه فارغة (${overflow.textLen} حرفاً) — انهيار أو مسار ميت`
        : overflow.worst.map((w) => `${w.tag}(+${w.over}px) "${w.text}"`).join(' | '));
}

// The admin drawer on a phone must get out of the way once it has done its
// job: pick a destination and the new page used to load BEHIND the drawer,
// which stayed glued over everything — the owner reported exactly that.
// Tapping the dimmed backdrop must close it too.
await page.goto(`${base}/admin/orders`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(900);
await page.click('[data-testid="admin-menu-toggle"]');
await page.waitForTimeout(400);
await page.locator('aside a[href="/admin/products"]').click();
await page.waitForURL('**/admin/products', { timeout: 5000 });
await page.waitForTimeout(500);
const drawerAfterNav = await page.evaluate(() => {
  const el = document.querySelector('[data-testid="admin-sidebar"]');
  return el ? Math.round(el.getBoundingClientRect().width) : -1;
});
check('قائمة اللوحة تُغلق نفسها بعد اختيار وجهة على الهاتف', drawerAfterNav === 0,
  `عرض الدُّرج بعد الانتقال ${drawerAfterNav}px`);

await page.click('[data-testid="admin-menu-toggle"]');
await page.waitForTimeout(400);
// The drawer hugs the inline-start edge — right in RTL, left in LTR — so a
// fixed tap point sits on free backdrop in one direction and on the drawer
// itself in the other. Tap whichever side the drawer left uncovered.
const freeSide = await page.evaluate(() => {
  const r = document.querySelector('[data-testid="admin-sidebar"]').getBoundingClientRect();
  return r.left > window.innerWidth - r.right ? 10 : window.innerWidth - 10;
});
await page.mouse.click(freeSide, 300);
await page.waitForTimeout(400);
const drawerAfterBackdrop = await page.evaluate(() => {
  const el = document.querySelector('[data-testid="admin-sidebar"]');
  return el ? Math.round(el.getBoundingClientRect().width) : -1;
});
check('النقر خارج الدُّرج يُغلقه', drawerAfterBackdrop === 0,
  `عرض الدُّرج بعد نقر الخلفية ${drawerAfterBackdrop}px`);

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

// Opening a page must start it from the top. Client-side navigation keeps
// the previous page's scroll position, so a shopper who reached the bottom
// of one page opened every next page already scrolled to its bottom — the
// owner's exact report: «عند فتح اي صفحة فان النظام ينتقل الى اسفل الصفحة».
// preScroll > 0 keeps the check honest: a home page too short to scroll
// would otherwise pass this with the bug present.
await page.goto(`${base}/`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(700);
const preScroll = await page.evaluate(() => { window.scrollTo(0, 800); return window.scrollY; });
await page.locator('a[href="/products"]:visible').first().click();
await page.waitForURL('**/products', { timeout: 5000 });
await page.waitForTimeout(500);
const postScroll = await page.evaluate(() => window.scrollY);
check('كل صفحة تُفتح من أعلاها لا من حيث تُرك التمرير',
  preScroll > 0 && postScroll === 0,
  `قبل الانتقال ${preScroll}px، بعده ${postScroll}px`);
await page.setViewportSize({ width: 390, height: 844 });

// The server pages the catalogue (limit defaults to 20) and the storefront
// used to fetch once and stop: exactly twenty products no matter the stock —
// the owner's report «فقط يعرض ٢٠ منتج». A full page must arrive, «عرض
// المزيد» must be the element actually under the tap, and tapping it must
// fetch the rest and then remove itself once the catalogue is exhausted.
await page.goto(`${base}/products`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(900);
const firstPage = await page.evaluate(() => document.querySelectorAll('[data-testid^="product-"]').length);
const loadMore = await page.evaluate(() => {
  const el = document.querySelector('[data-testid="load-more-products"]');
  if (!el) return { ok: false, why: 'زر «عرض المزيد» غير موجود' };
  el.scrollIntoView({ block: 'center' });
  const r = el.getBoundingClientRect();
  const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
  const hit = el === top || el.contains(top) || (top && top.contains(el));
  return hit ? { ok: true, why: '' } : { ok: false, why: `مغطّى بعنصر ${top ? top.tagName : 'لا شيء'}` };
});
let catalogueGrew = false;
if (loadMore.ok) {
  await page.locator('[data-testid="load-more-products"]').click();
  try {
    // 30 = the whole mock catalogue: 24 on the first page + 6 on the second.
    await page.waitForFunction(
      () => document.querySelectorAll('[data-testid^="product-"]').length === 30,
      { timeout: 5000 });
    catalogueGrew = true;
  } catch { catalogueGrew = false; }
}
const loadMoreAfter = await page.evaluate(() => !!document.querySelector('[data-testid="load-more-products"]'));
const lmWhy = [];
if (firstPage !== 24) lmWhy.push(`أول جلب ${firstPage} منتجاً بدل 24`);
if (!loadMore.ok) lmWhy.push(loadMore.why);
if (loadMore.ok && !catalogueGrew) lmWhy.push('النقر لم يوصل الكتالوج إلى 30');
if (loadMore.ok && catalogueGrew && loadMoreAfter) lmWhy.push('الزر باقٍ بعد نفاد الكتالوج');
check('صفحة المنتجات تجلب صفحة كاملة و«عرض المزيد» يُكمل الكتالوج ثم يختفي',
  lmWhy.length === 0, lmWhy.join('، '));

// The store opens in English, but the chrome around every page — navbar,
// drawer, footer — carried Arabic written straight into the JSX, so the
// switch changed some words and left the rest: «هناك كلمات لم تتغير».
// Currency symbols (ر.س) are money, not UI copy, and stay exempt.
await page.goto(`${base}/`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(700);
await page.locator('[data-testid="mobile-menu-button"]').click();
await page.waitForTimeout(400);
const arLeaks = await page.evaluate(() => {
  const leaks = [];
  const scan = (sel, label) => {
    const root = document.querySelector(sel);
    if (!root) { leaks.push(`${label}: العنصر غير موجود`); return; }
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const text = walker.currentNode.textContent;
      if (!/[؀-ۿ]/.test(text)) continue;
      const el = walker.currentNode.parentElement;
      if (el && el.closest('[data-testid^="currency"]')) continue;
      leaks.push(`${label}: «${text.trim().slice(0, 40)}»`);
      return;
    }
  };
  scan('nav', 'الشريط والقائمة');
  scan('footer', 'الفوتر');
  return leaks;
});
check('الوضع الإنجليزي إنجليزي فعلاً: لا عربية مثبّتة في الشريط والقائمة والفوتر',
  arLeaks.length === 0, arLeaks.join(' | '));

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

// A Fold's cover display is narrower than anything tested before. 320px is
// the narrowest common phone width, checked in Arabic — the direction that
// actually broke: the language menu was pinned by its LEFT corner, so inside
// the RTL drawer it grew rightward off-screen and dragged the drawer into a
// horizontal scroll that clipped its edges — the owner's photo exactly.
await page.setViewportSize({ width: 320, height: 700 });
await page.goto(`${base}/`, { waitUntil: 'domcontentloaded' });
await page.evaluate(() => localStorage.setItem('language', 'ar'));
await page.goto(`${base}/`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(800);
let narrow;
try {
  await page.locator('[data-testid="mobile-menu-button"]').click();
  await page.waitForSelector('[data-testid="language-toggle"]:visible', { timeout: 5000 });
  await page.locator('[data-testid="language-toggle"]:visible').click();
  await page.waitForSelector('[data-testid="language-menu"]', { timeout: 5000 });
} catch (e) {
  // A missing toggle or menu is this check failing, not the harness dying —
  // the rest of the checks must still run and be reported.
  narrow = { ok: false, why: `تعذّر فتح قائمة اللغات: ${e.message.split('\n')[0]}` };
}
if (!narrow) narrow = await page.evaluate(() => {
  const menu = document.querySelector('[data-testid="language-menu"]');
  const r = menu.getBoundingClientRect();
  if (r.left < -0.5 || r.right > innerWidth + 0.5) {
    return { ok: false, why: `القائمة تمتد من ${Math.round(r.left)} إلى ${Math.round(r.right)} وعرض الشاشة ${innerWidth}` };
  }
  const en = [...menu.querySelectorAll('button')].find((b) => b.textContent.includes('English'));
  if (!en) return { ok: false, why: 'خيار English غير موجود في القائمة' };
  const er = en.getBoundingClientRect();
  const top = document.elementFromPoint(er.left + er.width / 2, er.top + er.height / 2);
  const hit = en === top || en.contains(top) || (top && top.contains(en));
  if (!hit) return { ok: false, why: `الخيار مغطّى بعنصر ${top ? top.tagName : 'لا شيء'}` };
  // The drawer itself must not answer with a horizontal scroll — that is
  // what clipped its edges on the owner's phone. Only elements that clip or
  // scroll (overflow-x other than visible) count: an open dropdown always
  // makes its little relative wrapper "overflow", harmlessly.
  const clipped = [...document.querySelectorAll('nav *')].find((el) =>
    el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflowX !== 'visible');
  if (clipped) return { ok: false, why: `عنصر يقصّ محتواه الأعرض منه بـ${clipped.scrollWidth - clipped.clientWidth}px` };
  return { ok: true, why: '' };
});
check('قائمة اللغات كاملة وقابلة للنقر على أضيق شاشة هاتف (320px) بالوضع العربي',
  narrow.ok, narrow.why);

await browser.close();
server.close();

const failed = results.filter((r) => !r.ok).length;
console.log(failed ? `\n${failed} من ${results.length} فشل` : `\nكل الفحوص تمرّ (${results.length})`);
process.exit(failed ? 1 : 0);
