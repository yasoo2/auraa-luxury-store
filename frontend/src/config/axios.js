import axios from 'axios';
import { resolveApiUrl } from '../api';

// Shared with api.js so both transports agree on the host. An empty fallback
// sent requests to the SPA origin, where the catch-all returns index.html at
// status 200 and every call appears to succeed while returning HTML.
const BACKEND_URL = resolveApiUrl();

// Create axios instance with credentials
const axiosInstance = axios.create({
  baseURL: BACKEND_URL,
  withCredentials: true,
  timeout: 10000
});

// Also set defaults for the default axios instance
axios.defaults.withCredentials = true;
axios.defaults.baseURL = BACKEND_URL;
// A request with no deadline can hang forever. The session check rode the
// bare axios instance during a backend cold start and did exactly that —
// the owner watched the "waking up" spinner for five minutes until a manual
// refresh. 90s covers the slowest observed wake-up with room to spare.
axios.defaults.timeout = 90000;

// Setup axios interceptor for automatic token refresh
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve();
    }
  });
  
  failedQueue = [];
};

// The refresh call rides a BARE client — created here, never given an
// interceptor. Sending it through the interceptored `axios` deadlocked the
// whole app: /auth/me answered 401, the interceptor raised isRefreshing and
// POSTed /auth/refresh, that POST answered 401 too, and the same interceptor
// caught it, saw isRefreshing already true, and parked it in failedQueue —
// a queue only drained AFTER the refresh it was waiting on returned. The two
// waited on each other forever, the promise never settled, and AuthContext's
// `finally` never ran: an eternal spinner on every protected page, which is
// exactly what the owner sat in front of for five minutes.
const refreshClient = axios.create({ baseURL: BACKEND_URL, withCredentials: true, timeout: 20000 });

// Add interceptor to both instances
const setupInterceptor = (instance) => {
  instance.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config || {};

      // If 401 and not already retried, try to refresh
      if (error.response?.status === 401 && !originalRequest._retry) {
        // Auth endpoints answer 401 as a normal verdict, not as a stale
        // session — refreshing on them is meaningless, and refreshing on
        // /auth/refresh itself is the deadlock above. Belt and braces: the
        // bare client above already keeps this path out of here.
        if (originalRequest.url?.includes('/auth/login')
            || originalRequest.url?.includes('/auth/register')
            || originalRequest.url?.includes('/auth/refresh')) {
          return Promise.reject(error);
        }

        if (isRefreshing) {
          // Already refreshing, queue this request
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          })
            .then(() => instance(originalRequest))
            .catch((err) => Promise.reject(err));
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
          // Try to refresh token — bare client, no interceptor, no recursion.
          const { data } = await refreshClient.post('/api/auth/refresh', {});

          // Adopt the new token everywhere the old one lives. Refreshing used
          // to renew only the cookie, while AuthContext keeps a global
          // Authorization header built from localStorage — so the retry below
          // replayed the very token that had just expired, and the server
          // (which reads the header first) rejected it again. The loop could
          // not end: refresh succeeded every time and nothing ever changed.
          if (data?.access_token) {
            // The header first, storage second: a browser that throws on
            // localStorage (private mode, tracking prevention) must not turn
            // a SUCCESSFUL refresh into a failed one.
            axios.defaults.headers.common['Authorization'] = `Bearer ${data.access_token}`;
            axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${data.access_token}`;
            if (originalRequest.headers) {
              originalRequest.headers['Authorization'] = `Bearer ${data.access_token}`;
            }
            try { localStorage.setItem('token', data.access_token); } catch { /* blocked */ }
          }

          processQueue(null);
          isRefreshing = false;

          // Retry original request
          return instance(originalRequest);
        } catch (refreshError) {
          processQueue(refreshError);
          isRefreshing = false;

          // The stale credentials go; the page stays. This used to force
          // `window.location.href = '/'` on every failed refresh — a full
          // browser navigation triggered by a background call. A guest
          // reading /products (401 on /auth/me is the NORMAL state for a
          // guest) was thrown back to the home page mid-scroll, and on the
          // home page the same failure re-assigned the same URL: a reload
          // loop. React's own guards handle this properly — ProtectedRoute
          // sends the visitor to /auth, storefront pages simply render as
          // guest.
          delete axios.defaults.headers.common['Authorization'];
          delete axiosInstance.defaults.headers.common['Authorization'];
          try { localStorage.removeItem('token'); } catch { /* blocked */ }
          return Promise.reject(refreshError);
        }
      }

      return Promise.reject(error);
    }
  );
};

// Setup interceptors
setupInterceptor(axios);
setupInterceptor(axiosInstance);

export { axiosInstance };
export default axios;
