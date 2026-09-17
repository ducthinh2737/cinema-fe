import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useDispatch } from 'react-redux';
import { selectShowtime } from '../../store/bookingSlice';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../contexts/ToastContext';
import { getImageUrl } from '../../api/client';
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
  const weekdays = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
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

  // Filter showtimes matching selectedDate and in the future
  const filteredShowtimes = showtimes.filter(s => {
    const sDate = parseApiDate(s.startTime);
    const matchesDate = !selectedDate || sDate.toDateString() === selectedDate;
    const isFuture = sDate.getTime() > Date.now();
    return matchesDate && isFuture;
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
        moviePoster: getImageUrl(st.movie?.posterUrl) || 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?q=80&w=150',
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
      sub: weekdays[d.getDay()],
      full: d.toDateString()
    };
  };

  return (
    <div className="text-left flex flex-col gap-6 relative">
      <div>
        <h3 className="text-lg font-black text-white uppercase tracking-wider">
          Lịch Chiếu Phim
        </h3>
        <p className="text-xs text-gray-400 mt-1">Chọn ngày chiếu và chọn suất chiếu để tiến hành mua vé trực tuyến.</p>
      </div>

      {/* Dynamic horizontal Date Tab selector */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none snap-x border-b border-white/5">
        {datesList.map((d, idx) => {
          const dateInfo = formatDateLabel(d, idx);
          const isSelected = dateInfo.full === selectedDate;
          return (
            <button
              key={idx}
              onClick={() => setSelectedDate(dateInfo.full)}
              className={`relative shrink-0 flex flex-col items-center gap-1 py-2 px-5 rounded-2xl border text-center transition-all duration-300 snap-start select-none ${
                isSelected
                  ? 'bg-brand/10 border-brand/50 text-white shadow-lg shadow-brand/10'
                  : 'bg-white/[0.015] border-white/5 hover:border-white/10 text-gray-400 hover:text-gray-200'
              }`}
            >
              <span className="text-base font-black leading-none">{dateInfo.day}</span>
              <span className="text-[9px] font-black uppercase tracking-wider leading-none mt-1">{dateInfo.sub}</span>
            </button>
          );
        })}
      </div>

      {/* Movie listings with showtimes */}
      <div className="flex flex-col gap-6">
        {loading ? (
          <div className="flex flex-col gap-4">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="flex gap-4 p-4 bg-white/5 border border-white/5 rounded-2xl animate-pulse h-28">
                <div className="w-16 h-24 bg-white/10 rounded-xl" />
                <div className="flex-1 flex flex-col gap-2">
                  <div className="h-5 bg-white/10 rounded w-1/3" />
                  <div className="h-4 bg-white/5 rounded w-1/4" />
                </div>
              </div>
            ))}
          </div>
        ) : Object.keys(groupedMovies).length === 0 ? (
          <div className="text-center py-12 text-xs font-semibold text-gray-500 bg-white/[0.01] border border-dashed border-white/10 rounded-2xl select-none">
            Không có suất chiếu nào vào ngày đã chọn. Vui lòng chọn ngày khác!
          </div>
        ) : (
          <div className="flex flex-col gap-8 divide-y divide-white/5">
            {Object.values(groupedMovies).map((movie, mIdx) => (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: mIdx * 0.05 }}
                key={movie.movieId}
                className={`flex flex-col gap-5 text-left ${mIdx > 0 ? 'pt-8' : ''}`}
              >
                {/* Header Row: Movie info */}
                <div className="flex items-start gap-4">
                  <img
                    src={movie.moviePoster}
                    alt={movie.movieTitle}
                    className="w-14 h-20 object-cover rounded-xl border border-white/10 shrink-0"
                  />
                  <div className="flex flex-col">
                    <h4 
                      className="text-base font-black text-white uppercase tracking-wide cursor-pointer hover:text-brand transition-colors"
                      onClick={() => navigate(`/movie/${movie.movieSlug}`)}
                    >
                      {movie.movieTitle}
                    </h4>
                    <div className="flex items-center gap-3 text-xs text-gray-400 font-bold mt-1.5">
                      <span className="text-brand-gold">{movie.genre}</span>
                      <span>•</span>
                      <span>{movie.duration} phút</span>
                      <span>•</span>
                      <span>{movie.language}</span>
                    </div>
                  </div>
                </div>

                {/* Showtimes Pills List */}
                <div className="flex flex-wrap gap-3 pt-1">
                  {Object.entries(movie.showtimesByHall).flatMap(([hallType, slots]) =>
                    slots.map(st => {
                      const timeStr = parseApiDate(st.startTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });
                      const lowSeats = st.availableSeats < 10;
                      const isFull = st.availableSeats === 0;
                      const badgeColor = isFull 
                        ? 'bg-red-500/10 text-red-400 border-red-500/20' 
                        : lowSeats 
                          ? 'bg-brand-gold/10 text-brand-gold border-brand-gold/20' 
                          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';

                      return (
                        <button
                          key={st.showtimeId}
                          onClick={() => handleSelectSlot(st)}
                          disabled={isFull}
                          className={`group/slot inline-flex items-center gap-3 px-4 py-2 border rounded-2xl transition-all duration-300 select-none ${
                            isFull
                              ? 'opacity-35 bg-white/[0.01] border-white/5 cursor-not-allowed'
                              : 'bg-white/[0.015] border-white/5 hover:border-brand/50 hover:bg-brand/10 cursor-pointer'
                          }`}
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-black text-white transition-colors">
                              {timeStr}
                            </span>
                            <span className="text-[9px] font-bold text-gray-500 transition-colors uppercase">
                              {hallType}
                            </span>
                          </div>
                          <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-md border ${badgeColor} transition-colors`}>
                            {isFull ? 'Hết vé' : lowSeats ? `Còn ${st.availableSeats} chỗ` : `${st.availableSeats} ghế trống`}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
