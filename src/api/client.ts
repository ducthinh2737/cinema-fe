import axios from 'axios';
import { tokenStorage } from '../utils/token';
import { parseError } from './errorHandler';
import { store } from '../store';
import { tokenRefreshed, logout } from '../store/authSlice';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5156/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: Attach JWT token if available
apiClient.interceptors.request.use(
  (config) => {
    const token = tokenStorage.getAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(parseError(error))
);

// Response interceptor: Handle expired tokens & auto-refresh queue
let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};


apiClient.interceptors.response.use(
  (response) => response,
  async (error: any) => {
    const originalRequest = error.config;

  if (error.response?.status === 401 && !originalRequest._retry) {
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return apiClient(originalRequest);
        })
        .catch((err) => Promise.reject(parseError(err)));
    }

    originalRequest._retry = true;
    isRefreshing = true;

    const refreshToken = tokenStorage.getRefreshToken();
    const token = tokenStorage.getAccessToken();

    if (!refreshToken || !token) {
      isRefreshing = false;
      tokenStorage.clearTokens();
      store.dispatch(logout());
      window.location.href = '/login';
      return Promise.reject(parseError(error));
    }

    try {
      const response = await axios.post(`${API_BASE_URL}/auth/refresh-token`, {
        token,
        refreshToken,
      });

      const { accessToken: newAccessToken, refreshToken: newRefreshToken } = response.data;
      tokenStorage.setTokens(newAccessToken, newRefreshToken);
      store.dispatch(tokenRefreshed({ accessToken: newAccessToken, refreshToken: newRefreshToken }));

      apiClient.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`;
      processQueue(null, newAccessToken);
      isRefreshing = false;

      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      return apiClient(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
      isRefreshing = false;
      tokenStorage.clearTokens();
      store.dispatch(logout());
      window.location.href = '/login';
      return Promise.reject(parseError(refreshError));
    }
  }

  return Promise.reject(parseError(error));
}
);

export const getImageUrl = (url?: string): string => {
  if (!url) return '';
  if (url.startsWith('blob:')) return url;
  if (url.startsWith('/uploads')) {
    const apiHost = API_BASE_URL.replace('/api', '');
    return `${apiHost}${url}`;
  }
  return url;
};
