import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { Phone, Mail, MapPin, Clock, Send, MessageSquare, HeadphonesIcon, CheckCircle } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card } from '../components/ui/card';
import { toast } from 'sonner';
import axios from 'axios';
import { API_BASE_URL } from '../api';

const API = API_BASE_URL;
const ContactUs = () => {
  const { language } = useLanguage();
  const isRTL = language === 'ar';

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await axios.post(`${API}/contact`, formData);
      
      setIsSubmitted(true);
      toast.success(isRTL ? 'تم إرسال رسالتك بنجاح! سنتواصل معك قريباً.' : 'Message sent successfully! We will contact you soon.');
      
      // Reset form after success
      setTimeout(() => {
        setFormData({
          name: '',
          email: '',
          phone: '',
          message: ''
        });
        setIsSubmitted(false);
      }, 3000);
    } catch (error) {
      console.error('Contact form error:', error);
      toast.error(isRTL ? 'حدث خطأ في إرسال الرسالة. حاول مرة أخرى.' : 'Error sending message. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`min-h-screen bg-gray-50 py-12 ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            {isRTL ? 'تواصل معنا' : 'Contact Us'}
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            {isRTL 
              ? 'نحن هنا لمساعدتك! تواصل معنا عبر أي من الطرق التالية أو املأ النموذج وسنتواصل معك في أسرع وقت ممكن.'
              : 'We are here to help you! Contact us through any of the following methods or fill out the form and we will get back to you as soon as possible.'
            }
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          
          {/* Contact Information */}
          <div className="lg:col-span-1">
            <div className="space-y-6">
              
              {/* Phone */}
              <Card className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-center space-x-4">
                  <div className="bg-blue-100 p-3 rounded-full">
                    <Phone className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {isRTL ? 'الهاتف' : 'Phone'}
                    </h3>
                    <a href="tel:+905013715391" className="text-gray-600 hover:text-blue-600">
                      +90 501 371 5391
                    </a>
                    <p className="text-sm text-gray-500">
                      {isRTL ? 'متاح 24/7' : 'Available 24/7'}
                    </p>
                  </div>
                </div>
              </Card>

              {/* WhatsApp */}
              <Card className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-center space-x-4">
                  <div className="bg-green-100 p-3 rounded-full">
                    <MessageSquare className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {isRTL ? 'واتساب' : 'WhatsApp'}
                    </h3>
                    <a 
                      href="https://wa.me/905013715391" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-gray-600 hover:text-green-600"
                    >
                      +90 501 371 5391
                    </a>
                    <p className="text-sm text-gray-500">
                      {isRTL ? 'تواصل سريع' : 'Quick messaging'}
                    </p>
                  </div>
                </div>
              </Card>

              {/* Email */}
              <Card className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-center space-x-4">
                  <div className="bg-purple-100 p-3 rounded-full">
                    <Mail className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {isRTL ? 'البريد الإلكتروني' : 'Email'}
                    </h3>
                    <p className="text-gray-600">info@auraaluxury.com</p>
                    <p className="text-sm text-gray-500">
                      {isRTL ? 'رد خلال 24 ساعة' : 'Response within 24 hours'}
                    </p>
                  </div>
                </div>
              </Card>

              {/* Address */}
              <Card className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-center space-x-4">
                  <div className="bg-purple-100 p-3 rounded-full">
                    <MapPin className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {isRTL ? 'العنوان' : 'Address'}
                    </h3>
                    <p className="text-gray-600">
                      {isRTL 
                        ? 'الرياض، المملكة العربية السعودية'
                        : 'Riyadh, Saudi Arabia'
                      }
                    </p>
                  </div>
                </div>
              </Card>

              {/* Working Hours */}
              <Card className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-center space-x-4">
                  <div className="bg-amber-100 p-3 rounded-full">
                    <Clock className="h-6 w-6 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {isRTL ? 'ساعات العمل' : 'Working Hours'}
                    </h3>
                    <div className="text-gray-600 text-sm">
                      <p>{isRTL ? 'الأحد - الخميس: 9:00 ص - 9:00 م' : 'Sunday - Thursday: 9:00 AM - 9:00 PM'}</p>
                      <p>{isRTL ? 'الجمعة - السبت: 2:00 م - 10:00 م' : 'Friday - Saturday: 2:00 PM - 10:00 PM'}</p>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Customer Support */}
              <Card className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
                <div className="text-center">
                  <HeadphonesIcon className="h-12 w-12 text-blue-600 mx-auto mb-3" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {isRTL ? 'دعم العملاء المتميز' : 'Premium Customer Support'}
                  </h3>
                  <p className="text-gray-600 text-sm">
                    {isRTL 
                      ? 'فريق خدمة العملاء المتخصص متاح لمساعدتك في أي استفسار'
                      : 'Specialized customer service team available to help with any inquiry'
                    }
                  </p>
                </div>
              </Card>
            </div>
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-2">
            <Card className="p-8">
              {isSubmitted ? (
                <div className="text-center py-12">
                  <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                  <h3 className="text-2xl font-semibold text-gray-900 mb-2">
                    {isRTL ? 'تم الإرسال بنجاح!' : 'Successfully Sent!'}
                  </h3>
                  <p className="text-gray-600">
                    {isRTL 
                      ? 'شكراً لتواصلك معنا. سنقوم بالرد عليك خلال 24 ساعة.'
                      : 'Thank you for contacting us. We will respond within 24 hours.'
                    }
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex items-center mb-6">
                    <MessageSquare className="h-6 w-6 text-blue-600 mr-3" />
                    <h2 className="text-2xl font-bold text-gray-900">
                      {isRTL ? 'أرسل لنا رسالة' : 'Send us a Message'}
                    </h2>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-6">
                    
                    {/* Name & Email Row */}
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {isRTL ? 'الاسم الكامل *' : 'Full Name *'}
                        </label>
                        <Input
                          name="name"
                          value={formData.name}
                          onChange={handleInputChange}
                          required
                          placeholder={isRTL ? 'أدخل اسمك الكامل' : 'Enter your full name'}
                          className="w-full"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {isRTL ? 'البريد الإلكتروني *' : 'Email *'}
                        </label>
                        <Input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          required
                          placeholder={isRTL ? 'أدخل بريدك الإلكتروني' : 'Enter your email'}
                          className="w-full"
                        />
                      </div>
                    </div>

                    {/* Phone & Order Number Row */}
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {isRTL ? 'رقم الهاتف' : 'Phone Number'}
                        </label>
                        <Input
                          name="phone"
                          value={formData.phone}
                          onChange={handleInputChange}
                          placeholder={isRTL ? 'رقم الهاتف (اختياري)' : 'Phone number (optional)'}
                          className="w-full"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {isRTL ? 'رقم الطلب' : 'Order Number'}
                        </label>
                        <Input
                          name="orderNumber"
                          value={formData.orderNumber}
                          onChange={handleInputChange}
                          placeholder={isRTL ? 'رقم الطلب (إن وجد)' : 'Order number (if applicable)'}
                          className="w-full"
                        />
                      </div>
                    </div>

                    {/* Subject */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {isRTL ? 'الموضوع *' : 'Subject *'}
                      </label>
                      <select
                        name="subject"
                        value={formData.subject}
                        onChange={handleInputChange}
                        required
                        className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">
                          {isRTL ? 'اختر الموضوع' : 'Select Subject'}
                        </option>
                        <option value="order_inquiry">
                          {isRTL ? 'استفسار عن طلب' : 'Order Inquiry'}
                        </option>
                        <option value="return_exchange">
                          {isRTL ? 'إرجاع أو استبدال' : 'Return or Exchange'}
                        </option>
                        <option value="product_question">
                          {isRTL ? 'سؤال عن منتج' : 'Product Question'}
                        </option>
                        <option value="shipping_inquiry">
                          {isRTL ? 'استفسار عن الشحن' : 'Shipping Inquiry'}
                        </option>
                        <option value="technical_support">
                          {isRTL ? 'دعم تقني' : 'Technical Support'}
                        </option>
                        <option value="general_inquiry">
                          {isRTL ? 'استفسار عام' : 'General Inquiry'}
                        </option>
                        <option value="complaint">
                          {isRTL ? 'شكوى' : 'Complaint'}
                        </option>
                        <option value="suggestion">
                          {isRTL ? 'اقتراح' : 'Suggestion'}
                        </option>
                      </select>
                    </div>

                    {/* Message */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {isRTL ? 'الرسالة *' : 'Message *'}
                      </label>
                      <textarea
                        name="message"
                        value={formData.message}
                        onChange={handleInputChange}
                        required
                        rows={6}
                        placeholder={isRTL 
                          ? 'اكتب رسالتك هنا. كن مفصلاً قدر الإمكان لنتمكن من مساعدتك بشكل أفضل.'
                          : 'Write your message here. Be as detailed as possible so we can help you better.'
                        }
                        className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      />
                      <p className="mt-2 text-sm text-gray-500">
                        {isRTL ? 'الحد الأدنى 10 أحرف' : 'Minimum 10 characters'}
                      </p>
                    </div>

                    {/* Submit Button */}
                    <div className="pt-4">
                      <Button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-md transition-all duration-300 transform hover:scale-105"
                      >
                        {isSubmitting ? (
                          <div className="flex items-center justify-center">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                            {isRTL ? 'جاري الإرسال...' : 'Sending...'}
                          </div>
                        ) : (
                          <div className="flex items-center justify-center">
                            <Send className="h-5 w-5 mr-2" />
                            {isRTL ? 'إرسال الرسالة' : 'Send Message'}
                          </div>
                        )}
                      </Button>
                    </div>

                    {/* Privacy Note */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600 text-center">
                        {isRTL 
                          ? '🔒 معلوماتك محمية ولن يتم مشاركتها مع أطراف ثالثة. راجع سياسة الخصوصية لمزيد من التفاصيل.'
                          : '🔒 Your information is protected and will not be shared with third parties. See our Privacy Policy for details.'
                        }
                      </p>
                    </div>
                  </form>
                </>
              )}
            </Card>
          </div>
        </div>

        {/* FAQ Quick Links */}
        <div className="mt-12">
          <Card className="p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4 text-center">
              {isRTL ? 'الأسئلة الشائعة' : 'Frequently Asked Questions'}
            </h3>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Link to="/return-policy" className="p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors text-center">
                <div className="text-blue-600 font-medium">
                  {isRTL ? 'سياسة الإرجاع' : 'Return Policy'}
                </div>
              </Link>
              
              <Link to="/shipping-info" className="p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors text-center">
                <div className="text-green-600 font-medium">
                  {isRTL ? 'معلومات الشحن' : 'Shipping Info'}
                </div>
              </Link>
              
              <Link to="/size-guide" className="p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors text-center">
                <div className="text-purple-600 font-medium">
                  {isRTL ? 'دليل المقاسات' : 'Size Guide'}
                </div>
              </Link>
              
              <Link to="/care-instructions" className="p-4 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors text-center">
                <div className="text-amber-600 font-medium">
                  {isRTL ? 'تعليمات العناية' : 'Care Instructions'}
                </div>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ContactUs;