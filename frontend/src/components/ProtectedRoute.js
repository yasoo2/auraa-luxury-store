import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

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
      <div className="flex items-center justify-center min-h-screen">
        <div
          className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"
          role="status"
          aria-label="Loading"
        />
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
