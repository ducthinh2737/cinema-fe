import React, { useMemo } from 'react';
import { Clock, AlertTriangle, User } from 'lucide-react';
import { Tooltip } from 'antd';
import type { ApiShowtime, NormalizedMovie, MappedHall, DryRunShowtime } from '../../../types/showtime';
import { buildTimelineMatrix } from '../../../domain/showtime/engine';

interface TimelineGridProps {
  hallList: MappedHall[];
  dateStr: string; // YYYY-MM-DD
  showtimesList: ApiShowtime[];
  movies: NormalizedMovie[];
  proposedShowtimes?: DryRunShowtime[];
  onTimeSlotClick?: (hallId: number, hour: number, minute: number) => void;
}

export const TimelineGrid: React.FC<TimelineGridProps> = ({
  hallList,
  dateStr,
  showtimesList,
  movies,
  proposedShowtimes = [],
  onTimeSlotClick
}) => {
  const startHour = 8;
  const endHour = 28; // Support overnight showtimes up to 04:00 next day

  const { matrix, timelineRange } = useMemo(() => {
    return buildTimelineMatrix(
      hallList,
      dateStr,
      showtimesList,
      movies,
      proposedShowtimes,
      startHour,
      endHour
    );
  }, [hallList, dateStr, showtimesList, movies, proposedShowtimes]);

  // Generate ticks for the timeline header
  const hoursTicks = useMemo(() => {
    const ticks = [];
    for (let h = startHour; h <= endHour; h++) {
      ticks.push(h);
    }
    return ticks;
  }, [startHour, endHour]);

  const handleRowClick = (e: React.MouseEvent<HTMLDivElement>, hallId: number) => {
    if (!onTimeSlotClick) return;

    // Calculate time based on click X coordinate relative to container width
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickRatio = clickX / rect.width;

    const totalMinutes = timelineRange.totalMinutes;
    const clickedMinuteOffset = clickRatio * totalMinutes;
    
    // Round to nearest 15 minutes for scheduling convenience
    const totalMinutesFromMidnight = startHour * 60 + clickedMinuteOffset;
    const roundedMinutes = Math.round(totalMinutesFromMidnight / 15) * 15;
    
    const targetHour = Math.floor(roundedMinutes / 60);
    const targetMinute = roundedMinutes % 60;

    if (targetHour >= startHour && targetHour < endHour) {
      onTimeSlotClick(hallId, targetHour, targetMinute);
    }
  };

  return (
    <div className="bg-[#0D111C]/60 border border-white/5 p-4 rounded-2xl shadow-xl backdrop-blur-md flex flex-col gap-4 text-left">
      <div className="flex justify-between items-center border-b border-white/5 pb-2">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Clock size={16} className="text-[#FF2D2D]" />
            Sơ đồ phòng &amp; Timeline trực quan ({dateStr})
          </h3>
          <p className="text-[10px] text-gray-500">Hiển thị lịch chiếu hiện tại và các suất chiếu dự kiến</p>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-gray-400">
          <div className="flex items-center gap-1">
            <span className="h-2 w-3.5 bg-white/10 border border-white/20 rounded" />
            <span>Chờ chiếu</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="h-2 w-3.5 bg-[#EAB308]/20 border border-[#EAB308]/50 rounded" />
            <span>Đang chiếu</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="h-2 w-3.5 bg-white/[0.03] border border-white/10 rounded opacity-50" />
            <span>Đã chiếu xong</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="h-2 w-3.5 bg-[#10B981]/25 border border-[#10B981]/50 rounded" />
            <span>Dự kiến (Hợp lệ)</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="h-2 w-3.5 bg-[#EF4444]/20 border border-[#EF4444]/50 rounded" />
            <span>Dự kiến (Trùng)</span>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[800px] flex flex-col relative">
          {/* Hour ticks header */}
          <div className="flex border-b border-white/5 pb-1 relative" style={{ paddingLeft: '140px' }}>
            {hoursTicks.map((tick, index) => {
              const leftPercent = (index / (hoursTicks.length - 1)) * 100;
              return (
                <div
                  key={tick}
                  className="absolute text-[9px] font-mono font-bold text-gray-500 transform -translate-x-1/2"
                  style={{ left: `calc(140px + ${leftPercent} * (100% - 140px) / 100)` }}
                >
                  {String(tick % 24).padStart(2, '0')}:00
                </div>
              );
            })}
            <div className="h-4" />
          </div>

          {/* Grid Rows */}
          <div className="flex flex-col gap-1.5 mt-2 relative">
            {matrix.map((row) => (
              <div key={row.hallId} className="flex items-stretch min-h-[48px] relative rounded-xl hover:bg-white/[0.01] transition-colors">
                {/* Hall Title Left Bar */}
                <div className="w-[140px] pr-2 flex flex-col justify-center shrink-0 border-r border-white/5">
                  <span className="text-xs font-bold text-gray-200 truncate">{row.hallName}</span>
                  <span className="text-[9px] text-gray-500">{row.hallTypeName}</span>
                </div>

                {/* Timeline Grid Container */}
                <div
                  className="flex-1 relative bg-[#05070F]/50 border border-white/5 rounded-lg overflow-hidden cursor-crosshair group/row"
                  onClick={(e) => handleRowClick(e, row.hallId)}
                  title="Click để tạo nhanh suất chiếu tại thời điểm này"
                >
                  {/* Vertical lines */}
                  {hoursTicks.map((_, index) => {
                    const leftPercent = (index / (hoursTicks.length - 1)) * 100;
                    return (
                      <div
                        key={index}
                        className="absolute top-0 bottom-0 border-l border-white/[0.03] pointer-events-none"
                        style={{ left: `${leftPercent}%` }}
                      />
                    );
                  })}

                  {/* Showtime blocks */}
                  {row.blocks.map((block, index) => {
                    const isProposed = !block.isDb;
                    
                    let bgClass = 'bg-white/10 hover:bg-white/15 border-white/20 text-gray-200';
                    if (isProposed) {
                      if (block.isConflict) {
                        bgClass = 'bg-[#EF4444]/20 hover:bg-[#EF4444]/30 border-[#EF4444]/40 text-red-300 animate-shake';
                      } else {
                        bgClass = 'bg-[#10B981]/25 hover:bg-[#10B981]/35 border-[#10B981]/50 text-green-300 shadow-[0_0_8px_rgba(16,185,129,0.15)]';
                      }
                    } else {
                      if (block.status === 'finished') {
                        bgClass = 'bg-white/[0.03] hover:bg-white/[0.05] border-white/10 text-gray-500 opacity-50';
                      } else if (block.status === 'showing') {
                        bgClass = 'bg-[#EAB308]/20 hover:bg-[#EAB308]/30 border-[#EAB308]/50 text-yellow-300 shadow-[0_0_8px_rgba(234,179,8,0.2)]';
                      }
                    }

                    const blockEl = (
                      <div
                        key={index}
                        className={`absolute top-1 bottom-1 rounded-md border p-1 text-[9px] font-medium flex flex-col justify-between overflow-hidden backdrop-blur-sm transition-all select-none z-10 ${bgClass}`}
                        style={{
                          left: `${block.leftPercent}%`,
                          width: `${block.widthPercent}%`
                        }}
                        onClick={(e) => e.stopPropagation()} // Prevent trigger row click
                      >
                        <div className="truncate font-bold leading-tight flex items-center gap-1">
                          {!isProposed && block.status === 'showing' && (
                            <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-ping shrink-0" />
                          )}
                          <span className="truncate">{block.movieTitle}</span>
                        </div>
                        <div className="flex justify-between items-center text-[8px] opacity-75 font-mono">
                          <span>{block.startTime} - {block.endTime}</span>
                          {!isProposed && block.availableSeats !== undefined && (
                            <span className="flex items-center gap-0.5 shrink-0 bg-black/40 px-1 rounded">
                              <User size={8} /> {block.availableSeats}
                            </span>
                          )}
                          {isProposed && block.isConflict && (
                            <AlertTriangle size={9} className="text-red-400" />
                          )}
                        </div>
                      </div>
                    );

                    const tooltipTitle = (
                      <div className="text-xs p-1 flex flex-col gap-1 text-left">
                        <p className="font-bold text-white mb-0.5">{block.movieTitle}</p>
                        <p className="text-gray-400">Thời gian: <span className="font-mono text-white">{block.startTime} - {block.endTime}</span> ({block.duration} phút)</p>
                        <p className="text-gray-400">Loại: <span className="text-white">{isProposed ? 'Suất chiếu dự kiến' : 'Suất chiếu chính thức'}</span></p>
                        {!isProposed && block.status && (
                          <p className="text-gray-400">
                            Trạng thái:{' '}
                            <span
                              className={`font-semibold ${
                                block.status === 'finished'
                                  ? 'text-gray-500'
                                  : block.status === 'showing'
                                  ? 'text-yellow-400 font-bold animate-pulse'
                                  : 'text-green-400'
                              }`}
                            >
                              {block.status === 'finished'
                                ? 'Đã chiếu xong'
                                : block.status === 'showing'
                                ? 'Đang chiếu'
                                : 'Chờ chiếu'}
                            </span>
                          </p>
                        )}
                        {block.conflictReason && (
                          <div className="bg-red-950/40 border border-red-500/30 p-1.5 rounded mt-1 flex gap-1 items-start text-red-300">
                            <AlertTriangle size={12} className="shrink-0 mt-0.5" />
                            <span>{block.conflictReason}</span>
                          </div>
                        )}
                        {!isProposed && block.availableSeats !== undefined && (
                          <p className="text-gray-400">Số ghế trống: <span className="font-semibold text-white">{block.availableSeats}/{block.totalSeats || 0}</span></p>
                        )}
                      </div>
                    );

                    return (
                      <Tooltip key={index} title={tooltipTitle} styles={{ root: { maxWidth: 280 } }}>
                        {blockEl}
                      </Tooltip>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
