import React, { useState, useEffect, useMemo } from 'react';
import { 
  Sparkles, 
  MapPin 
} from 'lucide-react';
import { apiClient } from '../api/client';
import type { Movie, Cinema } from '../types';

// GSAP Animations Integration
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Importing existing and newly created components
import { HeroBanner } from '../components/movie/HeroBanner';
import { MovieCard } from '../components/movie/MovieCard';
import { SearchBar } from '../components/ui/SearchBar';
import { SkeletonLoader } from '../components/ui/SkeletonLoader';
import { CinemaCard } from '../components/cinema/CinemaCard';

// Register GSAP plugins
gsap.registerPlugin(ScrollTrigger);

export const Home: React.FC = () => {
  const [showingMovies, setShowingMovies] = useState<Movie[]>([]);
  const [upcomingMovies, setUpcomingMovies] = useState<Movie[]>([]);
  const [specialMovies, setSpecialMovies] = useState<Movie[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeMovieTab, setActiveMovieTab] = useState<'showing' | 'upcoming' | 'special'>('showing');
  const [cinemas, setCinemas] = useState<Cinema[]>([]);

  const bannerMovies = useMemo(() => {
    const featuredShowing = showingMovies.filter(m => m.isFeatured);
    const featuredUpcoming = upcomingMovies.filter(m => m.isFeatured);
    return [...featuredShowing, ...featuredUpcoming];
  }, [showingMovies, upcomingMovies]);

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
              name: c.cinemaName || c.name || '',
              address: c.address,
              city: c.cityName || (c.cityId === 1 ? 'Hồ Chí Minh' : c.cityId === 2 ? 'Hà Nội' : c.cityId === 3 ? 'Đà Nẵng' : 'Nha Trang'),
              imageUrl: c.imageUrl,
              logoUrl: c.logoUrl,
              bannerUrl: c.bannerUrl,
              galleryUrls: c.galleryUrls,
              phone: c.phone,
              email: c.email
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

  // ==========================================
  // GSAP SCROLL-TRIGGER ANIMATIONS
  // ==========================================
  useEffect(() => {
    if (loading) return;



    // Animate cinema section header
    gsap.fromTo('.cinema-header', 
      { opacity: 0, x: -30 },
      {
        opacity: 1,
        x: 0,
        duration: 0.8,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: '.cinema-section',
          start: 'top 85%',
          toggleActions: 'play none none none'
        }
      }
    );

    // Stagger animate cinema cards
    gsap.fromTo('.cinema-card-item', 
      { opacity: 0, scale: 0.95, y: 20 },
      {
        opacity: 1,
        scale: 1,
        y: 0,
        duration: 0.8,
        stagger: 0.15,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: '.cinema-cards-grid',
          start: 'top 80%',
          toggleActions: 'play none none none'
        }
      }
    );

    return () => {
      // Clean up all ScrollTrigger animations on unmount
      ScrollTrigger.getAll().forEach(t => t.kill());
    };
  }, [loading]);

  // Stagger animate movie cards when tab, query or loading changes
  useEffect(() => {
    if (loading) return;

    // Small delay to ensure React has fully mounted the new elements in the DOM before GSAP queries them
    const timer = setTimeout(() => {
      gsap.fromTo('.movie-card-item', 
        { opacity: 0, y: 30 },
        { 
          opacity: 1, 
          y: 0, 
          duration: 0.6, 
          stagger: 0.06,
          ease: 'power2.out'
        }
      );
    }, 50);

    return () => clearTimeout(timer);
  }, [activeMovieTab, loading, searchQuery]);

  return (
    <div className="relative flex flex-col min-h-screen pb-32 overflow-hidden bg-[#07070a] text-gray-200">
      
      {/* Background Decorative Blur Orbs */}
      <div className="absolute top-[30vh] left-[-15vw] w-[50vw] h-[50vw] rounded-full bg-brand/5 blur-[120px] pointer-events-none" />
      <div className="absolute top-[90vh] right-[-15vw] w-[60vw] h-[60vw] rounded-full bg-brand-gold/5 blur-[160px] pointer-events-none" />
      <div className="absolute top-[180vh] left-[20vw] w-[40vw] h-[40vw] rounded-full bg-brand/5 blur-[130px] pointer-events-none" />

      {/* Subtle Mesh Grid Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

      {/* 1. Fullscreen Cinematic Hero Banner Slideshow */}
      {loading ? (
        <div className="px-6 md:px-12 py-8">
          <SkeletonLoader className="h-[75vh] w-full rounded-[32px]" />
        </div>
      ) : (
        bannerMovies.length > 0 && (
          <HeroBanner movies={bannerMovies} />
        )
      )}

      {/* Main Container */}
      <div className="max-w-7xl mx-auto w-full px-6 md:px-12 mt-12 md:mt-20 flex flex-col gap-24 text-left relative z-10">
        
        {/* Search & Movies Tabs Row */}
        <section className="flex flex-col gap-10">
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-white/5 pb-6">
            <div>
              <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                <Sparkles className="text-brand-gold animate-pulse" size={22} /> Lịch Chiếu Phim
              </h2>
              <p className="text-xs text-gray-500 mt-1">Khám phá các siêu phẩm điện ảnh đang làm mưa làm gió phòng vé.</p>
            </div>
            
            <SearchBar value={searchQuery} onChange={setSearchQuery} />
          </div>

          {/* Sleek Segmented Switcher Tab Bar */}
          <div className="flex justify-center">
            <div className="flex p-1 bg-white/[0.02] border border-white/5 rounded-2xl w-fit backdrop-blur-md">
              <button
                onClick={() => setActiveMovieTab('showing')}
                className={`relative px-6 py-2.5 rounded-xl text-xs md:text-sm font-black uppercase tracking-wider transition-all cursor-pointer ${
                  activeMovieTab === 'showing' ? 'text-white bg-brand shadow-lg shadow-brand/20' : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                Phim Đang Chiếu
              </button>

              <button
                onClick={() => setActiveMovieTab('upcoming')}
                className={`relative px-6 py-2.5 rounded-xl text-xs md:text-sm font-black uppercase tracking-wider transition-all cursor-pointer ${
                  activeMovieTab === 'upcoming' ? 'text-white bg-brand shadow-lg shadow-brand/20' : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                Phim Sắp Chiếu
              </button>

              <button
                onClick={() => setActiveMovieTab('special')}
                className={`relative px-6 py-2.5 rounded-xl text-xs md:text-sm font-black uppercase tracking-wider transition-all cursor-pointer ${
                  activeMovieTab === 'special' ? 'text-white bg-brand shadow-lg shadow-brand/20' : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                Suất Chiếu Đặc Biệt
              </button>
            </div>
          </div>

          {/* Active Tab Movie List */}
          <div className="min-h-[400px]">
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex flex-col gap-3">
                    <SkeletonLoader className="h-72 w-full rounded-2xl animate-pulse" />
                    <SkeletonLoader className="h-4 w-3/4 rounded" variant="text" />
                  </div>
                ))}
              </div>
            ) : (
              <div>
                {activeMovieTab === 'showing' && (
                  filteredShowing.length === 0 ? (
                    <div className="py-24 text-center text-xs text-gray-500 bg-white/[0.01] border border-white/5 rounded-[32px]">
                      Không tìm thấy phim đang chiếu phù hợp.
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
                      {filteredShowing.map((movie) => (
                        <div key={movie.id} className="movie-card-item opacity-0">
                          <MovieCard movie={movie} />
                        </div>
                      ))}
                    </div>
                  )
                )}

                {activeMovieTab === 'upcoming' && (
                  filteredUpcoming.length === 0 ? (
                    <div className="py-24 text-center text-xs text-gray-500 bg-white/[0.01] border border-white/5 rounded-[32px]">
                      Không tìm thấy phim sắp chiếu phù hợp.
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
                      {filteredUpcoming.map((movie) => (
                        <div key={movie.id} className="movie-card-item opacity-0">
                          <MovieCard movie={movie} />
                        </div>
                      ))}
                    </div>
                  )
                )}

                {activeMovieTab === 'special' && (
                  filteredSpecial.length === 0 ? (
                    <div className="py-24 text-center text-xs text-gray-500 bg-white/[0.01] border border-white/5 rounded-[32px]">
                      Không tìm thấy suất chiếu đặc biệt nào phù hợp.
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
                      {filteredSpecial.map((movie) => (
                        <div key={movie.id} className="movie-card-item opacity-0">
                          <MovieCard movie={movie} />
                        </div>
                      ))}
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        </section>



        {/* 6. Cinema System Network Section (using CinemaCard) */}
        <section id="cinemas" className="cinema-section flex flex-col gap-6">
          <div className="cinema-header opacity-0">
            <h3 className="text-lg font-black uppercase tracking-widest text-white border-l-4 border-brand pl-3 flex items-center gap-2">
              <MapPin className="text-brand" size={20} /> Hệ Thống Rạp Chiếu
            </h3>
            <p className="text-xs text-gray-500 mt-1 pl-4">Hệ thống phòng chiếu sang trọng bậc nhất với chất lượng dịch vụ chuyên nghiệp.</p>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <SkeletonLoader key={i} className="h-44 rounded-[24px]" />
              ))}
            </div>
          ) : cinemas.length === 0 ? (
            <div className="py-16 bg-white/[0.01] border border-white/5 rounded-3xl text-center text-xs text-gray-500">
              Không có dữ liệu rạp chiếu nào trên hệ thống.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 cinema-cards-grid">
              {cinemas.slice(0, 3).map((cinema) => (
                <div key={cinema.cinemaId} className="cinema-card-item opacity-0">
                  <CinemaCard cinema={cinema} />
                </div>
              ))}
            </div>
          )}
        </section>

      </div>
    </div>
  );
};
