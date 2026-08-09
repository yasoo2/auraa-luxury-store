import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// The session check normally answers in well under a second; when the backend
// host has put the server to sleep it answers in thirty or sixty. Same
// spinner, wildly different meaning — so after a quiet stretch the wait says
// what it is waiting for.
const SlowHint = () => {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), 7000);
    return () => clearTimeout(timer);
  }, []);
  if (!slow) return null;
  return (
    <p className="mt-4 max-w-xs text-center text-sm text-gray-600" dir="rtl">
      الخادم يستيقظ بعد فترة خمول — لحظات ويكتمل التحقق من جلستك.
    </p>
  );
};

/**
 * Route guard for authenticated and admin-only areas.
 *
 * The admin routes previously rendered unconditionally and relied on each page
 * redirecting itself after mount, which briefly exposed the admin shell to
 * anyone who typed the URL. This is a UX guard only — the backend dependencies
 * are what actually enforce access.
 */
const ProtectedRoute = ({ children, requireAdmin = false, requireSuperAdmin = false }) => {
  const { isAuthenticated, isAdmin, isSuperAdmin, loading } = useAuth();
  const location = useLocation();

  // Wait for the session check; redirecting first would bounce signed-in
  // users on every hard refresh.
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div
          className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"
          role="status"
          aria-label="Loading"
        />
        <SlowHint />
      </div>
    );
  }

  if (!isAuthenticated) {
    // Remember where they were headed so login can return them there.
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (requireSuperAdmin && !isSuperAdmin) {
    return <Navigate to="/" replace />;
  }

  if (requireAdmin && !(isAdmin || isSuperAdmin)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;
