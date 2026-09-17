import { useState, useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toggleSeatSelection } from '../store/bookingSlice';
import type { RootState } from '../store';
import type { Seat, Showtime, SeatHubResponse } from '../types/seat';
import { useToast } from '../contexts/ToastContext';
import { isCoupleSeat } from '../utils/seatHelpers';

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
  releaseSeatRemote: (seatId: number) => Promise<SeatHubResponse | null>,
  seats: Seat[]
) => {
  const dispatch = useDispatch();
  const selectedSeats = useSelector((state: RootState) => state.booking.selectedSeats);
  const { showToast } = useToast();
  
  const [pendingSeatIds, setPendingSeatIds] = useState<number[]>([]);
  const clickLockRef = useRef<Record<number, boolean>>({});

  const handleSeatClick = useCallback(async (seat: Seat) => {
    if (!selectedShowtime || !currentUserId) return;

    const isCurrentlySelected = selectedSeats.some((s) => s.seatId === seat.seatId);
    const isCouple = isCoupleSeat(seat.seatTypeName);
    const partner = isCouple
      ? seats.find((s) => s.rowName === seat.rowName && s.seatNumber === seat.seatNumber + 1)
      : null;

    // Guard 1: Maximum 8 seats selection limit
    const addedCount = partner ? 2 : 1;
    if (!isCurrentlySelected && selectedSeats.length + addedCount > 8) {
      showToast('Bạn chỉ được chọn tối đa 8 ghế.', 'warning');
      return;
    }

    // Guard 2: Already booked or locked by others
    if (bookedSeatIds.includes(seat.seatId)) return;
    const lockOwner = lockedSeats[seat.seatId];
    if (lockOwner && (lockOwner.userId !== currentUserId || lockOwner.sessionId !== sessionId)) return;

    if (partner) {
      if (bookedSeatIds.includes(partner.seatId)) return;
      const partnerLockOwner = lockedSeats[partner.seatId];
      if (partnerLockOwner && (partnerLockOwner.userId !== currentUserId || partnerLockOwner.sessionId !== sessionId)) return;
    }

    // Guard 3: Prevent concurrent actions on the same seat
    if (clickLockRef.current[seat.seatId] || pendingSeatIds.includes(seat.seatId)) {
      return;
    }
    if (partner && (clickLockRef.current[partner.seatId] || pendingSeatIds.includes(partner.seatId))) {
      return;
    }

    clickLockRef.current[seat.seatId] = true;
    setPendingSeatIds((prev) => [...prev, seat.seatId]);
    if (partner) {
      clickLockRef.current[partner.seatId] = true;
      setPendingSeatIds((prev) => [...prev, partner.seatId]);
    }

    console.log('[handleSeatClick] Clicked seat:', seat.seatId, 'isCurrentlySelected:', isCurrentlySelected, 'currentUserId:', currentUserId, 'sessionId:', sessionId);

    try {
      if (isCurrentlySelected) {
        console.log('[handleSeatClick] Calling releaseSeatRemote for couple/single...');
        const promises = [releaseSeatRemote(seat.seatId)];
        if (partner) {
          promises.push(releaseSeatRemote(partner.seatId));
        }
        const results = await Promise.all(promises);
        if (results.every(r => r && r.success)) {
          dispatch(toggleSeatSelection(seat));
          if (partner) {
            dispatch(toggleSeatSelection(partner));
          }
        } else {
          console.warn('Backend rejected seat release');
        }
      } else {
        console.log('[handleSeatClick] Calling selectSeatRemote for couple/single...');
        const promises = [selectSeatRemote(seat.seatId)];
        if (partner) {
          promises.push(selectSeatRemote(partner.seatId));
        }
        const results = await Promise.all(promises);
        if (results.every(r => r && r.success)) {
          dispatch(toggleSeatSelection(seat));
          if (partner) {
            dispatch(toggleSeatSelection(partner));
          }
        } else {
          // If any lock fails, release whatever succeeded
          results.forEach((r, idx) => {
            if (r && r.success) {
              const idToRelease = idx === 0 ? seat.seatId : partner?.seatId;
              if (idToRelease) releaseSeatRemote(idToRelease).catch(Boolean);
            }
          });
          showToast('Không thể chọn ghế này. Ghế đã bị giữ hoặc chọn bởi người khác.', 'error');
        }
      }
    } catch (err) {
      console.error('Remote seat update failed.', err);
    } finally {
      delete clickLockRef.current[seat.seatId];
      setPendingSeatIds((prev) => prev.filter((id) => id !== seat.seatId));
      if (partner) {
        delete clickLockRef.current[partner.seatId];
        setPendingSeatIds((prev) => prev.filter((id) => id !== partner.seatId));
      }
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
    dispatch,
    seats
  ]);

  return {
    selectedSeats,
    pendingSeatIds,
    handleSeatClick
  };
};
