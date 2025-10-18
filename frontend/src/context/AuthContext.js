import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

  // Set axios default headers if token exists
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  // Check if user is logged in on app start
  useEffect(() => {
    const checkAuthStatus = async () => {
      if (token) {
        try {
          const response = await axios.get(`${BACKEND_URL}/api/auth/me`);
          console.log('Token validation response:', response.data);
          console.log('User is_admin from /me endpoint:', response.data.is_admin);
          setUser(response.data);
        } catch (error) {
          console.error('Token validation failed:', error);
          logout();
        }
      }
      setLoading(false);
    };

    checkAuthStatus();
  }, [token, BACKEND_URL]);

  const login = async (emailOrCredentials, password, turnstileToken = null) => {
    try {
      // Support both single object and separate email/password parameters
      let credentials;
      if (typeof emailOrCredentials === 'string') {
        credentials = { 
          identifier: emailOrCredentials, 
          password: password
        };
        if (turnstileToken) {
          credentials.turnstile_token = turnstileToken;
        }
      } else {
        credentials = { 
          identifier: emailOrCredentials.email, 
          password: emailOrCredentials.password 
        };
        if (emailOrCredentials.turnstile_token) {
          credentials.turnstile_token = emailOrCredentials.turnstile_token;
        }
      }

      const response = await axios.post(`${BACKEND_URL}/api/auth/login`, credentials);
      const { access_token, user: userData } = response.data;
      
      // Store token and update state immediately
      localStorage.setItem('token', access_token);
      setToken(access_token);
      setUser(userData);
      
      return { success: true };
    } catch (error) {
      console.error('Login failed:', error);
      return {
        success: false,
        error: error.response?.data?.detail || 'فشل تسجيل الدخول'
      };
    }
  };

  const register = async (userData) => {
    try {
      const response = await axios.post(`${BACKEND_URL}/api/auth/register`, userData);
      const { access_token, user: newUser } = response.data;
      
      console.log('Registration successful, user data:', newUser);
      
      setToken(access_token);
      setUser(newUser);
      localStorage.setItem('token', access_token);
      
      return { success: true };
    } catch (error) {
      console.error('Registration failed:', error);
      return {
        success: false,
        error: error.response?.data?.detail || 'فشل في إنشاء الحساب'
      };
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('wishlist'); // Clear wishlist on logout
    delete axios.defaults.headers.common['Authorization'];
  };

  const value = {
    user,
    token,
    login,
    register,
    logout,
    loading,
    isAuthenticated: !!user,
    isAdmin: user?.is_admin || false
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;