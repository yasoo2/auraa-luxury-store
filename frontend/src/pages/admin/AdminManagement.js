import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { formatDate } from '../../utils/dateUtils';
import { toast } from 'sonner';
import { 
  Shield, ShieldAlert, User, Mail, Phone, Key, 
  Trash2, ToggleLeft, ToggleRight, Search, Filter,
  AlertCircle, Clock, Activity, TrendingUp
} from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const AdminManagement = () => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  
  const [admins, setAdmins] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentAction, setCurrentAction] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all'); // 'all', 'super_admin', 'admin'
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [newPassword, setNewPassword] = useState('');

  // Check if user is super admin
  const isSuperAdmin = user?.is_super_admin || false;

  useEffect(() => {
    if (isSuperAdmin) {
      fetchAdmins();
      fetchStatistics();
    }
  }, [isSuperAdmin]);

  const fetchAdmins = async () => {
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        toast.error(isRTL ? 'يرجى تسجيل الدخول' : 'Please login');
        return;
      }

      const response = await axios.get(
        `${BACKEND_URL}/api/super-admin/manage/list-all-admins`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setAdmins(response.data.admins);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching admins:', error);
      toast.error(isRTL ? 'فشل في تحميل المسؤولين' : 'Failed to load admins');
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      const token = localStorage.getItem('token');
      
      if (!token) return;

      const response = await axios.get(
        `${BACKEND_URL}/api/super-admin/manage/statistics`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setStatistics(response.data);
    } catch (error) {
      console.error('Error fetching statistics:', error);
    }
  };

  const handleVerifyPassword = () => {
    setShowPasswordModal(false);
    fetchAdmins();
    fetchStatistics();
  };

  const handleChangeRole = async (userId, newRole) => {
    if (!password) {
      setShowPasswordModal(true);
      setCurrentAction({ type: 'change_role', userId, newRole });
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const identifier = user?.email || user?.phone;

      await axios.post(
        `${BACKEND_URL}/api/super-admin/manage/change-role`,
        {
          user_id: userId,
          new_role: newRole,
          current_password: password
        },
        {
          params: { current_admin_identifier: identifier },
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      toast.success(isRTL ? 'تم تغيير الدور بنجاح' : 'Role changed successfully');
      fetchAdmins();
      fetchStatistics();
    } catch (error) {
      console.error('Error changing role:', error);
      toast.error(isRTL ? 'فشل في تغيير الدور' : 'Failed to change role');
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast.error(isRTL ? 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' : 'Password must be at least 6 characters');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const identifier = user?.email || user?.phone;

      await axios.post(
        `${BACKEND_URL}/api/super-admin/manage/reset-password`,
        {
          user_id: selectedAdmin.id,
          new_password: newPassword,
          current_password: password
        },
        {
          params: { current_admin_identifier: identifier },
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      toast.success(isRTL ? 'تم إعادة تعيين كلمة المرور بنجاح' : 'Password reset successfully');
      setShowResetPasswordModal(false);
      setNewPassword('');
      setSelectedAdmin(null);
    } catch (error) {
      console.error('Error resetting password:', error);
      toast.error(isRTL ? 'فشل في إعادة تعيين كلمة المرور' : 'Failed to reset password');
    }
  };

  const handleToggleStatus = async (userId, currentStatus) => {
    if (!password) {
      setShowPasswordModal(true);
      setCurrentAction({ type: 'toggle_status', userId, currentStatus });
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const identifier = user?.email || user?.phone;

      await axios.post(
        `${BACKEND_URL}/api/super-admin/manage/toggle-status`,
        {
          user_id: userId,
          is_active: !currentStatus,
          current_password: password
        },
        {
          params: { current_admin_identifier: identifier },
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      toast.success(isRTL ? 'تم تحديث الحالة بنجاح' : 'Status updated successfully');
      fetchAdmins();
    } catch (error) {
      console.error('Error toggling status:', error);
      toast.error(isRTL ? 'فشل في تحديث الحالة' : 'Failed to update status');
    }
  };

  const handleDeleteAdmin = async (userId) => {
    const confirmMessage = isRTL 
      ? 'هل أنت متأكد من حذف هذا المسؤول؟ هذا الإجراء لا يمكن التراجع عنه!'
      : 'Are you sure you want to delete this admin? This action cannot be undone!';
    
    if (!window.confirm(confirmMessage)) return;

    try {
      const token = localStorage.getItem('token');
      const identifier = user?.email || user?.phone;

      await axios.delete(
        `${BACKEND_URL}/api/super-admin/manage/delete-admin/${userId}`,
        {
          params: {
            current_admin_identifier: identifier,
            current_password: password
          },
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      toast.success(isRTL ? 'تم حذف المسؤول بنجاح' : 'Admin deleted successfully');
      fetchAdmins();
      fetchStatistics();
    } catch (error) {
      console.error('Error deleting admin:', error);
      const errorMessage = error.response?.data?.detail || (isRTL ? 'فشل في حذف المسؤول' : 'Failed to delete admin');
      toast.error(errorMessage);
    }
  };

  // Filter admins
  const filteredAdmins = admins.filter(admin => {
    const matchesSearch = 
      admin.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      admin.phone?.includes(searchTerm) ||
      `${admin.first_name} ${admin.last_name}`.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = 
      filterRole === 'all' ||
      (filterRole === 'super_admin' && admin.is_super_admin) ||
      (filterRole === 'admin' && admin.is_admin && !admin.is_super_admin);
    
    return matchesSearch && matchesFilter;
  });

  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            {isRTL ? 'وصول محظور' : 'Access Denied'}
          </h2>
          <p className="text-gray-600">
            {isRTL 
              ? 'هذه الصفحة متاحة فقط للسوبر أدمن'
              : 'This page is only accessible to Super Admins'
            }
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 p-4 ${isRTL ? 'rtl' : 'ltr'}`}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-600 to-orange-600 rounded-2xl shadow-2xl p-8 mb-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
                <ShieldAlert className="h-10 w-10" />
                {isRTL ? 'إدارة المسؤولين' : 'Admin Management'}
              </h1>
              <p className="text-amber-100">
                {isRTL 
                  ? 'إدارة المسؤولين والسوبر أدمن'
                  : 'Manage Admins and Super Admins'
                }
              </p>
            </div>
            <Shield className="h-20 w-20 opacity-20" />
          </div>
        </div>

        {/* Statistics */}
        {statistics && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm">{isRTL ? 'إجمالي المستخدمين' : 'Total Users'}</p>
                  <p className="text-3xl font-bold text-gray-800">{statistics.total_users}</p>
                </div>
                <User className="h-12 w-12 text-blue-500" />
              </div>
            </div>
            
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm">{isRTL ? 'السوبر أدمن' : 'Super Admins'}</p>
                  <p className="text-3xl font-bold text-red-600">{statistics.total_super_admins}</p>
                </div>
                <ShieldAlert className="h-12 w-12 text-red-500" />
              </div>
            </div>
            
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm">{isRTL ? 'المسؤولين' : 'Admins'}</p>
                  <p className="text-3xl font-bold text-amber-600">{statistics.total_admins}</p>
                </div>
                <Shield className="h-12 w-12 text-amber-500" />
              </div>
            </div>
            
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm">{isRTL ? 'نشط' : 'Active'}</p>
                  <p className="text-3xl font-bold text-green-600">{statistics.active_admins}</p>
                </div>
                <TrendingUp className="h-12 w-12 text-green-500" />
              </div>
            </div>
          </div>
        )}

        {/* Search and Filter */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400`} />
              <input
                type="text"
                placeholder={isRTL ? 'بحث بالاسم، البريد، أو الهاتف...' : 'Search by name, email, or phone...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full ${isRTL ? 'pr-10' : 'pl-10'} py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent`}
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-gray-400" />
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              >
                <option value="all">{isRTL ? 'الكل' : 'All'}</option>
                <option value="super_admin">{isRTL ? 'سوبر أدمن' : 'Super Admins'}</option>
                <option value="admin">{isRTL ? 'مسؤولين' : 'Admins'}</option>
              </select>
            </div>
          </div>
        </div>

        {/* Admins Table */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
                <tr>
                  <th className="px-6 py-4 text-right font-semibold">{isRTL ? 'الاسم' : 'Name'}</th>
                  <th className="px-6 py-4 text-right font-semibold">{isRTL ? 'الاتصال' : 'Contact'}</th>
                  <th className="px-6 py-4 text-center font-semibold">{isRTL ? 'الدور' : 'Role'}</th>
                  <th className="px-6 py-4 text-center font-semibold">{isRTL ? 'الحالة' : 'Status'}</th>
                  <th className="px-6 py-4 text-center font-semibold">{isRTL ? 'آخر دخول' : 'Last Login'}</th>
                  <th className="px-6 py-4 text-center font-semibold">{isRTL ? 'الإجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="6" className="text-center py-8">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto"></div>
                    </td>
                  </tr>
                ) : filteredAdmins.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-8 text-gray-500">
                      {isRTL ? 'لا يوجد مسؤولين' : 'No admins found'}
                    </td>
                  </tr>
                ) : (
                  filteredAdmins.map((admin) => (
                    <tr key={admin.id} className="border-b border-gray-200 hover:bg-amber-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <User className="h-5 w-5 text-gray-400" />
                          <span className="font-medium">{admin.first_name} {admin.last_name}</span>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          {admin.email && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Mail className="h-4 w-4" />
                              {admin.email}
                            </div>
                          )}
                          {admin.phone && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Phone className="h-4 w-4" />
                              {admin.phone}
                            </div>
                          )}
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 text-center">
                        <select
                          value={admin.is_super_admin ? 'super_admin' : admin.is_admin ? 'admin' : 'user'}
                          onChange={(e) => handleChangeRole(admin.id, e.target.value)}
                          disabled={admin.id === user?.id}
                          className={`px-3 py-1 rounded-full text-sm font-semibold ${
                            admin.is_super_admin
                              ? 'bg-red-100 text-red-700'
                              : admin.is_admin
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-gray-100 text-gray-700'
                          } ${admin.id === user?.id ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                          <option value="super_admin">{isRTL ? 'سوبر أدمن' : 'Super Admin'}</option>
                          <option value="admin">{isRTL ? 'مسؤول' : 'Admin'}</option>
                          <option value="user">{isRTL ? 'مستخدم' : 'User'}</option>
                        </select>
                      </td>
                      
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => handleToggleStatus(admin.id, admin.is_active)}
                          disabled={admin.id === user?.id}
                          className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold ${
                            admin.is_active
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          } ${admin.id === user?.id ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:opacity-80'}`}
                        >
                          {admin.is_active ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                          {admin.is_active ? (isRTL ? 'نشط' : 'Active') : (isRTL ? 'معطل' : 'Inactive')}
                        </button>
                      </td>
                      
                      <td className="px-6 py-4 text-center text-sm text-gray-600">
                        {admin.last_login ? (
                          <div className="flex items-center justify-center gap-1">
                            <Clock className="h-4 w-4" />
                            {formatDate(admin.last_login, language, { format: 'short' })}
                          </div>
                        ) : (
                          '-'
                        )}
                      </td>
                      
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedAdmin(admin);
                              setShowResetPasswordModal(true);
                            }}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title={isRTL ? 'إعادة تعيين كلمة المرور' : 'Reset Password'}
                          >
                            <Key className="h-5 w-5" />
                          </button>
                          
                          <button
                            onClick={() => handleDeleteAdmin(admin.id)}
                            disabled={admin.id === user?.id}
                            className={`p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors ${
                              admin.id === user?.id ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                            title={isRTL ? 'حذف' : 'Delete'}
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Password Verification Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
            <h3 className="text-2xl font-bold text-gray-800 mb-4">
              {isRTL ? 'تأكيد الهوية' : 'Verify Identity'}
            </h3>
            <p className="text-gray-600 mb-6">
              {isRTL 
                ? 'أدخل كلمة مرورك للمتابعة'
                : 'Enter your password to continue'
              }
            </p>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isRTL ? 'كلمة المرور' : 'Password'}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent mb-4"
              onKeyPress={(e) => e.key === 'Enter' && handleVerifyPassword()}
            />
            <div className="flex gap-3">
              <button
                onClick={handleVerifyPassword}
                className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white py-3 rounded-lg font-semibold hover:from-amber-600 hover:to-orange-600 transition-all"
              >
                {isRTL ? 'تأكيد' : 'Verify'}
              </button>
              <button
                onClick={() => setShowPasswordModal(false)}
                className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-all"
              >
                {isRTL ? 'إلغاء' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetPasswordModal && selectedAdmin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
            <h3 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Key className="h-6 w-6 text-amber-600" />
              {isRTL ? 'إعادة تعيين كلمة المرور' : 'Reset Password'}
            </h3>
            <p className="text-gray-600 mb-2">
              {isRTL ? 'إعادة تعيين كلمة المرور لـ:' : 'Reset password for:'}
            </p>
            <p className="font-semibold text-gray-800 mb-6">
              {selectedAdmin.first_name} {selectedAdmin.last_name}
            </p>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder={isRTL ? 'كلمة المرور الجديدة' : 'New Password'}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent mb-4"
              onKeyPress={(e) => e.key === 'Enter' && handleResetPassword()}
            />
            <div className="flex gap-3">
              <button
                onClick={handleResetPassword}
                className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white py-3 rounded-lg font-semibold hover:from-amber-600 hover:to-orange-600 transition-all"
              >
                {isRTL ? 'إعادة تعيين' : 'Reset'}
              </button>
              <button
                onClick={() => {
                  setShowResetPasswordModal(false);
                  setNewPassword('');
                  setSelectedAdmin(null);
                }}
                className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-all"
              >
                {isRTL ? 'إلغاء' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminManagement;
