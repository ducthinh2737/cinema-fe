import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, Clock } from 'lucide-react';
import { useDispatch } from 'react-redux';
import { selectShowtime } from '../../store/bookingSlice';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../contexts/ToastContext';
import type { Showtime } from '../../types';

interface CinemaShowtimesProps {
  showtimes: Showtime[];
  loading: boolean;
}

const parseApiDate = (dateOrString: Date | string) => {
  if (dateOrString instanceof Date) return dateOrString;
  if (typeof dateOrString === 'string') {
    if (dateOrString.includes('T') && !dateOrString.endsWith('Z') && !/[+-]\d{2}:\d{2}$/.test(dateOrString)) {
      return new Date(`${dateOrString}Z`);
    }
  }
  return new Date(dateOrString);
};

export const CinemaShowtimes: React.FC<CinemaShowtimesProps> = ({ showtimes, loading }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { isAuthenticated } = useAuth();
  const { showToast } = useToast();
  
  const [selectedDate, setSelectedDate] = useState<string>('');

  // Generate next 7 days for filtering
  const weekdays = ['CN', 'Th 2', 'Th 3', 'Th 4', 'Th 5', 'Th 6', 'Th 7'];
  const datesList = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d;
  });

  useEffect(() => {
    if (datesList.length > 0 && !selectedDate) {
      setSelectedDate(datesList[0].toDateString());
    }
  }, [selectedDate]);

  // Filter showtimes matching selectedDate
  const filteredShowtimes = showtimes.filter(s => {
    if (!selectedDate) return true;
    const sDate = parseApiDate(s.startTime);
    return sDate.toDateString() === selectedDate;
  });

  // Group showtimes by movie
  interface GroupedMovie {
    movieId: number;
    movieTitle: string;
    moviePoster?: string;
    movieSlug: string;
    duration: number;
    genre: string;
    language: string;
    showtimesByHall: Record<string, Showtime[]>;
  }

  const groupedMovies: Record<number, GroupedMovie> = {};

  filteredShowtimes.forEach(st => {
    const movieId = st.movieId;
    if (!groupedMovies[movieId]) {
      groupedMovies[movieId] = {
        movieId,
        movieTitle: st.movieTitle || st.movie?.title || 'Phim Chưa Đặt Tên',
        moviePoster: st.movie?.posterUrl || 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?q=80&w=150',
        movieSlug: st.movie?.slug || 'unknown-slug',
        duration: st.movie?.duration || 120,
        genre: st.movie?.genreName || st.movie?.genre?.genreName || st.movie?.genre?.name || 'Hành động',
        language: st.movie?.language || 'Phụ đề Tiếng Việt',
        showtimesByHall: {}
      };
    }

    const hallType = st.hall?.hallTypeName || '2D';
    if (!groupedMovies[movieId].showtimesByHall[hallType]) {
      groupedMovies[movieId].showtimesByHall[hallType] = [];
    }
    groupedMovies[movieId].showtimesByHall[hallType].push(st);
  });

  // Sort showtimes inside hall groups chronologically
  Object.values(groupedMovies).forEach(movie => {
    Object.keys(movie.showtimesByHall).forEach(hallType => {
      movie.showtimesByHall[hallType].sort((a, b) => 
        parseApiDate(a.startTime).getTime() - parseApiDate(b.startTime).getTime()
      );
    });
  });

  const handleSelectSlot = (st: Showtime) => {
    if (!isAuthenticated) {
      showToast('Vui lòng đăng nhập để tiến hành đặt vé xem phim.', 'warning');
      navigate('/login', { state: { from: window.location.pathname } });
      return;
    }
    dispatch(selectShowtime(st));
    navigate('/booking');
  };

  const formatDateLabel = (d: Date, idx: number) => {
    if (idx === 0) return { day: d.getDate(), sub: 'Hôm nay', full: d.toDateString() };
    if (idx === 1) return { day: d.getDate(), sub: 'Ngày mai', full: d.toDateString() };
    return {
      day: d.getDate(),
      sub: `${weekdays[d.getDay()]} - T${d.getMonth() + 1}`,
      full: d.toDateString()
    };
  };

  return (
    <div className="glass-panel p-6 md:p-8 rounded-3xl border border-white/5 text-left flex flex-col gap-6 relative overflow-hidden">
      <div>
        <h3 className="text-lg font-black text-white uppercase tracking-wider flex items-center gap-2">
          <Calendar className="text-brand" size={18} /> Lịch Chiếu Phim
        </h3>
        <p className="text-xs text-gray-400 mt-1">Chọn ngày chiếu và chọn suất chiếu để tiến hành mua vé trực tuyến.</p>
      </div>

      {/* Dynamic horizontal Date Tab selector */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none snap-x border-b border-white/5">
        {datesList.map((d, idx) => {
          const dateInfo = formatDateLabel(d, idx);
          const isSelected = dateInfo.full === selectedDate;
          return (
            <motion.button
              key={idx}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSelectedDate(dateInfo.full)}
              className={`relative shrink-0 flex flex-col items-center gap-1 py-2.5 px-5 rounded-2xl border text-center transition-all duration-300 snap-start select-none ${
                isSelected
                  ? 'bg-brand/10 border-brand/50 text-white shadow-[0_0_15px_rgba(229,9,20,0.15)]'
                  : 'bg-white/[0.015] border-white/5 hover:border-white/10 text-gray-400 hover:text-gray-200'
              }`}
            >
              {isSelected && (
                <motion.div
                  layoutId="activeShowtimeDate"
                  className="absolute inset-0 rounded-2xl border border-brand/50 pointer-events-none"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              <span className="text-base font-black leading-none">{dateInfo.day}</span>
              <span className="text-[9px] font-black uppercase tracking-wider leading-none mt-0.5">{dateInfo.sub}</span>
            </motion.button>
          );
        })}
      </div>

      {/* Movie listings with showtimes */}
      <div className="flex flex-col gap-6">
        {loading ? (
          <div className="flex flex-col gap-4">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="flex gap-4 p-4 bg-white/5 border border-white/5 rounded-2xl animate-pulse">
                <div className="w-16 h-24 bg-white/10 rounded-xl" />
                <div className="flex-1 flex flex-col gap-2">
                  <div className="h-5 bg-white/10 rounded w-1/3" />
                  <div className="h-4 bg-white/5 rounded w-1/4" />
                  <div className="flex gap-2 mt-2">
                    <div className="h-8 w-16 bg-white/10 rounded-xl" />
                    <div className="h-8 w-16 bg-white/10 rounded-xl" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : Object.keys(groupedMovies).length === 0 ? (
          <div className="text-center py-12 text-xs font-semibold text-gray-500 bg-white/[0.01] border border-dashed border-white/10 rounded-2xl select-none">
            Không có suất chiếu nào vào ngày đã chọn. Vui lòng chọn ngày khác!
          </div>
        ) : (
          <div className="flex flex-col gap-6 divide-y divide-white/5">
            {Object.values(groupedMovies).map((movie, mIdx) => (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: mIdx * 0.05 }}
                key={movie.movieId}
                className={`flex flex-col md:flex-row gap-5 text-left ${mIdx > 0 ? 'pt-6' : ''}`}
              >
                {/* Movie Poster & Basic metadata */}
                <div className="flex gap-4 md:w-[220px] shrink-0">
                  <img
                    src={movie.moviePoster}
                    alt={movie.movieTitle}
                    className="w-20 h-28 md:w-24 md:h-36 object-cover rounded-xl border border-white/10 shadow-glass"
                  />
                  <div className="flex flex-col gap-1 md:hidden">
                    <span className="text-[9px] font-black uppercase text-brand-gold">{movie.genre}</span>
                    <h4 className="text-sm font-black text-white line-clamp-2">{movie.movieTitle}</h4>
                    <span className="text-[10px] text-gray-500 font-semibold flex items-center gap-1 mt-0.5">
                      <Clock size={11} /> {movie.duration} phút
                    </span>
                  </div>
                </div>

                {/* Desktop and detailed view */}
                <div className="flex-1 flex flex-col gap-4">
                  {/* Title & info for desktop */}
                  <div className="hidden md:flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-brand/10 border border-brand/20 text-brand">
                        T18
                      </span>
                      <h4 className="text-base font-black text-white hover:text-brand transition-colors cursor-pointer" onClick={() => navigate(`/movie/${movie.movieSlug}`)}>
                        {movie.movieTitle}
                      </h4>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-gray-500 font-semibold mt-1">
                      <span className="text-brand-gold">{movie.genre}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1"><Clock size={11} /> {movie.duration} phút</span>
                      <span>•</span>
                      <span>{movie.language}</span>
                    </div>
                  </div>

                  {/* Showtimes by hall types */}
                  <div className="flex flex-col gap-4">
                    {Object.entries(movie.showtimesByHall).map(([hallType, slots]) => (
                      <div key={hallType} className="flex flex-col gap-2">
                        <span className="text-[10px] font-black uppercase text-gray-500 tracking-widest pl-1">
                          Định dạng {hallType}
                        </span>
                        
                        <div className="flex flex-wrap gap-2.5">
                          {slots.map(st => {
                            const timeStr = parseApiDate(st.startTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });
                            const lowSeats = st.availableSeats < 10;
                            return (
                              <motion.button
                                key={st.showtimeId}
                                whileHover={{ y: -2, scale: 1.03 }}
                                whileTap={{ scale: 0.97 }}
                                onClick={() => handleSelectSlot(st)}
                                className={`group/slot relative p-3 rounded-xl border text-left flex flex-col justify-between gap-1 transition-all duration-300 min-w-[90px] select-none ${
                                  st.availableSeats === 0
                                    ? 'opacity-35 bg-white/[0.01] border-white/5 cursor-not-allowed'
                                    : 'bg-white/[0.015] border-white/5 hover:border-brand-gold/30 hover:bg-white/[0.03] cursor-pointer'
                                }`}
                                disabled={st.availableSeats === 0}
                              >
                                <span className="text-sm font-black text-white group-hover/slot:text-brand-gold transition-colors">
                                  {timeStr}
                                </span>
                                
                                <span className={`text-[8px] font-bold leading-none ${
                                  st.availableSeats === 0
                                    ? 'text-red-500'
                                    : lowSeats
                                      ? 'text-brand animate-pulse'
                                      : 'text-emerald-400'
                                }`}>
                                  {st.availableSeats === 0
                                    ? 'Hết vé'
                                    : lowSeats
                                      ? `Còn ${st.availableSeats} chỗ`
                                      : `${st.availableSeats} ghế trống`}
                                </span>
                              </motion.button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
