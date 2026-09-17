import { useEffect, useState, useCallback, useRef } from 'react';
import { useSignalR } from './useSignalR';
import type { Showtime, SeatHubResponse } from '../types/seat';

/**
 * Enterprise-grade custom hook for handling real-time SignalR seat locks and updates.
 * Implements strict event bindings, cleanup triggers, and guards against stale React closures.
 */
export const useSeatRealtime = (
  selectedShowtime: Showtime | null,
  currentUserId: string | undefined,
  onSeatLockFailed: (seatId: number, message: string) => void,
  onSeatExpired: (seatIds: number[]) => void,
  onBookingConfirmed: (seatIds: number[]) => void
) => {
  const [lockedSeats, setLockedSeats] = useState<Record<number, { userId: string; sessionId: string }>>({});
  const [bookedSeatIds, setBookedSeatIds] = useState<number[]>([]);
  const [sessionId] = useState<string>(() => {
    let id = sessionStorage.getItem('cinema_booking_session_id');
    if (!id) {
      id = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      sessionStorage.setItem('cinema_booking_session_id', id);
    }
    return id;
  });

  // Use refs to avoid stale closures in event handler callbacks
  const onSeatLockFailedRef = useRef(onSeatLockFailed);
  const onSeatExpiredRef = useRef(onSeatExpired);
  const onBookingConfirmedRef = useRef(onBookingConfirmed);

  useEffect(() => {
    onSeatLockFailedRef.current = onSeatLockFailed;
    onSeatExpiredRef.current = onSeatExpired;
    onBookingConfirmedRef.current = onBookingConfirmed;
  }, [onSeatLockFailed, onSeatExpired, onBookingConfirmed]);

  const { isConnected, on, off, invoke } = useSignalR('/hub/seat');

  // Single seat locked
  const handleSeatLocked = useCallback((showtimeId: number, seatId: number, userId: string, sessionId: string) => {
    if (selectedShowtime && showtimeId === selectedShowtime.showtimeId) {
      setLockedSeats((prev) => ({ ...prev, [seatId]: { userId, sessionId } }));
    }
  }, [selectedShowtime]);

  // Single seat selected via booking
  const handleSeatSelected = useCallback((showtimeId: number, seatId: number, userId: string) => {
    if (selectedShowtime && showtimeId === selectedShowtime.showtimeId) {
      setLockedSeats((prev) => ({ ...prev, [seatId]: { userId, sessionId: '' } }));
    }
  }, [selectedShowtime]);

  // Single seat released
  const handleSeatReleased = useCallback((showtimeId: number, seatId: number, reason?: string) => {
    if (selectedShowtime && showtimeId === selectedShowtime.showtimeId) {
      setLockedSeats((prev) => {
        const next = { ...prev };
        delete next[seatId];
        return next;
      });
      if (reason === 'seat_expired') {
        onSeatExpiredRef.current([seatId]);
      }
    }
  }, [selectedShowtime]);

  // Bulk seats locked
  const handleSeatsLocked = useCallback((data: { showtimeId: number; seatIds: number[]; userId: string; sessionId: string }) => {
    if (selectedShowtime && data.showtimeId === selectedShowtime.showtimeId) {
      setLockedSeats((prev) => {
        const next = { ...prev };
        data.seatIds.forEach((id) => {
          next[id] = { userId: data.userId, sessionId: data.sessionId };
        });
        return next;
      });
    }
  }, [selectedShowtime]);

  // Bulk seats released
  const handleSeatsReleased = useCallback((data: { showtimeId: number; seatIds: number[]; userId?: string; reason?: string }) => {
    if (selectedShowtime && data.showtimeId === selectedShowtime.showtimeId) {
      setLockedSeats((prev) => {
        const next = { ...prev };
        data.seatIds.forEach((id) => {
          delete next[id];
        });
        return next;
      });
      if (data.reason === 'seat_expired') {
        onSeatExpiredRef.current(data.seatIds);
      }
    }
  }, [selectedShowtime]);

  // Seat lock failure
  const handleSeatLockFailed = useCallback((showtimeId: number, seatId: number, message: string) => {
    if (selectedShowtime && showtimeId === selectedShowtime.showtimeId) {
      onSeatLockFailedRef.current(seatId, message);
    }
  }, [selectedShowtime]);

  // Booking confirmed
  const handleBookingConfirmed = useCallback((showtimeId: number, seatIds: number[]) => {
    if (selectedShowtime && showtimeId === selectedShowtime.showtimeId) {
      setBookedSeatIds((prev) => [...new Set([...prev, ...seatIds])]);
      setLockedSeats((prev) => {
        const next = { ...prev };
        seatIds.forEach((id) => {
          delete next[id];
        });
        return next;
      });
      onBookingConfirmedRef.current(seatIds);
    }
  }, [selectedShowtime]);

  // Manage connection lifecycle and listener bindings
  useEffect(() => {
    if (isConnected && selectedShowtime) {
      invoke('JoinShowtime', selectedShowtime.showtimeId)
        .catch((err) => console.error('Error joining showtime room', err));

      on('SeatLocked', handleSeatLocked);
      on('SeatSelected', handleSeatSelected);
      on('SeatReleased', handleSeatReleased);
      on('SeatsLocked', handleSeatsLocked);
      on('SeatsReleased', handleSeatsReleased);
      on('SeatLockFailed', handleSeatLockFailed);
      on('BookingConfirmed', handleBookingConfirmed);

      return () => {
        off('SeatLocked', handleSeatLocked);
        off('SeatSelected', handleSeatSelected);
        off('SeatReleased', handleSeatReleased);
        off('SeatsLocked', handleSeatsLocked);
        off('SeatsReleased', handleSeatsReleased);
        off('SeatLockFailed', handleSeatLockFailed);
        off('BookingConfirmed', handleBookingConfirmed);
        invoke('LeaveShowtime', selectedShowtime.showtimeId).catch(() => {});
      };
    }
  }, [
    isConnected,
    selectedShowtime,
    handleSeatLocked,
    handleSeatSelected,
    handleSeatReleased,
    handleSeatsLocked,
    handleSeatsReleased,
    handleSeatLockFailed,
    handleBookingConfirmed,
    on,
    off,
    invoke
  ]);

  const selectSeatRemote = useCallback(async (seatId: number): Promise<SeatHubResponse | null> => {
    if (!currentUserId || !selectedShowtime) return null;
    return await invoke('SelectSeat', selectedShowtime.showtimeId, seatId, currentUserId, sessionId);
  }, [selectedShowtime, currentUserId, sessionId, invoke]);

  const releaseSeatRemote = useCallback(async (seatId: number): Promise<SeatHubResponse | null> => {
    if (!currentUserId || !selectedShowtime) return null;
    return await invoke('ReleaseSeat', selectedShowtime.showtimeId, seatId, currentUserId, sessionId);
  }, [selectedShowtime, currentUserId, sessionId, invoke]);

  const refreshSeatLockRemote = useCallback(async (seatIds: number[]): Promise<SeatHubResponse | null> => {
    if (!currentUserId || !selectedShowtime || seatIds.length === 0) return null;
    return await invoke('RefreshSeatLock', selectedShowtime.showtimeId, seatIds, currentUserId, sessionId);
  }, [selectedShowtime, currentUserId, sessionId, invoke]);

  return {
    isConnected,
    lockedSeats,
    setLockedSeats,
    bookedSeatIds,
    setBookedSeatIds,
    selectSeatRemote,
    releaseSeatRemote,
    refreshSeatLockRemote,
    sessionId
  };
};
