import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin, MessageCircle } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

// Every string here follows the language switch. Most of this footer used to
// be Arabic written straight into the JSX: with the store now opening in
// English, visitors got an English chrome over an Arabic footer — the mixed
// page the owner photographed.
const Footer = () => {
  const { isRTL } = useLanguage();

  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Section */}
          <div className="col-span-1 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <img src="/favicon.svg?v=2" alt="" className="w-9 h-9" />
              <span className="font-display text-2xl font-bold gradient-text">Auraa Luxury</span>
            </div>
            <p className="text-gray-300 mb-4 leading-relaxed">
              {isRTL
                ? 'متجرك المتخصص في الاكسسوارات والمجوهرات الفاخرة. نقدم لك أجود المنتجات بأفضل الأسعار.'
                : 'Your specialist store for luxury accessories and jewellery. The finest products at the best prices.'}
            </p>
            {/* The three social icons that sat here all linked to "#" —
                buttons promising pages that do not exist. They come back the
                day real profiles do. */}
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-bold mb-4 text-amber-400">{isRTL ? 'روابط سريعة' : 'Quick Links'}</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="text-gray-300 hover:text-white transition-colors">
                  {isRTL ? 'الرئيسية' : 'Home'}
                </Link>
              </li>
              <li>
                <Link to="/products" className="text-gray-300 hover:text-white transition-colors">
                  {isRTL ? 'المنتجات' : 'Products'}
                </Link>
              </li>
              <li>
                <Link to="/products?category=necklaces" className="text-gray-300 hover:text-white transition-colors">
                  {isRTL ? 'قلادات' : 'Necklaces'}
                </Link>
              </li>
              <li>
                <Link to="/products?category=earrings" className="text-gray-300 hover:text-white transition-colors">
                  {isRTL ? 'أقراط' : 'Earrings'}
                </Link>
              </li>
              <li>
                <Link to="/products?category=rings" className="text-gray-300 hover:text-white transition-colors">
                  {isRTL ? 'خواتم' : 'Rings'}
                </Link>
              </li>
              <li>
                <Link to="/order-tracking" className="text-gray-300 hover:text-white transition-colors">
                  {isRTL ? 'تتبع الطلب' : 'Track Order'}
                </Link>
              </li>
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h3 className="text-lg font-bold mb-4 text-amber-400">{isRTL ? 'الفئات' : 'Categories'}</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/products?category=bracelets" className="text-gray-300 hover:text-white transition-colors">
                  {isRTL ? 'أساور' : 'Bracelets'}
                </Link>
              </li>
              <li>
                <Link to="/products?category=watches" className="text-gray-300 hover:text-white transition-colors">
                  {isRTL ? 'ساعات' : 'Watches'}
                </Link>
              </li>
              <li>
                <Link to="/products?category=sets" className="text-gray-300 hover:text-white transition-colors">
                  {isRTL ? 'أطقم' : 'Sets'}
                </Link>
              </li>
              <li>
                {/* The products page opens newest-first, so this link is the
                    real thing. «العروض الخاصة» pointed at "#" and is gone
                    until an offers page exists to point at. */}
                <Link to="/products" className="text-gray-300 hover:text-white transition-colors">
                  {isRTL ? 'المنتجات الجديدة' : 'New Arrivals'}
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-lg font-bold mb-4 text-amber-400">{isRTL ? 'تواصل معنا' : 'Contact Us'}</h3>
            <ul className="space-y-3">
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-amber-400" />
                <a href="tel:+905013715391" className="text-gray-300 hover:text-amber-400 transition-colors" dir="ltr">
                  +90 501 371 5391
                </a>
              </li>
              <li className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-amber-400" />
                <a
                  href="https://wa.me/905013715391"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-300 hover:text-amber-400 transition-colors"
                >
                  {/* dir="ltr" keeps the number reading +90 501… — inside an
                      RTL sentence the bidi algorithm flipped it to 5391…90+. */}
                  {isRTL ? 'واتساب: ' : 'WhatsApp: '}
                  <span dir="ltr">+90 501 371 5391</span>
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-amber-400" />
                <span className="text-gray-300" dir="ltr">younes.sowady2011@gmail.com</span>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-amber-400 mt-1" />
                <span className="text-gray-300">
                  {isRTL ? 'إسطنبول، تركيا' : 'Istanbul, Türkiye'}
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
          <div className="text-gray-400 text-sm mb-4 md:mb-0">
            {isRTL
              ? `© ${new Date().getFullYear()} Auraa Luxury. جميع الحقوق محفوظة.`
              : `© ${new Date().getFullYear()} Auraa Luxury. All rights reserved.`}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
            <Link to="/privacy-policy" className="text-gray-400 hover:text-white transition-colors">
              {isRTL ? 'سياسة الخصوصية' : 'Privacy Policy'}
            </Link>
            <Link to="/terms-of-service" className="text-gray-400 hover:text-white transition-colors">
              {isRTL ? 'شروط الاستخدام' : 'Terms of Service'}
            </Link>
            <Link to="/cookies-policy" className="text-gray-400 hover:text-white transition-colors">
              {isRTL ? 'سياسة الكوكيز' : 'Cookie Policy'}
            </Link>
            <Link to="/return-policy" className="text-gray-400 hover:text-white transition-colors">
              {isRTL ? 'سياسة الإرجاع' : 'Return Policy'}
            </Link>
            <Link to="/contact" className="text-gray-400 hover:text-white transition-colors">
              {isRTL ? 'اتصل بنا' : 'Contact Us'}
            </Link>
            <Link to="/about" className="text-gray-400 hover:text-white transition-colors">
              {isRTL ? 'عنا' : 'About Us'}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
