import React, { useMemo } from 'react';
import type { Key } from 'react';
import { Table, Tooltip } from 'antd';
import { Check, AlertTriangle, Loader2, BarChart3, Clock, Clapperboard, DoorOpen } from 'lucide-react';
import type { ApiShowtime, NormalizedMovie, MappedHall, DryRunShowtime } from '../../../../../types/showtime';
import { TimelineGrid } from '../../TimelineGrid';
import { formatLocalDate } from '../../../../../domain/showtime/engine';

export interface BulkPreviewPanelProps {
  dryRunShowtimes: DryRunShowtime[];
  memoizedDataSource: Array<DryRunShowtime & { key: number }>;
  validCount: number;
  invalidCount: number;
  selectedRowKeys: Key[];
  bulkSelectedDates: string[];
  activePreviewDate: string;
  setActivePreviewDate: (val: string) => void;
  bulkHallsList: MappedHall[];
  showtimesList: ApiShowtime[];
  movies: NormalizedMovie[];
  moviesMap: Map<number, NormalizedMovie>;
  saving: boolean;
  bulkSaving: boolean;
  setIsBulkDryRun: (val: boolean) => void;
  handleConfirmCreate: () => void;
  handleRowSelectionChange: (keys: Key[]) => void;
  handleSelectAll: () => void;
  handleClearAll: () => void;
  handleSelectValid: () => void;
}

export const BulkPreviewPanel: React.FC<BulkPreviewPanelProps> = React.memo(({
  dryRunShowtimes,
  memoizedDataSource,
  validCount,
  invalidCount,
  selectedRowKeys,
  bulkSelectedDates,
  activePreviewDate,
  setActivePreviewDate,
  bulkHallsList,
  showtimesList,
  movies,
  moviesMap,
  saving,
  bulkSaving,
  setIsBulkDryRun,
  handleConfirmCreate,
  handleRowSelectionChange,
  handleSelectAll,
  handleClearAll,
  handleSelectValid
}) => {

  const previewColumns = useMemo(() => {
    return [
      {
        title: 'Phòng chiếu',
        dataIndex: 'hallName',
        key: 'hallName',
        render: (text: string) => <span className="font-semibold text-gray-200">{text}</span>
      },
      {
        title: 'Phim',
        dataIndex: 'movieTitle',
        key: 'movieTitle',
        render: (text: string) => <span className="font-semibold text-gray-200">{text}</span>
      },
      {
        title: 'Ngày chiếu',
        dataIndex: 'date',
        key: 'date',
        render: (text: string) => <span className="font-mono text-gray-300">{formatLocalDate(text, 'DD/MM/YYYY')}</span>
      },
      {
        title: 'Giờ bắt đầu',
        dataIndex: 'time',
        key: 'time',
        render: (text: string) => <span className="font-bold text-[#FFD54A] font-mono">{text}</span>
      },
      {
        title: 'Thời lượng',
        key: 'duration',
        render: (record: DryRunShowtime) => {
          const movieObj = moviesMap.get(record.movieId || 0);
          return <span className="text-gray-400 font-mono">{movieObj?.duration ?? 120}p</span>;
        }
      },
      {
        title: 'Trạng thái',
        key: 'status',
        render: (record: DryRunShowtime) => {
          return record.isValid ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-green-400 bg-green-500/10 border border-green-500/25 px-2 py-0.5 rounded-full">
              <Check size={10} /> Hợp lệ
            </span>
          ) : (
            <Tooltip title={record.conflict}>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-400 bg-red-500/10 border border-red-500/25 px-2 py-0.5 rounded-full cursor-help">
                <AlertTriangle size={10} /> Trùng lịch
              </span>
            </Tooltip>
          );
        }
      }
    ];
  }, [moviesMap]);

  const rowSelection = useMemo(() => {
    return {
      type: 'checkbox' as const,
      selectedRowKeys,
      onChange: handleRowSelectionChange,
      getCheckboxProps: (record: DryRunShowtime) => ({
        disabled: !record.isValid,
        name: record.movieTitle,
      }),
    };
  }, [selectedRowKeys, handleRowSelectionChange]);

  const stats = useMemo(() => {
    const selectedShowtimes = dryRunShowtimes.filter((_, idx) => selectedRowKeys.includes(idx));
    const total = selectedShowtimes.length;

    const movieCount: Record<number, number> = {};
    const hallCount: Record<number, number> = {};
    let totalMinutes = 0;

    selectedShowtimes.forEach(st => {
      const mId = st.movieId || 0;
      movieCount[mId] = (movieCount[mId] || 0) + 1;

      const hId = st.hallId;
      hallCount[hId] = (hallCount[hId] || 0) + 1;

      const movieObj = moviesMap.get(mId);
      totalMinutes += movieObj?.duration ?? 120;
    });

    const moviesList = movies
      .filter(m => movieCount[m.movieId] > 0)
      .map(m => ({
        movieId: m.movieId,
        title: m.title,
        count: movieCount[m.movieId],
        percentage: total > 0 ? Math.round((movieCount[m.movieId] / total) * 100) : 0
      }))
      .sort((a, b) => b.count - a.count);

    const hallsList = bulkHallsList
      .filter(h => hallCount[h.hallId] > 0)
      .map(h => ({
        hallId: h.hallId,
        name: h.name,
        count: hallCount[h.hallId],
        percentage: total > 0 ? Math.round((hallCount[h.hallId] / total) * 100) : 0
      }))
      .sort((a, b) => b.count - a.count);

    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    const durationText = hours > 0 ? `${hours} giờ ${mins} phút` : `${mins} phút`;

    return {
      total,
      moviesList,
      hallsList,
      durationText
    };
  }, [dryRunShowtimes, selectedRowKeys, movies, bulkHallsList, moviesMap]);

  const isSaving = saving || bulkSaving;
  const isConfirmDisabled = isSaving || selectedRowKeys.length === 0;

  return (
    <div className="flex flex-col gap-4 border-t border-white/5 pt-5">
      {/* Summary Panel */}
      <div className="bg-[#0D111C]/40 border border-white/5 p-4 rounded-xl flex flex-wrap justify-between items-center gap-3">
        <div>
          <h4 className="text-sm font-bold text-white mb-0.5">Kết quả lập lịch chiếu dự kiến</h4>
          <p className="text-xs text-gray-400">
            Ước tính tạo được <span className="font-semibold text-white font-mono">{dryRunShowtimes.length}</span> suất chiếu.
            Hợp lệ: <span className="font-semibold text-green-400 font-mono">{validCount}</span>.
            Trùng lịch: <span className="font-semibold text-red-400 font-mono">{invalidCount}</span>.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setIsBulkDryRun(false)}
            className="px-4 py-2.5 text-xs font-semibold border border-white/10 text-gray-300 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
          >
            Hủy bỏ
          </button>
          <button
            onClick={handleConfirmCreate}
            disabled={isConfirmDisabled}
            className="px-5 py-2.5 text-xs font-semibold bg-[#FF2D2D] hover:bg-[#ff4444] text-white rounded-lg cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-[0_0_12px_rgba(255,45,45,0.25)]"
          >
            {isSaving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
            Xác nhận tạo {selectedRowKeys.length} suất chiếu đã chọn
          </button>
        </div>
      </div>

      {/* KPI Allocation Stats */}
      {stats.total > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 bg-[#0D111C]/30 border border-white/5 p-4 rounded-xl">
          {/* General Stats */}
          <div className="flex flex-col gap-3 justify-center border-r border-white/5 pr-4">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-lg bg-[#FFD54A]/15 border border-[#FFD54A]/30 flex items-center justify-center text-[#FFD54A]">
                <BarChart3 size={16} />
              </div>
              <div>
                <span className="text-[10px] text-gray-500 font-semibold block uppercase tracking-wider">Tổng suất chiếu chọn tạo</span>
                <span className="text-base font-black text-white font-mono">{stats.total} suất</span>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-lg bg-[#FF2D2D]/15 border border-[#FF2D2D]/30 flex items-center justify-center text-[#FF2D2D]">
                <Clock size={16} />
              </div>
              <div>
                <span className="text-[10px] text-gray-500 font-semibold block uppercase tracking-wider">Tổng thời lượng phát sóng</span>
                <span className="text-xs font-bold text-gray-300 font-mono">{stats.durationText}</span>
              </div>
            </div>
          </div>

          {/* Movie Allocation Stats */}
          <div className="flex flex-col gap-2 border-r border-white/5 pr-4">
            <span className="text-[11px] font-bold text-white flex items-center gap-1.5 mb-1 uppercase tracking-wider text-gray-400">
              <Clapperboard size={13} className="text-[#FF2D2D]" /> Phân bổ theo phim
            </span>
            <div className="flex flex-col gap-2 max-h-[110px] overflow-y-auto pr-1">
              {stats.moviesList.map(m => (
                <div key={m.movieId} className="flex flex-col gap-0.5">
                  <div className="flex justify-between text-[10px] font-semibold">
                    <span className="text-gray-300 truncate max-w-[170px]" title={m.title}>{m.title}</span>
                    <span className="text-gray-400 font-mono">{m.count} suất ({m.percentage}%)</span>
                  </div>
                  <div className="w-full bg-[#05070F] h-1 rounded-full overflow-hidden">
                    <div 
                      className="bg-[#FF2D2D] h-full rounded-full transition-all duration-500" 
                      style={{ width: `${m.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Hall Allocation Stats */}
          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-bold text-white flex items-center gap-1.5 mb-1 uppercase tracking-wider text-gray-400">
              <DoorOpen size={13} className="text-[#FFD54A]" /> Phân bổ theo phòng
            </span>
            <div className="flex flex-col gap-2 max-h-[110px] overflow-y-auto pr-1">
              {stats.hallsList.map(h => (
                <div key={h.hallId} className="flex flex-col gap-0.5">
                  <div className="flex justify-between text-[10px] font-semibold">
                    <span className="text-gray-300 truncate">{h.name}</span>
                    <span className="text-gray-400 font-mono">{h.count} suất ({h.percentage}%)</span>
                  </div>
                  <div className="w-full bg-[#05070F] h-1 rounded-full overflow-hidden">
                    <div 
                      className="bg-[#FFD54A] h-full rounded-full transition-all duration-500" 
                      style={{ width: `${h.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Timeline Visual Grid Tabs */}
      {bulkSelectedDates.length > 1 && (
        <div className="flex flex-wrap gap-1 bg-[#05070F]/80 p-1 rounded-lg border border-white/10 w-fit">
          {bulkSelectedDates.map(dateStr => {
            const displayStr = formatLocalDate(dateStr, 'DD/MM (ddd)');
            const selectDate = () => setActivePreviewDate(dateStr);
            const isActive = activePreviewDate === dateStr;

            return (
              <button
                key={dateStr}
                onClick={selectDate}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${isActive ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`}
              >
                {displayStr}
              </button>
            );
          })}
        </div>
      )}

      {/* Timeline representation */}
      <TimelineGrid
        hallList={bulkHallsList}
        dateStr={activePreviewDate}
        showtimesList={showtimesList}
        movies={movies}
        proposedShowtimes={dryRunShowtimes}
      />

      {/* Preview Table list */}
      <div className="bg-[#0D111C]/40 border border-white/5 rounded-2xl overflow-hidden mt-2">
        <div className="p-4 border-b border-white/5 flex justify-between items-center">
          <span className="text-xs font-semibold text-gray-300">Chi tiết danh sách suất chiếu được lập</span>
          <div className="flex gap-2">
            <button
              onClick={handleSelectAll}
              className="text-[10px] text-gray-400 hover:text-white underline cursor-pointer"
            >
              Chọn tất cả
            </button>
            <button
              onClick={handleClearAll}
              className="text-[10px] text-gray-400 hover:text-white underline cursor-pointer"
            >
              Bỏ chọn tất cả
            </button>
            <button
              onClick={handleSelectValid}
              className="text-[10px] text-green-400 hover:text-green-300 underline cursor-pointer"
            >
              Chọn suất chiếu hợp lệ
            </button>
          </div>
        </div>

        <Table
          rowSelection={rowSelection}
          columns={previewColumns}
          dataSource={memoizedDataSource}
          pagination={{ pageSize: 10, className: 'custom-table-pagination font-mono text-xs px-4' }}
          className="custom-table text-gray-300"
        />
      </div>
    </div>
  );
});

BulkPreviewPanel.displayName = 'BulkPreviewPanel';
