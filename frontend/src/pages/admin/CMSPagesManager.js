import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import axios from 'axios';
import {
  FileText,
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  Eye,
  AlertCircle
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card } from '../../components/ui/card';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const CMSPagesManager = () => {
  const { isRTL } = useLanguage();
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingPage, setEditingPage] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // Default CMS pages that should always exist
  const defaultPages = [
    { 
      slug: 'privacy-policy', 
      title_en: 'Privacy Policy', 
      title_ar: 'سياسة الخصوصية',
      route: '/privacy-policy'
    },
    { 
      slug: 'terms-of-service', 
      title_en: 'Terms of Service', 
      title_ar: 'شروط الخدمة',
      route: '/terms'
    },
    { 
      slug: 'return-policy', 
      title_en: 'Return Policy', 
      title_ar: 'سياسة الإرجاع',
      route: '/return-policy'
    },
    { 
      slug: 'contact-us', 
      title_en: 'Contact Us', 
      title_ar: 'اتصل بنا',
      route: '/contact'
    }
  ];

  useEffect(() => {
    fetchPages();
  }, []);

  const fetchPages = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/admin/cms-pages`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPages(response.data || []);
    } catch (error) {
      console.error('Error fetching pages:', error);
      // If no pages exist, initialize with defaults
      setPages(defaultPages.map(p => ({
        ...p,
        content_en: '',
        content_ar: '',
        is_active: true
      })));
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (pageData) => {
    try {
      const token = localStorage.getItem('token');
      if (pageData.id) {
        // Update existing page
        await axios.put(`${API}/admin/cms-pages/${pageData.id}`, pageData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success(isRTL ? 'تم تحديث الصفحة' : 'Page updated successfully');
      } else {
        // Create new page
        await axios.post(`${API}/admin/cms-pages`, pageData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success(isRTL ? 'تم إنشاء الصفحة' : 'Page created successfully');
      }
      fetchPages();
      setShowModal(false);
      setEditingPage(null);
    } catch (error) {
      console.error('Error saving page:', error);
      toast.error(isRTL ? 'فشل في حفظ الصفحة' : 'Failed to save page');
    }
  };

  const handleDelete = async (pageId) => {
    if (!window.confirm(isRTL ? 'هل تريد حذف هذه الصفحة؟' : 'Delete this page?')) {
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/admin/cms-pages/${pageId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(isRTL ? 'تم حذف الصفحة' : 'Page deleted');
      fetchPages();
    } catch (error) {
      console.error('Error deleting page:', error);
      toast.error(isRTL ? 'فشل في حذف الصفحة' : 'Failed to delete page');
    }
  };

  const PageModal = ({ page, onClose, onSave }) => {
    const [formData, setFormData] = useState(page || {
      slug: '',
      title_en: '',
      title_ar: '',
      content_en: '',
      content_ar: '',
      route: '',
      is_active: true
    });

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <Card className="luxury-card w-full max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">
                {page ? (isRTL ? 'تعديل الصفحة' : 'Edit Page') : (isRTL ? 'صفحة جديدة' : 'New Page')}
              </h2>
              <button onClick={onClose}>
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    {isRTL ? 'المعرف (Slug)' : 'Slug'}
                  </label>
                  <Input
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    placeholder="privacy-policy"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    {isRTL ? 'المسار (Route)' : 'Route'}
                  </label>
                  <Input
                    value={formData.route}
                    onChange={(e) => setFormData({ ...formData, route: e.target.value })}
                    placeholder="/privacy-policy"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    {isRTL ? 'العنوان (إنجليزي)' : 'Title (English)'}
                  </label>
                  <Input
                    value={formData.title_en}
                    onChange={(e) => setFormData({ ...formData, title_en: e.target.value })}
                    placeholder="Privacy Policy"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    {isRTL ? 'العنوان (عربي)' : 'Title (Arabic)'}
                  </label>
                  <Input
                    value={formData.title_ar}
                    onChange={(e) => setFormData({ ...formData, title_ar: e.target.value })}
                    placeholder="سياسة الخصوصية"
                    dir="rtl"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  {isRTL ? 'المحتوى (إنجليزي)' : 'Content (English)'}
                </label>
                <textarea
                  className="w-full h-40 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  value={formData.content_en}
                  onChange={(e) => setFormData({ ...formData, content_en: e.target.value })}
                  placeholder="Enter page content in English..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  {isRTL ? 'المحتوى (عربي)' : 'Content (Arabic)'}
                </label>
                <textarea
                  className="w-full h-40 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  value={formData.content_ar}
                  onChange={(e) => setFormData({ ...formData, content_ar: e.target.value })}
                  placeholder="أدخل محتوى الصفحة بالعربية..."
                  dir="rtl"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="h-4 w-4"
                />
                <label className="text-sm font-medium">
                  {isRTL ? 'صفحة نشطة' : 'Active Page'}
                </label>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button className="btn-luxury flex-1" onClick={() => onSave(formData)}>
                <Save className="h-4 w-4 mr-2" />
                {isRTL ? 'حفظ' : 'Save'}
              </Button>
              <Button variant="outline" onClick={onClose}>
                {isRTL ? 'إلغاء' : 'Cancel'}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <FileText className="h-8 w-8 text-amber-600" />
            {isRTL ? 'إدارة الصفحات' : 'CMS Pages Manager'}
          </h1>
          <p className="text-gray-600 mt-2">
            {isRTL 
              ? 'إدارة الصفحات القانونية والمحتوى الثابت' 
              : 'Manage legal pages and static content'}
          </p>
        </div>
        <Button 
          className="btn-luxury" 
          onClick={() => {
            setEditingPage(null);
            setShowModal(true);
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          {isRTL ? 'صفحة جديدة' : 'New Page'}
        </Button>
      </div>

      {pages.length === 0 ? (
        <Card className="luxury-card p-8 text-center">
          <AlertCircle className="h-16 w-16 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600">
            {isRTL ? 'لا توجد صفحات حتى الآن' : 'No pages yet'}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pages.map((page) => (
            <Card key={page.id || page.slug} className="luxury-card p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-lg">
                    {isRTL ? page.title_ar : page.title_en}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">{page.slug}</p>
                  <p className="text-xs text-amber-600 mt-1">{page.route}</p>
                </div>
                <div className={`px-2 py-1 rounded text-xs font-medium ${
                  page.is_active 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {page.is_active ? (isRTL ? 'نشط' : 'Active') : (isRTL ? 'معطل' : 'Inactive')}
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    setEditingPage(page);
                    setShowModal(true);
                  }}
                >
                  <Edit2 className="h-4 w-4 mr-1" />
                  {isRTL ? 'تعديل' : 'Edit'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(page.route, '_blank')}
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600 hover:bg-red-50"
                  onClick={() => handleDelete(page.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {showModal && (
        <PageModal
          page={editingPage}
          onClose={() => {
            setShowModal(false);
            setEditingPage(null);
          }}
          onSave={handleSave}
        />
      )}
    </div>
  );
};

export default CMSPagesManager;
