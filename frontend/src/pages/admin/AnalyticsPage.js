import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import axios from 'axios';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Users,
  ShoppingCart,
  Package,
  DollarSign,
  Eye,
  Calendar,
  MapPin,
  Clock
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AnalyticsPage = () => {
  const { t, language } = useLanguage();
  const isRTL = language === 'ar';
  
  const [analytics, setAnalytics] = useState({});
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('7d');

  // Mock Analytics Data
  const generateMockAnalytics = () => {
    return {
      overview: {
        totalRevenue: 45320.50,
        totalOrders: 234,
        totalCustomers: 156,
        totalProducts: 48,
        revenueChange: 12.5,
        ordersChange: 8.3,
        customersChange: 15.2,
        productsChange: 4.2
      },
      salesChart: [
        { date: '2025-01-01', sales: 2400, orders: 12 },
        { date: '2025-01-02', sales: 1800, orders: 8 },
        { date: '2025-01-03', sales: 3200, orders: 16 },
        { date: '2025-01-04', sales: 2800, orders: 14 },
        { date: '2025-01-05', sales: 3600, orders: 18 },
        { date: '2025-01-06', sales: 4200, orders: 21 },
        { date: '2025-01-07', sales: 3800, orders: 19 }
      ],
      topProducts: [
        { name: 'قلادة ذهبية فاخرة', sales: 24, revenue: 7200 },
        { name: 'أقراط لؤلؤ كلاسيكية', sales: 18, revenue: 2700 },
        { name: 'ساعة ذهبية فاخرة', sales: 12, revenue: 10800 },
        { name: 'خاتم مرصع بالماس', sales: 15, revenue: 4500 },
        { name: 'سوار ذهبي متعدد الطبقات', sales: 20, revenue: 5000 }
      ],
      categoryDistribution: [
        { name: isRTL ? 'قلادات' : 'Necklaces', value: 35, color: '#D97706' },
        { name: isRTL ? 'أقراط' : 'Earrings', value: 25, color: '#F59E0B' },
        { name: isRTL ? 'أساور' : 'Bracelets', value: 20, color: '#FCD34D' },
        { name: isRTL ? 'خواتم' : 'Rings', value: 15, color: '#FEF3C7' },
        { name: isRTL ? 'ساعات' : 'Watches', value: 5, color: '#FFFBEB' }
      ],
      customerMetrics: {
        newCustomers: 23,
        returningCustomers: 67,
        averageOrderValue: 193.68,
        customerLifetimeValue: 542.30
      },
      geographicData: [
        { region: isRTL ? 'الرياض' : 'Riyadh', orders: 89, percentage: 38 },
        { region: isRTL ? 'جدة' : 'Jeddah', orders: 67, percentage: 29 },
        { region: isRTL ? 'الدمام' : 'Dammam', orders: 34, percentage: 15 },
        { region: isRTL ? 'مكة المكرمة' : 'Makkah', orders: 28, percentage: 12 },
        { region: isRTL ? 'المدينة المنورة' : 'Madinah', orders: 16, percentage: 6 }
      ],
      recentActivity: [
        { 
          time: '2025-01-07T14:30:00Z', 
          action: isRTL ? 'طلب جديد من فاطمة أحمد' : 'New order from Fatima Ahmed',
          amount: 599.99 
        },
        { 
          time: '2025-01-07T13:15:00Z', 
          action: isRTL ? 'تسجيل عميل جديد: سارة محمد' : 'New customer registration: Sara Mohammed',
          amount: 0 
        },
        { 
          time: '2025-01-07T12:45:00Z', 
          action: isRTL ? 'طلب مكتمل - تم التسليم' : 'Order completed - Delivered',
          amount: 299.99 
        },
        { 
          time: '2025-01-07T11:30:00Z', 
          action: isRTL ? 'إضافة منتج جديد' : 'New product added',
          amount: 0 
        }
      ]
    };
  };

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/admin/analytics?range=${dateRange}`);
      setAnalytics(response.data || generateMockAnalytics());
    } catch (error) {
      console.error('Error fetching analytics:', error);
      setAnalytics(generateMockAnalytics());
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat(isRTL ? 'ar-SA' : 'en-US', {
      style: 'currency',
      currency: 'SAR'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleString(isRTL ? 'ar-SA' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  const { overview, salesChart, topProducts, categoryDistribution, customerMetrics, geographicData, recentActivity } = analytics;

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <BarChart className="h-8 w-8 text-amber-600" />
          <h1 className="text-3xl font-bold text-gray-900">
            {isRTL ? 'التحليلات والإحصائيات' : 'Analytics & Reports'}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-gray-500" />
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
          >
            <option value="1d">{isRTL ? 'آخر 24 ساعة' : 'Last 24 Hours'}</option>
            <option value="7d">{isRTL ? 'آخر 7 أيام' : 'Last 7 Days'}</option>
            <option value="30d">{isRTL ? 'آخر 30 يوم' : 'Last 30 Days'}</option>
            <option value="90d">{isRTL ? 'آخر 3 شهور' : 'Last 3 Months'}</option>
          </select>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-6 rounded-lg border border-amber-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-amber-600">{isRTL ? 'إجمالي المبيعات' : 'Total Revenue'}</p>
              <p className="text-2xl font-bold text-amber-900">{formatCurrency(overview.totalRevenue)}</p>
              <div className="flex items-center mt-1">
                <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                <span className="text-sm text-green-600">+{overview.revenueChange}%</span>
              </div>
            </div>
            <DollarSign className="h-8 w-8 text-amber-600" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">{isRTL ? 'إجمالي الطلبات' : 'Total Orders'}</p>
              <p className="text-2xl font-bold text-blue-900">{overview.totalOrders}</p>
              <div className="flex items-center mt-1">
                <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                <span className="text-sm text-green-600">+{overview.ordersChange}%</span>
              </div>
            </div>
            <ShoppingCart className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-lg border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">{isRTL ? 'إجمالي العملاء' : 'Total Customers'}</p>
              <p className="text-2xl font-bold text-green-900">{overview.totalCustomers}</p>
              <div className="flex items-center mt-1">
                <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                <span className="text-sm text-green-600">+{overview.customersChange}%</span>
              </div>
            </div>
            <Users className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-lg border border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-600">{isRTL ? 'إجمالي المنتجات' : 'Total Products'}</p>
              <p className="text-2xl font-bold text-purple-900">{overview.totalProducts}</p>
              <div className="flex items-center mt-1">
                <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                <span className="text-sm text-green-600">+{overview.productsChange}%</span>
              </div>
            </div>
            <Package className="h-8 w-8 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Chart */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {isRTL ? 'مبيعات الأسبوع' : 'Weekly Sales'}
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={salesChart}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tickFormatter={formatDate}
                reversed={isRTL}
              />
              <YAxis />
              <Tooltip 
                labelFormatter={(value) => formatDate(value)}
                formatter={(value, name) => [
                  name === 'sales' ? formatCurrency(value) : value,
                  name === 'sales' ? (isRTL ? 'المبيعات' : 'Sales') : (isRTL ? 'الطلبات' : 'Orders')
                ]}
              />
              <Area 
                type="monotone" 
                dataKey="sales" 
                stackId="1"
                stroke="#D97706" 
                fill="#D97706" 
                fillOpacity={0.6}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Category Distribution */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {isRTL ? 'توزيع المبيعات حسب الفئة' : 'Sales by Category'}
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={categoryDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {categoryDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Products */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {isRTL ? 'أفضل المنتجات مبيعاً' : 'Top Selling Products'}
          </h3>
          <div className="space-y-4">
            {topProducts.map((product, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold ${
                    index === 0 ? 'bg-yellow-500' : 
                    index === 1 ? 'bg-gray-400' : 
                    index === 2 ? 'bg-amber-600' : 'bg-gray-300'
                  }`}>
                    {index + 1}
                  </div>
                  <div className="mr-3">
                    <p className="text-sm font-medium text-gray-900">{product.name}</p>
                    <p className="text-xs text-gray-500">{product.sales} {isRTL ? 'مبيعة' : 'sold'}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">{formatCurrency(product.revenue)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Geographic Distribution */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            <MapPin className="inline h-5 w-5 mr-2" />
            {isRTL ? 'التوزيع الجغرافي' : 'Geographic Distribution'}
          </h3>
          <div className="space-y-3">
            {geographicData.map((region, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-900">{region.region}</span>
                    <span className="text-sm text-gray-600">{region.orders} {isRTL ? 'طلب' : 'orders'}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-amber-600 h-2 rounded-full" 
                      style={{ width: `${region.percentage}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            <Clock className="inline h-5 w-5 mr-2" />
            {isRTL ? 'النشاط الأخير' : 'Recent Activity'}
          </h3>
          <div className="space-y-4">
            {recentActivity.map((activity, index) => (
              <div key={index} className="flex items-start">
                <div className="flex-shrink-0 w-2 h-2 bg-amber-600 rounded-full mt-2"></div>
                <div className="mr-3 flex-1">
                  <p className="text-sm text-gray-900">{activity.action}</p>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-500">{formatTime(activity.time)}</p>
                    {activity.amount > 0 && (
                      <p className="text-xs font-semibold text-green-600">{formatCurrency(activity.amount)}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;