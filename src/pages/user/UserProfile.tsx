import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User as UserIcon,
  Ticket,
  Heart,
  Bell,
  Lock,
  Camera,
  Calendar,
  Clock,
  Save,
  Trash2,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  Phone,
  Mail,
  Gift,
  Eye,
  EyeOff
} from 'lucide-react';

import { useToast } from '../../contexts/ToastContext';
import { apiClient, getImageUrl } from '../../api/client';
import { updateUser } from '../../store/authSlice';
import { parseApiDate } from '../../utils/dateHelpers';
import type { User, Booking, Notification } from '../../types';
import { GlassCard } from '../../components/ui/GlassCard';

interface RootState {
  auth: {
    user: User | null;
    isAuthenticated: boolean;
  };
}

export const UserProfile: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const authState = useSelector((state: RootState) => state.auth);
  const { user, isAuthenticated } = authState;

  // Tabs state
  const activeTab = searchParams.get('tab') || 'profile';
  const setActiveTab = (tab: string) => {
    setSearchParams({ tab });
  };

  // Edit Profile Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFullName, setEditFullName] = useState('');
  const [editPhoneNumber, setEditPhoneNumber] = useState('');
  const [editGender, setEditGender] = useState('Male');
  const [editDob, setEditDob] = useState('');

  // Password fields
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPass, setShowOldPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [isChangingPass, setIsChangingPass] = useState(false);

  // Avatar uploading
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Data collections
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bookingsPage, setBookingsPage] = useState(1);
  const bookingsPerPage = 3;
  const [loadingBookings, setLoadingBookings] = useState(false);

  // Bookings Filter State
  const [statusFilter, setStatusFilter] = useState<'All' | 'Confirmed' | 'Pending' | 'Cancelled'>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const [favorites, setFavorites] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  // Loyalty Program States
  const [loyaltyDashboard, setLoyaltyDashboard] = useState<any>(null);
  const [loyaltyTransactions, setLoyaltyTransactions] = useState<any[]>([]);
  const [loyaltyPage, setLoyaltyPage] = useState(1);
  const [loyaltyTotalPages, setLoyaltyTotalPages] = useState(1);
  const [loadingLoyalty, setLoadingLoyalty] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated || !user) {
      showToast('Vui lòng đăng nhập để xem hồ sơ của bạn.', 'warning');
      navigate('/login');
    }
  }, [isAuthenticated, user, navigate]);

  // Load Bookings
  useEffect(() => {
    if (user && activeTab === 'bookings') {
      setLoadingBookings(true);
      apiClient.get<any>('/bookings/my-bookings')
        .then((res) => {
          const responseData = res.data?.data ?? res.data;
          const bookingItems = Array.isArray(responseData) ? responseData : responseData?.items ?? [];
          const sorted = bookingItems.sort((a: any, b: any) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          setBookings(sorted);
        })
        .catch((err) => console.error("Error loading bookings", err))
        .finally(() => setLoadingBookings(false));
    }
  }, [user, activeTab]);

  // Load Favorites from LocalStorage
  useEffect(() => {
    const loadFavs = () => {
      try {
        const storedFavs = localStorage.getItem('favoriteMovies');
        if (storedFavs) {
          setFavorites(JSON.parse(storedFavs));
        } else {
          setFavorites([]);
        }
      } catch (err) {
        console.error("Error loading favorites", err);
      }
    };

    if (activeTab === 'favorites') {
      loadFavs();
    }

    window.addEventListener('local-storage-favorites-updated', loadFavs);
    return () => window.removeEventListener('local-storage-favorites-updated', loadFavs);
  }, [activeTab]);

  const fetchNotifications = () => {
    if (user && activeTab === 'notifications') {
      setLoadingNotifications(true);
      apiClient.get<any>('/notifications')
        .then((res) => {
          const responseData = res.data?.data ?? res.data;
          const items = Array.isArray(responseData) 
            ? responseData 
            : responseData?.items ?? [];
          setNotifications(items);
        })
        .catch((err) => {
          console.error("Error loading notifications", err);
          setNotifications([]);
        })
        .finally(() => setLoadingNotifications(false));
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [user, activeTab]);

  // Load Loyalty Data Effect
  useEffect(() => {
    if (user && activeTab === 'loyalty') {
      setLoadingLoyalty(true);
      apiClient.get('/loyalty/dashboard')
        .then(res => {
          setLoyaltyDashboard(res.data.data || res.data);
        })
        .catch(err => console.error("Error loading loyalty dashboard", err));

      apiClient.get(`/loyalty/transactions?page=${loyaltyPage}&pageSize=5`)
        .then(res => {
          const resData = res.data.data || res.data;
          setLoyaltyTransactions(resData.items || []);
          setLoyaltyTotalPages(resData.totalPages || 1);
        })
        .catch(err => console.error("Error loading loyalty transactions", err))
        .finally(() => setLoadingLoyalty(false));
    }
  }, [user, activeTab, loyaltyPage]);

  // Trigger file selection for avatar upload
  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      showToast('Kích thước tệp phải dưới 5MB.', 'warning');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setIsUploadingAvatar(true);
    try {
      const response = await apiClient.post<{ url: string }>('/users/profile/avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (user) {
        const updated = { ...user, avatarUrl: response.data.url };
        dispatch(updateUser(updated));
        showToast('Cập nhật ảnh đại diện thành công!', 'success');
      }
    } catch (err: any) {
      const msg = err.response?.data?.Message || 'Tải ảnh đại diện thất bại.';
      showToast(msg, 'error');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  // Open profile edit fields
  const handleOpenEdit = () => {
    if (user) {
      setEditFullName(user.fullName || '');
      setEditPhoneNumber(user.phoneNumber || '');
      setEditGender(user.gender || 'Male');
      setEditDob(user.dateOfBirth ? user.dateOfBirth.split('T')[0] : '');
      setIsEditModalOpen(true);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editFullName.trim()) {
      showToast('Họ và tên không được để trống.', 'warning');
      return;
    }

    try {
      const res = await apiClient.put<User>('/users/profile', {
        fullName: editFullName,
        phoneNumber: editPhoneNumber,
        gender: editGender,
        dateOfBirth: editDob ? new Date(editDob).toISOString() : null,
      });

      dispatch(updateUser(res.data));
      showToast('Hồ sơ đã được cập nhật thành công!', 'success');
      setIsEditModalOpen(false);
    } catch (err: any) {
      const msg = err.response?.data?.Message || 'Cập nhật thông tin hồ sơ thất bại.';
      showToast(msg, 'error');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword || !newPassword || !confirmPassword) {
      showToast('Vui lòng nhập đầy đủ các trường mật khẩu.', 'warning');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('Mật khẩu mới không trùng khớp.', 'error');
      return;
    }
    if (newPassword.length < 6) {
      showToast('Mật khẩu phải có độ dài ít nhất 6 ký tự.', 'warning');
      return;
    }

    setIsChangingPass(true);
    try {
      await apiClient.post('/auth/change-password', {
        oldPassword,
        newPassword,
      });

      showToast('Đổi mật khẩu thành công!', 'success');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      const msg = err.response?.data?.Message || 'Mật khẩu hiện tại không chính xác.';
      showToast(msg, 'error');
    } finally {
      setIsChangingPass(false);
    }
  };

  const handleMarkNotificationRead = async (id: number) => {
    try {
      await apiClient.put(`/notifications/read/${id}`);
      setNotifications(prev =>
        prev.map(n => n.notificationId === id ? { ...n, isRead: true } : n)
      );
      showToast('Đã đánh dấu thông báo là đã đọc.', 'success');
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveFavorite = (movieId: number) => {
    try {
      const updated = favorites.filter(m => m.id !== movieId);
      setFavorites(updated);
      localStorage.setItem('favoriteMovies', JSON.stringify(updated));
      showToast('Đã xóa khỏi danh sách yêu thích.', 'success');
      window.dispatchEvent(new Event('local-storage-favorites-updated'));
    } catch (err) {
      console.error(err);
    }
  };

  // Bookings filter logic
  const filteredBookings = bookings.filter(booking => {
    const matchesStatus = statusFilter === 'All' || booking.bookingStatus === statusFilter;
    const matchesSearch =
      (booking.movieTitle || booking.showtime?.movie?.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.bookingCode.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // Reset page on filter changes
  useEffect(() => {
    setBookingsPage(1);
  }, [statusFilter, searchQuery]);

  // Pagination index computations
  const totalBookingsPages = Math.ceil(filteredBookings.length / bookingsPerPage) || 1;
  const paginatedBookings = filteredBookings.slice(
    (bookingsPage - 1) * bookingsPerPage,
    bookingsPage * bookingsPerPage
  );

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'Confirmed':
        return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'CheckedIn':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.15)]';
      case 'Cancelled':
        return 'bg-brand/10 text-brand border-brand/20';
      default:
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen pb-24 text-left select-none">

      {/* Upper Glassmorphic Header */}
      <div className="relative border-b border-white/5 py-12 bg-gradient-to-b from-[#07070a] to-[#121217] overflow-hidden">
        {/* Dynamic Background Blur Glow */}
        <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[350px] h-[350px] bg-brand/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute top-1/3 right-1/4 -translate-y-1/2 w-[300px] h-[300px] bg-brand-gold/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-6xl mx-auto px-4 md:px-8 relative z-10 flex flex-col md:flex-row items-center md:items-end justify-between gap-6">
          <div className="flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
            {/* Interactive Avatar Image Slot */}
            <div className="relative group cursor-pointer" onClick={handleAvatarClick}>
              {user.avatarUrl ? (
                <img
                  src={getImageUrl(user.avatarUrl)}
                  alt={user.fullName}
                  className="h-28 w-28 rounded-full border-2 border-brand-gold object-cover shadow-[0_0_20px_rgba(212,175,55,0.2)] transition-transform duration-300 group-hover:scale-105"
                />
              ) : (
                <div className="h-28 w-28 rounded-full bg-gradient-to-tr from-brand via-purple-900 to-brand-gold border-2 border-white/10 flex items-center justify-center font-black text-2xl text-white transition-transform duration-300 group-hover:scale-105 shadow-xl">
                  {user.fullName.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase()}
                </div>
              )}

              {/* Upload Overlay */}
              <div className="absolute inset-0 bg-black/60 rounded-full flex flex-col items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <Camera size={20} className="text-white" />
                <span className="text-[8px] text-gray-300 font-black uppercase tracking-wider">Thay ảnh</span>
              </div>

              {isUploadingAvatar && (
                <div className="absolute inset-0 bg-black/80 rounded-full flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
                </div>
              )}

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleAvatarChange}
                accept="image/*"
                className="hidden"
              />
            </div>

            <div className="flex flex-col justify-end">
              <span className="text-[9px] bg-brand-gold/10 border border-brand-gold/20 text-brand-gold font-black uppercase px-2.5 py-0.5 rounded-full tracking-widest w-max mx-auto md:mx-0 flex items-center gap-1.5 mb-1.5">
                <Gift size={10} /> {(user.tierName || 'Bronze').toUpperCase()} • {user.membershipPoints} điểm
              </span>
              <h2 className="text-2xl font-black text-white uppercase tracking-wider">{user.fullName}</h2>
              <p className="text-xs text-gray-400 font-medium mt-1">{user.email}</p>
            </div>
          </div>

          <button
            onClick={handleOpenEdit}
            className="px-5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-white/10 text-white transition-all cursor-pointer flex items-center gap-1.5 select-none"
          >
            <UserCheck size={14} /> Chỉnh sửa hồ sơ
          </button>
        </div>
      </div>

      {/* Tabs Navigation Grid */}
      <div className="max-w-6xl mx-auto px-4 md:px-8 mt-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

        {/* Navigation Sidebar Panel */}
        <div className="lg:col-span-3 flex flex-col gap-2 bg-white/[0.01] border border-white/5 p-3 rounded-2xl backdrop-blur-xl">
          {[
            { id: 'profile', label: 'Thông Tin Cá Nhân', icon: <UserIcon size={14} /> },
            { id: 'bookings', label: 'Vé Của Tôi', icon: <Ticket size={14} /> },
            { id: 'loyalty', label: 'Điểm Thành Viên', icon: <Gift size={14} /> },
            { id: 'favorites', label: 'Phim Yêu Thích', icon: <Heart size={14} /> },
            { id: 'notifications', label: 'Thông Báo', icon: <Bell size={14} /> },
            { id: 'security', label: 'Đổi Mật Khẩu', icon: <Lock size={14} /> },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full py-3 px-4 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-3 transition-all text-left cursor-pointer ${activeTab === tab.id
                ? 'bg-brand text-white shadow-lg shadow-brand/10 border border-brand-gold/15'
                : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
                }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Contents Frame */}
        <div className="lg:col-span-9">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              transition={{ duration: 0.2 }}
            >

              {/* Tab 1: Profile Details */}
              {activeTab === 'profile' && (
                <div className="flex flex-col gap-6">
                  <div className="flex flex-col gap-1 border-b border-white/5 pb-4">
                    <h3 className="text-base font-black text-white uppercase tracking-wider">Thông tin tài khoản</h3>
                    <p className="text-xs text-gray-500">Tổng quan các thiết lập hồ sơ và trạng thái xác thực.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <GlassCard className="p-5 border-white/5 flex items-center gap-4">
                      <div className="h-10 w-10 bg-white/5 border border-white/10 text-brand rounded-xl flex items-center justify-center shrink-0">
                        <UserIcon size={18} />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[10px] text-gray-500 font-extrabold uppercase">Họ và tên</span>
                        <span className="text-sm font-bold text-white truncate mt-0.5">{user.fullName}</span>
                      </div>
                    </GlassCard>

                    <GlassCard className="p-5 border-white/5 flex items-center gap-4">
                      <div className="h-10 w-10 bg-white/5 border border-white/10 text-brand rounded-xl flex items-center justify-center shrink-0">
                        <Mail size={18} />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[10px] text-gray-500 font-extrabold uppercase">Địa chỉ Email</span>
                        <span className="text-sm font-bold text-white truncate mt-0.5">{user.email}</span>
                      </div>
                    </GlassCard>

                    <GlassCard className="p-5 border-white/5 flex items-center gap-4">
                      <div className="h-10 w-10 bg-white/5 border border-white/10 text-brand rounded-xl flex items-center justify-center shrink-0">
                        <Phone size={18} />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[10px] text-gray-500 font-extrabold uppercase">Số điện thoại</span>
                        <span className="text-sm font-bold text-white truncate mt-0.5">{user.phoneNumber || 'Chưa cung cấp'}</span>
                      </div>
                    </GlassCard>

                    <GlassCard className="p-5 border-white/5 flex items-center gap-4">
                      <div className="h-10 w-10 bg-white/5 border border-white/10 text-brand rounded-xl flex items-center justify-center shrink-0">
                        <Calendar size={18} />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[10px] text-gray-500 font-extrabold uppercase">Ngày sinh & Giới tính</span>
                        <span className="text-sm font-bold text-white truncate mt-0.5">
                          {(user.gender === 'Male' ? 'Nam' : user.gender === 'Female' ? 'Nữ' : user.gender || 'Chưa thiết lập')} • {user.dateOfBirth ? new Date(user.dateOfBirth).toLocaleDateString('vi-VN') : 'Chưa thiết lập'}
                        </span>
                      </div>
                    </GlassCard>
                  </div>
                </div>
              )}

              {/* Tab 2: Tickets Booking History */}
              {activeTab === 'bookings' && (
                <div className="flex flex-col gap-6">
                  <div className="flex flex-col gap-1 border-b border-white/5 pb-4">
                    <h3 className="text-base font-black text-white uppercase tracking-wider">Lịch sử đặt vé</h3>
                    <p className="text-xs text-gray-500">Theo dõi và kiểm tra các giao dịch đặt vé và ghế ngồi của bạn.</p>
                  </div>

                  {/* Filters Bar */}
                  <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white/[0.02] border border-white/5 p-4 rounded-2xl backdrop-blur-xl">
                    <div className="relative w-full md:w-72">
                      <input
                        type="text"
                        placeholder="Tìm kiếm phim, mã vé..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-brand transition-all"
                      />
                    </div>
                    <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                      {[
                        { id: 'All', label: 'Tất cả' },
                        { id: 'Confirmed', label: 'Đã xác nhận' },
                        { id: 'CheckedIn', label: 'Đã Check-in' },
                        { id: 'Pending', label: 'Chờ thanh toán' },
                        { id: 'Cancelled', label: 'Đã hủy' }
                      ].map(status => (
                        <button
                          key={status.id}
                          onClick={() => setStatusFilter(status.id as any)}
                          className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-all border cursor-pointer ${statusFilter === status.id
                            ? 'bg-brand text-white border-brand-gold/15'
                            : 'bg-white/5 text-gray-400 border-white/5 hover:text-white'
                            }`}
                        >
                          {status.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {loadingBookings ? (
                    <div className="flex flex-col gap-4">
                      {[1, 2].map(n => (
                        <div key={n} className="h-40 bg-white/5 border border-white/5 rounded-2xl animate-pulse" />
                      ))}
                    </div>
                  ) : bookings.length === 0 ? (
                    <div className="py-16 bg-white/[0.01] border border-white/5 rounded-3xl text-center text-gray-500 flex flex-col items-center justify-center gap-3">
                      <Ticket size={40} className="text-gray-700" />
                      <span className="text-xs font-black uppercase tracking-widest text-gray-600">Bạn chưa mua vé nào</span>
                      <Link to="/" className="text-xs font-black text-brand uppercase tracking-wider hover:underline mt-2">Đặt vé xem phim ngay</Link>
                    </div>
                  ) : filteredBookings.length === 0 ? (
                    <div className="py-16 bg-white/[0.01] border border-white/5 rounded-3xl text-center text-gray-500 flex flex-col items-center justify-center gap-3">
                      <Ticket size={40} className="text-gray-700" />
                      <span className="text-xs font-black uppercase tracking-widest text-gray-600">Không tìm thấy vé nào phù hợp</span>
                      <button onClick={() => { setStatusFilter('All'); setSearchQuery(''); }} className="text-xs font-black text-brand uppercase tracking-wider hover:underline mt-2 cursor-pointer bg-transparent border-none">Xóa bộ lọc</button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4">
                      {paginatedBookings.map(booking => (
                        <GlassCard key={booking.bookingId} className="border border-white/5 p-6 flex flex-col md:flex-row gap-6 relative">
                          {/* Inner details */}
                          <div className="flex-grow flex flex-col gap-3">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">MÃ: {booking.bookingCode}</span>
                              <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase border tracking-wider ${getStatusStyle(booking.bookingStatus)}`}>
                                {booking.bookingStatus === 'Confirmed' ? 'Đã xác nhận' : booking.bookingStatus === 'CheckedIn' ? 'Đã Check-in' : booking.bookingStatus === 'Cancelled' ? 'Đã hủy' : 'Chờ thanh toán'}
                              </span>
                            </div>

                            <div>
                              <h4 className="text-base font-black text-white uppercase leading-snug">{booking.movieTitle || booking.showtime?.movie?.title || 'Unknown Title'}</h4>
                              <p className="text-xs text-gray-500 font-medium mt-1">Phòng {booking.hallName || booking.showtime?.hall?.name || '1'} • {booking.showtime?.hall?.hallTypeName || '2D'} • {booking.movieDuration || booking.showtime?.movie?.duration || 120} phút</p>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-semibold text-gray-400 border-t border-white/5 pt-4">
                              <div>
                                <span className="text-[9px] text-gray-500 uppercase tracking-wider block mb-1">Ngày</span>
                                <span className="text-gray-300 flex items-center gap-1.5"><Calendar size={12} /> {(booking.startTime || booking.showtime?.startTime) ? parseApiDate(booking.startTime || booking.showtime!.startTime).toLocaleDateString('vi-VN') : 'N/A'}</span>
                              </div>
                              <div>
                                <span className="text-[9px] text-gray-500 uppercase tracking-wider block mb-1">Giờ</span>
                                <span className="text-gray-300 flex items-center gap-1.5"><Clock size={12} /> {(booking.startTime || booking.showtime?.startTime) ? parseApiDate(booking.startTime || booking.showtime!.startTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : 'N/A'}</span>
                              </div>
                              <div className="col-span-2">
                                <span className="text-[9px] text-gray-500 uppercase tracking-wider block mb-1">Ghế</span>
                                <span className="text-brand-gold text-xs font-black truncate block max-w-[200px]">
                                  {booking.seats?.join(', ') || booking.bookingSeats?.map(bs => `${bs.seat?.rowName || ''}${bs.seat?.seatNumber || ''}`).join(', ') || ''}
                                </span>
                              </div>
                            </div>

                            <div className="border-t border-white/5 pt-3.5 flex justify-between items-center text-xs font-bold text-gray-500">
                              <span>Ngày đặt: {new Date(booking.createdAt).toLocaleString('vi-VN')}</span>
                              <div className="flex items-center gap-4">
                                {booking.bookingStatus === 'Pending' && (
                                  <Link to={`/payment?bookingId=${booking.bookingId}`} className="text-xs font-black text-brand hover:text-white uppercase tracking-wider transition-colors mr-1">
                                    Thanh Toán
                                  </Link>
                                )}
                                <Link to={`/booking/${booking.bookingId}`} className="text-xs font-black text-brand-gold hover:text-white uppercase tracking-wider transition-colors">
                                  Xem Chi Tiết
                                </Link>
                                <span className="text-sm font-black text-white">{(booking.totalAmount).toLocaleString()} VND</span>
                              </div>
                            </div>
                          </div>

                          {/* QR Column (only if Confirmed or CheckedIn) */}
                          {(booking.bookingStatus === 'Confirmed' || booking.bookingStatus === 'CheckedIn') && (
                            <div className="flex flex-col items-center justify-center bg-white p-3 rounded-2xl md:w-32 md:h-32 self-center shrink-0">
                              <img
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(window.location.origin + '/booking/' + booking.bookingId)}`}
                                alt="QR code"
                                className="w-24 h-24 object-contain"
                              />
                            </div>
                          )}
                        </GlassCard>
                      ))}

                      {/* Pagination Controls */}
                      {totalBookingsPages > 1 && (
                        <div className="flex items-center justify-center gap-4 mt-4">
                          <button
                            onClick={() => setBookingsPage(p => Math.max(p - 1, 1))}
                            disabled={bookingsPage === 1}
                            className="h-9 w-9 bg-white/5 hover:bg-white/10 disabled:opacity-30 text-white rounded-xl flex items-center justify-center transition-colors cursor-pointer border border-white/10"
                          >
                            <ChevronLeft size={16} />
                          </button>
                          <span className="text-xs font-black text-white uppercase tracking-wider">Trang {bookingsPage} / {totalBookingsPages}</span>
                          <button
                            onClick={() => setBookingsPage(p => Math.min(p + 1, totalBookingsPages))}
                            disabled={bookingsPage === totalBookingsPages}
                            className="h-9 w-9 bg-white/5 hover:bg-white/10 disabled:opacity-30 text-white rounded-xl flex items-center justify-center transition-colors cursor-pointer border border-white/10"
                          >
                            <ChevronRight size={16} />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Tab: Loyalty Program (Điểm Thành Viên) */}
              {activeTab === 'loyalty' && (
                <div className="flex flex-col gap-6 text-left">
                  <div className="flex flex-col gap-1 border-b border-white/5 pb-4">
                    <h3 className="text-base font-black text-white uppercase tracking-wider">Chương Trình Điểm Thành Viên</h3>
                    <p className="text-xs text-gray-500">Tích lũy điểm khi mua vé và nâng hạng để nhận ưu đãi đặc biệt.</p>
                  </div>

                  {loadingLoyalty && !loyaltyDashboard ? (
                    <div className="h-64 bg-white/5 border border-white/5 rounded-2xl animate-pulse flex items-center justify-center text-gray-400 text-xs">
                      Đang tải dữ liệu điểm thành viên...
                    </div>
                  ) : (
                    <div className="flex flex-col gap-6">

                      {/* Dashboard Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

                        {/* Member Card Component (4 cols) */}
                        <div className="md:col-span-5">
                          <div className={`p-6 rounded-2xl border relative overflow-hidden h-full flex flex-col justify-between min-h-[220px] transition-all duration-300 shadow-xl ${loyaltyDashboard?.tierName === 'Platinum'
                            ? 'bg-gradient-to-tr from-purple-900 via-indigo-950 to-violet-800 border-purple-500/30 text-white shadow-purple-500/5'
                            : loyaltyDashboard?.tierName === 'Gold'
                              ? 'bg-gradient-to-tr from-amber-600 via-yellow-700 to-amber-500 border-amber-400/30 text-white shadow-amber-500/5'
                              : loyaltyDashboard?.tierName === 'Silver'
                                ? 'bg-gradient-to-tr from-slate-600 via-zinc-700 to-slate-500 border-zinc-400/30 text-white shadow-zinc-400/5'
                                : 'bg-gradient-to-tr from-orange-900 via-amber-950 to-orange-850 border-orange-800/30 text-white shadow-orange-950/5'
                            }`}>
                            {/* Decorative background glow */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl pointer-events-none" />

                            <div>
                              <div className="flex justify-between items-start">
                                <div>
                                  <span className="text-[10px] uppercase font-black tracking-widest text-white/70 block">Hạng Thành Viên</span>
                                  <h4 className="text-2xl font-black uppercase tracking-wider mt-1">{loyaltyDashboard?.tierName || 'BRONZE'}</h4>
                                </div>
                                <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase bg-white/10 text-white border border-white/20 tracking-wider">
                                  Hệ số x{loyaltyDashboard?.pointMultiplier?.toFixed(1) || '1.0'}
                                </span>
                              </div>

                              <p className="text-[10px] text-white/60 font-semibold mt-4">
                                {loyaltyDashboard?.tierName === 'Platinum' && ' Bạn đã đạt mức hạng cao nhất với những đặc quyền thượng lưu!'}
                                {loyaltyDashboard?.tierName === 'Gold' && ' Trải nghiệm hạng Vàng để nhận bắp nước & đổi vé miễn phí.'}
                                {loyaltyDashboard?.tierName === 'Silver' && ' Nhận ngay quà sinh nhật & ưu đãi tích lũy từ hạng Bạc.'}
                                {loyaltyDashboard?.tierName === 'Bronze' && ' Tích lũy thêm điểm để thăng hạng Bạc.'}
                              </p>
                            </div>

                            <div className="border-t border-white/10 pt-4 mt-6 flex justify-between items-end">
                              <div>
                                <span className="text-[9px] uppercase font-black tracking-wider text-white/60">Điểm khả dụng</span>
                                <div className="text-3xl font-black tracking-tight">{loyaltyDashboard?.loyaltyPoints ?? 0} <span className="text-xs font-bold text-white/75">điểm</span></div>
                              </div>
                              <div className="text-right">
                                <span className="text-[9px] uppercase font-black tracking-wider text-white/60">Tích lũy trọn đời</span>
                                <div className="text-sm font-black">{loyaltyDashboard?.lifetimePoints ?? 0} pts</div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Progress and Tier benefits list (7 cols) */}
                        <div className="md:col-span-7 flex flex-col gap-5 bg-white/[0.02] border border-white/5 p-6 rounded-2xl">
                          <div>
                            <h4 className="text-xs font-black text-white uppercase tracking-wider">Tiến trình nâng hạng tiếp theo</h4>

                            {loyaltyDashboard && loyaltyDashboard.nextTierName ? (
                              <div className="mt-3">
                                <div className="flex justify-between items-center text-[10px] font-extrabold uppercase text-gray-400 mb-1.5">
                                  <span>{loyaltyDashboard.tierName}</span>
                                  <span className="text-brand-gold">Cần {loyaltyDashboard.pointsNeededForNextTier} điểm đến {loyaltyDashboard.nextTierName}</span>
                                  <span>{loyaltyDashboard.nextTierName}</span>
                                </div>
                                <div className="w-full bg-white/5 h-2.5 rounded-full overflow-hidden border border-white/5 p-0.5">
                                  <div
                                    className="bg-gradient-to-r from-brand to-brand-gold h-full rounded-full transition-all duration-500"
                                    style={{ width: `${loyaltyDashboard.progressionPercent ?? 100}%` }}
                                  />
                                </div>
                                <p className="text-[10px] text-gray-500 font-semibold mt-2">
                                  Đã tích lũy {loyaltyDashboard.lifetimePoints} / {(loyaltyDashboard.lifetimePoints + (loyaltyDashboard.pointsNeededForNextTier ?? 0))} điểm trọn đời.
                                </p>
                              </div>
                            ) : (
                              <div className="mt-3 p-3 bg-brand/5 border border-brand-gold/10 rounded-xl text-center">
                                <p className="text-xs font-bold text-brand-gold">👑 Bạn đã đạt cấp độ Platinum cao nhất!</p>
                              </div>
                            )}
                          </div>

                          <div className="border-t border-white/5 pt-4">
                            <h4 className="text-xs font-black text-white uppercase tracking-wider mb-3">Đặc quyền cấp độ thành viên</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-gray-400 font-semibold">
                              <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl flex flex-col gap-1.5">
                                <span className="text-[9px] font-black uppercase text-brand-gold">Bronze (Từ 0đ)</span>
                                <ul className="list-disc list-inside text-gray-400 space-y-0.5 text-[11px]">
                                  <li>Hệ số tích lũy x1.0</li>
                                  <li>Đăng ký tài khoản miễn phí</li>
                                </ul>
                              </div>
                              <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl flex flex-col gap-1.5">
                                <span className="text-[9px] font-black uppercase text-brand-gold">Silver (Từ 100đ)</span>
                                <ul className="list-disc list-inside text-gray-400 space-y-0.5 text-[11px]">
                                  <li>Hệ số tích lũy x1.2</li>
                                  <li>Quà sinh nhật thành viên</li>
                                </ul>
                              </div>
                              <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl flex flex-col gap-1.5">
                                <span className="text-[9px] font-black uppercase text-brand-gold">Gold (Từ 300đ)</span>
                                <ul className="list-disc list-inside text-gray-400 space-y-0.5 text-[11px]">
                                  <li>Hệ số tích lũy x1.5</li>
                                  <li>Đổi vé phim & bắp nước</li>
                                </ul>
                              </div>
                              <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl flex flex-col gap-1.5">
                                <span className="text-[9px] font-black uppercase text-brand-gold">Platinum (Từ 600đ)</span>
                                <ul className="list-disc list-inside text-gray-400 space-y-0.5 text-[11px]">
                                  <li>Hệ số tích lũy x2.0</li>
                                  <li>Lối đi ưu tiên tại rạp</li>
                                  <li>Vé VIP sneak-show sớm</li>
                                </ul>
                              </div>
                            </div>
                          </div>
                        </div>

                      </div>

                      {/* Transaction History Section */}
                      <div className="flex flex-col gap-4 mt-4">
                        <div className="flex items-center justify-between border-b border-white/5 pb-2">
                          <h4 className="text-xs font-black text-white uppercase tracking-wider">Lịch sử giao dịch điểm</h4>
                        </div>

                        {loyaltyTransactions.length === 0 ? (
                          <div className="py-12 bg-white/[0.01] border border-white/5 rounded-2xl text-center text-gray-500 flex flex-col items-center justify-center gap-2">
                            <Gift size={32} className="text-gray-700 animate-pulse" />
                            <span className="text-xs font-black uppercase tracking-widest text-gray-600">Không tìm thấy giao dịch điểm nào</span>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-3">
                            {loyaltyTransactions.map(tx => (
                              <div key={tx.loyaltyTransactionId} className="bg-white/[0.02] border border-white/5 rounded-xl p-4 flex justify-between items-center gap-4">
                                <div className="min-w-0">
                                  <p className="text-xs font-black text-white uppercase tracking-wider">{tx.description}</p>
                                  <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-500 font-extrabold uppercase">
                                    <span>{new Date(tx.createdAt).toLocaleString('vi-VN')}</span>
                                    <span>•</span>
                                    <span>Loại: {tx.transactionType === 'Earn' ? 'Tích lũy' : tx.transactionType === 'Redeem' ? 'Quy đổi' : tx.transactionType === 'Refund' ? 'Hoàn trả' : tx.transactionType}</span>
                                  </div>
                                </div>
                                <div className="text-right shrink-0">
                                  <div className={`text-sm font-black ${tx.pointsChanged > 0
                                    ? 'text-green-400'
                                    : 'text-brand'
                                    }`}>
                                    {tx.pointsChanged > 0 ? '+' : ''}{tx.pointsChanged} điểm
                                  </div>
                                  <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border mt-1.5 inline-block ${tx.status === 'Completed'
                                    ? 'bg-green-500/10 text-green-400 border-green-500/20'
                                    : tx.status === 'Pending'
                                      ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                                      : 'bg-white/5 text-gray-400 border-white/10'
                                    }`}>
                                    {tx.status === 'Completed' ? 'Thành công' : tx.status === 'Pending' ? 'Đang chờ' : tx.status}
                                  </span>
                                </div>
                              </div>
                            ))}

                            {/* Pagination Controls */}
                            {loyaltyTotalPages > 1 && (
                              <div className="flex items-center justify-center gap-4 mt-2">
                                <button
                                  onClick={() => setLoyaltyPage(p => Math.max(p - 1, 1))}
                                  disabled={loyaltyPage === 1}
                                  className="h-8 w-8 bg-white/5 hover:bg-white/10 disabled:opacity-30 text-white rounded-lg flex items-center justify-center transition-colors cursor-pointer border border-white/10"
                                >
                                  <ChevronLeft size={14} />
                                </button>
                                <span className="text-[10px] font-black text-white uppercase tracking-wider">Trang {loyaltyPage} / {loyaltyTotalPages}</span>
                                <button
                                  onClick={() => setLoyaltyPage(p => Math.min(p + 1, loyaltyTotalPages))}
                                  disabled={loyaltyPage === loyaltyTotalPages}
                                  className="h-8 w-8 bg-white/5 hover:bg-white/10 disabled:opacity-30 text-white rounded-lg flex items-center justify-center transition-colors cursor-pointer border border-white/10"
                                >
                                  <ChevronRight size={14} />
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                    </div>
                  )}
                </div>
              )}

              {/* Tab 3: Favorite Movies */}
              {activeTab === 'favorites' && (
                <div className="flex flex-col gap-6">
                  <div className="flex flex-col gap-1 border-b border-white/5 pb-4">
                    <h3 className="text-base font-black text-white uppercase tracking-wider">Bộ sưu tập phim yêu thích</h3>
                    <p className="text-xs text-gray-500">Danh sách phim bạn đã lưu để xem sau.</p>
                  </div>

                  {favorites.length === 0 ? (
                    <div className="py-16 bg-white/[0.01] border border-white/5 rounded-3xl text-center text-gray-500 flex flex-col items-center justify-center gap-3">
                      <Heart size={40} className="text-gray-700" />
                      <span className="text-xs font-black uppercase tracking-widest text-gray-600">Chưa có phim yêu thích nào</span>
                      <Link to="/movies" className="text-xs font-black text-brand uppercase tracking-wider hover:underline mt-2">Khám phá danh sách phim</Link>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                      {favorites.map(movie => (
                        <div key={movie.id} className="relative group rounded-2xl overflow-hidden border border-white/5 hover:border-brand-gold/30 bg-white/[0.02] flex flex-col transition-all duration-300">
                          {/* Image Box */}
                          <div className="aspect-[2/3] w-full overflow-hidden relative">
                            <img
                              src={getImageUrl(movie.posterUrl) || 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?q=80&w=300'}
                              alt={movie.title}
                              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />

                            {/* Hover info screen */}
                            <div className="absolute inset-0 bg-black/75 flex flex-col justify-end p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                              <button
                                onClick={() => handleRemoveFavorite(movie.id)}
                                className="absolute top-3 right-3 h-8 w-8 bg-brand/90 text-white rounded-lg flex items-center justify-center hover:bg-brand hover:scale-105 transition-all cursor-pointer"
                                title="Xóa khỏi danh sách yêu thích"
                              >
                                <Trash2 size={14} />
                              </button>

                              <Link
                                to={`/movie/${movie.slug}`}
                                className="w-full py-2 bg-brand-gold text-black font-black text-[10px] uppercase tracking-widest rounded-xl text-center hover:bg-white transition-colors"
                              >
                                Thông Tin Phim
                              </Link>
                            </div>
                          </div>

                          <div className="p-3 text-center">
                            <h4 className="text-xs font-black text-white uppercase truncate">{movie.title}</h4>
                            <span className="text-[10px] text-gray-500 mt-0.5 block">{movie.genre?.name || 'Thể loại'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tab 4: Notifications List */}
              {activeTab === 'notifications' && (
                <div className="flex flex-col gap-6">
                  <div className="flex flex-col gap-1 border-b border-white/5 pb-4">
                    <h3 className="text-base font-black text-white uppercase tracking-wider">Hộp thư thông báo</h3>
                    <p className="text-xs text-gray-500">Đọc tin nhắn và các thông báo khuyến mãi từ ban quản trị.</p>
                  </div>

                  {loadingNotifications ? (
                    <div className="flex flex-col gap-4">
                      {[1, 2].map(n => (
                        <div key={n} className="h-16 bg-white/5 border border-white/5 rounded-2xl animate-pulse" />
                      ))}
                    </div>
                  ) : (!Array.isArray(notifications) || notifications.length === 0) ? (
                    <div className="py-16 bg-white/[0.01] border border-white/5 rounded-3xl text-center text-gray-500 flex flex-col items-center justify-center gap-3">
                      <Bell size={40} className="text-gray-700" />
                      <span className="text-xs font-black uppercase tracking-widest text-gray-600">Hộp thư của bạn trống</span>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {(notifications || []).map(notif => (
                        <GlassCard
                          key={notif.notificationId}
                          className={`p-4 border-white/5 flex items-center justify-between gap-4 transition-all duration-300 ${notif.isRead ? 'opacity-60' : 'border-l-4 border-l-brand bg-white/[0.03]'
                            }`}
                        >
                          <div className="min-w-0 flex-grow">
                            <h4 className="text-xs font-black text-white uppercase tracking-wider">{notif.title}</h4>
                            <p className="text-xs text-gray-400 mt-1 leading-relaxed">{notif.message}</p>
                            <span className="text-[9px] text-gray-500 mt-1 block">{new Date(notif.createdAt).toLocaleString()}</span>
                          </div>

                          {!notif.isRead && (
                            <button
                              onClick={() => handleMarkNotificationRead(notif.notificationId)}
                              className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-white rounded-lg text-[9px] font-black uppercase tracking-widest shrink-0 transition-colors cursor-pointer"
                            >
                              Đã đọc
                            </button>
                          )}
                        </GlassCard>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tab 5: Password Changes */}
              {activeTab === 'security' && (
                <div className="flex flex-col gap-6">
                  <div className="flex flex-col gap-1 border-b border-white/5 pb-4">
                    <h3 className="text-base font-black text-white uppercase tracking-wider">Thiết lập truy cập</h3>
                    <p className="text-xs text-gray-500">Thay đổi mật khẩu để bảo vệ tài khoản cá nhân.</p>
                  </div>

                  <form onSubmit={handleChangePassword} className="max-w-md flex flex-col gap-4">
                    <div className="flex flex-col gap-2 relative">
                      <label className="text-[10px] text-gray-500 font-extrabold uppercase">Mật khẩu hiện tại</label>
                      <input
                        type={showOldPass ? 'text' : 'password'}
                        value={oldPassword}
                        onChange={e => setOldPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-brand/45"
                      />
                      <button
                        type="button"
                        onClick={() => setShowOldPass(!showOldPass)}
                        className="absolute right-3.5 bottom-3 text-gray-500 hover:text-white"
                      >
                        {showOldPass ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>

                    <div className="flex flex-col gap-2 relative">
                      <label className="text-[10px] text-gray-500 font-extrabold uppercase">Mật khẩu mới</label>
                      <input
                        type={showNewPass ? 'text' : 'password'}
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-brand/45"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPass(!showNewPass)}
                        className="absolute right-3.5 bottom-3 text-gray-500 hover:text-white"
                      >
                        {showNewPass ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>

                    <div className="flex flex-col gap-2 relative">
                      <label className="text-[10px] text-gray-500 font-extrabold uppercase">Xác nhận mật khẩu mới</label>
                      <input
                        type={showConfirmPass ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-brand/45"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPass(!showConfirmPass)}
                        className="absolute right-3.5 bottom-3 text-gray-500 hover:text-white"
                      >
                        {showConfirmPass ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>

                    <button
                      type="submit"
                      disabled={isChangingPass}
                      className="mt-2 w-full py-3 bg-brand hover:bg-brand-hover disabled:opacity-40 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-md shadow-brand/10 cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Lock size={14} /> {isChangingPass ? 'Đang cập nhật mật khẩu...' : 'Đổi Mật Khẩu'}
                    </button>
                  </form>
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </div>

      </div>

      {/* Edit Profile Modal Overlay */}
      <AnimatePresence>
        {isEditModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-[#0e0e12] border border-white/10 rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl relative"
            >
              <div className="flex flex-col gap-1 border-b border-white/5 pb-4 mb-6">
                <h4 className="text-base font-black text-white uppercase tracking-wider">Chỉnh sửa thông tin</h4>
                <p className="text-xs text-gray-500">Cập nhật thông tin nhận diện tài khoản.</p>
              </div>

              <form onSubmit={handleSaveProfile} className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] text-gray-500 font-extrabold uppercase">Họ và tên</label>
                  <input
                    type="text"
                    required
                    value={editFullName}
                    onChange={e => setEditFullName(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-brand/45"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-[10px] text-gray-500 font-extrabold uppercase">Số điện thoại</label>
                  <input
                    type="text"
                    value={editPhoneNumber}
                    onChange={e => setEditPhoneNumber(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-brand/45"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] text-gray-500 font-extrabold uppercase">Giới tính</label>
                    <select
                      value={editGender}
                      onChange={e => setEditGender(e.target.value)}
                      className="w-full bg-[#16161c] border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-brand/45"
                    >
                      <option value="Male">Nam</option>
                      <option value="Female">Nữ</option>
                      <option value="Other">Khác</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] text-gray-500 font-extrabold uppercase">Ngày sinh</label>
                    <input
                      type="date"
                      value={editDob}
                      onChange={e => setEditDob(e.target.value)}
                      className="w-full bg-[#16161c] border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-brand/45"
                    />
                  </div>
                </div>

                <div className="flex gap-3 border-t border-white/5 pt-6 mt-2">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-gray-300 font-black text-xs uppercase tracking-widest rounded-xl transition-all cursor-pointer text-center"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="flex-grow py-3 bg-brand hover:bg-brand-hover text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-md shadow-brand/10 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Save size={14} /> Lưu thông tin
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};
