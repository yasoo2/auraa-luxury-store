import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Package, Users, ShoppingCart, DollarSign, KeyRound, ShieldCheck } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { toast } from 'sonner';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { formatDate } from '../utils/dateUtils';
import axios from 'axios';
import AdminManagementSection from './AdminManagementSection';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AdminPage = () => {
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalOrders: 0,
    totalRevenue: 0,
    totalUsers: 0
  });
  const [newProduct, setNewProduct] = useState({
    name: '',
    description: '',
    price: '',
    original_price: '',
    discount_percentage: '',
    category: '',
    images: [''],
    stock_quantity: '100',
    external_url: ''
  });

  // Integrations state
  const [integrations, setIntegrations] = useState({
    aliexpress_app_key: '',
    aliexpress_app_secret: '',
    aliexpress_refresh_token: '',
    amazon_access_key: '',
    amazon_secret_key: '',
    amazon_partner_tag: '',
    amazon_region: ''
  });
  const [savingIntegrations, setSavingIntegrations] = useState(false);

  useEffect(() => {
    fetchProducts();
    fetchStats();
    fetchIntegrations();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await axios.get(`${API}/products?limit=100`);
      setProducts(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error(isRTL ? 'فشل في تحميل المنتجات' : 'Failed to load products');
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      setStats({
        totalProducts: products.length,
        totalOrders: 47,
        totalRevenue: 12450.75,
        totalUsers: 234
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchIntegrations = async () => {
    try {
      const res = await axios.get(`${API}/admin/integrations`);
      setIntegrations({
        aliexpress_app_key: res.data.aliexpress_app_key || '',
        aliexpress_app_secret: res.data.aliexpress_app_secret || '',
        aliexpress_refresh_token: res.data.aliexpress_refresh_token || '',
        amazon_access_key: res.data.amazon_access_key || '',
        amazon_secret_key: res.data.amazon_secret_key || '',
        amazon_partner_tag: res.data.amazon_partner_tag || '',
        amazon_region: res.data.amazon_region || ''
      });
    } catch (error) {
      console.error('Error fetching integrations:', error);
    }
  };

  const handleIntegrationsChange = (e) => {
    const { name, value } = e.target;
    setIntegrations(prev => ({ ...prev, [name]: value }));
  };

  const saveIntegrations = async (e) => {
    e.preventDefault();
    setSavingIntegrations(true);
    try {
      await axios.post(`${API}/admin/integrations`, integrations);
      toast.success(isRTL ? 'تم حفظ إعدادات التكامل بنجاح' : 'Integration settings saved successfully');
      fetchIntegrations();
    } catch (error) {
      console.error('Error saving integrations:', error);
      toast.error(isRTL ? 'فشل في حفظ إعدادات التكامل' : 'Failed to save integration settings');
    } finally {
      setSavingIntegrations(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewProduct(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageChange = (index, value) => {
    const updatedImages = [...newProduct.images];
    updatedImages[index] = value;
    setNewProduct(prev => ({
      ...prev,
      images: updatedImages
    }));
  };

  const addImageField = () => {
    setNewProduct(prev => ({
      ...prev,
      images: [...prev.images, '']
    }));
  };

  const removeImageField = (index) => {
    if (newProduct.images.length > 1) {
      const updatedImages = newProduct.images.filter((_, i) => i !== index);
      setNewProduct(prev => ({
        ...prev,
        images: updatedImages
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const productData = {
        ...newProduct,
        price: parseFloat(newProduct.price),
        original_price: newProduct.original_price ? parseFloat(newProduct.original_price) : null,
        discount_percentage: newProduct.discount_percentage ? parseInt(newProduct.discount_percentage) : null,
        stock_quantity: parseInt(newProduct.stock_quantity),
        images: newProduct.images.filter(img => img.trim() !== '')
      };
      
      await axios.post(`${API}/products`, productData);
      toast.success(isRTL ? 'تم إضافة المنتج بنجاح' : 'Product added successfully');
      setIsAddProductOpen(false);
      setNewProduct({
        name: '',
        description: '',
        price: '',
        original_price: '',
        discount_percentage: '',
        category: '',
        images: [''],
        stock_quantity: '100',
        external_url: ''
      });
      fetchProducts();
    } catch (error) {
      console.error('Error adding product:', error);
      toast.error(isRTL ? 'فشل في إضافة المنتج' : 'Failed to add product');
    }
  };

  const deleteProduct = async (productId) => {
    if (window.confirm(isRTL ? 'هل أنت متأكد من حذف هذا المنتج؟' : 'Are you sure you want to delete this product?')) {
      try {
        toast.info(isRTL ? 'هذه الميزة غير متاحة في النسخة التجريبية' : 'This feature is not available in demo version');
      } catch (error) {
        toast.error(isRTL ? 'فشل في حذف المنتج' : 'Failed to delete product');
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="font-display text-4xl font-bold text-gray-900 mb-4" data-testid="admin-title">
            لوحة إدارة Auraa Luxury
          </h1>
          <p className="text-xl text-gray-600">
            إدارة المنتجات والطلبات والمبيعات
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="luxury-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">إجمالي المنتجات</p>
                <p className="text-3xl font-bold text-gray-900">{products.length}</p>
              </div>
              <Package className="h-8 w-8 text-amber-600" />
            </div>
          </Card>
          <Card className="luxury-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">إجمالي الطلبات</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalOrders}</p>
              </div>
              <ShoppingCart className="h-8 w-8 text-amber-600" />
            </div>
          </Card>
          <Card className="luxury-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">إجمالي المبيعات</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalRevenue.toLocaleString()} ر.س</p>
              </div>
              <DollarSign className="h-8 w-8 text-amber-600" />
            </div>
          </Card>
          <Card className="luxury-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">إجمالي العملاء</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalUsers}</p>
              </div>
              <Users className="h-8 w-8 text-amber-600" />
            </div>
          </Card>
        </div>

        <Tabs defaultValue="products" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8">
            <TabsTrigger value="products" data-testid="products-tab">المنتجات</TabsTrigger>
            <TabsTrigger value="orders">الطلبات</TabsTrigger>
            <TabsTrigger value="users">العملاء</TabsTrigger>
            <TabsTrigger value="integrations">التكاملات</TabsTrigger>
          </TabsList>

          {/* Products Tab */}
          <TabsContent value="products">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">إدارة المنتجات</h2>
              <Dialog open={isAddProductOpen} onOpenChange={setIsAddProductOpen}>
                <DialogTrigger asChild>
                  <Button className="btn-luxury" data-testid="add-product-button">
                    <Plus className="h-4 w-4 ml-2" />
                    إضافة منتج جديد
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>إضافة منتج جديد</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">اسم المنتج</label>
                        <Input
                          name="name"
                          value={newProduct.name}
                          onChange={handleInputChange}
                          required
                          data-testid="product-name-input"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">الفئة</label>
                        <Select value={newProduct.category || ""} onValueChange={(value) => setNewProduct({...newProduct, category: value})}>
                          <SelectTrigger data-testid="product-category-select">
                            <SelectValue placeholder="اختر الفئة" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="earrings">أقراط</SelectItem>
                            <SelectItem value="necklaces">قلادات</SelectItem>
                            <SelectItem value="bracelets">أساور</SelectItem>
                            <SelectItem value="rings">خواتم</SelectItem>
                            <SelectItem value="watches">ساعات</SelectItem>
                            <SelectItem value="sets">أطقم</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">السعر</label>
                        <Input
                          name="price"
                          type="number"
                          step="0.01"
                          value={newProduct.price}
                          onChange={handleInputChange}
                          required
                          data-testid="product-price-input"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">السعر الأصلي (اختياري)</label>
                        <Input
                          name="original_price"
                          type="number"
                          step="0.01"
                          value={newProduct.original_price}
                          onChange={handleInputChange}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">نسبة الخصم (اختياري)</label>
                        <Input
                          name="discount_percentage"
                          type="number"
                          value={newProduct.discount_percentage}
                          onChange={handleInputChange}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">كمية المخزون</label>
                        <Input
                          name="stock_quantity"
                          type="number"
                          value={newProduct.stock_quantity}
                          onChange={handleInputChange}
                          required
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">وصف المنتج</label>
                      <Textarea
                        name="description"
                        value={newProduct.description}
                        onChange={handleInputChange}
                        rows={3}
                        required
                        data-testid="product-description-input"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">صور المنتج</label>
                      {newProduct.images.map((image, index) => (
                        <div key={index} className="flex items-center space-x-2 mb-2">
                          <Input
                            placeholder="رابط الصورة"
                            value={image}
                            onChange={(e) => handleImageChange(index, e.target.value)}
                            className="flex-1"
                          />
                          {newProduct.images.length > 1 && (
                            <Button type="button" variant="outline" size="sm" onClick={() => removeImageField(index)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                      <Button type="button" variant="outline" size="sm" onClick={addImageField}>
                        <Plus className="h-4 w-4 ml-1" /> إضافة صورة
                      </Button>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">رابط خارجي (اختياري)</label>
                      <Input
                        name="external_url"
                        type="url"
                        value={newProduct.external_url}
                        onChange={handleInputChange}
                        placeholder="https://..."
                      />
                    </div>
                    
                    <div className="flex justify-end space-x-4">
                      <Button type="button" variant="outline" onClick={() => setIsAddProductOpen(false)}>
                        إلغاء
                      </Button>
                      <Button type="submit" className="btn-luxury" data-testid="save-product-button">
                        حفظ المنتج
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product) => (
                <Card key={product.id} className="luxury-card overflow-hidden" data-testid={`admin-product-${product.id}`}>
                  <img 
                    src={product.images[0]} 
                    alt={product.name}
                    className="w-full h-48 object-cover"
                  />
                  <div className="p-4">
                    <h3 className="font-bold text-lg mb-2 line-clamp-2">{product.name}</h3>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xl font-bold text-amber-600">{product.price} ر.س</span>
                      <span className="text-sm text-gray-600">مخزون: {product.stock_quantity}</span>
                    </div>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm" className="flex-1">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1 text-red-600 hover:bg-red-50"
                        onClick={() => deleteProduct(product.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders">
            <Card className="luxury-card p-8 text-center">
              <ShoppingCart className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">إدارة الطلبات</h3>
              <p className="text-gray-600">
                هذه الميزة قيد التطوير
              </p>
            </Card>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card className="luxury-card p-8 text-center">
              <Users className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">إدارة العملاء</h3>
              <p className="text-gray-600">
                هذه الميزة قيد التطوير
              </p>
            </Card>
          </TabsContent>

          {/* Integrations Tab */}
          <TabsContent value="integrations">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="luxury-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-gray-900">AliExpress Dropshipping</h3>
                  <ShieldCheck className="h-6 w-6 text-green-600" />
                </div>
                <p className="text-gray-600 mb-4">أدخل مفاتيح AliExpress لتفعيل الاستيراد وإنشاء الطلبات.</p>
                <form onSubmit={saveIntegrations} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">App Key</label>
                    <Input name="aliexpress_app_key" value={integrations.aliexpress_app_key} onChange={handleIntegrationsChange} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">App Secret</label>
                    <Input name="aliexpress_app_secret" value={integrations.aliexpress_app_secret} onChange={handleIntegrationsChange} type="password" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Refresh Token (OAuth)</label>
                    <Input name="aliexpress_refresh_token" value={integrations.aliexpress_refresh_token} onChange={handleIntegrationsChange} type="password" />
                  </div>
                  <div className="flex justify-end">
                    <Button disabled={savingIntegrations} className="btn-luxury">
                      {savingIntegrations ? 'جاري الحفظ...' : 'حفظ'}
                    </Button>
                  </div>
                </form>
              </Card>

              <Card className="luxury-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-gray-900">Amazon PA-API (كتالوج)</h3>
                  <KeyRound className="h-6 w-6 text-gray-500" />
                </div>
                <p className="text-gray-600 mb-4">إعداد أولي. سيتم التفعيل بعد تزويد المفاتيح.</p>
                <form onSubmit={saveIntegrations} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Access Key</label>
                    <Input name="amazon_access_key" value={integrations.amazon_access_key} onChange={handleIntegrationsChange} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Secret Key</label>
                    <Input name="amazon_secret_key" value={integrations.amazon_secret_key} onChange={handleIntegrationsChange} type="password" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Associate/Partner Tag</label>
                    <Input name="amazon_partner_tag" value={integrations.amazon_partner_tag} onChange={handleIntegrationsChange} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Region</label>
                    <Input name="amazon_region" value={integrations.amazon_region} onChange={handleIntegrationsChange} placeholder="eg. us-east-1" />
                  </div>
                  <div className="flex justify-end">
                    <Button disabled={savingIntegrations} className="btn-luxury">
                      {savingIntegrations ? 'جاري الحفظ...' : 'حفظ'}
                    </Button>
                  </div>
                </form>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminPage;