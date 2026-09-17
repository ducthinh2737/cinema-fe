import { useState, useCallback } from 'react';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

import { showtimeService } from '../services/showtimeService';
import type { ApiShowtime, MappedHall } from '../types/showtime';
import { useToast } from '../contexts/ToastContext';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault('Asia/Ho_Chi_Minh');

import { parseShowtimeTime } from '../domain/showtime/engine';

export const useShowtimeModal = () => {
  const { showToast } = useToast();

  const [isOpen, setIsOpen] = useState(false);
  const [selectedShowtime, setSelectedShowtime] = useState<ApiShowtime | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [showtimeToDelete, setShowtimeToDelete] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    movieId: 0,
    cinemaId: 0,
    hallId: 0,
    priceId: 1,
    startTime: '',
    format: '2D',
  });

  const [halls, setHalls] = useState<MappedHall[]>([]);
  const [loadingHalls, setLoadingHalls] = useState(false);

  const loadHallsForCinema = useCallback(async (cinemaId: number, preserveHallId?: number) => {
    if (!cinemaId) {
      setHalls([]);
      return;
    }
    setLoadingHalls(true);
    try {
      const responseData = await showtimeService.getHalls(cinemaId);
      const mappedHalls: MappedHall[] = responseData.map((h: any) => {
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
      setHalls(mappedHalls);

      setForm(prev => {
        const hasPreservedHall = preserveHallId && mappedHalls.some(h => h.hallId === preserveHallId);
        if (hasPreservedHall) {
          return { ...prev, cinemaId, hallId: preserveHallId! };
        } else if (mappedHalls.length > 0) {
          return { ...prev, cinemaId, hallId: mappedHalls[0].hallId };
        }
        return { ...prev, cinemaId, hallId: 0 };
      });
    } catch (error) {
      console.error(error);
      showToast('Lỗi khi tải danh sách phòng chiếu.', 'error');
    } finally {
      setLoadingHalls(false);
    }
  }, [showToast]);

  const openAdd = useCallback((defaultMovieId: number, defaultCinemaId: number, defaultPriceId: number) => {
    setSelectedShowtime(null);
    setHalls([]);
    setForm({
      movieId: defaultMovieId,
      cinemaId: defaultCinemaId,
      hallId: 0,
      priceId: defaultPriceId,
      startTime: dayjs().tz('Asia/Ho_Chi_Minh').add(1, 'day').hour(18).minute(0).format('YYYY-MM-DDTHH:mm'),
      format: '2D',
    });

    if (defaultCinemaId) {
      loadHallsForCinema(defaultCinemaId);
    }
    setIsOpen(true);
  }, [loadHallsForCinema]);

  const openEdit = useCallback(async (showtime: ApiShowtime) => {
    setSelectedShowtime(showtime);

    if (!showtime.cinemaId) {
      showToast('Không xác định được rạp chiếu của suất chiếu này.', 'error');
      return;
    }

    setLoadingHalls(true);
    try {
      const responseData = await showtimeService.getHalls(showtime.cinemaId);
      const mappedHalls: MappedHall[] = responseData.map((h: any) => {
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
      setHalls(mappedHalls);

      setForm({
        movieId: showtime.movieId,
        cinemaId: showtime.cinemaId,
        hallId: showtime.hallId,
        priceId: showtime.priceId || 1,
        startTime: parseShowtimeTime(showtime.startTime).format('YYYY-MM-DDTHH:mm'),
        format: '2D',
      });
      setIsOpen(true);
    } catch (error) {
      console.error(error);
      showToast('Lỗi khi tải thông tin suất chiếu.', 'error');
    } finally {
      setLoadingHalls(false);
    }
  }, [showToast]);

  const openDuplicate = useCallback((showtime: ApiShowtime) => {
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
      startTime: parseShowtimeTime(showtime.startTime).add(3, 'hour').format('YYYY-MM-DDTHH:mm'),
      format: '2D',
    });

    loadHallsForCinema(showtime.cinemaId, showtime.hallId);
    setIsOpen(true);
    showToast('Đã sao chép thông tin suất chiếu sang suất mới.', 'info');
  }, [loadHallsForCinema, showToast]);

  const openDelete = useCallback((id: number) => {
    setShowtimeToDelete(id);
    setIsDeleteOpen(true);
  }, []);

  const closeAll = useCallback(() => {
    setIsOpen(false);
    setIsDeleteOpen(false);
    setSelectedShowtime(null);
    setShowtimeToDelete(null);
  }, []);

  return {
    isOpen,
    selectedShowtime,
    isDeleteOpen,
    showtimeToDelete,
    saving,
    setSaving,
    form,
    setForm,
    halls,
    loadingHalls,
    loadHallsForCinema,
    openAdd,
    openEdit,
    openDuplicate,
    openDelete,
    closeAll,
  };
};
