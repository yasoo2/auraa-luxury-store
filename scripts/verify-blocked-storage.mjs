/**
 * The store must survive a browser that refuses storage.
 *
 * Edge's Tracking Prevention, Safari's ITP and private mode all make
 * localStorage *throw* rather than return null. Every access in this app was
 * bare, and it cost a real sign-in: Google returned, the server issued a token,
 * `localStorage.setItem` threw, control jumped to the catch — which read
 * localStorage again and threw again with nobody left to catch it. The page sat
 * on "Signing you in…" forever, on a session that had actually succeeded.
 *
 *   node scripts/verify-blocked-storage.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const src = fs.readFileSync(path.join(root, 'frontend/src/lib/safeStorage.js'), 'utf8');

// A browser that refuses everything, the way Edge does.
const hostile = {
  getItem() { throw new DOMException('blocked', 'SecurityError'); },
  setItem() { throw new DOMException('blocked', 'SecurityError'); },
  removeItem() { throw new DOMException('blocked', 'SecurityError'); },
};

const body = src.replace(/export const |export function |export /g, '');
const context = vm.createContext({
  window: { get localStorage() { return hostile; }, get sessionStorage() { return hostile; } },
  DOMException,
  console,
});
vm.runInContext(`${body}\nglobalThis.__api = { safeLocal, safeSession, storageIsWritable };`, context);
const { safeLocal, safeSession, storageIsWritable } = context.__api;

const checks = [];
const check = (name, fn) => {
  try {
    const ok = fn();
    checks.push({ name, ok });
    console.log(`${ok ? '✅' : '❌'} ${name}`);
  } catch (err) {
    checks.push({ name, ok: false });
    console.log(`❌ ${name} — رمى: ${err.message}`);
  }
};

check('القراءة لا ترمي حين تُمنع', () => safeLocal.get('token') === null);
check('الكتابة لا ترمي حين تُمنع', () => safeLocal.set('token', 'abc') === false);
check('القيمة المكتوبة تبقى متاحة لبقية الصفحة', () => safeLocal.get('token') === 'abc');
check('الحذف لا يرمي', () => { safeLocal.remove('token'); return safeLocal.get('token') === null; });
check('الجلسة كذلك', () => { safeSession.set('auth_redirect', '/cart'); return safeSession.get('auth_redirect') === '/cart'; });
check('يقول بصدق إنّ التخزين ممنوع', () => storageIsWritable() === false);

const failed = checks.filter((c) => !c.ok).length;
console.log(failed ? `\n${failed} من ${checks.length} فشل` : `\nكل الفحوص تمرّ (${checks.length})`);
process.exit(failed ? 1 : 0);
