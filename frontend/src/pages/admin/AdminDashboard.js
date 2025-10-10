import React, { useState } from 'react';
import { Link, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import EnhancedProductsPage from './EnhancedProductsPage';
import OrdersPage from './OrdersPage';
import UsersPage from './UsersPage';
import SettingsPage from './SettingsPage';
import AnalyticsPage from './AnalyticsPage';
import IntegrationsPage from './IntegrationsPage';
import AutoUpdatePage from './AutoUpdatePage';
import {
  Package,
  ShoppingCart,
  Users,
  Settings,
  BarChart,
  Plug,
  LogOut,
  Menu,
  X,
  RefreshCw
} from 'lucide-react';

const AdminDashboard = () => {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const isRTL = language === 'ar';

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
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/integrations" element={<IntegrationsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;