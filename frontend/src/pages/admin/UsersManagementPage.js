import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { Trash2, Edit, Shield, ShieldOff, Key, Search, UserPlus } from 'lucide-react';
import axios from 'axios';

const UsersManagementPage = () => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
  
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');

  // Check if user is super admin
  useEffect(() => {
    if (!user || !user.is_super_admin) {
      navigate('/');
    }
  }, [user, navigate]);

  // Fetch all users
  useEffect(() => {
    fetchUsers();
  }, []);

  // Refetch when sort changes
  useEffect(() => {
    if (users.length > 0) {
      fetchUsers();
    }
  }, [sortBy, sortOrder]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${BACKEND_URL}/api/admin/users?sort_by=${sortBy}&sort_order=${sortOrder}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
      alert(language === 'ar' ? 'فشل تحميل المستخدمين' : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm(language === 'ar' ? 'هل أنت متأكد من حذف هذا المستخدم؟' : 'Are you sure you want to delete this user?')) {
      return;
    }

    try {
      setActionLoading(true);
      const token = localStorage.getItem('token');
      await axios.delete(`${BACKEND_URL}/api/admin/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert(language === 'ar' ? 'تم حذف المستخدم بنجاح' : 'User deleted successfully');
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      alert(language === 'ar' ? 'فشل حذف المستخدم' : 'Failed to delete user');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleAdmin = async (userId, currentStatus) => {
    try {
      setActionLoading(true);
      const token = localStorage.getItem('token');
      await axios.patch(`${BACKEND_URL}/api/admin/users/${userId}/toggle-admin`, 
        { is_admin: !currentStatus },
        { headers: { Authorization: `Bearer ${token}` }}
      );
      alert(language === 'ar' ? 'تم تحديث الصلاحيات بنجاح' : 'Permissions updated successfully');
      fetchUsers();
    } catch (error) {
      console.error('Error toggling admin:', error);
      alert(language === 'ar' ? 'فشل تحديث الصلاحيات' : 'Failed to update permissions');
    } finally {
      setActionLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      alert(language === 'ar' ? 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' : 'Password must be at least 6 characters');
      return;
    }

    try {
      setActionLoading(true);
      const token = localStorage.getItem('token');
      await axios.patch(`${BACKEND_URL}/api/admin/users/${selectedUser.id}/change-password`,
        { new_password: newPassword },
        { headers: { Authorization: `Bearer ${token}` }}
      );
      alert(language === 'ar' ? 'تم تغيير كلمة المرور بنجاح' : 'Password changed successfully');
      setShowPasswordModal(false);
      setNewPassword('');
      setSelectedUser(null);
    } catch (error) {
      console.error('Error changing password:', error);
      alert(language === 'ar' ? 'فشل تغيير كلمة المرور' : 'Failed to change password');
    } finally {
      setActionLoading(false);
    }
  };

  const filteredUsers = users.filter(u => 
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.phone?.includes(searchTerm) ||
    u.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.last_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-500 mb-2">
            {language === 'ar' ? 'إدارة المستخدمين' : 'Users Management'}
          </h1>
          <p className="text-gray-400">
            {language === 'ar' ? 'إدارة كاملة لجميع المستخدمين في النظام' : 'Full management of all users in the system'}
          </p>
        </div>

        {/* Search Bar and Sort Options - Updated */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="relative md:col-span-2">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder={language === 'ar' ? 'ابحث عن مستخدم (البريد، الهاتف، الاسم)...' : 'Search user (email, phone, name)...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-800/50 border border-gray-700 rounded-xl pl-12 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 transition-all"
            />
          </div>

          {/* Sort By */}
          <div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500 transition-all"
            >
              <option value="created_at">{language === 'ar' ? 'تاريخ التسجيل' : 'Registration Date'}</option>
              <option value="last_activity">{language === 'ar' ? 'آخر نشاط' : 'Last Activity'}</option>
              <option value="total_orders">{language === 'ar' ? 'عدد الطلبات' : 'Total Orders'}</option>
              <option value="total_activity_time">{language === 'ar' ? 'وقت النشاط' : 'Activity Time'}</option>
            </select>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-gray-800/30 backdrop-blur-sm rounded-2xl border border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-900/50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-amber-400">
                    {language === 'ar' ? 'الاسم' : 'Name'}
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-amber-400">
                    {language === 'ar' ? 'البريد الإلكتروني' : 'Email'}
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-amber-400">
                    {language === 'ar' ? 'رقم الهاتف' : 'Phone'}
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-amber-400">
                    {language === 'ar' ? 'عدد الطلبات' : 'Orders'}
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-amber-400">
                    {language === 'ar' ? 'آخر نشاط' : 'Last Activity'}
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-amber-400">
                    {language === 'ar' ? 'الصلاحيات' : 'Role'}
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-amber-400">
                    {language === 'ar' ? 'الإجراءات' : 'Actions'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-700/30 transition-colors">
                    <td className="px-6 py-4 text-white">
                      {u.first_name} {u.last_name}
                    </td>
                    <td className="px-6 py-4 text-gray-300">
                      {u.email}
                    </td>
                    <td className="px-6 py-4 text-gray-300">
                      {u.phone || '-'}
                    </td>
                    <td className="px-6 py-4 text-gray-300">
                      <span className="inline-flex items-center px-2 py-1 rounded-md bg-blue-500/20 text-blue-400 text-sm font-medium">
                        {u.total_orders || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-300 text-sm">
                      {u.last_activity ? new Date(u.last_activity).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : (language === 'ar' ? 'لم ينشط بعد' : 'No activity')}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                        u.is_admin 
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/50' 
                          : 'bg-gray-700/50 text-gray-400 border border-gray-600'
                      }`}>
                        {u.is_admin ? (language === 'ar' ? 'مدير' : 'Admin') : (language === 'ar' ? 'مستخدم' : 'User')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2 rtl:space-x-reverse">
                        {/* Toggle Admin */}
                        <button
                          onClick={() => handleToggleAdmin(u.id, u.is_admin)}
                          disabled={actionLoading}
                          className="p-2 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 transition-colors disabled:opacity-50"
                          title={u.is_admin ? (language === 'ar' ? 'إزالة صلاحيات المدير' : 'Remove Admin') : (language === 'ar' ? 'منح صلاحيات المدير' : 'Make Admin')}
                        >
                          {u.is_admin ? <ShieldOff className="h-4 w-4" /> : <Shield className="h-4 w-4" />}
                        </button>

                        {/* Change Password */}
                        <button
                          onClick={() => {
                            setSelectedUser(u);
                            setShowPasswordModal(true);
                          }}
                          disabled={actionLoading}
                          className="p-2 rounded-lg bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 transition-colors disabled:opacity-50"
                          title={language === 'ar' ? 'تغيير كلمة المرور' : 'Change Password'}
                        >
                          <Key className="h-4 w-4" />
                        </button>

                        {/* Delete User */}
                        <button
                          onClick={() => handleDeleteUser(u.id)}
                          disabled={actionLoading}
                          className="p-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-colors disabled:opacity-50"
                          title={language === 'ar' ? 'حذف المستخدم' : 'Delete User'}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredUsers.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-400">
                {language === 'ar' ? 'لا توجد نتائج' : 'No results found'}
              </p>
            </div>
          )}
        </div>

        {/* Total Users */}
        <div className="mt-6 text-center text-gray-400">
          {language === 'ar' ? `إجمالي المستخدمين: ${users.length}` : `Total Users: ${users.length}`}
        </div>
      </div>

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl border border-gray-700 p-8 max-w-md w-full">
            <h2 className="text-2xl font-bold text-amber-400 mb-4">
              {language === 'ar' ? 'تغيير كلمة المرور' : 'Change Password'}
            </h2>
            <p className="text-gray-400 mb-6">
              {language === 'ar' ? `المستخدم: ${selectedUser?.first_name} ${selectedUser?.last_name}` : `User: ${selectedUser?.first_name} ${selectedUser?.last_name}`}
            </p>
            <input
              type="password"
              placeholder={language === 'ar' ? 'كلمة المرور الجديدة' : 'New Password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 mb-6"
              minLength={6}
            />
            <div className="flex space-x-4 rtl:space-x-reverse">
              <button
                onClick={handleChangePassword}
                disabled={actionLoading}
                className="flex-1 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-white font-bold py-3 px-6 rounded-xl transition-all disabled:opacity-50"
              >
                {actionLoading ? (language === 'ar' ? 'جاري...' : 'Loading...') : (language === 'ar' ? 'تأكيد' : 'Confirm')}
              </button>
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setNewPassword('');
                  setSelectedUser(null);
                }}
                disabled={actionLoading}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-xl transition-all disabled:opacity-50"
              >
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersManagementPage;


