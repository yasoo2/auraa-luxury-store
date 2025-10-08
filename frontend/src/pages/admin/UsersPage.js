import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import axios from 'axios';
import {
  Users,
  UserCheck,
  UserX,
  Shield,
  Mail,
  Phone,
  Calendar,
  Search,
  Filter,
  Edit,
  Eye,
  Ban,
  CheckCircle,
  X
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const UsersPage = () => {
  const { t, language } = useLanguage();
  const isRTL = language === 'ar';
  
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/admin/users`);
      setUsers(response.data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      // For now, show mock data since backend endpoint might not exist yet
      setUsers(generateMockUsers());
    } finally {
      setLoading(false);
    }
  };

  const generateMockUsers = () => {
    return [
      {
        id: 'user-001',
        email: 'admin@auraa.com',
        first_name: 'مدير',
        last_name: 'النظام',
        phone: '+966501234567',
        is_admin: true,
        is_active: true,
        created_at: '2025-01-01T10:00:00Z',
        last_login: '2025-01-07T08:30:00Z',
        orders_count: 0,
        total_spent: 0
      },
      {
        id: 'user-002',
        email: 'fatima@example.com',
        first_name: 'فاطمة',
        last_name: 'أحمد',
        phone: '+966501234568',
        is_admin: false,
        is_active: true,
        created_at: '2025-01-02T14:30:00Z',
        last_login: '2025-01-06T16:45:00Z',
        orders_count: 3,
        total_spent: 899.97
      },
      {
        id: 'user-003',
        email: 'sara@example.com',
        first_name: 'سارة',
        last_name: 'محمد',
        phone: '+966501234569',
        is_admin: false,
        is_active: true,
        created_at: '2025-01-03T09:15:00Z',
        last_login: '2025-01-06T12:20:00Z',
        orders_count: 1,
        total_spent: 299.99
      },
      {
        id: 'user-004',
        email: 'nora@example.com',
        first_name: 'نورا',
        last_name: 'سعد',
        phone: '+966501234570',
        is_admin: false,
        is_active: true,
        created_at: '2025-01-04T11:00:00Z',
        last_login: '2025-01-05T18:30:00Z',
        orders_count: 2,
        total_spent: 1149.98
      },
      {
        id: 'user-005',
        email: 'amal@example.com',
        first_name: 'أمل',
        last_name: 'خالد',
        phone: '+966501234571',
        is_admin: false,
        is_active: false,
        created_at: '2025-01-05T16:45:00Z',
        last_login: '2025-01-05T17:00:00Z',
        orders_count: 1,
        total_spent: 249.99
      },
      {
        id: 'user-006',
        email: 'reem@example.com',
        first_name: 'ريم',
        last_name: 'عبدالله',
        phone: '+966501234572',
        is_admin: false,
        is_active: true,
        created_at: '2025-01-06T13:20:00Z',
        last_login: null,
        orders_count: 0,
        total_spent: 0
      }
    ];
  };

  const updateUserStatus = async (userId, newStatus) => {
    try {
      await axios.put(`${API}/admin/users/${userId}`, { is_active: newStatus });
      setUsers(users.map(user => 
        user.id === userId ? { ...user, is_active: newStatus } : user
      ));
    } catch (error) {
      console.error('Error updating user status:', error);
      // For mock data, just update locally
      setUsers(users.map(user => 
        user.id === userId ? { ...user, is_active: newStatus } : user
      ));
    }
  };

  const toggleAdminRole = async (userId, isAdmin) => {
    try {
      await axios.put(`${API}/admin/users/${userId}`, { is_admin: isAdmin });
      setUsers(users.map(user => 
        user.id === userId ? { ...user, is_admin: isAdmin } : user
      ));
    } catch (error) {
      console.error('Error updating user role:', error);
      // For mock data, just update locally
      setUsers(users.map(user => 
        user.id === userId ? { ...user, is_admin: isAdmin } : user
      ));
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesRole = roleFilter === 'all' || 
                       (roleFilter === 'admin' && user.is_admin) ||
                       (roleFilter === 'customer' && !user.is_admin);
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'active' && user.is_active) ||
                         (statusFilter === 'inactive' && !user.is_active);
    const matchesSearch = user.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesRole && matchesStatus && matchesSearch;
  });

  const formatDate = (dateString) => {
    if (!dateString) return isRTL ? 'لم يسجل دخول' : 'Never logged in';
    const date = new Date(dateString);
    return date.toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Users className="h-8 w-8 text-amber-600" />
          <h1 className="text-3xl font-bold text-gray-900">
            {isRTL ? 'إدارة المستخدمين' : 'Users Management'}
          </h1>
        </div>
        <div className="text-sm text-gray-500 space-y-1">
          <div>{isRTL ? `إجمالي المستخدمين: ${users.length}` : `Total Users: ${users.length}`}</div>
          <div>{isRTL ? `المدراء: ${users.filter(u => u.is_admin).length}` : `Admins: ${users.filter(u => u.is_admin).length}`}</div>
          <div>{isRTL ? `العملاء: ${users.filter(u => !u.is_admin).length}` : `Customers: ${users.filter(u => !u.is_admin).length}`}</div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">{isRTL ? 'المستخدمين النشطين' : 'Active Users'}</p>
              <p className="text-2xl font-bold text-blue-900">{users.filter(u => u.is_active).length}</p>
            </div>
            <UserCheck className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-amber-50 to-amber-100 p-4 rounded-lg border border-amber-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-amber-600">{isRTL ? 'المدراء' : 'Admins'}</p>
              <p className="text-2xl font-bold text-amber-900">{users.filter(u => u.is_admin).length}</p>
            </div>
            <Shield className="h-8 w-8 text-amber-600" />
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">{isRTL ? 'العملاء المتسوقين' : 'Customers with Orders'}</p>
              <p className="text-2xl font-bold text-green-900">{users.filter(u => !u.is_admin && u.orders_count > 0).length}</p>
            </div>
            <Users className="h-8 w-8 text-green-600" />
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-red-50 to-red-100 p-4 rounded-lg border border-red-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-600">{isRTL ? 'المستخدمين المعطلين' : 'Inactive Users'}</p>
              <p className="text-2xl font-bold text-red-900">{users.filter(u => !u.is_active).length}</p>
            </div>
            <UserX className="h-8 w-8 text-red-600" />
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400`} />
              <Input
                type="text"
                placeholder={isRTL ? 'البحث في المستخدمين...' : 'Search users...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`${isRTL ? 'pr-10' : 'pl-10'} w-full`}
              />
            </div>
          </div>
          
          {/* Role Filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            >
              <option value="all">{isRTL ? 'جميع الأدوار' : 'All Roles'}</option>
              <option value="admin">{isRTL ? 'المدراء' : 'Admins'}</option>
              <option value="customer">{isRTL ? 'العملاء' : 'Customers'}</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            >
              <option value="all">{isRTL ? 'جميع الحالات' : 'All Statuses'}</option>
              <option value="active">{isRTL ? 'نشط' : 'Active'}</option>
              <option value="inactive">{isRTL ? 'معطل' : 'Inactive'}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {isRTL ? 'المستخدم' : 'User'}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {isRTL ? 'الدور' : 'Role'}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {isRTL ? 'الحالة' : 'Status'}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {isRTL ? 'الطلبات' : 'Orders'}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {isRTL ? 'إجمالي المشتريات' : 'Total Spent'}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {isRTL ? 'آخر دخول' : 'Last Login'}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {isRTL ? 'الإجراءات' : 'Actions'}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 flex items-center justify-center">
                          <span className="text-white font-semibold text-sm">
                            {user.first_name.charAt(0)}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {user.first_name} {user.last_name}
                        </div>
                        <div className="text-sm text-gray-500 flex items-center">
                          <Mail className="h-3 w-3 mr-1" />
                          {user.email}
                        </div>
                        {user.phone && (
                          <div className="text-sm text-gray-500 flex items-center">
                            <Phone className="h-3 w-3 mr-1" />
                            {user.phone}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      user.is_admin 
                        ? 'bg-purple-100 text-purple-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {user.is_admin ? (
                        <>
                          <Shield className="h-3 w-3 mr-1" />
                          {isRTL ? 'مدير' : 'Admin'}
                        </>
                      ) : (
                        <>
                          <Users className="h-3 w-3 mr-1" />
                          {isRTL ? 'عميل' : 'Customer'}
                        </>
                      )}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      user.is_active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {user.is_active ? (
                        <>
                          <CheckCircle className="h-3 w-3 mr-1" />
                          {isRTL ? 'نشط' : 'Active'}
                        </>
                      ) : (
                        <>
                          <Ban className="h-3 w-3 mr-1" />
                          {isRTL ? 'معطل' : 'Inactive'}
                        </>
                      )}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.orders_count || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${(user.total_spent || 0).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(user.last_login)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <Button
                      onClick={() => {
                        setSelectedUser(user);
                        setShowUserModal(true);
                      }}
                      variant="ghost"
                      size="sm"
                      className="text-amber-600 hover:text-amber-900"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      {isRTL ? 'عرض' : 'View'}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Details Modal */}
      {showUserModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  {isRTL ? 'تفاصيل المستخدم' : 'User Details'}
                </h2>
                <Button
                  onClick={() => setShowUserModal(false)}
                  variant="ghost"
                  size="sm"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* User Info */}
              <div className="mb-6">
                <div className="flex items-center mb-4">
                  <div className="h-16 w-16 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 flex items-center justify-center mr-4">
                    <span className="text-white font-bold text-xl">
                      {selectedUser.first_name.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold">{selectedUser.first_name} {selectedUser.last_name}</h3>
                    <p className="text-gray-600">{selectedUser.email}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold mb-2">{isRTL ? 'معلومات الاتصال' : 'Contact Information'}</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center">
                        <Mail className="h-4 w-4 mr-2 text-gray-500" />
                        {selectedUser.email}
                      </div>
                      {selectedUser.phone && (
                        <div className="flex items-center">
                          <Phone className="h-4 w-4 mr-2 text-gray-500" />
                          {selectedUser.phone}
                        </div>
                      )}
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                        {isRTL ? 'انضم في:' : 'Joined:'} {formatDate(selectedUser.created_at)}
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold mb-2">{isRTL ? 'إحصائيات التسوق' : 'Shopping Stats'}</h4>
                    <div className="space-y-2 text-sm">
                      <div>{isRTL ? 'عدد الطلبات:' : 'Total Orders:'} {selectedUser.orders_count || 0}</div>
                      <div>{isRTL ? 'إجمالي المشتريات:' : 'Total Spent:'} ${(selectedUser.total_spent || 0).toFixed(2)}</div>
                      <div>{isRTL ? 'آخر دخول:' : 'Last Login:'} {formatDate(selectedUser.last_login)}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* User Actions */}
              <div className="mb-6">
                <h4 className="font-semibold mb-3">{isRTL ? 'إجراءات المستخدم' : 'User Actions'}</h4>
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() => updateUserStatus(selectedUser.id, !selectedUser.is_active)}
                    variant={selectedUser.is_active ? "destructive" : "default"}
                    size="sm"
                    className={!selectedUser.is_active ? "bg-green-600 hover:bg-green-700" : ""}
                  >
                    {selectedUser.is_active ? (
                      <>
                        <Ban className="h-4 w-4 mr-1" />
                        {isRTL ? 'تعطيل الحساب' : 'Deactivate Account'}
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-1" />
                        {isRTL ? 'تفعيل الحساب' : 'Activate Account'}
                      </>
                    )}
                  </Button>

                  {!selectedUser.is_admin && (
                    <Button
                      onClick={() => toggleAdminRole(selectedUser.id, true)}
                      variant="outline"
                      size="sm"
                      className="border-purple-300 text-purple-600 hover:bg-purple-50"
                    >
                      <Shield className="h-4 w-4 mr-1" />
                      {isRTL ? 'منح صلاحيات الإدارة' : 'Grant Admin Role'}
                    </Button>
                  )}

                  {selectedUser.is_admin && selectedUser.email !== 'admin@auraa.com' && (
                    <Button
                      onClick={() => toggleAdminRole(selectedUser.id, false)}
                      variant="outline"
                      size="sm"
                      className="border-gray-300 text-gray-600 hover:bg-gray-50"
                    >
                      <Users className="h-4 w-4 mr-1" />
                      {isRTL ? 'إزالة صلاحيات الإدارة' : 'Remove Admin Role'}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersPage;