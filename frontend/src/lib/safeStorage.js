/**
 * localStorage and sessionStorage that cannot throw.
 *
 * Both throw a SecurityError rather than returning null when the browser
 * refuses access — Edge's Tracking Prevention, Safari's ITP, Firefox in strict
 * mode, or anyone browsing with cookies switched off. Every access in this app
 * was bare, so a single blocked read took down whatever was running.
 *
 * It cost a real sign-in: Google returned, the server issued a token, and
 * `localStorage.setItem('token', …)` threw. Control jumped to the catch, which
 * called a failure handler that read localStorage again, which threw again with
 * nobody left to catch it — and the page sat on "Signing you in…" forever, on a
 * session that had actually succeeded.
 *
 * The session itself lives in an HttpOnly cookie, so the app works without any
 * of this. Storage is a convenience, and a convenience must never be able to
 * break the thing it is convenient for.
 */

const memory = new Map();

function pick(kind) {
  try {
    return kind === 'session' ? window.sessionStorage : window.localStorage;
  } catch (err) {
    return null;
  }
}

function read(kind, key) {
  const store = pick(kind);
  if (store) {
    try {
      return store.getItem(key);
    } catch (err) {
      // fall through to the in-memory copy
    }
  }
  return memory.has(`${kind}:${key}`) ? memory.get(`${kind}:${key}`) : null;
}

function write(kind, key, value) {
  // Remember it either way: when storage is blocked this keeps the value alive
  // for the rest of the page's life, which is enough for a sign-in to finish.
  memory.set(`${kind}:${key}`, String(value));
  const store = pick(kind);
  if (!store) return false;
  try {
    store.setItem(key, String(value));
    return true;
  } catch (err) {
    return false;
  }
}

function drop(kind, key) {
  memory.delete(`${kind}:${key}`);
  const store = pick(kind);
  if (!store) return;
  try {
    store.removeItem(key);
  } catch (err) {
    /* nothing to undo */
  }
}

export const safeLocal = {
  get: (key) => read('local', key),
  set: (key, value) => write('local', key, value),
  remove: (key) => drop('local', key),
};

export const safeSession = {
  get: (key) => read('session', key),
  set: (key, value) => write('session', key, value),
  remove: (key) => drop('session', key),
};

/** Whether the browser is letting us persist anything at all. */
export const storageIsWritable = () => {
  const store = pick('local');
  if (!store) return false;
  try {
    store.setItem('__auraa_probe__', '1');
    store.removeItem('__auraa_probe__');
    return true;
  } catch (err) {
    return false;
  }
};
