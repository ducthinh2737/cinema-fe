import React from 'react';
import type { Seat } from '../../types/seat';
import { isCoupleSeat } from '../../utils/seatHelpers';

interface SeatButtonProps {
  seat: Seat;
  isSelected: boolean;
  isLockedByMe: boolean;
  isLockedByOthers: boolean;
  isBooked: boolean;
  isPending: boolean;
  onClick: (seat: Seat) => void;
  isSweetboxLeft?: boolean;
}

/**
 * Highly optimized, memoized seat button representing layout and interactive states.
 * Uses customized color palettes and micro-shadow configurations.
 */
export const SeatButton: React.FC<SeatButtonProps> = React.memo(({
  seat,
  isSelected,
  isLockedByMe,
  isLockedByOthers,
  isBooked,
  isPending,
  onClick,
  isSweetboxLeft = false
}) => {
  const getSeatStyles = () => {
    if (isBooked) {
      return 'bg-[#1a1213] border border-red-950/20 text-gray-700 cursor-not-allowed text-[8px] font-black flex items-center justify-center';
    }
    if (isLockedByOthers) {
      return 'bg-[#221c1c] border border-red-900/50 text-red-500/30 cursor-not-allowed';
    }
    if (isSelected) {
      return 'bg-brand-gold text-black border-brand-gold shadow-[0_0_12px_rgba(229,169,59,0.6)] font-bold animate-pulse scale-105';
    }
    if (isLockedByMe) {
      return 'bg-brand-gold/40 text-brand-gold border-brand-gold/60 font-bold';
    }
    if (isPending) {
      return 'bg-brand-gold/20 border border-brand-gold/40 animate-pulse cursor-wait';
    }

    if (seat.seatTypeName === 'VIP') {
      return 'bg-[#2a243d] border border-purple-900/50 hover:bg-purple-800/20 hover:border-purple-500 text-purple-300';
    }
    if (isCoupleSeat(seat.seatTypeName)) {
      return 'bg-[#3b1b22] border border-red-950 hover:bg-red-900/20 hover:border-red-500 text-red-300';
    }
    return 'bg-[#1b1c22] border border-gray-800 hover:bg-white/5 hover:border-gray-500 text-gray-400';
  };

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isBooked || isLockedByOthers || isPending) return;
    onClick(seat);
  };

  return (
    <button
      onClick={handleClick}
      disabled={isBooked || isLockedByOthers || isPending}
      className={`h-8 rounded-lg text-[10px] font-mono flex items-center justify-center transition-all duration-200 select-none cursor-pointer ${
        isSweetboxLeft ? 'w-[72px]' : 'w-8'
      } ${getSeatStyles()}`}
      title={`Ghế ${seat.rowName}${seat.seatNumber}${
        isSweetboxLeft ? `-${seat.seatNumber + 1}` : ''
      } (${seat.seatTypeName})`}
    >
      {isBooked ? 'X' : isSweetboxLeft ? `${seat.seatNumber}-${seat.seatNumber + 1}` : seat.seatNumber}
    </button>
  );
});

SeatButton.displayName = 'SeatButton';
