import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import { apiClient } from '../api/client';
import type { Notification } from '../types';

export interface NotificationState {
  items: Notification[];
  unreadCount: number;
  page: number;
  hasMore: boolean;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  loadingMore: boolean;
  error: string | null;
}

interface NotificationApiResponse {
  items?: Notification[];
  totalCount?: number;
}

const initialState: NotificationState = {
  items: [],
  unreadCount: 0,
  page: 1,
  hasMore: true,
  status: 'idle',
  loadingMore: false,
  error: null,
};

// =========================
// FETCH NOTIFICATIONS
// =========================
export const fetchNotifications = createAsyncThunk<
  { items: Notification[]; totalCount: number },
  number | undefined,
  { rejectValue: string }
>(
  'notifications/fetchNotifications',
  async (pageSize = 8, { rejectWithValue }) => {
    try {
      const response = await apiClient.get<NotificationApiResponse>(
        '/notifications',
        {
          params: {
            PageNumber: 1,
            PageSize: pageSize,
          },
        }
      );

      const data = response.data;

      return {
        items: data.items ?? [],
        totalCount: data.totalCount ?? 0,
      };
    } catch (err: any) {
      return rejectWithValue(
        err?.response?.data?.message ||
        err?.response?.data?.Message ||
        'Failed to retrieve notification items'
      );
    }
  }
);

// =========================
// FETCH MORE
// =========================
export const fetchMoreNotifications = createAsyncThunk<
  {
    items: Notification[];
    pageNumber: number;
    totalCount: number;
  },
  { pageNumber: number; pageSize?: number },
  { rejectValue: string }
>(
  'notifications/fetchMoreNotifications',
  async ({ pageNumber, pageSize = 8 }, { rejectWithValue }) => {
    try {
      const response = await apiClient.get<NotificationApiResponse>(
        '/notifications',
        {
          params: {
            PageNumber: pageNumber,
            PageSize: pageSize,
          },
        }
      );

      const data = response.data;

      return {
        items: data.items ?? [],
        pageNumber,
        totalCount: data.totalCount ?? 0,
      };
    } catch (err: any) {
      return rejectWithValue(
        err?.response?.data?.message ||
        err?.response?.data?.Message ||
        'Failed to retrieve more notifications'
      );
    }
  }
);

// =========================
// MARK AS READ
// =========================
export const markNotificationRead = createAsyncThunk<
  number,
  number,
  { rejectValue: string }
>(
  'notifications/markRead',
  async (id, { rejectWithValue }) => {
    try {
      await apiClient.put(`/notifications/read/${id}`);
      return id;
    } catch (err: any) {
      return rejectWithValue(
        err?.response?.data?.message ||
        err?.response?.data?.Message ||
        'Failed to mark notification as read'
      );
    }
  }
);

// =========================
// MARK ALL AS READ
// =========================
export const markAllNotificationsRead = createAsyncThunk<
  void,
  void,
  { rejectValue: string }
>(
  'notifications/markAllRead',
  async (_, { rejectWithValue }) => {
    try {
      await apiClient.put('/notifications/read-all');
    } catch (err: any) {
      return rejectWithValue(
        err?.response?.data?.message ||
        err?.response?.data?.Message ||
        'Failed to mark all notifications as read'
      );
    }
  }
);

const notificationSlice = createSlice({
  name: 'notifications',
  initialState,

  reducers: {
    addNotification: (
      state,
      action: PayloadAction<Notification>
    ) => {
      const exists = state.items.some(
        n => n.notificationId === action.payload.notificationId
      );

      if (!exists) {
        state.items.unshift(action.payload);

        if (!action.payload.isRead) {
          state.unreadCount += 1;
        }
      }
    },

    clearNotifications: state => {
      state.items = [];
      state.unreadCount = 0;
      state.page = 1;
      state.hasMore = true;
    },
  },

  extraReducers: builder => {
    builder

      // =========================
      // FETCH
      // =========================
      .addCase(fetchNotifications.pending, state => {
        state.status = 'loading';
        state.error = null;
      })

      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.status = 'succeeded';

        state.items = action.payload.items;
        state.page = 1;

        state.hasMore =
          action.payload.items.length < action.payload.totalCount;

        state.unreadCount = action.payload.items.filter(
          n => !n.isRead
        ).length;
      })

      .addCase(fetchNotifications.rejected, (state, action) => {
        state.status = 'failed';
        state.error =
          action.payload || 'Failed to fetch notifications';
      })

      // =========================
      // FETCH MORE
      // =========================
      .addCase(fetchMoreNotifications.pending, state => {
        state.loadingMore = true;
      })

      .addCase(fetchMoreNotifications.fulfilled, (state, action) => {
        state.loadingMore = false;

        const existingIds = new Set(
          state.items.map(item => item.notificationId)
        );

        const uniqueItems = action.payload.items.filter(
          item => !existingIds.has(item.notificationId)
        );

        state.items.push(...uniqueItems);

        state.page = action.payload.pageNumber;

        state.hasMore =
          state.items.length < action.payload.totalCount;
      })

      .addCase(fetchMoreNotifications.rejected, (state, action) => {
        state.loadingMore = false;

        state.error =
          action.payload || 'Failed to load more notifications';
      })

      // =========================
      // MARK READ
      // =========================
      .addCase(markNotificationRead.fulfilled, (state, action) => {
        const item = state.items.find(
          n => n.notificationId === action.payload
        );

        if (item && !item.isRead) {
          item.isRead = true;

          state.unreadCount = Math.max(
            0,
            state.unreadCount - 1
          );
        }
      })

      // =========================
      // MARK ALL READ
      // =========================
      .addCase(markAllNotificationsRead.fulfilled, state => {
        state.items.forEach(notification => {
          notification.isRead = true;
        });

        state.unreadCount = 0;
      });
  },
});

export const {
  addNotification,
  clearNotifications,
} = notificationSlice.actions;

export default notificationSlice.reducer;