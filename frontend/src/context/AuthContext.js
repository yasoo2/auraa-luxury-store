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

// Note: axios is already configured globally in /config/axios.js
// All requests will automatically include credentials (cookies)

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
