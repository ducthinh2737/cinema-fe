import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, MapPin } from 'lucide-react';
import { apiClient } from '../api/client';
import type { Movie, Cinema } from '../types';

// Importing existing and newly created components
import { HeroBanner } from '../components/movie/HeroBanner';
import { MovieCard } from '../components/movie/MovieCard';
import { SearchBar } from '../components/ui/SearchBar';

import { SkeletonLoader } from '../components/ui/SkeletonLoader';

import { CinemaCard } from '../components/cinema/CinemaCard';

export const Home: React.FC = () => {
  const [showingMovies, setShowingMovies] = useState<Movie[]>([]);
  const [upcomingMovies, setUpcomingMovies] = useState<Movie[]>([]);
  const [specialMovies, setSpecialMovies] = useState<Movie[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeMovieTab, setActiveMovieTab] = useState<'showing' | 'upcoming' | 'special'>('showing');

  // Cinema locations state
  const [cinemas, setCinemas] = useState<Cinema[]>([]);


  useEffect(() => {
    const loadHomeData = async () => {
      setLoading(true);
      try {
        // 1. Fetch Showing Movies
        const showingRes = await apiClient.get<any>('/movies', {
          params: { Status: 'nowshowing', PageSize: 12 }
        });
        const showingData = showingRes.data?.data ?? showingRes.data;
        const showingItems = showingData?.items ?? (Array.isArray(showingData) ? showingData : []);
        
        // Sort so featured movies are at the beginning
        const sortedShowing = [...showingItems].sort((a, b) => {
          if (a.isFeatured && !b.isFeatured) return -1;
          if (!a.isFeatured && b.isFeatured) return 1;
          return 0;
        });

        setShowingMovies(sortedShowing);

        // 2. Fetch Upcoming Movies
        const upcomingRes = await apiClient.get<any>('/movies', {
          params: { Status: 'comingsoon', PageSize: 12 }
        });
        const upcomingData = upcomingRes.data?.data ?? upcomingRes.data;
        const upcomingItems = upcomingData?.items ?? (Array.isArray(upcomingData) ? upcomingData : []);
        setUpcomingMovies(upcomingItems);

        // 3. Fetch Special Movies
        const specialRes = await apiClient.get<any>('/movies', {
          params: { Status: 'special', PageSize: 12 }
        });
        const specialData = specialRes.data?.data ?? specialRes.data;
        const specialItems = specialData?.items ?? (Array.isArray(specialData) ? specialData : []);
        setSpecialMovies(specialItems);

        // 4. Fetch Real Cinemas from backend
        try {
          const cinemasRes = await apiClient.get<any>('/cinemas', {
            params: { PageSize: 50 }
          });
          const cinemasData = cinemasRes.data?.data ?? cinemasRes.data;
          const cinemaItems = cinemasData?.items ?? (Array.isArray(cinemasData) ? cinemasData : []);
          if (cinemaItems.length > 0) {
            const mapped = cinemaItems.map((c: any) => ({
              cinemaId: c.cinemaId,
              name: c.cinemaName,
              address: c.address,
              city: c.cityName || (c.cityId === 1 ? 'Hồ Chí Minh' : c.cityId === 2 ? 'Hà Nội' : c.cityId === 3 ? 'Đà Nẵng' : 'Nha Trang'),
              imageUrl: c.imageUrl
            }));
            setCinemas(mapped);
          }
        } catch (cErr) {
          console.error('Error loading cinemas from backend', cErr);
        }


      } catch (err) {
        console.error('Error loading home cinema details', err);
      } finally {
        setLoading(false);
      }
    };

    loadHomeData();
  }, []);

  // Handle hash scrolling
  useEffect(() => {
    if (window.location.hash) {
      const id = window.location.hash.substring(1);
      const element = document.getElementById(id);
      if (element) {
        const timer = setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 150);
        return () => clearTimeout(timer);
      }
    }
  }, [window.location.hash, loading]);

  // Clientside search filter
  const filterMovies = (movieList: Movie[]) => {
    if (!searchQuery.trim()) return movieList;
    const query = searchQuery.toLowerCase();
    return movieList.filter((m) => {
      const genreNameStr = m.genreName || m.genre?.genreName || m.genre?.name || '';
      return (
        m.title.toLowerCase().includes(query) ||
        genreNameStr.toLowerCase().includes(query) ||
        (m.language && m.language.toLowerCase().includes(query))
      );
    });
  };

  const filteredShowing = filterMovies(showingMovies);
  const filteredUpcoming = filterMovies(upcomingMovies);
  const filteredSpecial = filterMovies(specialMovies);



  return (
    <div className="flex flex-col min-h-screen pb-20 overflow-hidden bg-background">

      {/* 2. Fullscreen Cinematic Hero Banner Slideshow */}
      {loading ? (
        <div className="px-6 md:px-12 py-8">
          <SkeletonLoader className="h-[75vh] w-full rounded-3xl" />
        </div>
      ) : (
        showingMovies.length > 0 && <HeroBanner movies={showingMovies.slice(0, 4)} />
      )}

      {/* Main Grid Content container */}
      <div className="max-w-7xl mx-auto w-full px-6 md:px-12 mt-16 md:mt-24 flex flex-col gap-20 text-left">

        {/* Search Bar Row */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-white/5 pb-8">
          <div>
            <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <Sparkles className="text-brand-gold animate-pulse" size={20} /> Lịch Chiếu Phim
            </h2>
            <p className="text-xs text-gray-500 mt-1">Khám phá các bom tấn đặc sắc đang công chiếu trên toàn quốc.</p>
          </div>
          <SearchBar value={searchQuery} onChange={setSearchQuery} />
        </div>

        {/* Tab Selection */}
        <div className="flex flex-col gap-8">
          <div className="flex justify-center border-b border-white/5 pb-0.5">
            <div className="flex gap-8 md:gap-12">
              <button
                onClick={() => setActiveMovieTab('showing')}
                className={`relative pb-4 text-xs md:text-sm font-black uppercase tracking-wider transition-all cursor-pointer ${
                  activeMovieTab === 'showing' ? 'text-brand-gold' : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                Phim Đang Chiếu
                {activeMovieTab === 'showing' && (
                  <motion.div
                    layoutId="activeMovieTabLine"
                    className="absolute bottom-0 inset-x-0 h-0.5 bg-brand-gold"
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                )}
              </button>

              <button
                onClick={() => setActiveMovieTab('upcoming')}
                className={`relative pb-4 text-xs md:text-sm font-black uppercase tracking-wider transition-all cursor-pointer ${
                  activeMovieTab === 'upcoming' ? 'text-brand-gold' : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                Phim Sắp Chiếu
                {activeMovieTab === 'upcoming' && (
                  <motion.div
                    layoutId="activeMovieTabLine"
                    className="absolute bottom-0 inset-x-0 h-0.5 bg-brand-gold"
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                )}
              </button>

              <button
                onClick={() => setActiveMovieTab('special')}
                className={`relative pb-4 text-xs md:text-sm font-black uppercase tracking-wider transition-all cursor-pointer ${
                  activeMovieTab === 'special' ? 'text-brand-gold' : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                Suất Chiếu Đặc Biệt
                {activeMovieTab === 'special' && (
                  <motion.div
                    layoutId="activeMovieTabLine"
                    className="absolute bottom-0 inset-x-0 h-0.5 bg-brand-gold"
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                )}
              </button>
            </div>
          </div>

          {/* Active Tab Movie List */}
          <div className="min-h-[400px]">
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex flex-col gap-3">
                    <SkeletonLoader className="h-64 w-full rounded-2xl animate-pulse" />
                    <SkeletonLoader className="h-4 w-3/4 rounded" variant="text" />
                  </div>
                ))}
              </div>
            ) : (
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeMovieTab}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.25 }}
                >
                  {activeMovieTab === 'showing' && (
                    filteredShowing.length === 0 ? (
                      <div className="py-16 text-center text-xs text-gray-500 bg-white/[0.01] border border-white/5 rounded-3xl">
                        Không tìm thấy phim đang chiếu phù hợp.
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
                        {filteredShowing.map((movie) => (
                          <MovieCard key={movie.id} movie={movie} />
                        ))}
                      </div>
                    )
                  )}

                  {activeMovieTab === 'upcoming' && (
                    filteredUpcoming.length === 0 ? (
                      <div className="py-16 text-center text-xs text-gray-500 bg-white/[0.01] border border-white/5 rounded-3xl">
                        Không tìm thấy phim sắp chiếu phù hợp.
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
                        {filteredUpcoming.map((movie) => (
                          <MovieCard key={movie.id} movie={movie} />
                        ))}
                      </div>
                    )
                  )}

                  {activeMovieTab === 'special' && (
                    filteredSpecial.length === 0 ? (
                      <div className="py-16 text-center text-xs text-gray-500 bg-white/[0.01] border border-white/5 rounded-3xl">
                        Không tìm thấy suất chiếu đặc biệt nào phù hợp.
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
                        {filteredSpecial.map((movie) => (
                          <MovieCard key={movie.id} movie={movie} />
                        ))}
                      </div>
                    )
                  )}
                </motion.div>
              </AnimatePresence>
            )}
          </div>
        </div>


        {/* 6. Cinema System Network Section (using CinemaCard) */}
        <div id="cinemas" className="flex flex-col gap-6">
          <div>
            <h3 className="text-lg font-black uppercase tracking-widest text-white border-l-4 border-brand-gold pl-3 flex items-center gap-2">
              <MapPin className="text-brand-gold" size={20} /> Hệ Thống Rạp Chiếu
            </h3>
            <p className="text-xs text-gray-500 mt-1 pl-4">Hệ thống phòng chiếu sang trọng bậc nhất với công nghệ âm thanh Dolby Atmos.</p>
          </div>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <SkeletonLoader key={i} className="h-44 rounded-3xl" />
              ))}
            </div>
          ) : cinemas.length === 0 ? (
            <div className="py-12 glass-panel rounded-2xl text-center text-xs text-gray-500">
              Không có dữ liệu rạp chiếu nào trên hệ thống.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {cinemas.slice(0, 3).map((cinema) => (
                <CinemaCard key={cinema.cinemaId} cinema={cinema} />
              ))}
            </div>
          )}
        </div>



      </div>
    </div>
  );
};
