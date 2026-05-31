import { useState, useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toggleSeatSelection } from '../store/bookingSlice';
import type { RootState } from '../store';
import type { Seat, Showtime, SeatHubResponse } from '../types/seat';
import { useToast } from '../contexts/ToastContext';

/**
 * Enterprise-grade custom hook for seat selection state.
 * Implements non-optimistic server-confirmed updates, click debouncing, and transit queue tracking.
 */
export const useSeatSelection = (
  selectedShowtime: Showtime | null,
  currentUserId: string | undefined,
  sessionId: string,
  lockedSeats: Record<number, { userId: string; sessionId: string }>,
  bookedSeatIds: number[],
  selectSeatRemote: (seatId: number) => Promise<SeatHubResponse | null>,
  releaseSeatRemote: (seatId: number) => Promise<SeatHubResponse | null>
) => {
  const dispatch = useDispatch();
  const selectedSeats = useSelector((state: RootState) => state.booking.selectedSeats);
  const { showToast } = useToast();
  
  const [pendingSeatIds, setPendingSeatIds] = useState<number[]>([]);
  const clickLockRef = useRef<Record<number, boolean>>({});

  const handleSeatClick = useCallback(async (seat: Seat) => {
    if (!selectedShowtime || !currentUserId) return;

    const isCurrentlySelected = selectedSeats.some((s) => s.seatId === seat.seatId);

    // Guard 1: Maximum 8 seats selection limit
    if (!isCurrentlySelected && selectedSeats.length >= 8) {
      showToast('Bạn chỉ được chọn tối đa 8 ghế.', 'warning');
      return;
    }

    // Guard 2: Already booked or locked by others
    if (bookedSeatIds.includes(seat.seatId)) return;
    const lockOwner = lockedSeats[seat.seatId];
    if (lockOwner && (lockOwner.userId !== currentUserId || lockOwner.sessionId !== sessionId)) return;

    // Guard 3: Prevent concurrent actions on the same seat
    if (clickLockRef.current[seat.seatId] || pendingSeatIds.includes(seat.seatId)) {
      return;
    }

    clickLockRef.current[seat.seatId] = true;
    setPendingSeatIds((prev) => [...prev, seat.seatId]);

    console.log('[handleSeatClick] Clicked seat:', seat.seatId, 'isCurrentlySelected:', isCurrentlySelected, 'currentUserId:', currentUserId, 'sessionId:', sessionId);

    try {
      if (isCurrentlySelected) {
        console.log('[handleSeatClick] Calling releaseSeatRemote...');
        const response = await releaseSeatRemote(seat.seatId);
        console.log('[handleSeatClick] releaseSeatRemote response:', response);
        if (response && response.success) {
          console.log('[handleSeatClick] Dispatching toggleSeatSelection (remove):', seat);
          dispatch(toggleSeatSelection(seat));
        } else {
          console.warn('Backend rejected seat release:', response?.message);
        }
      } else {
        console.log('[handleSeatClick] Calling selectSeatRemote...');
        const response = await selectSeatRemote(seat.seatId);
        console.log('[handleSeatClick] selectSeatRemote response:', response);
        if (response && response.success) {
          console.log('[handleSeatClick] Dispatching toggleSeatSelection (add):', seat);
          dispatch(toggleSeatSelection(seat));
        } else {
          console.warn('Backend rejected seat lock:', response?.message);
          alert(response?.message || 'Không thể chọn ghế này. Ghế đã bị giữ hoặc chọn bởi người khác.');
        }
      }
    } catch (err) {
      console.error('Remote seat update failed.', err);
    } finally {
      delete clickLockRef.current[seat.seatId];
      setPendingSeatIds((prev) => prev.filter((id) => id !== seat.seatId));
    }
  }, [
    selectedShowtime,
    currentUserId,
    sessionId,
    bookedSeatIds,
    lockedSeats,
    selectedSeats,
    pendingSeatIds,
    selectSeatRemote,
    releaseSeatRemote,
    showToast,
    dispatch
  ]);

  return {
    selectedSeats,
    pendingSeatIds,
    handleSeatClick
  };
};
