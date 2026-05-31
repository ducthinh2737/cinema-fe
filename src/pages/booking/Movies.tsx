// FIXED VERSION

import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';

import type {
  Movie,
  Genre,
} from '../../types';

import { SkeletonLoader } from '../../components/ui/SkeletonLoader';
import { GlassCard } from '../../components/ui/GlassCard';
import { MovieCard } from '../../components/movie/MovieCard';

import {
  Film,
  Search,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

import { motion } from 'framer-motion';

export const Movies: React.FC = () => {

  // =========================
  // STATE
  // =========================

  const [movies, setMovies] = useState<Movie[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [selectedGenreId, setSelectedGenreId] =
    useState<number | null>(null);

  const [searchTerm, setSearchTerm] = useState('');

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [loading, setLoading] = useState(true);
  const [movieTab, setMovieTab] = useState<'showing' | 'upcoming' | 'special'>('showing');

  // =========================
  // LOAD GENRES
  // =========================

  useEffect(() => {
    const fetchGenres = async () => {
      try {
        const response =
          await apiClient.get<Genre[]>('/genres');

        setGenres(response.data || []);
      } catch (err) {
        console.error('Error loading genres', err);

        // fallback
        setGenres([
          {
            genreId: 1,
            genreName: 'Hành Động',
          },
          {
            genreId: 2,
            genreName: 'Hài Hước',
          },
          {
            genreId: 3,
            genreName: 'Kinh Dị',
          },
        ]);
      }
    };

    fetchGenres();
  }, []);

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

        const response =
          await apiClient.get<any>(
            '/movies',
            {
              params: {
                PageNumber: page,
                PageSize: 8,
                GenreId:
                  selectedGenreId ?? undefined,
                SearchTerm:
                  searchTerm.trim() || undefined,
                Status: statusParam,
              },
            }
          );

        const data = response.data?.data ?? response.data;
        const movieItems = data?.items ?? (Array.isArray(data) ? data : []);

        setMovies(movieItems);

        setTotalPages(
          Math.max(
            1,
            Math.ceil(
              (data?.totalCount ?? 1) / (data?.pageSize ?? 8)
            )
          )
        );
      } catch (err) {
        console.error(
          'Error fetching movies',
          err
        );

        setMovies([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMovies();
  }, [page, selectedGenreId, searchTerm, movieTab]);

  // =========================
  // HANDLERS
  // =========================

  const handleGenreSelect = (
    genreId: number | null
  ) => {
    setSelectedGenreId(genreId);
    setPage(1);
  };

  const handleSearchChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
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
    <div className="max-w-7xl mx-auto px-6 md:px-12 py-12 min-h-screen pb-24">

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

      {/* MAIN */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">

        {/* SIDEBAR */}
        <div className="lg:col-span-1">

          <GlassCard className="p-6 border border-white/5">

            <h3 className="text-xs font-black uppercase tracking-widest text-brand-gold flex items-center gap-2 border-b border-white/5 pb-3 mb-4">
              <SlidersHorizontal size={12} />
              Thể Loại
            </h3>

            <div className="flex flex-wrap lg:flex-col gap-2">

              {/* ALL */}
              <button
                onClick={() =>
                  handleGenreSelect(null)
                }
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${selectedGenreId === null
                    ? 'bg-brand text-white'
                    : 'bg-white/5 text-gray-400 hover:text-white'
                  }`}
              >
                Tất Cả
              </button>

              {/* GENRES */}
              {genres.map((genre) => (
                <button
                  key={genre.genreId}
                  onClick={() =>
                    handleGenreSelect(
                      genre.genreId
                    )
                  }
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${selectedGenreId ===
                      genre.genreId
                      ? 'bg-brand text-white'
                      : 'bg-white/5 text-gray-400 hover:text-white'
                    }`}
                >
                  {genre.genreName ||
                    genre.name}
                </button>
              ))}
            </div>
          </GlassCard>
        </div>

        {/* MOVIES */}
        <div className="lg:col-span-3">

          {/* Movie Category Tab Selector */}
          <div className="flex gap-6 border-b border-white/5 pb-2 mb-6">
            <button
              onClick={() => handleTabChange('showing')}
              className={`relative pb-2 text-xs md:text-sm font-black uppercase tracking-wider transition-all cursor-pointer ${
                movieTab === 'showing' ? 'text-brand-gold' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              Phim Đang Chiếu
              {movieTab === 'showing' && (
                <motion.div
                  layoutId="moviesActiveTabLine"
                  className="absolute bottom-0 inset-x-0 h-0.5 bg-brand-gold"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
            </button>

            <button
              onClick={() => handleTabChange('upcoming')}
              className={`relative pb-2 text-xs md:text-sm font-black uppercase tracking-wider transition-all cursor-pointer ${
                movieTab === 'upcoming' ? 'text-brand-gold' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              Phim Sắp Chiếu
              {movieTab === 'upcoming' && (
                <motion.div
                  layoutId="moviesActiveTabLine"
                  className="absolute bottom-0 inset-x-0 h-0.5 bg-brand-gold"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
            </button>

            <button
              onClick={() => handleTabChange('special')}
              className={`relative pb-2 text-xs md:text-sm font-black uppercase tracking-wider transition-all cursor-pointer ${
                movieTab === 'special' ? 'text-brand-gold' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              Suất Chiếu Đặc Biệt
              {movieTab === 'special' && (
                <motion.div
                  layoutId="moviesActiveTabLine"
                  className="absolute bottom-0 inset-x-0 h-0.5 bg-brand-gold"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
            </button>
          </div>

          {loading ? (

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map(
                (_, index) => (
                  <div
                    key={index}
                    className="flex flex-col gap-3"
                  >
                    <SkeletonLoader className="h-64 w-full rounded-2xl" />

                    <SkeletonLoader
                      className="h-4 w-3/4 rounded"
                      variant="text"
                    />
                  </div>
                )
              )}
            </div>

          ) : movies.length === 0 ? (

            <div className="py-24 text-center text-gray-500">
              Không tìm thấy phim
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
                    onClick={() =>
                      setPage(prev => prev - 1)
                    }
                    className="p-2 rounded-xl bg-white/5 border border-white/10 disabled:opacity-30"
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
                    disabled={
                      page === totalPages
                    }
                    onClick={() =>
                      setPage(prev => prev + 1)
                    }
                    className="p-2 rounded-xl bg-white/5 border border-white/10 disabled:opacity-30"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};