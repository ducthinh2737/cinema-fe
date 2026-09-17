import { useState, useCallback } from 'react';
import dayjs from 'dayjs';

export const useShowtimeFilters = (defaultCinemaId = 0) => {
  // Tabs: 'calendar' | 'table' | 'bulk'
  const [activeTab, setActiveTab] = useState<'calendar' | 'table' | 'bulk'>('calendar');

  // Filters state
  const [selectedMovieId, setSelectedMovieId] = useState<number | 'ALL'>('ALL');
  const [selectedCinemaId, setSelectedCinemaId] = useState<number | 'ALL'>('ALL');
  const [filterDate, setFilterDate] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchText, setSearchText] = useState('');

  // Table pagination
  const [page, setPage] = useState(1);

  // Calendar specific filter states
  const [calendarDate, setCalendarDate] = useState<string>(
    dayjs().tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD')
  );
  const [calendarCinemaId, setCalendarCinemaId] = useState<number>(defaultCinemaId);

  const resetFilters = useCallback(() => {
    setSelectedMovieId('ALL');
    setSelectedCinemaId('ALL');
    setFilterDate('');
    setFilterStatus('ALL');
    setSearchText('');
    setPage(1);
  }, []);

  return {
    activeTab,
    setActiveTab,
    selectedMovieId,
    setSelectedMovieId,
    selectedCinemaId,
    setSelectedCinemaId,
    filterDate,
    setFilterDate,
    filterStatus,
    setFilterStatus,
    searchText,
    setSearchText,
    page,
    setPage,
    calendarDate,
    setCalendarDate,
    calendarCinemaId,
    setCalendarCinemaId,
    resetFilters
  };
};
export type UseShowtimeFiltersResult = ReturnType<typeof useShowtimeFilters>;
