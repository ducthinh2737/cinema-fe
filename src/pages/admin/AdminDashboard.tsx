import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../contexts/ToastContext';
import { apiClient } from '../../api/client';
import { GlassCard } from '../../components/ui/GlassCard';
import {
  Film,
  Users as UsersIcon,
  TrendingUp,
  DollarSign,
  Ticket,
  Percent,
  MessageSquare,
  Loader2,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

// Import modular CRUD pages
import { MoviesManagement } from './MoviesManagement';
import { CinemasManagement } from './CinemasManagement';
import { ShowtimesManagement } from './ShowtimesManagement';
import { UsersManagement } from './UsersManagement';
import { PromotionsManagement } from './PromotionsManagement';
import { MasterDataManagement } from './MasterDataManagement';
import { TicketPricesManagement } from './TicketPricesManagement';

type ActiveTab = 'dashboard' | 'movies' | 'cinemas' | 'showtimes' | 'bookings' | 'users' | 'promotions' | 'reviews' | 'masterdata' | 'ticketprices';

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [searchParams] = useSearchParams();
  const activeTab = (searchParams.get('tab') as ActiveTab) || 'dashboard';

  // Stats numbers for dashboard
  const [stats, setStats] = useState({
    revenue: '18,900,000',
    tickets: 241,
    members: 84,
    vouchers: 12
  });

  const [bookings, setBookings] = useState<any[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);

  // Verify Admin role
  useEffect(() => {
    if (!user || !user.roles?.includes('Admin')) {
      showToast('Truy cập trái phép. Chỉ dành cho Quản trị viên.', 'error');
      navigate('/');
    }
  }, [user, navigate, showToast]);

  // Load dashboard statistics
  useEffect(() => {
    const loadStats = async () => {
      try {
        const response = await apiClient.get('/admin/statistics').catch(() => null);
        if (response?.data) {
          const data = response.data?.data ?? response.data;
          setStats({
            revenue: data?.totalRevenue?.toLocaleString() || '18,900,000',
            tickets: data?.totalTicketsSold ?? 241,
            members: data?.totalActiveUsers ?? 84,
            vouchers: data?.totalActivePromos ?? 12
          });
        }
      } catch (err) {
        console.error('Failed to load live stats', err);
      }
    };
    if (user?.roles?.includes('Admin')) {
      loadStats();
    }
  }, [user]);

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

  // Graphical analytics charts
  const revenueData = [
    { name: 'T2', revenue: 1240000 },
    { name: 'T3', revenue: 1580000 },
    { name: 'T4', revenue: 2100000 },
    { name: 'T5', revenue: 1890000 },
    { name: 'T6', revenue: 3100000 },
    { name: 'T7', revenue: 4800000 },
    { name: 'CN', revenue: 4200000 },
  ];

  const popularMoviesData = [
    { name: 'Doctor Strange', bookings: 85 },
    { name: 'Spider-Man', bookings: 62 },
    { name: 'Top Gun', bookings: 54 },
    { name: 'The Batman', bookings: 40 },
  ];

  const occupancyRateData = [
    { name: 'Thường', value: 65 },
    { name: 'VIP', value: 25 },
    { name: 'Sweetbox', value: 10 },
  ];

  const PIE_COLORS = ['#e50914', '#a855f7', '#e5a93b'];

  return (
    <div className="w-full select-none text-left flex flex-col gap-6">
      
      {/* TAB 1: DASHBOARD STATS & CHARTS */}
      {activeTab === 'dashboard' && (
        <div className="flex flex-col gap-6 animate-fadeIn">
          
          {/* Analytics Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <GlassCard className="p-5 border border-white/5 flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <span className="text-[9px] uppercase tracking-widest text-gray-500 font-bold">Tổng Doanh Thu</span>
                <span className="text-lg font-black text-white">{stats.revenue} VND</span>
              </div>
              <div className="p-3 bg-green-500/10 border border-green-500/20 text-green-400 rounded-xl">
                <DollarSign size={16} />
              </div>
            </GlassCard>
            <GlassCard className="p-5 border border-white/5 flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <span className="text-[9px] uppercase tracking-widest text-gray-500 font-bold">Vé Đã Bán</span>
                <span className="text-lg font-black text-white">{stats.tickets}</span>
              </div>
              <div className="p-3 bg-brand/10 border border-brand/20 text-brand rounded-xl">
                <Ticket size={16} />
              </div>
            </GlassCard>
            <GlassCard className="p-5 border border-white/5 flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <span className="text-[9px] uppercase tracking-widest text-gray-500 font-bold">Thành Viên Hoạt Động</span>
                <span className="text-lg font-black text-white">{stats.members} Thành viên</span>
              </div>
              <div className="p-3 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-xl">
                <UsersIcon size={16} />
              </div>
            </GlassCard>
            <GlassCard className="p-5 border border-white/5 flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <span className="text-[9px] uppercase tracking-widest text-gray-500 font-bold">Khuyến Mãi Đang Chạy</span>
                <span className="text-lg font-black text-white">{stats.vouchers} Vouchers</span>
              </div>
              <div className="p-3 bg-brand-gold/10 border border-brand-gold/20 text-brand-gold rounded-xl">
                <Percent size={16} />
              </div>
            </GlassCard>
          </div>

          {/* Recharts Graphical Visuals */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Revenue Trend Area Chart */}
            <GlassCard className="p-6 border border-white/5 text-left flex flex-col gap-4">
              <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5 border-b border-white/5 pb-2">
                <TrendingUp size={12} className="text-brand" /> Xu Hướng Doanh Thu Tuần
              </h4>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#e50914" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#e50914" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                    <XAxis dataKey="name" stroke="#555" fontSize={10} />
                    <YAxis stroke="#555" fontSize={10} />
                    <Tooltip contentStyle={{ backgroundColor: '#111', borderColor: '#222', fontSize: 10 }} />
                    <Area type="monotone" dataKey="revenue" stroke="#e50914" strokeWidth={2} fillOpacity={1} fill="url(#colorRev)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </GlassCard>

            {/* Popular Movies Bar Chart */}
            <GlassCard className="p-6 border border-white/5 text-left flex flex-col gap-4">
              <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5 border-b border-white/5 pb-2">
                <Film size={12} className="text-brand-gold" /> Vé Đặt Theo Phim Phổ Biến
              </h4>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={popularMoviesData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                    <XAxis dataKey="name" stroke="#555" fontSize={10} />
                    <YAxis stroke="#555" fontSize={10} />
                    <Tooltip contentStyle={{ backgroundColor: '#111', borderColor: '#222', fontSize: 10 }} />
                    <Bar dataKey="bookings" fill="#e5a93b" radius={[4, 4, 0, 0]}>
                      {popularMoviesData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={index === 0 ? '#e50914' : '#e5a93b'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </GlassCard>

            {/* Occupancy Rate Pie Chart */}
            <GlassCard className="p-6 border border-white/5 text-left flex flex-col gap-4">
              <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5 border-b border-white/5 pb-2">
                <UsersIcon size={12} className="text-blue-400" /> Tỉ Lệ Lấp Đầy Theo Loại Ghế
              </h4>
              <div className="flex items-center justify-between gap-6">
                <div className="h-44 w-1/2">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={occupancyRateData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {occupancyRateData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#111', borderColor: '#222', fontSize: 10 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-col gap-2.5 w-1/2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  {occupancyRateData.map((entry, idx) => (
                    <div key={entry.name} className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[idx] }} />
                      <span>{entry.name}: {entry.value}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </GlassCard>
          </div>
        </div>
      )}

      {/* MODULAR CRUD INTEGRATIONS */}
      {activeTab === 'movies' && <MoviesManagement />}
      
      {activeTab === 'cinemas' && <CinemasManagement />}

      {activeTab === 'showtimes' && <ShowtimesManagement />}

      {activeTab === 'users' && <UsersManagement />}

      {activeTab === 'promotions' && <PromotionsManagement />}

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
      {activeTab === 'reviews' && (
        <div className="flex flex-col gap-4 animate-fadeIn">
          <div>
            <h3 className="text-sm font-black uppercase tracking-widest text-brand-gold flex items-center gap-2">
              <MessageSquare size={16} /> Ý Kiến Khán Giả
            </h3>
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
              Kiểm duyệt đánh giá người dùng, ẩn/xóa bình luận không phù hợp và phê duyệt xếp hạng phim
            </span>
          </div>
          <div className="flex flex-col gap-3">
            {[
              { id: 1, movie: 'Doctor Strange in the Multiverse of Madness', user: 'Nguyễn Văn A', rating: 5, comment: 'Kỹ xảo tuyệt vời, cốt truyện tiếp nối rất hay!', date: '2 giờ trước' },
              { id: 2, movie: 'Spider-Man: No Way Home', user: 'Phạm Thị B', rating: 4, comment: 'Nhạc phim xuất sắc, mặc dù đoạn giữa hơi dài dòng.', date: '1 ngày trước' },
              { id: 3, movie: 'Top Gun: Maverick', user: 'Trần VIP', rating: 5, comment: 'Bộ phim mang lại cảm giác kỳ diệu! Trải nghiệm xem phim tuyệt vời cùng gia đình.', date: '3 ngày trước' },
            ].map((r) => (
              <GlassCard key={r.id} className="p-4 border-white/5 flex flex-col gap-2">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] text-brand-gold font-black uppercase tracking-wider">{r.movie}</span>
                    <h4 className="text-xs font-bold text-white mt-0.5">bởi {r.user}</h4>
                  </div>
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{r.date}</span>
                </div>
                <p className="text-xs text-gray-300 leading-relaxed font-sans font-semibold">{r.comment}</p>
                <div className="border-t border-white/5 pt-3 flex justify-between items-center text-[10px]">
                  <span className="text-brand-gold font-bold">Xếp Hạng: {'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                  <div className="flex gap-3">
                    <button className="text-[9px] font-black uppercase tracking-wider text-green-400 hover:underline cursor-pointer">
                      Duyệt
                    </button>
                    <button className="text-[9px] font-black uppercase tracking-wider text-brand hover:underline cursor-pointer">
                      Xóa
                    </button>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};
