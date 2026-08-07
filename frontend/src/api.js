/**
 * Centralized API Helper for Auraa Luxury
 * 
 * Uses environment variables for configuration:
 * - REACT_APP_API_URL or REACT_APP_BACKEND_URL: Backend API base URL
 * 
 * Authentication is handled via JWT tokens in HttpOnly cookies.
 * All requests automatically include credentials for cookie-based auth.
 */

// Production API host, used when no build-time env var was provided.
const PRODUCTION_API_URL = 'https://api.auraaluxury.com';

/**
 * Resolve the API base URL.
 *
 * Falling back to '' was silently destructive on Cloudflare Pages: relative
 * calls like /api/products hit the SPA catch-all (`/* /index.html 200`), which
 * answers with the HTML page at status 200. Every request then "succeeded"
 * while returning markup, so the frontend parsed HTML as JSON and the whole
 * site failed with no obvious error.
 */
export function resolveApiUrl() {
  const configured = process.env.REACT_APP_API_URL || process.env.REACT_APP_BACKEND_URL;
  if (configured) return configured.replace(/\/+$/, '');

  if (typeof window !== 'undefined') {
    const { hostname } = window.location;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:8001';
    }
    console.warn(
      'REACT_APP_BACKEND_URL was not set at build time; falling back to ' +
      `${PRODUCTION_API_URL}. Set it in the deployment environment.`
    );
    return PRODUCTION_API_URL;
  }

  return PRODUCTION_API_URL;
}

/**
 * Resolved API base URL. Import this instead of reading the env var directly:
 * `process.env.REACT_APP_BACKEND_URL` is `undefined` when unset, and
 * `${undefined}/api/products` builds the literal path "undefined/api/products".
 */
export const API_BASE_URL = resolveApiUrl();

const API_URL = API_BASE_URL;

/**
 * Make API requests with consistent configuration
 * 
 * @param {string} path - API endpoint path (e.g., "/products")
 * @param {Object} options - Fetch options (method, body, headers, etc.)
 * @returns {Promise<any>} - Parsed JSON response
 * @throws {Error} - If request fails
 */
export async function apiFetch(path, options = {}) {
  // Ensure path starts with /
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  
  // Build headers
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Build full URL
  const url = `${API_URL}${cleanPath}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include', // Include cookies for auth
    });

    // Check if response is ok
    if (!response.ok) {
      const text = await response.text();
      let errorMessage = `API error ${response.status}`;
      
      // Try to parse error message
      try {
        const errorJson = JSON.parse(text);
        errorMessage = errorJson.detail || errorJson.message || errorJson.error || errorMessage;
      } catch {
        errorMessage = text || errorMessage;
      }
      
      throw new Error(errorMessage);
    }

    // Parse JSON response
    return await response.json();
  } catch (error) {
    // Re-throw with context
    console.error(`API Fetch Error [${options.method || 'GET'} ${cleanPath}]:`, error);
    throw error;
  }
}

/**
 * GET request helper
 */
export async function apiGet(path, options = {}) {
  return apiFetch(path, { ...options, method: 'GET' });
}

/**
 * POST request helper
 */
export async function apiPost(path, data, options = {}) {
  return apiFetch(path, {
    ...options,
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * PUT request helper
 */
export async function apiPut(path, data, options = {}) {
  return apiFetch(path, {
    ...options,
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * DELETE request helper
 */
export async function apiDelete(path, options = {}) {
  return apiFetch(path, { ...options, method: 'DELETE' });
}

/**
 * Get current API URL (for debugging)
 */
export function getApiUrl() {
  return API_URL;
}

// Export default
export default {
  fetch: apiFetch,
  get: apiGet,
  post: apiPost,
  put: apiPut,
  delete: apiDelete,
  getUrl: getApiUrl,
};
