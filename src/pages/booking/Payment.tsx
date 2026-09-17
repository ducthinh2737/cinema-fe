import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { CreditCard, QrCode, Sparkles, ShieldCheck, CheckCircle2, Copy, Check, Info, ShieldAlert, Ticket, Loader2, Zap } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { apiClient } from '../../api/client';
import { clearBooking } from '../../store/bookingSlice';
import type { Cinema } from '../../types';
import { parseApiDate } from '../../utils/dateHelpers';

// Redux RootState definition locally
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
    combos: any[];
  };
}

// Components
import { BookingSummary } from '../../components/booking/BookingSummary';
import { BookingTimer } from '../../components/booking/BookingTimer';


interface VietQRResponse {
  bookingId: number;
  bookingCode: string;
  amount: number;
  qrImageUrl: string;
  transferContent: string;
  bankName: string;
  accountNo: string;
  accountName: string;
}

// Steps that frame where the customer is in the overall booking flow.
const FLOW_STEPS = [
  { label: 'Chọn ghế' },
  { label: 'Chọn bắp nước' },
  { label: 'Áp dụng Voucher' },
  { label: 'Xác nhận đơn' },
  { label: 'Thanh toán' },
] as const;

const CURRENT_STEP_INDEX = 4; // "Thanh toán"

export const Payment: React.FC = () => {
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
    pointsDiscountAmount: reduxPointsDiscountAmount,
    totalAmount: reduxTotalAmount,
    bookingId: reduxBookingId,
    bookingCode: reduxBookingCode
  } = bookingState;

  // Local state fallbacks if restoring from query params
  const [loading, setLoading] = useState(!!queryBookingId);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [localShowtime, setLocalShowtime] = useState<any>(null);
  const [localSeats, setLocalSeats] = useState<any[]>([]);
  const [localServiceFee, setLocalServiceFee] = useState<number>(5000);
  const [localDiscountAmount, setLocalDiscountAmount] = useState<number>(0);
  const [localPointsDiscountAmount, setLocalPointsDiscountAmount] = useState<number>(0);
  const [localTotalAmount, setLocalTotalAmount] = useState<number>(0);
  const [localBookingId, setLocalBookingId] = useState<number | null>(null);
  const [localBookingCode, setLocalBookingCode] = useState<string | null>(null);
  const [localPromoCode, setLocalPromoCode] = useState<string | undefined>(undefined);
  const [localCombos, setLocalCombos] = useState<any[]>([]);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(300);

  const [cinema, setCinema] = useState<Cinema | null>(null);
  const [vietQR, setVietQR] = useState<VietQRResponse | null>(null);
  const [qrLoading, setQrLoading] = useState(true);
  const [qrError, setQrError] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [checkingManual, setCheckingManual] = useState(false);
  const [simulating, setSimulating] = useState(false);

  // Active variables mapped dynamically
  const bookingId = queryBookingId ? localBookingId : reduxBookingId;
  const bookingCode = queryBookingId ? localBookingCode : reduxBookingCode;
  const selectedShowtime = queryBookingId ? localShowtime : reduxShowtime;
  const selectedSeats = queryBookingId ? localSeats : reduxSeats;
  const totalAmount = queryBookingId ? localTotalAmount : reduxTotalAmount;
  const serviceFee = queryBookingId ? localServiceFee : reduxServiceFee;
  const discountAmount = queryBookingId ? localDiscountAmount : reduxDiscountAmount;
  const pointsDiscountAmount = queryBookingId ? localPointsDiscountAmount : reduxPointsDiscountAmount;
  const appliedVoucher = queryBookingId ? (localPromoCode ? { promoCode: localPromoCode } : null) : reduxVoucher;
  const reduxCombos = useSelector((state: RootState) => state.booking.combos || []);
  const combos = queryBookingId ? localCombos : reduxCombos;

  // 1. Fetch booking if queryBookingId is present
  useEffect(() => {
    if (!queryBookingId) return;

    setLoading(true);
    setErrorMsg(null);

    apiClient.get<any>(`/bookings/${queryBookingId}`)
      .then((res) => {
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
          setErrorMsg('Đơn đặt vé này đã bị hủy hoặc hết hạn thanh toán.');
          return;
        }

        // Map showtime
        const showtime = bookingData.showtime || {
          showtimeId: bookingData.showtimeId || 0,
          startTime: bookingData.startTime,
          cinemaName: bookingData.cinemaName,
          hall: {
            name: bookingData.hallName,
            hallTypeName: '2D'
          },
          movie: {
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
          price: bs.seat?.price || bs.price || (bookingData.totalAmount - bookingData.serviceFee + bookingData.discountAmount) / (bookingData.seats?.length || 1)
        })) || bookingData.seats?.map((s: string, idx: number) => {
          const rowName = s.charAt(0);
          const seatNumber = parseInt(s.slice(1), 10) || 0;
          return {
            seatId: idx,
            rowName,
            seatNumber,
            seatTypeName: 'Standard',
            price: (bookingData.totalAmount - bookingData.serviceFee + bookingData.discountAmount) / (bookingData.seats?.length || 1)
          };
        }) || [];

        setLocalShowtime(showtime);
        setLocalSeats(seats);
        setLocalBookingId(bookingData.bookingId);
        setLocalBookingCode(bookingData.bookingCode);
        setLocalTotalAmount(bookingData.totalAmount);
        setLocalServiceFee(bookingData.serviceFee);
        setLocalDiscountAmount(bookingData.discountAmount);
        setLocalPointsDiscountAmount(bookingData.pointsDiscountAmount || 0);
        setLocalPromoCode(bookingData.voucher?.promoCode);
        setLocalCombos(bookingData.combos || []);
        
        // Calculate remaining seconds based on 5 mins limit
        const createdTime = parseApiDate(bookingData.createdAt).getTime();
        const now = new Date().getTime();
        const elapsedSeconds = Math.floor((now - createdTime) / 1000);
        const remaining = Math.max(0, 300 - elapsedSeconds);
        setRemainingSeconds(remaining);
      })
      .catch((err) => {
        console.error('Failed to load booking details for payment', err);
        setErrorMsg('Không thể tải thông tin đặt vé. Vui lòng kiểm tra lại đường dẫn.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [queryBookingId, navigate]);

  // Redirect user if no active booking is present in Redux state
  useEffect(() => {
    if (queryBookingId) return; // skip if loaded from query string
    if (!bookingId || !selectedShowtime || selectedSeats.length === 0) {
      showToast('Không tìm thấy phiên đặt vé hoạt động.', 'warning');
      navigate('/');
    }
  }, [bookingId, selectedShowtime, selectedSeats, navigate, queryBookingId]);

  // Load Cinema Details dynamically
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

  // Request VietQR Transfer Details from Backend
  useEffect(() => {
    if (!bookingId) return;
    setQrLoading(true);
    setQrError(false);
    apiClient.post<any>('/payments/vietqr/create', { bookingId })
      .then((res) => {
        const responseData = res.data?.data ?? res.data;
        setVietQR(responseData);
        setQrLoading(false);
      })
      .catch((err) => {
        const msg = err.response?.data?.Message || 'Không thể kết nối cổng VietQR. Vui lòng thử lại.';
        showToast(msg, 'error');
        setQrError(true);
        setQrLoading(false);
      });
  }, [bookingId]);

  // Automatic Polling to check if payment is confirmed
  useEffect(() => {
    if (!bookingId || paymentSuccess) return;

    const interval = setInterval(async () => {
      try {
        const res = await apiClient.get(`/bookings/${bookingId}`);
        const bookingData = res.data?.data;
        if (bookingData && (bookingData.bookingStatus === 'Confirmed' || bookingData.bookingStatus === 'Paid')) {
          clearInterval(interval);
          setPaymentSuccess(true);
          showToast('Thanh toán hoàn tất thành công!', 'success');
          setTimeout(() => {
            navigate(`/payment-result?bookingId=${bookingId}`);
          }, 2000);
        }
      } catch (err) {
        console.error('Polling payment status error:', err);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [bookingId, paymentSuccess, navigate, dispatch]);

  const handleTimerExpire = () => {
    showToast('Thời gian giữ ghế đã hết hạn. Vui lòng chọn ghế lại.', 'error');
    // Release seats by cancelling booking on the server
    if (bookingId) {
      apiClient.post('/bookings/cancel', { bookingId }).catch(console.error);
    }
    dispatch(clearBooking());
    navigate('/');
  };

  const handleCopy = (text: string, fieldName: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    showToast(`Đã sao chép ${fieldName}!`, 'success');
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleCheckManual = async () => {
    if (!bookingId) return;
    setCheckingManual(true);
    try {
      // Check booking status from API
      const res = await apiClient.get(`/bookings/${bookingId}`);
      const bookingData = res.data?.data;
      if (bookingData && (bookingData.bookingStatus === 'Confirmed' || bookingData.bookingStatus === 'Paid')) {
        setPaymentSuccess(true);
        showToast('Thanh toán hoàn tất thành công!', 'success');
        setTimeout(() => {
          navigate(`/payment-result?bookingId=${bookingId}`);
        }, 1500);
      } else {
        showToast('Giao dịch chưa được xác nhận thanh toán. Vui lòng thử lại sau ít phút.', 'info');
      }
    } catch (err) {
      showToast('Có lỗi xảy ra khi kiểm tra trạng thái vé.', 'error');
    } finally {
      setCheckingManual(false);
    }
  };

  const handleSimulateSuccess = async () => {
    if (!bookingId) return;
    setSimulating(true);
    try {
      const res = await apiClient.post('/payments/simulate-success', { bookingId });
      if (res.status === 200 || res.data) {
        setPaymentSuccess(true);
        showToast('Giả lập thanh toán thành công!', 'success');
        setTimeout(() => {
          navigate(`/payment-result?bookingId=${bookingId}`);
        }, 1500);
      }
    } catch (err: any) {
      const msg = err.response?.data?.Message || 'Có lỗi xảy ra khi giả lập thanh toán.';
      showToast(msg, 'error');
    } finally {
      setSimulating(false);
    }
  };

  const handleRetryQR = () => {
    if (!bookingId) return;
    setQrLoading(true);
    setQrError(false);
    apiClient.post<any>('/payments/vietqr/create', { bookingId })
      .then((res) => {
        const responseData = res.data?.data ?? res.data;
        setVietQR(responseData);
        setQrLoading(false);
      })
      .catch((err) => {
        const msg = err.response?.data?.Message || 'Không thể kết nối cổng VietQR. Vui lòng thử lại.';
        showToast(msg, 'error');
        setQrError(true);
        setQrLoading(false);
      });
  };

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center gap-3 bg-[#07070a] text-gray-200">
        <Loader2 size={36} className="text-brand animate-spin" />
        <span className="text-xs text-gray-500 font-extrabold uppercase tracking-widest">Đang tải thông tin thanh toán...</span>
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
          <h2 className="text-xl font-black text-white tracking-wide uppercase">Thanh Toán Không Hợp Lệ</h2>
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
    <div className="min-h-screen pb-24 text-left">

      {/* Header Panel */}
      <div className="relative border-b border-white/5 py-8 bg-gradient-to-b from-[#07070a] to-transparent">
        <div className="max-w-6xl mx-auto px-4 md:px-8 flex flex-col gap-6">

          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-gray-500">
                Bước 2/3 &middot; Thanh toán
              </span>
              <h1 className="text-2xl font-black text-white uppercase tracking-wider flex items-center gap-2 mt-1">
                <CreditCard className="text-brand" size={24} /> Thanh Toán Chuyển Khoản
              </h1>
              <p className="text-xs text-gray-500 mt-1">Quét mã QR bằng ứng dụng ngân hàng của bạn để hoàn tất đặt vé.</p>
            </div>

            <BookingTimer initialSeconds={remainingSeconds} onExpire={handleTimerExpire} />
          </div>

          {/* Flow stepper — order encodes real progress through the booking */}
          <div className="flex items-center w-full max-w-md">
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
                          ? 'bg-brand-gold text-black'
                          : 'bg-white/5 text-gray-500'
                        }`}
                    >
                      {isDone ? <Check size={12} /> : idx + 1}
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

        {/* Left Side: VietQR Details */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-1.5">
              <Sparkles size={12} className="text-brand-gold" />
              Thông tin chuyển khoản (VietQR)
            </h3>
            <p className="text-xs text-gray-500">Mở App ngân hàng bất kỳ, quét mã VietQR bên dưới hoặc nhập thông tin chuyển khoản thủ công.</p>
          </div>

          {/* VietQR Bank Card */}
          <div className="relative overflow-hidden rounded-3xl border border-white/5 bg-[#0f0f13]/60 backdrop-blur-xl p-6 md:p-8 flex flex-col md:flex-row gap-8 items-center shadow-xl">
            {/* Background glowing gradients */}
            <div className="absolute top-0 right-0 w-44 h-44 rounded-full bg-brand-gold/5 blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-44 h-44 rounded-full bg-brand/5 blur-3xl pointer-events-none" />

            {/* Left Col: QR Code image container */}
            <div className="flex-shrink-0 flex flex-col items-center gap-3">
              <div className="bg-white p-3 rounded-2xl w-48 h-48 flex items-center justify-center border border-white/10 relative shadow-2xl overflow-hidden">
                {qrLoading ? (
                  <div className="flex flex-col items-center justify-center gap-2 text-[#0f0f13]">
                    <div className="h-6 w-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
                    <span className="text-[10px] font-bold text-gray-400">Đang tải mã QR...</span>
                  </div>
                ) : qrError || !vietQR?.qrImageUrl ? (
                  <div className="flex flex-col items-center justify-center text-[#0f0f13] p-4 text-center gap-2">
                    <ShieldAlert className="h-8 w-8 text-red-400" />
                    <span className="text-[9px] text-gray-500 font-bold leading-snug">Không tạo được mã QR</span>
                    <button
                      onClick={handleRetryQR}
                      className="text-[9px] font-extrabold uppercase tracking-wider text-brand underline underline-offset-2 cursor-pointer"
                    >
                      Thử lại
                    </button>
                  </div>
                ) : (
                  <img src={vietQR.qrImageUrl} alt="VietQR Transfer" className="w-full h-full object-contain" />
                )}
              </div>
              <span className="text-[10px] text-gray-500 font-extrabold uppercase tracking-widest flex items-center gap-1.5">
                <QrCode size={12} className="text-brand" /> Quét mã để điền nhanh
              </span>
            </div>

            {/* Right Col: Details Fields */}
            <div className="flex-grow w-full flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[9px] uppercase tracking-widest text-gray-500 font-bold block mb-1">Ngân hàng</span>
                  <span className="text-xs font-black text-white block truncate">{vietQR?.bankName || 'Ngân hàng Quân Đội (MB)'}</span>
                </div>
                <div>
                  <span className="text-[9px] uppercase tracking-widest text-gray-500 font-bold block mb-1">Chủ tài khoản</span>
                  <span className="text-xs font-black text-brand-gold block truncate uppercase">{vietQR?.accountName || 'CINEMA BOOKING SYSTEM'}</span>
                </div>
              </div>

              {/* Account Number */}
              <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <span className="text-[8px] uppercase tracking-widest text-gray-500 font-black block mb-0.5">Số tài khoản</span>
                  <span className="text-sm font-mono font-black text-white">{vietQR?.accountNo || '0000000000'}</span>
                </div>
                <button
                  onClick={() => handleCopy(vietQR?.accountNo || '', 'Số tài khoản')}
                  disabled={!vietQR}
                  aria-label="Sao chép số tài khoản"
                  className="p-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {copiedField === 'Số tài khoản' ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                </button>
              </div>

              {/* Amount */}
              <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <span className="text-[8px] uppercase tracking-widest text-gray-500 font-black block mb-0.5">Số tiền chuyển khoản</span>
                  <span className="text-base font-mono font-black text-brand-gold">
                    {(vietQR?.amount ?? totalAmount).toLocaleString()} VND
                  </span>
                </div>
                <button
                  onClick={() => handleCopy(String(vietQR?.amount ?? totalAmount), 'Số tiền')}
                  disabled={!vietQR}
                  aria-label="Sao chép số tiền"
                  className="p-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {copiedField === 'Số tiền' ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                </button>
              </div>

              {/* Transfer Content — the field most likely to be mistyped, so it gets its own emphasis */}
              <div className="bg-brand-gold/5 border border-brand-gold/25 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <span className="text-[8px] uppercase tracking-widest text-brand-gold/80 font-black block mb-0.5">Nội dung chuyển khoản &middot; bắt buộc</span>
                  <span className="text-xs font-mono font-black text-brand-gold tracking-wider">
                    {vietQR?.transferContent || bookingCode || 'Mã đặt vé'}
                  </span>
                </div>
                <button
                  onClick={() => handleCopy(vietQR?.transferContent || bookingCode || '', 'Nội dung chuyển khoản')}
                  disabled={!vietQR && !bookingCode}
                  aria-label="Sao chép nội dung chuyển khoản"
                  className="p-2 hover:bg-brand-gold/10 rounded-lg text-brand-gold/70 hover:text-brand-gold transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {copiedField === 'Nội dung chuyển khoản' ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                </button>
              </div>

            </div>
          </div>

          {/* Guide Tips */}
          <div className="flex gap-3 bg-white/[0.02] border border-white/5 rounded-2xl p-4 text-xs font-semibold text-gray-400 leading-relaxed">
            <Info size={18} className="text-brand-gold shrink-0 mt-0.5" />
            <div className="flex flex-col gap-1">
              <span className="text-white text-[11px] font-bold">Lưu ý quan trọng:</span>
              <p>Chuyển khoản chính xác số tiền và nội dung chuyển khoản để hệ thống tự động nhận diện vé. Sau khi chuyển khoản, vui lòng đợi 1-2 phút để hệ thống xử lý hoặc bấm nút bên dưới.</p>
            </div>
          </div>

          <div className="flex flex-col gap-3 mt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Simulate Payment Success Button (for testing / bypass SePay limit) */}
              <button
                onClick={handleSimulateSuccess}
                disabled={simulating || paymentSuccess}
                className="py-3.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-black text-[11px] uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-lg shadow-emerald-950/40 flex items-center justify-center gap-2 border border-emerald-400/30 hover:scale-[1.01] active:scale-[0.99]"
              >
                {simulating ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Đang Giả Lập...</span>
                  </>
                ) : (
                  <>
                    <Zap size={16} className="text-yellow-300 fill-yellow-300 shrink-0" />
                    <span>Giả Lập Thanh Toán</span>
                  </>
                )}
              </button>

              {/* Manual Check Button */}
              <button
                onClick={handleCheckManual}
                disabled={checkingManual || !vietQR}
                className="py-3.5 px-4 bg-brand-gold hover:bg-brand-gold/90 disabled:opacity-50 text-black font-black text-[11px] uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-lg shadow-brand-gold/10 flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99]"
              >
                {checkingManual ? (
                  <>
                    <div className="h-4 w-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    <span>Đang kiểm tra...</span>
                  </>
                ) : (
                  <span>Tôi Đã Chuyển Khoản</span>
                )}
              </button>
            </div>

            {/* Cancel Booking */}
            <button
              onClick={handleTimerExpire}
              className="w-full py-2.5 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white font-extrabold text-[11px] uppercase tracking-widest rounded-xl transition-all cursor-pointer border border-white/5"
            >
              Hủy đặt vé
            </button>
          </div>
        </div>

        {/* Right Side: Booking Summary */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-1.5">
            <Ticket size={12} className="text-brand-gold" />
            Xác Nhận Đặt Vé
          </h3>

          <BookingSummary
            showtime={selectedShowtime}
            seats={selectedSeats}
            cinemaName={cinema?.cinemaName || selectedShowtime?.cinemaName || 'Cinema Center'}
            serviceFee={serviceFee}
            promoCode={appliedVoucher?.promoCode}
            discountAmount={discountAmount}
            pointsDiscountAmount={pointsDiscountAmount}
            totalAmount={totalAmount}
            combos={combos}
          />

          {/* Secondary trust badge for the right column */}
          <div className="flex items-center gap-2.5 bg-white/[0.02] border border-white/5 rounded-xl px-4 py-3 text-[11px] font-bold text-gray-400">
            <ShieldCheck size={16} className="text-brand-gold shrink-0" />
            Thông tin chuyển khoản được mã hóa và chỉ dùng cho đơn đặt vé này.
          </div>
        </div>

      </div>

      {/* Success Animation Overlay */}
      <AnimatePresence>
        {paymentSuccess && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[#07070a] flex flex-col items-center justify-center gap-4 text-center select-none"
          >
            <motion.div
              initial={{ scale: 0, rotate: -45 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', damping: 10, stiffness: 100 }}
              className="h-20 w-20 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-2xl shadow-emerald-500/35"
            >
              <CheckCircle2 size={44} />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-col gap-2 mt-2"
            >
              <h2 className="text-2xl font-black text-white uppercase tracking-wider">Thanh toán thành công!</h2>
              <p className="text-xs text-gray-500">Ghế của bạn đã được thanh toán. Đang tải thông tin vé...</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};