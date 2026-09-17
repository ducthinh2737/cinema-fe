import React from 'react';
import { Loader2, Check, ChevronDown } from 'lucide-react';
import type { NormalizedMovie, MappedHall } from '../../../../../types/showtime';
import type { Cinema } from '../../../../../types';

export interface BulkConfigPanelProps {
  movies: NormalizedMovie[];
  cinemas: Cinema[];
  bulkMovieIds: number[];
  setBulkMovieIds: React.Dispatch<React.SetStateAction<number[]>>;
  bulkMovieWeights: Record<number, number>;
  setBulkMovieWeights: React.Dispatch<React.SetStateAction<Record<number, number>>>;
  bulkCinemaId: number;
  setBulkCinemaId: (id: number) => void;
  bulkSelectedHalls: number[];
  setBulkSelectedHalls: React.Dispatch<React.SetStateAction<number[]>>;
  bulkHallsList: MappedHall[];
  bulkLoadingHalls: boolean;
  setIsBulkDryRun: (val: boolean) => void;
}

export const BulkConfigPanel: React.FC<BulkConfigPanelProps> = React.memo(({
  movies,
  cinemas,
  bulkMovieIds,
  setBulkMovieIds,
  bulkMovieWeights,
  setBulkMovieWeights,
  bulkCinemaId,
  setBulkCinemaId,
  bulkSelectedHalls,
  setBulkSelectedHalls,
  bulkHallsList,
  bulkLoadingHalls,
  setIsBulkDryRun,
}) => {
  const handleCinemaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setBulkCinemaId(parseInt(e.target.value) || 0);
    setIsBulkDryRun(false);
  };

  const visibleMovies = React.useMemo(
    () => movies.filter(m => m.status !== 'Hidden'),
    [movies]
  );

  const toggleMovie = (m: NormalizedMovie, checked: boolean) => {
    setIsBulkDryRun(false);
    setBulkMovieIds(prev => {
      const next = checked ? prev.filter(id => id !== m.movieId) : [...prev, m.movieId];

      setTimeout(() => {
        setBulkSelectedHalls(prevHalls =>
          prevHalls.filter(hallId => {
            const hall = bulkHallsList.find(h => h.hallId === hallId);
            if (!hall) return true;
            return next.every(mId => {
              const selectedMovie = movies.find(mov => mov.movieId === mId);
              if (!selectedMovie) return true;
              const movieFormats = selectedMovie.movieFormats?.map(f => f.formatName) || [];
              if (movieFormats.length === 0) return true;
              const hallFormats = hall.supportedFormats || [];
              return movieFormats.some(f =>
                hallFormats.some(hf => hf.toLowerCase() === f.toLowerCase())
              );
            });
          })
        );
      }, 0);

      return next;
    });
  };

  const isHallCompatible = (h: MappedHall) =>
    bulkMovieIds.length === 0 ||
    bulkMovieIds.every(mId => {
      const selectedMovie = movies.find(m => m.movieId === mId);
      if (!selectedMovie) return true;
      const movieFormats = selectedMovie.movieFormats?.map(f => f.formatName) || [];
      if (movieFormats.length === 0) return true;
      const hallFormats = h.supportedFormats || [];
      return movieFormats.some(f =>
        hallFormats.some(hf => hf.toLowerCase() === f.toLowerCase())
      );
    });

  return (
    <div className="bg-[#0c0f19]/80 backdrop-blur-md border border-white/[0.06] p-4 rounded-2xl flex flex-col gap-3.5 shadow-glass">

      {/* ── Phim chiếu ── */}
      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">
            Phim chiếu
          </span>
          {bulkMovieIds.length > 0 && (
            <span className="text-[10px] font-semibold text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full">
              {bulkMovieIds.length} phim đã chọn
            </span>
          )}
        </div>

        <div className="border border-white/[0.07] rounded-xl overflow-hidden divide-y divide-white/[0.05]">
          {visibleMovies.length === 0 ? (
            <p className="text-xs text-gray-600 italic px-3 py-4">Không tìm thấy phim nào.</p>
          ) : (
            visibleMovies.map(m => {
              const checked = bulkMovieIds.includes(m.movieId);
              const formats = m.movieFormats?.map(f => f.formatName).join(', ');

              return (
                <div
                  key={m.movieId}
                  onClick={() => toggleMovie(m, checked)}
                  className={`flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors duration-150 select-none group/movie ${checked ? 'bg-white/[0.03]' : 'hover:bg-white/[0.02]'
                    }`}
                >
                  {/* Checkbox */}
                  <div
                    className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 transition-all duration-150 ${checked
                        ? 'bg-red-600 border-red-600'
                        : 'border-white/20 group-hover/movie:border-white/35'
                      }`}
                  >
                    {checked && <Check size={10} className="text-white stroke-[3]" />}
                  </div>

                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-medium truncate ${checked ? 'text-white' : 'text-gray-400'}`}>
                      {m.title}
                    </p>
                    <p className="text-[10px] text-gray-600 mt-0.5">
                      {m.duration} phút{formats ? ` · ${formats}` : ''}
                    </p>
                  </div>

                  {/* Sleek Custom Stepper for Priority Weights */}
                  {checked && (
                    <div
                      onClick={e => e.stopPropagation()}
                      className="flex items-center gap-1 bg-white/[0.04] border border-white/10 rounded-lg p-0.5 shrink-0 select-none"
                      title="Độ ưu tiên phân bổ suất chiếu (1-10)"
                    >
                      <button
                        onClick={() => {
                          setBulkMovieWeights(prev => {
                            const current = prev[m.movieId] ?? 1;
                            return { ...prev, [m.movieId]: Math.max(1, current - 1) };
                          });
                          setIsBulkDryRun(false);
                        }}
                        className="w-4 h-4 rounded bg-white/5 hover:bg-white/10 flex items-center justify-center text-[10px] text-gray-300 font-bold transition-all active:scale-90"
                      >
                        -
                      </button>
                      <span className="text-[10px] text-brand-gold font-bold w-9 text-center">
                        W: {bulkMovieWeights[m.movieId] ?? 1}
                      </span>
                      <button
                        onClick={() => {
                          setBulkMovieWeights(prev => {
                            const current = prev[m.movieId] ?? 1;
                            return { ...prev, [m.movieId]: Math.min(10, current + 1) };
                          });
                          setIsBulkDryRun(false);
                        }}
                        className="w-4 h-4 rounded bg-white/5 hover:bg-white/10 flex items-center justify-center text-[10px] text-gray-300 font-bold transition-all active:scale-90"
                      >
                        +
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <p className="text-[9px] text-gray-500 leading-relaxed px-0.5 mt-0.5">
          💡 <span className="text-gray-400 font-semibold">Trọng số (W):</span> số cao hơn sẽ ưu tiên có nhiều suất chiếu và được xếp vào khung giờ vàng (18h-22h).
        </p>
      </section>

      {/* ── Rạp chiếu ── */}
      <section className="flex flex-col gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">
          Rạp chiếu
        </span>
        <div className="relative">
          <select
            value={bulkCinemaId}
            onChange={handleCinemaChange}
            className="w-full bg-white/[0.03] border border-white/[0.07] hover:border-white/15 focus:border-red-600/60 px-3 py-2 text-xs text-white rounded-xl focus:outline-none cursor-pointer transition-colors appearance-none pr-8"
          >
            {cinemas.map(c => (
              <option key={c.cinemaId} value={c.cinemaId}>{c.name}</option>
            ))}
          </select>
          <ChevronDown
            size={13}
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
          />
        </div>
      </section>

      {/* ── Phòng chiếu ── */}
      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">
            Phòng chiếu
          </span>
          {bulkLoadingHalls && <Loader2 size={11} className="animate-spin text-gray-500" />}
        </div>

        <div className="border border-white/[0.07] rounded-xl overflow-hidden divide-y divide-white/[0.05]">
          {bulkHallsList.length === 0 ? (
            <p className="text-xs text-gray-600 italic px-3 py-4">Chọn rạp trước...</p>
          ) : (
            bulkHallsList.map(h => {
              const compatible = isHallCompatible(h);
              const checked = bulkSelectedHalls.includes(h.hallId);

              const toggleHall = () => {
                if (!compatible) return;
                setIsBulkDryRun(false);
                setBulkSelectedHalls(prev =>
                  checked ? prev.filter(id => id !== h.hallId) : [...prev, h.hallId]
                );
              };

              return (
                <div
                  key={h.hallId}
                  onClick={toggleHall}
                  className={`flex items-center gap-3 px-3 py-2.5 transition-colors duration-150 select-none group/hall ${!compatible
                      ? 'opacity-35 cursor-not-allowed'
                      : checked
                        ? 'bg-white/[0.03] cursor-pointer'
                        : 'hover:bg-white/[0.02] cursor-pointer'
                    }`}
                >
                  {/* Checkbox */}
                  <div
                    className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 transition-all duration-150 ${!compatible
                        ? 'border-white/10'
                        : checked
                          ? 'bg-red-600 border-red-600'
                          : 'border-white/20 group-hover/hall:border-white/35'
                      }`}
                  >
                    {checked && compatible && <Check size={10} className="text-white stroke-[3]" />}
                  </div>

                  {/* Text */}
                  <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                    <span className={`text-xs font-medium ${checked && compatible ? 'text-white' : 'text-gray-400'}`}>
                      {h.name}
                    </span>
                    <span className="text-[10px] text-gray-600">{h.hallTypeName}</span>
                    {!compatible && (
                      <span className="text-[9px] font-semibold text-red-400/70 bg-red-500/[0.08] border border-red-500/15 px-1.5 py-0.5 rounded">
                        Không hỗ trợ định dạng
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
});

BulkConfigPanel.displayName = 'BulkConfigPanel';