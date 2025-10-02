import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { useLanguage } from '../context/LanguageContext';
import { ShoppingCart, User, Search, Menu, X, Heart, LogOut } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import LanguageCurrencySelector from './LanguageCurrencySelector';

const Navbar = () => {
  const { user, logout } = useAuth();
  const { t, isRTL } = useLanguage();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery)}`);
      setSearchQuery('');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="nav-glass sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className={`flex items-center ${isRTL ? 'space-x-reverse space-x-3' : 'space-x-3'}`}>
            <div className="relative">
              <div className="w-12 h-12 gradient-luxury rounded-full flex items-center justify-center shadow-lg transform hover:scale-105 transition-transform duration-300">
                <span className="luxury-text font-display text-xl font-black">A</span>
              </div>
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-full animate-pulse"></div>
            </div>
            <div className="flex flex-col">
              <span className="font-display text-2xl font-black luxury-text leading-tight">Auraa</span>
              <span className="font-display text-lg font-medium text-gray-600 leading-none -mt-1">Luxury</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className={`hidden md:flex items-center ${isRTL ? 'space-x-reverse space-x-8' : 'space-x-8'}`}>
            <Link 
              to="/" 
              className="text-gray-700 hover:text-amber-600 transition-colors duration-200 font-medium"
            >
              {t('home')}
            </Link>
            <Link 
              to="/products" 
              className="text-gray-700 hover:text-amber-600 transition-colors duration-200 font-medium"
            >
              {t('products')}
            </Link>
            <div className="relative">
              <Link 
                to="/products?category=necklaces" 
                className="text-gray-700 hover:text-amber-600 transition-colors duration-200 font-medium"
              >
                {t('necklaces')}
              </Link>
            </div>
            <div className="relative">
              <Link 
                to="/products?category=earrings" 
                className="text-gray-700 hover:text-amber-600 transition-colors duration-200 font-medium"
              >
                {t('earrings')}
              </Link>
            </div>
            <div className="relative">
              <Link 
                to="/products?category=rings" 
                className="text-gray-700 hover:text-amber-600 transition-colors duration-200 font-medium"
              >
                {t('rings')}
              </Link>
            </div>
          </div>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="hidden md:flex items-center">
            <div className="relative">
              <Input
                type="text"
                placeholder="ابحث عن المنتجات..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64 pr-10 search-expand focus-ring"
                dir="rtl"
              />
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            </div>
          </form>

          {/* Right Side Actions */}
          <div className="flex items-center space-x-4">
            {/* Cart */}
            <Link 
              to="/cart" 
              className="relative p-2 text-gray-700 hover:text-amber-600 transition-colors duration-200"
              data-testid="cart-link"
            >
              <ShoppingCart className="h-6 w-6" />
              <span className="cart-badge absolute -top-1 -right-1 bg-amber-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                0
              </span>
            </Link>

            {/* Wishlist */}
            {user && (
              <Link 
                to="/wishlist" 
                className="p-2 text-gray-700 hover:text-amber-600 transition-colors duration-200"
              >
                <Heart className="h-6 w-6" />
              </Link>
            )}

            {/* User Menu */}
            {user ? (
              <div className="flex items-center space-x-2">
                <Link 
                  to="/profile" 
                  className="p-2 text-gray-700 hover:text-amber-600 transition-colors duration-200"
                  data-testid="profile-link"
                >
                  <User className="h-6 w-6" />
                </Link>
                <Button
                  onClick={handleLogout}
                  variant="ghost"
                  size="sm"
                  className="p-2 text-gray-700 hover:text-amber-600"
                  data-testid="logout-button"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
                {user.is_admin && (
                  <Link 
                    to="/admin" 
                    className="px-3 py-1 text-sm bg-amber-100 text-amber-800 rounded-full hover:bg-amber-200 transition-colors"
                  >
                    إدارة
                  </Link>
                )}
              </div>
            ) : (
              <Link to="/auth">
                <Button className="btn-luxury" data-testid="login-button">
                  دخول / تسجيل
                </Button>
              </Link>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 text-gray-700 hover:text-amber-600 transition-colors duration-200"
              data-testid="mobile-menu-button"
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-gray-200">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {/* Mobile Search */}
              <form onSubmit={handleSearch} className="mb-4">
                <div className="relative">
                  <Input
                    type="text"
                    placeholder="ابحث عن المنتجات..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pr-10"
                    dir="rtl"
                  />
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
              </form>

              <Link 
                to="/" 
                onClick={() => setIsMenuOpen(false)}
                className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-colors"
              >
                الرئيسية
              </Link>
              <Link 
                to="/products" 
                onClick={() => setIsMenuOpen(false)}
                className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-colors"
              >
                المنتجات
              </Link>
              <Link 
                to="/products?category=necklaces" 
                onClick={() => setIsMenuOpen(false)}
                className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-colors"
              >
                قلادات
              </Link>
              <Link 
                to="/products?category=earrings" 
                onClick={() => setIsMenuOpen(false)}
                className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-colors"
              >
                أقراط
              </Link>
              <Link 
                to="/products?category=rings" 
                onClick={() => setIsMenuOpen(false)}
                className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-colors"
              >
                خواتم
              </Link>
              
              {!user && (
                <Link 
                  to="/auth" 
                  onClick={() => setIsMenuOpen(false)}
                  className="block px-3 py-2 text-base font-medium text-white bg-gradient-to-r from-amber-500 to-orange-500 rounded-md hover:from-amber-600 hover:to-orange-600 transition-all"
                >
                  دخول / تسجيل
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