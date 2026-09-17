import React from 'react';
import { Loader2 } from 'lucide-react';
import type { ApiShowtime, NormalizedMovie, MappedHall } from '../../../types/showtime';
import type { Cinema } from '../../../types';
import { TimelineGrid } from './TimelineGrid';

interface CalendarTabProps {
  calendarDate: string;
  setCalendarDate: (date: string) => void;
  calendarCinemaId: number;
  setCalendarCinemaId: (id: number) => void;
  cinemas: Cinema[];
  movies: NormalizedMovie[];
  allShowtimesList: ApiShowtime[];
  loadingCalendarHalls: boolean;
  calendarHalls: MappedHall[];
  onOpenAddClick: (hallId?: number, timeStr?: string) => void;
  filterStatus: string;
  setFilterStatus: (status: string) => void;
}

const STATUS_COLORS = [
  { color: '#3B82F6', label: 'Sắp chiếu', key: 'UPCOMING' },
  { color: '#10B981', label: 'Đang bán', key: 'SELLING' },
  { color: '#F59E0B', label: 'Đang chiếu', key: 'SCREENING' },
  { color: '#6B7280', label: 'Kết thúc', key: 'ENDED' },
  { color: '#EF4444', label: 'Đã hủy', key: 'CANCELLED' },
];

export const CalendarTab: React.FC<CalendarTabProps> = React.memo(({
  calendarDate,
  setCalendarDate,
  calendarCinemaId,
  setCalendarCinemaId,
  cinemas,
  movies,
  allShowtimesList,
  loadingCalendarHalls,
  calendarHalls,
  onOpenAddClick,
  filterStatus,
  setFilterStatus
}) => {
  const handleTimeSlotClick = (hallId: number, hour: number, minute: number) => {
    // Format to YYYY-MM-DDTHH:mm for datetime-local input prefill
    const timeStr = `${calendarDate}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    onOpenAddClick(hallId, timeStr);
  };

  return (
    <div className="flex flex-col gap-4 text-left">
      {/* Filters Toolbar */}
      <div className="bg-[#0D111C]/40 border border-white/5 p-3 rounded-2xl flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-400 shrink-0">Ngày chiếu:</span>
          <input
            type="date"
            value={calendarDate}
            onChange={(e) => setCalendarDate(e.target.value)}
            className="bg-[#05070F] border border-white/10 rounded-lg px-3 py-1.5 text-sm font-semibold text-white focus:outline-none focus:border-[#FF2D2D] cursor-pointer"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-400 shrink-0">Rạp chiếu:</span>
          <select
            value={calendarCinemaId}
            onChange={(e) => setCalendarCinemaId(parseInt(e.target.value) || 0)}
            className="bg-[#05070F] border border-white/10 rounded-lg px-3 py-1.5 text-sm font-semibold text-white focus:outline-none focus:border-[#FF2D2D] cursor-pointer"
          >
            {cinemas.map(c => (
              <option key={c.cinemaId} value={c.cinemaId}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap gap-2 ml-auto items-center">
          <span className="text-[10px] text-gray-500 mr-1 font-semibold uppercase tracking-wider">Lọc trạng thái:</span>
          <button
            onClick={() => setFilterStatus('ALL')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
              filterStatus === 'ALL'
                ? 'bg-white/10 border-white/20 text-white'
                : 'bg-transparent border-transparent text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            Tất cả
          </button>
          {STATUS_COLORS.map(s => {
            const isActive = filterStatus === s.key;
            return (
              <button
                key={s.key}
                onClick={() => setFilterStatus(s.key)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer ${
                  isActive
                    ? 'text-white'
                    : 'bg-transparent border-transparent text-gray-400 hover:text-white hover:bg-white/5'
                }`}
                style={{
                  backgroundColor: isActive ? `${s.color}15` : undefined,
                  borderColor: isActive ? s.color : undefined,
                }}
              >
                <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Visual Gantt timeline grid */}
      {loadingCalendarHalls ? (
        <div className="bg-[#0D111C]/60 border border-white/5 rounded-2xl py-16 flex flex-col justify-center items-center text-xs gap-3 text-gray-500 font-bold shadow-xl">
          <Loader2 size={24} className="animate-spin text-[#FF2D2D]" />
          <span>Đang tải sơ đồ phòng chiếu...</span>
        </div>
      ) : calendarHalls.length === 0 ? (
        <div className="bg-[#0D111C]/60 border border-white/5 rounded-2xl py-16 text-center text-xs text-gray-500 font-bold shadow-xl">
          Rạp chiếu này hiện tại chưa được cấu hình phòng chiếu nào.
        </div>
      ) : (
        <TimelineGrid
          hallList={calendarHalls}
          dateStr={calendarDate}
          showtimesList={allShowtimesList}
          movies={movies}
          onTimeSlotClick={handleTimeSlotClick}
        />
      )}
    </div>
  );
});

CalendarTab.displayName = 'CalendarTab';
