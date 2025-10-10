import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Helmet, HelmetProvider } from 'react-helmet-async';
import './App.css';

// Contexts
import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { WishlistProvider } from './context/WishlistContext';
import { CartProvider } from './context/CartContext';

// Components
import Navbar from './components/Navbar';
import HomePage from './components/HomePage';
import ProductsPage from './components/ProductsPage';
import ProductDetailPage from './components/ProductDetailPage';
import CartPage from './components/CartPage';
import WishlistPage from './components/WishlistPage';
import SimpleAuthPage from './components/SimpleAuthPage';
import ProfilePage from './components/ProfilePage';
import CheckoutPage from './components/CheckoutPage';
import Footer from './components/Footer';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';

// UI Components
import { Toaster } from './components/ui/sonner';

// Feature Flags
import { FEATURE_MULTI_LANG_EXTENDED, FEATURE_PWA_SUPPORT, FEATURE_LIVE_CHAT } from './config/flags';

function App() {
  return (
    <HelmetProvider>
      <AuthProvider>
        <LanguageProvider>
          <WishlistProvider>
            <CartProvider>
            <Router>
              <div className="App" dir="auto">
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
                
                <main className="min-h-screen bg-gradient-to-br from-neutral-50 to-stone-100">
                  <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/products" element={<ProductsPage />} />
                    <Route path="/product/:id" element={<ProductDetailPage />} />
                    <Route path="/cart" element={<CartPage />} />
                    <Route path="/wishlist" element={<WishlistPage />} />
                    <Route path="/auth" element={<AuthPage />} />
                    <Route path="/profile" element={<ProfilePage />} />
                    <Route path="/checkout" element={<CheckoutPage />} />
                    
                    {/* Admin Routes */}
                    <Route path="/admin/*" element={<AdminDashboard />} />
                    
                    {/* Redirect unknown routes to home */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </main>

                <Footer />
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
