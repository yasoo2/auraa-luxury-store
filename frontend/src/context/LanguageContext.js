import React, { createContext, useContext, useState, useEffect } from 'react';

const LanguageContext = createContext();

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

const translations = {
  ar: {
    // Navigation
    home: 'الرئيسية',
    products: 'المنتجات',
    necklaces: 'قلادات',
    earrings: 'أقراط',
    rings: 'خواتم',
    bracelets: 'أساور',
    watches: 'ساعات',
    sets: 'أطقم',
    cart: 'السلة',
    profile: 'الملف الشخصي',
    admin: 'إدارة',
    login: 'دخول / تسجيل',
    logout: 'خروج',
    search_placeholder: 'ابحث عن المنتجات...',
    
    // Homepage
    welcome_message: 'مرحباً بك في',
    hero_subtitle: 'اكتشف مجموعتنا الفاخرة من الاكسسوارات والمجوهرات الراقية',
    shop_now: 'تسوق الآن',
    featured_sets: 'الأطقم المميزة',
    free_shipping: 'شحن مجاني',
    free_shipping_desc: 'شحن مجاني لجميع الطلبات فوق 200 ريال',
    quality_guarantee: 'ضمان الجودة',
    quality_guarantee_desc: 'ضمان شامل على جميع منتجاتنا لمدة سنة كاملة',
    support_247: 'دعم 24/7',
    support_247_desc: 'فريق خدمة العملاء متاح على مدار الساعة',
    shop_by_category: 'تسوق حسب الفئة',
    featured_products: 'منتجات مميزة',
    newsletter_title: 'اشترك في نشرتنا الإخبارية',
    newsletter_subtitle: 'احصل على أحدث العروض والمنتجات الجديدة',
    subscribe: 'اشتراك',
    
    // Products
    all_products: 'جميع المنتجات',
    filter_results: 'تصفية النتائج',
    category: 'الفئة',
    all_categories: 'جميع الفئات',
    price_range: 'نطاق السعر (ريال سعودي)',
    sort_by: 'ترتيب حسب',
    newest: 'الأحدث',
    price_low_high: 'السعر: من الأقل للأعلى',
    price_high_low: 'السعر: من الأعلى للأقل',
    highest_rated: 'الأعلى تقييماً',
    clear_filters: 'مسح جميع المرشحات',
    no_products_found: 'لم نجد أي منتجات',
    try_different_filters: 'جرب تغيير المرشحات أو البحث عن شيء آخر',
    
    // Product Detail
    description: 'الوصف',
    quantity: 'الكمية',
    in_stock: 'متوفر',
    add_to_cart: 'أضف للسلة',
    buy_now: 'اشتري الآن',
    related_products: 'منتجات ذات صلة',
    
    // Cart
    shopping_cart: 'سلة التسوق',
    cart_empty: 'سلة التسوق فارغة',
    cart_empty_desc: 'لم تقم بإضافة أي منتجات بعد',
    continue_shopping: 'تابع التسوق',
    subtotal: 'المجموع الجزئي',
    shipping: 'الشحن',
    total: 'المجموع',
    free: 'مجاني',
    checkout: 'إتمام الطلب',
    
    // Auth
    sign_in: 'تسجيل الدخول',
    sign_up: 'إنشاء حساب جديد',
    welcome_back: 'مرحباً بعودتك!',
    join_family: 'انضم إلى عائلة Auraa Luxury',
    first_name: 'الاسم الأول',
    last_name: 'الاسم الأخير',
    email: 'البريد الإلكتروني',
    phone: 'رقم الجوال',
    password: 'كلمة المرور',
    confirm_password: 'تأكيد كلمة المرور',
    no_account: 'ليس لديك حساب؟',
    have_account: 'لديك حساب بالفعل؟',
    create_account: 'إنشاء حساب جديد',
    
    // Currency
    currency: 'العملة',
    sar: 'ريال سعودي',
    usd: 'دولار أمريكي',
    eur: 'يورو',
    gbp: 'جنيه إسترليني',
    aed: 'درهم إماراتي'
  },
  
  en: {
    // Navigation
    home: 'Home',
    products: 'Products',
    necklaces: 'Necklaces',
    earrings: 'Earrings',
    rings: 'Rings',
    bracelets: 'Bracelets',
    watches: 'Watches',
    sets: 'Sets',
    cart: 'Cart',
    profile: 'Profile',
    admin: 'Admin',
    login: 'Login / Register',
    logout: 'Logout',
    search_placeholder: 'Search for products...',
    
    // Homepage
    welcome_message: 'Welcome to',
    hero_subtitle: 'Discover our luxury collection of elegant accessories and fine jewelry',
    shop_now: 'Shop Now',
    featured_sets: 'Featured Sets',
    free_shipping: 'Free Shipping',
    free_shipping_desc: 'Free shipping on all orders over SAR 200',
    quality_guarantee: 'Quality Guarantee',
    quality_guarantee_desc: 'Full warranty on all our products for one year',
    support_247: '24/7 Support',
    support_247_desc: 'Customer service team available around the clock',
    shop_by_category: 'Shop by Category',
    featured_products: 'Featured Products',
    newsletter_title: 'Subscribe to Our Newsletter',
    newsletter_subtitle: 'Get the latest offers and new products',
    subscribe: 'Subscribe',
    
    // Products
    all_products: 'All Products',
    filter_results: 'Filter Results',
    category: 'Category',
    all_categories: 'All Categories',
    price_range: 'Price Range (SAR)',
    sort_by: 'Sort By',
    newest: 'Newest',
    price_low_high: 'Price: Low to High',
    price_high_low: 'Price: High to Low',
    highest_rated: 'Highest Rated',
    clear_filters: 'Clear All Filters',
    no_products_found: 'No Products Found',
    try_different_filters: 'Try changing the filters or search for something else',
    
    // Product Detail
    description: 'Description',
    quantity: 'Quantity',
    in_stock: 'In Stock',
    add_to_cart: 'Add to Cart',
    buy_now: 'Buy Now',
    related_products: 'Related Products',
    
    // Cart
    shopping_cart: 'Shopping Cart',
    cart_empty: 'Shopping Cart is Empty',
    cart_empty_desc: 'You have not added any products yet',
    continue_shopping: 'Continue Shopping',
    subtotal: 'Subtotal',
    shipping: 'Shipping',
    total: 'Total',
    free: 'Free',
    checkout: 'Checkout',
    
    // Auth
    sign_in: 'Sign In',
    sign_up: 'Sign Up',
    welcome_back: 'Welcome Back!',
    join_family: 'Join the Auraa Luxury Family',
    first_name: 'First Name',
    last_name: 'Last Name',
    email: 'Email',
    phone: 'Phone',
    password: 'Password',
    confirm_password: 'Confirm Password',
    no_account: "Don't have an account?",
    have_account: 'Already have an account?',
    create_account: 'Create New Account',
    
    // Currency
    currency: 'Currency',
    sar: 'Saudi Riyal',
    usd: 'US Dollar',
    eur: 'Euro',
    gbp: 'British Pound',
    aed: 'UAE Dirham'
  }
};

const currencyRates = {
  SAR: 1,
  USD: 0.27,
  EUR: 0.25,
  GBP: 0.21,
  AED: 0.98
};

const currencySymbols = {
  SAR: 'ر.س',
  USD: '$',
  EUR: '€',
  GBP: '£',
  AED: 'د.إ'
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('language') || 'ar';
  });
  
  const [currency, setCurrency] = useState(() => {
    return localStorage.getItem('currency') || 'SAR';
  });

  useEffect(() => {
    localStorage.setItem('language', language);
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    localStorage.setItem('currency', currency);
  }, [currency]);

  const t = (key) => {
    return translations[language][key] || key;
  };

  const formatPrice = (price) => {
    if (!price) return '0';
    const convertedPrice = (price * currencyRates[currency]).toFixed(2);
    return `${convertedPrice} ${currencySymbols[currency]}`;
  };

  const switchLanguage = (newLanguage) => {
    setLanguage(newLanguage);
  };

  const switchCurrency = (newCurrency) => {
    setCurrency(newCurrency);
  };

  const value = {
    language,
    currency,
    t,
    formatPrice,
    switchLanguage,
    switchCurrency,
    currencySymbols,
    isRTL: language === 'ar'
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};