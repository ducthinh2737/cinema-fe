import { useState, useEffect, useMemo, useCallback } from 'react';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

import { showtimeService } from '../services/showtimeService';
import { useSignalR } from './useSignalR';
import { useToast } from '../contexts/ToastContext';
import type {
  ApiShowtime,
  ApiPrice,
  NormalizedMovie,
  MappedHall,
  ShowtimeQueryParams
} from '../types/showtime';
import type { Cinema } from '../types';
import { parseShowtimeTime, validateScheduleConflict } from '../domain/showtime/engine';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault('Asia/Ho_Chi_Minh');

export const useShowtimes = (calendarCinemaId: number) => {
  const { showToast } = useToast();

  // Primary list state
  const [allShowtimesList, setAllShowtimesList] = useState<ApiShowtime[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // References list
  const [movies, setMovies] = useState<NormalizedMovie[]>([]);
  const [cinemas, setCinemas] = useState<Cinema[]>([]);
  const [dbPrices, setDbPrices] = useState<ApiPrice[]>([]);

  // Bulk scheduler states
  const [bulkMovieIds, setBulkMovieIds] = useState<number[]>([]);
  const [bulkMovieWeights, setBulkMovieWeights] = useState<Record<number, number>>({});
  const [bulkOptimizePrimeTime, setBulkOptimizePrimeTime] = useState<boolean>(false);
  const [bulkStaggerMinutes, setBulkStaggerMinutes] = useState<number>(20);
  const [bulkCinemaId, setBulkCinemaId] = useState<number>(0);
  const [bulkSelectedHalls, setBulkSelectedHalls] = useState<number[]>([]);
  const [bulkSelectedDates, setBulkSelectedDates] = useState<string[]>([]);
  const [bulkTimeSlots, setBulkTimeSlots] = useState<string[]>(['08:00', '11:00', '14:00', '17:00', '20:00']);
  const [bulkHallsList, setBulkHallsList] = useState<MappedHall[]>([]);
  const [bulkLoadingHalls, setBulkLoadingHalls] = useState(false);
  const [bulkPriceId, setBulkPriceId] = useState<number>(1);
  const [isBulkDryRun, setIsBulkDryRun] = useState(false);
  const [bulkMode, setBulkMode] = useState<'Manual' | 'Auto'>('Auto');
  const [flatPriceEnabled, setFlatPriceEnabled] = useState<boolean>(false);
  const [flatPrice, setFlatPrice] = useState<number | null>(45000);

  // Memoized now object
  const now = useMemo(() => dayjs().tz('Asia/Ho_Chi_Minh'), []);

  // Centralized Error Handler
  const handleApiError = useCallback((err: any, fallbackMessage: string) => {
    console.error(err);
    const serverMessage = err.response?.data?.message || err.message;
    const finalMessage = serverMessage ? `${fallbackMessage}: ${serverMessage}` : fallbackMessage;
    showToast(finalMessage, 'error');
  }, [showToast]);

  // Fetch prices
  const fetchPrices = useCallback(async () => {
    try {
      const prices = await showtimeService.getPrices();
      setDbPrices(prices);
      if (prices.length > 0) {
        setBulkPriceId(prices[0].priceId);
      }
    } catch (err) {
      handleApiError(err, 'Không thể tải bảng giá vé');
    }
  }, [handleApiError]);

  // Load references
  const fetchReferenceData = useCallback(async () => {
    try {
      const [moviesData, cinemasData] = await Promise.all([
        showtimeService.getMovies(100),
        showtimeService.getCinemas(50)
      ]);

      const movieItems: NormalizedMovie[] = moviesData.map((m: any) => ({
        movieId: m.movieId ?? m.id ?? 0,
        title: m.title,
        duration: m.duration,
        genreName: m.genreName || m.genre?.genreName,
        posterUrl: m.posterUrl,
        movieFormats: m.movieFormats || [],
        status: m.status,
        releaseDate: m.releaseDate,
        isFeatured: m.isFeatured || false,
      }));
      setMovies(movieItems);

      const mappedCinemas = cinemasData.map((c: Cinema) => ({
        cinemaId: c.cinemaId,
        name: c.cinemaName || c.name || '',
        address: c.address,
        city: c.cityName || '',
      }));
      setCinemas(mappedCinemas);

      if (mappedCinemas.length > 0) {
        setBulkCinemaId(mappedCinemas[0].cinemaId);
      }
    } catch (err) {
      handleApiError(err, 'Không thể tải danh sách phim và rạp chiếu');
    }
  }, [handleApiError]);

  // Fetch all showtimes
  const fetchShowtimes = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const params: ShowtimeQueryParams = {
        PageNumber: 1,
        PageSize: 200,
        DateFrom: dayjs().subtract(1, 'day').toISOString(),
        DateTo: dayjs().add(30, 'day').toISOString(),
      };
      if (calendarCinemaId) {
        params.CinemaId = calendarCinemaId;
      }
      const items = await showtimeService.getShowtimes(params, signal);
      setAllShowtimesList(items);
    } catch (err: any) {
      if (err.name === 'AbortError' || err.message === 'canceled') {
        return;
      }
      setError('Đã xảy ra lỗi khi tải dữ liệu lịch chiếu.');
      handleApiError(err, 'Lỗi khi tải lịch chiếu');
    } finally {
      setLoading(false);
    }
  }, [calendarCinemaId, handleApiError]);

  // Fetch initial data
  useEffect(() => {
    fetchReferenceData();
    fetchPrices();
  }, [fetchReferenceData, fetchPrices]);

  // Fetch showtimes when dependencies change
  useEffect(() => {
    const controller = new AbortController();
    fetchShowtimes(controller.signal);
    return () => controller.abort();
  }, [fetchShowtimes, calendarCinemaId]);

  // Load bulk halls when bulk cinema changes
  useEffect(() => {
    if (!bulkCinemaId) return;
    const loadBulkHalls = async () => {
      setBulkLoadingHalls(true);
      try {
        const data = await showtimeService.getHalls(bulkCinemaId);
        const mapped = data.map((h: any) => {
          let supportedFormats: string[] = [];
          if (h.description && h.description.trim().startsWith('{')) {
            try {
              const obj = JSON.parse(h.description);
              supportedFormats = obj.supportedFormats || [];
            } catch (e) {
              // Fallback
            }
          }
          if (supportedFormats.length === 0) {
            const typeName = (h.hallTypeName || '').toUpperCase();
            if (typeName.includes('IMAX')) {
              supportedFormats = ['IMAX', '3D', '2D'];
            } else {
              supportedFormats = ['2D', '3D'];
            }
          }
          return {
            hallId: h.hallId,
            cinemaId: h.cinemaId,
            name: h.name || h.hallName || '',
            hallTypeName: h.hallTypeName,
            supportedFormats,
          };
        });
        setBulkHallsList(mapped);
        setBulkSelectedHalls([]);
      } catch (err) {
        handleApiError(err, 'Lỗi khi tải phòng chiếu cho rạp hàng loạt');
      } finally {
        setBulkLoadingHalls(false);
      }
    };
    loadBulkHalls();
  }, [bulkCinemaId, handleApiError]);

  // Real-time integration via SignalR Hub mapped to /hub/seat
  const { on, off, isConnected } = useSignalR('/hub/seat', true);

  const handleRealtimeShowtimeCreated = useCallback((showtimeDto: any) => {
    console.log('[SignalR] Showtime Created event received:', showtimeDto);
    setAllShowtimesList(prev => {
      if (prev.some(s => s.showtimeId === showtimeDto.showtimeId)) return prev;
      return [...prev, showtimeDto];
    });
  }, []);

  const handleRealtimeShowtimeUpdated = useCallback((showtimeDto: any) => {
    console.log('[SignalR] Showtime Updated event received:', showtimeDto);
    setAllShowtimesList(prev =>
      prev.map(s => s.showtimeId === showtimeDto.showtimeId ? { ...s, ...showtimeDto } : s)
    );
  }, []);

  const handleRealtimeShowtimeDeleted = useCallback((payload: any) => {
    console.log('[SignalR] Showtime Deleted event received:', payload);
    const targetId = typeof payload === 'object' ? payload.showtimeId : payload;
    setAllShowtimesList(prev => prev.filter(s => s.showtimeId !== targetId));
  }, []);

  const handleRealtimeBulkShowtimesCreated = useCallback((showtimesBatch: any[]) => {
    console.log('[SignalR] Bulk Showtimes Created event received:', showtimesBatch);
    setAllShowtimesList(prev => {
      // Lọc bỏ những suất chiếu trùng lặp ID đã tồn tại trong danh sách (nếu có)
      const newItems = showtimesBatch.filter(
        newItem => !prev.some(s => s.showtimeId === newItem.showtimeId)
      );
      if (newItems.length === 0) return prev;
      return [...prev, ...newItems];
    });
  }, []);

  useEffect(() => {
    on('ShowtimeCreated', handleRealtimeShowtimeCreated);
    on('ShowtimeUpdated', handleRealtimeShowtimeUpdated);
    on('ShowtimeDeleted', handleRealtimeShowtimeDeleted);
    on('BulkShowtimesCreated', handleRealtimeBulkShowtimesCreated); // <--- Đăng ký thêm sự kiện bulk

    return () => {
      off('ShowtimeCreated', handleRealtimeShowtimeCreated);
      off('ShowtimeUpdated', handleRealtimeShowtimeUpdated);
      off('ShowtimeDeleted', handleRealtimeShowtimeDeleted);
      off('BulkShowtimesCreated', handleRealtimeBulkShowtimesCreated); // <--- Hủy đăng ký khi unmount
    };
  }, [on, off, handleRealtimeShowtimeCreated, handleRealtimeShowtimeUpdated, handleRealtimeShowtimeDeleted, handleRealtimeBulkShowtimesCreated]);

  // Status computation engine
  const getShowtimeStatus = useCallback((st: ApiShowtime) => {
    if (st.isCancelled) return 'CANCELLED';
    const start = parseShowtimeTime(st.startTime);
    const movieObj = movies.find(m => m.movieId === st.movieId);
    const dur = movieObj?.duration || st.movie?.duration || 120;
    const end = start.add(dur, 'minute');

    if (now.isBefore(start)) {
      const diffDays = start.diff(now, 'day', true);
      if (diffDays <= 7) return 'SELLING';
      return 'UPCOMING';
    } else if (now.isAfter(start) && now.isBefore(end)) {
      return 'SCREENING';
    } else {
      return 'ENDED';
    }
  }, [now, movies]);

  // Schedule Conflicts Engine
  const checkConflict = useCallback((
    movieId: number,
    hallId: number,
    startTimeStr: string,
    editingShowtimeId?: number
  ): string | null => {
    return validateScheduleConflict(
      movieId,
      hallId,
      startTimeStr,
      allShowtimesList,
      movies,
      editingShowtimeId,
      15
    );
  }, [allShowtimesList, movies]);

  // Dashboard Stats Computations
  const stats = useMemo(() => {
    const todayStr = dayjs().tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD');
    const todayShowtimes = allShowtimesList.filter(
      st => parseShowtimeTime(st.startTime).format('YYYY-MM-DD') === todayStr
    );

    const totalToday = todayShowtimes.length;
    const uniqueMoviesToday = new Set(todayShowtimes.map(st => st.movieId)).size;
    const activeHallsToday = new Set(todayShowtimes.map(st => st.hallId)).size;

    const occupancies = todayShowtimes.map(st => {
      const sold = st.soldSeats ?? (st.totalSeats !== undefined ? (st.totalSeats - st.availableSeats) : undefined);
      const total = st.totalSeats ?? (sold !== undefined ? (st.availableSeats + sold) : undefined);
      return (sold !== undefined && total) ? Math.round((sold / total) * 100) : null;
    }).filter((val): val is number => val !== null);

    const avgOccupancy = occupancies.length > 0
      ? Math.round(occupancies.reduce((a, b) => a + b, 0) / occupancies.length)
      : 0;

    return {
      totalToday,
      uniqueMoviesToday,
      activeHallsToday,
      avgOccupancy
    };
  }, [allShowtimesList]);

  return {
    allShowtimesList,
    loading,
    error,
    movies,
    cinemas,
    dbPrices,
    fetchShowtimes,
    getShowtimeStatus,
    checkConflict,
    stats,
    handleApiError,

    // Bulk states/actions
    bulkMovieIds,
    setBulkMovieIds,
    bulkMovieWeights,
    setBulkMovieWeights,
    bulkOptimizePrimeTime,
    setBulkOptimizePrimeTime,
    bulkStaggerMinutes,
    setBulkStaggerMinutes,
    bulkCinemaId,
    setBulkCinemaId,
    bulkSelectedHalls,
    setBulkSelectedHalls,
    bulkSelectedDates,
    setBulkSelectedDates,
    bulkTimeSlots,
    setBulkTimeSlots,
    bulkHallsList,
    bulkLoadingHalls,
    bulkPriceId,
    setBulkPriceId,
    isBulkDryRun,
    setIsBulkDryRun,
    bulkMode,
    setBulkMode,
    flatPriceEnabled,
    setFlatPriceEnabled,
    flatPrice,
    setFlatPrice,
    isSignalRConnected: isConnected
  };
};
