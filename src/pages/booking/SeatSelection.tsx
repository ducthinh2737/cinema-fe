import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '../../store';
import {
  toggleSeatSelection,
  setBookingDetails,
  clearBooking,
  updateTotalAmount,
  setSelectedSeats
} from '../../store/bookingSlice';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../contexts/ToastContext';
import { apiClient } from '../../api/client';
import type { Seat, Showtime } from '../../types/seat';
import { SeatMap } from '../../components/booking/SeatMap';
import { BookingSidebar } from '../../components/booking/BookingSidebar';
import { useSeatRealtime } from '../../hooks/useSeatRealtime';
import { useSeatSelection } from '../../hooks/useSeatSelection';
import { useSeatTimer } from '../../hooks/useSeatTimer';
import { Clock, ZoomIn, ZoomOut, Move, AlertCircle, RefreshCw, WifiOff } from 'lucide-react';
import { Button } from '../../components/ui/Button';

/**
 * Enterprise-grade page component managing the interactive cinematic seat reservation layout.
 * Tethers SignalR event subscriptions, optimistic layout locks, and session timer countdowns.
 */
export const SeatSelection: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useAuth();
  const { showToast } = useToast();

  const { selectedShowtime, selectedSeats, serviceFee } = useSelector(
    (state: RootState) => state.booking
  );

  const [seats, setSeats] = useState<Seat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);

  // Redirect if no showtime is selected
  useEffect(() => {
    if (!selectedShowtime) {
      showToast('Vui lòng chọn suất chiếu trước.', 'warning');
      navigate('/');
    }
  }, [selectedShowtime, navigate, showToast]);

  // Real-time remote action events callbacks
  const handleSeatLockFailed = useCallback(
    (seatId: number, message: string) => {
      showToast(message || 'Không thể giữ ghế này.', 'error');
      const matched = selectedSeats.find((s) => s.seatId === seatId);
      if (matched) {
        dispatch(toggleSeatSelection(matched));
      }
    },
    [dispatch, showToast, selectedSeats]
  );

  const handleSeatExpired = useCallback(
    (seatIds: number[]) => {
      seatIds.forEach((id) => {
        const matched = selectedSeats.find((s) => s.seatId === id);
        if (matched) {
          dispatch(toggleSeatSelection(matched));
          showToast(`Ghế ${matched.seatNumber} đã hết thời gian giữ.`, 'warning');
        }
      });
    },
    [dispatch, showToast, selectedSeats]
  );

  const handleBookingConfirmed = useCallback(
    (seatIds: number[]) => {
      seatIds.forEach((id) => {
        const matched = selectedSeats.find((s) => s.seatId === id);
        if (matched) {
          dispatch(toggleSeatSelection(matched));
        }
      });
    },
    [dispatch, selectedSeats]
  );

  // Initialize SignalR synchronization
  const {
    isConnected,
    lockedSeats,
    setLockedSeats,
    bookedSeatIds,
    setBookedSeatIds,
    selectSeatRemote,
    releaseSeatRemote,
    refreshSeatLockRemote,
    sessionId
  } = useSeatRealtime(
    selectedShowtime as Showtime | null,
    user?.userId ? String(user.userId) : undefined,
    handleSeatLockFailed,
    handleSeatExpired,
    handleBookingConfirmed
  );

  // Initialize selection manager (optimistic UI toggling & pending queue states)
  const { pendingSeatIds, handleSeatClick } = useSeatSelection(
    selectedShowtime as Showtime | null,
    user?.userId ? String(user.userId) : undefined,
    sessionId,
    lockedSeats,
    bookedSeatIds,
    selectSeatRemote,
    releaseSeatRemote,
    seats
  );

  // Load seats from server
  const fetchSeats = useCallback(async () => {
    if (!selectedShowtime) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get(`/showtimes/${selectedShowtime.showtimeId}/seats`);
      const responseData = res.data?.data ?? res.data;
      const seatItems: Seat[] = Array.isArray(responseData) ? responseData : responseData?.items ?? [];
      setSeats(seatItems);

      // Booked seats
      const booked = seatItems
        .filter((s) => s.status === 'Booked')
        .map((s) => s.seatId);
      setBookedSeatIds(booked);

      // Locked seats
      const locks: Record<number, { userId: string; sessionId: string }> = {};
      const myPreselectedSeats: Seat[] = [];
      const currentUserId = user?.userId ? String(user.userId) : undefined;
      
      console.log('[fetchSeats] currentUserId:', currentUserId, 'sessionId:', sessionId);
      
      seatItems.forEach((s) => {
        if (s.status === 'Locked') {
          console.log('[fetchSeats] Found locked seat in API response:', {
            seatId: s.seatId,
            lockedBy: s.lockedBy,
            lockedBySession: s.lockedBySession
          });
        }
        if (s.status === 'Locked' && s.lockedBy) {
          const lOwner = { userId: String(s.lockedBy), sessionId: String(s.lockedBySession || '') };
          locks[s.seatId] = lOwner;
          
          const matchUser = lOwner.userId === currentUserId;
          const matchSession = lOwner.sessionId === sessionId;
          console.log(`[fetchSeats] Checking seat ${s.seatId}: matchUser=${matchUser}, matchSession=${matchSession} (Owner: ${lOwner.userId}/${lOwner.sessionId}, Current: ${currentUserId}/${sessionId})`);
          
          if (matchUser && matchSession) {
            myPreselectedSeats.push(s);
          }
        }
      });
      console.log('[fetchSeats] lockedSeats computed:', locks);
      console.log('[fetchSeats] myPreselectedSeats computed:', myPreselectedSeats);
      
      setLockedSeats(locks);
      if (myPreselectedSeats.length > 0) {
        console.log('[fetchSeats] Dispatching setSelectedSeats:', myPreselectedSeats);
        dispatch(setSelectedSeats(myPreselectedSeats));
      }
    } catch (err: any) {
      console.warn('Showtime seats fetch failed, attempting static hall seats fallback...', err);
      try {
        const res = await apiClient.get(`/halls/${selectedShowtime.hallId}/seats`);
        const responseData = res.data?.data ?? res.data;
        const seatItems: Seat[] = Array.isArray(responseData) ? responseData : responseData?.items ?? [];
        setSeats(seatItems);
      } catch (fallbackErr: any) {
        setError('Không thể tải sơ đồ ghế ngồi. Vui lòng thử lại sau.');
      }
    } finally {
      setLoading(false);
    }
  }, [selectedShowtime, user, sessionId, setBookedSeatIds, setLockedSeats, dispatch]);

  useEffect(() => {
    fetchSeats();
  }, [fetchSeats]);

  // Expiration countdown handler
  const handleTimeout = useCallback(() => {
    showToast('Phiên giữ ghế đã hết hạn! Vui lòng chọn lại.', 'warning');
    if (selectedShowtime && user) {
      selectedSeats.forEach((seat) => {
        releaseSeatRemote(seat.seatId).catch(Boolean);
      });
    }
    dispatch(clearBooking());
    navigate('/');
  }, [selectedShowtime, user, selectedSeats, releaseSeatRemote, dispatch, navigate, showToast]);

  const { timeLeft, formattedTime, resetTimer, stopTimer } = useSeatTimer(600, handleTimeout);

  // Manage timer lifecycle based on selectedSeats count
  const prevSelectedSeatsCountRef = useRef(0);
  useEffect(() => {
    const currentCount = selectedSeats.length;
    const prevCount = prevSelectedSeatsCountRef.current;

    if (currentCount > 0 && prevCount === 0) {
      resetTimer(600);
    } else if (currentCount === 0) {
      stopTimer();
    }

    prevSelectedSeatsCountRef.current = currentCount;
  }, [selectedSeats.length, resetTimer, stopTimer]);

  // Keep ref of selectedSeats to prevent stale closures and avoid triggering cleanup on every selection change
  const selectedSeatsRef = useRef<Seat[]>([]);
  useEffect(() => {
    selectedSeatsRef.current = selectedSeats;
  }, [selectedSeats]);

  // Clean up locked seats if component is unmounted
  useEffect(() => {
    return () => {
      const currentSelected = selectedSeatsRef.current;
      if (currentSelected.length > 0 && selectedShowtime && user) {
        currentSelected.forEach((seat) => {
          releaseSeatRemote(seat.seatId).catch(Boolean);
        });
      }
    };
  }, [selectedShowtime, user, releaseSeatRemote]);

  // Periodic lock refresh every 30s for selected seats
  useEffect(() => {
    if (selectedSeats.length === 0 || !isConnected) return;

    const intervalId = setInterval(() => {
      const seatIds = selectedSeats.map((s) => s.seatId);
      refreshSeatLockRemote(seatIds).catch((err) => {
        console.error('Error refreshing seat locks:', err);
      });
    }, 30000); // 30 seconds

    return () => clearInterval(intervalId);
  }, [selectedSeats, isConnected, refreshSeatLockRemote]);

  const adjustZoom = (type: 'in' | 'out') => {
    setZoomScale((prev) => {
      if (type === 'in') return Math.min(prev + 0.1, 1.4);
      return Math.max(prev - 0.1, 0.75);
    });
  };

  const handleCheckout = async (finalTotal: number) => {
    if (selectedSeats.length === 0) {
      showToast('Vui lòng chọn ít nhất một ghế.', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const response = await apiClient.post('/bookings/create', {
        showtimeId: selectedShowtime?.showtimeId,
        seatIds: selectedSeats.map((s) => s.seatId),
        sessionId: sessionId
      });

      const responseData = response.data?.data ?? response.data;
      const { bookingId, bookingCode } = responseData;

      dispatch(setBookingDetails({ bookingId, bookingCode }));
      dispatch(updateTotalAmount(finalTotal));

      showToast('Giữ ghế thành công! Chọn bắp nước kèm theo...', 'success');
      navigate('/booking-combo');
    } catch (err: any) {
      const msg =
        err.response?.data?.Message ||
        err.response?.data?.message ||
        'Đặt vé thất bại. Vui lòng thử lại.';
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Loading Overlay
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-12 text-left min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-brand-gold border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 font-bold text-sm">Đang tải sơ đồ phòng chiếu...</p>
        </div>
      </div>
    );
  }

  // Error boundary Fallback
  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-12 text-left min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 bg-red-500/5 border border-red-500/10 p-8 rounded-3xl max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-red-500" />
          <h3 className="text-lg font-bold text-white">Đã xảy ra lỗi</h3>
          <p className="text-gray-400 text-sm">{error}</p>
          <Button variant="primary" onClick={fetchSeats} className="mt-2 cursor-pointer">
            <RefreshCw size={14} className="mr-2" /> Thử lại
          </Button>
        </div>
      </div>
    );
  }

  if (!selectedShowtime) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-12 select-none text-left min-h-screen">
      {/* Realtime Disconnect Notification */}
      {!isConnected && (
        <div className="mb-6 bg-red-500/10 border border-red-500/20 p-4 rounded-2xl flex items-center gap-3 text-red-400 text-xs font-semibold">
          <WifiOff size={16} />
          <span>Mất kết nối thời gian thực. Hệ thống đang tự động kết nối lại...</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Left Column: Screen and Seat Map */}
        <div className="lg:col-span-3 flex flex-col items-center gap-8 bg-background-card/20 border border-white/5 rounded-3xl p-6 md:p-8 shadow-glass backdrop-blur-sm relative overflow-hidden">
          {/* Top Banner details */}
          <div className="w-full flex justify-between items-center z-10">
            <span className="text-xs font-mono font-bold text-gray-500 uppercase tracking-widest">
              Phòng chiếu: {selectedShowtime.hallName || 'A'} • Cấu trúc Rạp {selectedShowtime.hall?.hallTypeName || '2D'}
            </span>
            {selectedSeats.length > 0 && (
              <div
                className={`border px-4 py-2 rounded-xl flex items-center gap-2 text-xs font-bold transition-all duration-300 ${
                  timeLeft <= 60
                    ? 'bg-red-500/15 border-red-500/30 text-red-400 animate-pulse'
                    : 'bg-brand/10 border-brand/20 text-brand'
                }`}
              >
                <Clock size={14} className={timeLeft > 60 ? 'animate-spin' : ''} />
                <span>Thời gian giữ ghế: {formattedTime}</span>
              </div>
            )}
          </div>

          {/* Interactive Zoom Controls */}
          <div className="absolute bottom-6 left-6 z-20 flex gap-2">
            <button
              onClick={() => adjustZoom('in')}
              className="p-2 bg-black/60 hover:bg-black border border-white/10 text-white rounded-lg transition-colors cursor-pointer"
              title="Phóng to"
            >
              <ZoomIn size={14} />
            </button>
            <button
              onClick={() => adjustZoom('out')}
              className="p-2 bg-black/60 hover:bg-black border border-white/10 text-white rounded-lg transition-colors cursor-pointer"
              title="Thu nhỏ"
            >
              <ZoomOut size={14} />
            </button>
            <div className="p-2 bg-black/40 border border-white/5 text-gray-500 rounded-lg flex items-center gap-1 text-[9px] uppercase font-bold select-none">
              <Move size={10} /> Kéo sơ đồ để di chuyển
            </div>
          </div>

          {/* Screen Curve representation */}
          <div className="w-full flex flex-col items-center gap-2 mt-8">
            <div className="w-[85%] h-1.5 bg-gradient-to-r from-transparent via-brand to-transparent rounded-full shadow-[0_4px_40px_rgba(229,9,20,0.8)]" />
            <span className="text-[9px] uppercase tracking-widest text-gray-500 font-black">
              Màn Hình Chiếu
            </span>
          </div>

          {/* Zoomable & Pannable Seat Map wrapper */}
          <SeatMap
            seats={seats}
            selectedSeats={selectedSeats}
            lockedSeats={lockedSeats}
            bookedSeatIds={bookedSeatIds}
            pendingSeatIds={pendingSeatIds}
            currentUserId={user?.userId ? String(user.userId) : undefined}
            sessionId={sessionId}
            onSeatClick={handleSeatClick}
            zoomScale={zoomScale}
          />

          {/* Legend keys */}
          <div className="flex flex-wrap gap-6 text-xs border-t border-white/5 pt-6 justify-center w-full z-10">
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 bg-[#1b1c22] border border-gray-800 rounded-md" />
              <span className="text-gray-400 font-semibold text-[10px]">Ghế thường</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 bg-[#2a243d] border border-purple-900/50 rounded-md" />
              <span className="text-gray-400 font-semibold text-[10px]">Ghế VIP</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 bg-[#3b1b22] border border-red-950 rounded-md" />
              <span className="text-gray-400 font-semibold text-[10px]">Ghế đôi Sweetbox</span>
            </div>
            <div className="flex items-center gap-2 flex-nowrap">
              <div className="h-4 w-4 bg-[#221c1c] border border-red-900/50 rounded-md" />
              <span className="text-gray-400 font-semibold text-[10px]">Ghế đang giữ</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 bg-[#1a1213] border border-red-950/20 text-gray-700 flex items-center justify-center text-[8px] font-black rounded-md">
                X
              </div>
              <span className="text-gray-400 font-semibold text-[10px]">Ghế đã bán</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 bg-brand-gold rounded-md shadow-[0_0_10px_rgba(229,169,59,0.3)] animate-pulse" />
              <span className="text-gray-400 font-semibold text-[10px]">Ghế đang chọn</span>
            </div>
          </div>
        </div>

        {/* Right Column: Pricing & Checkout Details */}
        <div className="flex flex-col gap-6">
          <BookingSidebar
            selectedShowtime={selectedShowtime as Showtime}
            selectedSeats={selectedSeats}
            serviceFee={serviceFee}
            submitting={submitting}
            onCheckout={handleCheckout}
          />
        </div>
      </div>
    </div>
  );
};
