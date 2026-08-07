/**
 * API Configuration
 * Re-export from api.js for backward compatibility
 */

// `hasApiKey` was imported here but never exported by ../api, which produced a
// webpack "export not found" warning and an undefined binding at runtime.
import api, {
  apiFetch,
  apiGet,
  apiPost,
  apiPut,
  apiDelete,
  getApiUrl
} from '../api';

export default api;

export {
  apiFetch,
  apiGet,
  apiPost,
  apiPut,
  apiDelete,
  getApiUrl
};
