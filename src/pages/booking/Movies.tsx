import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import type { Movie } from '../../types';
import { SkeletonLoader } from '../../components/ui/SkeletonLoader';
import { MovieCard } from '../../components/movie/MovieCard';
import {
  Film,
  Search,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export const Movies: React.FC = () => {
  // =========================
  // STATE
  // =========================
  const [movies, setMovies] = useState<Movie[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [movieTab, setMovieTab] = useState<'showing' | 'upcoming' | 'special'>('showing');

  // =========================
  // LOAD MOVIES
  // =========================
  useEffect(() => {
    const fetchMovies = async () => {
      try {
        setLoading(true);

        const statusParam =
          movieTab === 'showing' ? 'nowshowing' :
          movieTab === 'upcoming' ? 'comingsoon' :
          movieTab === 'special' ? 'special' :
          undefined;

        const response = await apiClient.get<any>('/movies', {
          params: {
            PageNumber: page,
            PageSize: 12,
            SearchTerm: searchTerm.trim() || undefined,
            Status: statusParam,
          },
        });

        const data = response.data?.data ?? response.data;
        const movieItems = data?.items ?? (Array.isArray(data) ? data : []);

        setMovies(movieItems);

        setTotalPages(
          Math.max(
            1,
            Math.ceil((data?.totalCount ?? 1) / (data?.pageSize ?? 12))
          )
        );
      } catch (err) {
        console.error('Error fetching movies', err);
        setMovies([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMovies();
  }, [page, searchTerm, movieTab]);

  // =========================
  // HANDLERS
  // =========================
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setPage(1);
  };

  const handleTabChange = (tab: 'showing' | 'upcoming' | 'special') => {
    setMovieTab(tab);
    setPage(1);
  };

  // =========================
  // RENDER
  // =========================
  return (
    <div className="max-w-7xl mx-auto px-6 md:px-12 py-12 min-h-screen pb-24 text-left">
      
      {/* HEADER */}
      <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-white/5 pb-6">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-2">
            <Film className="text-brand" />
            Tìm Phim Chiếu
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Tìm kiếm và lọc phim đang chiếu.
          </p>
        </div>

        {/* SEARCH */}
        <div className="relative max-w-sm w-full">
          <span className="absolute inset-y-0 left-3 flex items-center text-gray-500">
            <Search size={16} />
          </span>
          <input
            type="text"
            placeholder="Tìm phim..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="w-full pl-10 pr-4 py-3 bg-[#121216] border border-white/10 rounded-xl text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-brand"
          />
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex flex-col gap-8">
        
        {/* Sleek Segmented Switcher Tab Bar */}
        <div className="flex justify-start">
          <div className="flex p-1 bg-white/[0.02] border border-white/5 rounded-2xl w-fit backdrop-blur-md">
            <button
              onClick={() => handleTabChange('showing')}
              className={`relative px-6 py-2.5 rounded-xl text-xs md:text-sm font-black uppercase tracking-wider transition-all cursor-pointer ${
                movieTab === 'showing' ? 'text-white bg-brand shadow-lg shadow-brand/20' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              Phim Đang Chiếu
            </button>

            <button
              onClick={() => handleTabChange('upcoming')}
              className={`relative px-6 py-2.5 rounded-xl text-xs md:text-sm font-black uppercase tracking-wider transition-all cursor-pointer ${
                movieTab === 'upcoming' ? 'text-white bg-brand shadow-lg shadow-brand/20' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              Phim Sắp Chiếu
            </button>

            <button
              onClick={() => handleTabChange('special')}
              className={`relative px-6 py-2.5 rounded-xl text-xs md:text-sm font-black uppercase tracking-wider transition-all cursor-pointer ${
                movieTab === 'special' ? 'text-white bg-brand shadow-lg shadow-brand/20' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              Suất Chiếu Đặc Biệt
            </button>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="flex flex-col gap-3">
                <SkeletonLoader className="h-72 w-full rounded-2xl" />
                <SkeletonLoader className="h-4 w-3/4 rounded" variant="text" />
              </div>
            ))}
          </div>
        ) : movies.length === 0 ? (
          <div className="py-24 text-center text-gray-500 bg-white/[0.01] border border-white/5 rounded-[32px]">
            Không tìm thấy phim phù hợp với bộ lọc hiện tại.
          </div>
        ) : (
          <>
            {/* GRID */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
              {movies.map((movie) => (
                <MovieCard key={movie.id} movie={movie} />
              ))}
            </div>

            {/* PAGINATION */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-4 pt-10">
                <button
                  disabled={page === 1}
                  onClick={() => setPage(prev => prev - 1)}
                  className="p-2 rounded-xl bg-white/5 border border-white/10 disabled:opacity-30 cursor-pointer text-gray-400 hover:text-white transition-colors"
                >
                  <ChevronLeft size={16} />
                </button>

                <span className="text-sm text-gray-400">
                  Trang{' '}
                  <span className="text-white font-bold">
                    {page}
                  </span>{' '}
                  / {totalPages}
                </span>

                <button
                  disabled={page === totalPages}
                  onClick={() => setPage(prev => prev + 1)}
                  className="p-2 rounded-xl bg-white/5 border border-white/10 disabled:opacity-30 cursor-pointer text-gray-400 hover:text-white transition-colors"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
export default Movies;