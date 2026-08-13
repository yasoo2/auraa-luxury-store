// Auraa Luxury - Updated Version 2.0
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import { Helmet, HelmetProvider } from 'react-helmet-async';
import './App.css';

// Contexts
import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { WishlistProvider } from './context/WishlistContext';
import { CartProvider } from './context/CartContext';

// Components
import ScrollToTop from './components/ScrollToTop';
import Navbar from './components/Navbar';
import CookieConsent from './components/CookieConsent';
import InstallBanner from './components/InstallBanner';
import HomePage from './components/HomePage';
import ProductsPage from './components/ProductsPage';
import ProductDetailPage from './components/ProductDetailPage';
import CartPage from './components/CartPage';
import WishlistPage from './components/WishlistPage';
import AuthPage from './components/AuthPage';
import OAuthCallback from './pages/OAuthCallback';
import ProfilePage from './components/ProfilePage';
import CheckoutPage from './components/CheckoutPage';
import OrderPaymentPage from './components/OrderPaymentPage';
import Footer from './components/Footer';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminManagement from './pages/admin/AdminManagement';
import AdminSetup from './pages/AdminSetup';

// Legal and Info Pages
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import CookiesPolicy from './pages/CookiesPolicy';
import ReturnPolicy from './pages/ReturnPolicy';
import DistanceSalesAgreement from './pages/DistanceSalesAgreement';
import ContactUs from './pages/ContactUs';
import AboutUs from './pages/AboutUs';
import OrderTracking from './pages/OrderTracking';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import { ShippingInfo, SizeGuide, CareInstructions } from './pages/HelpPages';

// UI Components
import { Toaster } from './components/ui/sonner';

// Feature Flags

function App() {
  return (
    <HelmetProvider>
      <AuthProvider>
        <LanguageProvider>
          <WishlistProvider>
            <CartProvider>
            <Router>
              <ScrollToTop />
              {/* Direction is set on <html> by LanguageContext. dir="auto" here overrode
              that inherited value and resolved from the first strong character in the
              whole subtree, so Arabic text rendered inside an LTR paragraph and
              punctuation landed on the wrong side ("!أهلاً بعودتك"). */}
            <div className="App">
                <Helmet>
                  <title>Auraa Luxury - Premium Accessories</title>
                  <meta name="description" content="Premium luxury accessories for the discerning customer" />
                  <meta name="viewport" content="width=device-width, initial-scale=1" />
                  <link rel="preconnect" href="https://fonts.googleapis.com" />
                  <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
                  <link 
                    href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:wght@400;500;600;700&display=swap" 
                    rel="stylesheet" 
                  />
                </Helmet>

                <Navbar />
                
                <main className="app-main bg-gradient-to-br from-neutral-50 to-stone-100">
                  <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/products" element={<ProductsPage />} />
                    <Route path="/product/:id" element={<ProductDetailPage />} />
                    <Route path="/cart" element={<CartPage />} />
                    <Route path="/wishlist" element={<WishlistPage />} />
                    <Route path="/auth" element={<AuthPage />} />
                    <Route path="/auth/oauth-callback" element={<OAuthCallback />} />
                    <Route path="/forgot-password" element={<ForgotPassword />} />
                    <Route path="/reset-password" element={<ResetPassword />} />
                    <Route path="/admin-setup" element={<AdminSetup />} />
                    <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
                    <Route path="/checkout" element={<ProtectedRoute><CheckoutPage /></ProtectedRoute>} />
                    <Route path="/order/:orderId/pay" element={<ProtectedRoute><OrderPaymentPage /></ProtectedRoute>} />
                    
                    {/* Legal and Info Pages */}
                    <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                    <Route path="/terms-of-service" element={<TermsOfService />} />
                    <Route path="/cookies-policy" element={<CookiesPolicy />} />
                    <Route path="/return-policy" element={<ReturnPolicy />} />
                    <Route path="/distance-sales-agreement" element={<DistanceSalesAgreement />} />
                    <Route path="/contact" element={<ContactUs />} />
                    <Route path="/about" element={<AboutUs />} />
                    <Route path="/shipping-info" element={<ShippingInfo />} />
                    <Route path="/size-guide" element={<SizeGuide />} />
                    <Route path="/care-instructions" element={<CareInstructions />} />

                    {/* Order Tracking */}
                    <Route path="/order-tracking" element={<OrderTracking />} />
                    <Route path="/track-order" element={<Navigate to="/order-tracking" replace />} />
                    
                    {/* Admin Routes */}
                    <Route path="/admin/*" element={<ProtectedRoute requireAdmin><AdminDashboard /></ProtectedRoute>} />
                    <Route path="/admin-management" element={<ProtectedRoute requireSuperAdmin><AdminManagement /></ProtectedRoute>} />
                    
                    {/* Redirect unknown routes to home */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </main>

                <Footer />
                <CookieConsent />
                <InstallBanner />
                <Toaster />
              </div>
            </Router>
            </CartProvider>
          </WishlistProvider>
        </LanguageProvider>
      </AuthProvider>
    </HelmetProvider>
  );
}

export default App;
