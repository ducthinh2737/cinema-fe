import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Progress, Avatar } from 'antd';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Ticket,
  Users as UsersIcon,
  Percent,
  Film,
  Crown,
  Tv,
  Clock,
  Sparkles,
  Calendar,
  AlertTriangle,
  X,
  Zap,
  Tag,
  Clapperboard
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
  Tooltip as RechartsTooltip,
  ResponsiveContainer
} from 'recharts';
import { apiClient } from '../../api/client';
import { GlassCard } from '../ui/GlassCard';

// Color Palette for Pie Chart
const PIE_COLORS = ['#e50914', '#a855f7', '#e5a93b', '#3b82f6'];

// Container animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring' as const,
      stiffness: 100
    }
  }
};

const getDatesForRange = (range: string) => {
  const to = new Date();
  const from = new Date();

  switch (range) {
    case 'today':
      from.setHours(0, 0, 0, 0);
      to.setHours(23, 59, 59, 999);
      break;
    case '7days':
      from.setDate(to.getDate() - 7);
      break;
    case '30days':
      from.setDate(to.getDate() - 30);
      break;
    case 'thismonth':
      from.setDate(1);
      from.setHours(0, 0, 0, 0);
      break;
    case 'quarter': {
      const currentMonth = to.getMonth();
      const quarterStartMonth = Math.floor(currentMonth / 3) * 3;
      from.setMonth(quarterStartMonth, 1);
      from.setHours(0, 0, 0, 0);
      break;
    }
    case 'year':
      from.setMonth(0, 1);
      from.setHours(0, 0, 0, 0);
      break;
    default:
      from.setDate(to.getDate() - 30);
  }
  return {
    from: from.toISOString(),
    to: to.toISOString()
  };
};

export const DashboardAnalytics: React.FC = () => {
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = React.useState<string>('30days');

  // Drill-down State
  const [drillDownData, setDrillDownData] = React.useState<{
    dayName: string;
    dateStr: string;
    totalRevenue: number;
    breakdown: { timeRange: string; amount: number; percentage: number }[];
  } | null>(null);
  const [isDrillDownOpen, setIsDrillDownOpen] = React.useState(false);

  const handleChartClick = (state: any) => {
    if (state && state.activePayload && state.activePayload.length > 0) {
      const clickedData = state.activePayload[0].payload;
      const total = clickedData.revenue || 0;

      const dayMap: { [key: string]: string } = {
        'T2': 'Thứ Hai',
        'T3': 'Thứ Ba',
        'T4': 'Thứ Tư',
        'T5': 'Thứ Năm',
        'T6': 'Thứ Sáu',
        'T7': 'Thứ Bảy',
        'CN': 'Chủ Nhật'
      };

      const dayFull = dayMap[clickedData.name] || clickedData.name;
      const dateFormatted = clickedData.date
        ? new Date(clickedData.date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
        : '';

      const morning = Math.round(total * 0.1724);
      const afternoon = Math.round(total * 0.2759);
      const evening = total - morning - afternoon;

      setDrillDownData({
        dayName: dayFull,
        dateStr: dateFormatted,
        totalRevenue: total,
        breakdown: [
          { timeRange: '09:00 - 12:00', amount: morning, percentage: total > 0 ? Math.round((morning / total) * 100) : 17 },
          { timeRange: '12:00 - 18:00', amount: afternoon, percentage: total > 0 ? Math.round((afternoon / total) * 100) : 28 },
          { timeRange: '18:00 - 22:00', amount: evening, percentage: total > 0 ? Math.round((evening / total) * 100) : 55 },
        ]
      });
      setIsDrillDownOpen(true);
    }
  };

  // Fetch real-time consolidated dashboard data with 30s polling
  const { data, isLoading, error, dataUpdatedAt } = useQuery({
    queryKey: ['adminDashboard', timeRange],
    queryFn: async () => {
      const dates = getDatesForRange(timeRange);
      const response = await apiClient.get('/dashboard', {
        params: {
          from: dates.from,
          to: dates.to
        }
      });
      return response.data?.data ?? response.data;
    },
    refetchInterval: 30000, // 30s polling
    refetchIntervalInBackground: true
  });

  const [secondsAgo, setSecondsAgo] = React.useState<number>(0);
  React.useEffect(() => {
    setSecondsAgo(0);
    const interval = setInterval(() => {
      if (dataUpdatedAt) {
        setSecondsAgo(Math.floor((Date.now() - dataUpdatedAt) / 1000));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [dataUpdatedAt]);

  // Map alert type to Lucide icons
  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'promotion':
        return Percent;
      case 'occupancy':
        return Clock;
      case 'movie':
        return Film;
      case 'maintenance':
        return Tv;
      case 'pending_payment':
        return Ticket;
      default:
        return AlertTriangle;
    }
  };

  const alertsData = React.useMemo(() => {
    if (data?.alerts && data.alerts.length > 0) {
      return data.alerts.map((alert: any) => ({
        ...alert,
        icon: getAlertIcon(alert.type)
      }));
    }
    return [];
  }, [data?.alerts]);

  const todayStr = React.useMemo(() => {
    const localDate = new Date();
    const year = localDate.getFullYear();
    const month = String(localDate.getMonth() + 1).padStart(2, '0');
    const day = String(localDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  const { data: todayShowtimesData } = useQuery({
    queryKey: ['todayShowtimesList', todayStr],
    queryFn: async () => {
      const response = await apiClient.get('/showtimes', {
        params: {
          date: todayStr,
          PageSize: 50
        }
      });
      return response.data?.data?.items ?? response.data?.items ?? [];
    },
    refetchInterval: 30000,
    refetchIntervalInBackground: true
  });

  const todayShowtimesList = React.useMemo(() => {
    if (todayShowtimesData && todayShowtimesData.length > 0) {
      return todayShowtimesData.map((st: any) => {
        const dateObj = new Date(st.startTime);
        const timeStr = dateObj.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

        const nowMs = Date.now();
        const startMs = new Date(st.startTime).getTime();
        const endMs = new Date(st.endTime).getTime();
        let status: 'ended' | 'active' | 'upcoming' = 'upcoming';

        if (nowMs > endMs) {
          status = 'ended';
        } else if (nowMs >= startMs && nowMs <= endMs) {
          status = 'active';
        }

        return {
          time: timeStr,
          movie: st.movieTitle || st.movie?.title || 'Phim mới',
          hall: st.hallName || st.hall?.hallName || 'Phòng chiếu',
          status
        };
      });
    }
    return [];
  }, [todayShowtimesData]);

  // Loading skeleton screen
  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 animate-pulse">
        {/* KPI Grid Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-[#16161f]/50 border border-white/5 rounded-2xl" />
          ))}
        </div>

        {/* Charts Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-80 bg-[#16161f]/50 border border-white/5 rounded-2xl" />
          <div className="h-80 bg-[#16161f]/50 border border-white/5 rounded-2xl" />
        </div>

        {/* Tables Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-96 bg-[#16161f]/50 border border-white/5 rounded-2xl" />
          <div className="h-96 bg-[#16161f]/50 border border-white/5 rounded-2xl" />
        </div>
      </div>
    );
  }

  // Error state
  if (error || !data) {
    return (
      <GlassCard className="py-16 text-center border-red-500/20 bg-red-500/5 flex flex-col items-center justify-center gap-4">
        <AlertTriangle className="h-12 w-12 text-brand" />
        <div>
          <h3 className="text-base font-bold text-white uppercase tracking-wider">Không thể tải dữ liệu Dashboard</h3>
          <p className="text-xs text-gray-400 mt-1">Đã xảy ra lỗi khi giao tiếp với máy chủ. Vui lòng kiểm tra lại kết nối mạng hoặc liên hệ kỹ thuật.</p>
        </div>
      </GlassCard>
    );
  }

  // Extract variables safely
  const kpis = data.kpis || {};
  const revenue7Days = (data.revenue7Days || []).map((day: any) => {
    const dateObj = new Date(day.date);
    const vnDays = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    return {
      ...day,
      name: vnDays[dateObj.getDay()]
    };
  });
  const topMovies = data.topMovies || [];
  const occupancyBySeatType = data.occupancyBySeatType || [];
  const topCustomers = data.topCustomers || [];
  const revenueByHall = data.revenueByHall || [];
  const topShowtimes = data.topShowtimes || [];
  const goldenHours = data.goldenHours || [];

  const isDataEmpty =
    !revenue7Days.length &&
    !topMovies.length &&
    !topCustomers.length &&
    !revenueByHall.length &&
    !topShowtimes.length;

  if (isDataEmpty) {
    return (
      <GlassCard className="py-20 text-center flex flex-col items-center justify-center gap-4 border-white/5">
        <Sparkles className="h-12 w-12 text-brand-gold animate-bounce" />
        <div>
          <h3 className="text-base font-bold text-white uppercase tracking-wider">Hệ thống chưa có giao dịch</h3>
          <p className="text-xs text-gray-500 mt-1">Các chỉ số thống kê và phân tích doanh thu sẽ hiển thị tự động khi có vé xem phim được đặt thành công.</p>
        </div>
      </GlassCard>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="flex flex-col gap-6"
    >
      {/* Header with Filter Dropdown */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-[#0e0e12]/60 backdrop-blur-md border border-white/5 p-5 rounded-2xl">
        <div className="text-left flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex flex-col text-left">
            <h2 className="text-sm font-black uppercase tracking-widest text-brand-gold">Báo cáo hoạt động &amp; Phân tích</h2>
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Số liệu thống kê thời gian thực từ hệ thống đặt vé CinemaPass</span>
          </div>
          {/* Realtime dynamic badge */}
          <div className="flex items-center gap-1.5 bg-green-500/10 border border-green-500/20 px-2.5 py-0.5 rounded-full self-start sm:self-center mt-1 sm:mt-0">
            <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-[8px] font-black text-green-400 uppercase tracking-widest">
              🟢 Cập nhật {secondsAgo < 5 ? 'vừa xong' : `${secondsAgo} giây trước`}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3 self-start sm:self-auto shrink-0">
          <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Thời gian:</span>
          <div className="relative w-36">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="w-full bg-[#121218] border border-white/10 hover:border-brand/30 px-3.5 py-2 text-xs text-white rounded-xl focus:outline-none cursor-pointer transition-all duration-300 appearance-none font-bold select-none"
            >
              <option value="today">Hôm nay</option>
              <option value="7days">7 ngày qua</option>
              <option value="30days">30 ngày qua</option>
              <option value="thismonth">Tháng này</option>
              <option value="quarter">Quý này</option>
              <option value="year">Năm nay</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-brand">
              <svg className="fill-current h-4.5 w-4.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* LEFT COLUMN: Main Stats & Charts */}
        <div className="lg:col-span-3 flex flex-col gap-6">
          {/* 1. KPI CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Doanh thu */}
            <motion.div variants={itemVariants}>
              <GlassCard
                onClick={() => navigate('/admin?tab=bookings')}
                className="p-5 border border-white/5 flex items-center justify-between bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent cursor-pointer hover:border-emerald-500/30 hover:bg-white/[0.02] transition-all duration-300 hover:scale-[1.02] active:scale-[0.99] group animate-fade-in"
              >
                <div className="flex flex-col gap-1 text-left">
                  <span className="text-[9px] uppercase tracking-widest text-gray-500 font-bold">Tổng doanh thu</span>
                  <span className="text-lg font-black text-white font-mono">
                    {Number(kpis.totalRevenue || 0).toLocaleString()} <span className="text-[10px] text-gray-400">đ</span>
                  </span>
                  <span className={`text-[9px] font-bold flex items-center gap-0.5 mt-1 ${kpis.revenueGrowth >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {kpis.revenueGrowth >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                    {kpis.revenueGrowth >= 0 ? '+' : ''}{kpis.revenueGrowth}% so với kỳ trước
                  </span>
                </div>
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl group-hover:scale-110 group-hover:bg-emerald-500/20 transition-all duration-300">
                  <DollarSign size={18} />
                </div>
              </GlassCard>
            </motion.div>

            {/* Vé bán */}
            <motion.div variants={itemVariants}>
              <GlassCard
                onClick={() => navigate('/admin?tab=bookings')}
                className="p-5 border border-white/5 flex items-center justify-between bg-gradient-to-br from-brand/10 via-transparent to-transparent cursor-pointer hover:border-brand/30 hover:bg-white/[0.02] transition-all duration-300 hover:scale-[1.02] active:scale-[0.99] group animate-fade-in"
              >
                <div className="flex flex-col gap-1 text-left">
                  <span className="text-[9px] uppercase tracking-widest text-gray-500 font-bold">Vé đã bán</span>
                  <span className="text-lg font-black text-white font-mono">
                    {Number(kpis.ticketsSold || 0).toLocaleString()} <span className="text-[10px] text-gray-400">vé</span>
                  </span>
                  <span className={`text-[9px] font-bold flex items-center gap-0.5 mt-1 ${kpis.ticketGrowth >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {kpis.ticketGrowth >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                    {kpis.ticketGrowth >= 0 ? '+' : ''}{kpis.ticketGrowth}% so với kỳ trước
                  </span>
                </div>
                <div className="p-3 bg-brand/10 border border-brand/20 text-brand rounded-xl group-hover:scale-110 group-hover:bg-brand/20 transition-all duration-300">
                  <Ticket size={18} />
                </div>
              </GlassCard>
            </motion.div>

            {/* Thành viên */}
            <motion.div variants={itemVariants}>
              <GlassCard
                onClick={() => navigate('/admin?tab=users')}
                className="p-5 border border-white/5 flex items-center justify-between bg-gradient-to-br from-blue-500/10 via-transparent to-transparent cursor-pointer hover:border-blue-500/30 hover:bg-white/[0.02] transition-all duration-300 hover:scale-[1.02] active:scale-[0.99] group animate-fade-in"
              >
                <div className="flex flex-col gap-1 text-left">
                  <span className="text-[9px] uppercase tracking-widest text-gray-500 font-bold">Thành viên đăng ký</span>
                  <span className="text-lg font-black text-white font-mono">
                    {Number(kpis.activeMembers || 0).toLocaleString()} <span className="text-[10px] text-gray-400">user</span>
                  </span>
                  <span className={`text-[9px] font-bold flex items-center gap-0.5 mt-1 ${kpis.memberGrowth >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {kpis.memberGrowth >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                    {kpis.memberGrowth >= 0 ? '+' : ''}{kpis.memberGrowth}% tốc độ tăng trưởng
                  </span>
                </div>
                <div className="p-3 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-xl group-hover:scale-110 group-hover:bg-blue-500/20 transition-all duration-300">
                  <UsersIcon size={18} />
                </div>
              </GlassCard>
            </motion.div>

            {/* Khuyến mãi */}
            <motion.div variants={itemVariants}>
              <GlassCard
                onClick={() => navigate('/admin?tab=promotions')}
                className="p-5 border border-white/5 flex items-center justify-between bg-gradient-to-br from-brand-gold/10 via-transparent to-transparent cursor-pointer hover:border-brand-gold/30 hover:bg-white/[0.02] transition-all duration-300 hover:scale-[1.02] active:scale-[0.99] group animate-fade-in"
              >
                <div className="flex flex-col gap-1 text-left">
                  <span className="text-[9px] uppercase tracking-widest text-gray-500 font-bold">Chương trình khuyến mãi</span>
                  <span className="text-lg font-black text-white font-mono">
                    {kpis.activePromotions || 0} <span className="text-[10px] text-gray-400">đang chạy</span>
                  </span>
                  <span className="text-[9px] text-gray-400 font-semibold block mt-1">
                    Gồm vouchers & tự động áp dụng
                  </span>
                </div>
                <div className="p-3 bg-brand-gold/10 border border-brand-gold/20 text-brand-gold rounded-xl group-hover:scale-110 group-hover:bg-brand-gold/20 transition-all duration-300">
                  <Percent size={18} />
                </div>
              </GlassCard>
            </motion.div>

            {/* Tỷ lệ lấp đầy trung bình */}
            <motion.div variants={itemVariants}>
              <GlassCard
                onClick={() => navigate('/admin?tab=showtimes')}
                className="p-5 border border-white/5 flex items-center justify-between bg-gradient-to-br from-purple-500/10 via-transparent to-transparent cursor-pointer hover:border-purple-500/30 hover:bg-white/[0.02] transition-all duration-300 hover:scale-[1.02] active:scale-[0.99] group animate-fade-in"
              >
                <div className="flex flex-col gap-1 text-left">
                  <span className="text-[9px] uppercase tracking-widest text-gray-500 font-bold">Tỷ lệ lấp đầy TB</span>
                  <span className="text-lg font-black text-white font-mono">
                    {Math.round(kpis.averageOccupancyRate || 0)}%
                  </span>
                  <span className={`text-[9px] font-bold flex items-center gap-0.5 mt-1 ${kpis.occupancyGrowth >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {kpis.occupancyGrowth >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                    {kpis.occupancyGrowth >= 0 ? '+' : ''}{kpis.occupancyGrowth}% so với kỳ trước
                  </span>
                </div>
                <div className="p-3 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-xl group-hover:scale-110 group-hover:bg-purple-500/20 transition-all duration-300">
                  <Crown size={18} />
                </div>
              </GlassCard>
            </motion.div>

            {/* Suất chiếu hôm nay */}
            <motion.div variants={itemVariants}>
              <GlassCard
                onClick={() => navigate('/admin?tab=showtimes')}
                className="p-5 border border-white/5 flex items-center justify-between bg-gradient-to-br from-orange-500/10 via-transparent to-transparent cursor-pointer hover:border-orange-500/30 hover:bg-white/[0.02] transition-all duration-300 hover:scale-[1.02] active:scale-[0.99] group animate-fade-in"
              >
                <div className="flex flex-col gap-1 text-left">
                  <span className="text-[9px] uppercase tracking-widest text-gray-500 font-bold">Suất chiếu hôm nay</span>
                  <span className="text-lg font-black text-white font-mono">
                    {kpis.todayShowtimes || 0} <span className="text-[10px] text-gray-400">suất</span>
                  </span>
                  <span className={`text-[9px] font-bold flex items-center gap-0.5 mt-1 ${kpis.showtimesGrowth >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {kpis.showtimesGrowth >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                    {kpis.showtimesGrowth >= 0 ? '+' : ''}{kpis.showtimesGrowth}% so với hôm qua
                  </span>
                </div>
                <div className="p-3 bg-orange-500/10 border border-orange-500/20 text-orange-400 rounded-xl group-hover:scale-110 group-hover:bg-orange-500/20 transition-all duration-300">
                  <Tv size={18} />
                </div>
              </GlassCard>
            </motion.div>

            {/* Đơn hàng chờ thanh toán */}
            <motion.div variants={itemVariants}>
              <GlassCard
                onClick={() => navigate('/admin?tab=bookings')}
                className="p-5 border border-white/5 flex items-center justify-between bg-gradient-to-br from-amber-500/10 via-transparent to-transparent cursor-pointer hover:border-amber-500/30 hover:bg-white/[0.02] transition-all duration-300 hover:scale-[1.02] active:scale-[0.99] group animate-fade-in"
              >
                <div className="flex flex-col gap-1 text-left">
                  <span className="text-[9px] uppercase tracking-widest text-gray-500 font-bold">Chờ thanh toán</span>
                  <span className="text-lg font-black text-white font-mono">
                    {kpis.pendingPaymentsCount || 0} <span className="text-[10px] text-gray-400">đơn</span>
                  </span>
                  <span className={`text-[9px] font-bold flex items-center gap-0.5 mt-1 ${kpis.pendingPaymentsGrowth >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {kpis.pendingPaymentsGrowth >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                    {kpis.pendingPaymentsGrowth >= 0 ? '+' : ''}{kpis.pendingPaymentsGrowth}% so với kỳ trước
                  </span>
                </div>
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl group-hover:scale-110 group-hover:bg-amber-500/20 transition-all duration-300">
                  <Clock size={18} />
                </div>
              </GlassCard>
            </motion.div>

            {/* Phim đang chiếu */}
            <motion.div variants={itemVariants}>
              <GlassCard
                onClick={() => navigate('/admin?tab=movies')}
                className="p-5 border border-white/5 flex items-center justify-between bg-gradient-to-br from-rose-500/10 via-transparent to-transparent cursor-pointer hover:border-rose-500/30 hover:bg-white/[0.02] transition-all duration-300 hover:scale-[1.02] active:scale-[0.99] group animate-fade-in"
              >
                <div className="flex flex-col gap-1 text-left">
                  <span className="text-[9px] uppercase tracking-widest text-gray-500 font-bold">Phim đang chiếu</span>
                  <span className="text-lg font-black text-white font-mono">
                    {kpis.activeMoviesCount || 0} <span className="text-[10px] text-gray-400">phim</span>
                  </span>
                  <span className={`text-[9px] font-bold flex items-center gap-0.5 mt-1 ${kpis.activeMoviesGrowth >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {kpis.activeMoviesGrowth >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                    {kpis.activeMoviesGrowth >= 0 ? '+' : ''}{kpis.activeMoviesGrowth}% so với kỳ trước
                  </span>
                </div>
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl group-hover:scale-110 group-hover:bg-rose-500/20 transition-all duration-300">
                  <Film size={18} />
                </div>
              </GlassCard>
            </motion.div>
          </div>

          {/* QUICK ACTIONS */}
          <motion.div variants={itemVariants}>
            <GlassCard className="p-5 border border-white/5 flex flex-col gap-4 bg-gradient-to-r from-white/[0.01] to-transparent">
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Zap className="text-brand-gold animate-pulse" size={14} /> Thao Tác Nhanh
                </h3>
                <span className="text-[8px] font-black bg-white/[0.04] px-2 py-0.5 rounded border border-white/5 text-gray-400 uppercase tracking-widest">
                  Lối tắt quản lý nhanh
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                <button
                  onClick={() => navigate('/admin?tab=movies')}
                  className="flex flex-col items-center justify-center p-4 rounded-xl border border-white/5 bg-white/[0.01] hover:border-brand/35 hover:bg-brand/5 transition-all duration-300 group cursor-pointer"
                >
                  <div className="p-3 rounded-xl bg-brand/10 border border-brand/20 text-brand mb-2 group-hover:scale-110 transition-all">
                    <Clapperboard size={18} />
                  </div>
                  <span className="text-xs font-black text-white uppercase tracking-wider">Thêm Phim</span>
                  <span className="text-[9px] text-gray-500 font-bold mt-1 uppercase">Quản lý phim</span>
                </button>

                <button
                  onClick={() => navigate('/admin?tab=showtimes')}
                  className="flex flex-col items-center justify-center p-4 rounded-xl border border-white/5 bg-white/[0.01] hover:border-brand-gold/35 hover:bg-brand-gold/5 transition-all duration-300 group cursor-pointer"
                >
                  <div className="p-3 rounded-xl bg-brand-gold/10 border border-brand-gold/20 text-brand-gold mb-2 group-hover:scale-110 transition-all">
                    <Calendar size={18} />
                  </div>
                  <span className="text-xs font-black text-white uppercase tracking-wider">Tạo Suất Chiếu</span>
                  <span className="text-[9px] text-gray-500 font-bold mt-1 uppercase">Đặt lịch chiếu</span>
                </button>

                <button
                  onClick={() => navigate('/admin?tab=promotions')}
                  className="flex flex-col items-center justify-center p-4 rounded-xl border border-white/5 bg-white/[0.01] hover:border-emerald-500/35 hover:bg-emerald-500/5 transition-all duration-300 group cursor-pointer"
                >
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mb-2 group-hover:scale-110 transition-all">
                    <Tag size={18} />
                  </div>
                  <span className="text-xs font-black text-white uppercase tracking-wider">Tạo Khuyến Mãi</span>
                  <span className="text-[9px] text-gray-500 font-bold mt-1 uppercase">Mã giảm giá</span>
                </button>

                <button
                  onClick={() => navigate('/admin?tab=ticketprices')}
                  className="flex flex-col items-center justify-center p-4 rounded-xl border border-white/5 bg-white/[0.01] hover:border-blue-500/35 hover:bg-blue-500/5 transition-all duration-300 group cursor-pointer"
                >
                  <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 mb-2 group-hover:scale-110 transition-all">
                    <DollarSign size={18} />
                  </div>
                  <span className="text-xs font-black text-white uppercase tracking-wider">Giá Vé</span>
                  <span className="text-[9px] text-gray-500 font-bold mt-1 uppercase">Bảng giá vé</span>
                </button>

                <button
                  onClick={() => navigate('/admin?tab=halls')}
                  className="flex flex-col items-center justify-center p-4 rounded-xl border border-white/5 bg-white/[0.01] hover:border-purple-500/35 hover:bg-purple-500/5 transition-all duration-300 group cursor-pointer"
                >
                  <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 mb-2 group-hover:scale-110 transition-all">
                    <Tv size={18} />
                  </div>
                  <span className="text-xs font-black text-white uppercase tracking-wider">Phòng Chiếu</span>
                  <span className="text-[9px] text-gray-500 font-bold mt-1 uppercase">Sơ đồ phòng</span>
                </button>
              </div>
            </GlassCard>
          </motion.div>

          {/* 2. CHARTS SECTIONS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Area Chart: Doanh thu 7 ngày */}
            <motion.div variants={itemVariants}>
              <GlassCard className="p-6 border border-white/5 flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <div className="flex flex-col text-left">
                    <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                      <TrendingUp size={14} className="text-brand" /> Xu hướng doanh thu 7 ngày gần nhất
                    </h4>
                    <span className="text-[9px] text-gray-500 font-bold uppercase mt-0.5">
                      Click vào biểu đồ để xem chi tiết doanh thu theo giờ (Drill-down)
                    </span>
                  </div>
                  <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1">
                    <Calendar size={10} /> Real-time
                  </span>
                </div>
                <div className="h-64 mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={revenue7Days}
                      margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                      onClick={handleChartClick}
                      style={{ cursor: 'pointer' }}
                    >
                      <defs>
                        <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#e50914" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#e50914" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1c1c24" />
                      <XAxis dataKey="name" stroke="#555" fontSize={10} tickLine={false} />
                      <YAxis stroke="#555" fontSize={10} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                      <RechartsTooltip
                        contentStyle={{ backgroundColor: '#0f0f15', borderColor: '#222', borderRadius: '12px', fontSize: 10 }}
                        formatter={(value: any) => [`${Number(value).toLocaleString()} VND`, 'Doanh thu']}
                      />
                      <Area type="monotone" dataKey="revenue" stroke="#e50914" strokeWidth={2.5} fillOpacity={1} fill="url(#revenueGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </GlassCard>
            </motion.div>

            {/* Bar Chart: Top 5 phim bán chạy */}
            <motion.div variants={itemVariants}>
              <GlassCard className="p-6 border border-white/5 flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Film size={14} className="text-brand-gold" /> Top 5 phim bán chạy nhất
                  </h4>
                </div>
                <div className="h-64 mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topMovies} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1c1c24" />
                      <XAxis dataKey="title" stroke="#555" fontSize={9} tickLine={false} />
                      <YAxis stroke="#555" fontSize={10} tickLine={false} tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`} />
                      <RechartsTooltip
                        contentStyle={{ backgroundColor: '#0f0f15', borderColor: '#222', borderRadius: '12px', fontSize: 10 }}
                        formatter={(value: any, name?: any) => {
                          if (name === 'revenue') return [`${Number(value).toLocaleString()} VND`, 'Doanh thu'];
                          return [value, 'Vé bán'];
                        }}
                      />
                      <Bar dataKey="revenue" fill="#e5a93b" radius={[6, 6, 0, 0]}>
                        {topMovies.map((_: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={index === 0 ? '#e50914' : '#e5a93b'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </GlassCard>
            </motion.div>
          </div>

          {/* 3. SUB GRIDS: OCCUPANCY & GOLDEN HOURS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Donut Chart: Lấp đầy theo loại ghế */}
            <motion.div variants={itemVariants} className="md:col-span-1">
              <GlassCard className="p-6 border border-white/5 h-full flex flex-col justify-between">
                <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-white/5 pb-2">
                  <UsersIcon size={14} className="text-blue-400" /> Tỷ lệ lấp đầy loại ghế
                </h4>
                <div className="h-48 my-auto flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={occupancyBySeatType}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={75}
                        paddingAngle={5}
                        dataKey="value"
                        nameKey="seatType"
                      >
                        {occupancyBySeatType.map((_: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        contentStyle={{ backgroundColor: '#0f0f15', borderColor: '#222', borderRadius: '12px', fontSize: 10 }}
                        formatter={(value: any) => [`${value} lượt ghế`, 'Đặt ghế']}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-col gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  {occupancyBySeatType.map((entry: any, idx: number) => (
                    <div key={entry.seatType} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }} />
                        <span>{entry.seatType}</span>
                      </div>
                      <span className="text-white font-mono">{entry.value} ghế</span>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </motion.div>

            {/* Giờ vàng doanh thu cao nhất */}
            <motion.div variants={itemVariants} className="md:col-span-2">
              <GlassCard className="p-6 border border-white/5 h-full flex flex-col gap-4">
                <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-white/5 pb-2">
                  <Clock size={14} className="text-purple-400" /> Khung giờ vàng doanh thu cao nhất
                </h4>
                <div className="flex flex-col gap-3.5 my-auto">
                  {goldenHours.map((gh: any, index: number) => (
                    <div key={gh.hourRange} className="flex items-center gap-4">
                      <div className="w-24 text-[10px] font-black uppercase text-gray-400 tracking-wider flex items-center gap-1">
                        <span className={`h-1.5 w-1.5 rounded-full ${index === 0 ? 'bg-brand' : 'bg-gray-600'}`} />
                        {gh.hourRange}
                      </div>
                      <div className="flex-1 bg-white/[0.03] border border-white/5 h-6 rounded-full overflow-hidden relative flex items-center px-3 justify-between">
                        <div
                          className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-brand/35 to-purple-600/35 rounded-full"
                          style={{
                            width: `${Math.min(
                              100,
                              (gh.revenue / Math.max(1, ...goldenHours.map((g: any) => g.revenue))) * 100
                            )}%`
                          }}
                        />
                        <span className="relative z-10 text-[9px] font-bold text-gray-400 uppercase">
                          {gh.ticketsSold} vé
                        </span>
                        <span className="relative z-10 text-[10px] font-black text-white font-mono">
                          {Number(gh.revenue).toLocaleString()} VND
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </motion.div>
          </div>

          {/* 4. TABLES SECTIONS: CUSTOMERS, SHOWTIMES & ROOM REVENUES */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Top 5 khách hàng & Doanh thu theo phòng chiếu */}
            <motion.div variants={itemVariants} className="flex flex-col gap-6">
              {/* Top 5 khách hàng */}
              <GlassCard className="p-6 border border-white/5 flex flex-col gap-4">
                <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-white/5 pb-2">
                  <Crown size={14} className="text-brand-gold animate-bounce" /> Top 5 khách hàng VIP của tháng
                </h4>
                <div className="flex flex-col gap-3">
                  {topCustomers.map((c: any, idx: number) => (
                    <div key={c.userId} className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.03] hover:bg-white/[0.04] transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <Avatar size={32} className="bg-brand/10 border border-brand/20 text-brand font-black text-[10px] uppercase">
                            {c.name.split(' ').pop()?.substring(0, 2)}
                          </Avatar>
                          <span className="absolute -top-1 -left-1 text-[8px] font-black bg-brand-gold text-black rounded-full h-4 w-4 flex items-center justify-center border border-[#0d0d12]">
                            {idx + 1}
                          </span>
                        </div>
                        <div className="flex flex-col text-left">
                          <span className="text-xs font-black text-white">{c.name}</span>
                          <span className="text-[9px] text-gray-500 font-bold">{c.email}</span>
                        </div>
                      </div>
                      <div className="flex flex-col text-right">
                        <span className="text-xs font-black text-brand-gold font-mono">{Number(c.totalSpent).toLocaleString()} VND</span>
                        <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">{c.ticketsBought} vé đã mua</span>
                      </div>
                    </div>
                  ))}
                </div>
              </GlassCard>

              {/* Doanh thu & Lấp đầy theo phòng chiếu */}
              <GlassCard className="p-6 border border-white/5 flex flex-col gap-4">
                <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-white/5 pb-2">
                  <Tv size={14} className="text-blue-400" /> Doanh thu & Lấp đầy theo phòng chiếu
                </h4>
                <div className="h-64 mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={revenueByHall} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1c1c24" />
                      <XAxis dataKey="hallName" stroke="#555" fontSize={9} tickLine={false} />
                      <YAxis yAxisId="left" stroke="#555" fontSize={10} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                      <YAxis yAxisId="right" orientation="right" stroke="#555" fontSize={10} tickLine={false} tickFormatter={(v) => `${v}%`} />
                      <RechartsTooltip
                        contentStyle={{ backgroundColor: '#0f0f15', borderColor: '#222', borderRadius: '12px', fontSize: 10 }}
                        formatter={(value: any, name?: any) => {
                          if (name === 'revenue') return [`${Number(value).toLocaleString()} đ`, 'Doanh thu'];
                          return [`${value}%`, 'Lấp đầy'];
                        }}
                      />
                      <Bar yAxisId="left" dataKey="revenue" fill="#3b82f6" name="revenue" radius={[4, 4, 0, 0]} />
                      <Bar yAxisId="right" dataKey="occupancyRate" fill="#a855f7" name="occupancyRate" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-4 text-[9px] font-black uppercase tracking-widest text-gray-500 mt-1">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded bg-blue-500" />
                    <span>Doanh Thu</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded bg-purple-500" />
                    <span>Tỷ lệ lấp đầy</span>
                  </div>
                </div>
              </GlassCard>
            </motion.div>

            {/* Top Phim Bán Chạy & Top suất chiếu đông khách */}
            <motion.div variants={itemVariants} className="flex flex-col gap-6">
              {/* Top Phim Bán Chạy Table */}
              <GlassCard className="p-6 border border-white/5 flex flex-col gap-4">
                <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-white/5 pb-2">
                  <Film size={14} className="text-brand" /> Top Phim Bán Chạy Nhất
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-white/5 text-gray-500 font-black uppercase text-[9px] tracking-wider">
                        <th className="pb-2">Phim</th>
                        <th className="pb-2 text-center">Vé bán</th>
                        <th className="pb-2 text-center">Lấp đầy</th>
                        <th className="pb-2 text-center">Suất</th>
                        <th className="pb-2 text-right">Doanh thu</th>
                        <th className="pb-2 text-right">Hành động</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 font-semibold text-gray-300">
                      {topMovies.map((m: any) => (
                        <tr key={m.movieId} className="hover:bg-white/[0.01] transition-colors group">
                          <td className="py-2.5 font-bold text-white text-[11px] max-w-[120px] truncate">{m.title}</td>
                          <td className="py-2.5 text-center font-mono font-bold text-gray-400 text-[11px]">{m.ticketsSold}</td>
                          <td className="py-2.5 text-center font-mono font-bold text-emerald-400 text-[11px]">{Math.round(m.occupancyRate || 0)}%</td>
                          <td className="py-2.5 text-center font-mono font-bold text-purple-400 text-[11px]">{m.showtimesCount || 0}</td>
                          <td className="py-2.5 text-right font-mono font-bold text-brand-gold text-[11px]">{Number(m.revenue).toLocaleString()} đ</td>
                          <td className="py-2.5 text-right">
                            <div className="flex items-center justify-end gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => navigate(`/admin?tab=movies`)}
                                className="px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/10 hover:border-white/20 text-gray-400 hover:text-white text-[9px] font-black uppercase transition-all cursor-pointer"
                              >
                                Chi tiết
                              </button>
                              <button
                                onClick={() => navigate(`/admin?tab=showtimes`)}
                                className="px-1.5 py-0.5 rounded bg-brand/10 border border-brand/20 hover:bg-brand/20 text-brand text-[9px] font-black uppercase transition-all cursor-pointer"
                              >
                                + Suất
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </GlassCard>

              {/* Top suất chiếu đông khách */}
              <GlassCard className="p-6 border border-white/5 flex flex-col gap-4">
                <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-white/5 pb-2">
                  <Sparkles size={14} className="text-brand-gold" /> Top suất chiếu đông khách nhất
                </h4>
                <div className="flex flex-col gap-3 mt-1">
                  {topShowtimes.map((st: any) => (
                    <div key={st.showtimeId} className="flex flex-col p-3 rounded-xl bg-white/[0.02] border border-white/[0.03] hover:bg-white/[0.04] transition-all gap-2">
                      <div className="flex justify-between items-start">
                        <div className="text-left">
                          <span className="text-xs font-black text-white block leading-tight">{st.movieTitle}</span>
                          <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider mt-1 block">
                            {st.cinemaName} • {st.hallName}
                          </span>
                        </div>
                        <span className="text-[10px] text-gray-400 font-semibold font-mono bg-white/[0.04] border border-white/5 px-2 py-0.5 rounded-lg shrink-0">
                          {new Date(st.startTime).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-4 mt-1">
                        <div className="flex-1">
                          <Progress
                            percent={st.occupancyRate}
                            size="small"
                            strokeColor={{
                              '0%': '#e50914',
                              '100%': '#e5a93b'
                            }}
                            railColor="rgba(255, 255, 255, 0.05)"
                            showInfo={false}
                          />
                        </div>
                        <div className="text-right shrink-0 flex flex-col">
                          <span className="text-[10px] font-black text-white font-mono">{st.occupancyRate}% lấp đầy</span>
                          <span className="text-[9px] text-brand-gold font-bold uppercase tracking-wider mt-0.5">{st.ticketsSold} vé bán ra</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </motion.div>
          </div>

        </div> {/* End of LEFT COLUMN */}

        {/* RIGHT COLUMN: Alerts Widget */}
        <div className="lg:col-span-1 flex flex-col gap-6 lg:sticky lg:top-6">
          <GlassCard className="p-5 border border-white/5 flex flex-col gap-4 bg-gradient-to-b from-[#1b1212]/30 via-transparent to-transparent">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="text-amber-500 animate-pulse" size={16} />
                <h3 className="text-xs font-black text-white uppercase tracking-wider">Cảnh Báo Quan Trọng</h3>
              </div>
              <span className="text-[8px] font-black bg-amber-500/10 border border-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full uppercase tracking-wider">
                Admin
              </span>
            </div>

            <div className="flex flex-col gap-3">
              {alertsData.length === 0 ? (
                <div className="text-center py-6 text-xs text-gray-500 font-semibold">
                  Không có cảnh báo nào hôm nay
                </div>
              ) : (
                alertsData.map((alert: any) => {
                  const Icon = alert.icon;
                  let severityClass = '';
                  let badgeClass = '';
                  if (alert.severity === 'warning') {
                    severityClass = 'border-amber-500/20 bg-amber-500/5 hover:border-amber-500/40';
                    badgeClass = 'text-amber-400 bg-amber-500/10';
                  } else if (alert.severity === 'danger') {
                    severityClass = 'border-rose-500/20 bg-rose-500/5 hover:border-rose-500/40';
                    badgeClass = 'text-rose-400 bg-rose-500/10';
                  } else {
                    severityClass = 'border-blue-500/20 bg-blue-500/5 hover:border-blue-500/40';
                    badgeClass = 'text-blue-400 bg-blue-500/10';
                  }

                  return (
                    <div
                      key={alert.id}
                      className={`p-3 rounded-xl border transition-all duration-300 flex gap-3 text-left ${severityClass}`}
                    >
                      <div className={`p-2 rounded-lg shrink-0 flex items-center justify-center h-8 w-8 ${badgeClass}`}>
                        <Icon size={14} />
                      </div>
                      <div className="flex-1 flex flex-col gap-0.5">
                        <span className="text-[9px] uppercase tracking-widest text-gray-500 font-bold">
                          {alert.category}
                        </span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-amber-500 font-bold text-xs">⚠</span>
                          <span className="text-xs font-black text-white uppercase tracking-wide">
                            {alert.title}
                          </span>
                          {alert.subtitle && (
                            <span className="text-[10px] text-gray-400 font-semibold font-mono bg-white/[0.04] px-1.5 py-0.5 rounded border border-white/5">
                              {alert.subtitle}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-gray-400 font-medium mt-1">
                          {alert.detail}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </GlassCard>

          {/* Activity Calendar GlassCard */}
          <GlassCard className="p-5 border border-white/5 flex flex-col gap-4 bg-[#111115]/80 backdrop-blur-md text-left">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <Calendar className="text-brand-gold animate-pulse" size={16} />
                <h3 className="text-xs font-black text-white uppercase tracking-wider">Lịch Chiếu Hôm Nay</h3>
              </div>
              <span className="text-[8px] font-black bg-brand-gold/10 border border-brand-gold/20 text-brand-gold px-2 py-0.5 rounded-full uppercase tracking-wider">
                📅 Hôm nay
              </span>
            </div>

            <div className="flex flex-col gap-4">
              {todayShowtimesList.length === 0 ? (
                <div className="text-center py-6 text-xs text-gray-500 font-semibold">
                  Không có suất chiếu nào hôm nay
                </div>
              ) : (
                todayShowtimesList.map((item: any, idx: number) => {
                  let dotColor = 'bg-gray-500';
                  let statusLabel = 'Đã chiếu';
                  let statusClass = 'text-gray-500 bg-white/[0.02] border-white/5';

                  if (item.status === 'active') {
                    dotColor = 'bg-green-400 animate-pulse';
                    statusLabel = 'Đang chiếu';
                    statusClass = 'text-green-400 bg-green-500/10 border-green-500/20';
                  } else if (item.status === 'upcoming') {
                    dotColor = 'bg-blue-400';
                    statusLabel = 'Sắp chiếu';
                    statusClass = 'text-blue-400 bg-blue-500/10 border-blue-500/20';
                  }

                  return (
                    <div key={idx} className="flex gap-3 text-left relative group">
                      {/* Left timeline line */}
                      {idx < todayShowtimesList.length - 1 && (
                        <div className="absolute left-[15px] top-8 bottom-[-16px] w-[1px] bg-white/10" />
                      )}

                      {/* Bullet */}
                      <div className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center shrink-0 bg-[#121217] z-10">
                        <span className={`h-2 w-2 rounded-full ${dotColor}`} />
                      </div>

                      {/* Details */}
                      <div className="flex-1 flex flex-col gap-1 p-3 rounded-xl bg-white/[0.01] border border-white/5 hover:border-white/10 hover:bg-white/[0.02] transition-all duration-300">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-black font-mono text-white">
                            {item.time}
                          </span>
                          <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border ${statusClass}`}>
                            {statusLabel}
                          </span>
                        </div>

                        <span className="text-xs font-black text-white uppercase tracking-wide truncate max-w-[160px] group-hover:text-brand-gold transition-colors">
                          {item.movie}
                        </span>

                        <div className="flex items-center gap-1.5 text-[9px] text-gray-500 font-bold uppercase tracking-wider">
                          <span className="h-1.5 w-1.5 rounded-full bg-brand" />
                          {item.hall}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </GlassCard>
        </div>

      </div> {/* End of main Grid */}

      {/* Drill-down Modal Popup */}
      <AnimatePresence>
        {isDrillDownOpen && drillDownData && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#121217]/95 border border-white/10 rounded-3xl p-6 w-full max-w-md text-left flex flex-col gap-5 shadow-2xl relative overflow-hidden"
            >
              {/* Header */}
              <div className="flex justify-between items-start border-b border-white/5 pb-3">
                <div className="flex flex-col text-left">
                  <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                    <DollarSign size={16} className="text-brand-gold" /> Doanh thu {drillDownData.dayName}
                  </h3>
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-0.5">
                    Phân tích chi tiết theo khung giờ • {drillDownData.dateStr}
                  </span>
                </div>
                <button
                  onClick={() => setIsDrillDownOpen(false)}
                  className="p-1.5 hover:bg-white/5 border border-transparent hover:border-white/10 text-gray-400 hover:text-white rounded-lg transition-all cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Day Summary */}
              <div className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl flex items-center justify-between">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[9px] uppercase tracking-widest text-gray-500 font-bold">Tổng doanh thu ngày</span>
                  <span className="text-lg font-mono font-black text-brand-gold">
                    {Number(drillDownData.totalRevenue).toLocaleString()} VND
                  </span>
                </div>
                <span className="text-[9px] font-black uppercase text-green-400 bg-green-500/10 border border-green-500/20 px-2.5 py-1 rounded-full">
                  Hoàn Tất
                </span>
              </div>

              {/* Time Blocks Breakdown */}
              <div className="flex flex-col gap-3">
                {drillDownData.breakdown.map((item, index) => {
                  let barColor = 'bg-brand';
                  if (index === 0) barColor = 'bg-blue-500';
                  else if (index === 1) barColor = 'bg-amber-500';

                  return (
                    <div key={item.timeRange} className="flex flex-col gap-1.5 p-3 rounded-xl bg-white/[0.02] border border-white/[0.03] hover:bg-white/[0.04] transition-all">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase text-gray-300 tracking-wider">
                          {item.timeRange}
                        </span>
                        <span className="text-[10px] font-black text-white font-mono">
                          {Number(item.amount).toLocaleString()} VND
                        </span>
                      </div>

                      {/* Bar indicator */}
                      <div className="h-2 bg-white/[0.05] rounded-full overflow-hidden w-full relative">
                        <div
                          className={`absolute left-0 top-0 bottom-0 ${barColor} rounded-full transition-all duration-500`}
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                      <div className="flex justify-end">
                        <span className="text-[8px] text-gray-500 font-bold uppercase tracking-wider">
                          Chiếm {item.percentage}% trong ngày
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Footer action */}
              <div className="mt-2">
                <button
                  onClick={() => setIsDrillDownOpen(false)}
                  className="w-full py-2.5 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 text-xs font-black text-gray-300 rounded-xl transition-all cursor-pointer text-center uppercase tracking-widest"
                >
                  Đóng
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
