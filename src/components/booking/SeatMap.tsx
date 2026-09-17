import React, { useMemo } from 'react';
import type { Seat } from '../../types/seat';
import { SeatButton } from './SeatButton';
import { groupSeatsByRow, isCoupleSeat } from '../../utils/seatHelpers';

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

  const sortedRowEntries = useMemo(() => {
    return Object.entries(groupedRows).sort(([a], [b]) => a.localeCompare(b));
  }, [groupedRows]);

  return (
    <div className="w-full overflow-auto py-12 flex justify-center items-center min-h-[350px]">
      <div
        style={{ transform: `scale(${zoomScale})`, transformOrigin: 'center center' }}
        className="transition-transform duration-300 flex flex-col gap-3 min-w-max px-8"
      >
        {sortedRowEntries.map(([rowName, rowSeats]) => {
          // Sort row seats by seatNumber ascending
          const sortedSeats = [...rowSeats].sort((a, b) => a.seatNumber - b.seatNumber);

          // Find all Couple/Sweetbox seat pairs in this row
          const coupleSeats = sortedSeats.filter(
            (s) => isCoupleSeat(s.seatTypeName)
          );
          
          const couplePairsLeft = new Set<number>();
          const couplePairsRight = new Set<number>();
          
          let i = 0;
          while (i < coupleSeats.length) {
            const s1 = coupleSeats[i];
            if (i + 1 < coupleSeats.length && coupleSeats[i + 1].seatNumber === s1.seatNumber + 1) {
              couplePairsLeft.add(s1.seatId);
              couplePairsRight.add(coupleSeats[i + 1].seatId);
              i += 2;
            } else {
              i++;
            }
          }

          return (
            <div key={rowName} className="flex items-center gap-3">
              {/* Row Label Left */}
              <div className="w-6 text-xs text-gray-500 font-mono font-bold text-center select-none">
                {rowName}
              </div>

              {/* Row Seats */}
              <div className="flex gap-2">
                {sortedSeats.map((seat) => {
                  const isSweetboxLeft = couplePairsLeft.has(seat.seatId);
                  const isSweetboxRight = couplePairsRight.has(seat.seatId);

                  // If it is the right half of a couple pair, hide it
                  if (isSweetboxRight) return null;

                  const isSelected = selectedSeats.some((s) => s.seatId === seat.seatId);
                  const lockOwner = lockedSeats[seat.seatId];
                  const isLockedByMe =
                    !!lockOwner &&
                    lockOwner.userId === currentUserId &&
                    lockOwner.sessionId === sessionId;
                  const isLockedByOthers =
                    !!lockOwner &&
                    (lockOwner.userId !== currentUserId || lockOwner.sessionId !== sessionId);
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
                      isSweetboxLeft={isSweetboxLeft}
                    />
                  );
                })}
              </div>

              {/* Row Label Right */}
              <div className="w-6 text-xs text-gray-500 font-mono font-bold text-center select-none">
                {rowName}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

SeatMap.displayName = 'SeatMap';
