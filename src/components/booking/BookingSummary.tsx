import React from 'react';
import { Calendar, Clock, MapPin, Ticket, ShieldAlert } from 'lucide-react';
import { getImageUrl } from '../../api/client';
import { parseApiDate } from '../../utils/dateHelpers';
import { calculateTotalTicketPrice } from '../../utils/seatHelpers';
import type { Showtime, Seat } from '../../types/seat';

interface BookingSummaryProps {
  showtime: Showtime;
  seats: Seat[];
  cinemaName: string;
  serviceFee: number;
  promoCode?: string;
  discountAmount: number;
  pointsDiscountAmount?: number;
  totalAmount: number;
  combos?: { comboId: number; comboName: string; quantity: number; price: number }[];
}

export const BookingSummary: React.FC<BookingSummaryProps> = ({
  showtime,
  seats,
  cinemaName,
  serviceFee,
  promoCode,
  discountAmount,
  pointsDiscountAmount,
  totalAmount,
  combos,
}) => {
  const movie = showtime.movie;
  
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

  const currencyFormatter = new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'
  });

  const totalTicketPrice = calculateTotalTicketPrice(seats, showtime);
  const combosTotal = combos?.reduce((sum, item) => sum + item.price * item.quantity, 0) || 0;

  return (
    <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 backdrop-blur-xl shadow-glass flex flex-col gap-6 text-left">
      
      {/* Movie Information Row */}
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
            {showtime.hall?.hallTypeName || '2D'}
          </span>
          <div className="flex items-center gap-3 text-xs text-gray-500 mt-2 font-medium">
            <span className="flex items-center gap-1"><Clock size={12} /> {movie?.duration} phút</span>
            <span>•</span>
            <span className="capitalize">{movie?.language}</span>
          </div>
        </div>
      </div>

      {/* Showtime Details */}
      <div className="flex flex-col gap-3.5 border-b border-white/5 pb-5">
        <div className="flex items-start gap-3 text-xs">
          <MapPin size={14} className="text-brand mt-0.5 flex-shrink-0" />
          <div className="flex flex-col">
            <span className="text-[9px] text-gray-500 font-black uppercase tracking-wider">Rạp & Phòng chiếu</span>
            <span className="text-gray-300 font-bold mt-0.5">{cinemaName} • {showtime.hallName || showtime.hall?.name}</span>
          </div>
        </div>

        <div className="flex items-start gap-3 text-xs">
          <Calendar size={14} className="text-brand-gold mt-0.5 flex-shrink-0" />
          <div className="flex flex-col">
            <span className="text-[9px] text-gray-500 font-black uppercase tracking-wider">Ngày & Giờ</span>
            <span className="text-gray-300 font-bold mt-0.5">
              {formatTime(showtime.startTime)} • {formatDate(showtime.startTime)}
            </span>
          </div>
        </div>
      </div>

      {/* Seats Summary */}
      <div className="flex items-start gap-3 text-xs border-b border-white/5 pb-5">
        <Ticket size={14} className="text-emerald-400 mt-0.5 flex-shrink-0" />
        <div className="flex flex-col w-full">
          <span className="text-[9px] text-gray-500 font-black uppercase tracking-wider">Ghế đã chọn ({seats.length})</span>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {seats.map((seat) => (
              <span
                key={seat.seatId}
                className="bg-white/5 border border-white/10 text-gray-300 text-[10px] font-black px-2.5 py-1 rounded-lg uppercase"
              >
                {seat.rowName}{seat.seatNumber} ({seat.seatTypeName})
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Combos Summary */}
      {combos && combos.length > 0 && (
        <div className="flex items-start gap-3 text-xs border-b border-white/5 pb-5">
          <div className="h-3.5 w-3.5 bg-brand-gold rounded-full flex items-center justify-center text-[8px] font-black text-black mt-0.5 flex-shrink-0">C</div>
          <div className="flex flex-col w-full">
            <span className="text-[9px] text-gray-500 font-black uppercase tracking-wider">Bắp nước đã chọn</span>
            <div className="flex flex-col gap-2 mt-2">
              {combos.map((combo) => (
                <div key={combo.comboId} className="flex justify-between items-center bg-white/5 border border-white/10 px-3 py-2 rounded-xl text-gray-300">
                  <span className="text-[10px] font-black uppercase">{combo.comboName} x {combo.quantity}</span>
                  <span className="text-[10px] font-bold text-white">{currencyFormatter.format(combo.price * combo.quantity)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Pricing Deductions Summary */}
      <div className="flex flex-col gap-3 pt-1 text-xs">
        <div className="flex justify-between">
          <span className="text-gray-400 font-medium">Tổng giá vé</span>
          <span className="text-white font-bold">{currencyFormatter.format(totalTicketPrice)}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-400 font-medium">Phí dịch vụ</span>
          <span className="text-white font-bold">{currencyFormatter.format(serviceFee)}</span>
        </div>

        {combosTotal > 0 && (
          <div className="flex justify-between">
            <span className="text-gray-400 font-medium">Bắp nước</span>
            <span className="text-white font-bold">{currencyFormatter.format(combosTotal)}</span>
          </div>
        )}

        {promoCode && (
          <div className="flex justify-between text-emerald-400 font-bold">
            <span className="flex items-center gap-1">Đã áp dụng mã giảm giá ({promoCode})</span>
            <span>-{currencyFormatter.format(discountAmount)}</span>
          </div>
        )}

        {pointsDiscountAmount && pointsDiscountAmount > 0 ? (
          <div className="flex justify-between text-green-400 font-bold">
            <span className="flex items-center gap-1">Điểm thành viên quy đổi</span>
            <span>-{currencyFormatter.format(pointsDiscountAmount)}</span>
          </div>
        ) : null}

        <div className="border-t border-white/5 mt-2 pt-4 flex justify-between items-baseline">
          <span className="text-sm font-black text-white uppercase tracking-wider">Tổng cộng</span>
          <span className="text-xl font-black text-brand-gold">{currencyFormatter.format(totalAmount)}</span>
        </div>
      </div>

      {/* Security Disclaimer */}
      <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-3 flex items-start gap-2 text-[10px] text-gray-500 leading-relaxed font-medium">
        <ShieldAlert size={12} className="text-gray-600 flex-shrink-0 mt-0.5" />
        <span>Vé chỉ được giữ trong thời gian giới hạn. Giao dịch chưa hoàn tất sẽ tự động giải phóng ghế đã chọn.</span>
      </div>

    </div>
  );
};
