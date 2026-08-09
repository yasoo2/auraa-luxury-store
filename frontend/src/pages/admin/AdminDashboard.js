// Admin Dashboard - Fixed all imports and authentication
import React, { useState, useEffect } from 'react';
import { Link, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import EnhancedProductsPage from './EnhancedProductsPage';
import OrdersPage from './OrdersPage';
import UsersPage from './UsersPage';
import SettingsPage from './SettingsPage';
import AnalyticsPage from './AnalyticsPage';
import IntegrationsPage from './IntegrationsPage';
import AutoUpdatePage from './AutoUpdatePage';
import BulkImportPage from './BulkImportPage';
import QuickImportPage from './QuickImportPage';
import CMSPagesManager from './CMSPagesManager';
import MediaLibrary from './MediaLibrary';
import ThemeCustomization from './ThemeCustomization';
import AdminManagement from './AdminManagement';
import UsersManagementPage from './UsersManagementPage';
import {
  Package,
  ShoppingCart,
  Users,
  TrendingUp,
  Settings,
  Zap,
  LogOut,
  Menu,
  X,
  RefreshCw,
  ExternalLink,
  Upload,
  BarChart,
  Plug,
  Download,
  FileText,
  Image,
  Palette,
  Shield
} from 'lucide-react';

const BuildStamp = ({ isRTL }) => {
  const [info, setInfo] = useState(null);

  useEffect(() => {
    // cache: 'no-store' — the point of this is to report the *current* deploy,
    // so it must not be answered from the very cache it exists to diagnose.
    fetch('/build-info.json', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then(setInfo)
      .catch(() => setInfo(null));
  }, []);

  if (!info) return null;

  const built = new Date(info.builtAt);
  return (
    <div className="px-4 py-3 mt-4 border-t border-gray-200 text-xs text-gray-500" data-testid="build-stamp">
      <div>{isRTL ? 'إصدار الواجهة' : 'Frontend build'}</div>
      <div dir="ltr" className="font-mono">{info.commit}</div>
      <div dir="ltr">{Number.isNaN(built.getTime()) ? info.builtAt : built.toLocaleString()}</div>
    </div>
  );
};


const AdminDashboard = () => {
  const { t, language } = useLanguage();
  const { user, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  // Open where there is room for it. On a phone the 256px sidebar squeezed
  // the content to ~130px — the orders header hung off the screen and the
  // pages were unusable until the visitor guessed at the menu button.
  const [sidebarOpen, setSidebarOpen] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches
  );
  const isRTL = language === 'ar';

  // Redirect if not authenticated or not admin (but wait for loading to complete)
  useEffect(() => {
    if (!loading && (!isAuthenticated || !user?.is_admin)) {
      navigate('/');
    }
  }, [loading, isAuthenticated, user, navigate]);

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto mb-4"></div>
          <p className="text-gray-600">{isRTL ? 'جاري التحميل...' : 'Loading...'}</p>
        </div>
      </div>
    );
  }

  const menuItems = [
    {
      name: isRTL ? 'المنتجات' : 'Products',
      path: '/admin/products',
      icon: Package
    },
    {
      name: isRTL ? 'الطلبات' : 'Orders',
      path: '/admin/orders',
      icon: ShoppingCart
    },
    {
      name: isRTL ? 'المستخدمون' : 'Users',
      path: '/admin/users',
      icon: Users
    },
    {
      name: isRTL ? '🚀 استيراد سريع CJ' : '🚀 CJ Quick Import',
      path: '/admin/quick-import',
      icon: Download
    },
    {
      name: isRTL ? 'الاستيراد المجمع CJ' : 'CJ Bulk Import',
      path: '/admin/bulk-import',
      icon: Upload
    },
    {
      name: isRTL ? 'التحليلات' : 'Analytics',
      path: '/admin/analytics',
      icon: BarChart
    },
    {
      name: isRTL ? 'التكاملات' : 'Integrations',
      path: '/admin/integrations',
      icon: Plug
    },
    {
      name: isRTL ? 'التحديثات التلقائية' : 'Auto Updates',
      path: '/admin/auto-update',
      icon: RefreshCw
    },
    {
      name: isRTL ? '📄 إدارة الصفحات' : '📄 CMS Pages',
      path: '/admin/cms-pages',
      icon: FileText
    },
    {
      name: isRTL ? '🎨 تخصيص التصميم' : '🎨 Theme',
      path: '/admin/theme',
      icon: Palette
    },
    {
      name: isRTL ? '🖼️ مكتبة الوسائط' : '🖼️ Media',
      path: '/admin/media',
      icon: Image
    },
    // Super Admin Only - User Management
    ...(user?.is_super_admin ? [{
      name: isRTL ? '🔴 إدارة المستخدمين' : '🔴 User Management',
      path: '/admin/users-management',
      icon: Shield,
      superAdminOnly: true,
      isRed: true  // Special styling for super admin
    }, {
      // This page and its endpoints have always worked; it simply had no link,
      // so it could only be reached by typing the URL.
      name: isRTL ? '🔴 إدارة المديرين' : '🔴 Admin Management',
      path: '/admin/admin-management',
      icon: Shield,
      superAdminOnly: true,
      isRed: true
    }] : []),
    {
      name: isRTL ? 'الإعدادات' : 'Settings',
      path: '/admin/settings',
      icon: Settings
    }
  ];

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Top Navigation */}
      <nav className="bg-gradient-to-r from-amber-500 via-yellow-600 to-amber-500 text-white shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 rounded-lg hover:bg-white/20 transition-colors"
              >
                {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
              <h1 className="text-2xl font-bold carousel-luxury-text">
                {isRTL ? 'لوحة التحكم - Auraa Luxury' : 'Auraa Luxury - Admin'}
              </h1>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-white/20 transition-colors"
            >
              <LogOut size={20} />
              <span>{isRTL ? 'خروج' : 'Logout'}</span>
            </button>
          </div>
        </div>
      </nav>

      <div className="flex relative">
        {/* Sidebar. On large screens it sits beside the content; on small
            ones it floats over it as a drawer — pushing instead of floating
            is what squeezed every admin page into an unusable strip. */}
        <aside
          className={`${
            sidebarOpen ? 'w-64' : 'w-0'
          } bg-white shadow-xl transition-all duration-300 overflow-hidden lg:static absolute start-0 top-0 bottom-0 z-40`}
          style={{ minHeight: 'calc(100vh - 64px)' }}
        >
          <nav className="p-4 space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isRedButton = item.isRed;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all group ${
                    isRedButton
                      ? 'bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 shadow-lg hover:shadow-xl'
                      : 'hover:bg-gradient-to-r hover:from-amber-50 hover:to-yellow-50 hover:text-amber-700'
                  }`}
                >
                  <Icon
                    size={20}
                    className="group-hover:scale-110 transition-transform"
                  />
                  <span className="font-medium">{item.name}</span>
                  {isRedButton && (
                    <span className="ml-auto text-xs bg-white/20 px-2 py-1 rounded-full">
                      {isRTL ? 'سوبر أدمن' : 'Super Admin'}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Which build is this?
              Asked and unanswerable until now: a fix would be merged and
              deployed, the browser would still be serving the previous bundle,
              and there was no way to tell those apart from the screen. */}
          <BuildStamp isRTL={isRTL} />
        </aside>

        {/* Main Content.
            min-w-0 matters: a flex item's default min-width is its content's
            minimum size, so the orders table (whitespace-nowrap, ~1400px)
            forced this <main> wider than the screen and the whole admin area
            hung off the left edge, clipped and unreachable, instead of the
            table scrolling inside its own overflow-x-auto wrapper. */}
        <main className="flex-1 min-w-0 p-6">
          <Routes>
            <Route path="/" element={<Navigate to="/admin/products" replace />} />
            <Route path="/products" element={<EnhancedProductsPage />} />
            <Route path="/orders" element={<OrdersPage />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/quick-import" element={<QuickImportPage />} />
            <Route path="/bulk-import" element={<BulkImportPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/integrations" element={<IntegrationsPage />} />
            <Route path="/auto-update" element={<AutoUpdatePage />} />
            <Route path="/cms-pages" element={<CMSPagesManager />} />
            <Route path="/theme" element={<ThemeCustomization />} />
            <Route path="/media" element={<MediaLibrary />} />
            {user?.is_super_admin && (
              <>
                <Route path="/admin-management" element={<AdminManagement />} />
                <Route path="/users-management" element={<UsersManagementPage />} />
              </>
            )}
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;