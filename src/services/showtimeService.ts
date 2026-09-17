import { apiClient } from '../api/client';
import type {
  ApiShowtime,
  ApiPrice,
  ApiMovie,
  ShowtimeCreateDto,
  ShowtimeUpdateDto,
  ShowtimeBatchCreateDto,
  ShowtimeQueryParams,
  BatchCreateResult
} from '../types/showtime';
import type { Cinema, Hall } from '../types';

export const showtimeService = {
  getPrices: async (): Promise<ApiPrice[]> => {
    const response = await apiClient.get<ApiPrice[]>('/prices');
    return response.data || [];
  },

  getMovies: async (pageSize = 100): Promise<ApiMovie[]> => {
    const response = await apiClient.get<any>('/movies', {
      params: { PageSize: pageSize }
    });
    const data = response.data?.data ?? response.data;
    return data?.items ?? (Array.isArray(data) ? data : []);
  },

  getCinemas: async (pageSize = 50): Promise<Cinema[]> => {
    const response = await apiClient.get<any>('/cinemas', {
      params: { PageSize: pageSize }
    });
    const data = response.data?.data ?? response.data;
    return data?.items ?? (Array.isArray(data) ? data : []);
  },

  getHalls: async (cinemaId: number): Promise<Hall[]> => {
    const response = await apiClient.get<any>(`/cinemas/${cinemaId}/halls`);
    const data = response.data?.data ?? response.data;
    return Array.isArray(data) ? data : [];
  },

  getShowtimes: async (params: ShowtimeQueryParams, signal?: AbortSignal): Promise<ApiShowtime[]> => {
    const response = await apiClient.get<any>('/showtimes', {
      params,
      signal
    });
    const data = response.data?.data ?? response.data;
    return data?.items ?? (Array.isArray(data) ? data : []);
  },

  createShowtime: async (dto: ShowtimeCreateDto): Promise<ApiShowtime> => {
    const response = await apiClient.post<any>('/showtimes', dto);
    return response.data?.data ?? response.data;
  },

  updateShowtime: async (showtimeId: number, dto: ShowtimeUpdateDto): Promise<ApiShowtime> => {
    const response = await apiClient.put<any>(`/showtimes/${showtimeId}`, dto);
    return response.data?.data ?? response.data;
  },

  deleteShowtime: async (showtimeId: number): Promise<void> => {
    await apiClient.delete(`/showtimes/${showtimeId}`);
  },

  createBatchShowtimes: async (dto: ShowtimeBatchCreateDto): Promise<BatchCreateResult> => {
    const response = await apiClient.post<any>('/showtimes/batch', dto);
    return response.data?.data ?? response.data;
  },

  createBulkShowtimes: async (dto: {
    movieId: number;
    hallId: number;
    priceId: number;
    dates: string[];
    timeSlots: string[];
  }): Promise<{ isSuccess: boolean; message: string; data: string }> => {
    const response = await apiClient.post<any>('/showtimes/bulk', dto);
    return response.data;
  }
};
