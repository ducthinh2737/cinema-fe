import React, { useMemo } from 'react';
import type { Seat } from '../../types/seat';
import { SeatButton } from './SeatButton';
import { groupSeatsByRow } from '../../utils/seatHelpers';

interface SeatMapProps {
  seats: Seat[];
  selectedSeats: Seat[];
  lockedSeats: Record<number, { userId: string; sessionId: string }>;
  bookedSeatIds: number[];
  pendingSeatIds: number[];
  currentUserId: string | undefined;
  sessionId: string;
  onSeatClick: (seat: Seat) => void;
  zoomScale: number;
}

/**
 * Grid system component displaying layout rows and handling high-performance rendering.
 * Rows are memoized to avoid full canvas re-renders when single seats are updated.
 */
export const SeatMap: React.FC<SeatMapProps> = React.memo(({
  seats,
  selectedSeats,
  lockedSeats,
  bookedSeatIds,
  pendingSeatIds,
  currentUserId,
  sessionId,
  onSeatClick,
  zoomScale
}) => {
  const groupedRows = useMemo(() => groupSeatsByRow(seats), [seats]);

  return (
    <div className="w-full overflow-auto py-12 flex justify-center items-center min-h-[350px]">
      <div
        style={{ transform: `scale(${zoomScale})`, transformOrigin: 'center center' }}
        className="transition-transform duration-300 flex flex-col gap-3 min-w-max px-8"
      >
        {Object.entries(groupedRows).map(([rowName, rowSeats]) => (
          <div key={rowName} className="flex items-center gap-3">
            {/* Row Label Left */}
            <div className="w-6 text-xs text-gray-500 font-mono font-bold text-center select-none">
              {rowName}
            </div>

            {/* Row Seats */}
            <div className="flex gap-2">
              {rowSeats
                .sort((a, b) => a.seatNumber - b.seatNumber)
                .map((seat) => {
                  const isSelected = selectedSeats.some((s) => s.seatId === seat.seatId);
                  const lockOwner = lockedSeats[seat.seatId];
                  const isLockedByMe = !!lockOwner && lockOwner.userId === currentUserId && lockOwner.sessionId === sessionId;
                  const isLockedByOthers = !!lockOwner && (lockOwner.userId !== currentUserId || lockOwner.sessionId !== sessionId);
                  const isBooked = bookedSeatIds.includes(seat.seatId);
                  const isPending = pendingSeatIds.includes(seat.seatId);

                  return (
                    <SeatButton
                      key={seat.seatId}
                      seat={seat}
                      isSelected={isSelected}
                      isLockedByMe={isLockedByMe}
                      isLockedByOthers={isLockedByOthers}
                      isBooked={isBooked}
                      isPending={isPending}
                      onClick={onSeatClick}
                    />
                  );
                })}
            </div>

            {/* Row Label Right */}
            <div className="w-6 text-xs text-gray-500 font-mono font-bold text-center select-none">
              {rowName}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

SeatMap.displayName = 'SeatMap';
