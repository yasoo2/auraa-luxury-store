import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Minus, Plus, Trash2, ShoppingBag, ArrowLeft, Truck } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const CartPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { fetchCartCount } = useCart();
  const { isRTL, currency } = useLanguage();
  const [cart, setCart] = useState(null);
  const [products, setProducts] = useState({});
  const [loading, setLoading] = useState(true);
  const [countryCode, setCountryCode] = useState('SA');
  const [shippingEstimate, setShippingEstimate] = useState({ 
    loading: false, 
    cost: 0, 
    days: null, 
    error: null 
  });

  useEffect(() => {
    if (user) {
      fetchCart();
      detectCountry();
    } else {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (cart && cart.items.length > 0 && countryCode) {
      estimateShipping();
    }
  }, [cart, countryCode, currency]);

  const fetchCart = async () => {
    try {
      const response = await axios.get(`${API}/cart`);
      setCart(response.data);
      
      // Fetch product details for cart items
      const productPromises = response.data.items.map(item => 
        axios.get(`${API}/products/${item.product_id}`)
      );
      const productResponses = await Promise.all(productPromises);
      
      const productsMap = {};
      productResponses.forEach(res => {
        productsMap[res.data.id] = res.data;
      });
      setProducts(productsMap);
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching cart:', error);
      toast.error('فشل في تحميل السلة');
      setLoading(false);
    }
  };

  const updateQuantity = async (productId, newQuantity) => {
    if (newQuantity < 1) return;
    
    try {
      // Remove item first, then add with new quantity
      await axios.delete(`${API}/cart/remove/${productId}`);
      if (newQuantity > 0) {
        await axios.post(`${API}/cart/add?product_id=${productId}&quantity=${newQuantity}`);
      }
      await fetchCart(); // Refresh cart
      await fetchCartCount(); // Update cart count in navbar
      toast.success('تم تحديث السلة');
    } catch (error) {
      console.error('Error updating quantity:', error);
      toast.error('فشل في تحديث الكمية');
    }
  };

  const removeItem = async (productId) => {
    try {
      await axios.delete(`${API}/cart/remove/${productId}`);
      await fetchCart(); // Refresh cart
      await fetchCartCount(); // Update cart count in navbar
      toast.success('تم إزالة المنتج من السلة');
    } catch (error) {
      console.error('Error removing item:', error);
      toast.error('فشل في إزالة المنتج');
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center">
        <Card className="luxury-card p-8 text-center max-w-md">
          <ShoppingBag className="h-16 w-16 mx-auto mb-4 text-amber-600" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">يجب تسجيل الدخول</h2>
          <p className="text-gray-600 mb-6">
            يجب تسجيل الدخول لعرض سلة التسوق
          </p>
          <Link to="/auth">
            <Button className="btn-luxury">
              تسجيل الدخول
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <ShoppingBag className="h-24 w-24 mx-auto mb-6 text-gray-400" />
            <h1 className="font-display text-4xl font-bold text-gray-900 mb-4" data-testid="empty-cart-title">
              سلة التسوق فارغة
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              لم تقم بإضافة أي منتجات بعد
            </p>
            <div className="space-y-4">
              <Link to="/products">
                <Button className="btn-luxury" data-testid="continue-shopping-button">
                  تابع التسوق
                  <ArrowLeft className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="font-display text-4xl font-bold text-gray-900 mb-4" data-testid="cart-page-title">
            سلة التسوق
          </h1>
          <p className="text-xl text-gray-600">
            مراجعة وتعديل منتجاتك قبل إتمام الطلب
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {cart.items.map((item) => {
              const product = products[item.product_id];
              if (!product) return null;
              
              return (
                <Card key={item.product_id} className="luxury-card p-6" data-testid={`cart-item-${item.product_id}`}>
                  <div className="flex flex-col md:flex-row gap-6">
                    <div className="flex-shrink-0">
                      <Link to={`/product/${product.id}`}>
                        <img 
                          src={product.images[0]} 
                          alt={product.name}
                          className="w-full md:w-32 h-32 object-cover rounded-lg hover:scale-105 transition-transform duration-300"
                        />
                      </Link>
                    </div>
                    
                    <div className="flex-grow">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <Link to={`/product/${product.id}`}>
                            <h3 className="font-bold text-lg text-gray-900 hover:text-amber-600 transition-colors">
                              {product.name}
                            </h3>
                          </Link>
                          <p className="text-gray-600 text-sm mt-1">
                            {product.category.replace('_', ' ')}
                          </p>
                        </div>
                        <button 
                          onClick={() => removeItem(item.product_id)}
                          className="text-red-500 hover:text-red-700 p-2"
                          data-testid={`remove-item-${item.product_id}`}
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center border border-gray-300 rounded-lg">
                            <button 
                              onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                              className="p-2 hover:bg-gray-100 transition-colors"
                              disabled={item.quantity <= 1}
                              data-testid={`decrease-quantity-${item.product_id}`}
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                            <span className="px-4 py-2 min-w-[3rem] text-center" data-testid={`item-quantity-${item.product_id}`}>
                              {item.quantity}
                            </span>
                            <button 
                              onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                              className="p-2 hover:bg-gray-100 transition-colors"
                              data-testid={`increase-quantity-${item.product_id}`}
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <div className="text-2xl font-bold text-amber-600" data-testid={`item-total-${item.product_id}`}>
                            {(item.price * item.quantity).toFixed(2)} ر.س
                          </div>
                          <div className="text-sm text-gray-600">
                            {item.price} ر.س للقطعة
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <Card className="luxury-card p-6 sticky top-24">
              <h2 className="text-xl font-bold text-gray-900 mb-6">ملخص الطلب</h2>
              
              <div className="space-y-4 mb-6">
                <div className="flex justify-between">
                  <span className="text-gray-600">المجموع الجزئي:</span>
                  <span className="font-medium" data-testid="subtotal">
                    {cart.total_amount.toFixed(2)} ر.س
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">الشحن:</span>
                  <span className="font-medium">
                    15.00 ر.س
                  </span>
                </div>
                <hr className="border-gray-200" />
                <div className="flex justify-between text-xl font-bold">
                  <span>المجموع:</span>
                  <span className="text-amber-600" data-testid="total-amount">
                    {(cart.total_amount + 15).toFixed(2)} ر.س
                  </span>
                </div>
              </div>
              
              <div className="space-y-3">
                <Link to="/checkout" className="block">
                  <Button className="btn-luxury w-full" data-testid="checkout-button">
                    إتمام الطلب
                    <ArrowLeft className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link to="/products" className="block">
                  <Button variant="outline" className="w-full">
                    متابعة التسوق
                  </Button>
                </Link>
              </div>
              
              {/* Security badges */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="text-center text-sm text-gray-600">
                  <p className="mb-2">🔒 دفع آمن ومشفر</p>
                  <p>🚚 شحن سريع وآمن</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartPage;