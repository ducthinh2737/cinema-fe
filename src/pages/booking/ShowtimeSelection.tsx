import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Info, X } from 'lucide-react';
import { selectShowtime } from '../../store/bookingSlice';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../contexts/ToastContext';
import { apiClient } from '../../api/client';
import type { Movie, Showtime, Cinema } from '../../types';
import { SkeletonLoader } from '../../components/ui/SkeletonLoader';

const parseApiDate = (dateOrString: Date | string) => {
  if (dateOrString instanceof Date) return dateOrString;
  if (typeof dateOrString === 'string') {
    if (dateOrString.includes('T') && !dateOrString.endsWith('Z') && !/[+-]\d{2}:\d{2}$/.test(dateOrString)) {
      return new Date(`${dateOrString}Z`);
    }
  }
  return new Date(dateOrString);
};

// ─────────────────────────────────────────────
// MODAL COMPONENT (dùng từ trang danh sách phim)
// ─────────────────────────────────────────────
interface ShowtimeModalProps {
  movie: Movie;
  showtimes: Showtime[];
  cinemas: Cinema[];
  onClose: () => void;
  onSelectShowtime: (st: Showtime) => void;
}

export const ShowtimeModal: React.FC<ShowtimeModalProps> = ({
  movie,
  showtimes,
  cinemas,
  onClose,
  onSelectShowtime,
}) => {
  const [selectedDate, setSelectedDate] = useState<string>('');

  const weekdays = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  const months = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];

  const availableDates = Array.from(
    new Set(
      showtimes
        .filter(s => parseApiDate(s.startTime).getTime() > Date.now())
        .map(s => parseApiDate(s.startTime).toDateString())
    )
  ).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

  useEffect(() => {
    if (availableDates.length > 0 && !selectedDate) {
      setSelectedDate(availableDates[0]);
    }
  }, [availableDates.length]);

  const filteredShowtimes = showtimes.filter(s => {
    const matchesDate = selectedDate ? parseApiDate(s.startTime).toDateString() === selectedDate : true;
    const isFuture = parseApiDate(s.startTime).getTime() > Date.now();
    return matchesDate && isFuture;
  });

  const groupedByCinema = cinemas.map(cinema => {
    const cinemaShowtimes = filteredShowtimes.filter(s => s.hall?.cinemaId === cinema.cinemaId);
    const byHallType: Record<string, Showtime[]> = {};
    cinemaShowtimes.forEach(st => {
      const typeName = st.hall?.hallTypeName || '2D';
      if (!byHallType[typeName]) byHallType[typeName] = [];
      byHallType[typeName].push(st);
    });
    return { cinema, byHallType, total: cinemaShowtimes.length };
  }).filter(g => g.total > 0);

  const isLateShow = (time: string) => parseApiDate(time).getHours() >= 22;

  const formatDateTab = (dateStr: string) => {
    const d = new Date(dateStr);
    const today = new Date().toDateString();
    const isToday = d.toDateString() === today;
    return {
      day: d.getDate(),
      month: months[d.getMonth()],
      weekday: weekdays[d.getDay()],
      isToday,
    };
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ backgroundColor: 'rgba(0,0,0,0.75)' }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl shadow-2xl"
          style={{ backgroundColor: '#111', border: '1px solid rgba(255,255,255,0.08)' }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 z-10 px-6 py-4 border-b border-white/8" style={{ backgroundColor: '#111' }}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Lịch chiếu</p>
                <h2 className="text-sm font-black text-white leading-snug line-clamp-2">{movie.title}</h2>
              </div>
              <button
                onClick={onClose}
                className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full border border-white/10 text-gray-400 hover:text-white hover:border-white/30 transition-colors mt-0.5"
              >
                <X size={13} />
              </button>
            </div>

            {/* Cinema name (if only one) */}
            {cinemas.length === 1 && (
              <p className="text-xs font-black text-brand mt-3">Rạp {cinemas[0].name}</p>
            )}

            {/* Date Tabs — giống BetaCinemas */}
            {availableDates.length > 0 && (
              <div className="flex gap-0 mt-4 border-b border-white/8">
                {availableDates.map(dateStr => {
                  const { day, month, weekday, isToday } = formatDateTab(dateStr);
                  const isSelected = selectedDate === dateStr;
                  return (
                    <button
                      key={dateStr}
                      onClick={() => setSelectedDate(dateStr)}
                      className={`flex flex-col items-center px-4 py-2.5 border-b-2 transition-all shrink-0 ${isSelected
                          ? 'border-brand text-brand'
                          : 'border-transparent text-gray-500 hover:text-gray-300'
                        }`}
                    >
                      <span className="text-xl font-black leading-none">{day}</span>
                      <span className="text-[9px] font-bold mt-0.5">
                        {month}/{isToday ? 'Hôm nay' : weekday}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Body */}
          <div className="px-6 py-4">
            {groupedByCinema.length === 0 ? (
              <div className="py-10 text-center flex flex-col items-center gap-3">
                <Info className="text-gray-600" size={32} />
                <p className="text-sm font-bold text-gray-400">Không có suất chiếu nào</p>
                <p className="text-xs text-gray-500">Vui lòng chọn ngày khác.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                {groupedByCinema.map(({ cinema, byHallType }) => (
                  <div key={cinema.cinemaId}>
                    {/* Cinema name (nếu nhiều rạp) */}
                    {cinemas.length > 1 && (
                      <h3 className="text-xs font-black text-white mb-3">{cinema.name}</h3>
                    )}

                    {Object.entries(byHallType).map(([hallType, sts]) => (
                      <div key={hallType} className="mb-4 last:mb-0">
                        {/* Hall type — như BetaCinemas */}
                        <p className="text-[11px] font-black uppercase tracking-wider text-gray-400 mb-3">
                          {hallType}
                        </p>

                        {/* Showtime pills */}
                        <div className="flex flex-wrap gap-2">
                          {sts
                            .sort((a, b) => parseApiDate(a.startTime).getTime() - parseApiDate(b.startTime).getTime())
                            .map(st => {
                              const d = parseApiDate(st.startTime);
                              const time = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });
                              const late = isLateShow(st.startTime);
                              const dateLabel = `${d.getDate()}/${String(d.getMonth() + 1).padStart(2, '0')}`;

                              const isSneak = movie?.releaseDate ? parseApiDate(st.startTime) < parseApiDate(movie.releaseDate) : false;

                              return (
                                <button
                                  key={st.showtimeId}
                                  onClick={() => onSelectShowtime(st)}
                                  className={`flex flex-col items-center min-w-[72px] px-3 py-2.5 rounded-lg border transition-all cursor-pointer relative overflow-hidden ${
                                    isSneak
                                      ? 'border-purple-500/40 bg-purple-500/10 hover:bg-purple-500/20 hover:border-purple-500/60'
                                      : late
                                        ? 'border-brand/40 bg-brand/8 hover:bg-brand/15'
                                        : 'border-white/12 bg-white/[0.04] hover:border-brand/50 hover:bg-brand/8'
                                  }`}
                                >
                                  {isSneak && (
                                    <span className="absolute top-0 right-0 bg-gradient-to-l from-purple-600 to-pink-600 text-white text-[7px] font-black uppercase px-1 py-0.5 rounded-bl-md leading-none tracking-wider scale-90 origin-top-right">
                                      SỚM
                                    </span>
                                  )}
                                  <span className={`text-sm font-black leading-none ${isSneak ? 'text-purple-400' : late ? 'text-brand' : 'text-white'}`}>
                                    {time}
                                  </span>
                                  {late && !isSneak && (
                                    <span className="text-[9px] text-brand/70 font-bold mt-0.5">{dateLabel}</span>
                                  )}
                                  {isSneak && (
                                    <span className="text-[9px] text-purple-400/80 font-bold mt-0.5">{dateLabel}</span>
                                  )}
                                  <span className="text-[9px] text-gray-500 font-semibold mt-1">
                                    {st.availableSeats} ghế trống
                                  </span>
                                </button>
                              );
                            })}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}

                {/* Late show notice */}
                {filteredShowtimes.some(s => isLateShow(s.startTime)) && (
                  <div className="flex items-center gap-2 pt-1 border-t border-white/5">
                    <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'rgba(var(--brand-rgb),0.2)', border: '1px solid rgba(var(--brand-rgb),0.4)' }} />
                    <span className="text-[10px] text-gray-500 font-semibold">Suất chiếu muộn từ 22h00</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// ─────────────────────────────────────────────
// TRANG SHOWTIME SELECTION (route riêng)
// ─────────────────────────────────────────────
export const ShowtimeSelection: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { showToast } = useToast();

  const [movie, setMovie] = useState<Movie | null>(null);
  const [showtimes, setShowtimes] = useState<Showtime[]>([]);
  const [cinemas, setCinemas] = useState<Cinema[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingShowtimes, setLoadingShowtimes] = useState(true);
  const [selectedCinemaId, setSelectedCinemaId] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');

  useEffect(() => {
    const fetchMovie = async () => {
      setLoading(true);
      try {
        const res = await apiClient.get<any>(`/movies/slug/${slug}`);
        const responseData = res.data;
        const movieData = responseData?.data ?? responseData;
        setMovie(movieData);
        if (movieData) {
          fetchShowtimes(movieData.id);
        }
      } catch {
        showToast('Không tìm thấy thông tin phim.', 'error');
        navigate('/');
      } finally {
        setLoading(false);
      }
    };
    if (slug) fetchMovie();
  }, [slug]);

  const fetchShowtimes = async (movieId: number) => {
    setLoadingShowtimes(true);
    try {
      const res = await apiClient.get(`/showtimes/movie/${movieId}`);
      const data = res.data?.data ?? res.data;
      const items: Showtime[] = Array.isArray(data) ? data
        : Array.isArray(data?.items) ? data.items : [];
      setShowtimes(items);
      const uniqueCinemaIds = Array.from(new Set(items.map((s: Showtime) => s.hall?.cinemaId).filter(Boolean))) as number[];
      if (uniqueCinemaIds.length > 0) {
        const cinemaResponses = await Promise.all(uniqueCinemaIds.map(id => apiClient.get<any>(`/cinemas/${id}`)));
        setCinemas(cinemaResponses.map(r => {
          const d = r.data?.data ?? r.data;
          return {
            cinemaId: d.cinemaId,
            name: d.cinemaName || d.name || '',
            address: d.address,
            city: d.cityName || '',
            imageUrl: d.imageUrl
          };
        }));
      }
    } catch {
      showToast('Không thể tải lịch chiếu.', 'error');
    } finally {
      setLoadingShowtimes(false);
    }
  };

  const availableDates = Array.from(
    new Set(
      showtimes
        .filter(s => parseApiDate(s.startTime).getTime() > Date.now())
        .map(s => parseApiDate(s.startTime).toDateString())
    )
  ).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

  useEffect(() => {
    if (availableDates.length > 0) {
      if (!selectedDate || !availableDates.includes(selectedDate)) {
        setSelectedDate(availableDates[0]);
      }
    } else {
      setSelectedDate('');
    }
  }, [availableDates.length, selectedDate]);

  const filteredShowtimes = showtimes.filter(s => {
    const matchesCinema = selectedCinemaId ? s.hall?.cinemaId === selectedCinemaId : true;
    const matchesDate = selectedDate ? parseApiDate(s.startTime).toDateString() === selectedDate : true;
    const isFuture = parseApiDate(s.startTime).getTime() > Date.now();
    return matchesCinema && matchesDate && isFuture;
  });

  // Group showtimes by cinema and format
  const groupedShowtimes = cinemas
    .filter(c => selectedCinemaId === null || c.cinemaId === selectedCinemaId)
    .map(cinema => {
      const cinemaShowtimes = filteredShowtimes.filter(s => s.hall?.cinemaId === cinema.cinemaId);
      const byFormat: Record<string, Showtime[]> = {};
      cinemaShowtimes.forEach(st => {
        const formatName = st.hall?.hallTypeName || '2D';
        if (!byFormat[formatName]) {
          byFormat[formatName] = [];
        }
        byFormat[formatName].push(st);
      });
      return { cinema, byFormat, total: cinemaShowtimes.length };
    })
    .filter(g => g.total > 0);

  const handleSelectShowtime = (st: Showtime) => {
    if (!isAuthenticated) {
      showToast('Vui lòng đăng nhập để đặt vé', 'warning');
      navigate('/login', { state: { from: `/movie/${slug}/showtimes` } });
      return;
    }
    dispatch(selectShowtime({ ...st, movie: movie || undefined }));
    navigate('/booking');
  };

  const formatVietnameseDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const weekdayNum = d.getDay();
    const weekdayStr = weekdayNum === 0 ? 'Chủ Nhật' : `Thứ ${weekdayNum + 1}`;
    return `${weekdayStr}, ${d.getDate()} thg ${d.getMonth() + 1}`;
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 flex flex-col gap-6">
        <SkeletonLoader className="h-40 w-full rounded-2xl" />
        <SkeletonLoader className="h-16 w-full rounded-xl" />
        <SkeletonLoader className="h-32 w-full rounded-xl" />
      </div>
    );
  }

  if (!movie) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen pb-32 bg-background text-left"
    >
      <div className="max-w-4xl mx-auto px-4 pt-6 flex flex-col gap-6">
        {/* Back */}
        <Link
          to={`/movie/${slug}`}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors font-bold w-fit"
        >
          <ChevronLeft size={14} /> Trở về chi tiết phim
        </Link>

        {/* Movie Info Header */}
        <div className="flex gap-4 p-4 bg-white/[0.03] border border-white/5 rounded-2xl">
          <img
            src={movie.posterUrl || 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?q=80&w=200'}
            alt={movie.title}
            className="w-16 h-24 object-cover rounded-xl border border-white/10 shrink-0"
          />
          <div className="flex flex-col justify-center py-1">
            <h1 className="text-base font-extrabold text-white leading-snug mb-1">{movie.title}</h1>
            <p className="text-[11px] text-gray-400 font-semibold">
              {movie.genreName || movie.genre?.genreName || movie.genre?.name || 'Phim'} | {movie.duration} phút | {movie.language}
            </p>
          </div>
        </div>

        {/* Title */}
        <h2 className="text-xl font-extrabold text-white uppercase tracking-wider border-b border-white/5 pb-3">
          Đặt Lịch Chiếu
        </h2>

        {/* Filters */}
        <div className="flex flex-col gap-6 bg-white/[0.01] border border-white/5 p-6 rounded-2xl">
          {/* Select Cinema */}
          <div className="flex flex-col gap-2.5">
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
              Chọn Rạp Chiếu
            </span>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setSelectedCinemaId(null)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                  selectedCinemaId === null
                    ? 'bg-brand border-brand text-white shadow-brand'
                    : 'bg-white/5 border-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                }`}
              >
                Tất Cả Rạp
              </button>
              {cinemas.map(c => (
                <button
                  key={c.cinemaId}
                  onClick={() => setSelectedCinemaId(c.cinemaId)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                    selectedCinemaId === c.cinemaId
                      ? 'bg-brand border-brand text-white shadow-brand'
                      : 'bg-white/5 border-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          {/* Select Date */}
          <div className="flex flex-col gap-2.5">
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
              Chọn Ngày Chiếu
            </span>
            <div className="flex gap-2 flex-wrap">
              {availableDates.map(d => (
                <button
                  key={d}
                  onClick={() => setSelectedDate(d)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                    selectedDate === d
                      ? 'bg-brand border-brand text-white shadow-brand'
                      : 'bg-white/5 border-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {formatVietnameseDate(d)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Showtimes Grid */}
        {loadingShowtimes ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            <SkeletonLoader className="h-28 rounded-2xl" />
            <SkeletonLoader className="h-28 rounded-2xl" />
            <SkeletonLoader className="h-28 rounded-2xl" />
          </div>
        ) : groupedShowtimes.length === 0 ? (
          <div className="border border-white/5 bg-white/[0.01] rounded-2xl p-12 text-center flex flex-col items-center gap-3">
            <Info className="text-gray-600" size={32} />
            <p className="text-xs font-bold text-gray-400">Không có suất chiếu nào phù hợp</p>
            <p className="text-[11px] text-gray-500">Vui lòng chọn tiêu chí lọc khác.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            {groupedShowtimes.map(({ cinema, byFormat }) => (
              <div key={cinema.cinemaId} className="bg-[#111] border border-white/10 rounded-2xl p-6 flex flex-col gap-6">
                {/* Cinema Name & Address */}
                <div className="border-b border-white/5 pb-4">
                  <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                    {cinema.name}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">{cinema.address}</p>
                </div>

                {/* Formats under this Cinema */}
                {Object.entries(byFormat).map(([formatName, sts]) => (
                  <div key={formatName} className="flex flex-col gap-3">
                    <span className="text-[11px] font-black uppercase tracking-wider text-gray-400">
                      {formatName}
                    </span>
                    
                    <div className="grid grid-cols-3 sm:grid-cols-6 md:grid-cols-8 gap-3">
                      {sts
                        .sort((a, b) => parseApiDate(a.startTime).getTime() - parseApiDate(b.startTime).getTime())
                        .map(st => {
                          const d = parseApiDate(st.startTime);
                          const time = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });
                          const late = d.getHours() >= 22;
                          const isSneak = movie.releaseDate ? parseApiDate(st.startTime) < parseApiDate(movie.releaseDate) : false;

                          return (
                            <button
                              key={st.showtimeId}
                              onClick={() => handleSelectShowtime(st)}
                              className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all cursor-pointer relative overflow-hidden group select-none ${
                                isSneak
                                  ? 'border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 hover:border-purple-500/60'
                                  : late
                                    ? 'border-brand/40 bg-brand/8 hover:bg-brand/15'
                                    : 'border-white/5 bg-white/[0.02] hover:border-brand/30 hover:bg-white/[0.04]'
                              }`}
                            >
                              {isSneak && (
                                <span className="absolute top-0 right-0 bg-gradient-to-l from-purple-600 to-pink-600 text-white text-[6px] font-black uppercase px-1 py-0.5 rounded-bl-md leading-none tracking-wider scale-90 origin-top-right">
                                  SỚM
                                </span>
                              )}
                              <span className={`text-base font-black transition-colors ${isSneak ? 'text-purple-400' : late ? 'text-brand' : 'text-white'}`}>
                                {time}
                              </span>
                              <span className="text-[9px] text-gray-500 font-semibold mt-1">
                                {st.availableSeats} ghế trống
                              </span>
                            </button>
                          );
                        })}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* Late show legend */}
        {!loadingShowtimes && filteredShowtimes.some(s => parseApiDate(s.startTime).getHours() >= 22) && (
          <div className="flex items-center gap-2 mt-4 px-2">
            <div className="w-3.5 h-3.5 rounded bg-brand/8 border border-brand/40" />
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Suất chiếu muộn từ 22h00</span>
          </div>
        )}
      </div>
    </motion.div>
  );
};