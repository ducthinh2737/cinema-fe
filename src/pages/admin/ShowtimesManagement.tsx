import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ConfigProvider, theme, Tooltip } from 'antd';
import { Calendar, Plus, List, Grid, FileSpreadsheet, RotateCcw, CalendarDays } from 'lucide-react';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

import { useToast } from '../../contexts/ToastContext';
import { useShowtimes } from '../../hooks/useShowtimes';
import { useShowtimeFilters } from '../../hooks/useShowtimeFilters';
import { useShowtimeModal } from '../../hooks/useShowtimeModal';
import { useDebounceSearch } from '../../hooks/useDebounceSearch';
import { showtimeService } from '../../services/showtimeService';
import type { MappedHall, DryRunShowtime } from '../../types/showtime';
import { parseShowtimeTime, calculateEndTime } from '../../domain/showtime/engine';

// Import modular components
import { StatsGrid } from '../../components/admin/showtimes/StatsGrid';
import { CalendarTab } from '../../components/admin/showtimes/CalendarTab';
import { TableTab } from '../../components/admin/showtimes/TableTab';
import { BulkTab } from '../../components/admin/showtimes/BulkTab';
import { ShowtimeFormModal } from '../../components/admin/showtimes/ShowtimeFormModal';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault('Asia/Ho_Chi_Minh');

const STATUS_STYLES: Record<string, { text: string }> = {
  UPCOMING: { text: 'Sắp chiếu' },
  SELLING: { text: 'Đang bán vé' },
  SCREENING: { text: 'Đang chiếu' },
  ENDED: { text: 'Đã kết thúc' },
  CANCELLED: { text: 'Đã hủy' }
};

export const ShowtimesManagement: React.FC = () => {
  const { showToast } = useToast();

  // Filters management Hook
  const filters = useShowtimeFilters();

  // Main Showtimes Core Hook
  const {
    allShowtimesList,
    loading,
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
    isSignalRConnected
  } = useShowtimes(filters.calendarCinemaId);

  // Single Modal Hook
  const modal = useShowtimeModal();

  // Calendar specific halls query (local to page flow)
  const [calendarHalls, setCalendarHalls] = useState<MappedHall[]>([]);
  const [loadingCalendarHalls, setLoadingCalendarHalls] = useState(false);

  // State to manage the dry-run showtimes in BulkTab
  const [dryRunShowtimes, setDryRunShowtimes] = useState<DryRunShowtime[]>([]);

  // =========================================================================
  // 💎 LIFTED STATES: Quản lý Đồng giá sự kiện (Price Override) tập trung tại Cha
  // =========================================================================
  const [flatPriceEnabled, setFlatPriceEnabled] = useState<boolean>(false);
  const [flatPrice, setFlatPrice] = useState<number | null>(45000);

  useEffect(() => {
    if (cinemas.length > 0) {
      if (!filters.calendarCinemaId) {
        filters.setCalendarCinemaId(cinemas[0].cinemaId);
      }
    }
  }, [cinemas, filters]);

  // Load calendar halls on calendar cinema change
  useEffect(() => {
    if (!filters.calendarCinemaId) return;
    const loadHalls = async () => {
      setLoadingCalendarHalls(true);
      try {
        const responseData = await showtimeService.getHalls(filters.calendarCinemaId);
        const mapped = responseData.map((h: any) => {
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
        setCalendarHalls(mapped);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingCalendarHalls(false);
      }
    };
    loadHalls();
  }, [filters.calendarCinemaId]);

  // Debounced search term
  const debouncedSearchText = useDebounceSearch(filters.searchText, 300);

  // Filtered list for Table view
  const filteredTableList = useMemo(() => {
    return allShowtimesList.filter(st => {
      const matchSearch = st.movie?.title.toLowerCase().includes(debouncedSearchText.toLowerCase()) || false;
      const matchMovie = filters.selectedMovieId === 'ALL' || st.movieId === filters.selectedMovieId;
      const matchCinema = filters.selectedCinemaId === 'ALL' || st.cinemaId === filters.selectedCinemaId;
      const matchStatus = filters.filterStatus === 'ALL' || getShowtimeStatus(st) === filters.filterStatus;
      const matchDate = !filters.filterDate || parseShowtimeTime(st.startTime).format('YYYY-MM-DD') === filters.filterDate;

      return matchSearch && matchMovie && matchCinema && matchStatus && matchDate;
    });
  }, [allShowtimesList, debouncedSearchText, filters.selectedMovieId, filters.selectedCinemaId, filters.filterStatus, filters.filterDate, getShowtimeStatus]);

  // Filtered list for Calendar/Timeline view
  const filteredCalendarList = useMemo(() => {
    return allShowtimesList.filter(st => {
      return filters.filterStatus === 'ALL' || getShowtimeStatus(st) === filters.filterStatus;
    });
  }, [allShowtimesList, filters.filterStatus, getShowtimeStatus]);

  // Form calculations for single showtime modal popup
  const formCalculations = useMemo(() => {
    const movie = movies.find(m => m.movieId === modal.form.movieId);
    if (!movie || !modal.form.startTime) return null;

    const { endTimeStr, totalEndTimeStr } = calculateEndTime(modal.form.startTime, movie.duration, 15);
    const conflictError = checkConflict(modal.form.movieId, modal.form.hallId, modal.form.startTime, modal.selectedShowtime?.showtimeId);

    return {
      duration: movie.duration,
      ads: 0,
      cleaning: 15,
      total: movie.duration + 15,
      endTime: endTimeStr,
      totalEndTime: totalEndTimeStr,
      conflictError,
    };
  }, [modal.form.movieId, modal.form.hallId, modal.form.startTime, modal.selectedShowtime, checkConflict, movies]);

  // Actions
  const handleOpenAddClick = useCallback((hallId?: number, timeStr?: string) => {
    const defaultMovieId = movies[0]?.movieId || 0;
    const defaultCinemaId = cinemas[0]?.cinemaId || 0;
    const defaultPriceId = dbPrices[0]?.priceId || 1;

    modal.openAdd(defaultMovieId, defaultCinemaId, defaultPriceId);

    // If pre-filled parameters (e.g. from clicking time slot in timeline grid)
    if (hallId || timeStr) {
      setTimeout(() => {
        modal.setForm(prev => ({
          ...prev,
          ...(hallId ? { hallId } : {}),
          ...(timeStr ? { startTime: timeStr } : {})
        }));
        if (hallId && defaultCinemaId) {
          modal.loadHallsForCinema(defaultCinemaId, hallId);
        }
      }, 50);
    }
  }, [movies, cinemas, dbPrices, modal]);

  const handleSingleSave = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modal.form.hallId) {
      showToast('Vui lòng chọn phòng chiếu.', 'error');
      return;
    }

    const conflict = checkConflict(modal.form.movieId, modal.form.hallId, modal.form.startTime, modal.selectedShowtime?.showtimeId);
    if (conflict) {
      showToast(conflict, 'error');
      return;
    }

    modal.setSaving(true);
    try {
      const payload = {
        movieId: modal.form.movieId,
        hallId: modal.form.hallId,
        priceId: modal.form.priceId,
        startTime: dayjs.tz(modal.form.startTime, "Asia/Ho_Chi_Minh").toISOString()
      };

      if (modal.selectedShowtime) {
        await showtimeService.updateShowtime(modal.selectedShowtime.showtimeId, payload);
        showToast('Suất chiếu đã được cập nhật thành công.', 'success');
      } else {
        await showtimeService.createShowtime(payload);
        showToast('Tạo suất chiếu mới thành công.', 'success');
      }
      modal.closeAll();
      fetchShowtimes();
    } catch (error: any) {
      handleApiError(error, 'Không thể lưu suất chiếu');
    } finally {
      modal.setSaving(false);
    }
  }, [modal, checkConflict, fetchShowtimes, handleApiError, showToast]);

  const handleSingleDelete = useCallback(async (id: number) => {
    try {
      await showtimeService.deleteShowtime(id);
      showToast('Đã hủy suất chiếu thành công.', 'success');
      fetchShowtimes();
    } catch (error) {
      handleApiError(error, 'Lỗi khi hủy suất chiếu');
    }
  }, [fetchShowtimes, handleApiError, showToast]);

  const handleBulkCreateWithSelection = useCallback(async (
    selectedItems: DryRunShowtime[],
    savingSetter: (val: boolean) => void
  ) => {
    if (selectedItems.length === 0) {
      showToast('Vui lòng chọn ít nhất một suất chiếu từ danh sách xem trước.', 'warning');
      return false;
    }

    savingSetter(true);
    try {
      // Group selected items by both movieId and hallId
      const itemsByKey = new Map<string, { movieId: number, hallId: number, items: DryRunShowtime[] }>();
      selectedItems.forEach(item => {
        const mId = item.movieId || 0;
        const key = `${mId}-${item.hallId}`;
        if (!itemsByKey.has(key)) {
          itemsByKey.set(key, { movieId: mId, hallId: item.hallId, items: [] });
        }
        itemsByKey.get(key)!.items.push(item);
      });

      const responses = await Promise.all(
        Array.from(itemsByKey.values()).map(async ({ movieId, hallId, items }) => {
          const uniqueDates = Array.from(new Set(items.map(item => item.date)));
          const uniqueTimeSlots = Array.from(new Set(items.map(item => item.time)));

          const bulkPayload = {
            movieId: movieId,
            hallId: hallId,
            priceId: bulkPriceId,
            dates: uniqueDates.map(d => dayjs.tz(d, "Asia/Ho_Chi_Minh").startOf('day').toISOString()),
            timeSlots: uniqueTimeSlots,
            flatPriceEnabled: flatPriceEnabled,
            flatPrice: flatPriceEnabled ? flatPrice : null
          };

          try {
            return await showtimeService.createBulkShowtimes(bulkPayload);
          } catch (err: any) {
            const movieTitle = items[0]?.movieTitle || `Phim ID ${movieId}`;
            const hallName = items[0]?.hallName || `Phòng ID ${hallId}`;
            const errMsg = err?.response?.data?.message || err?.message || 'Lỗi không xác định';
            return { isSuccess: false, message: `${movieTitle} (${hallName}): ${errMsg}`, data: '' };
          }
        })
      );

      const failedResponses = responses.filter(r => !r.isSuccess);

      if (failedResponses.length === 0) {
        showToast('Lên lịch hàng loạt thành công cho tất cả phòng chiếu đã chọn.', 'success');
        setIsBulkDryRun(false);
        fetchShowtimes();
        filters.setActiveTab('calendar');
        return true;
      } else if (failedResponses.length === responses.length) {
        const firstError = failedResponses[0].message;
        showToast(`Tạo suất chiếu hàng loạt thất bại: ${firstError}`, 'error');
      } else {
        const errDetails = failedResponses.map(r => r.message).join(', ');
        showToast(`Đã tạo một số suất chiếu thành công, nhưng có lỗi xảy ra ở một số phòng: ${errDetails}`, 'warning');
        setIsBulkDryRun(false);
        fetchShowtimes();
        filters.setActiveTab('calendar');
        return true;
      }
    } catch (err: any) {
      console.error('Bulk generation failed:', err);
      const errMsg = err?.response?.data?.message || err?.message || 'Có lỗi xảy ra khi xử lý lịch chiếu hàng loạt.';
      showToast(errMsg, 'error');
    } finally {
      savingSetter(false);
    }
    return false;
  }, [bulkMovieIds, bulkPriceId, bulkSelectedHalls, flatPriceEnabled, flatPrice, showToast, fetchShowtimes, filters, setIsBulkDryRun]);

  // Export to Excel / CSV
  const handleExportCSV = useCallback(() => {
    const headers = ['Mã Suất', 'Tên Phim', 'Thời Lượng', 'Rạp Chiếu', 'Phòng Chiếu', 'Giờ Bắt Đầu', 'Giờ Kết Thúc', 'Giá Vé Nền (Cơ sở)', 'Ghế Trống', 'Trạng Thái'];
    const rows = filteredTableList.map(st => {
      const start = parseShowtimeTime(st.startTime);
      const movieObj = movies.find(m => m.movieId === st.movieId);
      const duration = movieObj?.duration || st.movie?.duration || 120;
      const end = start.add(duration, 'minute');
      const price = dbPrices.find(p => p.priceId === st.priceId)?.value || st.priceValue || 80000;
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
  }, [filteredTableList, movies, dbPrices, getShowtimeStatus, showToast]);

  return (
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: '#FF2D2D',
          colorBgBase: '#05070F',
          colorBgContainer: '#0D111C',
          borderRadius: 16,
          colorBorder: 'rgba(255, 255, 255, 0.05)',
        },
        components: {
          Table: {
            headerBg: 'rgba(255, 255, 255, 0.02)',
            headerColor: '#9CA3AF',
            rowHoverBg: 'rgba(255, 255, 255, 0.01)',
          },
          Modal: {
            contentBg: '#0E1322',
            headerBg: '#0E1322',
          }
        }
      }}
    >
      <div className="flex flex-col gap-5 text-gray-200">
        {/* Header Title */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex flex-col gap-0.5 text-left">
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <span className="h-7 w-7 rounded-lg bg-[#FF2D2D]/15 border border-[#FF2D2D]/30 flex items-center justify-center shrink-0">
                <Calendar size={15} className="text-[#FF2D2D]" />
              </span>
              Quản Lý Lịch Chiếu
              {isSignalRConnected && (
                <Tooltip title="Đang kết nối Real-time">
                  <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse ml-1" />
                </Tooltip>
              )}
            </h2>
            <span className="text-xs text-gray-500 pl-9">Phân bổ phòng chiếu &amp; quản trị suất chiếu CinemaPass</span>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => { filters.setActiveTab('bulk'); setIsBulkDryRun(false); }}
              className="flex items-center gap-1.5 border border-white/10 text-xs font-semibold hover:bg-white/5 cursor-pointer bg-[#0D111C]/40 text-[#FFD54A] px-4 py-2 rounded-xl transition-all"
            >
              <CalendarDays size={14} /> Tạo hàng loạt
            </button>
            <button
              onClick={() => handleOpenAddClick()}
              className="flex items-center gap-1.5 shadow-[0_0_12px_rgba(255,45,45,0.35)] text-xs font-semibold cursor-pointer bg-[#FF2D2D] hover:bg-[#ff4444] text-white px-4 py-2 rounded-xl transition-all"
            >
              <Plus size={14} /> Thêm suất chiếu
            </button>
          </div>
        </div>

        {/* Stats Cards Section */}
        <StatsGrid stats={stats} />

        {/* Tabs Selector & Toolbar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-white/5 pb-3">
          <div className="flex bg-[#0D111C]/80 border border-white/5 p-1 rounded-xl">
            {([
              { key: 'calendar', icon: <Grid size={13} />, label: 'Sơ đồ' },
              { key: 'table', icon: <List size={13} />, label: 'Danh sách' },
              { key: 'bulk', icon: <CalendarDays size={13} />, label: 'Tạo hàng loạt' },
            ] as const).map(tab => (
              <button
                key={tab.key}
                onClick={() => filters.setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${filters.activeTab === tab.key
                  ? 'bg-[#FF2D2D] text-white shadow-md'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 text-xs px-3 py-2 border border-white/8 bg-white/5 hover:bg-white/10 text-gray-300 font-semibold rounded-lg cursor-pointer transition-colors"
            >
              <FileSpreadsheet size={13} className="text-green-500" /> Xuất CSV
            </button>
            <button
              onClick={filters.resetFilters}
              className="flex items-center gap-1.5 text-xs px-3 py-2 border border-white/8 bg-white/5 hover:bg-white/10 text-gray-300 font-semibold rounded-lg cursor-pointer transition-colors"
            >
              <RotateCcw size={13} /> Bộ lọc
            </button>
          </div>
        </div>

        {/* Render Tabs Content */}
        <AnimatePresence mode="wait">
          {filters.activeTab === 'calendar' && (
            <motion.div
              key="calendar-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <CalendarTab
                calendarDate={filters.calendarDate}
                setCalendarDate={filters.setCalendarDate}
                calendarCinemaId={filters.calendarCinemaId}
                setCalendarCinemaId={filters.setCalendarCinemaId}
                cinemas={cinemas}
                movies={movies}
                allShowtimesList={filteredCalendarList}
                loadingCalendarHalls={loadingCalendarHalls}
                calendarHalls={calendarHalls}
                onOpenAddClick={handleOpenAddClick}
                filterStatus={filters.filterStatus}
                setFilterStatus={filters.setFilterStatus}
              />
            </motion.div>
          )}

          {filters.activeTab === 'table' && (
            <motion.div
              key="table-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <TableTab
                filteredTableList={filteredTableList}
                dbPrices={dbPrices}
                loading={loading}
                movies={movies}
                cinemas={cinemas}
                selectedMovieId={filters.selectedMovieId}
                setSelectedMovieId={filters.setSelectedMovieId}
                selectedCinemaId={filters.selectedCinemaId}
                setSelectedCinemaId={filters.setSelectedCinemaId}
                filterDate={filters.filterDate}
                setFilterDate={filters.setFilterDate}
                filterStatus={filters.filterStatus}
                setFilterStatus={filters.setFilterStatus}
                searchText={filters.searchText}
                setSearchText={filters.setSearchText}
                page={filters.page}
                setPage={filters.setPage}
                getShowtimeStatus={getShowtimeStatus}
                onDuplicate={modal.openDuplicate}
                onEdit={modal.openEdit}
                onDelete={handleSingleDelete}
              />
            </motion.div>
          )}

          {filters.activeTab === 'bulk' && (
            <motion.div
              key="bulk-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <BulkTab
                movies={movies}
                cinemas={cinemas}
                dbPrices={dbPrices}
                showtimesList={allShowtimesList}
                bulkMovieIds={bulkMovieIds}
                setBulkMovieIds={setBulkMovieIds}
                bulkMovieWeights={bulkMovieWeights}
                setBulkMovieWeights={setBulkMovieWeights}
                bulkOptimizePrimeTime={bulkOptimizePrimeTime}
                setBulkOptimizePrimeTime={setBulkOptimizePrimeTime}
                bulkCinemaId={bulkCinemaId}
                setBulkCinemaId={setBulkCinemaId}
                bulkSelectedHalls={bulkSelectedHalls}
                setBulkSelectedHalls={setBulkSelectedHalls}
                bulkSelectedDates={bulkSelectedDates}
                setBulkSelectedDates={setBulkSelectedDates}
                bulkTimeSlots={bulkTimeSlots}
                setBulkTimeSlots={setBulkTimeSlots}
                bulkHallsList={bulkHallsList}
                bulkLoadingHalls={bulkLoadingHalls}
                bulkStaggerMinutes={bulkStaggerMinutes}
                setBulkStaggerMinutes={setBulkStaggerMinutes}
                bulkPriceId={bulkPriceId}
                setBulkPriceId={setBulkPriceId}
                isBulkDryRun={isBulkDryRun}
                setIsBulkDryRun={setIsBulkDryRun}
                bulkMode={bulkMode}
                setBulkMode={setBulkMode}
                dryRunShowtimes={dryRunShowtimes}
                setDryRunShowtimes={setDryRunShowtimes}
                saving={loading}
                onBulkCreateWithSelection={handleBulkCreateWithSelection}
                flatPriceEnabled={flatPriceEnabled}
                setFlatPriceEnabled={setFlatPriceEnabled}
                flatPrice={flatPrice}
                setFlatPrice={setFlatPrice}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Form Modal (Create & Edit) */}
        <ShowtimeFormModal
          isOpen={modal.isOpen}
          selectedShowtime={modal.selectedShowtime}
          form={modal.form}
          setForm={modal.setForm}
          movies={movies}
          cinemas={cinemas}
          halls={modal.halls}
          dbPrices={dbPrices}
          loadingHalls={modal.loadingHalls}
          saving={modal.saving}
          onCancel={modal.closeAll}
          onSubmit={handleSingleSave}
          formCalculations={formCalculations}
          loadHallsForCinema={modal.loadHallsForCinema}
        />
      </div>
    </ConfigProvider>
  );
};