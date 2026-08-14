/**
 * Does every API path the shop calls actually exist on the server?
 *
 * The repo's first rule says a screen must not stay in the shop while calling a
 * path nobody wrote — either the path gets written or the screen goes. Nothing
 * enforced it, and the cost was visible on the storefront: a 654-line live-chat
 * widget, with voice notes, file attachments, a video-call button and a star
 * rating, calling four endpoints that were never written. Every one answered
 * 404. A visitor typed a question to a shop that could not hear it.
 *
 * This walks the frontend source for `/api/...` literals and compares them with
 * the paths FastAPI actually registers. A path parameter matches anything in
 * that segment, so `/api/products/${id}` matches `/api/products/{product_id}`.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = process.argv[2] || 'frontend/src';
const BACKEND = process.argv[3] || 'backend';
const REPO_ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

// ---- what the server registers -------------------------------------------
let registered;
try {
  const python = fs.existsSync(path.join(BACKEND, 'venv/bin/python'))
    ? path.resolve(BACKEND, 'venv/bin/python')
    : 'python3';
  const routeScript = path.join(REPO_ROOT, 'scripts/list-backend-routes.py');
  const out = execFileSync(python, [routeScript], {
    cwd: BACKEND,
    encoding: 'utf8',
    env: {
      ...process.env,
      MONGO_URL: process.env.MONGO_URL || 'mongodb://localhost:27017',
      DB_NAME: process.env.DB_NAME || 'verify',
      JWT_SECRET_KEY: process.env.JWT_SECRET_KEY || 'local-verify-secret',
      ENV: 'test',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  registered = JSON.parse(out.trim().split('\n').pop());
} catch (e) {
  console.log(`⏭️  تعذّر تحميل الخادم لقراءة مساراته — تخطّي الفحص\n${String(e.message).split('\n')[0]}`);
  process.exit(2);
}

// A registered path becomes a matcher: {param} swallows one segment.
const matchers = registered.map((p) =>
  new RegExp(`^${p.replace(/\{[^}]+\}/g, '[^/]+').replace(/\/$/, '/?')}/?$`));

// ---- what the frontend calls ---------------------------------------------
const sources = [];
const walk = (dir) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== 'node_modules') walk(full); }
    else if (/\.jsx?$/.test(e.name)) sources.push(full);
  }
};
walk(ROOT);

const called = new Map();   // path → files that call it
// Comments are not calls. Without this, writing down which dead route was
// removed — in the very comment explaining why it was removed — re-creates the
// violation and the check never goes green again.
const stripComments = (text) => text
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/(^|[^:'"`])\/\/[^\n]*/g, '$1 ');

for (const file of sources) {
  const text = stripComments(fs.readFileSync(file, 'utf8'));
  // `/api/...` wherever it appears, including inside a template literal after
  // a base-URL interpolation: `${API}/chat/initialize` reads as `/chat/...`,
  // so the API-prefixed forms and the bare ones are both collected.
  for (const m of text.matchAll(/[`'"](?:\$\{[^}]*\})?(\/api\/[a-zA-Z0-9/_${}.-]*)/g)) {
    record(m[1], file);
  }
  for (const m of text.matchAll(/\$\{API\}(\/[a-zA-Z0-9/_${}.-]*)/g)) {
    // `API` means two different things across this codebase: in Navbar.js it is
    // `${BACKEND_URL}/api`, so `${API}/products` is /api/products; in
    // ForgotPassword.js it is the bare host, and the file writes
    // `${API}/api/auth/...` itself. Prefixing that second form produced the
    // phantom `/api/api/auth/forgot-password` and failed the gate on a path
    // that is perfectly correct — the checker's bug, not the shop's.
    if (m[1].startsWith('/api/')) continue;   // pass one already recorded it
    record(`/api${m[1]}`, file);
  }
}

function record(raw, file) {
  // Drop interpolations: `${id}` is a value, and the segment it fills is what
  // the matcher already allows.
  let p = raw.replace(/\$\{[^}]*\}/g, ':x').replace(/\/+$/, '');
  if (!p.startsWith('/api/')) return;
  if (p.includes('?')) p = p.slice(0, p.indexOf('?'));
  if (!called.has(p)) called.set(p, new Set());
  called.get(p).add(path.relative(ROOT, file));
}

/**
 * Gaps that are known, named, and still open.
 *
 * This list exists so the check can be a real gate today instead of "one day":
 * anything NOT on it fails the build immediately, and everything on it is
 * printed on every single run so it cannot quietly become permanent. Adding a
 * line here is a decision to leave a screen broken — it needs a reason, and
 * the list is meant to shrink.
 */
const KNOWN_GAPS = {};

const missing = [];
const known = [];
for (const [p, files] of called) {
  const probe = p.replace(/:x/g, 'x');
  if (matchers.some((re) => re.test(probe))) continue;
  const line = `${p}  ←  ${[...files].join('، ')}`;
  if (KNOWN_GAPS[p]) known.push(`${line}\n      ${KNOWN_GAPS[p]}`);
  else missing.push(line);
}

if (known.length) {
  console.log(`\n⚠️  ${known.length} ثغرة معروفة ما تزال مفتوحة:`);
  for (const k of known) console.log(`   ${k}`);
}
// الثغرة تُغلَق بأحد أمرين: أن يُكتب المسار في الخادم، أو أن تكفّ الواجهة
// عن ندائه. كان هذا يفحص الثاني وحده، فيبقى المسار مذكوراً في القائمة بعد
// كتابته — والقائمة التي لا تنكمش تصير مكاناً يُخبّأ فيه.
for (const p of Object.keys(KNOWN_GAPS)) {
  const stillOpen = known.some((line) => line.startsWith(`${p}  ←`));
  if (!stillOpen) {
    console.log(`\n🎉 ثغرة أُغلقت — احذف «${p}» من KNOWN_GAPS في هذا الملف.`);
  }
}

console.log(`فُحص ${called.size} مساراً تناديها الواجهة مقابل ${registered.length} مسجَّلاً في الخادم`);
if (missing.length) {
  console.log(`\n❌ ${missing.length} مساراً تناديه الواجهة ولا وجود له في الخادم:`);
  for (const m of missing) console.log(`   ${m}`);
  process.exit(1);
}
console.log('✅ كل مسار تناديه الواجهة مكتوب في الخادم');
