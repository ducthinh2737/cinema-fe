import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, 
  Plus, 
  Edit3, 
  Trash2, 
  X, 
  AlertTriangle, 
  Loader2, 
  Clock, 
  Film, 
  Building,
  Copy,
  List,
  Grid,
  Search,
  FileSpreadsheet,
  RotateCcw,
  Sparkles,
  Users,
  Check,
  CalendarDays,
  HelpCircle
} from 'lucide-react';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault('Asia/Ho_Chi_Minh');

import { apiClient } from '../../api/client';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useToast } from '../../contexts/ToastContext';
import type { Showtime, Movie, Cinema, Hall } from '../../types';

// Helper to determine Vietnamese Date String
const formatVietnamTimeDisplay = (dateOrString: Date | string) => {
  return dayjs(dateOrString).tz('Asia/Ho_Chi_Minh').format('DD/MM/YYYY HH:mm');
};

// Map status color codes
const STATUS_STYLES = {
  UPCOMING: { text: 'Sắp chiếu', color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.1)', border: 'rgba(59, 130, 246, 0.3)' },
  SELLING: { text: 'Đang bán vé', color: '#10B981', bg: 'rgba(16, 185, 129, 0.1)', border: 'rgba(16, 185, 129, 0.3)' },
  SCREENING: { text: 'Đang chiếu', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.1)', border: 'rgba(245, 158, 11, 0.3)' },
  ENDED: { text: 'Đã kết thúc', color: '#6B7280', bg: 'rgba(107, 114, 128, 0.1)', border: 'rgba(107, 114, 128, 0.3)' },
  CANCELLED: { text: 'Đã hủy', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.1)', border: 'rgba(239, 68, 68, 0.3)' }
};

export const ShowtimesManagement: React.FC = () => {
  const { showToast } = useToast();
  
  // Tab states: 'calendar' | 'table' | 'bulk'
  const [activeTab, setActiveTab] = useState<'calendar' | 'table' | 'bulk'>('calendar');

  // Primary list state
  const [loading, setLoading] = useState(false);

  // References list
  const [movies, setMovies] = useState<Movie[]>([]);
  const [cinemas, setCinemas] = useState<Cinema[]>([]);
  const [halls, setHalls] = useState<Hall[]>([]);
  const [dbPrices, setDbPrices] = useState<any[]>([]);
  const [loadingHalls, setLoadingHalls] = useState(false);

  // Filtering states
  const [selectedMovieId, setSelectedMovieId] = useState<number | 'ALL'>('ALL');
  const [selectedCinemaId, setSelectedCinemaId] = useState<number | 'ALL'>('ALL');
  const [filterDate, setFilterDate] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchText, setSearchText] = useState('');

  // Pagination Table
  const [page, setPage] = useState(1);
  const pageSize = 8;

  // Single CRUD modal states
  const [isOpen, setIsOpen] = useState(false);
  const [selectedShowtime, setSelectedShowtime] = useState<Showtime | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [showtimeToDelete, setShowtimeToDelete] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  // Form single showtime state
  const [form, setForm] = useState({
    movieId: 0,
    cinemaId: 0,
    hallId: 0,
    priceId: 1,
    startTime: '',
  });

  // Bulk scheduler state
  const [bulkMovieId, setBulkMovieId] = useState<number>(0);
  const [bulkCinemaId, setBulkCinemaId] = useState<number>(0);
  const [bulkSelectedHalls, setBulkSelectedHalls] = useState<number[]>([]);
  const [bulkSelectedDates, setBulkSelectedDates] = useState<string[]>([]);
  const [bulkTimeSlots, setBulkTimeSlots] = useState<string[]>(['08:00', '11:00', '14:00', '17:00', '20:00']);
  const [bulkHallsList, setBulkHallsList] = useState<Hall[]>([]);
  const [bulkLoadingHalls, setBulkLoadingHalls] = useState(false);
  const [bulkPriceId, setBulkPriceId] = useState<number>(1);
  const [isBulkDryRun, setIsBulkDryRun] = useState(false);

  // Calendar specific filter state
  const [calendarDate, setCalendarDate] = useState<string>(dayjs().tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD'));
  const [calendarCinemaId, setCalendarCinemaId] = useState<number>(0);
  const [calendarHalls, setCalendarHalls] = useState<Hall[]>([]);
  const [loadingCalendarHalls, setLoadingCalendarHalls] = useState(false);

  // Status computation engine
  const getShowtimeStatus = (st: Showtime) => {
    if ((st as any).isCancelled) return 'CANCELLED';
    const now = dayjs().tz('Asia/Ho_Chi_Minh');
    const start = dayjs(st.startTime).tz('Asia/Ho_Chi_Minh');
    const movieObj = movies.find(m => (m.id || (m as any).movieId) === st.movieId);
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
  };

  // Fetch prices
  const fetchPrices = async () => {
    try {
      const res = await apiClient.get('/prices');
      setDbPrices(res.data || []);
    } catch {
      setDbPrices([
        { priceId: 1, ticketType: 'Thường (Ngày thường)', value: 80000 },
        { priceId: 2, ticketType: 'VIP (Ngày thường)', value: 100000 },
        { priceId: 3, ticketType: 'Bom Tấn (Cuối tuần)', value: 120000 },
      ]);
    }
  };

  // Format price configurations nicely for admin selection
  const formatTicketType = (ticketTypeStr: string) => {
    if (!ticketTypeStr) return 'Vé thường';
    
    // Check if it's a JSON string
    if (ticketTypeStr.trim().startsWith('{')) {
      try {
        const obj = JSON.parse(ticketTypeStr);
        const seatMap: Record<string, string> = {
          'Standard': 'Thường',
          'VIP': 'VIP',
          'Couple': 'Đôi',
          'Sweetbox': 'Sweetbox'
        };
        const roomMap: Record<string, string> = {
          '2D': '2D',
          '3D': '3D',
          'IMAX': 'IMAX',
          '4DX': '4DX'
        };
        const dayMap: Record<string, string> = {
          'Weekday': 'Ngày thường',
          'Weekend': 'Cuối tuần',
          'Holiday': 'Ngày lễ'
        };
        const slotMap: Record<string, string> = {
          'Morning': 'Sáng',
          'Afternoon': 'Chiều',
          'Evening': 'Tối'
        };

        const seat = seatMap[obj.seatType] || obj.seatType || '';
        const room = roomMap[obj.roomType] || obj.roomType || '';
        const day = dayMap[obj.dayType] || obj.dayType || '';
        const slot = slotMap[obj.timeSlot] || obj.timeSlot || '';

        const parts = [seat, room, day, slot].filter(Boolean);
        return parts.join(' - ') || 'Vé thường';
      } catch (e) {
        console.warn('Failed to parse ticketType JSON:', e);
      }
    }
    
    // Fallback if not JSON or parsing fails (e.g., legacy string like "Standard Weekday")
    const legacyMap: Record<string, string> = {
      'Standard Weekday': 'Thường - Ngày thường',
      'VIP Weekday': 'VIP - Ngày thường',
      'Standard Weekend': 'Thường - Cuối tuần',
      'VIP Weekend': 'VIP - Cuối tuần',
    };
    return legacyMap[ticketTypeStr] || ticketTypeStr;
  };

  // Load references
  const fetchReferenceData = async () => {
    try {
      const [moviesRes, cinemasRes] = await Promise.all([
        apiClient.get<any>('/movies', { params: { PageSize: 100 } }),
        apiClient.get<any>('/cinemas', { params: { PageSize: 50 } })
      ]);
      
      const moviesData = moviesRes.data?.data ?? moviesRes.data;
      const movieItems = moviesData?.items ?? (Array.isArray(moviesData) ? moviesData : []);
      setMovies(movieItems);

      const cinemasData = cinemasRes.data?.data ?? cinemasRes.data;
      const cinemaItems = cinemasData?.items ?? (Array.isArray(cinemasData) ? cinemasData : []);
      const mappedCinemas = cinemaItems.map((c: any) => ({
        cinemaId: c.cinemaId,
        name: c.cinemaName,
        address: c.address,
        city: c.cityName,
      }));
      setCinemas(mappedCinemas);
      
      if (mappedCinemas.length > 0) {
        setCalendarCinemaId(mappedCinemas[0].cinemaId);
        setBulkCinemaId(mappedCinemas[0].cinemaId);
      }
    } catch (error) {
      console.error('Failed to load references', error);
    }
  };

  // Fetch all showtimes (unpaginated for timeline analysis & conflict detection)
  const [allShowtimesList, setAllShowtimesList] = useState<Showtime[]>([]);
  
  const fetchAllShowtimes = async () => {
    try {
      const response = await apiClient.get<any>('/showtimes', {
        params: { PageNumber: 1, PageSize: 1000 }
      });
      const data = response.data?.data ?? response.data;
      const items = Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []);
      setAllShowtimesList(items);
    } catch (err) {
      console.error('Failed to fetch full showtimes', err);
    }
  };

  // Fetch Showtimes paginated (Table view redirects to all showtimes)
  const fetchShowtimes = async () => {
    setLoading(true);
    try {
      await fetchAllShowtimes();
    } finally {
      setLoading(false);
    }
  };

  // Combined fetch logic on mount and dependency changes to avoid double fetching
  useEffect(() => {
    fetchReferenceData();
    fetchPrices();
  }, []);

  useEffect(() => {
    fetchShowtimes();
  }, [selectedMovieId, selectedCinemaId, page]);

  // Load calendar halls when calendar cinema changes
  useEffect(() => {
    if (!calendarCinemaId) return;
    const loadHalls = async () => {
      setLoadingCalendarHalls(true);
      try {
        const res = await apiClient.get<any>(`/cinemas/${calendarCinemaId}/halls`);
        const data = res.data?.data ?? res.data ?? [];
        const mapped = (Array.isArray(data) ? data : []).map((h: any) => ({
          hallId: h.hallId,
          cinemaId: h.cinemaId,
          name: h.hallName,
          hallTypeName: h.hallTypeName,
        }));
        setCalendarHalls(mapped);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingCalendarHalls(false);
      }
    };
    loadHalls();
  }, [calendarCinemaId]);

  // Load bulk halls when bulk cinema changes
  useEffect(() => {
    if (!bulkCinemaId) return;
    const loadBulkHalls = async () => {
      setBulkLoadingHalls(true);
      try {
        const res = await apiClient.get<any>(`/cinemas/${bulkCinemaId}/halls`);
        const data = res.data?.data ?? res.data ?? [];
        const mapped = (Array.isArray(data) ? data : []).map((h: any) => ({
          hallId: h.hallId,
          cinemaId: h.cinemaId,
          name: h.hallName,
          hallTypeName: h.hallTypeName,
        }));
        setBulkHallsList(mapped);
        setBulkSelectedHalls([]);
      } catch (err) {
        console.error(err);
      } finally {
        setBulkLoadingHalls(false);
      }
    };
    loadBulkHalls();
  }, [bulkCinemaId]);

  // Handle cinema change in form
  const handleCinemaChange = async (cinemaId: number, preserveHallId?: number) => {
    setForm(prev => ({ ...prev, cinemaId, hallId: preserveHallId || 0 }));
    if (!cinemaId) {
      setHalls([]);
      return;
    }
    setLoadingHalls(true);
    try {
      const response = await apiClient.get<any>(`/cinemas/${cinemaId}/halls`);
      const responseData = response.data?.data ?? response.data ?? [];
      const mappedHalls = (Array.isArray(responseData) ? responseData : []).map((h: any) => ({
        hallId: h.hallId,
        cinemaId: h.cinemaId,
        name: h.hallName,
        hallTypeName: h.hallTypeName,
      }));
      setHalls(mappedHalls);
      if (preserveHallId && mappedHalls.some(h => h.hallId === preserveHallId)) {
        setForm(prev => ({ ...prev, hallId: preserveHallId }));
      } else if (mappedHalls.length > 0) {
        setForm(prev => ({ ...prev, hallId: mappedHalls[0].hallId }));
      }
    } catch (error) {
      console.error(error);
      showToast('Lỗi khi tải phòng chiếu.', 'error');
    } finally {
      setLoadingHalls(false);
    }
  };

  // Open Add modal
  const handleOpenAdd = () => {
    setSelectedShowtime(null);
    setHalls([]);
    const defaultMovieId = movies[0]?.id || (movies[0] as any)?.movieId || 0;
    const defaultCinemaId = cinemas[0]?.cinemaId || 0;
    
    setForm({
      movieId: defaultMovieId,
      cinemaId: defaultCinemaId,
      hallId: 0,
      priceId: dbPrices[0]?.priceId || 1,
      startTime: dayjs().tz('Asia/Ho_Chi_Minh').add(1, 'day').hour(18).minute(0).format('YYYY-MM-DDTHH:mm'),
    });
    
    if (defaultCinemaId) {
      handleCinemaChange(defaultCinemaId);
    }
    setIsOpen(true);
  };

  // Open Edit modal
  const handleOpenEdit = async (showtime: any) => {
    setSelectedShowtime(showtime);
    
    if (!showtime.cinemaId) {
      showToast('Không xác định được rạp chiếu của suất chiếu này.', 'error');
      return;
    }

    setLoadingHalls(true);
    try {
      const hallsRes = await apiClient.get<any>(`/cinemas/${showtime.cinemaId}/halls`);
      const responseData = hallsRes.data?.data ?? hallsRes.data ?? [];
      const mappedHalls = (Array.isArray(responseData) ? responseData : []).map((h: any) => ({
        hallId: h.hallId,
        cinemaId: h.cinemaId,
        name: h.hallName,
        hallTypeName: h.hallTypeName,
      }));
      setHalls(mappedHalls);
      
      setForm({
        movieId: showtime.movieId,
        cinemaId: showtime.cinemaId,
        hallId: showtime.hallId,
        priceId: showtime.priceId || 1,
        startTime: dayjs(showtime.startTime).tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DDTHH:mm'),
      });
      setIsOpen(true);
    } catch (error) {
      console.error(error);
      showToast('Lỗi khi sửa lịch chiếu.', 'error');
    } finally {
      setLoadingHalls(false);
    }
  };

  // Duplicate showtime helper
  const handleDuplicate = (showtime: any) => {
    setSelectedShowtime(null);
    
    if (!showtime.cinemaId) {
      showToast('Không xác định được rạp chiếu của suất chiếu này.', 'error');
      return;
    }

    setForm({
      movieId: showtime.movieId,
      cinemaId: showtime.cinemaId,
      hallId: showtime.hallId,
      priceId: showtime.priceId || 1,
      startTime: dayjs(showtime.startTime).tz('Asia/Ho_Chi_Minh').add(3, 'hour').format('YYYY-MM-DDTHH:mm'),
    });
    handleCinemaChange(showtime.cinemaId, showtime.hallId);
    setIsOpen(true);
    showToast('Đã sao chép thông tin suất chiếu sang suất mới.', 'info');
  };

  // Save Showtime
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.hallId) {
      showToast('Vui lòng chọn phòng chiếu.', 'error');
      return;
    }

    const conflict = checkConflict(form.movieId, form.hallId, form.startTime, selectedShowtime?.showtimeId);
    if (conflict) {
      showToast(conflict, 'error');
      return;
    }

    setSaving(true);
    try {
      const movie = movies.find(m => (m.id || (m as any).movieId) === form.movieId);
      const payload = {
        movieId: form.movieId,
        hallId: form.hallId,
        priceId: form.priceId,
        startTime: dayjs.tz(form.startTime, "Asia/Ho_Chi_Minh").toISOString(),
        endTime: dayjs.tz(form.startTime, "Asia/Ho_Chi_Minh").add(movie?.duration || 120, 'minute').toISOString()
      };

      if (selectedShowtime) {
        await apiClient.put(`/showtimes/${selectedShowtime.showtimeId}`, payload);
        showToast('Suất chiếu đã được cập nhật thành công.', 'success');
      } else {
        await apiClient.post('/showtimes', payload);
        showToast('Tạo suất chiếu mới thành công.', 'success');
      }
      setIsOpen(false);
      fetchShowtimes();
    } catch (error: any) {
      console.error(error);
      showToast(error.response?.data?.Message || 'Không thể lưu suất chiếu.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Delete/Cancel Showtime trigger
  const handleDeleteTrigger = (id: number) => {
    setShowtimeToDelete(id);
    setIsDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!showtimeToDelete) return;
    try {
      await apiClient.delete(`/showtimes/${showtimeToDelete}`);
      showToast('Đã hủy suất chiếu thành công.', 'success');
      setIsDeleteOpen(false);
      fetchShowtimes();
    } catch (error) {
      console.error(error);
      showToast('Lỗi khi hủy suất chiếu.', 'error');
    }
  };

  // Check Schedule Conflicts
  const checkConflict = (
    movieId: number, 
    hallId: number, 
    startTimeStr: string, 
    editingShowtimeId?: number
  ) => {
    if (!movieId || !hallId || !startTimeStr) return null;
    
    const start = dayjs.tz(startTimeStr, "Asia/Ho_Chi_Minh");
    if (!start.isValid()) return null;

    const movie = movies.find(m => (m.id || (m as any).movieId) === movieId);
    if (!movie) return null;

    const duration = movie.duration;
    const bufferTime = 30; // 15 min Ads + 15 min Cleaning
    const totalDuration = duration + bufferTime;
    
    const end = start.add(totalDuration, 'minute');

    const conflicting = allShowtimesList.find(st => {
      if (st.hallId !== hallId) return false;
      if (editingShowtimeId && st.showtimeId === editingShowtimeId) return false;
      if ((st as any).isCancelled) return false;

      const stMovie = movies.find(m => (m.id || (m as any).movieId) === st.movieId);
      const stDur = stMovie ? stMovie.duration : (st.movie?.duration || 120);
      const stTotalDur = stDur + 30; // duration + buffer

      const stStart = dayjs.tz(st.startTime, "Asia/Ho_Chi_Minh");
      const stEnd = stStart.add(stTotalDur, 'minute');

      return (start.isBefore(stEnd) && end.isAfter(stStart));
    });

    if (conflicting) {
      const conflictMovie = movies.find(m => (m.id || (m as any).movieId) === conflicting.movieId);
      const conflictStartStr = dayjs(conflicting.startTime).tz("Asia/Ho_Chi_Minh").format('HH:mm');
      const conflictEndStr = dayjs(conflicting.startTime).tz("Asia/Ho_Chi_Minh").add(conflictMovie?.duration || 120, 'minute').format('HH:mm');
      return `Xung đột: Phòng đã có suất khác của phim "${conflictMovie?.title || 'Phim khác'}" từ ${conflictStartStr} đến ${conflictEndStr}`;
    }

    return null;
  };

  // Real-time calculated properties for active form
  const formCalculations = useMemo(() => {
    const movie = movies.find(m => (m.id || (m as any).movieId) === form.movieId);
    if (!movie || !form.startTime) return null;

    const duration = movie.duration;
    const ads = 15;
    const cleaning = 15;
    const total = duration + ads + cleaning;
    
    const start = dayjs.tz(form.startTime, "Asia/Ho_Chi_Minh");
    const end = start.add(duration, 'minute');
    const totalEnd = start.add(total, 'minute');

    const conflictError = checkConflict(form.movieId, form.hallId, form.startTime, selectedShowtime?.showtimeId);

    return {
      duration,
      ads,
      cleaning,
      total,
      endTime: end.format('HH:mm'),
      totalEndTime: totalEnd.format('HH:mm'),
      conflictError,
    };
  }, [form.movieId, form.hallId, form.startTime, allShowtimesList, selectedShowtime, movies]);

  // Dashboard Statistics computations
  const stats = useMemo(() => {
    const todayStr = dayjs().tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD');
    const todayShowtimes = allShowtimesList.filter(st => dayjs(st.startTime).tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD') === todayStr);
    
    const totalToday = todayShowtimes.length;
    
    const uniqueMoviesToday = new Set(todayShowtimes.map(st => st.movieId)).size;
    const activeHallsToday = new Set(todayShowtimes.map(st => st.hallId)).size;
    
    // Calculate Occupancy percentages using real data if available
    const occupancies = todayShowtimes.map(st => {
      const sold = (st as any).soldSeats ?? ((st as any).totalSeats !== undefined ? ((st as any).totalSeats - st.availableSeats) : undefined);
      const total = (st as any).totalSeats ?? (sold !== undefined ? (st.availableSeats + sold) : undefined);
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

  // Timeline position calculation helpers (for range 08:00 - 24:00)
  const timelineStartHour = 8;
  const timelineHours = 16; // 8:00 to 24:00
  const timelineMinutes = timelineHours * 60; // 960 minutes

  const getTimelinePosition = (startTimeStr: string, movieDuration: number) => {
    const time = dayjs(startTimeStr).tz('Asia/Ho_Chi_Minh');
    const day = time.format('YYYY-MM-DD');
    
    const baseTimeline = dayjs.tz(`${day}T08:00:00`, 'Asia/Ho_Chi_Minh');
    const diffMinutes = time.diff(baseTimeline, 'minute');
    
    let leftPercent = (diffMinutes / timelineMinutes) * 100;
    let occupiedMinutes = movieDuration + 30; // + Ads + cleaning buffer
    
    if (diffMinutes < 0) {
      // starts before 08:00
      const visibleDuration = occupiedMinutes - Math.abs(diffMinutes);
      occupiedMinutes = Math.max(0, visibleDuration);
      leftPercent = 0;
    }
    
    let widthPercent = (occupiedMinutes / timelineMinutes) * 100;
    if (leftPercent + widthPercent > 100) {
      widthPercent = 100 - leftPercent;
    }
    
    leftPercent = Math.max(0, Math.min(100, leftPercent));
    widthPercent = Math.max(0, Math.min(100, widthPercent));
    
    return { left: `${leftPercent}%`, width: `${widthPercent}%` };
  };

  // Bulk showtimes generator list dry-run
  const dryRunShowtimes = useMemo(() => {
    if (!isBulkDryRun || !bulkMovieId || bulkSelectedHalls.length === 0 || bulkSelectedDates.length === 0) return [];
    
    const list: any[] = [];
    const movie = movies.find(m => (m.id || (m as any).movieId) === bulkMovieId);
    if (!movie) return [];

    bulkSelectedDates.forEach(dateStr => {
      bulkSelectedHalls.forEach(hallId => {
        const hall = bulkHallsList.find(h => h.hallId === hallId);
        bulkTimeSlots.forEach(time => {
          const startDateTimeStr = `${dateStr}T${time}`;
          const conflict = checkConflict(bulkMovieId, hallId, startDateTimeStr);
          
          list.push({
            date: dateStr,
            time,
            hallId,
            hallName: hall?.name || `Phòng ${hallId}`,
            movieTitle: movie.title,
            conflict,
            isValid: !conflict,
          });
        });
      });
    });

    return list;
  }, [isBulkDryRun, bulkMovieId, bulkSelectedHalls, bulkSelectedDates, bulkTimeSlots, bulkHallsList, movies]);

  const handleBulkCreate = async () => {
    const validOnes = dryRunShowtimes.filter(d => d.isValid);
    if (validOnes.length === 0) {
      showToast('Không có suất chiếu hợp lệ nào để tạo.', 'warning');
      return;
    }

    setSaving(true);
    let successCount = 0;
    try {
      for (const item of validOnes) {
        const payload = {
          movieId: bulkMovieId,
          hallId: item.hallId,
          priceId: bulkPriceId,
          startTime: dayjs.tz(`${item.date}T${item.time}`, "Asia/Ho_Chi_Minh").toISOString()
        };
        await apiClient.post('/showtimes', payload);
        successCount++;
      }
      showToast(`Tạo thành công ${successCount} suất chiếu.`, 'success');
      setIsBulkDryRun(false);
      setActiveTab('calendar');
      fetchShowtimes();
    } catch (err) {
      console.error(err);
      showToast(`Có lỗi xảy ra, đã tạo thành công ${successCount} suất chiếu.`, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Filtered list for Table view
  const filteredTableList = useMemo(() => {
    return allShowtimesList.filter(st => {
      const matchSearch = st.movie?.title.toLowerCase().includes(searchText.toLowerCase()) || false;
      const matchMovie = selectedMovieId === 'ALL' || st.movieId === selectedMovieId;
      const matchCinema = selectedCinemaId === 'ALL' || st.cinemaId === selectedCinemaId;
      const matchStatus = filterStatus === 'ALL' || getShowtimeStatus(st) === filterStatus;
      
      const matchDate = !filterDate || dayjs(st.startTime).tz("Asia/Ho_Chi_Minh").format('YYYY-MM-DD') === filterDate;

      return matchSearch && matchMovie && matchCinema && matchStatus && matchDate;
    });
  }, [allShowtimesList, searchText, selectedMovieId, selectedCinemaId, filterStatus, filterDate, movies]);

  const totalPages = Math.ceil(filteredTableList.length / pageSize);

  // Export to Excel / CSV
  const handleExportCSV = () => {
    const headers = ['Mã Suất', 'Tên Phim', 'Thời Lượng', 'Rạp Chiếu', 'Phòng Chiếu', 'Giờ Bắt Đầu', 'Giờ Kết Thúc', 'Giá Vé Gốc', 'Ghế Trống', 'Trạng Thái'];
    const rows = filteredTableList.map(st => {
      const start = dayjs(st.startTime).tz("Asia/Ho_Chi_Minh");
      const movieObj = movies.find(m => (m.id || (m as any).movieId) === st.movieId);
      const duration = movieObj?.duration || st.movie?.duration || 120;
      const end = start.add(duration, 'minute');
      const price = dbPrices.find(p => p.priceId === (st as any).priceId)?.value || st.priceValue || 80000;
      const statusText = STATUS_STYLES[getShowtimeStatus(st)]?.text || 'Không rõ';
      
      return [
        `ST-${st.showtimeId}`,
        st.movie?.title || movieObj?.title || '',
        `${duration} phút`,
        st.cinemaName || '',
        st.hall?.name || `Phòng ${st.hallId}`,
        start.format('DD/MM/YYYY HH:mm'),
        end.format('DD/MM/YYYY HH:mm'),
        `${price} VND`,
        `${st.availableSeats} ghế`,
        statusText
      ];
    });

    const csvContent = "\uFEFF" + [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `danh_sach_lich_chieu_${dayjs().tz('Asia/Ho_Chi_Minh').format('YYYYMMDD')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Xuất danh sách lịch chiếu thành công.', 'success');
  };

  const handleResetFilters = () => {
    setSelectedMovieId('ALL');
    setSelectedCinemaId('ALL');
    setFilterDate('');
    setFilterStatus('ALL');
    setSearchText('');
    showToast('Đã đặt lại tất cả bộ lọc.', 'info');
  };

  return (
    <div className="flex flex-col gap-6 text-gray-200">
      
      {/* 1. Header Title & Stats Dashboard */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-4">
        <div className="flex flex-col gap-1 text-left">
          <h2 className="text-xl font-black text-white uppercase tracking-wider flex items-center gap-2">
            <Calendar size={22} className="text-[#FF2D2D] drop-shadow-[0_0_8px_rgba(255,45,45,0.5)]" /> Quản Lý Lịch Chiếu
          </h2>
          <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
            Hệ thống phân bổ phòng chiếu, sắp xếp giờ và quản trị suất chiếu CinemaPass.
          </span>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="secondary" 
            size="sm" 
            onClick={() => { setActiveTab('bulk'); setIsBulkDryRun(false); }}
            className="flex items-center gap-1.5 border border-white/10 text-xs font-black uppercase tracking-wider hover:bg-white/5 cursor-pointer"
          >
            <CalendarDays size={14} className="text-[#FFD54A]" /> Tạo lịch hàng loạt
          </Button>
          <Button 
            variant="primary" 
            size="sm" 
            onClick={handleOpenAdd} 
            className="flex items-center gap-1.5 shadow-[0_0_15px_rgba(255,45,45,0.4)] text-xs font-black uppercase tracking-wider cursor-pointer bg-[#FF2D2D] hover:bg-[#ff4444]"
          >
            <Plus size={14} /> Thêm Lịch Chiếu
          </Button>
        </div>
      </div>

      {/* Stats Cards Section */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#0D111C]/60 border border-white/5 p-4 rounded-2xl flex items-center gap-4 shadow-xl backdrop-blur-md relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="h-10 w-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
            <Clock size={20} className="text-blue-400" />
          </div>
          <div className="flex flex-col text-left">
            <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">Suất chiếu hôm nay</span>
            <span className="text-xl font-mono font-black text-white">{stats.totalToday} suất</span>
          </div>
        </div>

        <div className="bg-[#0D111C]/60 border border-white/5 p-4 rounded-2xl flex items-center gap-4 shadow-xl backdrop-blur-md relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-r from-red-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="h-10 w-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
            <Film size={20} className="text-red-400" />
          </div>
          <div className="flex flex-col text-left">
            <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">Phim đang chiếu</span>
            <span className="text-xl font-mono font-black text-white">{stats.uniqueMoviesToday} phim</span>
          </div>
        </div>

        <div className="bg-[#0D111C]/60 border border-white/5 p-4 rounded-2xl flex items-center gap-4 shadow-xl backdrop-blur-md relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="h-10 w-10 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center shrink-0">
            <Building size={20} className="text-yellow-400" />
          </div>
          <div className="flex flex-col text-left">
            <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">Phòng hoạt động</span>
            <span className="text-xl font-mono font-black text-white">{stats.activeHallsToday} phòng</span>
          </div>
        </div>

        <div className="bg-[#0D111C]/60 border border-white/5 p-4 rounded-2xl flex items-center gap-4 shadow-xl backdrop-blur-md relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="h-10 w-10 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center shrink-0">
            <Users size={20} className="text-green-400" />
          </div>
          <div className="flex flex-col text-left">
            <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">Lấp đầy trung bình</span>
            <span className="text-xl font-mono font-black text-white">{stats.avgOccupancy > 0 ? `${stats.avgOccupancy}%` : 'N/A'}</span>
          </div>
        </div>
      </div>

      {/* 2. Tabs Selector & Toolbar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 border-b border-white/5 pb-2">
        <div className="flex bg-[#0D111C]/80 border border-white/5 p-1 rounded-xl self-start">
          <button
            onClick={() => setActiveTab('calendar')}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg tracking-wider uppercase transition-all cursor-pointer ${
              activeTab === 'calendar'
                ? 'bg-[#FF2D2D] text-white shadow-md'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Grid size={13} /> Sơ đồ Calendar
          </button>
          <button
            onClick={() => setActiveTab('table')}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg tracking-wider uppercase transition-all cursor-pointer ${
              activeTab === 'table'
                ? 'bg-[#FF2D2D] text-white shadow-md'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <List size={13} /> Danh sách Bảng
          </button>
          <button
            onClick={() => setActiveTab('bulk')}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg tracking-wider uppercase transition-all cursor-pointer ${
              activeTab === 'bulk'
                ? 'bg-[#FF2D2D] text-white shadow-md'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <CalendarDays size={13} /> Bộ tạo lịch hàng loạt
          </button>
        </div>

        {/* Global Toolbar buttons */}
        <div className="flex items-center gap-2 justify-end">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 text-xs border border-white/5 bg-white/5 hover:bg-white/10 text-gray-300 font-bold uppercase tracking-wider cursor-pointer"
          >
            <FileSpreadsheet size={13} className="text-green-500" /> Xuất Excel CSV
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleResetFilters}
            className="flex items-center gap-1.5 text-xs border border-white/5 bg-white/5 hover:bg-white/10 text-gray-300 font-bold uppercase tracking-wider cursor-pointer"
          >
            <RotateCcw size={13} /> Reset bộ lọc
          </Button>
        </div>
      </div>

      {/* 3. Render Tabs Content */}
      <AnimatePresence mode="wait">
        
        {/* TAB 1: CALENDAR VIEW */}
        {activeTab === 'calendar' && (
          <motion.div
            key="calendar-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex flex-col gap-4 text-left"
          >
            {/* Calendar Filters toolbar */}
            <div className="bg-[#0D111C]/40 border border-white/5 p-4 rounded-2xl flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-black tracking-wider text-gray-500">Xem ngày:</span>
                <input
                  type="date"
                  value={calendarDate}
                  onChange={(e) => setCalendarDate(e.target.value)}
                  className="bg-[#05070F] border border-white/5 rounded-xl px-3 py-1.5 text-xs font-semibold text-white focus:outline-none focus:border-[#FF2D2D]"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-black tracking-wider text-gray-500">Rạp chiếu:</span>
                <select
                  value={calendarCinemaId}
                  onChange={(e) => setCalendarCinemaId(parseInt(e.target.value) || 0)}
                  className="bg-[#05070F] border border-white/5 rounded-xl px-3 py-1.5 text-xs font-semibold text-white focus:outline-none focus:border-[#FF2D2D]"
                >
                  {cinemas.map(c => (
                    <option key={c.cinemaId} value={c.cinemaId}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-wrap gap-3 ml-auto text-[10px] font-black uppercase tracking-wider">
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#3B82F6]" /> Sắp chiếu</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#10B981]" /> Đang bán vé</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#F59E0B]" /> Đang chiếu</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#6B7280]" /> Đã kết thúc</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#EF4444]" /> Đã hủy</span>
              </div>
            </div>

            {/* Timeline Calendar grid */}
            <div className="bg-[#0D111C]/30 border border-white/5 rounded-3xl p-6 relative overflow-x-auto shadow-2xl backdrop-blur-md min-w-[700px]">
              
              {/* Hours Header Grid */}
              <div className="flex items-center border-b border-white/5 pb-3">
                <div className="w-32 shrink-0 text-[10px] font-black uppercase tracking-widest text-gray-500 text-left">Phòng Chiếu</div>
                <div className="flex-1 relative flex justify-between font-mono text-[10px] font-black text-gray-500 px-2">
                  {Array.from({ length: timelineHours + 1 }).map((_, i) => (
                    <div key={i} className="w-12 text-center select-none">
                      {String(timelineStartHour + i).padStart(2, '0')}:00
                    </div>
                  ))}
                </div>
              </div>

              {/* Grid Rows for Halls */}
              <div className="flex flex-col divide-y divide-white/5">
                {loadingCalendarHalls ? (
                  <div className="py-12 flex justify-center items-center text-xs gap-2 text-gray-500 font-bold">
                    <Loader2 size={16} className="animate-spin text-[#FF2D2D]" /> Đang tải sơ đồ phòng chiếu...
                  </div>
                ) : calendarHalls.length === 0 ? (
                  <div className="py-12 text-center text-xs text-gray-500 font-bold">
                    Rạp chiếu này hiện tại chưa được định nghĩa phòng chiếu nào.
                  </div>
                ) : (
                  calendarHalls.map(hall => {
                    // Filter showtimes in this hall on calendarDate
                    const hallShowtimes = allShowtimesList.filter(st => 
                      st.hallId === hall.hallId && 
                      dayjs(st.startTime).tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD') === calendarDate
                    );

                    return (
                      <div key={hall.hallId} className="flex items-stretch py-4">
                        <div className="w-32 shrink-0 flex flex-col justify-center text-left">
                          <span className="font-bold text-white text-xs">{hall.name}</span>
                          <span className="text-[9px] uppercase tracking-wider text-gray-500 font-black mt-0.5">{hall.hallTypeName}</span>
                        </div>

                        {/* Relative track container representing 8:00 - 24:00 */}
                        <div className="flex-1 relative h-16 bg-[#05070F]/50 rounded-xl border border-white/[0.02] overflow-hidden px-2">
                          
                          {/* Hour lines inside track */}
                          <div className="absolute inset-0 flex justify-between pointer-events-none opacity-20">
                            {Array.from({ length: timelineHours + 1 }).map((_, i) => (
                              <div key={i} className="h-full border-r border-dashed border-white/10 w-0" />
                            ))}
                          </div>

                          {/* Showtime blocks */}
                          {hallShowtimes.map(st => {
                            const status = getShowtimeStatus(st);
                            const styleObj = STATUS_STYLES[status];
                            const movie = movies.find(m => (m.id || (m as any).movieId) === st.movieId);
                            const duration = movie?.duration || st.movie?.duration || 120;
                            const pos = getTimelinePosition(st.startTime, duration);
                            
                            const startStr = dayjs(st.startTime).tz('Asia/Ho_Chi_Minh').format('HH:mm');
                            const endStr = dayjs(st.startTime).tz('Asia/Ho_Chi_Minh').add(duration, 'minute').format('HH:mm');

                            return (
                              <div
                                key={st.showtimeId}
                                className="absolute top-2 bottom-2 rounded-lg p-2 flex flex-col justify-between border cursor-pointer select-none transition-all hover:scale-[1.02] hover:shadow-lg text-left"
                                style={{
                                  left: pos.left,
                                  width: pos.width,
                                  backgroundColor: styleObj.bg,
                                  borderColor: styleObj.border,
                                }}
                                onClick={() => handleOpenEdit(st)}
                              >
                                <div className="flex justify-between items-start gap-1">
                                  <span className="text-[10px] font-black text-white truncate drop-shadow-md">
                                    {movie?.title || st.movie?.title || 'Phim chưa đặt'}
                                  </span>
                                  <span className="text-[8px] font-mono font-bold shrink-0 opacity-80" style={{ color: styleObj.color }}>
                                    {startStr} - {endStr}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center text-[8px] font-semibold text-gray-400">
                                  <span>{duration}m</span>
                                  <span>{st.availableSeats} ghế trống</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB 2: TABLE VIEW */}
        {activeTab === 'table' && (
          <motion.div
            key="table-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex flex-col gap-4 text-left"
          >
            {/* Filter grid box */}
            <div className="bg-[#0D111C]/40 border border-white/5 p-4 rounded-3xl grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
              
              <div className="flex flex-col gap-1">
                <span className="text-[9px] uppercase text-gray-500 font-black tracking-widest">Phim</span>
                <select
                  value={selectedMovieId}
                  onChange={(e) => { setSelectedMovieId(e.target.value === 'ALL' ? 'ALL' : parseInt(e.target.value)); setPage(1); }}
                  className="w-full bg-[#05070F] border border-white/5 px-3 py-2 text-xs font-semibold text-white rounded-xl focus:outline-none focus:border-[#FF2D2D]"
                >
                  <option value="ALL">Tất cả phim</option>
                  {movies.map(m => (
                    <option key={m.id || (m as any).movieId} value={m.id || (m as any).movieId}>{m.title}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[9px] uppercase text-gray-500 font-black tracking-widest">Rạp</span>
                <select
                  value={selectedCinemaId}
                  onChange={(e) => { setSelectedCinemaId(e.target.value === 'ALL' ? 'ALL' : parseInt(e.target.value)); setPage(1); }}
                  className="w-full bg-[#05070F] border border-white/5 px-3 py-2 text-xs font-semibold text-white rounded-xl focus:outline-none focus:border-[#FF2D2D]"
                >
                  <option value="ALL">Tất cả rạp</option>
                  {cinemas.map(c => (
                    <option key={c.cinemaId} value={c.cinemaId}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[9px] uppercase text-gray-500 font-black tracking-widest">Ngày chiếu</span>
                <input
                  type="date"
                  value={filterDate}
                  onChange={(e) => { setFilterDate(e.target.value); setPage(1); }}
                  className="w-full bg-[#05070F] border border-white/5 px-3 py-2 text-xs font-semibold text-white rounded-xl focus:outline-none focus:border-[#FF2D2D]"
                />
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[9px] uppercase text-gray-500 font-black tracking-widest">Trạng thái</span>
                <select
                  value={filterStatus}
                  onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
                  className="w-full bg-[#05070F] border border-white/5 px-3 py-2 text-xs font-semibold text-white rounded-xl focus:outline-none focus:border-[#FF2D2D]"
                >
                  <option value="ALL">Tất cả trạng thái</option>
                  <option value="UPCOMING">Sắp chiếu</option>
                  <option value="SELLING">Đang bán vé</option>
                  <option value="SCREENING">Đang chiếu</option>
                  <option value="ENDED">Đã kết thúc</option>
                  <option value="CANCELLED">Đã hủy</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[9px] uppercase text-gray-500 font-black tracking-widest">Từ khóa</span>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Tìm tên phim..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    className="w-full bg-[#05070F] border border-white/5 pl-8 pr-3 py-2 text-xs font-semibold text-white rounded-xl focus:outline-none focus:border-[#FF2D2D]"
                  />
                  <Search size={12} className="absolute left-2.5 top-2.5 text-gray-500" />
                </div>
              </div>
            </div>

            {/* List Table container */}
            <div className="overflow-x-auto rounded-3xl border border-white/5 bg-[#0e0e12]/30 backdrop-blur-md shadow-2xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/5 bg-white/[0.02] text-gray-400 font-black uppercase tracking-wider text-[9px]">
                    <th className="p-4">Mã Suất</th>
                    <th className="p-4">Phim</th>
                    <th className="p-4">Địa điểm</th>
                    <th className="p-4">Thời gian</th>
                    <th className="p-4">Giá vé</th>
                    <th className="p-4">Tỷ lệ bán vé</th>
                    <th className="p-4">Trạng thái</th>
                    <th className="p-4 text-right">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-semibold text-gray-300">
                  {loading ? (
                    Array.from({ length: pageSize }).map((_, idx) => (
                      <tr key={idx} className="animate-pulse">
                        <td className="p-4"><div className="h-4 bg-white/5 rounded w-16" /></td>
                        <td className="p-4"><div className="h-4 bg-white/5 rounded w-44" /></td>
                        <td className="p-4"><div className="h-4 bg-white/5 rounded w-36" /></td>
                        <td className="p-4"><div className="h-4 bg-white/5 rounded w-28" /></td>
                        <td className="p-4"><div className="h-4 bg-white/5 rounded w-20" /></td>
                        <td className="p-4"><div className="h-3 bg-white/5 rounded w-24" /></td>
                        <td className="p-4"><div className="h-4 bg-white/5 rounded w-16" /></td>
                        <td className="p-4 text-right"><div className="h-8 bg-white/5 rounded w-24 ml-auto" /></td>
                      </tr>
                    ))
                  ) : filteredTableList.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-16 text-center text-gray-500 font-bold">
                        <AlertTriangle size={32} className="mx-auto mb-2 text-gray-600" />
                        Không tìm thấy lịch chiếu nào phù hợp.
                      </td>
                    </tr>
                  ) : (
                    filteredTableList.slice((page - 1) * pageSize, page * pageSize).map((st) => {
                      const status = getShowtimeStatus(st);
                      const styleObj = STATUS_STYLES[status];
                      
                      const sold = (st as any).soldSeats ?? ((st as any).totalSeats !== undefined ? ((st as any).totalSeats - st.availableSeats) : undefined);
                      const totalSeats = (st as any).totalSeats ?? (sold !== undefined ? (st.availableSeats + sold) : undefined);
                      const occupancyRate = (sold !== undefined && totalSeats) ? Math.round((sold / totalSeats) * 100) : null;

                      const ticketPrice = dbPrices.find(p => p.priceId === (st as any).priceId)?.value || st.priceValue || 80000;

                      return (
                        <tr key={st.showtimeId} className="hover:bg-white/[0.01] transition-colors">
                          <td className="p-4 font-mono font-bold text-gray-500">#ST-{st.showtimeId}</td>
                          <td className="p-4 max-w-[220px]">
                            <span className="block font-bold text-white truncate">{st.movie?.title}</span>
                            <span className="text-[10px] text-gray-500 mt-0.5 font-bold block uppercase">{st.movie?.genre?.genreName || 'Phim rạp'} • {st.movie?.duration} phút</span>
                          </td>
                          <td className="p-4">
                            <span className="block font-bold text-white">{st.cinemaName || 'CinemaPass Central'}</span>
                            <span className="text-[10px] text-gray-500 font-bold block mt-0.5 uppercase">
                              {st.hall?.name} • ({st.hall?.hallTypeName})
                            </span>
                          </td>
                          <td className="p-4 font-mono text-gray-300">
                            <div className="flex items-center gap-1.5">
                              <Clock size={11} className="text-[#FF2D2D] shrink-0" />
                              <span>{formatVietnamTimeDisplay(st.startTime)}</span>
                            </div>
                          </td>
                          <td className="p-4 font-bold text-[#FFD54A] font-mono">
                            {ticketPrice.toLocaleString()} đ
                          </td>
                          <td className="p-4">
                            {occupancyRate !== null && sold !== undefined ? (
                              <div className="flex flex-col gap-1 w-28 text-left">
                                <div className="flex justify-between text-[9px] font-black uppercase text-gray-400">
                                  <span>Đã bán {sold}</span>
                                  <span>{occupancyRate}%</span>
                                </div>
                                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-[#FF2D2D] rounded-full transition-all duration-500" 
                                    style={{ width: `${occupancyRate}%`, boxShadow: '0 0 6px #FF2D2D' }}
                                  />
                                </div>
                              </div>
                            ) : (
                              <span className="text-gray-500 italic block text-left">N/A</span>
                            )}
                          </td>
                          <td className="p-4">
                            <span 
                              className="px-2.5 py-1 text-[8px] font-black uppercase tracking-wider rounded border"
                              style={{ 
                                color: styleObj.color, 
                                borderColor: styleObj.border, 
                                backgroundColor: styleObj.bg 
                              }}
                            >
                              {styleObj.text}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex gap-1.5 justify-end">
                              <button
                                onClick={() => handleDuplicate(st)}
                                className="p-2 bg-white/5 border border-white/5 hover:border-blue-400 text-blue-400 rounded-xl transition-colors cursor-pointer"
                                title="Sao chép lịch"
                              >
                                <Copy size={11} />
                              </button>
                              <button
                                onClick={() => handleOpenEdit(st)}
                                className="p-2 bg-white/5 border border-white/5 hover:border-[#FFD54A] text-[#FFD54A] rounded-xl transition-colors cursor-pointer"
                                title="Chỉnh sửa"
                              >
                                <Edit3 size={11} />
                              </button>
                              <button
                                onClick={() => handleDeleteTrigger(st.showtimeId)}
                                className="p-2 bg-white/5 border border-white/5 hover:border-[#FF2D2D] text-[#FF2D2D] rounded-xl transition-colors cursor-pointer"
                                title="Hủy suất"
                              >
                                <Trash2 size={11} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex justify-between items-center text-xs font-bold text-gray-500 uppercase tracking-wider mt-2">
                <span>Đang hiển thị trang {page} trên {totalPages}</span>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={page === 1}
                    onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                    className="text-[10px] cursor-pointer"
                  >
                    Trước
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={page === totalPages}
                    onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
                    className="text-[10px] cursor-pointer"
                  >
                    Sau
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* TAB 3: BULK SCHEDULER VIEW */}
        {activeTab === 'bulk' && (
          <motion.div
            key="bulk-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left"
          >
            {/* Left Column Config panels */}
            <div className="lg:col-span-2 flex flex-col gap-6">
              
              <div className="bg-[#0D111C]/40 border border-white/5 p-6 rounded-3xl flex flex-col gap-4">
                <h3 className="text-xs font-black uppercase text-[#FFD54A] tracking-wider border-b border-white/5 pb-2">
                  1. Cấu Hình Suất Chiếu Hàng Loạt
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1 text-xs">
                    <span className="text-gray-400 font-bold uppercase tracking-wider">Chọn Phim</span>
                    <select
                      value={bulkMovieId}
                      onChange={(e) => { setBulkMovieId(parseInt(e.target.value) || 0); setIsBulkDryRun(false); }}
                      className="w-full bg-[#05070F] border border-white/5 px-3 py-2.5 text-xs font-semibold text-white rounded-xl focus:outline-none focus:border-[#FF2D2D]"
                    >
                      <option value={0}>-- Chọn Phim --</option>
                      {movies.map(m => (
                        <option key={m.id || (m as any).movieId} value={m.id || (m as any).movieId}>{m.title} ({m.duration} phút)</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1 text-xs">
                    <span className="text-gray-400 font-bold uppercase tracking-wider">Chọn Rạp</span>
                    <select
                      value={bulkCinemaId}
                      onChange={(e) => { setBulkCinemaId(parseInt(e.target.value) || 0); setIsBulkDryRun(false); }}
                      className="w-full bg-[#05070F] border border-white/5 px-3 py-2.5 text-xs font-semibold text-white rounded-xl focus:outline-none focus:border-[#FF2D2D]"
                    >
                      {cinemas.map(c => (
                        <option key={c.cinemaId} value={c.cinemaId}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Select Halls Checkboxes */}
                  <div className="flex flex-col gap-2 text-xs">
                    <span className="text-gray-400 font-bold uppercase tracking-wider flex items-center justify-between">
                      <span>Chọn phòng chiếu</span>
                      {bulkLoadingHalls && <Loader2 size={12} className="animate-spin text-[#FF2D2D]" />}
                    </span>
                    <div className="bg-[#05070F] border border-white/5 p-3 rounded-xl max-h-36 overflow-y-auto flex flex-col gap-2">
                      {bulkHallsList.map(h => {
                        const checked = bulkSelectedHalls.includes(h.hallId);
                        return (
                          <label key={h.hallId} className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {
                                setIsBulkDryRun(false);
                                setBulkSelectedHalls(prev => 
                                  checked ? prev.filter(id => id !== h.hallId) : [...prev, h.hallId]
                                );
                              }}
                              className="accent-[#FF2D2D]"
                            />
                            <span className="font-semibold text-gray-300">{h.name} ({h.hallTypeName})</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Select Dates Checkboxes */}
                  <div className="flex flex-col gap-2 text-xs">
                    <span className="text-gray-400 font-bold uppercase tracking-wider">Chọn ngày chiếu</span>
                    <div className="bg-[#05070F] border border-white/5 p-3 rounded-xl max-h-36 overflow-y-auto flex flex-col gap-2">
                      {Array.from({ length: 7 }).map((_, i) => {
                        const dateVal = dayjs().tz('Asia/Ho_Chi_Minh').add(i, 'day').format('YYYY-MM-DD');
                        const displayVal = dayjs().tz('Asia/Ho_Chi_Minh').add(i, 'day').format('DD/MM (dd)');
                        const checked = bulkSelectedDates.includes(dateVal);
                        
                        return (
                          <label key={dateVal} className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {
                                setIsBulkDryRun(false);
                                setBulkSelectedDates(prev =>
                                  checked ? prev.filter(d => d !== dateVal) : [...prev, dateVal]
                                );
                              }}
                              className="accent-[#FF2D2D]"
                            />
                            <span className="font-semibold text-gray-300">{displayVal}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Select Time templates */}
                  <div className="flex flex-col gap-2 text-xs">
                    <span className="text-gray-400 font-bold uppercase tracking-wider">Khung giờ phát (Templates)</span>
                    <div className="bg-[#05070F] border border-white/5 p-3 rounded-xl flex flex-wrap gap-2">
                      {['08:00', '10:00', '11:00', '13:00', '14:00', '16:00', '17:00', '19:00', '20:00', '22:00'].map(t => {
                        const checked = bulkTimeSlots.includes(t);
                        return (
                          <button
                            key={t}
                            onClick={() => {
                              setIsBulkDryRun(false);
                              setBulkTimeSlots(prev => 
                                checked ? prev.filter(slot => slot !== t) : [...prev, t].sort()
                              );
                            }}
                            className={`px-2.5 py-1 text-[10px] font-mono font-bold rounded-lg border transition-all ${
                              checked 
                                ? 'bg-[#FF2D2D]/20 text-[#FF2D2D] border-[#FF2D2D]' 
                                : 'bg-[#05070F] text-gray-400 border-white/5 hover:text-white'
                            }`}
                          >
                            {t}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1 text-xs">
                    <span className="text-gray-400 font-bold uppercase tracking-wider">Mức Giá Vé Áp Dụng</span>
                    <select
                      value={bulkPriceId}
                      onChange={(e) => setBulkPriceId(parseInt(e.target.value) || 1)}
                      className="w-full bg-[#05070F] border border-white/5 px-3 py-2.5 text-xs font-semibold text-white rounded-xl focus:outline-none focus:border-[#FF2D2D]"
                    >
                      {dbPrices.map(p => (
                        <option key={p.priceId} value={p.priceId}>{formatTicketType(p.ticketType)} - {p.value.toLocaleString()} VND</option>
                      ))}
                    </select>
                  </div>
                </div>

                <Button
                  onClick={() => {
                    if (!bulkMovieId || bulkSelectedHalls.length === 0 || bulkSelectedDates.length === 0) {
                      showToast('Vui lòng chọn phim, phòng chiếu và ngày chiếu.', 'error');
                      return;
                    }
                    setIsBulkDryRun(true);
                  }}
                  className="bg-[#FFD54A] hover:bg-[#ffe380] text-black font-black uppercase text-xs tracking-wider py-3 mt-2 rounded-xl cursor-pointer w-full"
                >
                  <Sparkles size={14} className="inline mr-1" /> Chạy thử liên kết suất chiếu (Dry Run)
                </Button>
              </div>

            </div>

            {/* Dry Run Preview Column */}
            <div className="bg-[#0D111C]/40 border border-white/5 p-6 rounded-3xl flex flex-col gap-4">
              <h3 className="text-xs font-black uppercase text-[#FFD54A] tracking-wider border-b border-white/5 pb-2">
                2. Preview Trùng Lịch (Dry Run)
              </h3>

              {!isBulkDryRun ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-gray-500 font-semibold text-xs min-h-[300px]">
                  <HelpCircle size={32} className="text-gray-600 mb-2" />
                  <span>Vui lòng chọn đầy đủ thông tin bên trái và nhấn nút "Chạy thử" để kiểm tra xung đột thời gian rạp chiếu.</span>
                </div>
              ) : (
                <div className="flex flex-col gap-4 flex-1">
                  <div className="flex justify-between text-[10px] font-black uppercase text-gray-400">
                    <span>Tổng dự kiến: {dryRunShowtimes.length} suất</span>
                    <span className="text-green-400">Hợp lệ: {dryRunShowtimes.filter(d => d.isValid).length}</span>
                  </div>

                  {/* Scrollable list of dry-run schedules */}
                  <div className="flex-1 overflow-y-auto max-h-[300px] border border-white/5 p-2 rounded-xl bg-[#05070F]/50 flex flex-col gap-2">
                    {dryRunShowtimes.map((item, idx) => (
                      <div 
                        key={idx} 
                        className={`p-2.5 rounded-lg border text-[10px] flex justify-between items-start gap-2 ${
                          item.isValid 
                            ? 'bg-green-500/5 border-green-500/20' 
                            : 'bg-red-500/5 border-red-500/20'
                        }`}
                      >
                        <div className="flex flex-col gap-0.5 text-left">
                          <span className="font-bold text-white">{item.hallName} • {dayjs(item.date).tz('Asia/Ho_Chi_Minh').format('DD/MM')} • {item.time}</span>
                          <span className="text-[8px] text-gray-400 truncate max-w-[170px]">{item.movieTitle}</span>
                          {!item.isValid && (
                            <span className="text-[8px] text-red-400 font-bold mt-1">⚠️ {item.conflict}</span>
                          )}
                        </div>
                        <span 
                          className={`px-1.5 py-0.5 text-[8px] font-black uppercase rounded shrink-0 border ${
                            item.isValid 
                              ? 'text-green-400 border-green-500/20 bg-green-500/10' 
                              : 'text-red-400 border-red-500/20 bg-red-500/10'
                          }`}
                        >
                          {item.isValid ? 'Hợp Lệ' : 'Bị Trùng'}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-3 mt-2">
                    <Button 
                      variant="secondary" 
                      fullWidth 
                      onClick={() => setIsBulkDryRun(false)}
                      className="cursor-pointer text-xs"
                    >
                      Hủy Bỏ
                    </Button>
                    <Button 
                      variant="primary" 
                      fullWidth 
                      disabled={saving || dryRunShowtimes.filter(d => d.isValid).length === 0}
                      onClick={handleBulkCreate}
                      className="cursor-pointer text-xs bg-[#FF2D2D] hover:bg-[#ff4444]"
                    >
                      {saving ? <Loader2 size={12} className="animate-spin inline" /> : <Check size={12} className="inline mr-1" />} Tạo ngay suất hợp lệ
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

      </AnimatePresence>

      {/* 4. Single Showtime Modal (Create & Edit) */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md overflow-y-auto flex items-start justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-xl bg-[#0D111C] border border-white/10 rounded-3xl p-6 shadow-2xl text-left my-auto"
            >
              <button
                onClick={() => setIsOpen(false)}
                className="absolute top-4 right-4 bg-white/5 hover:bg-white/10 text-white p-2 rounded-full transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>

              <h2 className="text-sm font-black text-[#FFD54A] uppercase tracking-widest mb-6 border-b border-white/5 pb-3 flex items-center gap-2">
                <Calendar size={18} className="text-[#FF2D2D]" />
                {selectedShowtime ? 'Sửa Lịch Chiếu Suất' : 'Thêm Suất Chiếu Mới'}
              </h2>

              <form onSubmit={handleSave} className="flex flex-col gap-6">
                
                {/* Section 1: Movie Selection with Poster Preview */}
                <div className="bg-[#05070F]/50 border border-white/5 p-4 rounded-2xl grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Selected Movie details */}
                  <div className="flex flex-col gap-1 sm:col-span-2 text-xs">
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#FFD54A]">1. Thông tin phim</span>
                    <div className="flex flex-col gap-2 mt-2">
                      <div>
                        <span className="text-gray-400 font-bold uppercase tracking-wider block text-[9px]">Tên phim</span>
                        <select
                          value={form.movieId}
                          onChange={(e) => setForm(prev => ({ ...prev, movieId: parseInt(e.target.value) || 0 }))}
                          className="w-full mt-1 bg-[#05070F] border border-white/5 px-3 py-2 text-xs font-bold text-white rounded-xl focus:outline-none focus:border-[#FF2D2D]"
                        >
                          {movies.map(m => (
                            <option key={m.id || (m as any).movieId} value={m.id || (m as any).movieId}>{m.title}</option>
                          ))}
                        </select>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 mt-1">
                        <div>
                          <span className="text-gray-400 font-bold uppercase tracking-wider block text-[9px]">Thời lượng</span>
                          <span className="text-white font-mono font-bold block mt-1">
                            {movies.find(m => (m.id || (m as any).movieId) === form.movieId)?.duration || 120} phút
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400 font-bold uppercase tracking-wider block text-[9px]">Thể loại</span>
                          <span className="text-white font-bold block mt-1 truncate">
                            {movies.find(m => (m.id || (m as any).movieId) === form.movieId)?.genre?.genreName || 'Hành động / Khoa học'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Poster image preview */}
                  <div className="hidden sm:flex items-center justify-center bg-[#05070F] border border-white/5 rounded-xl overflow-hidden h-28 relative shadow-inner">
                    {movies.find(m => (m.id || (m as any).movieId) === form.movieId)?.posterUrl ? (
                      <img 
                        src={movies.find(m => (m.id || (m as any).movieId) === form.movieId)?.posterUrl} 
                        alt="Poster" 
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Film size={28} className="text-gray-600" />
                    )}
                  </div>
                </div>

                {/* Section 2: Cinema & Screening Location */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1 text-xs">
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#FFD54A]">2. Địa điểm chiếu</span>
                    <div className="mt-2 flex flex-col gap-1">
                      <span className="text-gray-400 font-bold uppercase tracking-wider block text-[9px]">Cơ sở rạp</span>
                      <select
                        value={form.cinemaId}
                        onChange={(e) => handleCinemaChange(parseInt(e.target.value) || 0)}
                        className="w-full bg-[#05070F] border border-white/5 px-3 py-2 text-xs font-semibold text-white rounded-xl focus:outline-none focus:border-[#FF2D2D]"
                      >
                        <option value={0}>-- Chọn Rạp --</option>
                        {cinemas.map(c => (
                          <option key={c.cinemaId} value={c.cinemaId}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1 text-xs justify-end">
                    <div className="flex flex-col gap-1">
                      <span className="text-gray-400 font-bold uppercase tracking-wider flex items-center justify-between text-[9px]">
                        <span>Phòng chiếu</span>
                        {loadingHalls && <Loader2 size={10} className="animate-spin text-[#FF2D2D]" />}
                      </span>
                      <select
                        value={form.hallId}
                        onChange={(e) => setForm(prev => ({ ...prev, hallId: parseInt(e.target.value) || 0 }))}
                        disabled={halls.length === 0 || loadingHalls}
                        className="w-full bg-[#05070F] border border-white/5 px-3 py-2 text-xs font-semibold text-white rounded-xl focus:outline-none focus:border-[#FF2D2D] disabled:opacity-50"
                      >
                        {halls.length === 0 ? (
                          <option value={0}>-- Chọn Rạp trước --</option>
                        ) : (
                          halls.map(h => (
                            <option key={h.hallId} value={h.hallId}>{h.name} ({h.hallTypeName})</option>
                          ))
                        )}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Section 3: Time Scheduling with automatic calculation */}
                <div className="bg-[#05070F]/50 border border-white/5 p-4 rounded-2xl flex flex-col gap-4">
                  <div className="flex justify-between items-center text-[10px] font-black uppercase text-[#FFD54A]">
                    <span>3. Thời gian phát</span>
                    <span className="text-gray-400 font-mono">Tự động tính thời lượng phòng</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      type="datetime-local"
                      label="Bắt đầu suất chiếu"
                      required
                      value={form.startTime}
                      onChange={(e) => setForm(prev => ({ ...prev, startTime: e.target.value }))}
                      className="bg-[#05070F] border-white/5 text-xs text-white"
                    />

                    <div className="flex flex-col gap-1 text-xs">
                      <span className="text-gray-400 font-bold uppercase tracking-wider text-[9px] mb-1">Thời gian chiếm phòng</span>
                      {formCalculations ? (
                        <div className="bg-[#05070F] border border-white/5 p-2 rounded-xl flex flex-col gap-1 text-left">
                          <div className="flex justify-between text-[10px] font-semibold text-gray-300">
                            <span>Chiếu phim:</span>
                            <span className="font-mono text-white">{formCalculations.endTime}</span>
                          </div>
                          <div className="flex justify-between text-[10px] font-semibold text-gray-400">
                            <span>Quảng cáo (15m):</span>
                            <span className="font-mono">+{formCalculations.ads}m</span>
                          </div>
                          <div className="flex justify-between text-[10px] font-semibold text-gray-400 border-b border-white/5 pb-1">
                            <span>Vệ sinh sảnh (15m):</span>
                            <span className="font-mono">+{formCalculations.cleaning}m</span>
                          </div>
                          <div className="flex justify-between text-[10px] font-black text-[#FFD54A] pt-1">
                            <span>Giải phóng phòng:</span>
                            <span className="font-mono">{formCalculations.totalEndTime}</span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-600 italic block mt-2">Điền thời gian bắt đầu trước...</span>
                      )}
                    </div>
                  </div>

                  {/* Conflict detection realtime warning */}
                  {formCalculations?.conflictError && (
                    <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl flex gap-2 items-center text-xs text-red-400 font-bold animate-pulse text-left">
                      <AlertTriangle size={16} className="shrink-0" />
                      <span>{formCalculations.conflictError}</span>
                    </div>
                  )}
                </div>

                {/* Price Tier Selection */}
                <div className="flex flex-col gap-1.5 text-xs">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#FFD54A]">4. Bảng giá vé áp dụng</span>
                  <select
                    value={form.priceId}
                    onChange={(e) => setForm(prev => ({ ...prev, priceId: parseInt(e.target.value) || 1 }))}
                    className="w-full bg-[#05070F] border border-white/5 px-3 py-2.5 text-xs font-semibold text-white rounded-xl focus:outline-none focus:border-[#FF2D2D] mt-1"
                  >
                    {dbPrices.map(p => (
                      <option key={p.priceId} value={p.priceId}>
                        {formatTicketType(p.ticketType)} - {p.value.toLocaleString()} VND
                      </option>
                    ))}
                  </select>
                </div>

                {/* Footer Buttons */}
                <div className="flex gap-4 border-t border-white/5 pt-4">
                  <Button 
                    type="button" 
                    variant="secondary" 
                    fullWidth 
                    onClick={() => setIsOpen(false)}
                    className="cursor-pointer"
                  >
                    Hủy bỏ
                  </Button>
                  <Button 
                    type="submit" 
                    variant="primary" 
                    fullWidth 
                    className="shadow-[0_0_15px_rgba(255,45,45,0.4)] bg-[#FF2D2D] hover:bg-[#ff4444] font-black cursor-pointer" 
                    disabled={saving || halls.length === 0 || !!formCalculations?.conflictError}
                  >
                    {saving ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Lưu suất chiếu'}
                  </Button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 5. Delete Confirm dialog */}
      <AnimatePresence>
        {isDeleteOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0D111C] border border-white/10 rounded-3xl p-6 w-full max-w-sm text-center flex flex-col gap-4 items-center shadow-2xl"
            >
              <div className="h-12 w-12 bg-red-500/10 border border-red-500/20 text-[#FF2D2D] rounded-full flex items-center justify-center">
                <AlertTriangle size={24} />
              </div>
              <div className="text-center">
                <h3 className="text-sm font-black text-white uppercase tracking-wider">Xác Nhận Hủy Suất</h3>
                <p className="text-xs text-gray-400 mt-2 font-semibold">
                  Bạn có chắc chắn muốn hủy suất chiếu này khỏi hệ thống? Hành động này sẽ tự động hủy vé của tất cả khách hàng đã đặt cho suất chiếu này.
                </p>
              </div>
              <div className="flex gap-3 w-full mt-2">
                <Button variant="secondary" fullWidth onClick={() => setIsDeleteOpen(false)} className="cursor-pointer">
                  Bỏ qua
                </Button>
                <Button variant="primary" fullWidth onClick={handleDelete} className="bg-[#FF2D2D] hover:bg-[#ff4444] font-black cursor-pointer">
                  Xác nhận hủy
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};