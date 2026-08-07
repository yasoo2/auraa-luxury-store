/**
 * Where the OAuth `state` lives between leaving for Google and coming back.
 *
 * This used to be sessionStorage, and on the live site the check failed every
 * single time: the value sent to Google came back identical in the URL, yet
 * sessionStorage read back empty. sessionStorage is scoped per *tab* and per
 * exact origin — auraaluxury.com and www.auraaluxury.com are two separate
 * buckets — so a redirect that lands on the other host, a restored tab, or a
 * browser that re-creates the context loses it. And losing it is not a small
 * thing: a brand-new customer, with no session to fall back on, could never
 * finish signing in.
 *
 * A cookie on the registrable domain survives all of that: both hosts share
 * it, it outlives the tab, and SameSite=Lax still sends it on the top-level
 * GET redirect Google performs.
 */

const KEY = 'auraa_oauth_state';
const REDIRECT_KEY = 'auraa_oauth_redirect';
const MAX_AGE_SECONDS = 600; // a sign-in that takes longer than this is stale

// ".auraaluxury.com" covers both the apex and www. Left empty for localhost
// and bare IPs, where a Domain attribute is invalid.
const cookieDomain = () => {
  const host = window.location.hostname;
  if (host === 'localhost' || /^[\d.]+$/.test(host)) return '';
  const bare = host.replace(/^www\./, '');
  return bare.includes('.') ? `; Domain=.${bare}` : '';
};

const write = (name, value) => {
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie =
    `${name}=${encodeURIComponent(value)}; Max-Age=${MAX_AGE_SECONDS}; Path=/; SameSite=Lax${secure}${cookieDomain()}`;
};

const read = (name) => {
  const hit = document.cookie
    .split('; ')
    .find((c) => c.startsWith(`${name}=`));
  return hit ? decodeURIComponent(hit.slice(name.length + 1)) : null;
};

const clear = (name) => {
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax${secure}${cookieDomain()}`;
};

export const rememberOAuthStart = (state, redirectUri) => {
  write(KEY, state);
  write(REDIRECT_KEY, redirectUri);
  // sessionStorage too, purely as a second chance for a sign-in already in
  // flight when this deploys. Either source is equally trusted: the only
  // question the check asks is whether this browser is the one that started.
  try {
    sessionStorage.setItem(KEY, state);
    sessionStorage.setItem(REDIRECT_KEY, redirectUri);
  } catch {
    // Private mode with storage disabled — the cookie carries it.
  }
};

export const readOAuthStart = () => {
  let state = read(KEY);
  let redirectUri = read(REDIRECT_KEY);
  if (!state) {
    try {
      state = sessionStorage.getItem(KEY);
      redirectUri = redirectUri || sessionStorage.getItem(REDIRECT_KEY);
    } catch {
      /* ignore */
    }
  }
  return { state, redirectUri };
};

export const clearOAuthStart = () => {
  clear(KEY);
  clear(REDIRECT_KEY);
  try {
    sessionStorage.removeItem(KEY);
    sessionStorage.removeItem(REDIRECT_KEY);
  } catch {
    /* ignore */
  }
};

export const newOAuthState = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
