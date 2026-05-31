import React from 'react';
import { ProtectedRoute } from '../layout/ProtectedRoute';

interface AdminRouteProps {
  children?: React.ReactNode;
}

export const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  return <ProtectedRoute allowedRoles={['Admin']}>{children}</ProtectedRoute>;
};
