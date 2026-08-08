import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import axios from 'axios';
import ProductFormModal from '../../components/admin/ProductFormModal';
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
  ExternalLink,
  Grid3x3,
  List,
  MoreHorizontal,
  Settings,
  Tag,
  Palette,
  Ruler,
  Weight
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { API_BASE_URL } from '../../api';

const EnhancedProductsPage = () => {
  const { language, currency, convert } = useLanguage();
  const API_URL = API_BASE_URL;
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [uploading, setUploading] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // grid or list
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  
  const isRTL = language === 'ar';

  // Get auth token
  const token = localStorage.getItem('token');

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

  // const [formErrors, setFormErrors] = useState({}); // Reserved for future validation

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

  // Filter products based on search term, category, and status
  const filteredProducts = products.filter(product => {
    const matchesSearch = !searchTerm || 
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.name_en.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && product.is_active) ||
      (statusFilter === 'inactive' && !product.is_active) ||
      (statusFilter === 'featured' && product.is_featured);

    return matchesSearch && matchesCategory && matchesStatus;
  });

  // All the functions from previous implementation
  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/admin/products`);
      setProducts(response.data || []);
      setLoadError('');
    } catch (error) {
      // Invented products are worse than none: the owner sees a catalogue that
      // isn't theirs and cannot tell.
      console.error('Error fetching products:', error);
      setProducts([]);
      setLoadError(error.response?.data?.detail
        || (isRTL ? 'تعذّر تحميل المنتجات' : 'Could not load products'));
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProduct = async (productData) => {
    try {
      if (editingProduct) {
        // Update existing product
        const response = await axios.put(`${API_URL}/api/products/${editingProduct.id}`, productData);
        setProducts(products.map(p => p.id === editingProduct.id ? response.data : p));
      } else {
        // Create new product
        const response = await axios.post(`${API_URL}/api/products`, productData);
        setProducts([...products, response.data]);
      }
      
      setShowModal(false);
      setEditingProduct(null);
    } catch (error) {
      console.error('Error saving product:', error);
      // For demo purposes, add to local state
      if (editingProduct) {
        setProducts(products.map(p => p.id === editingProduct.id ? { ...editingProduct, ...productData } : p));
      } else {
        const newProduct = {
          id: Date.now().toString(),
          ...productData,
          created_at: new Date().toISOString()
        };
        setProducts([...products, newProduct]);
      }
      setShowModal(false);
      setEditingProduct(null);
    }
  };

  const handleEditProduct = (product) => {
    setEditingProduct(product);
    setShowModal(true);
  };

  const handleDeleteProduct = async (productId) => {
    // eslint-disable-next-line no-restricted-globals
    if (!confirm(isRTL ? 'هل أنت متأكد من حذف هذا المنتج؟' : 'Are you sure you want to delete this product?')) {
      return;
    }

    try {
      await axios.delete(`${API_URL}/api/products/${productId}`);
      setProducts(products.filter(p => p.id !== productId));
    } catch (error) {
      console.error('Error deleting product:', error);
      // For demo purposes, remove from local state
      setProducts(products.filter(p => p.id !== productId));
    }
  };

  const handleSelectAll = () => {
    if (selectedProducts.length === filteredProducts.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(filteredProducts.map(p => p.id));
    }
  };

  const handleSelectProduct = (productId) => {
    if (selectedProducts.includes(productId)) {
      setSelectedProducts(selectedProducts.filter(id => id !== productId));
    } else {
      setSelectedProducts([...selectedProducts, productId]);
    }
  };

  // Catalogue prices are stored in SAR. This used to stamp the *selected*
  // currency's symbol onto that untouched number, so a 175 riyal product read
  // as "$US 175" — the same figure, a different currency, and about four times
  // the real amount. Convert first, then label.
  const formatCurrency = (amount) => {
    const value = currency === 'SAR' ? (amount || 0) : convert(amount || 0, 'SAR', currency);
    return new Intl.NumberFormat(isRTL ? 'ar-SA' : 'en-US', {
      style: 'currency',
      currency: currency
    }).format(value);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString(
      isRTL ? 'ar-SA' : 'en-US',
      { year: 'numeric', month: 'short', day: 'numeric' }
    );
  };

  const getCategoryLabel = (categoryValue) => {
    const category = categories.find(cat => cat.value === categoryValue);
    return category ? (isRTL ? category.label_ar : category.label_en) : categoryValue;
  };

  const getCategoryIcon = (categoryValue) => {
    const category = categories.find(cat => cat.value === categoryValue);
    return category?.icon || '📦';
  };

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {loadError && (
        <div
          role="alert"
          data-testid="products-error"
          className="border border-red-300 bg-red-50 text-red-800 rounded-lg px-4 py-3 text-sm"
        >
          {loadError}
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Package className="h-8 w-8 text-amber-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {isRTL ? 'إدارة المنتجات' : 'Products Management'}
            </h1>
            <p className="text-gray-600 mt-1">
              {isRTL ? `${filteredProducts.length} منتج إجمالي` : `${filteredProducts.length} total products`}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            onClick={() => setShowModal(true)}
            className="bg-amber-600 hover:bg-amber-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            {isRTL ? 'إضافة منتج' : 'Add Product'}
          </Button>
          
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            {isRTL ? 'تصدير' : 'Export'}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-6 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">{isRTL ? 'إجمالي المنتجات' : 'Total Products'}</p>
              <p className="text-3xl font-bold text-blue-900">{products.length}</p>
            </div>
            <Package className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-green-50 to-green-100 p-6 rounded-lg border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">{isRTL ? 'منتجات نشطة' : 'Active Products'}</p>
              <p className="text-3xl font-bold text-green-900">{products.filter(p => p.is_active).length}</p>
            </div>
            <Check className="h-8 w-8 text-green-600" />
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-amber-50 to-amber-100 p-6 rounded-lg border border-amber-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-amber-600">{isRTL ? 'منتجات مميزة' : 'Featured Products'}</p>
              <p className="text-3xl font-bold text-amber-900">{products.filter(p => p.is_featured).length}</p>
            </div>
            <Star className="h-8 w-8 text-amber-600" />
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-red-50 to-red-100 p-6 rounded-lg border border-red-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-600">{isRTL ? 'مخزون منخفض' : 'Low Stock'}</p>
              <p className="text-3xl font-bold text-red-900">{products.filter(p => p.stock_quantity < 10).length}</p>
            </div>
            <AlertCircle className="h-8 w-8 text-red-600" />
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex flex-col md:flex-row gap-4 flex-1">
            {/* Search */}
            <div className="relative flex-1">
              <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400`} />
              <Input
                type="text"
                placeholder={isRTL ? 'البحث في المنتجات...' : 'Search products...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`${isRTL ? 'pr-10' : 'pl-10'} w-full`}
              />
            </div>
            
            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            >
              <option value="all">{isRTL ? 'جميع الفئات' : 'All Categories'}</option>
              {categories.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.icon} {isRTL ? cat.label_ar : cat.label_en}
                </option>
              ))}
            </select>
            
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            >
              <option value="all">{isRTL ? 'جميع الحالات' : 'All Status'}</option>
              <option value="active">{isRTL ? 'نشط' : 'Active'}</option>
              <option value="inactive">{isRTL ? 'غير نشط' : 'Inactive'}</option>
              <option value="featured">{isRTL ? 'مميز' : 'Featured'}</option>
              <option value="low-stock">{isRTL ? 'مخزون منخفض' : 'Low Stock'}</option>
            </select>
          </div>
          
          {/* View Mode Toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1 rounded-md text-sm transition-colors ${
                viewMode === 'grid' ? 'bg-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Grid3x3 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1 rounded-md text-sm transition-colors ${
                viewMode === 'list' ? 'bg-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedProducts.length > 0 && (
          <div className="mt-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-amber-800">
                  {isRTL ? `تم اختيار ${selectedProducts.length} منتج` : `${selectedProducts.length} products selected`}
                </span>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline">
                  {isRTL ? 'تفعيل' : 'Activate'}
                </Button>
                <Button size="sm" variant="outline">
                  {isRTL ? 'إلغاء تفعيل' : 'Deactivate'}
                </Button>
                <Button size="sm" variant="outline" className="text-red-600 border-red-300 hover:bg-red-50">
                  {isRTL ? 'حذف' : 'Delete'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Products Grid/List */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-6">
              {filteredProducts.map((product) => (
                <div key={product.id} className="group relative bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-all duration-300">
                  {/* Selection Checkbox */}
                  <div className="absolute top-3 left-3 z-10">
                    <input
                      type="checkbox"
                      checked={selectedProducts.includes(product.id)}
                      onChange={() => handleSelectProduct(product.id)}
                      className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                    />
                  </div>

                  {/* Product Image */}
                  <div className="relative h-48 overflow-hidden">
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    
                    {/* Status Badges */}
                    <div className="absolute top-3 right-3 flex flex-col gap-1">
                      {!product.is_active && (
                        <span className="px-2 py-1 bg-red-500 text-white text-xs font-semibold rounded-full">
                          {isRTL ? 'غير نشط' : 'Inactive'}
                        </span>
                      )}
                      {product.is_featured && (
                        <span className="px-2 py-1 bg-amber-500 text-white text-xs font-semibold rounded-full">
                          {isRTL ? 'مميز' : 'Featured'}
                        </span>
                      )}
                      {product.stock_quantity < 10 && (
                        <span className="px-2 py-1 bg-red-500 text-white text-xs font-semibold rounded-full">
                          {isRTL ? 'مخزون قليل' : 'Low Stock'}
                        </span>
                      )}
                    </div>

                    {/* Quick Actions */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                      <div className="flex gap-2">
                        <Button size="sm" variant="secondary" onClick={() => window.open(`/product/${product.id}`, '_blank')}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          className="bg-amber-600 hover:bg-amber-700"
                          onClick={() => handleEditProduct(product)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Product Info */}
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">{getCategoryIcon(product.category)}</span>
                      <span className="text-xs text-gray-500 uppercase font-semibold">
                        {getCategoryLabel(product.category)}
                      </span>
                    </div>
                    
                    <h3 className="font-bold text-lg mb-2 text-gray-900 line-clamp-2">
                      {product.name}
                    </h3>
                    
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs text-gray-500">SKU: {product.sku}</span>
                      <div className="flex items-center">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-3 w-3 ${
                              i < Math.floor(product.rating || 0)
                                ? 'text-yellow-400 fill-current'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                        <span className="text-xs text-gray-600 ml-1">({product.reviews_count || 0})</span>
                      </div>
                    </div>

                    {/* Price and Stock */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex flex-col">
                        <span className="text-xl font-bold text-amber-600">
                          {formatCurrency(product.price)}
                        </span>
                        {product.original_price && product.original_price > product.price && (
                          <span className="text-sm text-gray-500 line-through">
                            {formatCurrency(product.original_price)}
                          </span>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-gray-900">
                          {isRTL ? 'المخزون:' : 'Stock:'} {product.stock_quantity}
                        </div>
                      </div>
                    </div>

                    {/* Material and Color */}
                    <div className="flex items-center justify-between text-xs text-gray-600 mb-4">
                      <div className="flex items-center gap-1">
                        <Palette className="h-3 w-3" />
                        {product.material}
                      </div>
                      <div className="flex items-center gap-1">
                        <div 
                          className="w-3 h-3 rounded-full border border-gray-300"
                          style={{ 
                            backgroundColor: colors.find(c => c.value === product.color)?.color || '#gray'
                          }}
                        />
                        {product.color}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button 
                        className="flex-1 bg-amber-600 hover:bg-amber-700" 
                        size="sm"
                        onClick={() => handleEditProduct(product)}
                      >
                        <Edit2 className="h-3 w-3 mr-1" />
                        {isRTL ? 'تعديل' : 'Edit'}
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-red-600 border-red-300 hover:bg-red-50"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* List View */
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <input
                        type="checkbox"
                        checked={selectedProducts.length === filteredProducts.length && filteredProducts.length > 0}
                        onChange={handleSelectAll}
                        className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                      />
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {isRTL ? 'المنتج' : 'Product'}
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {isRTL ? 'الفئة' : 'Category'}
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {isRTL ? 'السعر' : 'Price'}
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {isRTL ? 'المخزون' : 'Stock'}
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {isRTL ? 'الحالة' : 'Status'}
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {isRTL ? 'الإجراءات' : 'Actions'}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredProducts.map((product) => (
                    <tr key={product.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedProducts.includes(product.id)}
                          onChange={() => handleSelectProduct(product.id)}
                          className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-12 w-12">
                            <img className="h-12 w-12 rounded-lg object-cover" src={product.images[0]} alt={product.name} />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{product.name}</div>
                            <div className="text-sm text-gray-500">SKU: {product.sku}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className="text-lg mr-2">{getCategoryIcon(product.category)}</span>
                          <span className="text-sm text-gray-900">{getCategoryLabel(product.category)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{formatCurrency(product.price)}</div>
                        {product.original_price && product.original_price > product.price && (
                          <div className="text-sm text-gray-500 line-through">{formatCurrency(product.original_price)}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-sm font-medium ${product.stock_quantity < 10 ? 'text-red-600' : 'text-gray-900'}`}>
                          {product.stock_quantity}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            product.is_active 
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {product.is_active ? (isRTL ? 'نشط' : 'Active') : (isRTL ? 'غير نشط' : 'Inactive')}
                          </span>
                          {product.is_featured && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                              {isRTL ? 'مميز' : 'Featured'}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="ghost" onClick={() => window.open(`/product/${product.id}`, '_blank')}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="text-amber-600 hover:text-amber-900"
                            onClick={() => handleEditProduct(product)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredProducts.length === 0 && (
        <div className="text-center py-16 bg-white rounded-lg shadow-sm border border-gray-200">
          <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {isRTL ? 'لا توجد منتجات' : 'No Products Found'}
          </h3>
          <p className="text-gray-600 mb-6">
            {isRTL ? 'ابدأ بإضافة منتجاتك الأولى' : 'Start by adding your first products'}
          </p>
          <Button onClick={() => setShowModal(true)} className="bg-amber-600 hover:bg-amber-700">
            <Plus className="h-4 w-4 mr-2" />
            {isRTL ? 'إضافة منتج' : 'Add Product'}
          </Button>
        </div>
      )}

      {/* Product Form Modal */}
      )}
    </div>
  );
};

export default EnhancedProductsPage;