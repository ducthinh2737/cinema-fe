import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { MainLayout } from '../layouts/MainLayout.tsx';
import { AuthLayout } from '../layouts/AuthLayout.tsx';
import { AdminLayout } from '../layouts/AdminLayout.tsx';
import {
  Home,
  MovieDetails,
  SeatSelection,
  PaymentResult,
  Login,
  Register,
  ForgotPassword,
  Movies,
  AdminDashboard,
  ShowtimeSelection,
  Payment,
  UserProfile,
  TicketDetail,
  CinemaDetails,
  Promotions
} from '../pages';

import { ProtectedRoute, AdminRoute } from '../components';

interface GuardProps {
  children: React.ReactElement;
}

const PublicOnlyRoute: React.FC<GuardProps> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return !isAuthenticated ? children : <Navigate to="/" replace />;
};

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Auth Layout Routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
        <Route path="/register" element={<PublicOnlyRoute><Register /></PublicOnlyRoute>} />
        <Route path="/forgot-password" element={<PublicOnlyRoute><ForgotPassword /></PublicOnlyRoute>} />
      </Route>

      {/* Main Layout Routes */}
      <Route element={<MainLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/movies" element={<Movies />} />
        <Route path="/movie/:slug" element={<MovieDetails />} />
        <Route path="/movie/:slug/showtimes" element={<ShowtimeSelection />} />
        <Route path="/he-thong-rap" element={<CinemaDetails />} />
        <Route path="/promotions" element={<Promotions />} />
        <Route path="/payment-result" element={<PaymentResult />} />
        
        {/* Protected Customer Routes */}
        <Route path="/booking" element={<ProtectedRoute><SeatSelection /></ProtectedRoute>} />
        <Route path="/booking/:id" element={<ProtectedRoute><TicketDetail /></ProtectedRoute>} />
        <Route path="/payment" element={<ProtectedRoute><Payment /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><UserProfile /></ProtectedRoute>} />
        <Route path="/my-bookings" element={<ProtectedRoute><UserProfile /></ProtectedRoute>} />
      </Route>

      {/* Dedicated Administrative Portal (Full-screen) */}
      <Route element={<AdminRoute><AdminLayout /></AdminRoute>}>
        <Route path="/admin" element={<AdminDashboard />} />
      </Route>

      {/* Fallback Catch-All */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
