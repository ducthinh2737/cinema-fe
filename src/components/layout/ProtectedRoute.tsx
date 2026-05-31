import React, { useEffect } from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../contexts/ToastContext';
import { AuthLoadingScreen } from './AuthGuard';

interface ProtectedRouteProps {
  children?: React.ReactNode;
  allowedRoles?: string[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
}) => {
  const { isAuthenticated, user, loading } = useAuth();
  const location = useLocation();
  const { showToast } = useToast();

  useEffect(() => {
    if (!loading && isAuthenticated && allowedRoles && user) {
      const hasRole = user.roles?.some((role) => allowedRoles.includes(role));
      if (!hasRole) {
        showToast('You are not authorized to access this section.', 'error');
      }
    }
  }, [loading, isAuthenticated, allowedRoles, user, showToast]);

  if (loading) {
    return <AuthLoadingScreen />;
  }

  if (!isAuthenticated) {
    // Redirect to login but save the current location they were trying to go to
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && user) {
    const hasRole = user.roles?.some((role) => allowedRoles.includes(role));
    if (!hasRole) {
      // Redirect to home page if the user doesn't have the appropriate authorization
      return <Navigate to="/" replace />;
    }
  }

  return children ? <>{children}</> : <Outlet />;
};
