import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { User, AuthResponse } from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

const getInitialUser = (): User | null => {
  try {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  } catch {
    return null;
  }
};

const getInitialToken = (): string | null => {
  const token = localStorage.getItem('token');
  if (!token || token === 'undefined') return null;
  return token;
};

const initialState: AuthState = {
  user: getInitialUser(),
  token: getInitialToken(),
  isAuthenticated: !!getInitialToken(),
  loading: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
    loginSuccess(state, action: PayloadAction<AuthResponse>) {
      const mappedUser: User = {
        userId: action.payload.userId || 0,
        email: action.payload.email,
        fullName: action.payload.fullName,
        roles: action.payload.roles,
        phoneNumber: '',
        isEmailVerified: true,
        membershipPoints: 0
      };

      state.user = mappedUser;
      state.token = action.payload.accessToken;
      state.isAuthenticated = true;
      state.error = null;
      state.loading = false;

      localStorage.setItem('token', action.payload.accessToken);
      localStorage.setItem('refreshToken', action.payload.refreshToken);
      localStorage.setItem('user', JSON.stringify(mappedUser));
    },
    loginFailed(state, action: PayloadAction<string>) {
      state.error = action.payload;
      state.loading = false;
    },
    logout(state) {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.error = null;

      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
    },
    updateUser(state, action: PayloadAction<User>) {
      state.user = action.payload;
      localStorage.setItem('user', JSON.stringify(action.payload));
    },
    tokenRefreshed(state, action: PayloadAction<{ accessToken: string; refreshToken: string }>) {
      state.token = action.payload.accessToken;
    }
  }
});

export const { setLoading, loginSuccess, loginFailed, logout, updateUser, tokenRefreshed } = authSlice.actions;
export default authSlice.reducer;
