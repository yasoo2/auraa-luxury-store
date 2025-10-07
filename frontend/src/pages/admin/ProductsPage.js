import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import axios from 'axios';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Search,
  Package,
  DollarSign,
  Image as ImageIcon,
  X,
  Check,
  Upload,
  Eye,
  Filter,
  Download,
  Star,
  AlertCircle,
  Save,
  Camera,
  Loader2,
  Copy,
  ExternalLink
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';

const ProductsPage = () => {
  const { language, currency } = useLanguage();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [uploading, setUploading] = useState(false);
  const [imageUploadProgress, setImageUploadProgress] = useState({});
  
  const isRTL = language === 'ar';
  const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    name_en: '',
    description: '',
    description_en: '',
    price: '',
    original_price: '',
    category: 'necklaces',
    images: [''],
    stock_quantity: 100,
    sku: '',
    weight: '',
    dimensions: '',
    material: '',
    color: '',
    tags: '',
    is_featured: false,
    is_active: true,
    meta_title: '',
    meta_description: ''
  });

  const [formErrors, setFormErrors] = useState({});

  const categories = [
    { value: 'necklaces', label_ar: 'قلادات', label_en: 'Necklaces', icon: '📿' },
    { value: 'earrings', label_ar: 'أقراط', label_en: 'Earrings', icon: '💎' },
    { value: 'rings', label_ar: 'خواتم', label_en: 'Rings', icon: '💍' },
    { value: 'bracelets', label_ar: 'أساور', label_en: 'Bracelets', icon: '📿' },
    { value: 'watches', label_ar: 'ساعات', label_en: 'Watches', icon: '⌚' },
    { value: 'sets', label_ar: 'أطقم', label_en: 'Sets', icon: '✨' }
  ];

  const materials = [
    { value: 'gold', label: isRTL ? 'ذهب' : 'Gold' },
    { value: 'silver', label: isRTL ? 'فضة' : 'Silver' },
    { value: 'platinum', label: isRTL ? 'بلاتين' : 'Platinum' },
    { value: 'pearl', label: isRTL ? 'لؤلؤ' : 'Pearl' },
    { value: 'diamond', label: isRTL ? 'ماس' : 'Diamond' },
    { value: 'crystal', label: isRTL ? 'كريستال' : 'Crystal' }
  ];

  const colors = [
    { value: 'gold', label: isRTL ? 'ذهبي' : 'Gold', color: '#FFD700' },
    { value: 'silver', label: isRTL ? 'فضي' : 'Silver', color: '#C0C0C0' },
    { value: 'rose-gold', label: isRTL ? 'ذهبي وردي' : 'Rose Gold', color: '#E8B4B8' },
    { value: 'white', label: isRTL ? 'أبيض' : 'White', color: '#FFFFFF' },
    { value: 'black', label: isRTL ? 'أسود' : 'Black', color: '#000000' }
  ];

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/products`);
      setProducts(response.data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      showToast('فشل في تحميل المنتجات', 'error');
      // Generate mock data for demo
      setProducts(generateMockProducts());
    } finally {
      setLoading(false);
    }
  };

  const generateMockProducts = () => {
    return [
      {
        id: '1',
        name: 'قلادة ذهبية فاخرة',
        name_en: 'Luxury Gold Necklace',
        description: 'قلادة ذهبية مصنوعة من الذهب عيار 18 مع تصميم عصري',
        price: 1299.99,
        original_price: 1599.99,
        category: 'necklaces',
        images: ['https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400'],
        stock_quantity: 25,
        sku: 'AL-NECK-001',
        material: 'gold',
        color: 'gold',
        is_featured: true,
        is_active: true,
        rating: 4.8,
        reviews_count: 124
      },
      {
        id: '2',
        name: 'أقراط لؤلؤ طبيعية',
        name_en: 'Natural Pearl Earrings',
        description: 'أقراط مصنوعة من اللؤلؤ الطبيعي مع تصميم كلاسيكي',
        price: 899.99,
        category: 'earrings',
        images: ['https://images.unsplash.com/photo-1506755855567-92ff770e8d00?w=400'],
        stock_quantity: 15,
        sku: 'AL-EAR-002',
        material: 'pearl',
        color: 'white',
        is_featured: false,
        is_active: true,
        rating: 4.9,
        reviews_count: 87
      }
    ];
  };

  const showToast = (message, type = 'success') => {
    // This would integrate with your toast system
    console.log(`${type}: ${message}`);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat(isRTL ? 'ar-SA' : 'en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const openModal = (product = null) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name || '',
        name_en: product.name_en || '',
        description: product.description || '',
        description_en: product.description_en || '',
        price: product.price || '',
        original_price: product.original_price || '',
        category: product.category || 'necklaces',
        images: product.images || [''],
        stock_quantity: product.stock_quantity || 100,
        sku: product.sku || '',
        weight: product.weight || '',
        dimensions: product.dimensions || '',
        material: product.material || '',
        color: product.color || '',
        tags: product.tags ? product.tags.join(', ') : '',
        is_featured: product.is_featured || false,
        is_active: product.is_active !== false,
        meta_title: product.meta_title || '',
        meta_description: product.meta_description || ''
      });
    } else {
      setEditingProduct(null);
      setFormData({
        name: '',
        name_en: '',
        description: '',
        description_en: '',
        price: '',
        original_price: '',
        category: 'necklaces',
        images: [''],
        stock_quantity: 100,
        sku: generateSKU(),
        weight: '',
        dimensions: '',
        material: '',
        color: '',
        tags: '',
        is_featured: false,
        is_active: true,
        meta_title: '',
        meta_description: ''
      });
    }
    setFormErrors({});
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingProduct(null);
    setFormData({
      name: '',
      name_en: '',
      description: '',
      description_en: '',
      price: '',
      original_price: '',
      category: 'necklaces',
      images: [''],
      stock_quantity: 100,
      sku: '',
      weight: '',
      dimensions: '',
      material: '',
      color: '',
      tags: '',
      is_featured: false,
      is_active: true,
      meta_title: '',
      meta_description: ''
    });
    setFormErrors({});
  };

  const generateSKU = () => {
    const prefix = 'AL';
    const timestamp = Date.now().toString().slice(-6);
    return `${prefix}-${timestamp}`;
  };

  const validateForm = () => {
    const errors = {};
    
    if (!formData.name.trim()) errors.name = isRTL ? 'اسم المنتج مطلوب' : 'Product name is required';
    if (!formData.price || formData.price <= 0) errors.price = isRTL ? 'السعر مطلوب وأكبر من صفر' : 'Valid price is required';
    if (!formData.category) errors.category = isRTL ? 'الفئة مطلوبة' : 'Category is required';
    if (!formData.images[0]) errors.images = isRTL ? 'صورة واحدة على الأقل مطلوبة' : 'At least one image is required';
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    try {
      setUploading(true);
      
      const productData = {
        ...formData,
        price: parseFloat(formData.price),
        original_price: formData.original_price ? parseFloat(formData.original_price) : null,
        stock_quantity: parseInt(formData.stock_quantity),
        tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [],
        images: formData.images.filter(img => img.trim())
      };

      if (editingProduct) {
        await axios.put(`${API_URL}/api/admin/products/${editingProduct.id}`, productData);
        showToast(isRTL ? 'تم تحديث المنتج بنجاح' : 'Product updated successfully');
      } else {
        await axios.post(`${API_URL}/api/admin/products`, productData);
        showToast(isRTL ? 'تم إضافة المنتج بنجاح' : 'Product added successfully');
      }
      
      await fetchProducts();
      closeModal();
    } catch (error) {
      console.error('Error saving product:', error);
      showToast(isRTL ? 'فشل في حفظ المنتج' : 'Failed to save product', 'error');
    } finally {
      setUploading(false);
    }
  };

  const deleteProduct = async (productId) => {
    if (!window.confirm(isRTL ? 'هل أنت متأكد من حذف هذا المنتج؟' : 'Are you sure you want to delete this product?')) {
      return;
    }

    try {
      await axios.delete(`${API_URL}/api/admin/products/${productId}`);
      showToast(isRTL ? 'تم حذف المنتج بنجاح' : 'Product deleted successfully');
      await fetchProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
      showToast(isRTL ? 'فشل في حذف المنتج' : 'Failed to delete product', 'error');
    }
  };

  const handleBulkAction = async (action) => {
    if (selectedProducts.length === 0) return;
    
    try {
      switch (action) {
        case 'delete':
          if (!window.confirm(isRTL ? `هل أنت متأكد من حذف ${selectedProducts.length} منتج؟` : `Are you sure you want to delete ${selectedProducts.length} products?`)) {
            return;
          }
          await axios.post(`${API_URL}/api/admin/products/bulk-delete`, { ids: selectedProducts });
          showToast(isRTL ? 'تم حذف المنتجات بنجاح' : 'Products deleted successfully');
          break;
        case 'activate':
          await axios.post(`${API_URL}/api/admin/products/bulk-update`, { ids: selectedProducts, data: { is_active: true } });
          showToast(isRTL ? 'تم تفعيل المنتجات بنجاح' : 'Products activated successfully');
          break;
        case 'deactivate':
          await axios.post(`${API_URL}/api/admin/products/bulk-update`, { ids: selectedProducts, data: { is_active: false } });
          showToast(isRTL ? 'تم إلغاء تفعيل المنتجات بنجاح' : 'Products deactivated successfully');
          break;
      }
      
      setSelectedProducts([]);
      await fetchProducts();
    } catch (error) {
      console.error('Error in bulk action:', error);
      showToast(isRTL ? 'فشل في تنفيذ العملية' : 'Failed to execute action', 'error');
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.sku?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'active' && product.is_active) ||
                         (statusFilter === 'inactive' && !product.is_active) ||
                         (statusFilter === 'featured' && product.is_featured);
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const fetchProducts = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/products`);
      setProducts(response.data);
      setLoading(false);
    } catch (error) {
      showToast('error', isRTL ? 'خطأ في تحميل المنتجات' : 'Error loading products');
      setLoading(false);
    }
  };

  const showToast = (type, message) => {
    setToast({ type, message });
  };

  const handleOpenModal = (product = null) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        description: product.description,
        price: product.price,
        original_price: product.original_price || '',
        category: product.category,
        images: product.images,
        stock_quantity: product.stock_quantity
      });
    } else {
      setEditingProduct(null);
      setFormData({
        name: '',
        description: '',
        price: '',
        original_price: '',
        category: 'necklaces',
        images: [''],
        stock_quantity: 100
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingProduct(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (index, value) => {
    const newImages = [...formData.images];
    newImages[index] = value;
    setFormData(prev => ({ ...prev, images: newImages }));
  };

  const addImageField = () => {
    setFormData(prev => ({ ...prev, images: [...prev.images, ''] }));
  };

  const removeImageField = (index) => {
    const newImages = formData.images.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, images: newImages }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.name || !formData.description || !formData.price) {
      showToast('error', isRTL ? 'الرجاء ملء جميع الحقول المطلوبة' : 'Please fill all required fields');
      return;
    }

    const filteredImages = formData.images.filter(img => img.trim() !== '');
    if (filteredImages.length === 0) {
      showToast('error', isRTL ? 'الرجاء إضافة صورة واحدة على الأقل' : 'Please add at least one image');
      return;
    }

    const productData = {
      ...formData,
      price: parseFloat(formData.price),
      original_price: formData.original_price ? parseFloat(formData.original_price) : null,
      stock_quantity: parseInt(formData.stock_quantity),
      images: filteredImages
    };

    try {
      const token = localStorage.getItem('token');
      const config = {
        headers: { Authorization: `Bearer ${token}` }
      };

      if (editingProduct) {
        await axios.put(`${API_URL}/api/products/${editingProduct.id}`, productData, config);
        showToast('success', isRTL ? 'تم تحديث المنتج بنجاح' : 'Product updated successfully');
      } else {
        await axios.post(`${API_URL}/api/products`, productData, config);
        showToast('success', isRTL ? 'تم إضافة المنتج بنجاح' : 'Product added successfully');
      }

      fetchProducts();
      handleCloseModal();
    } catch (error) {
      showToast('error', error.response?.data?.detail || (isRTL ? 'حدث خطأ' : 'An error occurred'));
    }
  };

  const handleDelete = async (productId, productName) => {
    const confirmMessage = isRTL 
      ? `هل أنت متأكد من حذف "${productName}"؟`
      : `Are you sure you want to delete "${productName}"?`;
    
    if (!window.confirm(confirmMessage)) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/api/products/${productId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showToast('success', isRTL ? 'تم حذف المنتج بنجاح' : 'Product deleted successfully');
      fetchProducts();
    } catch (error) {
      showToast('error', isRTL ? 'خطأ في حذف المنتج' : 'Error deleting product');
    }
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-20 ${isRTL ? 'left-4' : 'right-4'} z-50 px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 animate-slide-in ${
            toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
          } text-white`}
        >
          {toast.type === 'success' ? <Check size={20} /> : <X size={20} />}
          <span className="font-medium">{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
              <Package className="text-amber-600" size={32} />
              {isRTL ? 'إدارة المنتجات' : 'Products Management'}
            </h2>
            <p className="text-gray-500 mt-1">
              {isRTL ? `${filteredProducts.length} منتج` : `${filteredProducts.length} products`}
            </p>
          </div>
          
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-yellow-600 text-white rounded-lg hover:shadow-lg transition-all font-medium"
          >
            <Plus size={20} />
            {isRTL ? 'إضافة منتج جديد' : 'Add New Product'}
          </button>
        </div>

        {/* Search */}
        <div className="mt-6 relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder={isRTL ? 'ابحث عن منتج...' : 'Search products...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto"></div>
            <p className="mt-4 text-gray-500">{isRTL ? 'جاري التحميل...' : 'Loading...'}</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-12 text-center">
            <Package size={64} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-xl font-semibold text-gray-600">
              {isRTL ? 'لا توجد منتجات' : 'No products found'}
            </h3>
            <p className="text-gray-500 mt-2">
              {isRTL ? 'ابدأ بإضافة منتج جديد' : 'Start by adding a new product'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    {isRTL ? 'المنتج' : 'Product'}
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    {isRTL ? 'الفئة' : 'Category'}
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    {isRTL ? 'السعر' : 'Price'}
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    {isRTL ? 'المخزون' : 'Stock'}
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                    {isRTL ? 'الإجراءات' : 'Actions'}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <img
                          src={product.images[0]}
                          alt={product.name}
                          className="h-12 w-12 rounded-lg object-cover"
                        />
                        <div>
                          <div className="text-sm font-medium text-gray-900">{product.name}</div>
                          <div className="text-sm text-gray-500 truncate max-w-xs">
                            {product.description.substring(0, 50)}...
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-amber-100 text-amber-800">
                        {categories.find(c => c.value === product.category)?.[isRTL ? 'label_ar' : 'label_en']}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1 text-sm font-medium text-gray-900">
                        <DollarSign size={16} className="text-green-600" />
                        {product.price}
                      </div>
                      {product.original_price && (
                        <div className="text-xs text-gray-500 line-through">
                          {product.original_price}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-sm font-medium ${product.stock_quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {product.stock_quantity} {isRTL ? 'قطعة' : 'pcs'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenModal(product)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title={isRTL ? 'تعديل' : 'Edit'}
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(product.id, product.name)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title={isRTL ? 'حذف' : 'Delete'}
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-amber-500 to-yellow-600 text-white p-6 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold">
                  {editingProduct
                    ? (isRTL ? 'تعديل المنتج' : 'Edit Product')
                    : (isRTL ? 'إضافة منتج جديد' : 'Add New Product')}
                </h3>
                <button
                  onClick={handleCloseModal}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Name */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  {isRTL ? 'اسم المنتج' : 'Product Name'} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder={isRTL ? 'مثال: قلادة ذهبية فاخرة' : 'e.g., Luxury Gold Necklace'}
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  {isRTL ? 'الوصف' : 'Description'} <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows="3"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder={isRTL ? 'وصف تفصيلي للمنتج' : 'Detailed product description'}
                  required
                />
              </div>

              {/* Price & Original Price */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    {isRTL ? 'السعر' : 'Price'} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleInputChange}
                    step="0.01"
                    min="0"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="299.99"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    {isRTL ? 'السعر الأصلي' : 'Original Price'} ({isRTL ? 'اختياري' : 'optional'})
                  </label>
                  <input
                    type="number"
                    name="original_price"
                    value={formData.original_price}
                    onChange={handleInputChange}
                    step="0.01"
                    min="0"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="399.99"
                  />
                </div>
              </div>

              {/* Category & Stock */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    {isRTL ? 'الفئة' : 'Category'}
                  </label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  >
                    {categories.map(cat => (
                      <option key={cat.value} value={cat.value}>
                        {isRTL ? cat.label_ar : cat.label_en}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    {isRTL ? 'الكمية' : 'Stock Quantity'}
                  </label>
                  <input
                    type="number"
                    name="stock_quantity"
                    value={formData.stock_quantity}
                    onChange={handleInputChange}
                    min="0"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              {/* Images */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  {isRTL ? 'صور المنتج' : 'Product Images'} <span className="text-red-500">*</span>
                </label>
                <div className="space-y-3">
                  {formData.images.map((image, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <ImageIcon size={20} className="text-gray-400" />
                      <input
                        type="url"
                        value={image}
                        onChange={(e) => handleImageChange(index, e.target.value)}
                        placeholder="https://example.com/image.jpg"
                        className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      />
                      {formData.images.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeImageField(index)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <X size={20} />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addImageField}
                    className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-amber-500 hover:text-amber-600 transition-colors"
                  >
                    + {isRTL ? 'إضافة صورة أخرى' : 'Add another image'}
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                >
                  {isRTL ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-amber-500 to-yellow-600 text-white rounded-lg hover:shadow-lg font-medium transition-all"
                >
                  {editingProduct
                    ? (isRTL ? 'تحديث المنتج' : 'Update Product')
                    : (isRTL ? 'إضافة المنتج' : 'Add Product')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductsPage;