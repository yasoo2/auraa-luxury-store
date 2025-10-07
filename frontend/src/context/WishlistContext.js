import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';

const WishlistContext = createContext();

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
};

export const WishlistProvider = ({ children }) => {
  const [wishlistItems, setWishlistItems] = useState([]);
  const [loading, setLoading] = useState(false);

  // Load wishlist from localStorage on mount
  useEffect(() => {
    loadWishlistFromStorage();
  }, []);

  const loadWishlistFromStorage = () => {
    try {
      const stored = localStorage.getItem('wishlist');
      if (stored) {
        setWishlistItems(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading wishlist from storage:', error);
      setWishlistItems([]);
    }
  };

  const saveWishlistToStorage = (items) => {
    try {
      localStorage.setItem('wishlist', JSON.stringify(items));
    } catch (error) {
      console.error('Error saving wishlist to storage:', error);
    }
  };

  // Sync with server if user is logged in
  const syncWithServer = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await axios.get(`${API}/wishlist`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const serverWishlist = response.data || [];
      setWishlistItems(serverWishlist);
      saveWishlistToStorage(serverWishlist);
    } catch (error) {
      console.error('Error syncing wishlist with server:', error);
    }
  };

  const addToWishlist = async (product) => {
    if (isInWishlist(product.id)) {
      toast.info('المنتج موجود بالفعل في المفضلة');
      return;
    }

    const newItem = {
      id: product.id,
      name: product.name,
      price: product.price,
      original_price: product.original_price,
      image: product.image,
      category: product.category,
      rating: product.rating,
      added_at: new Date().toISOString()
    };

    const updatedWishlist = [...wishlistItems, newItem];
    setWishlistItems(updatedWishlist);
    saveWishlistToStorage(updatedWishlist);

    // Try to sync with server
    try {
      const token = localStorage.getItem('token');
      if (token) {
        await axios.post(`${API}/wishlist/add`, { product_id: product.id }, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      toast.success('تم إضافة المنتج إلى المفضلة ❤️');
    } catch (error) {
      console.error('Error syncing with server:', error);
      // Keep local changes even if server sync fails
      toast.success('تم إضافة المنتج إلى المفضلة ❤️');
    }
  };

  const removeFromWishlist = async (productId) => {
    const updatedWishlist = wishlistItems.filter(item => item.id !== productId);
    setWishlistItems(updatedWishlist);
    saveWishlistToStorage(updatedWishlist);

    // Try to sync with server
    try {
      const token = localStorage.getItem('token');
      if (token) {
        await axios.delete(`${API}/wishlist/remove/${productId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      toast.success('تم إزالة المنتج من المفضلة');
    } catch (error) {
      console.error('Error syncing with server:', error);
      toast.success('تم إزالة المنتج من المفضلة');
    }
  };

  const toggleWishlist = (product) => {
    if (isInWishlist(product.id)) {
      removeFromWishlist(product.id);
    } else {
      addToWishlist(product);
    }
  };

  const isInWishlist = (productId) => {
    return wishlistItems.some(item => item.id === productId);
  };

  const clearWishlist = () => {
    setWishlistItems([]);
    saveWishlistToStorage([]);
    toast.success('تم مسح جميع المفضلة');
  };

  const getWishlistCount = () => {
    return wishlistItems.length;
  };

  const value = {
    wishlistItems,
    loading,
    addToWishlist,
    removeFromWishlist,
    toggleWishlist,
    isInWishlist,
    clearWishlist,
    syncWithServer,
    getWishlistCount
  };

  return (
    <WishlistContext.Provider value={value}>
      {children}
    </WishlistContext.Provider>
  );
};

export default WishlistContext;