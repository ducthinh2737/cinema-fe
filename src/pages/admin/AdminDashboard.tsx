import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../contexts/ToastContext';
import { apiClient } from '../../api/client';
import {
  Ticket,
  Loader2,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';
import { DashboardAnalytics } from '../../components/admin';

// Import modular CRUD pages
import { MoviesManagement } from './MoviesManagement';
import { CinemasManagement } from './CinemasManagement';
import { HallsManagement } from './HallsManagement';
import { SeatsManagement } from './SeatsManagement';
import { ShowtimesManagement } from './ShowtimesManagement';
import { UsersManagement } from './UsersManagement';
import { PromotionsManagement } from './PromotionsManagement';
import { MasterDataManagement } from './MasterDataManagement';
import { TicketPricesManagement } from './TicketPricesManagement';
import { ReviewsManagement } from './ReviewsManagement';
import { NewsManagement } from './NewsManagement';
import { CombosManagement } from './CombosManagement';

type ActiveTab = 'dashboard' | 'movies' | 'cinemas' | 'halls' | 'seats' | 'showtimes' | 'bookings' | 'users' | 'promotions' | 'reviews' | 'masterdata' | 'ticketprices' | 'news' | 'combos';

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [searchParams] = useSearchParams();
  const activeTab = (searchParams.get('tab') as ActiveTab) || 'dashboard';

  const [bookings, setBookings] = useState<any[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);

  // Verify Admin role
  useEffect(() => {
    if (!user || !user.roles?.includes('Admin')) {
      showToast('Truy cập trái phép. Chỉ dành cho Quản trị viên.', 'error');
      navigate('/');
    }
  }, [user, navigate, showToast]);

  // Load bookings for admin
  const loadBookings = async () => {
    setBookingsLoading(true);
    try {
      const response = await apiClient.get('/bookings');
      if (response.data?.isSuccess) {
        setBookings(response.data.data);
      }
    } catch (err) {
      console.error('Failed to load bookings', err);
      showToast('Không thể tải nhật ký đặt vé.', 'error');
    } finally {
      setBookingsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'bookings' && user?.roles?.includes('Admin')) {
      loadBookings();
    }
  }, [activeTab, user]);

  const handleConfirmPayment = async (bookingId: number) => {
    try {
      const response = await apiClient.post('/payments/confirm', { bookingId });
      if (response.status === 200 || response.data?.isSuccess) {
        showToast('Xác nhận thanh toán và duyệt vé thành công!', 'success');
        loadBookings();
      }
    } catch (err: any) {
      const msg = err.response?.data?.Message || 'Duyệt thanh toán thất bại.';
      showToast(msg, 'error');
    }
  };

  const handleCancelBooking = async (bookingId: number) => {
    if (!window.confirm('Bạn có chắc chắn muốn hủy đặt vé này? Ghế ngồi sẽ được giải phóng ngay lập tức.')) return;
    try {
      const response = await apiClient.post('/bookings/cancel', { bookingId });
      if (response.status === 200 || response.data?.isSuccess) {
        showToast('Đã hủy đặt vé thành công!', 'success');
        loadBookings();
      }
    } catch (err: any) {
      const msg = err.response?.data?.Message || 'Hủy đặt vé thất bại.';
      showToast(msg, 'error');
    }
  };

  return (
    <div className="w-full select-none text-left flex flex-col gap-6">
      
      {/* TAB 1: DASHBOARD STATS & CHARTS */}
      {activeTab === 'dashboard' && (
        <DashboardAnalytics />
      )}

      {/* MODULAR CRUD INTEGRATIONS */}
      {activeTab === 'movies' && <MoviesManagement />}
      
      {activeTab === 'cinemas' && <CinemasManagement />}

      {activeTab === 'halls' && <HallsManagement />}

      {activeTab === 'seats' && <SeatsManagement />}

      {activeTab === 'showtimes' && <ShowtimesManagement />}

      {activeTab === 'users' && <UsersManagement />}

      {activeTab === 'promotions' && <PromotionsManagement />}

      {activeTab === 'combos' && <CombosManagement />}

      {activeTab === 'masterdata' && <MasterDataManagement />}

      {activeTab === 'ticketprices' && <TicketPricesManagement />}

      {/* TAB 7: BOOKINGS */}
      {activeTab === 'bookings' && (
        <div className="flex flex-col gap-4 animate-fadeIn">
          <div>
            <h3 className="text-sm font-black uppercase tracking-widest text-brand-gold flex items-center gap-2">
              <Ticket size={16} /> Nhật Ký Giao Dịch
            </h3>
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
              Xem chi tiết thông tin đặt vé, hóa đơn thanh toán và các giao dịch hủy vé của khách hàng
            </span>
          </div>

          {bookingsLoading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3">
              <Loader2 className="h-10 w-10 text-brand-gold animate-spin" />
              <span className="text-xs text-gray-500 font-bold uppercase tracking-widest">Đang tải danh sách đặt vé...</span>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-white/5 bg-[#0e0e12]/30 backdrop-blur-md">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/5 bg-white/[0.02] text-gray-400 font-black uppercase tracking-wider text-[9px]">
                    <th className="p-4">Mã Đặt Vé</th>
                    <th className="p-4">Khách Hàng</th>
                    <th className="p-4">Thông Tin Suất Chiếu</th>
                    <th className="p-4">Ghế ngồi</th>
                    <th className="p-4">Số Tiền</th>
                    <th className="p-4 text-center">Trạng Thái</th>
                    <th className="p-4 text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-semibold text-gray-300">
                  {bookings.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-10 text-center text-gray-500 font-bold">
                        Không tìm thấy giao dịch nào.
                      </td>
                    </tr>
                  ) : (
                    bookings.map((b) => (
                      <tr key={b.bookingId} className="hover:bg-white/[0.01] transition-colors">
                        <td className="p-4 font-bold text-white font-mono uppercase tracking-wider">{b.bookingCode}</td>
                        <td className="p-4">{b.userEmail || b.userName || `User #${b.userId}`}</td>
                        <td className="p-4">
                          <span className="block font-bold text-white leading-none">{b.movieTitle}</span>
                          <span className="text-[10px] text-gray-500 font-bold block mt-1">
                            {b.cinemaName} • Phòng {b.hallName} • {b.startTime ? new Date(b.startTime).toLocaleString('vi-VN') : 'Unknown'}
                          </span>
                        </td>
                        <td className="p-4 font-bold text-brand-gold">
                          {Array.isArray(b.seats) && b.seats.length > 0 ? b.seats.join(', ') : 'N/A'}
                        </td>
                        <td className="p-4 font-bold text-white font-mono">{Number(b.totalAmount).toLocaleString()} VND</td>
                        <td className="p-4 text-center">
                          <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded border inline-block ${
                            b.bookingStatus === 'Confirmed' || b.bookingStatus === 'Paid'
                              ? 'text-green-400 border-green-500/20 bg-green-500/5' 
                              : b.bookingStatus === 'Cancelled' || b.bookingStatus === 'Expired'
                              ? 'text-brand border-brand/20 bg-brand/5' 
                              : 'text-yellow-400 border-yellow-500/20 bg-yellow-500/5'
                          }`}>
                            {b.bookingStatus === 'Confirmed' || b.bookingStatus === 'Paid' ? 'Đã Thanh Toán' : b.bookingStatus === 'Cancelled' ? 'Đã Hủy' : b.bookingStatus === 'Expired' ? 'Hết Hạn' : 'Chờ Thanh Toán'}
                          </span>
                        </td>
                        <td className="p-4 text-right flex items-center justify-end gap-2.5">
                          {b.bookingStatus === 'Pending' && (
                            <>
                              <button
                                onClick={() => handleConfirmPayment(b.bookingId)}
                                className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-[9px] uppercase tracking-wider rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                              >
                                <CheckCircle size={10} /> Duyệt QR
                              </button>
                              <button
                                onClick={() => handleCancelBooking(b.bookingId)}
                                className="px-2.5 py-1 bg-brand/10 hover:bg-brand/20 border border-brand/20 text-brand font-black text-[9px] uppercase tracking-wider rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                              >
                                <XCircle size={10} /> Hủy vé
                              </button>
                            </>
                          )}
                          {(b.bookingStatus === 'Confirmed' || b.bookingStatus === 'Paid') && (
                            <span className="text-[10px] text-gray-500 italic flex items-center gap-1">
                              <CheckCircle size={10} className="text-green-500" /> Hoàn tất
                            </span>
                          )}
                          {(b.bookingStatus === 'Cancelled' || b.bookingStatus === 'Expired') && (
                            <span className="text-[10px] text-gray-500 italic flex items-center gap-1">
                              <Clock size={10} /> Hết hiệu lực
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 8: REVIEWS */}
      {activeTab === 'reviews' && <ReviewsManagement />}

      {/* TAB 9: NEWS */}
      {activeTab === 'news' && <NewsManagement />}

    </div>
  );
};
