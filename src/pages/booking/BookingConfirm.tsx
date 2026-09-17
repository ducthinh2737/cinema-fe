import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { motion } from 'framer-motion';
import {
  ChevronLeft,
  Info,
  ShieldAlert,
  Loader2,
  ArrowRight,
  ShieldCheck,
  Film,
  Ticket,
  Utensils,
  CreditCard
} from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { apiClient, getImageUrl } from '../../api/client';
import { clearBooking } from '../../store/bookingSlice';
import type { Cinema, OrderCombo } from '../../types';
import { BookingTimer } from '../../components/booking/BookingTimer';
import { parseApiDate } from '../../utils/dateHelpers';

interface RootState {
  booking: {
    selectedShowtime: any;
    selectedSeats: any[];
    appliedVoucher: any;
    serviceFee: number;
    discountAmount: number;
    pointsRedeemed: number | null;
    pointsDiscountAmount: number;
    totalAmount: number;
    bookingId: number | null;
    bookingCode: string | null;
    combos: OrderCombo[];
  };
}

const FLOW_STEPS = [
  { label: 'Chọn ghế' },
  { label: 'Chọn bắp nước' },
  { label: 'Áp dụng Voucher' },
  { label: 'Xác nhận đơn' },
  { label: 'Thanh toán' },
] as const;

const CURRENT_STEP_INDEX = 3; // "Xác nhận đơn"

export const BookingConfirm: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();
  const queryBookingId = searchParams.get('bookingId');

  // Redux state
  const bookingState = useSelector((state: RootState) => state.booking);
  const {
    selectedShowtime: reduxShowtime,
    selectedSeats: reduxSeats,
    appliedVoucher: reduxVoucher,
    serviceFee: reduxServiceFee,
    discountAmount: reduxDiscountAmount,
    pointsRedeemed: reduxPointsRedeemed,
    pointsDiscountAmount: reduxPointsDiscountAmount,
    totalAmount: reduxTotalAmount,
    bookingId: reduxBookingId,
    combos: reduxCombos
  } = bookingState;

  // Local state fallbacks for restoration from query params
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [localShowtime, setLocalShowtime] = useState<any>(null);
  const [localSeats, setLocalSeats] = useState<any[]>([]);
  const [localServiceFee, setLocalServiceFee] = useState<number>(5000);
  const [localBookingId, setLocalBookingId] = useState<number | null>(null);
  const [localTotalAmount, setLocalTotalAmount] = useState<number>(0);
  const [localDiscountAmount, setLocalDiscountAmount] = useState<number>(0);
  const [localPointsDiscountAmount, setLocalPointsDiscountAmount] = useState<number>(0);
  const [localPointsRedeemed, setLocalPointsRedeemed] = useState<number | null>(null);
  const [localPromoCode, setLocalPromoCode] = useState<string | null>(null);
  const [localCombos, setLocalCombos] = useState<any[]>([]);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(360);

  const [cinema, setCinema] = useState<Cinema | null>(null);
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Active variables mapped dynamically
  const bookingId = queryBookingId ? localBookingId : reduxBookingId;
  const selectedShowtime = queryBookingId ? localShowtime : reduxShowtime;
  const selectedSeats = queryBookingId ? localSeats : reduxSeats;
  const serviceFee = queryBookingId ? localServiceFee : reduxServiceFee;
  const totalAmount = queryBookingId ? localTotalAmount : reduxTotalAmount;
  const discountAmount = queryBookingId ? localDiscountAmount : reduxDiscountAmount;
  const pointsDiscountAmount = queryBookingId ? localPointsDiscountAmount : reduxPointsDiscountAmount;
  const pointsRedeemed = queryBookingId ? localPointsRedeemed : reduxPointsRedeemed;
  const appliedVoucher = queryBookingId ? (localPromoCode ? { promoCode: localPromoCode } : null) : reduxVoucher;
  const combos = queryBookingId ? localCombos : reduxCombos;

  // Currency Formatter
  const currencyFormatter = new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'
  });

  // Calculate ticket price total
  const ticketTotal = selectedSeats.reduce((sum, s) => sum + (s.price || 0), 0);
  const combosTotal = combos.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // Fetch Booking Details to restore / sync
  useEffect(() => {
    const fetchBookingDetails = async () => {
      const activeId = queryBookingId || reduxBookingId;
      if (!activeId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setErrorMsg(null);
      try {
        const res = await apiClient.get<any>(`/bookings/${activeId}`);
        const bookingData = res.data?.data ?? res.data;

        if (!bookingData) {
          setErrorMsg('Không tìm thấy thông tin đơn hàng.');
          return;
        }

        if (bookingData.bookingStatus === 'Confirmed' || bookingData.bookingStatus === 'Paid' || bookingData.bookingStatus === 'CheckedIn') {
          showToast('Đơn đặt vé này đã được thanh toán.', 'success');
          navigate(`/payment-result?bookingId=${bookingData.bookingId}`);
          return;
        }

        if (bookingData.bookingStatus === 'Cancelled') {
          setErrorMsg('Đơn đặt vé này đã bị hủy hoặc hết hạn.');
          return;
        }

        // Map showtime
        const showtime = bookingData.showtime || {
          showtimeId: bookingData.showtimeId || 0,
          startTime: bookingData.startTime,
          cinemaName: bookingData.cinemaName,
          hallName: bookingData.hallName,
          movieId: bookingData.movieId,
          hall: {
            name: bookingData.hallName,
            hallTypeName: '2D'
          },
          movie: {
            id: bookingData.movieId,
            title: bookingData.movieTitle,
            duration: bookingData.movieDuration,
            posterUrl: bookingData.moviePosterUrl,
            language: 'Tiếng Việt'
          }
        };

        // Map seats
        const seats = bookingData.bookingSeats?.map((bs: any) => ({
          seatId: bs.seatId || bs.seat?.seatId || Math.random(),
          rowName: bs.seat?.rowName || bs.rowName || '',
          seatNumber: bs.seat?.seatNumber || bs.seatNumber || 0,
          seatTypeName: bs.seat?.seatTypeName || bs.seatTypeName || 'Standard',
          price: bs.seat?.price || bs.price || 75000
        })) || [];

        // Map combos
        const comboList = bookingData.combos?.map((c: any) => ({
          comboId: c.comboId,
          comboName: c.comboName,
          quantity: c.quantity,
          price: c.price
        })) || [];

        setLocalShowtime(showtime);
        setLocalSeats(seats);
        setLocalBookingId(bookingData.bookingId);
        setLocalServiceFee(bookingData.serviceFee);
        setLocalTotalAmount(bookingData.totalAmount);
        setLocalDiscountAmount(bookingData.discountAmount || 0);
        setLocalPointsDiscountAmount(bookingData.pointsDiscountAmount || 0);
        setLocalPointsRedeemed(bookingData.pointsRedeemed || null);
        setLocalPromoCode(bookingData.voucher?.promoCode || null);
        setLocalCombos(comboList);

        // Calculate remaining seconds
        const createdTime = parseApiDate(bookingData.createdAt).getTime();
        const now = new Date().getTime();
        const elapsedSeconds = Math.floor((now - createdTime) / 1000);
        const remaining = Math.max(0, 600 - elapsedSeconds);
        setRemainingSeconds(remaining);
      } catch (err) {
        console.error('Failed to load booking details', err);
        setErrorMsg('Không thể tải thông tin đặt vé. Vui lòng thử lại.');
      } finally {
        setLoading(false);
      }
    };

    fetchBookingDetails();
  }, [queryBookingId, reduxBookingId]);

  // Redirect if no active session
  useEffect(() => {
    if (!loading && !bookingId) {
      showToast('Không tìm thấy phiên đặt vé hoạt động.', 'warning');
      navigate('/');
    }
  }, [bookingId, loading, navigate]);

  // Fetch Cinema details
  useEffect(() => {
    const fetchCinema = async () => {
      const cinemaId = selectedShowtime?.cinemaId || selectedShowtime?.hall?.cinemaId;
      if (cinemaId) {
        try {
          const res = await apiClient.get<any>(`/cinemas/${cinemaId}`);
          const cinemaData = res.data?.data ?? res.data;
          setCinema(cinemaData);
        } catch (err) {
          console.error("Failed to load cinema specs", err);
        }
      }
    };
    fetchCinema();
  }, [selectedShowtime]);

  const handleTimerExpire = () => {
    showToast('Thời gian giữ ghế đã hết hạn. Vui lòng chọn ghế lại.', 'error');
    if (bookingId) {
      apiClient.post('/bookings/cancel', { bookingId }).catch(console.error);
    }
    dispatch(clearBooking());
    navigate('/');
  };

  const handleProceedToPayment = () => {
    if (!agreedTerms) {
      showToast('Vui lòng đồng ý với các điều khoản điều kiện để tiếp tục.', 'warning');
      return;
    }
    setProcessing(true);
    setTimeout(() => {
      setProcessing(false);
      navigate(`/payment${queryBookingId ? `?bookingId=${bookingId}` : ''}`);
    }, 600);
  };

  const formatDate = (dateStr: string) => {
    return parseApiDate(dateStr).toLocaleDateString('vi-VN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (dateStr: string) => {
    return parseApiDate(dateStr).toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center gap-3 bg-[#07070a] text-gray-200">
        <Loader2 size={36} className="text-brand animate-spin" />
        <span className="text-xs text-gray-500 font-extrabold uppercase tracking-widest">Đang tải thông tin...</span>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="max-w-md mx-auto px-6 py-24 text-center flex flex-col items-center gap-6 bg-[#07070a] text-gray-200 min-h-screen justify-center">
        <div className="p-3.5 bg-brand/10 border border-brand/20 text-brand rounded-full">
          <ShieldAlert size={32} />
        </div>
        <div>
          <h2 className="text-xl font-black text-white tracking-wide uppercase">Thông tin lỗi</h2>
          <p className="text-xs text-gray-400 mt-2">{errorMsg}</p>
        </div>
        <Link to="/" className="px-6 py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all">
          Quay lại Trang Chủ
        </Link>
      </div>
    );
  }

  if (!bookingId || !selectedShowtime) return null;

  return (
    <div className="min-h-screen pb-24 text-left select-none">
      
      {/* Header Panel */}
      <div className="relative border-b border-white/5 py-8 bg-gradient-to-b from-[#07070a] to-transparent">
        <div className="max-w-6xl mx-auto px-4 md:px-8 flex flex-col gap-6">

          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate(-1)}
                  className="p-1.5 hover:bg-white/5 rounded-lg border border-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer mr-1"
                >
                  <ChevronLeft size={16} />
                </button>
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-gray-500">
                    Bước 4/5 &middot; Xác nhận đơn hàng
                  </span>
                  <h1 className="text-2xl font-black text-white uppercase tracking-wider flex items-center gap-2 mt-1">
                    <ShieldCheck className="text-emerald-500" size={24} /> Xác nhận chi tiết đơn hàng
                  </h1>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2 pl-9">Vui lòng kiểm tra kỹ toàn bộ thông tin suất chiếu, ghế ngồi, và bắp nước trước khi tiến hành thanh toán.</p>
            </div>

            <BookingTimer initialSeconds={remainingSeconds} onExpire={handleTimerExpire} />
          </div>

          {/* Flow Stepper */}
          <div className="flex items-center w-full max-w-md pl-9">
            {FLOW_STEPS.map((step, idx) => {
              const isDone = idx < CURRENT_STEP_INDEX;
              const isActive = idx === CURRENT_STEP_INDEX;
              return (
                <React.Fragment key={step.label}>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div
                      className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-black ${isDone
                        ? 'bg-emerald-500 text-emerald-950'
                        : isActive
                          ? 'bg-brand-gold text-black animate-pulse'
                          : 'bg-white/5 text-gray-500'
                        }`}
                    >
                      {isDone ? '✓' : idx + 1}
                    </div>
                    <span className={`text-[11px] font-bold whitespace-nowrap ${isActive ? 'text-white' : isDone ? 'text-gray-400' : 'text-gray-600'}`}>
                      {step.label}
                    </span>
                  </div>
                  {idx < FLOW_STEPS.length - 1 && (
                    <div className={`h-px flex-grow mx-3 ${isDone ? 'bg-emerald-500/60' : 'bg-white/10'}`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Grid Content */}
      <div className="max-w-6xl mx-auto px-4 md:px-8 mt-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Full Order Breakdown */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          {/* Showtime card details */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#0f0f13]/40 border border-white/5 rounded-3xl p-6 shadow-glass backdrop-blur-sm flex flex-col md:flex-row gap-6 relative"
          >
            <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-brand-gold/5 blur-2xl pointer-events-none" />
            <div className="h-36 w-24 rounded-2xl overflow-hidden flex-shrink-0 border border-white/10 shadow-lg bg-white/5">
              <img
                src={getImageUrl(selectedShowtime.movie?.posterUrl) || 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?q=80&w=200'}
                alt={selectedShowtime.movie?.title}
                className="h-full w-full object-cover"
              />
            </div>
            
            <div className="flex flex-col justify-center text-left">
              <span className="text-[10px] bg-brand/15 border border-brand/35 text-brand font-black uppercase px-2.5 py-1 rounded w-max tracking-wider">
                {selectedShowtime.hall?.hallTypeName || '2D'} DIGITAL
              </span>
              <h2 className="text-xl font-black text-white mt-3 uppercase tracking-wider">{selectedShowtime.movie?.title}</h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 mt-4 text-xs text-gray-400 font-semibold">
                <p className="flex items-center gap-2"><Film size={14} className="text-gray-500" /> {selectedShowtime.movie?.duration} phút</p>
                <p className="flex items-center gap-2"><strong className="text-brand-gold font-bold">Rạp:</strong> {cinema?.cinemaName || selectedShowtime.cinemaName}</p>
                <p className="flex items-center gap-2"><strong className="text-brand-gold font-bold">Phòng chiếu:</strong> {selectedShowtime.hallName || selectedShowtime.hall?.name}</p>
                <p className="flex items-center gap-2"><strong className="text-brand-gold font-bold">Thời gian:</strong> {formatTime(selectedShowtime.startTime)} &middot; {formatDate(selectedShowtime.startTime)}</p>
              </div>
            </div>
          </motion.div>

          {/* Seats details list */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="bg-[#0f0f13]/40 border border-white/5 rounded-3xl p-6 shadow-glass backdrop-blur-sm"
          >
            <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2.5 mb-4">
              <Ticket size={16} className="text-emerald-400" />
              Chi tiết ghế ngồi ({selectedSeats.length})
            </h3>
            
            <div className="flex flex-col gap-2.5 max-h-48 overflow-y-auto pr-2">
              {selectedSeats.map((seat) => (
                <div key={seat.seatId} className="flex justify-between items-center bg-white/[0.02] border border-white/5 px-4 py-2.5 rounded-xl">
                  <div className="flex items-center gap-3">
                    <span className="h-6 w-12 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-black flex items-center justify-center uppercase">
                      {seat.rowName}{seat.seatNumber}
                    </span>
                    <span className="text-[11px] text-gray-400 font-bold uppercase">{seat.seatTypeName || 'Standard Seat'}</span>
                  </div>
                  <span className="text-xs font-black text-white font-mono">{currencyFormatter.format(seat.price)}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Combos list details if exists */}
          {combos.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-[#0f0f13]/40 border border-white/5 rounded-3xl p-6 shadow-glass backdrop-blur-sm"
            >
              <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2.5 mb-4">
                <Utensils size={16} className="text-brand-gold" />
                Combo bắp nước concession
              </h3>

              <div className="flex flex-col gap-2.5">
                {combos.map((item) => (
                  <div key={item.comboId} className="flex justify-between items-center bg-white/[0.02] border border-white/5 px-4 py-3 rounded-xl">
                    <div>
                      <span className="text-xs font-black text-white uppercase">{item.comboName}</span>
                      <span className="text-[10px] text-gray-500 block mt-0.5">Số lượng: {item.quantity} x {currencyFormatter.format(item.price)}</span>
                    </div>
                    <span className="text-xs font-black text-brand-gold font-mono">{currencyFormatter.format(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Terms Agreement Checkbox Box */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-white/[0.02] border border-white/5 rounded-2xl p-5"
          >
            <label className="flex items-start gap-3 text-xs font-bold text-gray-300 cursor-pointer select-none leading-relaxed">
              <input
                type="checkbox"
                checked={agreedTerms}
                onChange={(e) => setAgreedTerms(e.target.checked)}
                className="mt-0.5 rounded border-white/10 bg-white/5 text-brand focus:ring-0 cursor-pointer h-4.5 w-4.5 shrink-0"
              />
              <div>
                <span>Tôi đồng ý với các điều khoản điều kiện giao dịch mua vé của Beta Cinemas. Vé đã mua không thể quy đổi, hoàn trả hoặc hủy dưới mọi hình thức.</span>
              </div>
            </label>
          </motion.div>
        </div>

        {/* Right Column: Pricing Breakdown & Payment Trigger */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-1.5">
            <CreditCard size={12} className="text-brand-gold" />
            Tóm Tắt Thanh Toán
          </h3>

          <div className="bg-background-card/25 border border-white/5 rounded-3xl p-6 backdrop-blur-xl shadow-glass flex flex-col gap-5 text-left">
            <div className="flex flex-col gap-3.5 text-xs pb-4 border-b border-white/5">
              <div className="flex justify-between">
                <span className="text-gray-400 font-medium">Tổng giá vé</span>
                <span className="text-white font-bold">{currencyFormatter.format(ticketTotal)}</span>
              </div>

              {combos.length > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-400 font-medium">Tổng bắp nước</span>
                  <span className="text-white font-bold">{currencyFormatter.format(combosTotal)}</span>
                </div>
              )}

              <div className="flex justify-between">
                <span className="text-gray-400 font-medium">Phí dịch vụ</span>
                <span className="text-white font-bold">{currencyFormatter.format(serviceFee)}</span>
              </div>

              {appliedVoucher && (
                <div className="flex justify-between text-emerald-400 font-bold">
                  <span>Voucher giảm giá</span>
                  <span>-{currencyFormatter.format(discountAmount)}</span>
                </div>
              )}

              {pointsRedeemed && pointsRedeemed > 0 ? (
                <div className="flex justify-between text-green-400 font-bold">
                  <span>Điểm thành viên ({pointsRedeemed}đ)</span>
                  <span>-{currencyFormatter.format(pointsDiscountAmount)}</span>
                </div>
              ) : null}
            </div>

            <div className="flex justify-between items-baseline pt-2">
              <span className="text-sm font-black text-white uppercase tracking-wider">Tổng cộng</span>
              <span className="text-xl font-black text-brand-gold font-mono">{currencyFormatter.format(totalAmount)}</span>
            </div>

            <button
              onClick={handleProceedToPayment}
              disabled={processing || !agreedTerms}
              className="w-full bg-brand-gold hover:bg-brand-gold/90 disabled:bg-gray-800 text-black disabled:text-gray-600 font-black py-4 rounded-2xl transition-all duration-300 shadow-[0_0_20px_rgba(229,169,59,0.25)] flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed text-sm uppercase tracking-wider"
            >
              {processing ? (
                <>
                  <Loader2 size={16} className="animate-spin text-black" />
                  Đang chuyển tiếp...
                </>
              ) : (
                <>
                  Thanh Toán Ngay
                  <ArrowRight size={14} />
                </>
              )}
            </button>

            <div className="flex items-start gap-2 bg-white/[0.01] border border-white/5 rounded-xl px-3 py-2.5 text-[10px] text-gray-500 leading-normal font-medium">
              <Info size={12} className="text-gray-600 shrink-0 mt-0.5" />
              <span>Bằng việc nhấp "Thanh toán ngay", bạn đồng ý chuyển hướng đến trang quét mã VietQR để thực hiện giao dịch.</span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
