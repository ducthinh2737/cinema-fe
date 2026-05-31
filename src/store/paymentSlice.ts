import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiClient } from '../api/client';

export interface PaymentState {
  transactionStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
  paymentDetails: any;
  error: string | null;
}

const initialState: PaymentState = {
  transactionStatus: 'idle',
  paymentDetails: null,
  error: null,
};

export const checkPaymentStatus = createAsyncThunk(
  'payment/checkStatus',
  async (bookingId: number, { rejectWithValue }) => {
    try {
      const response = await apiClient.get(`/bookings/${bookingId}`);
      return response.data?.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.Message || 'Payment status check failed');
    }
  }
);

const paymentSlice = createSlice({
  name: 'payment',
  initialState,
  reducers: {
    resetPaymentState: (state) => {
      state.transactionStatus = 'idle';
      state.paymentDetails = null;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(checkPaymentStatus.pending, (state) => {
        state.transactionStatus = 'loading';
        state.error = null;
      })
      .addCase(checkPaymentStatus.fulfilled, (state, action) => {
        state.transactionStatus = 'succeeded';
        state.paymentDetails = action.payload;
      })
      .addCase(checkPaymentStatus.rejected, (state, action) => {
        state.transactionStatus = 'failed';
        state.error = action.payload as string;
      });
  },
});

export const { resetPaymentState } = paymentSlice.actions;
export default paymentSlice.reducer;
