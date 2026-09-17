import React from 'react';
import { Calendar, Clock, MapPin, Ticket, ShieldAlert } from 'lucide-react';
import type { Showtime, Seat } from '../../types/seat';
import { getImageUrl } from '../../api/client';
import { calculateTotalTicketPrice, currencyFormatter } from '../../utils/seatHelpers';
import { parseApiDate } from '../../utils/dateHelpers';

interface BookingSidebarProps {
  selectedShowtime: Showtime;
  selectedSeats: Seat[];
  serviceFee: number;
  submitting: boolean;
  onCheckout: (finalTotal: number) => void;
}

/**
 * Simplified checkout summary panel for seat selection phase.
 */
export const BookingSidebar: React.FC<BookingSidebarProps> = ({
  selectedShowtime,
  selectedSeats,
  serviceFee,
  submitting,
  onCheckout
}) => {
  const movie = selectedShowtime.movie;
  const ticketTotal = calculateTotalTicketPrice(selectedSeats, selectedShowtime);
  const grandTotal = ticketTotal + serviceFee;

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
          <div className="flex flex-wrap gap-1.5 mt-1 items-center">
            <span className="text-[10px] bg-brand/10 border border-brand/20 text-brand font-black uppercase px-2 py-0.5 rounded w-max tracking-wider">
              {selectedShowtime.hall?.hallTypeName || '2D'}
            </span>
            {movie?.releaseDate && parseApiDate(selectedShowtime.startTime) < parseApiDate(movie.releaseDate) && (
              <span className="text-[10px] bg-purple-500/15 border border-purple-500/30 text-purple-400 font-black uppercase px-2 py-0.5 rounded w-max tracking-wider">
                Suất chiếu sớm
              </span>
            )}
          </div>
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
          'Tiếp tục'
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
