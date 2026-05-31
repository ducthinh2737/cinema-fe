import React from 'react';
import { motion } from 'framer-motion';
import { Clock, Armchair, Sparkles } from 'lucide-react';
import type { Showtime } from '../../types';

interface ShowtimeCardProps {
  showtime: Showtime;
  isSelected: boolean;
  onSelect: (showtime: Showtime) => void;
  basePrice?: number;
}

export const ShowtimeCard: React.FC<ShowtimeCardProps> = ({
  showtime,
  isSelected,
  onSelect,
  basePrice = 80000 // fallback base price
}) => {
  const start = new Date(showtime.startTime);
  const end = new Date(showtime.endTime);
  const timeStr = start.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });
  const endTimeStr = end.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });

  // Calculate price dynamically
  const calculatedPrice = showtime.priceValue || (
    (showtime.hall?.hallTypeName === 'IMAX' || showtime.hall?.hallTypeName === 'VIP') 
      ? basePrice * (showtime.priceMultiplier || 1.0) * 1.2
      : basePrice * (showtime.priceMultiplier || 1.0)
  );

  const formattedPrice = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(calculatedPrice);

  const getFormatBadgeColor = (type: string) => {
    switch (type.toUpperCase()) {
      case 'IMAX':
        return 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-[0_0_10px_rgba(6,182,212,0.3)]';
      case 'VIP':
        return 'bg-gradient-to-r from-amber-500 to-yellow-400 text-black shadow-[0_0_10px_rgba(245,158,11,0.3)]';
      case '3D':
        return 'bg-[#e50914]/20 border border-brand/40 text-brand';
      default:
        return 'bg-white/5 border border-white/10 text-gray-300';
    }
  };

  const lowSeatsThreshold = 10;
  const isLowSeats = showtime.availableSeats <= lowSeatsThreshold && showtime.availableSeats > 0;
  const isSoldOut = showtime.availableSeats === 0;

  return (
    <motion.div
      whileHover={{ y: isSoldOut ? 0 : -4, scale: isSoldOut ? 1 : 1.02 }}
      whileTap={{ scale: isSoldOut ? 1 : 0.98 }}
      onClick={() => !isSoldOut && onSelect(showtime)}
      className={`relative select-none rounded-2xl p-5 border text-left flex flex-col justify-between transition-all duration-300 ${
        isSoldOut 
          ? 'opacity-40 border-white/5 bg-white/[0.01] cursor-not-allowed'
          : isSelected
            ? 'border-brand bg-brand/10 shadow-[0_0_20px_rgba(229,9,20,0.2)] cursor-pointer'
            : 'border-white/5 hover:border-white/15 bg-white/[0.02] hover:bg-white/[0.04] cursor-pointer'
      }`}
    >
      {/* Selection Glow Indicator */}
      {isSelected && (
        <div className="absolute inset-0 rounded-2xl border border-brand/50 pointer-events-none animate-pulse" />
      )}

      {/* Card Header: Time & Badges */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex flex-col">
          <span className="text-xl font-black tracking-tight text-white">{timeStr}</span>
          <span className="text-[10px] text-gray-500 font-semibold mt-0.5 flex items-center gap-1">
            <Clock size={10} /> kết thúc lúc {endTimeStr}
          </span>
        </div>
        <span className={`text-[9px] font-black tracking-wider px-2 py-0.5 rounded-md uppercase ${getFormatBadgeColor(showtime.hall?.hallTypeName || '2D')}`}>
          {showtime.hall?.hallTypeName || '2D'}
        </span>
      </div>

      {/* Card Middle: Hall Name */}
      <div className="mb-4">
        <p className="text-xs font-bold text-gray-200 truncate">
          {showtime.hall?.name || 'Main Hall'}
        </p>
      </div>

      {/* Card Footer: Seat Availability & Price */}
      <div className="border-t border-white/5 pt-3.5 flex items-center justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] text-gray-500 uppercase tracking-widest font-black">Giá vé</span>
          <span className="text-xs font-black text-brand-gold">{formattedPrice}</span>
        </div>

        <div className="flex flex-col items-end gap-1">
          {isSoldOut ? (
            <span className="text-[10px] font-bold text-red-500 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20 uppercase tracking-wider">
              Hết vé
            </span>
          ) : (
            <>
              <div className="flex items-center gap-1 text-[10px] font-bold">
                <Armchair size={11} className={isLowSeats ? 'text-brand' : 'text-emerald-400'} />
                <span className={isLowSeats ? 'text-brand' : 'text-gray-300'}>
                  Còn {showtime.availableSeats} ghế trống
                </span>
              </div>
              {isLowSeats && (
                <span className="text-[8px] font-black text-brand uppercase tracking-wider animate-pulse flex items-center gap-0.5">
                  <Sparkles size={8} /> Sắp hết ghế
                </span>
              )}
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
};
