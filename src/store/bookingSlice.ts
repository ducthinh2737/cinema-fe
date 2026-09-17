import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { Showtime, Seat, OrderCombo } from '../types';

interface BookingState {
  selectedShowtime: Showtime | null;
  selectedSeats: Seat[];
  appliedVoucher: {
    promoCode: string;
    discountValue: number;
    discountType: string;
  } | null;
  serviceFee: number;
  discountAmount: number;
  pointsRedeemed: number | null;
  pointsDiscountAmount: number;
  totalAmount: number;
  bookingId: number | null;
  bookingCode: string | null;
  combos: OrderCombo[];
}

const initialState: BookingState = {
  selectedShowtime: null,
  selectedSeats: [],
  appliedVoucher: null,
  serviceFee: 5000, // Standard cinema service fee 5,000 VND
  discountAmount: 0,
  pointsRedeemed: null,
  pointsDiscountAmount: 0,
  totalAmount: 0,
  bookingId: null,
  bookingCode: null,
  combos: [],
};

const bookingSlice = createSlice({
  name: 'booking',
  initialState,
  reducers: {
    selectShowtime(state, action: PayloadAction<Showtime>) {
      state.selectedShowtime = action.payload;
      state.selectedSeats = [];
      state.appliedVoucher = null;
      state.discountAmount = 0;
      state.pointsRedeemed = null;
      state.pointsDiscountAmount = 0;
      state.totalAmount = 0;
    },
    toggleSeatSelection(state, action: PayloadAction<Seat>) {
      const seat = action.payload;
      console.log('[Redux toggleSeatSelection] Before:', JSON.parse(JSON.stringify(state.selectedSeats)));
      const index = state.selectedSeats.findIndex(s => s.seatId === seat.seatId);
      if (index >= 0) {
        state.selectedSeats.splice(index, 1);
        console.log('[Redux toggleSeatSelection] Removed seat:', seat.seatId);
      } else {
        state.selectedSeats.push(seat);
        console.log('[Redux toggleSeatSelection] Added seat:', seat.seatId);
      }
      console.log('[Redux toggleSeatSelection] After:', JSON.parse(JSON.stringify(state.selectedSeats)));
      state.appliedVoucher = null;
      state.discountAmount = 0;
      state.pointsRedeemed = null;
      state.pointsDiscountAmount = 0;
      state.totalAmount = 0; // recalculate later
    },
    applyVoucherSuccess(state, action: PayloadAction<{ promoCode: string; discountValue: number; discountType: string; discountAmount: number }>) {
      const { promoCode, discountValue, discountType, discountAmount } = action.payload;
      state.appliedVoucher = { promoCode, discountValue, discountType };
      state.discountAmount = discountAmount;
    },
    removeVoucher(state) {
      state.appliedVoucher = null;
      state.discountAmount = 0;
    },
    applyPointsSuccess(state, action: PayloadAction<{ pointsRedeemed: number; pointsDiscountAmount: number }>) {
      state.pointsRedeemed = action.payload.pointsRedeemed;
      state.pointsDiscountAmount = action.payload.pointsDiscountAmount;
    },
    removePoints(state) {
      state.pointsRedeemed = null;
      state.pointsDiscountAmount = 0;
    },
    updateTotalAmount(state, action: PayloadAction<number>) {
      state.totalAmount = action.payload;
    },
    setBookingDetails(state, action: PayloadAction<{ bookingId: number; bookingCode: string }>) {
      state.bookingId = action.payload.bookingId;
      state.bookingCode = action.payload.bookingCode;
    },
    setSelectedSeats(state, action: PayloadAction<Seat[]>) {
      console.log('[Redux setSelectedSeats] Setting seats to:', action.payload);
      state.selectedSeats = action.payload;
      state.appliedVoucher = null;
      state.discountAmount = 0;
      state.pointsRedeemed = null;
      state.pointsDiscountAmount = 0;
      state.totalAmount = 0;
    },
    clearBooking(state) {
      state.selectedShowtime = null;
      state.selectedSeats = [];
      state.appliedVoucher = null;
      state.discountAmount = 0;
      state.pointsRedeemed = null;
      state.pointsDiscountAmount = 0;
      state.totalAmount = 0;
      state.bookingId = null;
      state.bookingCode = null;
      state.combos = [];
    },
    setBookingCombos(state, action: PayloadAction<OrderCombo[]>) {
      state.combos = action.payload;
    }
  }
});

export const {
  selectShowtime,
  toggleSeatSelection,
  applyVoucherSuccess,
  removeVoucher,
  applyPointsSuccess,
  removePoints,
  updateTotalAmount,
  setBookingDetails,
  setSelectedSeats,
  clearBooking,
  setBookingCombos
} = bookingSlice.actions;

export default bookingSlice.reducer;
