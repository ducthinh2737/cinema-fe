import React, { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useSignalR } from '../hooks/useSignalR';
import { useAppDispatch, useAppSelector } from '../store';
import { useToast } from '../contexts/ToastContext';
import { 
  fetchNotifications, 
  fetchMoreNotifications, 
  markNotificationRead, 
  markAllNotificationsRead, 
  addNotification 
} from '../store/notificationSlice';
import type { Notification } from '../types';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';

export const MainLayout: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { showToast } = useToast();

  const { items: notifications, unreadCount, hasMore, loadingMore, page } = useAppSelector(
    (state) => state.notifications
  );

  // Initialize SignalR Hub for Notifications
  const { isConnected, on, off } = useSignalR('/hub/notifications', isAuthenticated);

  // Load notifications initially on login status change
  useEffect(() => {
    if (isAuthenticated) {
      dispatch(fetchNotifications(8));
    }
  }, [isAuthenticated, dispatch]);

  // Handle incoming realtime notifications from SignalR
  useEffect(() => {
    if (!isAuthenticated || !isConnected) return;

    const handleReceiveNotification = (notif: Notification) => {
      showToast(notif.title, 'info');
      dispatch(addNotification(notif));
    };

    const handleBookingConfirmed = (showtimeId?: any, _seatIds?: any) => {
      showToast('Booking Confirmed! Seats have been secured.', 'success');
      dispatch(addNotification({
        notificationId: Math.floor(Math.random() * 1000000),
        userId: user?.userId || 0,
        title: 'Booking Confirmed',
        message: `Your booking for showtime #${showtimeId || ''} has been processed successfully.`,
        type: 'Booking',
        isRead: false,
        createdAt: new Date().toISOString()
      }));
    };

    const handlePaymentSuccess = (payload?: any) => {
      showToast('Payment Successful! Thank you for your booking.', 'success');
      dispatch(addNotification({
        notificationId: Math.floor(Math.random() * 1000000),
        userId: user?.userId || 0,
        title: 'Payment Success',
        message: payload?.message || 'Your payment has been verified and ticket generated.',
        type: 'Payment',
        isRead: false,
        createdAt: new Date().toISOString()
      }));
    };

    const handleNewPromotion = (promo?: any) => {
      showToast(`New Promotion: ${promo?.title || 'Special discount campaign'}!`, 'info');
      dispatch(addNotification({
        notificationId: Math.floor(Math.random() * 1000000),
        userId: user?.userId || 0,
        title: promo?.title || 'New Promotion Alert',
        message: promo?.description || 'A new discount campaign has been launched. Check it out now!',
        type: 'Promotion',
        isRead: false,
        createdAt: new Date().toISOString()
      }));
    };

    on('ReceiveNotification', handleReceiveNotification);
    on('BookingConfirmed', handleBookingConfirmed);
    on('PaymentSuccess', handlePaymentSuccess);
    on('NewPromotion', handleNewPromotion);

    return () => {
      off('ReceiveNotification', handleReceiveNotification);
      off('BookingConfirmed', handleBookingConfirmed);
      off('PaymentSuccess', handlePaymentSuccess);
      off('NewPromotion', handleNewPromotion);
    };
  }, [isConnected, isAuthenticated, dispatch, showToast, user, on, off]);

  const handleMarkAsRead = (id: number) => {
    dispatch(markNotificationRead(id));
  };

  const handleMarkAllAsRead = () => {
    dispatch(markAllNotificationsRead());
  };

  const handleLoadMore = () => {
    if (hasMore && !loadingMore) {
      dispatch(fetchMoreNotifications({ pageNumber: page + 1, pageSize: 8 }));
    }
  };

  return (
    <div className="min-h-screen bg-background text-gray-200 flex flex-col">
      <Navbar
        user={user}
        isAuthenticated={isAuthenticated}
        notifications={notifications}
        unreadCount={unreadCount}
        onMarkAsRead={handleMarkAsRead}
        onMarkAllAsRead={handleMarkAllAsRead}
        onLoadMore={handleLoadMore}
        hasMore={hasMore}
        loadingMore={loadingMore}
        onLogout={() => {
          logout();
          navigate('/');
        }}
      />

      {/* Main Content Body */}
      <main className="flex-grow">
        <Outlet />
      </main>

      {/* Cinematic Footer */}
      <Footer />
    </div>
  );
};
