import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../api';

const BACKEND_URL = API_BASE_URL;
const API = `${BACKEND_URL}/api`;

const CartContext = createContext();

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export const CartProvider = ({ children }) => {
  const [cartCount, setCartCount] = useState(0);
  const [cartItems, setCartItems] = useState([]);

  // Fetch cart count from backend
  const fetchCartCount = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setCartCount(0);
        setCartItems([]);
        return;
      }

      const res = await axios.get(`${API}/cart`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const items = res.data?.items || [];
      const count = items.reduce((sum, item) => sum + (item.quantity || 0), 0);
      setCartCount(count);
      setCartItems(items);
    } catch (error) {
      console.error('Error fetching cart:', error);
      setCartCount(0);
      setCartItems([]);
    }
  };

  // Add item to cart
  const addToCart = async (productId, quantity = 1) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required');
      }

      await axios.post(`${API}/cart/add?product_id=${productId}&quantity=${quantity}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Update cart count after successful addition
      await fetchCartCount();
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.detail || error.message || 'Failed to add to cart'
      };
    }
  };

  // Remove item from cart
  const removeFromCart = async (productId) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required');
      }

      // The id goes in the path, not the query. The server route is
      // DELETE /api/cart/remove/{product_id}; this sent it as ?product_id= and
      // so asked for /api/cart/remove, which does not exist. Every "remove"
      // answered 404 — a shopper could put things in the cart and never take
      // one out, and an item that will not leave the cart is an order that
      // never gets placed.
      await axios.delete(`${API}/cart/remove/${encodeURIComponent(productId)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Update cart count after successful removal
      await fetchCartCount();
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.detail || error.message || 'Failed to remove from cart'
      };
    }
  };

  // Clear cart (on logout)
  const clearCart = () => {
    setCartCount(0);
    setCartItems([]);
  };

  // Initialize cart count on component mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetchCartCount();
    } else {
      clearCart();
    }
  }, []);

  const value = {
    cartCount,
    cartItems,
    addToCart,
    removeFromCart,
    fetchCartCount,
    clearCart
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};