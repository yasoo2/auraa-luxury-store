import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ShoppingCart, User, Search, Menu, X, Heart, LogOut, ChevronDown, Route as RouteIcon, LayoutDashboard } from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useWishlist } from '../context/WishlistContext';
import { useCart } from '../context/CartContext';
import LanguageCurrencySelector from './LanguageCurrencySelector';
import { Button } from './ui/button';
import { Input } from './ui/input';
import FLAGS from '../config/flags';
import { API_BASE_URL } from '../api';

const BACKEND_URL = API_BASE_URL;
const API = `${BACKEND_URL}/api`;

const Navbar = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { language } = useLanguage();
  const isRTL = language === 'ar' || language === 'he';
  const { getWishlistCount, clearWishlist } = useWishlist();
  const { cartCount, clearCart } = useCart();

  // The debug block that used to sit here printed the whole user object —
  // email, id, admin flags — into the console of a live store on every render,
  // and its useEffect did nothing else. Both are gone.

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showCategories, setShowCategories] = useState(false);
  const [categories, setCategories] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const navRef = useRef(null);

  // The navbar is in flow (sticky, not fixed) and its height changes at the md
  // breakpoint and when the mobile menu opens. Publishing the measured height
  // lets full-height pages claim exactly the space that's left, instead of
  // assuming 100vh and pushing a scrollbar onto every screen.
  useEffect(() => {
    const el = navRef.current;
    if (!el) return undefined;

    const publish = () =>
      document.documentElement.style.setProperty('--nav-h', `${el.offsetHeight}px`);

    publish();
    const observer = new ResizeObserver(publish);
    observer.observe(el);
    window.addEventListener('resize', publish);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', publish);
    };
  }, []);

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
    clearWishlist();
    clearCart();
    navigate('/');
  };

  const trackOrderLabel = isRTL ? 'تتبع الطلب' : 'Track Order';

  // Category documents carry both names; showing `name` (the Arabic one)
  // regardless of language left Arabic labels inside the English menu.
  const categoryLabel = (c) => (isRTL ? c.name : (c.name_en || c.name));
  const categoryAltLabel = (c) => (isRTL ? (c.name_en || '') : c.name);

  return (
    <nav ref={navRef} className="nav-glass sticky top-0" style={{ zIndex: 200 }}>
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        {/* min-w-0 lets the flex children shrink instead of forcing the row wider
              than the viewport, which pushed the right-hand actions off-screen at
              tablet widths. */}
        <div className="relative flex justify-between items-center gap-2 min-w-0 min-h-16 md:min-h-20 py-2" style={{ direction: 'ltr' }}>
          {/* Logo (default inline left) - Mobile optimized */}
          {!FLAGS.LOGO_BOTTOM_RIGHT && (
            <Link to="/" className="flex items-center gap-2 py-1 md:py-2 flex-shrink-0">
              {/* The pendant mark joins the wordmark on wider screens; on a
                  narrow phone every pixel of this row is already spoken for. */}
              <img src="/favicon.svg?v=2" alt="" className="hidden sm:block h-9 w-9" />
              <div className="flex flex-col items-start">
              <div className="font-display font-black leading-none flex items-baseline gap-1">
                <span className="text-xl sm:text-2xl md:text-3xl lg:text-4xl carousel-luxury-text leading-none whitespace-nowrap">Auraa</span>
                {/* Was 8px, painted with the same clipped gradient as the
                    name and a 2px drop shadow. At that size the fill is
                    thinner than the shadow: it rendered as a grey smudge next
                    to "Auraa" on every page. Solid ink, and big enough to be
                    a word. */}
                <span className="text-[10px] sm:text-xs font-semibold text-[#3f2d10]/80 tracking-[0.18em] sm:tracking-[0.28em] whitespace-nowrap">LUXURY</span>
              </div>
              <span className="block text-[7px] sm:text-[9px] md:text-[11px] text-gray-600 tracking-[0.2em] sm:tracking-[0.45em] border-t border-black/20 pt-0.5 uppercase whitespace-nowrap">ACCESSORIES</span>
              </div>
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
                <ChevronDown className={`h-4 w-4 ms-1 transform transition-transform ${showCategories ? 'rotate-180' : ''}`} />
              </button>
              {showCategories && (
                <div className="absolute top-full left-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden" style={{ backgroundColor: 'white', opacity: 1, backdropFilter: 'none' }}>
                  <div className="py-2">
                    {categories.map((category) => (
                      <Link
                        key={category.id}
                        to={`/products?category=${category.id}`}
                        className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-amber-50 hover-text-brand transition-colors"
                        onClick={() => setShowCategories(false)}
                      >
                        <span className="text-lg me-3">{category.icon}</span>
                        <div>
                          <div className="font-medium">{categoryLabel(category)}</div>
                          <div className="text-xs text-gray-500">{categoryAltLabel(category)}</div>
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

            {/* Track Order */}
            <Link to="/order-tracking" className="text-gray-700 hover-text-brand transition-colors duration-200 font-medium text-sm flex items-center">
              <RouteIcon className="h-4 w-4 me-1" /> {trackOrderLabel}
            </Link>
          </div>

          {/* Search Bar (desktop). The form owns a bounded flex share
              (min 10rem, max 20rem) so the box is always usable and never
              spills under the language/currency controls — the fixed-width
              focus trick that did exactly that is gone from App.css. */}
          <form onSubmit={handleSearch} className="hidden lg:flex items-center flex-1 min-w-[10rem] max-w-xs mx-2">
            <div className="relative w-full">
              <Input
                type="text"
                placeholder={isRTL ? 'ابحث عن المنتجات...' : 'Search products...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pr-10 focus-ring"
                dir={isRTL ? 'rtl' : 'ltr'}
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
          </form>

          {/* Right Actions - Mobile optimized */}
          {/* gap, not space-x: direction-agnostic, so the RTL reverse dance
              goes — and on a 320px cover display every one of these pixels
              decides whether the row fits or gets clipped. */}
          <div className="flex items-center min-w-0 gap-1 sm:gap-2 md:gap-4">
            {/* Language Currency Selector - Hidden on smallest screens */}
            <div className="hidden sm:block">
              <LanguageCurrencySelector />
            </div>

            {/* Cart */}
            <Link to="/cart" className="relative p-3 sm:p-2 text-black hover-text-brand transition-colors duration-200" data-testid="cart-link">
              <ShoppingCart className="h-5 w-5 sm:h-6 sm:w-6" />
              <span className="cart-badge absolute -top-0.5 -right-0.5 bg-brand text-white text-[9px] sm:text-[10px] rounded-full h-4 w-4 sm:h-5 sm:w-5 flex items-center justify-center">{cartCount}</span>
            </Link>

            {/* Wishlist */}
            <Link to={user ? '/wishlist' : '/auth'} className="relative p-3 sm:p-2 text-gray-700 hover-text-brand transition-colors duration-200">
              <Heart className="h-5 w-5 sm:h-6 sm:w-6" />
              {user && getWishlistCount() > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[9px] sm:text-[10px] rounded-full h-4 w-4 sm:h-5 sm:w-5 flex items-center justify-center">
                  {getWishlistCount()}
                </span>
              )}
            </Link>

            {/* User Actions - Responsive */}
            {user ? (
              <div className="flex items-center space-x-1 sm:space-x-2">
                {/* Profile - Hidden on mobile, shown in menu */}
                <Link to="/profile" className="hidden sm:block p-1.5 sm:p-2 text-gray-700 hover-text-brand transition-colors duration-200" data-testid="profile-link">
                  <User className="h-5 w-5 sm:h-6 sm:w-6" />
                </Link>
                
                {/* Logout - Hidden on mobile, shown in menu */}
                <Button onClick={handleLogout} variant="ghost" size="sm" className="hidden sm:block p-1.5 sm:p-2 text-gray-700 hover-text-brand" data-testid="logout-button">
                  <LogOut className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
                
                {/* Admin chip, wide screens only. On a narrow phone it was
                    the straw that pushed the whole top row wider than the
                    viewport — the admin entry lives in the drawer there. */}
                {user && user.is_admin && (
                  <Link to="/admin" className="hidden sm:inline-block px-2 py-1 text-sm bg-ivory text-brand rounded-full hover:bg-pearl transition-colors whitespace-nowrap">
                    {isRTL ? 'إدارة' : 'Admin'}
                  </Link>
                )}
              </div>
            ) : (
              <Link to="/auth" className="hidden sm:block">
                <Button className="btn-luxury text-xs sm:text-sm px-2 py-1 sm:px-3 sm:py-2" data-testid="login-button">
                  {isRTL ? 'دخول' : 'Login'}
                </Button>
              </Link>
            )}

            {/* Mobile menu button */}
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)} 
              className="lg:hidden p-3 sm:p-2 text-gray-700 hover-text-brand transition-colors duration-200"
              data-testid="mobile-menu-button"
              aria-label="Toggle mobile menu"
            >
              {isMenuOpen ? <X className="h-5 w-5 sm:h-6 sm:w-6" /> : <Menu className="h-5 w-5 sm:h-6 sm:w-6" />}
            </button>
          </div>

          {/* Logo absolute bottom-right (flagged) */}
          {FLAGS.LOGO_BOTTOM_RIGHT && (
            <Link to="/" className="hidden md:block absolute bottom-1 right-2 flex flex-col items-end">
              <div className="flex items-end space-x-2">
                <span className="font-display text-5xl md:text-6xl font-black logo-aurra-contrast leading-none tracking-tight">Auraa</span>
                <span className="font-display text-[1px] md:text-[2px] font-thin text-gray-600 tracking-[0.15em]">LUXURY</span>
              </div>
              <span className="block text-[9px] md:text-[11px] text-gray-600 tracking-[0.45em] border-t border-black/20 pt-0.5 uppercase">ACCESSORIES</span>
            </Link>
          )}
        </div>

        {/* Mobile Menu - Enhanced */}
        {isMenuOpen && (
          <div className="lg:hidden border-t border-gray-200 bg-white shadow-lg">
            <div className="px-4 py-4 space-y-3 max-h-[80vh] overflow-y-auto">
              {/* Language/Currency Selector - Visible in mobile menu */}
              <div className="sm:hidden mb-4 pb-3 border-b border-gray-100">
                <LanguageCurrencySelector />
              </div>

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
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                </div>
              </form>

              {/* User Actions for Mobile */}
              {user && (
                <div className="sm:hidden pb-3 mb-3 border-b border-gray-100 space-y-2">
                  <Link to="/profile" onClick={() => setIsMenuOpen(false)} className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 hover-text-brand hover:bg-amber-50 rounded-lg transition-colors">
                    <User className="h-4 w-4 me-2" />
                    {isRTL ? 'الملف الشخصي' : 'Profile'}
                  </Link>
                  {user.is_admin && (
                    <Link to="/admin" onClick={() => setIsMenuOpen(false)} className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 hover-text-brand hover:bg-amber-50 rounded-lg transition-colors" data-testid="drawer-admin-link">
                      <LayoutDashboard className="h-4 w-4 me-2" />
                      {isRTL ? 'لوحة الإدارة' : 'Admin Panel'}
                    </Link>
                  )}
                  <button onClick={() => { handleLogout(); setIsMenuOpen(false); }} className="flex items-center w-full px-3 py-2 text-sm font-medium text-gray-700 hover-text-brand hover:bg-amber-50 rounded-lg transition-colors">
                    <LogOut className="h-4 w-4 me-2" />
                    {isRTL ? 'تسجيل الخروج' : 'Logout'}
                  </button>
                </div>
              )}

              <Link to="/" onClick={() => setIsMenuOpen(false)} className="block px-3 py-3 text-base font-medium text-gray-700 hover-text-brand hover:bg-amber-50 rounded-lg transition-colors">
                {isRTL ? 'الرئيسية' : 'Home'}
              </Link>

              <div className="border-t border-gray-100 pt-2">
                <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">{isRTL ? 'تسوق حسب الفئة' : 'Shop by Category'}</div>
                <div className="grid grid-cols-2 gap-2">
                  {categories.map((category) => (
                    <Link key={category.id} to={`/products?category=${category.id}`} className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 hover-text-brand hover:bg-amber-50 rounded-lg transition-colors" onClick={() => setIsMenuOpen(false)}>
                      <span className="text-base me-2">{category.icon}</span>
                      <span className="truncate">{categoryLabel(category)}</span>
                    </Link>
                  ))}
                </div>
              </div>

              <Link to="/products" onClick={() => setIsMenuOpen(false)} className="block px-3 py-3 text-base font-medium text-gray-700 hover-text-brand hover:bg-amber-50 rounded-lg transition-colors">
                {isRTL ? 'المنتجات' : 'Products'}
              </Link>

              {/* Track Order - Mobile */}
              <Link to="/order-tracking" onClick={() => setIsMenuOpen(false)} className="block px-3 py-3 text-base font-medium text-gray-700 hover-text-brand hover:bg-amber-50 rounded-lg transition-colors">
                {trackOrderLabel}
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
