import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { CreditCard, QrCode, Sparkles, ShieldCheck, CheckCircle2, Copy, Check, Info } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { apiClient } from '../../api/client';
import { clearBooking } from '../../store/bookingSlice';
import type { Cinema } from '../../types';

// Redux RootState definition locally
interface RootState {
  booking: {
    selectedShowtime: any;
    selectedSeats: any[];
    appliedVoucher: any;
    serviceFee: number;
    discountAmount: number;
    totalAmount: number;
    bookingId: number | null;
    bookingCode: string | null;
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

export const Payment: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { showToast } = useToast();

  const bookingState = useSelector((state: RootState) => state.booking);
  const {
    selectedShowtime,
    selectedSeats,
    appliedVoucher,
    serviceFee,
    discountAmount,
    totalAmount,
    bookingId,
    bookingCode
  } = bookingState;

  const [cinema, setCinema] = useState<Cinema | null>(null);
  const [vietQR, setVietQR] = useState<VietQRResponse | null>(null);
  const [qrLoading, setQrLoading] = useState(true);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [checkingManual, setCheckingManual] = useState(false);

  // Redirect user if no active booking is present in Redux state
  useEffect(() => {
    if (!bookingId || !selectedShowtime || selectedSeats.length === 0) {
      showToast('Không tìm thấy phiên đặt vé hoạt động.', 'warning');
      navigate('/');
    }
  }, [bookingId, selectedShowtime, selectedSeats, navigate]);

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
    apiClient.post<any>('/payments/vietqr/create', { bookingId })
      .then((res) => {
        const responseData = res.data?.data ?? res.data;
        setVietQR(responseData);
        setQrLoading(false);
      })
      .catch((err) => {
        const msg = err.response?.data?.Message || 'Không thể kết nối cổng VietQR. Vui lòng thử lại.';
        showToast(msg, 'error');
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
          dispatch(clearBooking());
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
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    showToast(`Đã sao chép ${fieldName}!`, 'success');
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleCheckManual = async () => {
    if (!bookingId) return;
    setCheckingManual(true);
    try {
      const res = await apiClient.get(`/bookings/${bookingId}`);
      const bookingData = res.data?.data;
      if (bookingData && (bookingData.bookingStatus === 'Confirmed' || bookingData.bookingStatus === 'Paid')) {
        setPaymentSuccess(true);
        showToast('Thanh toán hoàn tất thành công!', 'success');
        dispatch(clearBooking());
        setTimeout(() => {
          navigate(`/payment-result?bookingId=${bookingId}`);
        }, 1500);
      } else {
        showToast('Hệ thống chưa ghi nhận giao dịch của bạn. Vui lòng chờ 1-2 phút hoặc kiểm tra lại.', 'info');
      }
    } catch (err) {
      showToast('Có lỗi xảy ra khi kiểm tra trạng thái vé.', 'error');
    } finally {
      setCheckingManual(false);
    }
  };

  if (!bookingId || !selectedShowtime) return null;

  return (
    <div className="min-h-screen pb-24 text-left">
      
      {/* Header Panel */}
      <div className="relative border-b border-white/5 py-8 bg-gradient-to-b from-[#07070a] to-transparent">
        <div className="max-w-6xl mx-auto px-4 md:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-white uppercase tracking-wider flex items-center gap-2">
              <CreditCard className="text-brand" size={24} /> Thanh Toán Chuyển Khoản
            </h1>
            <p className="text-xs text-gray-500 mt-1">Quét mã QR bằng ứng dụng ngân hàng của bạn để hoàn tất đặt vé.</p>
          </div>

          <BookingTimer initialSeconds={300} onExpire={handleTimerExpire} />
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
                ) : vietQR?.qrImageUrl ? (
                  <img src={vietQR.qrImageUrl} alt="VietQR Transfer" className="w-full h-full object-contain" />
                ) : (
                  <div className="flex flex-col items-center justify-center text-[#0f0f13] p-4 text-center">
                    <QrCode className="h-8 w-8 text-gray-300" />
                    <span className="text-[9px] text-gray-400 mt-2 font-bold">Lỗi tạo mã QR</span>
                  </div>
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
                  className="p-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-colors cursor-pointer"
                >
                  {copiedField === 'Số tài khoản' ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                </button>
              </div>

              {/* Amount */}
              <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <span className="text-[8px] uppercase tracking-widest text-gray-500 font-black block mb-0.5">Số tiền chuyển khoản</span>
                  <span className="text-base font-mono font-black text-white text-brand-gold">
                    {vietQR?.amount ? `${vietQR.amount.toLocaleString()} VND` : `${totalAmount.toLocaleString()} VND`}
                  </span>
                </div>
                <button
                  onClick={() => handleCopy(vietQR?.amount.toString() || '', 'Số tiền')}
                  disabled={!vietQR}
                  className="p-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-colors cursor-pointer"
                >
                  {copiedField === 'Số tiền' ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                </button>
              </div>

              {/* Transfer Content */}
              <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 flex items-center justify-between border-brand-gold/20">
                <div>
                  <span className="text-[8px] uppercase tracking-widest text-gray-500 font-black block mb-0.5">Nội dung chuyển khoản</span>
                  <span className="text-xs font-mono font-black text-white tracking-wider text-brand">
                    {vietQR?.transferContent || bookingCode || 'Mã đặt vé'}
                  </span>
                </div>
                <button
                  onClick={() => handleCopy(vietQR?.transferContent || '', 'Nội dung chuyển khoản')}
                  disabled={!vietQR}
                  className="p-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-colors cursor-pointer"
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

          <div className="flex flex-col sm:flex-row gap-3 mt-2">
            <button
              onClick={handleCheckManual}
              disabled={checkingManual || !vietQR}
              className="flex-grow py-3 bg-brand-gold hover:bg-brand-gold/90 text-black font-extrabold text-[11px] uppercase tracking-widest rounded-xl transition-all cursor-pointer shadow-lg shadow-brand-gold/10 flex items-center justify-center gap-2"
            >
              {checkingManual ? (
                <>
                  <div className="h-4.5 w-4.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  Đang kiểm tra giao dịch...
                </>
              ) : (
                'Tôi Đã Chuyển Khoản'
              )}
            </button>
            <button
              onClick={handleTimerExpire}
              className="py-3 px-6 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white font-extrabold text-[11px] uppercase tracking-widest rounded-xl transition-all cursor-pointer"
            >
              Hủy đặt vé
            </button>
          </div>
        </div>

        {/* Right Side: Booking Summary */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-1.5">
            <ShieldCheck size={12} className="text-brand-gold" />
            Xác Nhận Đặt Vé
          </h3>

          <BookingSummary
            showtime={selectedShowtime}
            seats={selectedSeats}
            cinemaName={cinema?.cinemaName || selectedShowtime?.cinemaName || 'Cinema Center'}
            serviceFee={serviceFee}
            promoCode={appliedVoucher?.promoCode}
            discountAmount={discountAmount}
            totalAmount={totalAmount}
          />
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
