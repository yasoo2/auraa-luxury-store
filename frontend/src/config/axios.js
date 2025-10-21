import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';

// Create axios instance with credentials
const axiosInstance = axios.create({
  baseURL: BACKEND_URL,
  withCredentials: true,
  timeout: 10000
});

// Also set defaults for the default axios instance
axios.defaults.withCredentials = true;
axios.defaults.baseURL = BACKEND_URL;

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

// Add interceptor to both instances
const setupInterceptor = (instance) => {
  instance.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;

      // If 401 and not already retried, try to refresh
      if (error.response?.status === 401 && !originalRequest._retry) {
        // Skip refresh for auth endpoints
        if (originalRequest.url?.includes('/auth/login') || 
            originalRequest.url?.includes('/auth/register')) {
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
          // Try to refresh token
          await axios.post(`${BACKEND_URL}/api/auth/refresh`, {}, {
            withCredentials: true
          });
          
          processQueue(null);
          isRefreshing = false;
          
          // Retry original request
          return instance(originalRequest);
        } catch (refreshError) {
          processQueue(refreshError);
          isRefreshing = false;
          
          // Refresh failed, redirect to login only if not already on login page
          if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
            window.location.href = '/';
          }
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
