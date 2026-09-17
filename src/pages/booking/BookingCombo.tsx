import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { motion } from 'framer-motion';
import { 
  Sparkles, 
  ShoppingBag, 
  ChevronLeft, 
  Plus, 
  Minus, 
  Info, 
  ShieldAlert, 
  Loader2, 
  ArrowRight,
  Utensils
} from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { apiClient, getImageUrl } from '../../api/client';
import { clearBooking, updateTotalAmount, setBookingCombos } from '../../store/bookingSlice';
import type { Combo, ComboRecommendation, OrderCombo, Cinema } from '../../types';
import { parseApiDate } from '../../utils/dateHelpers';

// Redux RootState definition
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
    combos: OrderCombo[];
  };
}

import { BookingSummary } from '../../components/booking/BookingSummary';
import { BookingTimer } from '../../components/booking/BookingTimer';

const FLOW_STEPS = [
  { label: 'Chọn ghế' },
  { label: 'Chọn bắp nước' },
  { label: 'Áp dụng Voucher' },
  { label: 'Xác nhận đơn' },
  { label: 'Thanh toán' },
] as const;

const CURRENT_STEP_INDEX = 1; // "Chọn bắp nước"

export const BookingCombo: React.FC = () => {
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
    bookingId: reduxBookingId,
    combos: reduxCombos
  } = bookingState;

  // Local state fallbacks for restoration from query params
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [localShowtime, setLocalShowtime] = useState<any>(null);
  const [localSeats, setLocalSeats] = useState<any[]>([]);
  const [localServiceFee, setLocalServiceFee] = useState<number>(5000);
  const [localDiscountAmount, setLocalDiscountAmount] = useState<number>(0);
  const [localBookingId, setLocalBookingId] = useState<number | null>(null);
  const [localPromoCode, setLocalPromoCode] = useState<string | undefined>(undefined);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(360);

  const [cinema, setCinema] = useState<Cinema | null>(null);
  const [combosList, setCombosList] = useState<Combo[]>([]);
  const [recommendations, setRecommendations] = useState<ComboRecommendation[]>([]);
  const [selectedCombos, setSelectedCombos] = useState<Record<number, number>>({});
  const [savingCombos, setSavingCombos] = useState(false);

  // Active variables mapped dynamically
  const bookingId = queryBookingId ? localBookingId : reduxBookingId;
  const selectedShowtime = queryBookingId ? localShowtime : reduxShowtime;
  const selectedSeats = queryBookingId ? localSeats : reduxSeats;
  const serviceFee = queryBookingId ? localServiceFee : reduxServiceFee;
  const discountAmount = queryBookingId ? localDiscountAmount : reduxDiscountAmount;
  const appliedVoucher = queryBookingId ? (localPromoCode ? { promoCode: localPromoCode } : null) : reduxVoucher;

  // 1. Fetch booking details to restore state if bookingId is in query params
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
        setLocalDiscountAmount(bookingData.discountAmount);
        setLocalPromoCode(bookingData.voucher?.promoCode);

        // Prepopulate combos if already selected in the restored booking
        if (bookingData.combos && Array.isArray(bookingData.combos)) {
          const comboQuantities: Record<number, number> = {};
          bookingData.combos.forEach((c: any) => {
            comboQuantities[c.comboId] = c.quantity;
          });
          setSelectedCombos(comboQuantities);
        } else if (!queryBookingId && reduxCombos.length > 0) {
          // Prepopulate from Redux if redirecting forward/backward
          const comboQuantities: Record<number, number> = {};
          reduxCombos.forEach((c: any) => {
            comboQuantities[c.comboId] = c.quantity;
          });
          setSelectedCombos(comboQuantities);
        }

        // Calculate remaining seconds
        const createdTime = parseApiDate(bookingData.createdAt).getTime();
        const now = new Date().getTime();
        const elapsedSeconds = Math.floor((now - createdTime) / 1000);
        const remaining = Math.max(0, 600 - elapsedSeconds); // 10 minutes hold
        setRemainingSeconds(remaining);
      } catch (err) {
        console.error('Failed to load booking details for combo selection', err);
        setErrorMsg('Không thể tải thông tin đặt vé. Vui lòng thử lại.');
      } finally {
        setLoading(false);
      }
    };

    fetchBookingDetails();
  }, [queryBookingId, reduxBookingId]);

  // Redirect user if no active booking session exists
  useEffect(() => {
    if (!loading && !bookingId) {
      showToast('Không tìm thấy phiên đặt vé hoạt động.', 'warning');
      navigate('/');
    }
  }, [bookingId, loading, navigate]);

  // Load Concession Combos list and Recommendations
  useEffect(() => {
    if (!bookingId || !selectedShowtime) return;

    const fetchCombosAndRecommendations = async () => {
      try {
        // Fetch active combos
        const combosRes = await apiClient.get('/combos');
        const combosData = combosRes.data?.data?.items ?? combosRes.data?.items ?? [];
        setCombosList(combosData);

        // Fetch smart recommendations based on ticket count and showtime
        const ticketCount = selectedSeats.length || 1;
        const showtimeId = selectedShowtime.showtimeId;
        const recommendRes = await apiClient.get(`/combos/recommend?showtimeId=${showtimeId}&ticketCount=${ticketCount}`);
        const recommendData = recommendRes.data?.data ?? recommendRes.data ?? [];
        setRecommendations(recommendData);
      } catch (err) {
        console.error('Error fetching concession data:', err);
      }
    };

    fetchCombosAndRecommendations();
  }, [bookingId, selectedShowtime, selectedSeats.length]);

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

  // Handle expiration countdown
  const handleTimerExpire = () => {
    showToast('Thời gian giữ ghế đã hết hạn. Vui lòng chọn ghế lại.', 'error');
    if (bookingId) {
      apiClient.post('/bookings/cancel', { bookingId }).catch(console.error);
    }
    dispatch(clearBooking());
    navigate('/');
  };

  // Add/Remove local combo quantity
  const updateComboQty = (comboId: number, change: number) => {
    setSelectedCombos((prev) => {
      const currentQty = prev[comboId] || 0;
      const nextQty = Math.max(0, currentQty + change);
      
      const newMap = { ...prev };
      if (nextQty === 0) {
        delete newMap[comboId];
      } else {
        newMap[comboId] = nextQty;
      }
      return newMap;
    });
  };

  // Format currency
  const currencyFormatter = new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'
  });

  // Calculate local ticket subtotal
  const ticketTotal = selectedSeats.reduce((sum, s) => sum + (s.price || 0), 0);
  
  // Calculate local combos subtotal
  const selectedCombosArray = Object.entries(selectedCombos).map(([idStr, qty]) => {
    const id = parseInt(idStr, 10);
    const combo = combosList.find((c) => c.id === id);
    return {
      comboId: id,
      comboName: combo?.name || 'Combo bắp nước',
      quantity: qty,
      price: combo?.price || 0
    };
  }).filter(item => item.quantity > 0);

  const combosTotal = selectedCombosArray.reduce((sum, item) => sum + item.price * item.quantity, 0);
  
  // Calculate local grand total
  const calculatedGrandTotal = Math.max(ticketTotal + serviceFee + combosTotal - discountAmount, 0);

  // Submit combos selection to backend and proceed to Payment
  const handleProceedToPayment = async () => {
    if (!bookingId) return;

    setSavingCombos(true);
    try {
      // Map local selections into the DTO expected format
      const payload = Object.entries(selectedCombos).map(([idStr, qty]) => ({
        comboId: parseInt(idStr, 10),
        quantity: qty
      }));

      // Call API PUT /api/combos/booking/{bookingId}
      const response = await apiClient.put(`/combos/booking/${bookingId}`, payload);
      const responseData = response.data?.data ?? response.data;

      // Update Redux state with final updated booking totals and combos list
      dispatch(updateTotalAmount(responseData.totalAmount));
      
      const updatedCombos = responseData.combos?.map((c: any) => ({
        comboId: c.comboId,
        comboName: c.comboName,
        quantity: c.quantity,
        price: c.price
      })) || [];
      dispatch(setBookingCombos(updatedCombos));

      showToast('Đã áp dụng combo bắp nước thành công!', 'success');
      navigate(`/booking-voucher${queryBookingId ? `?bookingId=${bookingId}` : ''}`);
    } catch (err: any) {
      const msg = err.response?.data?.Message || err.response?.data?.message || 'Có lỗi xảy ra khi cập nhật bắp nước.';
      showToast(msg, 'error');
    } finally {
      setSavingCombos(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center gap-3 bg-[#07070a] text-gray-200">
        <Loader2 size={36} className="text-brand animate-spin" />
        <span className="text-xs text-gray-500 font-extrabold uppercase tracking-widest">Đang tải thông tin đặt vé...</span>
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
                    Bước 2/4 &middot; Bắp Nước Concession
                  </span>
                  <h1 className="text-2xl font-black text-white uppercase tracking-wider flex items-center gap-2 mt-1">
                    <Utensils className="text-brand" size={24} /> Chọn Combo Bắp Nước
                  </h1>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2 pl-9">Tận hưởng trọn vẹn trải nghiệm điện ảnh với các combo bắp nước ưu đãi đặc quyền Beta.</p>
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
        
        {/* Left Column: Recommendations & Combos Catalog */}
        <div className="lg:col-span-8 flex flex-col gap-8">
          
          {/* Smart Recommendations Section */}
          {recommendations.length > 0 && (
            <div className="flex flex-col gap-3">
              <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
                <Sparkles size={14} className="text-brand-gold animate-bounce" />
                Gợi Ý Tiết Kiệm Dành Riêng Cho Bạn
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {recommendations.map((rec, index) => {
                  const combo = rec.combo;
                  const qty = selectedCombos[combo.id] || 0;
                  return (
                    <motion.div
                      key={`rec-${combo.id}`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="relative overflow-hidden rounded-3xl border border-brand-gold/20 bg-gradient-to-br from-brand-gold/[0.03] to-[#0f0f13]/80 p-5 flex gap-4 shadow-xl"
                    >
                      {/* Reason Badge */}
                      <span className="absolute top-3 right-3 bg-brand-gold text-black text-[9px] font-black uppercase px-2 py-0.5 rounded-md tracking-wider">
                        {rec.reason}
                      </span>

                      {/* Image */}
                      <div className="h-20 w-20 rounded-2xl overflow-hidden border border-white/10 flex-shrink-0 bg-white/5">
                        <img
                          src={getImageUrl(combo.imageUrl) || 'https://images.unsplash.com/photo-1578849278619-e73505e9610f?q=80&w=200'}
                          alt={combo.name}
                          className="h-full w-full object-cover"
                        />
                      </div>

                      {/* Info & Picker */}
                      <div className="flex flex-col justify-between flex-grow min-w-0 pr-16">
                        <div>
                          <h4 className="text-xs font-black text-white truncate uppercase">{combo.name}</h4>
                          <p className="text-[10px] text-gray-500 truncate mt-0.5">{combo.description}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs font-black text-brand-gold">{currencyFormatter.format(combo.price)}</span>
                            {combo.originalPrice && combo.originalPrice > combo.price && (
                              <span className="text-[10px] text-gray-500 line-through">{currencyFormatter.format(combo.originalPrice)}</span>
                            )}
                          </div>
                        </div>

                        {/* Picker Buttons */}
                        <div className="flex items-center gap-3 mt-3">
                          <button
                            onClick={() => updateComboQty(combo.id, -1)}
                            disabled={qty === 0}
                            className="h-7 w-7 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors cursor-pointer"
                          >
                            <Minus size={12} />
                          </button>
                          <span className="text-xs font-mono font-black text-white w-4 text-center">{qty}</span>
                          <button
                            onClick={() => updateComboQty(combo.id, 1)}
                            className="h-7 w-7 rounded-lg bg-brand-gold border border-brand-gold/10 hover:bg-brand-gold/80 text-black flex items-center justify-center transition-colors cursor-pointer"
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Full Catalog Listing */}
          <div className="flex flex-col gap-4">
            <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
              <ShoppingBag size={14} className="text-brand" />
              Danh Sách Combo Bắp Nước
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {combosList.map((combo, index) => {
                const qty = selectedCombos[combo.id] || 0;
                return (
                  <motion.div
                    key={combo.id}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="group relative overflow-hidden rounded-3xl border border-white/5 bg-[#0f0f13]/40 hover:bg-[#0f0f13]/80 hover:border-white/10 transition-all duration-300 p-6 flex flex-col justify-between gap-5 shadow-glass backdrop-blur-sm"
                  >
                    {/* Glowing background card effect */}
                    <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-brand-gold/5 blur-2xl group-hover:bg-brand-gold/10 transition-all duration-300 pointer-events-none" />

                    {/* Image & Main Info Layout */}
                    <div className="flex gap-5">
                      <div className="h-28 w-28 rounded-2xl overflow-hidden border border-white/10 flex-shrink-0 bg-white/5 relative shadow-lg">
                        <img
                          src={getImageUrl(combo.imageUrl) || 'https://images.unsplash.com/photo-1578849278619-e73505e9610f?q=80&w=200'}
                          alt={combo.name}
                          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        {combo.discountBadge && (
                          <div className="absolute top-2 left-2 bg-brand/85 text-white text-[8px] font-black uppercase px-2 py-0.5 rounded tracking-wide shadow-md">
                            {combo.discountBadge}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col justify-center min-w-0">
                        <h4 className="text-sm font-black text-white group-hover:text-brand-gold transition-colors truncate uppercase leading-snug">
                          {combo.name}
                        </h4>
                        <p className="text-xs text-gray-500 mt-1.5 leading-relaxed line-clamp-3">
                          {combo.description}
                        </p>
                        
                        <div className="flex items-baseline gap-2 mt-3">
                          <span className="text-sm font-black text-brand-gold">{currencyFormatter.format(combo.price)}</span>
                          {combo.originalPrice && combo.originalPrice > combo.price && (
                            <span className="text-[11px] text-gray-500 line-through font-medium">
                              {currencyFormatter.format(combo.originalPrice)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Detailed combo items & picker block */}
                    <div className="flex items-center justify-between border-t border-white/5 pt-4 mt-1">
                      {/* Products detailed breakdown list */}
                      <div className="flex flex-wrap gap-1 text-[10px] text-gray-500 font-bold max-w-[60%]">
                        {combo.comboItems?.map((ci) => (
                          <span key={`item-${ci.productId}`} className="bg-white/[0.02] border border-white/5 px-2 py-0.5 rounded-md">
                            {ci.productName} x{ci.quantity}
                          </span>
                        ))}
                      </div>

                      {/* Quantity Selector Picker */}
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => updateComboQty(combo.id, -1)}
                          disabled={qty === 0}
                          className="h-8 w-8 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors cursor-pointer"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="text-sm font-mono font-black text-white w-5 text-center">{qty}</span>
                        <button
                          onClick={() => updateComboQty(combo.id, 1)}
                          className="h-8 w-8 rounded-xl bg-brand-gold border border-brand-gold/10 hover:bg-brand-gold/90 text-black flex items-center justify-center transition-all duration-300 cursor-pointer shadow-[0_0_10px_rgba(229,169,59,0.15)] hover:shadow-[0_0_15px_rgba(229,169,59,0.3)]"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Booking Summary & Action Button */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-1.5">
            <Utensils size={12} className="text-brand-gold" />
            Tóm Tắt Đơn Vé
          </h3>

          <BookingSummary
            showtime={selectedShowtime}
            seats={selectedSeats}
            cinemaName={cinema?.cinemaName || selectedShowtime?.cinemaName || 'Cinema Center'}
            serviceFee={serviceFee}
            promoCode={appliedVoucher?.promoCode}
            discountAmount={discountAmount}
            totalAmount={calculatedGrandTotal}
            combos={selectedCombosArray}
          />

          {/* Action Call buttons */}
          <div className="flex flex-col gap-3.5 mt-2">
            <button
              onClick={handleProceedToPayment}
              disabled={savingCombos}
              className="w-full bg-brand-gold hover:bg-brand-gold/90 disabled:bg-gray-800 text-black disabled:text-gray-600 font-black py-4 rounded-2xl transition-all duration-300 shadow-[0_0_20px_rgba(229,169,59,0.25)] flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed text-sm uppercase tracking-wider"
            >
              {savingCombos ? (
                <>
                  <Loader2 size={16} className="animate-spin text-black" />
                  Đang ghi nhận...
                </>
              ) : (
                <>
                  Tiếp Tục
                  <ArrowRight size={14} />
                </>
              )}
            </button>
            
            <button
              onClick={() => navigate(`/booking-voucher${queryBookingId ? `?bookingId=${bookingId}` : ''}`)}
              disabled={savingCombos || selectedCombosArray.length > 0}
              className="w-full bg-white/5 border border-white/10 hover:bg-white/10 text-gray-400 hover:text-white font-extrabold py-3.5 rounded-2xl text-[11px] uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Bỏ qua bước chọn Combo
            </button>
          </div>

          <div className="flex items-start gap-2.5 bg-white/[0.02] border border-white/5 rounded-xl px-4 py-3 text-[10px] text-gray-500 leading-normal font-medium">
            <Info size={14} className="text-gray-600 shrink-0 mt-0.5" />
            <span>Mỗi combo có điều khoản đổi nhận hàng trực tiếp tại quầy concession trước giờ chiếu phim. Vui lòng mang QR Code đến quầy nhận bắp nước.</span>
          </div>
        </div>

      </div>

    </div>
  );
};
