import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Configure axios for cookie-based auth
axios.defaults.withCredentials = true;

// Setup axios interceptor for automatic token refresh
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  
  failedQueue = [];
};

axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and not already retried, try to refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => {
            return axios(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

      try {
        // Try to refresh token
        await axios.post(`${BACKEND_URL}/api/auth/refresh`, {}, {
          withCredentials: true
        });
        
        processQueue(null, null);
        isRefreshing = false;
        
        // Retry original request
        return axios(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        isRefreshing = false;
        
        // Refresh failed, redirect to login
        window.location.href = '/';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

  // Check auth status on mount (using cookie)
  const checkAuthStatus = useCallback(async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/auth/me`, {
        withCredentials: true
      });
      
      console.log('✅ User authenticated:', response.data);
      setUser(response.data);
    } catch (error) {
      console.log('❌ Not authenticated');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [BACKEND_URL]);

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  const login = async (identifier, password, turnstileToken, rememberMe = false) => {
    try {
      console.log(`🔐 Logging in as: ${identifier}`);
      
      const credentials = {
        identifier,
        password,
        remember_me: rememberMe
      };

      if (turnstileToken) {
        credentials.turnstile_token = turnstileToken;
      }

      const response = await axios.post(
        `${BACKEND_URL}/api/auth/login`,
        credentials,
        { withCredentials: true }
      );

      console.log('✅ Login successful:', response.data);
      
      const userData = response.data.user;
      setUser(userData);

      return { success: true, user: userData };
    } catch (error) {
      console.error('Login error:', error);
      
      if (error.response?.status === 401) {
        return { success: false, error: 'wrong_password' };
      } else if (error.response?.status === 404) {
        return { success: false, error: 'account_not_found' };
      } else {
        return { success: false, error: 'login_failed' };
      }
    }
  };

  const register = async (userData, turnstileToken) => {
    try {
      console.log('📝 Registering new user:', userData.email || userData.phone);

      const registrationData = {
        ...userData,
        remember_me: userData.remember_me || false
      };

      if (turnstileToken) {
        registrationData.turnstile_token = turnstileToken;
      }

      const response = await axios.post(
        `${BACKEND_URL}/api/auth/register`,
        registrationData,
        { withCredentials: true }
      );

      console.log('✅ Registration successful:', response.data);
      
      const newUser = response.data.user;
      setUser(newUser);

      return { success: true, user: newUser };
    } catch (error) {
      console.error('❌ Registration error:', error);
      
      if (error.response?.data?.detail) {
        return { success: false, error: error.response.data.detail };
      }
      
      return { success: false, error: 'registration_failed' };
    }
  };

  const logout = async () => {
    try {
      await axios.post(
        `${BACKEND_URL}/api/auth/logout`,
        {},
        { withCredentials: true }
      );
      
      console.log('✅ Logged out successfully');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
    }
  };

  const value = {
    user,
    setUser,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!user,
    isAdmin: user?.is_admin || false,
    isSuperAdmin: user?.is_super_admin || false,
    checkAuthStatus
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
