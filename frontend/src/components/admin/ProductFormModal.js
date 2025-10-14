import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import {
  X,
  Save,
  Upload,
  Camera,
  Trash2,
  Plus,
  Tag,
  DollarSign,
  Package,
  Image as ImageIcon,
  Loader2,
  Star,
  Eye,
  EyeOff
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

const ProductFormModal = ({ 
  isOpen, 
  onClose, 
  product = null, 
  onSave,
  categories = [],
  loading = false 
}) => {
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  const isEdit = !!product;

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

  const [errors, setErrors] = useState({});
  const [imageUploading, setImageUploading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Use categories from props, with fallback defaults
  const categoryOptions = categories.length > 0 ? categories : [
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
    if (product) {
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
      // Generate new SKU for new product
      setFormData(prev => ({ 
        ...prev, 
        sku: `AL-${Date.now().toString().slice(-6)}` 
      }));
    }
  }, [product]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }

    // Auto-generate English name/description if not provided
    if (field === 'name' && !formData.name_en && value) {
      setFormData(prev => ({ ...prev, name_en: value }));
    }
    if (field === 'description' && !formData.description_en && value) {
      setFormData(prev => ({ ...prev, description_en: value }));
    }
  };

  const handleImageChange = (index, value) => {
    const newImages = [...formData.images];
    newImages[index] = value;
    setFormData(prev => ({ ...prev, images: newImages }));
  };

  const addImageField = () => {
    if (formData.images.length < 5) {
      setFormData(prev => ({ 
        ...prev, 
        images: [...prev.images, ''] 
      }));
    }
  };

  const removeImageField = (index) => {
    if (formData.images.length > 1) {
      const newImages = formData.images.filter((_, i) => i !== index);
      setFormData(prev => ({ ...prev, images: newImages }));
    }
  };

  const handleFileUpload = async (file, index) => {
    if (!file) return;

    setImageUploading(true);
    try {
      // Create FormData for file upload
      const formDataUpload = new FormData();
      formDataUpload.append('image', file);

      // Upload to backend
      const API_URL = process.env.REACT_APP_BACKEND_URL;
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${API_URL}/api/admin/upload-image`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formDataUpload
      });
      
      if (!response.ok) {
        throw new Error('Upload failed');
      }
      
      const data = await response.json();
      const imageUrl = `${API_URL}${data.url}`;
      handleImageChange(index, imageUrl);
    } catch (error) {
      console.error('Error uploading image:', error);
    } finally {
      setImageUploading(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = isRTL ? 'اسم المنتج مطلوب' : 'Product name is required';
    }
    
    if (!formData.price || formData.price <= 0) {
      newErrors.price = isRTL ? 'السعر مطلوب وأكبر من صفر' : 'Valid price is required';
    }
    
    if (formData.original_price && formData.original_price <= formData.price) {
      newErrors.original_price = isRTL ? 'السعر الأصلي يجب أن يكون أكبر من السعر الحالي' : 'Original price must be greater than current price';
    }
    
    if (!formData.images[0]) {
      newErrors.images = isRTL ? 'صورة واحدة على الأقل مطلوبة' : 'At least one image is required';
    }
    
    if (formData.stock_quantity < 0) {
      newErrors.stock_quantity = isRTL ? 'كمية المخزون لا يمكن أن تكون سالبة' : 'Stock quantity cannot be negative';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    const submitData = {
      ...formData,
      price: parseFloat(formData.price),
      original_price: formData.original_price ? parseFloat(formData.original_price) : null,
      stock_quantity: parseInt(formData.stock_quantity) || 0,
      tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [],
      images: formData.images.filter(img => img.trim())
    };

    onSave(submitData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" dir={isRTL ? 'rtl' : 'ltr'}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">
            {isEdit 
              ? (isRTL ? 'تعديل المنتج' : 'Edit Product')
              : (isRTL ? 'إضافة منتج جديد' : 'Add New Product')
            }
          </h2>
          <Button onClick={onClose} variant="ghost" size="sm">
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          {/* Basic Information */}
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Package className="h-5 w-5 mr-2" />
                {isRTL ? 'المعلومات الأساسية' : 'Basic Information'}
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Product Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {isRTL ? 'اسم المنتج (عربي) *' : 'Product Name (Arabic) *'}
                  </label>
                  <Input
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder={isRTL ? 'أدخل اسم المنتج' : 'Enter product name'}
                    className={errors.name ? 'border-red-500' : ''}
                    dir="rtl"
                  />
                  {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {isRTL ? 'اسم المنتج (إنجليزي)' : 'Product Name (English)'}
                  </label>
                  <Input
                    value={formData.name_en}
                    onChange={(e) => handleInputChange('name_en', e.target.value)}
                    placeholder="Enter product name in English"
                    dir="ltr"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {isRTL ? 'وصف المنتج (عربي)' : 'Product Description (Arabic)'}
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    rows={4}
                    placeholder={isRTL ? 'أدخل وصف المنتج' : 'Enter product description'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    dir="rtl"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {isRTL ? 'وصف المنتج (إنجليزي)' : 'Product Description (English)'}
                  </label>
                  <textarea
                    value={formData.description_en}
                    onChange={(e) => handleInputChange('description_en', e.target.value)}
                    rows={4}
                    placeholder="Enter product description in English"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    dir="ltr"
                  />
                </div>
              </div>

              {/* Category and SKU */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {isRTL ? 'الفئة *' : 'Category *'}
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => handleInputChange('category', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  >
                    {categoryOptions.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.icon} {isRTL ? cat.label_ar : cat.label_en}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {isRTL ? 'رمز المنتج (SKU)' : 'SKU'}
                  </label>
                  <Input
                    value={formData.sku}
                    onChange={(e) => handleInputChange('sku', e.target.value)}
                    placeholder="AL-XXXX-001"
                  />
                </div>
              </div>
            </div>

            {/* Pricing */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <DollarSign className="h-5 w-5 mr-2" />
                {isRTL ? 'الأسعار والمخزون' : 'Pricing & Inventory'}
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {isRTL ? 'السعر الحالي *' : 'Current Price *'}
                  </label>
                  <Input
                    type="number"
                    value={formData.price}
                    onChange={(e) => handleInputChange('price', e.target.value)}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    className={errors.price ? 'border-red-500' : ''}
                  />
                  {errors.price && <p className="text-red-500 text-sm mt-1">{errors.price}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {isRTL ? 'السعر الأصلي' : 'Original Price'}
                  </label>
                  <Input
                    type="number"
                    value={formData.original_price}
                    onChange={(e) => handleInputChange('original_price', e.target.value)}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    className={errors.original_price ? 'border-red-500' : ''}
                  />
                  {errors.original_price && <p className="text-red-500 text-sm mt-1">{errors.original_price}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {isRTL ? 'كمية المخزون' : 'Stock Quantity'}
                  </label>
                  <Input
                    type="number"
                    value={formData.stock_quantity}
                    onChange={(e) => handleInputChange('stock_quantity', e.target.value)}
                    placeholder="100"
                    min="0"
                    className={errors.stock_quantity ? 'border-red-500' : ''}
                  />
                  {errors.stock_quantity && <p className="text-red-500 text-sm mt-1">{errors.stock_quantity}</p>}
                </div>
              </div>
            </div>

            {/* Images */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <ImageIcon className="h-5 w-5 mr-2" />
                {isRTL ? 'صور المنتج *' : 'Product Images *'}
              </h3>
              
              <div className="space-y-3">
                {formData.images.map((image, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="flex-1">
                      <Input
                        value={image}
                        onChange={(e) => handleImageChange(index, e.target.value)}
                        placeholder={isRTL ? 'رابط الصورة أو ارفع صورة' : 'Image URL or upload file'}
                      />
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <label className="cursor-pointer">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFileUpload(e.target.files[0], index)}
                          className="hidden"
                        />
                        <Button type="button" size="sm" variant="outline">
                          <Upload className="h-4 w-4" />
                        </Button>
                      </label>
                      
                      {image && (
                        <img
                          src={image}
                          alt={`Preview ${index + 1}`}
                          className="w-10 h-10 object-cover rounded border"
                        />
                      )}
                      
                      {formData.images.length > 1 && (
                        <Button
                          type="button"
                          onClick={() => removeImageField(index)}
                          size="sm"
                          variant="outline"
                          className="text-red-600 border-red-300 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                
                {formData.images.length < 5 && (
                  <Button
                    type="button"
                    onClick={addImageField}
                    variant="outline"
                    size="sm"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {isRTL ? 'إضافة صورة' : 'Add Image'}
                  </Button>
                )}
                
                {errors.images && <p className="text-red-500 text-sm">{errors.images}</p>}
              </div>
            </div>

            {/* Product Specifications */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Tag className="h-5 w-5 mr-2" />
                {isRTL ? 'المواصفات' : 'Specifications'}
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {isRTL ? 'المادة' : 'Material'}
                  </label>
                  <select
                    value={formData.material}
                    onChange={(e) => handleInputChange('material', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  >
                    <option value="">{isRTL ? 'اختر المادة' : 'Select Material'}</option>
                    {materials.map((material) => (
                      <option key={material.value} value={material.value}>
                        {material.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {isRTL ? 'اللون' : 'Color'}
                  </label>
                  <select
                    value={formData.color}
                    onChange={(e) => handleInputChange('color', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  >
                    <option value="">{isRTL ? 'اختر اللون' : 'Select Color'}</option>
                    {colors.map((color) => (
                      <option key={color.value} value={color.value}>
                        {color.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {isRTL ? 'الوزن' : 'Weight'}
                  </label>
                  <Input
                    value={formData.weight}
                    onChange={(e) => handleInputChange('weight', e.target.value)}
                    placeholder={isRTL ? 'مثال: 15 جرام' : 'e.g., 15g'}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {isRTL ? 'الأبعاد' : 'Dimensions'}
                  </label>
                  <Input
                    value={formData.dimensions}
                    onChange={(e) => handleInputChange('dimensions', e.target.value)}
                    placeholder={isRTL ? 'مثال: 5x3 سم' : 'e.g., 5x3 cm'}
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {isRTL ? 'العلامات (مفصولة بفاصلة)' : 'Tags (comma separated)'}
                </label>
                <Input
                  value={formData.tags}
                  onChange={(e) => handleInputChange('tags', e.target.value)}
                  placeholder={isRTL ? 'فاخر, ذهب, عصري' : 'luxury, gold, modern'}
                />
              </div>
            </div>

            {/* Settings */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Star className="h-5 w-5 mr-2" />
                {isRTL ? 'إعدادات المنتج' : 'Product Settings'}
              </h3>
              
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.is_featured}
                    onChange={(e) => handleInputChange('is_featured', e.target.checked)}
                    className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    {isRTL ? 'منتج مميز' : 'Featured Product'}
                  </span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => handleInputChange('is_active', e.target.checked)}
                    className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    {isRTL ? 'منتج نشط' : 'Active Product'}
                  </span>
                </label>
              </div>
            </div>

            {/* Advanced SEO Section */}
            <div className="border-t pt-6">
              <Button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                variant="ghost"
                className="mb-4"
              >
                {showAdvanced ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                {isRTL ? 'إعدادات SEO المتقدمة' : 'Advanced SEO Settings'}
              </Button>

              {showAdvanced && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {isRTL ? 'عنوان SEO' : 'SEO Title'}
                    </label>
                    <Input
                      value={formData.meta_title}
                      onChange={(e) => handleInputChange('meta_title', e.target.value)}
                      placeholder={isRTL ? 'عنوان محسن لمحركات البحث' : 'SEO optimized title'}
                      maxLength={60}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {formData.meta_title.length}/60 {isRTL ? 'حرف' : 'characters'}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {isRTL ? 'وصف SEO' : 'SEO Description'}
                    </label>
                    <textarea
                      value={formData.meta_description}
                      onChange={(e) => handleInputChange('meta_description', e.target.value)}
                      rows={3}
                      placeholder={isRTL ? 'وصف محسن لمحركات البحث' : 'SEO optimized description'}
                      maxLength={160}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {formData.meta_description.length}/160 {isRTL ? 'حرف' : 'characters'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-4 pt-6 border-t mt-6">
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
              disabled={loading}
            >
              {isRTL ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {isRTL ? 'جاري الحفظ...' : 'Saving...'}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {isEdit 
                    ? (isRTL ? 'تحديث المنتج' : 'Update Product')
                    : (isRTL ? 'إضافة المنتج' : 'Add Product')
                  }
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductFormModal;