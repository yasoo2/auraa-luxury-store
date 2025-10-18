import React, { useState, useEffect } from 'react';
import { Users, Shield, ShieldCheck, Trash2, KeyRound, RefreshCw, AlertTriangle, Check, X } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { toast } from 'sonner';
import { useLanguage } from '../context/LanguageContext';
import { formatDate } from '../utils/dateUtils';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AdminManagementSection = () => {
  const { language } = useLanguage();
  const isRTL = language === 'ar';

  const [admins, setAdmins] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Verification modal state
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationAction, setVerificationAction] = useState(null);
  const [verificationTarget, setVerificationTarget] = useState(null);
  const [sendingCode, setSendingCode] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [actionToken, setActionToken] = useState(null);

  useEffect(() => {
    fetchAllUsers();
  }, []);

  const fetchAllUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/admin/users/all`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setAdmins(response.data.admins || []);
      setUsers(response.data.users || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error(isRTL ? 'فشل في تحميل المستخدمين' : 'Failed to load users');
      setLoading(false);
    }
  };

  const requestVerificationCode = async (action, targetUserId, contactMethod = 'email') => {
    setSendingCode(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API}/admin/send-verification-code`,
        {
          action,
          target_user_id: targetUserId,
          contact_method: contactMethod
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success(
        isRTL 
          ? 'تم إرسال كود التحقق إلى بريدك الإلكتروني' 
          : 'Verification code sent to your email'
      );
      
      setVerificationAction({ action, targetUserId });
      setShowVerificationModal(true);
    } catch (error) {
      console.error('Error sending verification code:', error);
      toast.error(
        isRTL 
          ? 'فشل في إرسال كود التحقق' 
          : 'Failed to send verification code'
      );
    } finally {
      setSendingCode(false);
    }
  };

  const verifyCode = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      toast.error(isRTL ? 'الرجاء إدخال كود صحيح مكون من 6 أرقام' : 'Please enter a valid 6-digit code');
      return;
    }

    setVerifyingCode(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API}/admin/verify-code`,
        {
          code: verificationCode,
          action: verificationAction.action,
          target_user_id: verificationAction.targetUserId
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setActionToken(response.data.action_token);
      setShowVerificationModal(false);
      setVerificationCode('');
      
      // Execute the action
      executeVerifiedAction(response.data.action_token);
      
    } catch (error) {
      console.error('Error verifying code:', error);
      toast.error(
        isRTL 
          ? 'كود التحقق غير صحيح أو منتهي الصلاحية' 
          : 'Invalid or expired verification code'
      );
    } finally {
      setVerifyingCode(false);
    }
  };

  const executeVerifiedAction = async (token) => {
    const { action, targetUserId } = verificationAction;
    
    try {
      if (action === 'delete_user') {
        await handleDeleteUser(targetUserId, token);
      } else if (action === 'change_password') {
        await handleResetPassword(targetUserId, token);
      } else if (action === 'change_role') {
        await handleChangeRole(targetUserId, verificationTarget.newRole, token);
      }
    } catch (error) {
      console.error('Error executing action:', error);
    }
  };

  const handleDeleteUser = async (userId, token) => {
    try {
      const authToken = localStorage.getItem('token');
      await axios.delete(`${API}/admin/super-admin-delete/${userId}`, {
        headers: { 
          Authorization: `Bearer ${authToken}`,
          'X-Action-Token': token
        }
      });

      toast.success(isRTL ? 'تم حذف المستخدم بنجاح' : 'User deleted successfully');
      fetchAllUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error(isRTL ? 'فشل في حذف المستخدم' : 'Failed to delete user');
    }
  };

  const handleResetPassword = async (userId, token) => {
    try {
      const authToken = localStorage.getItem('token');
      const response = await axios.post(
        `${API}/admin/super-admin-reset-password`,
        { user_id: userId },
        {
          headers: { 
            Authorization: `Bearer ${authToken}`,
            'X-Action-Token': token
          }
        }
      );

      toast.success(
        isRTL 
          ? `تم إعادة تعيين كلمة المرور. الكلمة الجديدة: ${response.data.new_password}` 
          : `Password reset. New password: ${response.data.new_password}`
      );
    } catch (error) {
      console.error('Error resetting password:', error);
      toast.error(isRTL ? 'فشل في إعادة تعيين كلمة المرور' : 'Failed to reset password');
    }
  };

  const handleChangeRole = async (userId, newRole, token) => {
    try {
      const authToken = localStorage.getItem('token');
      await axios.post(
        `${API}/admin/super-admin-change-role`,
        { 
          user_id: userId,
          is_admin: newRole === 'admin' || newRole === 'super_admin',
          is_super_admin: newRole === 'super_admin'
        },
        {
          headers: { 
            Authorization: `Bearer ${authToken}`,
            'X-Action-Token': token
          }
        }
      );

      toast.success(isRTL ? 'تم تغيير الصلاحيات بنجاح' : 'Role changed successfully');
      fetchAllUsers();
    } catch (error) {
      console.error('Error changing role:', error);
      toast.error(isRTL ? 'فشل في تغيير الصلاحيات' : 'Failed to change role');
    }
  };

  const initiateRoleChange = (user, newRole) => {
    setVerificationTarget({ ...user, newRole });
    requestVerificationCode('change_role', user.id);
  };

  const initiatePasswordReset = (user) => {
    setVerificationTarget(user);
    requestVerificationCode('change_password', user.id);
  };

  const initiateDeleteUser = (user) => {
    setVerificationTarget(user);
    requestVerificationCode('delete_user', user.id);
  };

  const renderUserRow = (user, isAdmin = false) => (
    <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          {user.is_super_admin && <ShieldCheck className="h-4 w-4 text-red-500" />}
          {user.is_admin && !user.is_super_admin && <Shield className="h-4 w-4 text-orange-500" />}
          <div>
            <p className="font-medium text-gray-900">
              {user.first_name} {user.last_name}
            </p>
            <p className="text-sm text-gray-500">
              {user.email || user.phone || '-'}
            </p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          user.is_super_admin 
            ? 'bg-red-100 text-red-700'
            : user.is_admin
            ? 'bg-orange-100 text-orange-700'
            : 'bg-blue-100 text-blue-700'
        }`}>
          {user.is_super_admin 
            ? (isRTL ? 'سوبر أدمن' : 'Super Admin')
            : user.is_admin
            ? (isRTL ? 'أدمن' : 'Admin')
            : (isRTL ? 'مستخدم' : 'User')}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          {/* Role Change Buttons */}
          {!user.is_super_admin && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => initiateRoleChange(user, 'super_admin')}
              className="text-xs"
              disabled={sendingCode}
            >
              <ShieldCheck className="h-3 w-3 mr-1" />
              {isRTL ? 'ترقية لسوبر أدمن' : 'Make Super Admin'}
            </Button>
          )}
          {user.is_super_admin && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => initiateRoleChange(user, 'admin')}
              className="text-xs"
              disabled={sendingCode}
            >
              <Shield className="h-3 w-3 mr-1" />
              {isRTL ? 'تخفيض لأدمن' : 'Demote to Admin'}
            </Button>
          )}
          {!user.is_admin && !user.is_super_admin && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => initiateRoleChange(user, 'admin')}
              className="text-xs"
              disabled={sendingCode}
            >
              <Shield className="h-3 w-3 mr-1" />
              {isRTL ? 'منح صلاحية أدمن' : 'Make Admin'}
            </Button>
          )}
          
          {/* Reset Password */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => initiatePasswordReset(user)}
            className="text-xs"
            disabled={sendingCode}
          >
            <KeyRound className="h-3 w-3 mr-1" />
            {isRTL ? 'تغيير الباسورد' : 'Reset Password'}
          </Button>
          
          {/* Delete */}
          <Button
            size="sm"
            variant="destructive"
            onClick={() => initiateDeleteUser(user)}
            className="text-xs"
            disabled={sendingCode}
          >
            <Trash2 className="h-3 w-3 mr-1" />
            {isRTL ? 'حذف' : 'Delete'}
          </Button>
        </div>
      </td>
    </tr>
  );

  if (loading) {
    return (
      <div className="text-center py-8">
        <RefreshCw className="h-8 w-8 animate-spin mx-auto text-brand" />
        <p className="mt-2 text-gray-600">{isRTL ? 'جاري التحميل...' : 'Loading...'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <ShieldCheck className="h-8 w-8 text-red-500" />
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {isRTL ? 'إدارة المسؤولين والمستخدمين' : 'Admin & User Management'}
          </h2>
          <p className="text-sm text-gray-600">
            {isRTL ? 'إدارة جميع الحسابات والصلاحيات' : 'Manage all accounts and permissions'}
          </p>
        </div>
      </div>

      {/* Admins Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 bg-gradient-to-r from-red-50 to-orange-50 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-red-600" />
            <h3 className="text-lg font-semibold text-gray-900">
              {isRTL ? 'المسؤولين (Admins & Super Admins)' : 'Administrators (Admins & Super Admins)'}
            </h3>
            <span className="ml-auto text-sm text-gray-600">
              {isRTL ? `${admins.length} مسؤول` : `${admins.length} Admins`}
            </span>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                  {isRTL ? 'المستخدم' : 'User'}
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                  {isRTL ? 'الصلاحية' : 'Role'}
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                  {isRTL ? 'الإجراءات' : 'Actions'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {admins.length === 0 ? (
                <tr>
                  <td colSpan="3" className="px-4 py-8 text-center text-gray-500">
                    {isRTL ? 'لا يوجد مسؤولين' : 'No administrators found'}
                  </td>
                </tr>
              ) : (
                admins.map(admin => renderUserRow(admin, true))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">
              {isRTL ? 'المستخدمين العاديين' : 'Regular Users'}
            </h3>
            <span className="ml-auto text-sm text-gray-600">
              {isRTL ? `${users.length} مستخدم` : `${users.length} Users`}
            </span>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                  {isRTL ? 'المستخدم' : 'User'}
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                  {isRTL ? 'الصلاحية' : 'Role'}
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                  {isRTL ? 'الإجراءات' : 'Actions'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.length === 0 ? (
                <tr>
                  <td colSpan="3" className="px-4 py-8 text-center text-gray-500">
                    {isRTL ? 'لا يوجد مستخدمين' : 'No users found'}
                  </td>
                </tr>
              ) : (
                users.map(user => renderUserRow(user, false))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Verification Modal */}
      <Dialog open={showVerificationModal} onOpenChange={setShowVerificationModal}>
        <DialogContent className="sm:max-w-md" dir={isRTL ? 'rtl' : 'ltr'}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              {isRTL ? 'تأكيد الإجراء' : 'Confirm Action'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              {isRTL 
                ? 'تم إرسال كود التحقق إلى بريدك الإلكتروني. الرجاء إدخال الكود المكون من 6 أرقام للمتابعة.'
                : 'A verification code has been sent to your email. Please enter the 6-digit code to proceed.'}
            </p>
            
            <div>
              <Input
                type="text"
                placeholder={isRTL ? 'أدخل الكود (6 أرقام)' : 'Enter code (6 digits)'}
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
                className="text-center text-2xl tracking-widest font-mono"
              />
            </div>
            
            <div className="flex gap-2">
              <Button
                onClick={verifyCode}
                disabled={verifyingCode || verificationCode.length !== 6}
                className="flex-1"
              >
                {verifyingCode ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                {isRTL ? 'تأكيد' : 'Verify'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowVerificationModal(false);
                  setVerificationCode('');
                }}
                disabled={verifyingCode}
              >
                <X className="h-4 w-4 mr-2" />
                {isRTL ? 'إلغاء' : 'Cancel'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminManagementSection;
