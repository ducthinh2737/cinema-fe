import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { Calendar, Clock, MapPin, Ticket, ShieldAlert, Tag, X } from 'lucide-react';
import type { Showtime, Seat } from '../../types/seat';
import { applyVoucherSuccess, removeVoucher } from '../../store/bookingSlice';
import { apiClient, getImageUrl } from '../../api/client';
import { useToast } from '../../contexts/ToastContext';
import { calculateTotalTicketPrice, currencyFormatter } from '../../utils/seatHelpers';

interface BookingSidebarProps {
  selectedShowtime: Showtime;
  selectedSeats: Seat[];
  appliedVoucher: {
    promoCode: string;
    discountValue: number;
    discountType: string;
  } | null;
  discountAmount: number;
  serviceFee: number;
  submitting: boolean;
  onCheckout: (finalTotal: number) => void;
}

/**
 * Checkout summary panel for pricing aggregation, coupon code validation, and booking completion.
 */
export const BookingSidebar: React.FC<BookingSidebarProps> = ({
  selectedShowtime,
  selectedSeats,
  appliedVoucher,
  discountAmount,
  serviceFee,
  submitting,
  onCheckout
}) => {
  const dispatch = useDispatch();
  const { showToast } = useToast();
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [validatingPromo, setValidatingPromo] = useState(false);

  const movie = selectedShowtime.movie;
  const ticketTotal = calculateTotalTicketPrice(selectedSeats, selectedShowtime);
  const grandTotal = Math.max(ticketTotal + serviceFee - discountAmount, 0);

  const handleApplyVoucher = async () => {
    if (!promoCodeInput.trim()) {
      showToast('Vui lòng nhập mã giảm giá.', 'warning');
      return;
    }
    if (selectedSeats.length === 0) {
      showToast('Vui lòng chọn ghế trước khi áp dụng mã.', 'warning');
      return;
    }

    setValidatingPromo(true);
    try {
      const response = await apiClient.post('/promotions/validate', {
        promoCode: promoCodeInput.trim(),
        totalAmount: ticketTotal
      });

      const responseData = response.data?.data ?? response.data;
      const discount = responseData.discountAmount ?? 0;

      dispatch(applyVoucherSuccess({
        promoCode: responseData.promoCode || promoCodeInput.trim(),
        discountValue: discount,
        discountType: 'Fixed',
        discountAmount: discount
      }));

      showToast('Áp dụng mã giảm giá thành công!', 'success');
      setPromoCodeInput('');
    } catch (err: any) {
      const msg = err.response?.data?.message || err.response?.data?.Message || 'Mã giảm giá không hợp lệ hoặc đã hết hạn.';
      showToast(msg, 'error');
    } finally {
      setValidatingPromo(false);
    }
  };

  const handleRemoveVoucher = () => {
    dispatch(removeVoucher());
    showToast('Đã xóa mã giảm giá.', 'info');
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('vi-VN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  return (
    <div className="bg-background-card/25 border border-white/5 rounded-3xl p-6 backdrop-blur-xl shadow-glass flex flex-col gap-6 text-left sticky top-6">
      {/* Movie Info */}
      <div className="flex gap-4 border-b border-white/5 pb-5">
        <div className="h-24 w-16 rounded-xl overflow-hidden flex-shrink-0 border border-white/10">
          <img
            src={getImageUrl(movie?.posterUrl) || 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?q=80&w=200'}
            alt={movie?.title}
            className="h-full w-full object-cover"
          />
        </div>
        <div className="flex flex-col justify-center min-w-0">
          <h3 className="text-base font-black text-white truncate leading-snug">{movie?.title}</h3>
          <span className="text-[10px] bg-brand/10 border border-brand/20 text-brand font-black uppercase px-2 py-0.5 rounded w-max mt-1 tracking-wider">
            {selectedShowtime.hall?.hallTypeName || '2D'}
          </span>
          <div className="flex items-center gap-3 text-xs text-gray-500 mt-2 font-medium">
            <span className="flex items-center gap-1"><Clock size={12} /> {movie?.duration} phút</span>
          </div>
        </div>
      </div>

      {/* Showtime info details */}
      <div className="flex flex-col gap-3.5 border-b border-white/5 pb-5">
        <div className="flex items-start gap-3 text-xs">
          <MapPin size={14} className="text-brand mt-0.5 flex-shrink-0" />
          <div className="flex flex-col">
            <span className="text-[9px] text-gray-500 font-black uppercase tracking-wider">Rạp & Phòng chiếu</span>
            <span className="text-gray-300 font-bold mt-0.5">
              {selectedShowtime.cinemaName || 'Cinema Hall'} • {selectedShowtime.hallName || selectedShowtime.hall?.name}
            </span>
          </div>
        </div>

        <div className="flex items-start gap-3 text-xs">
          <Calendar size={14} className="text-brand-gold mt-0.5 flex-shrink-0" />
          <div className="flex flex-col">
            <span className="text-[9px] text-gray-500 font-black uppercase tracking-wider">Ngày & Giờ</span>
            <span className="text-gray-300 font-bold mt-0.5">
              {formatTime(selectedShowtime.startTime)} • {formatDate(selectedShowtime.startTime)}
            </span>
          </div>
        </div>
      </div>

      {/* Selected Seats summary */}
      <div className="flex items-start gap-3 text-xs border-b border-white/5 pb-5">
        <Ticket size={14} className="text-emerald-400 mt-0.5 flex-shrink-0" />
        <div className="flex flex-col w-full">
          <span className="text-[9px] text-gray-500 font-black uppercase tracking-wider">
            Ghế đã chọn ({selectedSeats.length})
          </span>
          {selectedSeats.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 mt-2 max-h-24 overflow-y-auto pr-1">
              {selectedSeats.map((seat) => (
                <span
                  key={seat.seatId}
                  className="bg-white/5 border border-white/10 text-gray-300 text-[10px] font-black px-2.5 py-1 rounded-lg uppercase"
                >
                  {seat.rowName}{seat.seatNumber}
                </span>
              ))}
            </div>
          ) : (
            <span className="text-gray-500 italic mt-1 font-medium">Chưa chọn ghế nào</span>
          )}
        </div>
      </div>

      {/* Voucher Input */}
      <div className="flex flex-col gap-2">
        <span className="text-[9px] text-gray-500 font-black uppercase tracking-wider">Mã Giảm Giá</span>
        {appliedVoucher ? (
          <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 rounded-xl text-emerald-400 text-xs font-bold">
            <div className="flex items-center gap-2">
              <Tag size={12} />
              <span>{appliedVoucher.promoCode} (-{currencyFormatter.format(discountAmount)})</span>
            </div>
            <button
              onClick={handleRemoveVoucher}
              className="p-1 hover:bg-emerald-500/20 rounded-md transition-colors cursor-pointer"
            >
              <X size={12} />
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Nhập mã KM"
              value={promoCodeInput}
              onChange={(e) => setPromoCodeInput(e.target.value.toUpperCase())}
              disabled={selectedSeats.length === 0 || validatingPromo}
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-xs font-semibold focus:outline-none focus:border-brand-gold disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <button
              onClick={handleApplyVoucher}
              disabled={selectedSeats.length === 0 || validatingPromo}
              className="bg-brand border border-brand/20 hover:bg-brand/80 text-white font-bold text-xs px-4 py-2 rounded-xl transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {validatingPromo ? 'Đang áp dụng...' : 'Áp dụng'}
            </button>
          </div>
        )}
      </div>

      {/* Total Calculations */}
      <div className="flex flex-col gap-3 pt-1 text-xs">
        <div className="flex justify-between">
          <span className="text-gray-400 font-medium">Tổng giá vé</span>
          <span className="text-white font-bold">{currencyFormatter.format(ticketTotal)}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-400 font-medium">Phí dịch vụ</span>
          <span className="text-white font-bold">{currencyFormatter.format(serviceFee)}</span>
        </div>

        {appliedVoucher && (
          <div className="flex justify-between text-emerald-400 font-bold">
            <span>Mã giảm giá</span>
            <span>-{currencyFormatter.format(discountAmount)}</span>
          </div>
        )}

        <div className="border-t border-white/5 mt-2 pt-4 flex justify-between items-baseline">
          <span className="text-sm font-black text-white uppercase tracking-wider">Tổng cộng</span>
          <span className="text-xl font-black text-brand-gold">{currencyFormatter.format(grandTotal)}</span>
        </div>
      </div>

      {/* Action Button */}
      <button
        onClick={() => onCheckout(grandTotal)}
        disabled={selectedSeats.length === 0 || submitting}
        className="w-full bg-brand-gold hover:bg-brand-gold/90 disabled:bg-gray-800 text-black disabled:text-gray-600 font-black py-4 rounded-2xl transition-all duration-300 shadow-[0_0_20px_rgba(229,169,59,0.25)] flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed text-sm select-none uppercase tracking-wider"
      >
        {submitting ? (
          <>
            <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
            Đang xử lý...
          </>
        ) : (
          'Tiếp Tục Thanh Toán'
        )}
      </button>

      {/* Expiry Warning */}
      <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-3 flex items-start gap-2 text-[10px] text-gray-500 leading-relaxed font-medium">
        <ShieldAlert size={12} className="text-gray-600 flex-shrink-0 mt-0.5" />
        <span>Ghế chỉ được giữ tạm thời. Vui lòng hoàn tất thanh toán trước khi phiên hết hạn.</span>
      </div>
    </div>
  );
};
