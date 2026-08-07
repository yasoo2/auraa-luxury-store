import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Note: axios is already configured globally in /config/axios.js
// All requests will automatically include credentials (cookies)

// Auth travels two ways and both must work:
//  - HttpOnly cookies, used by api.js (bare fetch, no header) and by
//    checkAuthStatus so the session survives a reload.
//  - `Authorization: Bearer` from localStorage, which the admin pages
//    (AdminManagement, AutoUpdatePage, ProductFormModal, ...) read directly.
// This context previously stored no token at all, so every one of those pages
// sent `Bearer null` and got a 401.
const TOKEN_KEY = 'token';

const storeToken = (token) => {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      localStorage.removeItem(TOKEN_KEY);
      delete axios.defaults.headers.common['Authorization'];
    }
  } catch (e) {
    // Private browsing can throw on localStorage writes; cookies still work.
    console.warn('Could not persist auth token:', e);
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const BACKEND_URL = API_BASE_URL;
  // Check auth status on mount (cookie, or a stored token if one survives)
  const checkAuthStatus = useCallback(async () => {
    try {
      const stored = localStorage.getItem(TOKEN_KEY);
      if (stored) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${stored}`;
      }

      const response = await axios.get(`${BACKEND_URL}/api/auth/me`, {
        withCredentials: true
      });

      console.log('✅ User authenticated:', response.data);
      setUser(response.data);
    } catch (error) {
      console.log('❌ Not authenticated');
      storeToken(null);
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

      storeToken(response.data.access_token);
      const userData = response.data.user;
      setUser(userData);

      return { success: true, user: userData };
    } catch (error) {
      console.error('Login error:', error);
      
      if (error.response?.status === 401) {
        return { success: false, error: 'wrong_password' };
      } else if (error.response?.status === 404) {
        return { success: false, error: 'account_not_found' };
      } else if (error.response?.status === 429) {
        return { success: false, error: 'too_many_requests' };
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

      storeToken(response.data.access_token);
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
      // Clear locally even if the request failed, so the UI cannot be left
      // showing a signed-in state the server no longer honours.
      storeToken(null);
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
