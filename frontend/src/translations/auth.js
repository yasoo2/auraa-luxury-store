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
    
    // OAuth
    continue_with_google: 'متابعة مع جوجل',
    continue_with_facebook: 'متابعة مع فيسبوك',
    or: 'أو',
    
    // Errors
    account_not_found: 'لا يوجد حساب بهذا البريد الإلكتروني أو رقم الهاتف',
    wrong_password: 'كلمة المرور غير صحيحة',
    email_already_registered: 'هذا البريد الإلكتروني مسجل مسبقاً',
    phone_already_registered: 'رقم الهاتف مسجل مسبقاً',
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
    confirm: 'تأكيد'
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
    confirm: 'Confirm'
  }
};

export const getAuthTranslation = (key, language = 'ar') => {
  return authTranslations[language]?.[key] || authTranslations['ar'][key] || key;
};
