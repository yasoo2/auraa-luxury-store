import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import {
  Shield,
  Eye,
  EyeOff,
  AlertTriangle,
  Lock,
  Unlock,
  Camera,
  Download,
  Upload,
  Settings,
  Activity,
  BarChart3,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  Filter,
  Search
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';

const ContentProtectionPage = () => {
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  
  // State management
  const [activeTab, setActiveTab] = useState('overview');
  const [protectionSettings, setProtectionSettings] = useState({
    watermark_enabled: true,
    watermark_opacity: 30,
    screenshot_detection: true,
    right_click_disabled: true,
    dev_tools_detection: true,
    url_protection: true
  });
  const [incidents, setIncidents] = useState([]);
  const [analytics, setAnalytics] = useState({});
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIncident, setSelectedIncident] = useState(null);

  const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

  useEffect(() => {
    loadAnalytics();
    loadIncidents();
  }, []);

  const loadAnalytics = async () => {
    try {
      const token = localStorage.getItem('token');
      const endDate = new Date().toISOString();
      const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      
      const response = await fetch(
        `${API_URL}/api/admin/aliexpress/analytics/protection?start_date=${startDate}&end_date=${endDate}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
    }
  };

  const loadIncidents = async () => {
    try {
      const token = localStorage.getItem('token');
      // This would be a real endpoint in production
      const mockIncidents = [
        {
          id: '1',
          incident_id: 'INC001',
          user_id: 'user123',
          detection_method: 'screenshot_key',
          page_url: '/products/luxury-necklace',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          severity: 'medium',
          ip_address: '192.168.1.100'
        },
        {
          id: '2',
          incident_id: 'INC002',
          user_id: 'user456',
          detection_method: 'right_click_image',
          page_url: '/products/diamond-ring',
          timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
          severity: 'low',
          ip_address: '192.168.1.101'
        },
        {
          id: '3',
          incident_id: 'INC003',
          user_id: 'user789',
          detection_method: 'dev_tools',
          page_url: '/products/luxury-watch',
          timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          severity: 'high',
          ip_address: '192.168.1.102'
        }
      ];
      setIncidents(mockIncidents);
    } catch (error) {
      console.error('Error loading incidents:', error);
    }
  };

  const applyWatermark = async (file) => {
    if (!file) return;

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', file);
      formData.append('user_id', 'admin');
      formData.append('product_id', 'demo');

      const response = await fetch(`${API_URL}/api/admin/aliexpress/content-protection/watermark-image`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (response.ok) {
        // Download the watermarked image
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `watermarked_${file.name}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        alert(isRTL ? 'تم تطبيق العلامة المائية بنجاح!' : 'Watermark applied successfully!');
      }
    } catch (error) {
      console.error('Error applying watermark:', error);
      alert(isRTL ? 'خطأ في تطبيق العلامة المائية' : 'Error applying watermark');
    } finally {
      setLoading(false);
    }
  };

  const updateProtectionSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      // This would be a real API call
      alert(isRTL ? 'تم تحديث إعدادات الحماية' : 'Protection settings updated');
    } catch (error) {
      console.error('Error updating settings:', error);
    }
  };

  const getSeverityColor = (severity) => {
    const colors = {
      low: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-red-100 text-red-800'
    };
    return colors[severity] || 'bg-gray-100 text-gray-800';
  };

  const getSeverityIcon = (severity) => {
    const icons = {
      low: CheckCircle,
      medium: AlertTriangle,
      high: XCircle
    };
    const IconComponent = icons[severity] || AlertTriangle;
    return <IconComponent className="h-4 w-4" />;
  };

  const getDetectionMethodText = (method) => {
    const methods = {
      ar: {
        'screenshot_key': 'مفتاح لقطة الشاشة',
        'right_click_image': 'النقر الأيمن على الصورة',
        'dev_tools': 'أدوات المطور',
        'print_screen': 'طباعة الشاشة',
        'suspicious_pattern': 'نمط مشبوه'
      },
      en: {
        'screenshot_key': 'Screenshot Key',
        'right_click_image': 'Right Click on Image',
        'dev_tools': 'Developer Tools',
        'print_screen': 'Print Screen',
        'suspicious_pattern': 'Suspicious Pattern'
      }
    };
    return methods[language][method] || method;
  };

  const filteredIncidents = incidents.filter(incident =>
    incident.incident_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    incident.user_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    incident.ip_address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className={`p-6 ${isRTL ? 'rtl' : 'ltr'}`}>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isRTL ? 'حماية المحتوى' : 'Content Protection'}
          </h1>
          <p className="text-gray-600 mt-1">
            {isRTL ? 'حماية شاملة للمحتوى الفاخر من الاستخدام غير المصرح به' : 'Comprehensive protection for luxury content from unauthorized use'}
          </p>
        </div>
        <div className="flex space-x-2">
          <Button
            onClick={updateProtectionSettings}
            variant="outline"
            size="sm"
          >
            <Settings className="h-4 w-4 mr-2" />
            {isRTL ? 'الإعدادات' : 'Settings'}
          </Button>
          <Button
            onClick={loadAnalytics}
            disabled={loading}
            size="sm"
          >
            {loading ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            {isRTL ? 'تحديث' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">
                {isRTL ? 'العلامات المائية اليوم' : 'Watermarks Today'}
              </p>
              <p className="text-2xl font-semibold text-gray-900">
                {analytics.watermarks_applied || 0}
              </p>
            </div>
            <Eye className="h-8 w-8 text-blue-600" />
          </div>
          <div className="mt-2">
            <span className="text-xs text-green-600">↗ +12% من أمس</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">
                {isRTL ? 'حوادث الأمان' : 'Security Incidents'}
              </p>
              <p className="text-2xl font-semibold text-gray-900">
                {analytics.total_incidents || 0}
              </p>
            </div>
            <Shield className="h-8 w-8 text-red-600" />
          </div>
          <div className="mt-2">
            <span className="text-xs text-red-600">↗ +3 جديد</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">
                {isRTL ? 'الروابط المحمية' : 'Protected URLs'}
              </p>
              <p className="text-2xl font-semibold text-gray-900">
                {analytics.protected_url_accesses || 0}
              </p>
            </div>
            <Lock className="h-8 w-8 text-green-600" />
          </div>
          <div className="mt-2">
            <span className="text-xs text-green-600">↗ +25 نشط</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">
                {isRTL ? 'معدل الحماية' : 'Protection Rate'}
              </p>
              <p className="text-2xl font-semibold text-gray-900">98.5%</p>
            </div>
            <Activity className="h-8 w-8 text-purple-600" />
          </div>
          <div className="mt-2">
            <span className="text-xs text-green-600">↗ ممتاز</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: isRTL ? 'نظرة عامة' : 'Overview', icon: BarChart3 },
            { id: 'incidents', label: isRTL ? 'حوادث الأمان' : 'Security Incidents', icon: AlertTriangle },
            { id: 'watermarks', label: isRTL ? 'العلامات المائية' : 'Watermarks', icon: Eye },
            { id: 'settings', label: isRTL ? 'الإعدادات' : 'Settings', icon: Settings }
          ].map((tab) => {
            const IconComponent = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <IconComponent className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Content based on active tab */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Real-time Protection Status */}
          <div className="bg-white rounded-lg border shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {isRTL ? 'حالة الحماية المباشرة' : 'Real-time Protection Status'}
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Eye className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-medium text-gray-900">
                      {isRTL ? 'العلامات المائية' : 'Watermarks'}
                    </p>
                    <p className="text-sm text-gray-600">
                      {isRTL ? 'تعمل بشكل طبيعي' : 'Operating normally'}
                    </p>
                  </div>
                </div>
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>

              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Shield className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-medium text-gray-900">
                      {isRTL ? 'كشف لقطة الشاشة' : 'Screenshot Detection'}
                    </p>
                    <p className="text-sm text-gray-600">
                      {isRTL ? 'نشط ويعمل' : 'Active and monitoring'}
                    </p>
                  </div>
                </div>
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>

              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Lock className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-medium text-gray-900">
                      {isRTL ? 'حماية الروابط' : 'URL Protection'}
                    </p>
                    <p className="text-sm text-gray-600">
                      {isRTL ? 'جميع الروابط محمية' : 'All URLs protected'}
                    </p>
                  </div>
                </div>
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-lg border shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {isRTL ? 'النشاط الحديث' : 'Recent Activity'}
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <Eye className="h-4 w-4 text-blue-600" />
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    {isRTL ? 'تم تطبيق علامة مائية جديدة' : 'New watermark applied'}
                  </p>
                  <p className="text-sm text-gray-600">
                    {isRTL ? 'على منتج: خاتم ألماس فاخر' : 'On product: Luxury Diamond Ring'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {isRTL ? 'منذ 5 دقائق' : '5 minutes ago'}
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    {isRTL ? 'تم كشف محاولة لقطة شاشة' : 'Screenshot attempt detected'}
                  </p>
                  <p className="text-sm text-gray-600">
                    {isRTL ? 'من المستخدم: user123' : 'From user: user123'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {isRTL ? 'منذ 15 دقيقة' : '15 minutes ago'}
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <Lock className="h-4 w-4 text-green-600" />
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    {isRTL ? 'تم إنشاء رابط محمي جديد' : 'New protected URL generated'}
                  </p>
                  <p className="text-sm text-gray-600">
                    {isRTL ? 'صالح لمدة ساعة واحدة' : 'Valid for 1 hour'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {isRTL ? 'منذ 30 دقيقة' : '30 minutes ago'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'incidents' && (
        <div className="bg-white rounded-lg border shadow-sm">
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900">
                {isRTL ? 'حوادث الأمان' : 'Security Incidents'}
              </h3>
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    type="text"
                    placeholder={isRTL ? 'البحث في الحوادث...' : 'Search incidents...'}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  {isRTL ? 'فلتر' : 'Filter'}
                </Button>
              </div>
            </div>
            
            {filteredIncidents.length === 0 ? (
              <div className="text-center py-8">
                <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">
                  {isRTL ? 'لا توجد حوادث أمنية' : 'No security incidents'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {isRTL ? 'رقم الحادث' : 'Incident ID'}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {isRTL ? 'المستخدم' : 'User'}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {isRTL ? 'طريقة الكشف' : 'Detection Method'}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {isRTL ? 'الخطورة' : 'Severity'}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {isRTL ? 'الوقت' : 'Time'}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {isRTL ? 'الإجراءات' : 'Actions'}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredIncidents.map((incident) => (
                      <tr key={incident.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {incident.incident_id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {incident.user_id}
                          <br />
                          <span className="text-xs text-gray-400">{incident.ip_address}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {getDetectionMethodText(incident.detection_method)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSeverityColor(incident.severity)}`}>
                            {getSeverityIcon(incident.severity)}
                            <span className="ml-1 capitalize">{incident.severity}</span>
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(incident.timestamp).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedIncident(incident)}
                          >
                            {isRTL ? 'عرض التفاصيل' : 'View Details'}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'watermarks' && (
        <div className="bg-white rounded-lg border shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {isRTL ? 'إدارة العلامات المائية' : 'Watermark Management'}
          </h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Watermark Application */}
            <div className="border rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-4">
                {isRTL ? 'تطبيق علامة مائية' : 'Apply Watermark'}
              </h4>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {isRTL ? 'اختر صورة' : 'Select Image'}
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        applyWatermark(file);
                      }
                    }}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                </div>
                
                <div className="text-sm text-gray-600">
                  {isRTL ? 
                    'سيتم تطبيق العلامة المائية تلقائياً وتنزيل الصورة المحمية.' :
                    'Watermark will be applied automatically and protected image will be downloaded.'
                  }
                </div>
              </div>
            </div>

            {/* Watermark Settings */}
            <div className="border rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-4">
                {isRTL ? 'إعدادات العلامة المائية' : 'Watermark Settings'}
              </h4>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {isRTL ? 'شفافية العلامة المائية' : 'Watermark Opacity'}
                  </label>
                  <input
                    type="range"
                    min="10"
                    max="50"
                    value={protectionSettings.watermark_opacity}
                    onChange={(e) => setProtectionSettings(prev => ({
                      ...prev,
                      watermark_opacity: parseInt(e.target.value)
                    }))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>10%</span>
                    <span>{protectionSettings.watermark_opacity}%</span>
                    <span>50%</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">
                    {isRTL ? 'تفعيل العلامة المائية' : 'Enable Watermarks'}
                  </label>
                  <button
                    onClick={() => setProtectionSettings(prev => ({
                      ...prev,
                      watermark_enabled: !prev.watermark_enabled
                    }))}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      protectionSettings.watermark_enabled ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        protectionSettings.watermark_enabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="bg-white rounded-lg border shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">
            {isRTL ? 'إعدادات الحماية' : 'Protection Settings'}
          </h3>
          
          <div className="space-y-6">
            {/* Screenshot Detection */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="font-medium text-gray-900">
                    {isRTL ? 'كشف لقطة الشاشة' : 'Screenshot Detection'}
                  </h4>
                  <p className="text-sm text-gray-600">
                    {isRTL ? 'كشف محاولات أخذ لقطات شاشة للمحتوى' : 'Detect attempts to take screenshots of content'}
                  </p>
                </div>
                <button
                  onClick={() => setProtectionSettings(prev => ({
                    ...prev,
                    screenshot_detection: !prev.screenshot_detection
                  }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    protectionSettings.screenshot_detection ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      protectionSettings.screenshot_detection ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Right Click Protection */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="font-medium text-gray-900">
                    {isRTL ? 'حماية النقر الأيمن' : 'Right Click Protection'}
                  </h4>
                  <p className="text-sm text-gray-600">
                    {isRTL ? 'تعطيل النقر الأيمن على الصور' : 'Disable right-click on images'}
                  </p>
                </div>
                <button
                  onClick={() => setProtectionSettings(prev => ({
                    ...prev,
                    right_click_disabled: !prev.right_click_disabled
                  }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    protectionSettings.right_click_disabled ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      protectionSettings.right_click_disabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Developer Tools Detection */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="font-medium text-gray-900">
                    {isRTL ? 'كشف أدوات المطور' : 'Developer Tools Detection'}
                  </h4>
                  <p className="text-sm text-gray-600">
                    {isRTL ? 'كشف فتح أدوات المطور في المتصفح' : 'Detect opening of browser developer tools'}
                  </p>
                </div>
                <button
                  onClick={() => setProtectionSettings(prev => ({
                    ...prev,
                    dev_tools_detection: !prev.dev_tools_detection
                  }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    protectionSettings.dev_tools_detection ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      protectionSettings.dev_tools_detection ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* URL Protection */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="font-medium text-gray-900">
                    {isRTL ? 'حماية الروابط' : 'URL Protection'}
                  </h4>
                  <p className="text-sm text-gray-600">
                    {isRTL ? 'إنشاء روابط محمية محدودة الوقت للموارد' : 'Generate time-limited protected URLs for resources'}
                  </p>
                </div>
                <button
                  onClick={() => setProtectionSettings(prev => ({
                    ...prev,
                    url_protection: !prev.url_protection
                  }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    protectionSettings.url_protection ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      protectionSettings.url_protection ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
            
            <div className="pt-4">
              <Button onClick={updateProtectionSettings} className="w-full">
                {isRTL ? 'حفظ الإعدادات' : 'Save Settings'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContentProtectionPage;