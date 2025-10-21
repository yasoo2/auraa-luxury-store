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
      // Try to get token from localStorage first
      const storedToken = localStorage.getItem('token');
      
      try {
        // Call /auth/me with credentials to check both cookie and token
        const response = await axios.get(`${BACKEND_URL}/api/auth/me`, {
          withCredentials: true, // Send cookies
          headers: storedToken ? { 'Authorization': `Bearer ${storedToken}` } : {}
        });
        
        console.log('✅ User authenticated:', response.data);
        console.log('User is_admin:', response.data.is_admin);
        console.log('User is_super_admin:', response.data.is_super_admin);
        
        setUser(response.data);
        
        // If we got a valid response but don't have token in localStorage,
        // it means we're authenticated via cookie only
        if (!storedToken && response.data) {
          console.log('✅ Authenticated via cookie');
        }
      } catch (error) {
        console.error('❌ Auth check failed:', error.response?.status, error.response?.data);
        // Clear invalid token
        if (storedToken) {
          localStorage.removeItem('token');
          setToken(null);
        }
        setUser(null);
      }
      
      setLoading(false);
    };

    checkAuthStatus();
  }, [BACKEND_URL]);

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

      const response = await axios.post(`${BACKEND_URL}/api/auth/login`, credentials, {
        withCredentials: true // Send and receive cookies
      });
      
      const { access_token, user: userData } = response.data;
      
      console.log('✅ Login successful:', userData);
      
      // Store token permanently in localStorage (session never expires unless manual logout)
      // Token is valid for 1 year - effectively permanent session
      localStorage.setItem('token', access_token);
      setToken(access_token);
      setUser(userData);
      
      return { success: true };
    } catch (error) {
      console.error('❌ Login failed:', error);
      return {
        success: false,
        error: error.response?.data?.detail || 'فشل تسجيل الدخول'
      };
    }
  };

  const register = async (userData) => {
    try {
      const response = await axios.post(`${BACKEND_URL}/api/auth/register`, userData, {
        withCredentials: true // Send and receive cookies
      });
      
      const { access_token, user: newUser } = response.data;
      
      console.log('✅ Registration successful:', newUser);
      
      // Store token permanently in localStorage (session never expires unless manual logout)
      // Token is valid for 1 year - effectively permanent session
      setToken(access_token);
      setUser(newUser);
      localStorage.setItem('token', access_token);
      
      return { success: true };
    } catch (error) {
      console.error('❌ Registration failed:', error);
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
    setUser,
    setToken,
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