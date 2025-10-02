import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { useLanguage } from '../context/LanguageContext';
import { ShoppingCart, User, Search, Menu, X, Heart, LogOut, ChevronDown } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import LanguageCurrencySelector from './LanguageCurrencySelector';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Navbar = () => {
  const { user, logout } = useAuth();
  const { t, isRTL } = useLanguage();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showCategories, setShowCategories] = useState(false);
  const [categories, setCategories] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch categories for dropdown
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await axios.get(`${API}/categories`);
        setCategories(response.data);
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };
    fetchCategories();
  }, []);

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
          <Link to="/" className={`flex items-center ${isRTL ? 'space-x-reverse space-x-4' : 'space-x-4'}`}>
            <div className="relative">
              <div className="w-16 h-16 gradient-luxury rounded-full flex items-center justify-center shadow-2xl transform hover:scale-110 transition-all duration-300 border-2 border-amber-400 logo-glow">
                <span className="luxury-text font-display text-2xl font-black drop-shadow-lg">A</span>
              </div>
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-br from-yellow-300 to-amber-600 rounded-full animate-pulse shadow-lg"></div>
              <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-gradient-to-br from-gray-300 to-gray-500 rounded-full animate-ping"></div>
            </div>
            <div className="flex flex-col">
              <span className="font-display text-2xl md:text-3xl font-black luxury-text leading-tight drop-shadow-md">Auraa</span>
              <span className="font-display text-xs md:text-sm font-semibold text-gray-500 leading-none -mt-1 tracking-wider">LUXURY</span>
              <span className="text-xs font-medium text-amber-600 leading-none tracking-widest">اكسيسوري</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className={`hidden lg:flex items-center ${isRTL ? 'space-x-reverse space-x-6' : 'space-x-6'}`}>
            <Link 
              to="/" 
              className="text-gray-700 hover:text-amber-600 transition-colors duration-200 font-medium text-sm"
            >
              {t('home')}
            </Link>
            
            {/* Categories Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowCategories(!showCategories)}
                className="text-gray-700 hover:text-amber-600 transition-colors duration-200 font-medium flex items-center text-sm"
                onBlur={() => setTimeout(() => setShowCategories(false), 200)}
              >
                {isRTL ? 'تسوق حسب الفئة' : 'Shop by Category'}
                <ChevronDown className={`h-4 w-4 ${isRTL ? 'mr-1' : 'ml-1'} transform transition-transform ${showCategories ? 'rotate-180' : ''}`} />
              </button>
              
              {showCategories && (
                <div className={`absolute top-full ${isRTL ? 'right-0' : 'left-0'} mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden`}>
                  <div className="py-2">
                    {categories.map((category) => (
                      <Link
                        key={category.id}
                        to={`/products?category=${category.id}`}
                        className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-amber-50 hover:text-amber-700 transition-colors"
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
                      className="flex items-center px-4 py-2 text-sm text-amber-600 hover:bg-amber-50 font-medium"
                      onClick={() => setShowCategories(false)}
                    >
                      {isRTL ? 'عرض جميع المنتجات' : 'View All Products'}
                    </Link>
                  </div>
                </div>
              )}
            </div>
            
            <Link 
              to="/products" 
              className="text-gray-700 hover:text-amber-600 transition-colors duration-200 font-medium text-sm"
            >
              {t('products')}
            </Link>
            
            <Link 
              to="/external-stores" 
              className="text-gray-700 hover:text-amber-600 transition-colors duration-200 font-medium flex items-center text-sm"
            >
              🌍 {isRTL ? 'متاجر عالمية' : 'Global Stores'}
            </Link>
          </div>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="hidden md:flex items-center">
            <div className="relative">
              <Input
                type="text"
                placeholder={t('search_placeholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64 pr-10 search-expand focus-ring"
                dir={isRTL ? "rtl" : "ltr"}
              />
              <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400`} />
            </div>
          </form>

          {/* Right Side Actions */}
          <div className={`flex items-center ${isRTL ? 'space-x-reverse space-x-4' : 'space-x-4'}`}>
            {/* Language & Currency Selector */}
            <LanguageCurrencySelector />
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
              className="lg:hidden p-2 text-gray-700 hover:text-amber-600 transition-colors duration-200"
              data-testid="mobile-menu-button"
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
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
                    placeholder={t('search_placeholder')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pr-10 text-sm"
                    dir={isRTL ? "rtl" : "ltr"}
                  />
                  <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400`} />
                </div>
              </form>

              <Link 
                to="/" 
                onClick={() => setIsMenuOpen(false)}
                className="block px-3 py-3 text-base font-medium text-gray-700 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
              >
                {t('home')}
              </Link>
              
              {/* Categories in Mobile */}
              <div className="border-t border-gray-100 pt-2">
                <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {isRTL ? 'تسوق حسب الفئة' : 'Shop by Category'}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {categories.map((category) => (
                    <Link
                      key={category.id}
                      to={`/products?category=${category.id}`}
                      className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <span className="text-base mr-2">{category.icon}</span>
                      <span className="truncate">{category.name}</span>
                    </Link>
                  ))}
                </div>
              </div>
              
              <Link 
                to="/products" 
                onClick={() => setIsMenuOpen(false)}
                className="block px-3 py-3 text-base font-medium text-gray-700 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
              >
                {t('products')}
              </Link>
              
              <Link 
                to="/external-stores" 
                onClick={() => setIsMenuOpen(false)}
                className="flex items-center px-3 py-3 text-base font-medium text-gray-700 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
              >
                🌍 <span className="ml-2">{isRTL ? 'متاجر عالمية' : 'Global Stores'}</span>
              </Link>
              
              {!user && (
                <Link 
                  to="/auth" 
                  onClick={() => setIsMenuOpen(false)}
                  className="block px-3 py-3 text-base font-medium text-white bg-gradient-to-r from-amber-500 to-orange-500 rounded-lg hover:from-amber-600 hover:to-orange-600 transition-all text-center"
                >
                  {t('login')}
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