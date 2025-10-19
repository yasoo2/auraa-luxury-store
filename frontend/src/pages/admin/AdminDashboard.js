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
import AliExpressPage from './AliExpressPage';
import BulkImportPage from './BulkImportPage';
import QuickImportPage from './QuickImportPage';
import AliExpressTrackingPage from './AliExpressTrackingPage';
import ContentProtectionPage from './ContentProtectionPage';
import CMSPagesManager from './CMSPagesManager';
import MediaLibrary from './MediaLibrary';
import ThemeCustomization from './ThemeCustomization';
import AdminManagement from './AdminManagement';
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

const AdminDashboard = () => {
  const { t, language } = useLanguage();
  const { user, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
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
      name: isRTL ? 'علي إكسبريس' : 'AliExpress',
      path: '/admin/aliexpress',
      icon: ExternalLink
    },
    {
      name: isRTL ? '🚀 استيراد سريع' : '🚀 Quick Import',
      path: '/admin/quick-import',
      icon: Download
    },
    {
      name: isRTL ? 'الاستيراد المجمع' : 'Bulk Import',
      path: '/admin/bulk-import',
      icon: Upload
    },
    {
      name: isRTL ? '📦 تتبع الطلبات' : '📦 Order Tracking',
      path: '/admin/aliexpress-tracking',
      icon: Package
    },
    {
      name: isRTL ? '🛡️ حماية المحتوى' : '🛡️ Content Protection',
      path: '/admin/content-protection',
      icon: Settings
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
    // Super Admin Only
    ...(user?.is_super_admin ? [{
      name: isRTL ? '🛡️ إدارة المسؤولين' : '🛡️ Admin Management',
      path: '/admin/admin-management',
      icon: Shield,
      superAdminOnly: true
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

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`${
            sidebarOpen ? 'w-64' : 'w-0'
          } bg-white shadow-xl transition-all duration-300 overflow-hidden`}
          style={{ minHeight: 'calc(100vh - 64px)' }}
        >
          <nav className="p-4 space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gradient-to-r hover:from-amber-50 hover:to-yellow-50 hover:text-amber-700 transition-all group"
                >
                  <Icon
                    size={20}
                    className="group-hover:scale-110 transition-transform"
                  />
                  <span className="font-medium">{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          <Routes>
            <Route path="/" element={<Navigate to="/admin/products" replace />} />
            <Route path="/products" element={<EnhancedProductsPage />} />
            <Route path="/orders" element={<OrdersPage />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/aliexpress" element={<AliExpressPage />} />
            <Route path="/quick-import" element={<QuickImportPage />} />
            <Route path="/bulk-import" element={<BulkImportPage />} />
            <Route path="/aliexpress-tracking" element={<AliExpressTrackingPage />} />
            <Route path="/content-protection" element={<ContentProtectionPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/integrations" element={<IntegrationsPage />} />
            <Route path="/auto-update" element={<AutoUpdatePage />} />
            <Route path="/cms-pages" element={<CMSPagesManager />} />
            <Route path="/theme" element={<ThemeCustomization />} />
            <Route path="/media" element={<MediaLibrary />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;