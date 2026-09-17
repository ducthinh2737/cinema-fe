import { useState, useMemo, useCallback } from 'react';
import type { Key } from 'react';
import type { ApiShowtime, ApiPrice, NormalizedMovie, MappedHall, DryRunShowtime } from '../../../../../types/showtime';
import type { Cinema } from '../../../../../types';
import { generateAutoSchedule, getUpcomingDates } from '../../../../../domain/showtime/engine';
import { useToast } from '../../../../../contexts/ToastContext';

export interface UseBulkTabStateProps {
  movies: NormalizedMovie[];
  cinemas: Cinema[];
  dbPrices: ApiPrice[];
  showtimesList: ApiShowtime[];
  bulkMovieIds: number[];
  setBulkMovieIds: React.Dispatch<React.SetStateAction<number[]>>;
  bulkMovieWeights: Record<number, number>;
  setBulkMovieWeights: React.Dispatch<React.SetStateAction<Record<number, number>>>;
  bulkOptimizePrimeTime: boolean;
  bulkStaggerMinutes: number;
  setBulkStaggerMinutes: (val: number) => void;
  bulkCinemaId: number;
  setBulkCinemaId: (id: number) => void;
  bulkSelectedHalls: number[];
  setBulkSelectedHalls: React.Dispatch<React.SetStateAction<number[]>>;
  bulkSelectedDates: string[];
  setBulkSelectedDates: React.Dispatch<React.SetStateAction<string[]>>;
  bulkTimeSlots: string[];
  setBulkTimeSlots: React.Dispatch<React.SetStateAction<string[]>>;
  bulkHallsList: MappedHall[];
  bulkLoadingHalls: boolean;
  bulkPriceId: number;
  setBulkPriceId: (id: number) => void;
  isBulkDryRun: boolean;
  setIsBulkDryRun: (val: boolean) => void;
  bulkMode: 'Manual' | 'Auto';
  setBulkMode: (mode: 'Manual' | 'Auto') => void;
  dryRunShowtimes: DryRunShowtime[];
  setDryRunShowtimes: React.Dispatch<React.SetStateAction<DryRunShowtime[]>>;
  saving: boolean;
  onBulkCreateWithSelection: (selectedItems: DryRunShowtime[], savingSetter: (val: boolean) => void) => Promise<boolean>;
}

/**
 * Pure helper for ticket type translation
 */
export const formatTicketType = (ticketTypeStr: string): string => {
  if (!ticketTypeStr) return 'Vé thường';
  if (ticketTypeStr.trim().startsWith('{')) {
    try {
      const obj = JSON.parse(ticketTypeStr);
      const seatMap: Record<string, string> = { Standard: 'Thường', VIP: 'VIP', Couple: 'Đôi', Sweetbox: 'Sweetbox' };
      const roomMap: Record<string, string> = { '2D': '2D', '3D': '3D', IMAX: 'IMAX' };
      const dayMap: Record<string, string> = { Weekday: 'Ngày thường', Weekend: 'Cuối tuần', Holiday: 'Ngày lễ' };
      const slotMap: Record<string, string> = { Morning: 'Sáng', Afternoon: 'Chiều', Evening: 'Tối' };

      const seat = seatMap[obj.seatType] || obj.seatType || '';
      const room = roomMap[obj.roomType] || obj.roomType || '';
      const day = dayMap[obj.dayType] || obj.dayType || '';
      const slot = slotMap[obj.timeSlot] || obj.timeSlot || '';

      return [seat, room, day, slot].filter(Boolean).join(' - ') || 'Vé thường';
    } catch (e) {
      console.warn(e);
    }
  }
  const legacyMap: Record<string, string> = {
    'Standard Weekday': 'Thường - Ngày thường',
    'VIP Weekday': 'VIP - Ngày thường',
    'Standard Weekend': 'Thường - Cuối tuần',
    'VIP Weekend': 'VIP - Cuối tuần',
  };
  return legacyMap[ticketTypeStr] || ticketTypeStr;
};

export const useBulkTabState = (props: UseBulkTabStateProps) => {
  const {
    movies,
    cinemas,
    dbPrices,
    showtimesList,
    bulkMovieIds,
    bulkMovieWeights,
    bulkOptimizePrimeTime,
    bulkStaggerMinutes,
    bulkCinemaId,
    bulkSelectedHalls,
    bulkSelectedDates,
    bulkTimeSlots,
    setBulkTimeSlots,
    bulkHallsList,
    bulkPriceId,
    setIsBulkDryRun,
    bulkMode,
    dryRunShowtimes,
    setDryRunShowtimes,
    onBulkCreateWithSelection
  } = props;

  const { showToast } = useToast();

  // Local UI States
  const [bulkSaving, setBulkSaving] = useState(false);
  const [autoStartHour, setAutoStartHour] = useState<number | ''>(8);
  const [bufferMinutes, setBufferMinutes] = useState<number>(15);
  const [customTimeInput, setCustomTimeInput] = useState<string>('');
  const [activePreviewDate, setActivePreviewDate] = useState<string>('');
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([]);

  // 1. Memoized Maps for O(1) performance lookup
  const moviesMap = useMemo(() => {
    return new Map<number, NormalizedMovie>(movies.map(m => [m.movieId, m]));
  }, [movies]);

  const pricesMap = useMemo(() => {
    return new Map<number, ApiPrice>(dbPrices.map(p => [p.priceId, p]));
  }, [dbPrices]);

  // Generate date list with zero direct dayjs dependency in component
  const upcomingDates = useMemo(() => getUpcomingDates(7), []);

  // 2. State derivation from business logic state
  const validCount = useMemo(() => {
    return dryRunShowtimes.filter(d => d.isValid).length;
  }, [dryRunShowtimes]);

  const invalidCount = useMemo(() => {
    return dryRunShowtimes.filter(d => !d.isValid).length;
  }, [dryRunShowtimes]);

  const memoizedDataSource = useMemo(() => {
    return dryRunShowtimes.map((item, idx) => ({ ...item, key: idx }));
  }, [dryRunShowtimes]);

  const selectedItems = useMemo(() => {
    return dryRunShowtimes.filter((_, idx) => selectedRowKeys.includes(idx));
  }, [dryRunShowtimes, selectedRowKeys]);

  // 3. Stable Handlers
  const handlePreviewSchedule = useCallback(() => {
    if (!bulkMovieIds || bulkMovieIds.length === 0) {
      showToast('Vui lòng chọn ít nhất một bộ phim để lên lịch.', 'error');
      return;
    }
    if (bulkSelectedHalls.length === 0) {
      showToast('Vui lòng chọn ít nhất một phòng chiếu.', 'error');
      return;
    }
    if (bulkSelectedDates.length === 0) {
      showToast('Vui lòng chọn ít nhất một ngày chiếu.', 'error');
      return;
    }


    const selectedCinema = cinemas.find(c => c.cinemaId === bulkCinemaId);

    const proposed = generateAutoSchedule({
      mode: bulkMode,
      movieIds: bulkMovieIds,
      movieWeights: bulkMovieWeights,
      optimizePrimeTime: bulkOptimizePrimeTime,
      hallIds: bulkSelectedHalls,
      priceId: bulkPriceId,
      dates: bulkSelectedDates,
      timeSlots: bulkTimeSlots,
      autoStartHour: autoStartHour === '' ? 8 : autoStartHour,
      autoEndHour: 24,
      bufferMinutes,
      staggerMinutes: bulkStaggerMinutes,
      existingShowtimes: showtimesList,
      movies,
      hallsList: bulkHallsList,
      cinemaOpeningTime: selectedCinema?.openingTime,
      cinemaClosingTime: selectedCinema?.closingTime
    });

    if (proposed.length === 0) {
      showToast('Không tạo được suất chiếu nào phù hợp với thiết lập.', 'warning');
      return;
    }

    setDryRunShowtimes(proposed);
    setIsBulkDryRun(true);
    setActivePreviewDate(bulkSelectedDates[0]);

    // Select valid items by default
    const validKeys = proposed
      .map((item: DryRunShowtime, idx: number) => (item.isValid ? idx : null))
      .filter((idx: number | null): idx is number => idx !== null);
    setSelectedRowKeys(validKeys);
  }, [
    bulkMovieIds,
    bulkMovieWeights,
    bulkOptimizePrimeTime,
    bulkStaggerMinutes,
    bulkCinemaId,
    cinemas,
    bulkSelectedHalls,
    bulkSelectedDates,
    bulkMode,
    bulkTimeSlots,
    bulkPriceId,
    autoStartHour,
    bufferMinutes,
    showtimesList,
    movies,
    bulkHallsList,
    setDryRunShowtimes,
    setIsBulkDryRun,
    showToast
  ]);

  const handleAddCustomTime = useCallback(() => {
    if (!customTimeInput) return;
    if (!/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(customTimeInput)) {
      showToast('Định dạng giờ không hợp lệ. Ví dụ: 09:15, 18:30', 'error');
      return;
    }

    if (bulkTimeSlots.includes(customTimeInput)) {
      showToast('Giờ chiếu này đã tồn tại.', 'warning');
      return;
    }

    setIsBulkDryRun(false);
    setBulkTimeSlots(prev => [...prev, customTimeInput].sort());
    setCustomTimeInput('');
    showToast(`Đã thêm giờ chiếu ${customTimeInput}`, 'success');
  }, [customTimeInput, bulkTimeSlots, setBulkTimeSlots, setIsBulkDryRun, showToast]);

  const handleRemoveTimeSlot = useCallback((time: string) => {
    setIsBulkDryRun(false);
    setBulkTimeSlots(prev => prev.filter(t => t !== time));
  }, [setBulkTimeSlots, setIsBulkDryRun]);

  const handleConfirmCreate = useCallback(() => {
    if (selectedItems.length === 0) {
      showToast('Vui lòng chọn ít nhất một suất chiếu hợp lệ để tạo.', 'error');
      return;
    }

    const hasConflicts = selectedItems.some(item => !item.isValid);
    if (hasConflicts) {
      showToast('Danh sách được chọn chứa suất chiếu bị trùng lịch. Vui lòng bỏ chọn các suất chiếu đó.', 'warning');
      return;
    }

    onBulkCreateWithSelection(selectedItems, setBulkSaving);
  }, [selectedItems, onBulkCreateWithSelection, showToast]);

  const handleRowSelectionChange = useCallback((keys: Key[]) => {
    setSelectedRowKeys(keys);
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedRowKeys(
      dryRunShowtimes
        .map((d, i) => (d.isValid ? i : null))
        .filter((i): i is number => i !== null)
    );
  }, [dryRunShowtimes]);

  const handleClearAll = useCallback(() => {
    setSelectedRowKeys([]);
  }, []);

  const handleSelectValid = useCallback(() => {
    setSelectedRowKeys(
      dryRunShowtimes
        .map((d, i) => (d.isValid ? i : null))
        .filter((i): i is number => i !== null)
    );
  }, [dryRunShowtimes]);

  return {
    bulkSaving,
    autoStartHour,
    setAutoStartHour,
    bufferMinutes,
    setBufferMinutes,
    customTimeInput,
    setCustomTimeInput,
    activePreviewDate,
    setActivePreviewDate,
    selectedRowKeys,
    setSelectedRowKeys,
    moviesMap,
    pricesMap,
    upcomingDates,
    validCount,
    invalidCount,
    memoizedDataSource,
    selectedItems,
    handlePreviewSchedule,
    handleAddCustomTime,
    handleRemoveTimeSlot,
    handleConfirmCreate,
    handleRowSelectionChange,
    handleSelectAll,
    handleClearAll,
    handleSelectValid
  };
};
