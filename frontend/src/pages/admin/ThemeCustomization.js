import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import axios from 'axios';
import {
  Palette,
  Save,
  Upload,
  RotateCcw,
  Eye,
  Sparkles,
  Type,
  Layout
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card } from '../../components/ui/card';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ThemeCustomization = () => {
  const { isRTL } = useLanguage();
  const [theme, setTheme] = useState({
    // Brand Colors
    primary_color: '#D97706',      // Amber
    secondary_color: '#FEF3C7',    // Light Amber
    accent_color: '#F59E0B',       // Darker Amber
    background_color: '#FFFBEB',   // Very Light Amber
    text_primary: '#1F2937',       // Dark Gray
    text_secondary: '#6B7280',     // Medium Gray
    
    // Typography
    font_primary: 'Inter, sans-serif',
    font_heading: 'Playfair Display, serif',
    font_size_base: '16px',
    
    // Logo & Branding
    logo_url: '',
    logo_height: '60px',
    favicon_url: '',
    
    // Layout
    header_bg: '#FFFFFF',
    footer_bg: '#1F2937',
    border_radius: '12px',
    
    // Buttons
    button_style: 'rounded',       // rounded, square, pill
    button_hover_effect: 'scale',  // scale, shadow, color
    
    // Effects
    enable_animations: true,
    enable_glassmorphism: true,
    enable_gradients: true
  });
  
  const [loading, setLoading] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  useEffect(() => {
    fetchTheme();
  }, []);

  const fetchTheme = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/admin/theme`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data) {
        setTheme({ ...theme, ...response.data });
      }
    } catch (error) {
      console.error('Error fetching theme:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API}/admin/theme`, theme, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(isRTL ? 'تم حفظ التصميم' : 'Theme saved successfully');
      
      // Apply theme changes to CSS variables
      applyThemeToDOM();
    } catch (error) {
      console.error('Error saving theme:', error);
      toast.error(isRTL ? 'فشل في حفظ التصميم' : 'Failed to save theme');
    } finally {
      setLoading(false);
    }
  };

  const applyThemeToDOM = () => {
    const root = document.documentElement;
    root.style.setProperty('--color-primary', theme.primary_color);
    root.style.setProperty('--color-secondary', theme.secondary_color);
    root.style.setProperty('--color-accent', theme.accent_color);
    root.style.setProperty('--color-background', theme.background_color);
    root.style.setProperty('--font-primary', theme.font_primary);
    root.style.setProperty('--font-heading', theme.font_heading);
    root.style.setProperty('--border-radius', theme.border_radius);
  };

  const handleReset = () => {
    if (window.confirm(isRTL ? 'استعادة الإعدادات الافتراضية؟' : 'Reset to default theme?')) {
      setTheme({
        primary_color: '#D97706',
        secondary_color: '#FEF3C7',
        accent_color: '#F59E0B',
        background_color: '#FFFBEB',
        text_primary: '#1F2937',
        text_secondary: '#6B7280',
        font_primary: 'Inter, sans-serif',
        font_heading: 'Playfair Display, serif',
        font_size_base: '16px',
        logo_url: '',
        logo_height: '60px',
        favicon_url: '',
        header_bg: '#FFFFFF',
        footer_bg: '#1F2937',
        border_radius: '12px',
        button_style: 'rounded',
        button_hover_effect: 'scale',
        enable_animations: true,
        enable_glassmorphism: true,
        enable_gradients: true
      });
      toast.success(isRTL ? 'تم استعادة الإعدادات' : 'Theme reset');
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API}/admin/upload-image`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      
      setTheme({ ...theme, logo_url: response.data.url });
      toast.success(isRTL ? 'تم رفع الشعار' : 'Logo uploaded');
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast.error(isRTL ? 'فشل في رفع الشعار' : 'Failed to upload logo');
    }
  };

  const ColorPicker = ({ label, value, onChange }) => (
    <div>
      <label className="block text-sm font-medium mb-2">{label}</label>
      <div className="flex gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-20 rounded-lg border border-gray-300 cursor-pointer"
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#000000"
          className="flex-1"
        />
      </div>
    </div>
  );

  const PreviewCard = () => (
    <Card className="luxury-card p-6" style={{
      backgroundColor: theme.background_color,
      borderRadius: theme.border_radius,
      color: theme.text_primary
    }}>
      <h3 
        className="text-2xl font-bold mb-3"
        style={{ 
          fontFamily: theme.font_heading,
          color: theme.primary_color 
        }}
      >
        {isRTL ? 'معاينة التصميم' : 'Theme Preview'}
      </h3>
      <p style={{ 
        fontFamily: theme.font_primary,
        color: theme.text_secondary,
        fontSize: theme.font_size_base 
      }}>
        {isRTL 
          ? 'هذا مثال على كيفية ظهور التصميم الجديد'
          : 'This is how your new theme will look'}
      </p>
      <div className="flex gap-3 mt-4">
        <button
          style={{
            backgroundColor: theme.primary_color,
            color: '#FFFFFF',
            padding: '0.5rem 1rem',
            borderRadius: theme.button_style === 'rounded' ? theme.border_radius : 
                         theme.button_style === 'pill' ? '9999px' : '4px',
            fontFamily: theme.font_primary,
            transition: 'transform 0.2s',
            transform: previewMode ? 'scale(1.05)' : 'scale(1)'
          }}
          onMouseEnter={() => setPreviewMode(true)}
          onMouseLeave={() => setPreviewMode(false)}
        >
          {isRTL ? 'زر أساسي' : 'Primary Button'}
        </button>
        <button
          style={{
            backgroundColor: theme.secondary_color,
            color: theme.primary_color,
            padding: '0.5rem 1rem',
            borderRadius: theme.button_style === 'rounded' ? theme.border_radius : 
                         theme.button_style === 'pill' ? '9999px' : '4px',
            fontFamily: theme.font_primary
          }}
        >
          {isRTL ? 'زر ثانوي' : 'Secondary Button'}
        </button>
      </div>
    </Card>
  );

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
            <Palette className="h-8 w-8 text-amber-600" />
            {isRTL ? 'تخصيص التصميم' : 'Theme Customization'}
          </h1>
          <p className="text-gray-600 mt-2">
            {isRTL 
              ? 'تخصيص مظهر وألوان المتجر' 
              : 'Customize your store appearance and colors'}
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-2" />
            {isRTL ? 'استعادة' : 'Reset'}
          </Button>
          <Button className="btn-luxury" onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            {isRTL ? 'حفظ التصميم' : 'Save Theme'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Settings Panel */}
        <div className="lg:col-span-2 space-y-6">
          {/* Brand Colors */}
          <Card className="luxury-card p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-600" />
              {isRTL ? 'ألوان العلامة التجارية' : 'Brand Colors'}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ColorPicker
                label={isRTL ? 'اللون الأساسي' : 'Primary Color'}
                value={theme.primary_color}
                onChange={(val) => setTheme({ ...theme, primary_color: val })}
              />
              <ColorPicker
                label={isRTL ? 'اللون الثانوي' : 'Secondary Color'}
                value={theme.secondary_color}
                onChange={(val) => setTheme({ ...theme, secondary_color: val })}
              />
              <ColorPicker
                label={isRTL ? 'لون التمييز' : 'Accent Color'}
                value={theme.accent_color}
                onChange={(val) => setTheme({ ...theme, accent_color: val })}
              />
              <ColorPicker
                label={isRTL ? 'لون الخلفية' : 'Background Color'}
                value={theme.background_color}
                onChange={(val) => setTheme({ ...theme, background_color: val })}
              />
            </div>
          </Card>

          {/* Typography */}
          <Card className="luxury-card p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Type className="h-5 w-5 text-amber-600" />
              {isRTL ? 'الخطوط والنصوص' : 'Typography'}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  {isRTL ? 'خط النصوص' : 'Primary Font'}
                </label>
                <Input
                  value={theme.font_primary}
                  onChange={(e) => setTheme({ ...theme, font_primary: e.target.value })}
                  placeholder="Inter, sans-serif"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  {isRTL ? 'خط العناوين' : 'Heading Font'}
                </label>
                <Input
                  value={theme.font_heading}
                  onChange={(e) => setTheme({ ...theme, font_heading: e.target.value })}
                  placeholder="Playfair Display, serif"
                />
              </div>
            </div>
          </Card>

          {/* Logo & Branding */}
          <Card className="luxury-card p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Layout className="h-5 w-5 text-amber-600" />
              {isRTL ? 'الشعار والعلامة' : 'Logo & Branding'}
            </h2>
            <div className="space-y-4">
              {theme.logo_url && (
                <div className="mb-4">
                  <img 
                    src={theme.logo_url} 
                    alt="Logo" 
                    className="h-16 object-contain"
                  />
                </div>
              )}
              <div>
                <label htmlFor="logo-upload">
                  <Button variant="outline" as="span">
                    <Upload className="h-4 w-4 mr-2" />
                    {isRTL ? 'رفع شعار' : 'Upload Logo'}
                  </Button>
                  <input
                    id="logo-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  {isRTL ? 'ارتفاع الشعار' : 'Logo Height'}
                </label>
                <Input
                  value={theme.logo_height}
                  onChange={(e) => setTheme({ ...theme, logo_height: e.target.value })}
                  placeholder="60px"
                />
              </div>
            </div>
          </Card>

          {/* Layout & Effects */}
          <Card className="luxury-card p-6">
            <h2 className="text-xl font-bold mb-4">
              {isRTL ? 'التخطيط والتأثيرات' : 'Layout & Effects'}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  {isRTL ? 'انحناء الحواف' : 'Border Radius'}
                </label>
                <Input
                  value={theme.border_radius}
                  onChange={(e) => setTheme({ ...theme, border_radius: e.target.value })}
                  placeholder="12px"
                />
              </div>
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={theme.enable_animations}
                    onChange={(e) => setTheme({ ...theme, enable_animations: e.target.checked })}
                    className="h-4 w-4"
                  />
                  <span className="text-sm">
                    {isRTL ? 'تفعيل الحركات' : 'Enable Animations'}
                  </span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={theme.enable_glassmorphism}
                    onChange={(e) => setTheme({ ...theme, enable_glassmorphism: e.target.checked })}
                    className="h-4 w-4"
                  />
                  <span className="text-sm">
                    {isRTL ? 'تفعيل التأثير الزجاجي' : 'Enable Glassmorphism'}
                  </span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={theme.enable_gradients}
                    onChange={(e) => setTheme({ ...theme, enable_gradients: e.target.checked })}
                    className="h-4 w-4"
                  />
                  <span className="text-sm">
                    {isRTL ? 'تفعيل التدرجات' : 'Enable Gradients'}
                  </span>
                </label>
              </div>
            </div>
          </Card>
        </div>

        {/* Preview Panel */}
        <div className="lg:col-span-1">
          <div className="sticky top-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Eye className="h-5 w-5 text-amber-600" />
              {isRTL ? 'معاينة مباشرة' : 'Live Preview'}
            </h2>
            <PreviewCard />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThemeCustomization;
