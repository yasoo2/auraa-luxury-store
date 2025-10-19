import React, { useState, useEffect } from 'react';
import { Truck, Package, DollarSign, Info, MapPin } from 'lucide-react';
import { Card } from './ui/card';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

/**
 * Component to display shipping, pricing, and tax information for a product
 * Shows transparent breakdown of costs including shipping and taxes
 * (Profit margin is hidden from customers)
 */
const ShippingPricingInfo = ({ product, country = 'SA', language = 'en' }) => {
  const [pricingInfo, setPricingInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const isRTL = language === 'ar' || language === 'he';
  
  const translations = {
    en: {
      title: 'Shipping & Pricing',
      basePrice: 'Product Price',
      shipping: 'Shipping Cost',
      taxes: 'Taxes & Duties',
      totalPrice: 'Total Price',
      freeShipping: 'Free Shipping',
      delivery: 'Estimated Delivery',
      days: 'days',
      shipsTo: 'Ships to',
      taxBreakdown: 'Tax Breakdown',
      customs: 'Customs Duty',
      vat: 'VAT',
      included: 'All taxes included',
      loading: 'Calculating pricing...',
      error: 'Unable to calculate pricing',
      guaranteed: 'Price Guaranteed',
      noHiddenFees: 'No hidden fees'
    },
    ar: {
      title: 'الشحن والأسعار',
      basePrice: 'سعر المنتج',
      shipping: 'تكلفة الشحن',
      taxes: 'الضرائب والرسوم',
      totalPrice: 'السعر الإجمالي',
      freeShipping: 'شحن مجاني',
      delivery: 'التسليم المتوقع',
      days: 'يوم',
      shipsTo: 'الشحن إلى',
      taxBreakdown: 'تفاصيل الضرائب',
      customs: 'رسوم جمركية',
      vat: 'ضريبة القيمة المضافة',
      included: 'جميع الضرائب مشمولة',
      loading: 'جاري حساب السعر...',
      error: 'تعذر حساب السعر',
      guaranteed: 'سعر مضمون',
      noHiddenFees: 'لا توجد رسوم خفية'
    }
  };
  
  const t = translations[language] || translations.en;
  
  useEffect(() => {
    if (product && product.id) {
      fetchPricingInfo();
    }
  }, [product, country]);
  
  const fetchPricingInfo = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Check if product has country-specific pricing cached
      if (product.country_pricing && product.country_pricing[country]) {
        setPricingInfo(product.country_pricing[country]);
        setLoading(false);
        return;
      }
      
      // Fetch availability info which includes pricing
      const response = await axios.get(
        `${API}/aliexpress/real/availability/${product.id}?country=${country}`
      );
      
      if (response.data && response.data.available) {
        setPricingInfo(response.data.pricing);
      } else {
        setError(t.error);
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Error fetching pricing info:', err);
      setError(t.error);
      setLoading(false);
    }
  };
  
  if (loading) {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-center space-x-2">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
          <span className="text-sm text-gray-600">{t.loading}</span>
        </div>
      </Card>
    );
  }
  
  if (error || !pricingInfo) {
    return (
      <Card className="p-4 bg-gray-50">
        <p className="text-sm text-gray-600 text-center">{error || t.error}</p>
      </Card>
    );
  }
  
  const {
    base_price,
    shipping_cost,
    customs_duty,
    vat,
    total_taxes,
    final_price,
    free_shipping,
    delivery_time_min,
    delivery_time_max,
    vat_rate
  } = pricingInfo;
  
  return (
    <div className="space-y-4">
      {/* Main Pricing Card */}
      <Card className="p-4 border-2 border-primary/20">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-primary" />
              {t.title}
            </h3>
            <div className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
              <Info className="w-3 h-3" />
              {t.noHiddenFees}
            </div>
          </div>
          
          {/* Price Breakdown */}
          <div className="space-y-2">
            {/* Base Price */}
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">{t.basePrice}</span>
              <span className="font-medium">${base_price?.toFixed(2)}</span>
            </div>
            
            {/* Shipping */}
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 flex items-center gap-1">
                <Truck className="w-4 h-4" />
                {t.shipping}
              </span>
              {free_shipping ? (
                <span className="font-medium text-green-600">{t.freeShipping}</span>
              ) : (
                <span className="font-medium">${shipping_cost?.toFixed(2)}</span>
              )}
            </div>
            
            {/* Taxes */}
            {total_taxes > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 flex items-center gap-1">
                  <Package className="w-4 h-4" />
                  {t.taxes}
                </span>
                <span className="font-medium">${total_taxes?.toFixed(2)}</span>
              </div>
            )}
            
            {/* Divider */}
            <div className="border-t pt-2 mt-2"></div>
            
            {/* Total Price */}
            <div className="flex justify-between items-center">
              <span className="font-semibold text-lg">{t.totalPrice}</span>
              <span className="font-bold text-2xl text-primary">
                ${final_price?.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </Card>
      
      {/* Shipping Info Card */}
      <Card className="p-4 bg-blue-50 border-blue-200">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-blue-800 font-medium">
            <Truck className="w-5 h-5" />
            {t.delivery}
          </div>
          <div className="text-sm text-blue-700">
            {delivery_time_min && delivery_time_max ? (
              <span>{delivery_time_min}-{delivery_time_max} {t.days}</span>
            ) : (
              <span>15-30 {t.days}</span>
            )}
          </div>
          <div className="flex items-center gap-1 text-xs text-blue-600">
            <MapPin className="w-3 h-3" />
            {t.shipsTo}: {country}
          </div>
        </div>
      </Card>
      
      {/* Tax Breakdown (if applicable) */}
      {total_taxes > 0 && (
        <Card className="p-4 bg-gray-50">
          <div className="space-y-2">
            <h4 className="font-medium text-sm text-gray-700 flex items-center gap-2">
              <Info className="w-4 h-4" />
              {t.taxBreakdown}
            </h4>
            <div className="space-y-1 text-xs text-gray-600">
              {customs_duty > 0 && (
                <div className="flex justify-between">
                  <span>{t.customs}</span>
                  <span>${customs_duty?.toFixed(2)}</span>
                </div>
              )}
              {vat > 0 && (
                <div className="flex justify-between">
                  <span>{t.vat} ({vat_rate?.toFixed(0)}%)</span>
                  <span>${vat?.toFixed(2)}</span>
                </div>
              )}
              <div className="pt-1 border-t text-green-600 font-medium">
                ✓ {t.included}
              </div>
            </div>
          </div>
        </Card>
      )}
      
      {/* Guarantee Badge */}
      <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
        <div className="flex items-center gap-1 bg-green-50 text-green-700 px-3 py-1 rounded-full">
          <Info className="w-3 h-3" />
          {t.guaranteed}
        </div>
      </div>
    </div>
  );
};

export default ShippingPricingInfo;

