/**
 * Centralized API Helper for Auraa Luxury
 * 
 * Uses environment variables for configuration:
 * - REACT_APP_API_URL: Backend API base URL
 * - REACT_APP_X_API_KEY: Optional API key for authentication
 */

const API_URL = process.env.REACT_APP_API_URL || process.env.REACT_APP_BACKEND_URL || '';
const API_KEY = process.env.REACT_APP_X_API_KEY;

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
    ...(API_KEY ? { 'x-api-key': API_KEY } : {}),
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

/**
 * Check if API key is configured
 */
export function hasApiKey() {
  return !!API_KEY;
}

// Export default
export default {
  fetch: apiFetch,
  get: apiGet,
  post: apiPost,
  put: apiPut,
  delete: apiDelete,
  getUrl: getApiUrl,
  hasApiKey,
};
