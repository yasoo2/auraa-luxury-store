import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';

// Playwright is not a dependency of this repo — it is usually installed
// globally, which neither ESM nor CJS resolution reaches from here. Find it, or
// exit 2 so verify.sh can say "skipped" out loud. Silently passing a check that
// never ran is the one outcome that must not happen.
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
  console.log('⏭️  playwright غير مثبَّت — تخطّي فحص عامل الخدمة (npm i -g playwright)');
  process.exit(2);
}
const { chromium } = playwright;

// The question is not "does the service worker have a fetch handler" but
// "when the network dies on /profile, does the user get a page or a crash".
const ROOT = process.argv[2] || 'frontend/build';
const PORT = 4188;

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
                '.json': 'application/json', '.svg': 'image/svg+xml', '.txt': 'text/plain' };

let offline = false;
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  if (offline) { req.destroy(); return; }              // the network is gone

  if (url.pathname.startsWith('/api/')) {              // a real authenticated reply
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ id: 'u1', email: 'owner@auraaluxury.com', is_admin: true }));
    return;
  }

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
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await ctx.newPage();

// The "Failed to convert value to 'Response'" TypeError is thrown inside the
// worker, not the page — listening on the page alone made this check incapable
// of failing, which is worse than not having it.
const swErrors = [];
const watch = (t) => {
  if (/Failed to convert value to 'Response'|resulted in a network error/.test(t)) swErrors.push(t);
};
ctx.on('serviceworker', (worker) => {
  worker.on('console', (m) => watch(m.text()));
  worker.on('pageerror', (e) => watch(String(e)));
});
page.on('console', (m) => watch(m.text()));
page.on('pageerror', (e) => watch(String(e)));

// 1. install and take control
await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'load' });
const controlled = await page.evaluate(async () => {
  await navigator.serviceWorker.ready;
  for (let i = 0; i < 60 && !navigator.serviceWorker.controller; i++) await new Promise(r => setTimeout(r, 100));
  return Boolean(navigator.serviceWorker.controller);
});
check('العامل يُثبَّت ويتحكّم بالصفحة', controlled);

// 2. exercise the API through the worker, then prove it was not cached
await page.evaluate(() => fetch('/api/auth/me').then(r => r.json()));
const cachedApi = await page.evaluate(async () => {
  const out = [];
  for (const name of await caches.keys()) {
    const keys = await (await caches.open(name)).keys();
    out.push(...keys.map(k => new URL(k.url).pathname).filter(p => p.startsWith('/api/')));
  }
  return out;
});
check('لا يُخزَّن أيّ ردّ من /api/ في الكاش', cachedApi.length === 0, cachedApi.join(', '));

// 3. a first visit must not reload itself
const reloads = await page.evaluate(() => performance.getEntriesByType('navigation').filter(n => n.type === 'reload').length);
check('الزيارة الأولى لا تُعيد تحميل نفسها', reloads === 0, `reloads=${reloads}`);

// 3b. A deep route while ONLINE must answer 200 — from the network or from the
// cached shell, both of which render the app. What must never happen is the
// 503 fallback, which is what a live store reported on /products.
//
// Deliberately not asserting "came from the network": serving the cached shell
// is also correct, so an assertion that forbade it would fail on right
// behaviour. The header names the cause whenever the fallback does fire.
for (const route of ['/products', '/profile']) {
  const res = await page.goto(`http://127.0.0.1:${PORT}${route}`, { waitUntil: 'domcontentloaded' });
  const status = res?.status();
  const why = res?.headers()['x-sw-fallback-reason'];
  check(`${route} متّصلاً يُعطي الصفحة لا 503`, status === 200,
    `status=${status}${why ? ` reason=${why}` : ''}`);
}

// 4. the reported bug, reproduced under the condition that actually causes it:
//    the network is gone AND the offline page is not in the cache. Browsers
//    evict Cache Storage under pressure, and a version bump deletes the old
//    cache — so "the fallback is always there" is an assumption, not a fact.
//    With the fallback present the old worker looked fine, which is why this
//    check evicts it first.
await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'load' });
await page.evaluate(async () => {
  await navigator.serviceWorker.ready;
  for (const name of await caches.keys()) {
    const cache = await caches.open(name);
    await cache.delete('/offline.html');
    await cache.delete('/');
  }
});
offline = true;
swErrors.length = 0;

// 5 first, while this page is still alive: a non-document request offline must
// still resolve to a Response rather than reject.
const assetOk = await page.evaluate(() =>
  fetch('/definitely-not-cached-' + Math.random() + '.png')
    .then(r => ({ ok: true, status: r.status }))
    .catch(e => ({ ok: false, error: String(e) })));
check('طلب مورد غير مخزَّن بلا شبكة يُرجع Response', assetOk.ok === true, JSON.stringify(assetOk));

// ...then the navigation, which destroys this execution context if it fails.
let navFailed = null;
try {
  await page.goto(`http://127.0.0.1:${PORT}/profile`, { waitUntil: 'domcontentloaded', timeout: 15000 });
} catch (e) { navFailed = e.message.split('\n')[0]; }

const body = navFailed ? '' : await page.textContent('body').catch(() => '');
const gotSomething = !navFailed && body.trim().length > 0;
check('التنقّل إلى /profile بلا شبكة يُعطي صفحة لا خطأ شبكة', gotSomething,
  navFailed || `body=${body.slice(0, 60).replace(/\s+/g, ' ')}`);

// There is deliberately no check on the "Failed to convert value to 'Response'"
// console text. Chromium raises it inside the worker and Playwright does not
// surface it here, so the assertion passed against the broken worker too — a
// green tick that cannot go red is worse than no tick. net::ERR_FAILED on the
// navigation above is the same defect, observed where it actually bites.
if (swErrors.length) console.log(`   (worker noise: ${swErrors.join(' | ').slice(0, 160)})`);

offline = false;
await browser.close();
server.close();

const failed = results.filter(r => !r.ok);
console.log(failed.length ? `\n${failed.length} of ${results.length} checks failed` : `\nall ${results.length} checks pass`);
process.exit(failed.length ? 1 : 0);
