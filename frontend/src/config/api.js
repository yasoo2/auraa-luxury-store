/**
 * API Configuration
 * Re-export from api.js for backward compatibility
 */

import api, { 
  apiFetch, 
  apiGet, 
  apiPost, 
  apiPut, 
  apiDelete,
  getApiUrl,
  hasApiKey 
} from '../api';

export default api;

export {
  apiFetch,
  apiGet,
  apiPost,
  apiPut,
  apiDelete,
  getApiUrl,
  hasApiKey
};
