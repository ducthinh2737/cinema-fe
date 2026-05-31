import React, { useState } from 'react';
import { 
  ArrowUpDown, 
  ChevronUp, 
  ChevronDown, 
  Edit3, 
  Trash2, 
  Eye, 
  Sparkles, 
  Copy, 
  EyeOff,
  Calendar
} from 'lucide-react';
import { MovieStatusBadge } from './MovieComponents';
import type { MovieStatus } from './MovieComponents';
import type { Movie } from '../../../types';
import { getImageUrl } from '../../../api/client';

export type SortField = 'title' | 'duration' | 'rating' | 'releaseDate' | 'revenue';
export type SortOrder = 'asc' | 'desc';

interface MovieTableProps {
  movies: Movie[];
  onEdit: (movie: Movie) => void;
  onDelete: (id: number) => void;
  onSelect: (movie: Movie) => void;
  onClone?: (movie: Movie) => void;
  onToggleHide?: (movie: Movie) => void;
  onManageShowtimes?: (movie: Movie) => void;
  sortField: SortField;
  sortOrder: SortOrder;
  onSort: (field: SortField) => void;
  getStatus: (movie: Movie) => MovieStatus;
  getStats: (movieId: number) => { bookingCount: number; revenue: number };
}

export const MovieTable: React.FC<MovieTableProps> = ({
  movies,
  onEdit,
  onDelete,
  onSelect,
  onClone,
  onToggleHide,
  onManageShowtimes,
  sortField,
  sortOrder,
  onSort,
  getStatus,
  getStats,
}) => {
  const [activeDropdown, setActiveDropdown] = useState<number | null>(null);

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown size={11} className="text-gray-600" />;
    return sortOrder === 'asc' 
      ? <ChevronUp size={11} className="text-brand-gold" /> 
      : <ChevronDown size={11} className="text-brand-gold" />;
  };

  return (
    <div className="w-full overflow-x-auto rounded-3xl border border-white/5 bg-[#0e0e12]/20 backdrop-blur-md shadow-2xl relative select-none">
      <table className="w-full text-left text-xs border-collapse min-w-[1000px]">
        <thead>
          <tr className="border-b border-white/5 bg-white/[0.02] text-gray-400 font-black uppercase tracking-wider text-[9px] cursor-pointer">
            <th className="p-4 w-20">Ảnh Poster</th>
            <th className="p-4" onClick={() => onSort('title')}>
              <div className="flex items-center gap-1.5 hover:text-white transition-colors">
                Tên Phim {renderSortIcon('title')}
              </div>
            </th>
            <th className="p-4">Thể Loại</th>
            <th className="p-4" onClick={() => onSort('duration')}>
              <div className="flex items-center gap-1.5 hover:text-white transition-colors">
                Thời Lượng {renderSortIcon('duration')}
              </div>
            </th>
            <th className="p-4">Ngôn Ngữ</th>
            <th className="p-4" onClick={() => onSort('releaseDate')}>
              <div className="flex items-center gap-1.5 hover:text-white transition-colors">
                Khởi Chiếu {renderSortIcon('releaseDate')}
              </div>
            </th>
            <th className="p-4">Trạng Thái</th>
            <th className="p-4 text-center">Đã Bán</th>
            <th className="p-4 text-right" onClick={() => onSort('revenue')}>
              <div className="flex items-center gap-1.5 justify-end hover:text-white transition-colors">
                Doanh Thu {renderSortIcon('revenue')}
              </div>
            </th>
            <th className="p-4 text-right">Thao Tác</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5 font-semibold text-gray-300">
          {movies.map((movie) => {
            const status = getStatus(movie);
            const stats = getStats(movie.id);
            const isFeatured = (movie as any).isFeatured;

            return (
              <tr 
                key={movie.id} 
                className="hover:bg-white/[0.015] hover:shadow-[inset_0_0_15px_rgba(224,36,36,0.02)] transition-all duration-300 group"
              >
                {/* Poster */}
                <td className="p-4" onClick={() => onSelect(movie)}>
                  <div className="relative aspect-[2/3] w-12 rounded-lg overflow-hidden border border-white/10 bg-[#07070a] shadow-md group-hover:border-brand-gold/30 transition-colors cursor-pointer">
                    <img
                      src={getImageUrl(movie.posterUrl) || 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?q=80&w=150'}
                      alt={movie.title}
                      className="w-full h-full object-cover filter brightness-95 group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                </td>

                {/* Movie Title */}
                <td className="p-4" onClick={() => onSelect(movie)}>
                  <div className="flex flex-col gap-1 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <span className="font-sans text-sm font-black text-white group-hover:text-brand transition-colors line-clamp-1">
                        {movie.title}
                      </span>
                      {isFeatured && (
                        <span className="text-[8px] font-black uppercase text-brand-gold bg-brand-gold/10 border border-brand-gold/20 px-1.5 py-0.5 rounded animate-pulse shrink-0">
                          Hot
                        </span>
                      )}
                    </div>
                    <span className="text-[8px] font-mono text-gray-600 select-all uppercase">
                      ID: {movie.id} • SLUG: {movie.slug}
                    </span>
                  </div>
                </td>

                {/* Genre Tag */}
                <td className="p-4">
                  <span className="px-2.5 py-0.5 bg-brand-gold/10 border border-brand-gold/25 text-brand-gold text-[9px] font-black uppercase tracking-wider rounded-full">
                    {movie.genreName || movie.genre?.genreName || 'Chưa Phân Loại'}
                  </span>
                </td>

                {/* Duration */}
                <td className="p-4 font-mono">{movie.duration} phút</td>

                {/* Language */}
                <td className="p-4 font-mono uppercase text-[10px] tracking-wider text-gray-400">
                  {movie.language}
                </td>

                {/* Release date */}
                <td className="p-4 font-mono">
                  {new Date(movie.releaseDate).toLocaleDateString('vi-VN')}
                </td>

                {/* Status badge */}
                <td className="p-4">
                  <MovieStatusBadge status={status} />
                </td>

                {/* Ticket sales count */}
                <td className="p-4 font-mono text-center text-gray-400">
                  {stats.bookingCount.toLocaleString('vi-VN')}
                </td>

                {/* Revenue */}
                <td className="p-4 font-mono text-right text-brand-gold font-bold">
                  {stats.revenue.toLocaleString('vi-VN')}đ
                </td>

                {/* Actions row */}
                <td className="p-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => onSelect(movie)}
                      className="p-2 bg-white/5 border border-white/5 hover:border-brand-gold hover:bg-brand-gold/5 text-brand-gold rounded-lg transition-colors cursor-pointer"
                      title="Chi tiết"
                    >
                      <Eye size={12} />
                    </button>
                    <button
                      onClick={() => onEdit(movie)}
                      className="p-2 bg-white/5 border border-white/5 hover:border-brand-gold hover:bg-brand-gold/5 text-brand-gold rounded-lg transition-colors cursor-pointer"
                      title="Sửa"
                    >
                      <Edit3 size={12} />
                    </button>

                    <div className="relative">
                      <button
                        onClick={() => setActiveDropdown(activeDropdown === movie.id ? null : movie.id)}
                        className="p-2 bg-white/5 border border-white/5 hover:border-white/20 text-gray-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                        title="Tùy chọn khác"
                      >
                        •••
                      </button>

                      {activeDropdown === movie.id && (
                        <>
                          <div 
                            className="fixed inset-0 z-10" 
                            onClick={() => setActiveDropdown(null)} 
                          />
                          <div className="absolute right-0 mt-2 w-40 bg-[#121217] border border-white/10 rounded-xl shadow-2xl p-1.5 z-20 flex flex-col gap-1 text-left select-none">
                            {onClone && (
                              <button
                                onClick={() => {
                                  onClone(movie);
                                  setActiveDropdown(null);
                                }}
                                className="w-full text-left px-3 py-2 hover:bg-white/5 rounded-lg text-[10px] font-black uppercase text-gray-300 hover:text-white flex items-center gap-2 cursor-pointer"
                              >
                                <Copy size={12} className="text-gray-500" /> Nhân Bản
                              </button>
                            )}

                            {onToggleHide && (
                              <button
                                onClick={() => {
                                  onToggleHide(movie);
                                  setActiveDropdown(null);
                                }}
                                className="w-full text-left px-3 py-2 hover:bg-white/5 rounded-lg text-[10px] font-black uppercase text-gray-300 hover:text-white flex items-center gap-2 cursor-pointer"
                              >
                                {status === 'Hidden' ? (
                                  <>
                                    <Sparkles size={12} className="text-emerald-500" /> Hiện Phim
                                  </>
                                ) : (
                                  <>
                                    <EyeOff size={12} className="text-rose-500" /> Ẩn Phim
                                  </>
                                )}
                              </button>
                            )}

                            {onManageShowtimes && (
                              <button
                                onClick={() => {
                                  onManageShowtimes(movie);
                                  setActiveDropdown(null);
                                }}
                                className="w-full text-left px-3 py-2 hover:bg-white/5 rounded-lg text-[10px] font-black uppercase text-brand-gold hover:text-white flex items-center gap-2 cursor-pointer"
                              >
                                <Calendar size={12} className="text-gray-500" /> Lịch Chiếu
                              </button>
                            )}

                            <button
                              onClick={() => {
                                onDelete(movie.id);
                                setActiveDropdown(null);
                              }}
                              className="w-full text-left px-3 py-2 hover:bg-rose-500/10 rounded-lg text-[10px] font-black uppercase text-rose-400 hover:text-rose-300 flex items-center gap-2 cursor-pointer border-t border-white/5 mt-0.5"
                            >
                              <Trash2 size={12} /> Xóa Bỏ
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
export default MovieTable;
