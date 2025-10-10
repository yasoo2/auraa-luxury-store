import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ShoppingCart, User, Search, Menu, X, Heart, LogOut, ChevronDown } from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useWishlist } from '../context/WishlistContext';
import { useCart } from '../context/CartContext';
import LanguageCurrencySelector from './LanguageCurrencySelector';
import { Button } from './ui/button';
import { Input } from './ui/input';
import FLAGS from '../config/flags';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Navbar = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  const { getWishlistCount } = useWishlist();
  const { cartCount } = useCart();

  // Debug user state
  console.log('Navbar - Current user:', user);

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showCategories, setShowCategories] = useState(false);
  const [categories, setCategories] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await axios.get(`${API}/categories`);
        setCategories(res.data || []);
      } catch (e) {
        // silent
      }
    };
    fetchCategories();
  }, []);

  // Cart count is now managed by CartContext

  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    navigate(`/products?search=${encodeURIComponent(searchQuery)}`);
    setSearchQuery('');
    setIsMenuOpen(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="nav-glass sticky top-0" style={{ zIndex: 200 }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative flex justify-between items-center min-h-16 md:min-h-20 py-2" style={{ direction: 'ltr' }}>
          {/* Logo (default inline left) */}
          {!FLAGS.LOGO_BOTTOM_RIGHT && (
            <Link to="/" className="flex flex-col items-start py-1 md:py-2">
              <div className="font-display font-black leading-none flex items-baseline gap-1">
                <span className="text-2xl sm:text-3xl md:text-4xl carousel-luxury-text leading-none whitespace-nowrap">Lora</span>
                <span style={{ fontSize: '10px' }} className="sm:text-xs carousel-luxury-text tracking-[0.15em] sm:tracking-[0.25em] whitespace-nowrap">LUXURY</span>
              </div>
              <span className="block text-[8px] sm:text-[9px] md:text-[11px] text-gray-600 tracking-[0.3em] sm:tracking-[0.45em] border-t border-black/20 pt-0.5 uppercase whitespace-nowrap">ACCESSORIES</span>
            </Link>
          )}

          {/* Desktop Navigation */}
          <div className={`hidden lg:flex items-center gap-8 px-8`} style={{ marginLeft: 'auto' }}>
            <Link to="/" className="text-gray-700 hover-text-brand transition-colors duration-200 font-medium text-sm">
              {isRTL ? 'الرئيسية' : 'Home'}
            </Link>

            {/* Categories Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowCategories(!showCategories)}
                className="text-gray-700 hover-text-brand transition-colors duration-200 font-medium flex items-center text-sm"
                onBlur={() => setTimeout(() => setShowCategories(false), 200)}
                aria-haspopup="true"
                aria-expanded={showCategories}
                data-testid="categories-dropdown"
              >
                {isRTL ? 'تسوق حسب الفئة' : 'Shop by Category'}
                <ChevronDown className={`h-4 w-4 ml-1 transform transition-transform ${showCategories ? 'rotate-180' : ''}`} />
              </button>
              {showCategories && (
                <div className="absolute top-full left-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden">
                  <div className="py-2">
                    {categories.map((category) => (
                      <Link
                        key={category.id}
                        to={`/products?category=${category.id}`}
                        className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-amber-50 hover-text-brand transition-colors"
                        onClick={() => setShowCategories(false)}
                      >
                        <span className="text-lg mr-3">{category.icon}</span>
                        <div>
                          <div className="font-medium">{category.name}</div>
                          <div className="text-xs text-gray-500">{category.name_en}</div>
                        </div>
                      </Link>
                    ))}
                  </div>
                  <div className="border-t border-gray-200 py-2">
                    <Link
                      to="/products"
                      className="flex items-center px-4 py-2 text-sm text-brand hover:bg-amber-50 font-medium"
                      onClick={() => setShowCategories(false)}
                    >
                      {isRTL ? 'عرض جميع المنتجات' : 'View All Products'}
                    </Link>
                  </div>
                </div>
              )}
            </div>

            <Link to="/products" className="text-gray-700 hover-text-brand transition-colors duration-200 font-medium text-sm">
              {isRTL ? 'المنتجات' : 'Products'}
            </Link>
          </div>

          {/* Search Bar (desktop) */}
          <form onSubmit={handleSearch} className="hidden md:flex items-center">
            <div className="relative">
              <Input
                type="text"
                placeholder={isRTL ? 'ابحث عن المنتجات...' : 'Search products...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64 pr-10 search-expand focus-ring"
                dir={isRTL ? 'rtl' : 'ltr'}
              />
              <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400`} />
            </div>
          </form>

          {/* Right Actions */}
          <div className={`flex items-center ${isRTL ? 'space-x-reverse space-x-4' : 'space-x-4'}`}>
            <LanguageCurrencySelector />

            {/* Cart */}
            <Link to="/cart" className="relative p-2 text-black hover-text-brand transition-colors duration-200" data-testid="cart-link">
              <ShoppingCart className="h-6 w-6" />
              <span className="cart-badge absolute -top-1 -right-1 bg-brand text-white text-[10px] rounded-full h-5 min-w-[1.1rem] px-1 flex items-center justify-center">{cartCount}</span>
            </Link>

            {/* Wishlist */}
            <Link to={user ? '/wishlist' : '/auth'} className="relative p-2 text-gray-700 hover-text-brand transition-colors duration-200">
              <Heart className="h-6 w-6" />
              {getWishlistCount() > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full h-5 min-w-[1.1rem] px-1 flex items-center justify-center">
                  {getWishlistCount()}
                </span>
              )}
            </Link>

            {/* User */}
            {user ? (
              <div className="flex items-center space-x-2">
                <Link to="/profile" className="p-2 text-gray-700 hover-text-brand transition-colors duration-200" data-testid="profile-link">
                  <User className="h-6 w-6" />
                </Link>
                <Button onClick={handleLogout} variant="ghost" size="sm" className="p-2 text-gray-700 hover-text-brand" data-testid="logout-button">
                  <LogOut className="h-4 w-4" />
                </Button>
                {user.is_admin && (
                  <Link to="/admin" className="px-3 py-1 text-sm bg-ivory text-brand rounded-full hover:bg-pearl transition-colors">إدارة</Link>
                )}
              </div>
            ) : (
              <Link to="/auth">
                <Button className="btn-luxury" data-testid="login-button">
                  {isRTL ? 'دخول / تسجيل' : 'Login / Register'}
                </Button>
              </Link>
            )}

            {/* Mobile menu */}
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="lg:hidden p-2 text-gray-700 hover-text-brand transition-colors duration-200" data-testid="mobile-menu-button">
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>

          {/* Logo absolute bottom-right (flagged) */}
          {FLAGS.LOGO_BOTTOM_RIGHT && (
            <Link to="/" className="hidden md:block absolute bottom-1 right-2 flex flex-col items-end">
              <div className="flex items-end space-x-2">
                <span className="font-display text-5xl md:text-6xl font-black logo-aurra-contrast leading-none tracking-tight">Lora</span>
                <span className="font-display text-[1px] md:text-[2px] font-thin text-gray-600 tracking-[0.15em]">LUXURY</span>
              </div>
              <span className="block text-[9px] md:text-[11px] text-gray-600 tracking-[0.45em] border-t border-black/20 pt-0.5 uppercase">ACCESSORIES</span>
            </Link>
          )}
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="lg:hidden border-t border-gray-200 bg-white">
            <div className="px-4 pt-4 pb-4 space-y-2 max-h-96 overflow-y-auto">
              {/* Mobile Search */}
              <form onSubmit={handleSearch} className="mb-4">
                <div className="relative">
                  <Input
                    type="text"
                    placeholder={isRTL ? 'ابحث عن المنتجات...' : 'Search products...'}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pr-10 text-sm"
                    dir={isRTL ? 'rtl' : 'ltr'}
                  />
                  <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400`} />
                </div>
              </form>

              <Link to="/" onClick={() => setIsMenuOpen(false)} className="block px-3 py-3 text-base font-medium text-gray-700 hover-text-brand hover:bg-amber-50 rounded-lg transition-colors">
                {isRTL ? 'الرئيسية' : 'Home'}
              </Link>

              <div className="border-t border-gray-100 pt-2">
                <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">{isRTL ? 'تسوق حسب الفئة' : 'Shop by Category'}</div>
                <div className="grid grid-cols-2 gap-2">
                  {categories.map((category) => (
                    <Link key={category.id} to={`/products?category=${category.id}`} className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 hover-text-brand hover:bg-amber-50 rounded-lg transition-colors" onClick={() => setIsMenuOpen(false)}>
                      <span className="text-base mr-2">{category.icon}</span>
                      <span className="truncate">{category.name}</span>
                    </Link>
                  ))}
                </div>
              </div>

              <Link to="/products" onClick={() => setIsMenuOpen(false)} className="block px-3 py-3 text-base font-medium text-gray-700 hover-text-brand hover:bg-amber-50 rounded-lg transition-colors">
                {isRTL ? 'المنتجات' : 'Products'}
              </Link>

              {!user && (
                <Link to="/auth" onClick={() => setIsMenuOpen(false)} className="block px-3 py-3 text-base font-medium text-white bg-gradient-to-r from-amber-500 to-orange-500 rounded-lg hover:from-amber-600 hover:to-orange-600 transition-all text-center">
                  {isRTL ? 'دخول / تسجيل' : 'Login / Register'}
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;