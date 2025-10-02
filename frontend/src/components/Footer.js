import React from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Instagram, Twitter, Mail, Phone, MapPin } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Section */}
          <div className="col-span-1 md:col-span-1">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">A</span>
              </div>
              <span className="font-display text-2xl font-bold gradient-text">Auraa Luxury</span>
            </div>
            <p className="text-gray-300 mb-4 leading-relaxed">
              متجرك المتخصص في الاكسسوارات والمجوهرات الفاخرة. نقدم لك أجود المنتجات بأفضل الأسعار.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-400 hover:text-amber-400 transition-colors">
                <Facebook className="h-5 w-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-amber-400 transition-colors">
                <Instagram className="h-5 w-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-amber-400 transition-colors">
                <Twitter className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-bold mb-4 text-amber-400">روابط سريعة</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="text-gray-300 hover:text-white transition-colors">
                  الرئيسية
                </Link>
              </li>
              <li>
                <Link to="/products" className="text-gray-300 hover:text-white transition-colors">
                  المنتجات
                </Link>
              </li>
              <li>
                <Link to="/products?category=necklaces" className="text-gray-300 hover:text-white transition-colors">
                  قلادات
                </Link>
              </li>
              <li>
                <Link to="/products?category=earrings" className="text-gray-300 hover:text-white transition-colors">
                  أقراط
                </Link>
              </li>
              <li>
                <Link to="/products?category=rings" className="text-gray-300 hover:text-white transition-colors">
                  خواتم
                </Link>
              </li>
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h3 className="text-lg font-bold mb-4 text-amber-400">الفئات</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/products?category=bracelets" className="text-gray-300 hover:text-white transition-colors">
                  أساور
                </Link>
              </li>
              <li>
                <Link to="/products?category=watches" className="text-gray-300 hover:text-white transition-colors">
                  ساعات
                </Link>
              </li>
              <li>
                <Link to="/products?category=sets" className="text-gray-300 hover:text-white transition-colors">
                  أطقم
                </Link>
              </li>
              <li>
                <a href="#" className="text-gray-300 hover:text-white transition-colors">
                  العروض الخاصة
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-300 hover:text-white transition-colors">
                  المنتجات الجديدة
                </a>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-lg font-bold mb-4 text-amber-400">تواصل معنا</h3>
            <ul className="space-y-3">
              <li className="flex items-center space-x-2">
                <Phone className="h-4 w-4 text-amber-400 ml-2" />
                <span className="text-gray-300">+966 50 123 4567</span>
              </li>
              <li className="flex items-center space-x-2">
                <Mail className="h-4 w-4 text-amber-400 ml-2" />
                <span className="text-gray-300">info@auraaluxury.com</span>
              </li>
              <li className="flex items-start space-x-2">
                <MapPin className="h-4 w-4 text-amber-400 ml-2 mt-1" />
                <span className="text-gray-300">
                  الرياض، المملكة العربية السعودية
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
          <div className="text-gray-400 text-sm mb-4 md:mb-0">
            © 2024 Auraa Luxury. جميع الحقوق محفوظة.
          </div>
          <div className="flex space-x-4 text-sm">
            <a href="#" className="text-gray-400 hover:text-white transition-colors">
              سياسة الخصوصية
            </a>
            <a href="#" className="text-gray-400 hover:text-white transition-colors">
              شروط الاستخدام
            </a>
            <a href="#" className="text-gray-400 hover:text-white transition-colors">
              سياسة الإرجاع
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;