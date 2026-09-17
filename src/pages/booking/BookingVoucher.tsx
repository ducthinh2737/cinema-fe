import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { motion } from 'framer-motion';
import {
  Tag,
  ChevronLeft,
  Info,
  ShieldAlert,
  Loader2,
  ArrowRight,
  Gift,
  Coins,
  X,
  CheckCircle2
} from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { apiClient } from '../../api/client';
import {
  clearBooking,
  updateTotalAmount,
  applyVoucherSuccess,
  removeVoucher,
  applyPointsSuccess,
  removePoints
} from '../../store/bookingSlice';
import type { Cinema, OrderCombo } from '../../types';
import { parseApiDate } from '../../utils/dateHelpers';
import { BookingSummary } from '../../components/booking/BookingSummary';
import { BookingTimer } from '../../components/booking/BookingTimer';

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

const CURRENT_STEP_INDEX = 2; // "Áp dụng Voucher"

export const BookingVoucher: React.FC = () => {
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
    bookingId: reduxBookingId,
    combos: reduxCombos
  } = bookingState;

  // Local state
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [localShowtime, setLocalShowtime] = useState<any>(null);
  const [localSeats, setLocalSeats] = useState<any[]>([]);
  const [localServiceFee, setLocalServiceFee] = useState<number>(5000);
  const [localBookingId, setLocalBookingId] = useState<number | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(360);

  const [cinema, setCinema] = useState<Cinema | null>(null);
  const [applyingDiscount, setApplyingDiscount] = useState(false);

  // Inputs
  const [promoCodeInput, setPromoCodeInput] = useState(reduxVoucher?.promoCode || '');
  const [pointsInput, setPointsInput] = useState(reduxPointsRedeemed ? String(reduxPointsRedeemed) : '');
  const [usePoints, setUsePoints] = useState(!!reduxPointsRedeemed);
  const [memberPoints, setMemberPoints] = useState<number>(0);
  const [pointsError, setPointsError] = useState<string | null>(null);

  // Active variables mapped dynamically
  const bookingId = queryBookingId ? localBookingId : reduxBookingId;
  const selectedShowtime = queryBookingId ? localShowtime : reduxShowtime;
  const selectedSeats = queryBookingId ? localSeats : reduxSeats;
  const serviceFee = queryBookingId ? localServiceFee : reduxServiceFee;

  // Currency Formatter
  const currencyFormatter = new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'
  });

  // Calculate ticket total
  const ticketTotal = selectedSeats.reduce((sum, s) => sum + (s.price || 0), 0);
  const combosTotal = reduxCombos.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const baseTotal = ticketTotal + serviceFee + combosTotal;
  const maxPointsDiscount = Math.floor((baseTotal - reduxDiscountAmount) * 0.5);

  // Fetch Loyalty Points on load
  useEffect(() => {
    apiClient.get('/loyalty/dashboard')
      .then(res => {
        const data = res.data?.data ?? res.data;
        if (data) {
          setMemberPoints(data.loyaltyPoints ?? 0);
        }
      })
      .catch(err => console.error("Error loading member points", err));
  }, []);

  // Validate points input
  useEffect(() => {
    if (!usePoints) {
      setPointsError(null);
      return;
    }

    if (!pointsInput) {
      setPointsError('Vui lòng nhập số điểm muốn sử dụng.');
      return;
    }

    const parsedPoints = parseInt(pointsInput) || 0;
    if (isNaN(parsedPoints) || parsedPoints <= 0) {
      setPointsError('Số điểm phải là số nguyên dương.');
      return;
    }

    if (parsedPoints < 10) {
      setPointsError('Mỗi lần quy đổi tối thiểu phải tiêu 10 điểm.');
      return;
    }

    if (parsedPoints > memberPoints) {
      setPointsError(`Số dư điểm của bạn không đủ (Hiện có: ${memberPoints} điểm).`);
      return;
    }

    const discountValue = parsedPoints * 1000;
    if (discountValue > maxPointsDiscount) {
      setPointsError(`Tối đa chỉ được giảm 50% đơn hàng còn lại (Giảm tối đa: ${currencyFormatter.format(maxPointsDiscount)}).`);
      return;
    }

    setPointsError(null);
  }, [usePoints, pointsInput, memberPoints, baseTotal, reduxDiscountAmount, maxPointsDiscount]);

  // Fetch booking details
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

        setLocalShowtime(showtime);
        setLocalSeats(seats);
        setLocalBookingId(bookingData.bookingId);
        setLocalServiceFee(bookingData.serviceFee);

        // Prepopulate applied values if editing/restoring
        if (bookingData.voucher) {
          dispatch(applyVoucherSuccess({
            promoCode: bookingData.voucher.promoCode,
            discountValue: bookingData.discountAmount,
            discountType: 'Fixed',
            discountAmount: bookingData.discountAmount
          }));
          setPromoCodeInput(bookingData.voucher.promoCode);
        }

        if (bookingData.pointsRedeemed) {
          dispatch(applyPointsSuccess({
            pointsRedeemed: bookingData.pointsRedeemed,
            pointsDiscountAmount: bookingData.pointsDiscountAmount || (bookingData.pointsRedeemed * 1000)
          }));
          setPointsInput(String(bookingData.pointsRedeemed));
          setUsePoints(true);
        }

        dispatch(updateTotalAmount(bookingData.totalAmount));

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

  // Fetch Cinema Details
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

  // Timer Expiration
  const handleTimerExpire = () => {
    showToast('Thời gian giữ ghế đã hết hạn. Vui lòng chọn ghế lại.', 'error');
    if (bookingId) {
      apiClient.post('/bookings/cancel', { bookingId }).catch(console.error);
    }
    dispatch(clearBooking());
    navigate('/');
  };

  // Call backend to apply discount / loyalty points
  const handleApplyDiscount = async () => {
    if (!bookingId) return;
    if (usePoints && pointsError) {
      showToast('Yêu cầu quy đổi điểm thành viên không hợp lệ.', 'warning');
      return;
    }

    setApplyingDiscount(true);
    try {
      const promoCode = promoCodeInput.trim() || null;
      const pointsToRedeem = usePoints ? (parseInt(pointsInput) || null) : null;

      const response = await apiClient.post(`/bookings/${bookingId}/apply-discount`, {
        promoCode,
        pointsToRedeem
      });

      const responseData = response.data?.data ?? response.data;

      // Update Redux state
      if (responseData.voucher) {
        dispatch(applyVoucherSuccess({
          promoCode: responseData.voucher.promoCode,
          discountValue: responseData.discountAmount,
          discountType: 'Fixed',
          discountAmount: responseData.discountAmount
        }));
      } else {
        dispatch(removeVoucher());
      }

      if (responseData.pointsRedeemed) {
        dispatch(applyPointsSuccess({
          pointsRedeemed: responseData.pointsRedeemed,
          pointsDiscountAmount: responseData.pointsDiscountAmount
        }));
      } else {
        dispatch(removePoints());
      }

      dispatch(updateTotalAmount(responseData.totalAmount));
      showToast('Đã cập nhật ưu đãi thành công!', 'success');

      // Navigate to Confirmation page
      navigate(`/booking-confirm${queryBookingId ? `?bookingId=${bookingId}` : ''}`);
    } catch (err: any) {
      const msg = err.response?.data?.Message || err.response?.data?.message || 'Có lỗi xảy ra khi áp dụng ưu đãi.';
      showToast(msg, 'error');
    } finally {
      setApplyingDiscount(false);
    }
  };

  const handleRemoveVoucherInput = async () => {
    setPromoCodeInput('');
    dispatch(removeVoucher());
    if (bookingId) {
      // Re-apply without voucher
      try {
        const pointsToRedeem = usePoints ? (parseInt(pointsInput) || null) : null;
        const response = await apiClient.post(`/bookings/${bookingId}/apply-discount`, {
          promoCode: null,
          pointsToRedeem
        });
        const responseData = response.data?.data ?? response.data;
        dispatch(updateTotalAmount(responseData.totalAmount));
        showToast('Đã xóa mã giảm giá.', 'info');
      } catch (err) {
        console.error(err);
      }
    }
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
                    Bước 3/5 &middot; Khuyến Mãi
                  </span>
                  <h1 className="text-2xl font-black text-white uppercase tracking-wider flex items-center gap-2 mt-1">
                    <Gift className="text-brand" size={24} /> Áp dụng Voucher & Điểm
                  </h1>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2 pl-9">Nhập mã giảm giá voucher hoặc quy đổi điểm thành viên của bạn để nhận ưu đãi chiết khấu trực tiếp.</p>
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
        
        {/* Left Column: Voucher input and Points selector */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          {/* Voucher input container */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#0f0f13]/40 border border-white/5 rounded-3xl p-6 shadow-glass backdrop-blur-sm relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-brand/5 blur-3xl pointer-events-none" />
            <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2.5 mb-4">
              <Tag size={16} className="text-brand" />
              Mã giảm giá (Voucher)
            </h3>

            {reduxVoucher ? (
              <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/25 px-4 py-3.5 rounded-2xl text-emerald-400 text-xs font-bold">
                <div className="flex items-center gap-3">
                  <CheckCircle2 size={16} />
                  <div>
                    <span className="font-black uppercase tracking-wider">{reduxVoucher.promoCode}</span>
                    <span className="text-[10px] text-emerald-500/80 block mt-0.5">Đã áp dụng giảm {currencyFormatter.format(reduxDiscountAmount)}</span>
                  </div>
                </div>
                <button
                  onClick={handleRemoveVoucherInput}
                  className="p-1.5 hover:bg-emerald-500/20 rounded-lg transition-colors cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  placeholder="Nhập mã khuyến mãi (ví dụ: BETACINEMA, MOVIETIME...)"
                  value={promoCodeInput}
                  onChange={(e) => setPromoCodeInput(e.target.value.toUpperCase())}
                  className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-white text-xs font-semibold focus:outline-none focus:border-brand-gold transition-colors"
                />
              </div>
            )}

            <p className="text-[10px] text-gray-500 leading-normal mt-3 flex items-start gap-1.5">
              <Info size={12} className="shrink-0 mt-0.5" />
              <span>Chỉ áp dụng 01 mã giảm giá cho mỗi giao dịch. Điều kiện và giá trị giảm giá tùy thuộc vào từng sự kiện cụ thể.</span>
            </p>
          </motion.div>

          {/* Member points input container */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-[#0f0f13]/40 border border-white/5 rounded-3xl p-6 shadow-glass backdrop-blur-sm relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-brand-gold/5 blur-3xl pointer-events-none" />
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2.5">
                <Coins size={16} className="text-brand-gold" />
                Điểm tích lũy thành viên
              </h3>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={usePoints}
                  onChange={(e) => setUsePoints(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-400 peer-checked:after:bg-black after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-gold"></div>
              </label>
            </div>

            {usePoints ? (
              <div className="flex flex-col gap-3 mt-3">
                <div className="flex justify-between items-center text-[10px] text-gray-400 font-extrabold uppercase">
                  <span>Số dư điểm của bạn: <strong className="text-white">{memberPoints} điểm</strong></span>
                  <span className="text-brand-gold">Tỷ lệ: 1 điểm = 1.000đ</span>
                </div>
                
                <div className="flex gap-2">
                  <input
                    type="number"
                    min={10}
                    max={memberPoints}
                    placeholder="Nhập số điểm muốn sử dụng (tối thiểu 10)"
                    value={pointsInput}
                    onChange={(e) => setPointsInput(e.target.value)}
                    className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white text-xs font-semibold focus:outline-none focus:border-brand-gold"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const maxPoints = Math.min(memberPoints, Math.floor(maxPointsDiscount / 1000));
                      setPointsInput(String(maxPoints));
                    }}
                    className="px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-black uppercase text-gray-300 rounded-2xl transition-colors cursor-pointer"
                  >
                    Tối đa
                  </button>
                </div>

                {pointsError ? (
                  <p className="text-[10px] text-brand font-black uppercase leading-normal">{pointsError}</p>
                ) : reduxPointsRedeemed ? (
                  <p className="text-[10px] text-emerald-400 font-extrabold uppercase leading-normal">
                    ✓ Đã quy đổi {reduxPointsRedeemed} điểm (Giảm {currencyFormatter.format(reduxPointsDiscountAmount)})
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="text-xs text-gray-500">Bật tùy chọn để sử dụng điểm thành viên tích lũy của bạn cho hóa đơn này.</p>
            )}

            <p className="text-[10px] text-gray-500 leading-normal mt-4 flex items-start gap-1.5 border-t border-white/5 pt-3">
              <Info size={12} className="shrink-0 mt-0.5" />
              <span>Giá trị quy đổi tối đa của điểm thành viên không được vượt quá 50% tổng số tiền thanh toán còn lại sau voucher.</span>
            </p>
          </motion.div>
        </div>

        {/* Right Column: Booking Summary & Proceed to Confirm */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-1.5">
            <Gift size={12} className="text-brand-gold" />
            Tóm Tắt Đơn Vé
          </h3>

          <BookingSummary
            showtime={selectedShowtime}
            seats={selectedSeats}
            cinemaName={cinema?.cinemaName || selectedShowtime?.cinemaName || 'Cinema Center'}
            serviceFee={serviceFee}
            promoCode={reduxVoucher?.promoCode}
            discountAmount={reduxDiscountAmount}
            pointsDiscountAmount={reduxPointsDiscountAmount}
            totalAmount={bookingState.totalAmount || Math.max(baseTotal - reduxDiscountAmount - reduxPointsDiscountAmount, 0)}
            combos={reduxCombos}
          />

          {/* Action buttons */}
          <div className="flex flex-col gap-3.5 mt-2">
            <button
              onClick={handleApplyDiscount}
              disabled={applyingDiscount || !!pointsError}
              className="w-full bg-brand-gold hover:bg-brand-gold/90 disabled:bg-gray-800 text-black disabled:text-gray-600 font-black py-4 rounded-2xl transition-all duration-300 shadow-[0_0_20px_rgba(229,169,59,0.25)] flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed text-sm uppercase tracking-wider"
            >
              {applyingDiscount ? (
                <>
                  <Loader2 size={16} className="animate-spin text-black" />
                  Đang ghi nhận...
                </>
              ) : (
                <>
                  Tiếp Tục Xác Nhận
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </div>
        </div>

      </div>

    </div>
  );
};
