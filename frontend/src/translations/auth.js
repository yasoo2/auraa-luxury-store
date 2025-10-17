// Authentication translation keys
export const authTranslations = {
  ar: {
    // Login/Register
    login: 'تسجيل الدخول',
    register: 'إنشاء حساب جديد',
    email_or_phone: 'البريد الإلكتروني أو رقم الهاتف',
    email: 'البريد الإلكتروني',
    phone: 'رقم الهاتف',
    password: 'كلمة المرور',
    first_name: 'الاسم الأول',
    last_name: 'الاسم الأخير',
    welcome_back: 'أهلاً بعودتك!',
    join_auraa: 'انضم إلى Auraa Luxury',
    no_account: 'ليس لديك حساب؟',
    have_account: 'لديك حساب بالفعل؟',
    loading: 'جاري...',
    
    // OAuth
    continue_with_google: 'متابعة مع جوجل',
    continue_with_facebook: 'متابعة مع فيسبوك',
    or: 'أو',
    
    // Errors
    account_not_found: 'لا يوجد حساب بهذا البريد الإلكتروني أو رقم الهاتف',
    wrong_password: 'كلمة المرور غير صحيحة',
    email_already_registered: 'هذا البريد الإلكتروني مسجل مسبقاً',
    phone_already_registered: 'رقم الهاتف مسجل مسبقاً',
    email_or_phone_required: 'يجب إدخال البريد الإلكتروني أو رقم الهاتف على الأقل',
    invalid_email: 'البريد الإلكتروني غير صحيح',
    invalid_phone: 'رقم الهاتف غير صحيح',
    password_too_short: 'كلمة المرور قصيرة جداً (8 أحرف على الأقل)',
    oauth_session_invalid: 'فشل تسجيل الدخول. يرجى المحاولة مرة أخرى',
    session_id_required: 'بيانات الجلسة مفقودة',
    
    // Success
    login_success: 'تم تسجيل الدخول بنجاح',
    register_success: 'تم إنشاء الحساب بنجاح',
    account_deleted: 'تم حذف الحساب بنجاح',
    
    // Actions
    forgot_password: 'نسيت كلمة المرور؟',
    delete_account: 'حذف الحساب',
    confirm_delete: 'هل أنت متأكد من حذف حسابك؟ هذا الإجراء لا يمكن التراجع عنه',
    cancel: 'إلغاء',
    confirm: 'تأكيد',
    
    // Super Admin
    super_admin_management: 'إدارة المديرين الرئيسيين',
    super_admins: 'المديرون الرئيسيون',
    add_super_admin: 'إضافة مدير رئيسي',
    remove_super_admin: 'إزالة مدير رئيسي',
    transfer_super_admin: 'نقل الصلاحيات',
    super_admin_list: 'قائمة المديرين الرئيسيين',
    identifier: 'البريد الإلكتروني / الهاتف',
    created_at: 'تاريخ الإنشاء',
    last_login: 'آخر تسجيل دخول',
    actions: 'الإجراءات',
    enter_current_password: 'أدخل كلمة المرور الحالية',
    current_password: 'كلمة المرور الحالية',
    new_identifier: 'البريد الإلكتروني أو الهاتف الجديد',
    new_password: 'كلمة المرور الجديدة',
    target_identifier: 'البريد الإلكتروني أو الهاتف المستهدف',
    
    // Super Admin Errors
    invalid_super_admin_credentials: 'بيانات المدير الرئيسي غير صحيحة',
    not_super_admin: 'ليس لديك صلاحيات المدير الرئيسي',
    super_admin_already_exists: 'هذا الحساب مدير رئيسي بالفعل',
    super_admin_not_found: 'المدير الرئيسي غير موجود',
    cannot_remove_self: 'لا يمكنك إزالة نفسك',
    must_keep_one_super_admin: 'يجب الإبقاء على مدير رئيسي واحد على الأقل',
    identifier_already_taken: 'هذا البريد الإلكتروني أو الهاتف مستخدم بالفعل',
    target_user_not_found: 'المستخدم المستهدف غير موجود',
    target_already_super_admin: 'الهدف مدير رئيسي بالفعل',
    
    // Super Admin Success
    super_admin_added_successfully: 'تم إضافة المدير الرئيسي بنجاح',
    super_admin_removed_successfully: 'تم إزالة المدير الرئيسي بنجاح',
    profile_updated_successfully: 'تم تحديث الملف الشخصي بنجاح',
    super_admin_transferred_successfully: 'تم نقل صلاحيات المدير الرئيسي بنجاح',
    
    // Confirmations
    confirm_remove_super_admin: 'هل أنت متأكد من إزالة هذا المدير الرئيسي؟',
    confirm_transfer: 'هل أنت متأكد من نقل صلاحيات المدير الرئيسي؟ ستفقد صلاحياتك الحالية',
  },
  en: {
    // Login/Register
    login: 'Sign In',
    register: 'Create Account',
    email_or_phone: 'Email or Phone Number',
    email: 'Email Address',
    phone: 'Phone Number',
    password: 'Password',
    first_name: 'First Name',
    last_name: 'Last Name',
    welcome_back: 'Welcome back!',
    join_auraa: 'Join Auraa Luxury',
    no_account: "Don't have an account?",
    have_account: 'Already have an account?',
    loading: 'Loading...',
    
    // OAuth
    continue_with_google: 'Continue with Google',
    continue_with_facebook: 'Continue with Facebook',
    or: 'or',
    
    // Errors
    account_not_found: 'No account found with this email or phone number',
    wrong_password: 'Wrong password',
    email_already_registered: 'This email is already registered',
    phone_already_registered: 'This phone number is already registered',
    invalid_email: 'Invalid email address',
    invalid_phone: 'Invalid phone number',
    password_too_short: 'Password too short (minimum 8 characters)',
    oauth_session_invalid: 'Login failed. Please try again',
    session_id_required: 'Session data missing',
    
    // Success
    login_success: 'Logged in successfully',
    register_success: 'Account created successfully',
    account_deleted: 'Account deleted successfully',
    
    // Actions
    forgot_password: 'Forgot Password?',
    delete_account: 'Delete Account',
    confirm_delete: 'Are you sure you want to delete your account? This action cannot be undone',
    cancel: 'Cancel',
    confirm: 'Confirm',
    
    // Super Admin
    super_admin_management: 'Super Admin Management',
    super_admins: 'Super Admins',
    add_super_admin: 'Add Super Admin',
    remove_super_admin: 'Remove Super Admin',
    transfer_super_admin: 'Transfer Rights',
    super_admin_list: 'Super Admin List',
    identifier: 'Email / Phone',
    created_at: 'Created At',
    last_login: 'Last Login',
    actions: 'Actions',
    enter_current_password: 'Enter Current Password',
    current_password: 'Current Password',
    new_identifier: 'New Email or Phone',
    new_password: 'New Password',
    target_identifier: 'Target Email or Phone',
    
    // Super Admin Errors
    invalid_super_admin_credentials: 'Invalid super admin credentials',
    not_super_admin: 'You do not have super admin privileges',
    super_admin_already_exists: 'This account is already a super admin',
    super_admin_not_found: 'Super admin not found',
    cannot_remove_self: 'You cannot remove yourself',
    must_keep_one_super_admin: 'Must keep at least one super admin',
    identifier_already_taken: 'This email or phone is already taken',
    target_user_not_found: 'Target user not found',
    target_already_super_admin: 'Target is already a super admin',
    
    // Super Admin Success
    super_admin_added_successfully: 'Super admin added successfully',
    super_admin_removed_successfully: 'Super admin removed successfully',
    profile_updated_successfully: 'Profile updated successfully',
    super_admin_transferred_successfully: 'Super admin rights transferred successfully',
    
    // Confirmations
    confirm_remove_super_admin: 'Are you sure you want to remove this super admin?',
    confirm_transfer: 'Are you sure you want to transfer super admin rights? You will lose your current privileges',
  }
};

export const getAuthTranslation = (key, language = 'ar') => {
  return authTranslations[language]?.[key] || authTranslations['ar'][key] || key;
};
