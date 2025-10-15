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

  const login = async (emailOrCredentials, password) => {
    try {
      // Support both single object and separate email/password parameters
      const credentials = typeof emailOrCredentials === 'string' 
        ? { identifier: emailOrCredentials, password: password }
        : { identifier: emailOrCredentials.email, password: emailOrCredentials.password };

      const response = await axios.post(`${BACKEND_URL}/api/auth/login`, credentials);
      const { access_token, user: userData } = response.data;
      
      console.log('Login successful, user data:', userData);
      console.log('User is_admin flag:', userData.is_admin);
      
      // Store token first
      localStorage.setItem('token', access_token);
      
      // Update state with a small delay to ensure proper state propagation
      setToken(access_token);
      setUser(userData);
      
      // Force re-render by triggering an additional state update
      setTimeout(() => {
        setUser({...userData});
      }, 50);
      
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