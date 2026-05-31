import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Film, MapPin, Calendar, Clock, Ticket } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiClient } from '../../api/client';
import { selectShowtime } from '../../store/bookingSlice';
import { useToast } from '../../contexts/ToastContext';
import type { Movie, Showtime, Cinema } from '../../types';

interface QuickBookingProps {
  movies: Movie[];
}

export const QuickBooking: React.FC<QuickBookingProps> = ({ movies }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { showToast } = useToast();
  
  // Auth state check
  const { isAuthenticated } = useSelector((state: any) => state.auth);

  // Selected state IDs
  const [selectedMovieId, setSelectedMovieId] = useState<number | null>(null);
  const [selectedCinemaId, setSelectedCinemaId] = useState<number | null>(null);
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null);
  const [selectedShowtimeId, setSelectedShowtimeId] = useState<number | null>(null);

  // Options states
  const [showtimes, setShowtimes] = useState<Showtime[]>([]);
  const [cinemas, setCinemas] = useState<Cinema[]>([]);
  const [dates, setDates] = useState<string[]>([]);
  const [availableSlots, setAvailableSlots] = useState<Showtime[]>([]);

  // Loading indicator states
  const [loadingShowtimes, setLoadingShowtimes] = useState(false);

  // Dropdown open states
  const [openDropdown, setOpenDropdown] = useState<'movie' | 'cinema' | 'date' | 'slot' | null>(null);

  // Fetch showtimes when movie selection changes
  useEffect(() => {
    if (!selectedMovieId) {
      setShowtimes([]);
      setCinemas([]);
      setDates([]);
      setAvailableSlots([]);
      setSelectedCinemaId(null);
      setSelectedDateStr(null);
      setSelectedShowtimeId(null);
      return;
    }

    const fetchMovieShowtimes = async () => {
      setLoadingShowtimes(true);
      try {
        const res = await apiClient.get<Showtime[]>(`/showtimes/movie/${selectedMovieId}`);
        const showtimesList = res.data || [];
        setShowtimes(showtimesList);

        // Fetch distinct cinemas from showtimes list
        const cinemasMap: { [key: number]: Cinema } = {};
        showtimesList.forEach((st) => {
          if (st.hall?.cinemaId) {
            cinemasMap[st.hall.cinemaId] = {
              cinemaId: st.hall.cinemaId,
              name: st.cinemaName || 'Cinema Hub',
              address: '',
              city: '',
            };
          }
        });
        setCinemas(Object.values(cinemasMap));

        // Reset lower selections
        setSelectedCinemaId(null);
        setSelectedDateStr(null);
        setSelectedShowtimeId(null);
      } catch (err) {
        console.error('Failed to load quick booking showtimes', err);
        showToast('Không thể tải lịch chiếu của phim này.', 'error');
      } finally {
        setLoadingShowtimes(false);
      }
    };

    fetchMovieShowtimes();
  }, [selectedMovieId]);

  // Extract distinct dates when cinema selection changes
  useEffect(() => {
    if (!selectedCinemaId) {
      setDates([]);
      setAvailableSlots([]);
      setSelectedDateStr(null);
      setSelectedShowtimeId(null);
      return;
    }

    // Filter showtimes for the selected cinema
    const cinemaShowtimes = showtimes.filter((st) => st.hall?.cinemaId === selectedCinemaId);
    
    // Extract unique dates in YYYY-MM-DD
    const distinctDates = Array.from(
      new Set(
        cinemaShowtimes.map((st) => {
          const d = new Date(st.startTime);
          return d.toISOString().split('T')[0];
        })
      )
    ).sort();

    setDates(distinctDates);
    setSelectedDateStr(null);
    setSelectedShowtimeId(null);
  }, [selectedCinemaId, showtimes]);

  // Filter available showtime slots when date selection changes
  useEffect(() => {
    if (!selectedDateStr || !selectedCinemaId) {
      setAvailableSlots([]);
      setSelectedShowtimeId(null);
      return;
    }

    const slots = showtimes.filter((st) => {
      const matchCinema = st.hall?.cinemaId === selectedCinemaId;
      const matchDate = new Date(st.startTime).toISOString().split('T')[0] === selectedDateStr;
      return matchCinema && matchDate;
    });

    setAvailableSlots(slots.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()));
    setSelectedShowtimeId(null);
  }, [selectedDateStr, selectedCinemaId, showtimes]);

  // Handle outside clicks to close dropdown menus
  useEffect(() => {
    const handleClose = () => setOpenDropdown(null);
    window.addEventListener('click', handleClose);
    return () => window.removeEventListener('click', handleClose);
  }, []);

  const formatShowDate = (dateString: string) => {
    const d = new Date(dateString);
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const weekdays = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
    return `${weekdays[d.getDay()]}, ${day}/${month}`;
  };

  const handleBookNow = () => {
    if (!selectedShowtimeId) {
      showToast('Vui lòng chọn đầy đủ thông tin suất chiếu!', 'warning');
      return;
    }

    const finalSlot = availableSlots.find((s) => s.showtimeId === selectedShowtimeId);
    if (!finalSlot) return;

    if (!isAuthenticated) {
      showToast('Bạn cần đăng nhập để tiến hành đặt vé.', 'info');
      navigate('/login', { state: { from: `/booking` } });
      return;
    }

    const movie = movies.find(m => m.id === selectedMovieId);

    // Dispatch selection to booking slice store
    dispatch(selectShowtime({
      ...finalSlot,
      movie: movie
    }));
    navigate('/booking');
  };

  const selectedMovie = movies.find((m) => m.id === selectedMovieId);
  const selectedCinema = cinemas.find((c) => c.cinemaId === selectedCinemaId);
  const selectedSlot = availableSlots.find((s) => s.showtimeId === selectedShowtimeId);

  return (
    <div className="relative w-full max-w-6xl mx-auto px-4 z-30 -mt-16 select-none">
      <div className="bg-[#0b0b10]/70 backdrop-blur-2xl border border-white/10 rounded-3xl p-5 md:p-6 shadow-[0_20px_50px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.05)] flex flex-col lg:flex-row items-center gap-4 text-left">
        
        {/* 1. Movie Dropdown */}
        <div 
          onClick={(e) => {
            e.stopPropagation();
            setOpenDropdown(openDropdown === 'movie' ? null : 'movie');
          }}
          className="relative w-full lg:flex-1 p-3.5 bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 rounded-2xl cursor-pointer transition-all flex items-center gap-3.5"
        >
          <div className="p-2 bg-brand/10 text-brand rounded-xl">
            <Film size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <span className="block text-[10px] text-gray-500 font-bold uppercase tracking-wider">Chọn Phim</span>
            <span className="block text-xs font-black text-white truncate mt-0.5">
              {selectedMovie ? selectedMovie.title : 'Chọn phim bạn muốn xem...'}
            </span>
          </div>
          
          <AnimatePresence>
            {openDropdown === 'movie' && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute left-0 right-0 bottom-full mb-3 max-h-60 overflow-y-auto bg-[#0f0f15] border border-white/10 rounded-2xl shadow-2xl py-2 z-40 scrollbar-none"
              >
                {movies.map((m) => (
                  <div
                    key={m.id}
                    onClick={() => {
                      setSelectedMovieId(m.id);
                      setOpenDropdown(null);
                    }}
                    className="px-4 py-2.5 hover:bg-brand/10 hover:text-brand text-xs font-bold text-gray-300 transition-colors"
                  >
                    {m.title}
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 2. Cinema Dropdown */}
        <div 
          onClick={(e) => {
            e.stopPropagation();
            if (!selectedMovieId) {
              showToast('Vui lòng chọn phim trước!', 'info');
              return;
            }
            setOpenDropdown(openDropdown === 'cinema' ? null : 'cinema');
          }}
          className={`relative w-full lg:flex-1 p-3.5 bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 rounded-2xl cursor-pointer transition-all flex items-center gap-3.5 ${
            !selectedMovieId ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          <div className="p-2 bg-brand-gold/10 text-brand-gold rounded-xl">
            <MapPin size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <span className="block text-[10px] text-gray-500 font-bold uppercase tracking-wider">Chọn Rạp</span>
            <span className="block text-xs font-black text-white truncate mt-0.5">
              {loadingShowtimes ? 'Đang tải cụm rạp...' : selectedCinema ? selectedCinema.name : 'Chọn cụm rạp chiếu...'}
            </span>
          </div>

          <AnimatePresence>
            {openDropdown === 'cinema' && cinemas.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute left-0 right-0 bottom-full mb-3 max-h-60 overflow-y-auto bg-[#0f0f15] border border-white/10 rounded-2xl shadow-2xl py-2 z-40 scrollbar-none"
              >
                {cinemas.map((c) => (
                  <div
                    key={c.cinemaId}
                    onClick={() => {
                      setSelectedCinemaId(c.cinemaId);
                      setOpenDropdown(null);
                    }}
                    className="px-4 py-2.5 hover:bg-brand-gold/15 hover:text-brand-gold text-xs font-bold text-gray-300 transition-colors"
                  >
                    {c.name}
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 3. Date Dropdown */}
        <div 
          onClick={(e) => {
            e.stopPropagation();
            if (!selectedCinemaId) {
              showToast('Vui lòng chọn rạp chiếu trước!', 'info');
              return;
            }
            setOpenDropdown(openDropdown === 'date' ? null : 'date');
          }}
          className={`relative w-full lg:flex-1 p-3.5 bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 rounded-2xl cursor-pointer transition-all flex items-center gap-3.5 ${
            !selectedCinemaId ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
            <Calendar size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <span className="block text-[10px] text-gray-500 font-bold uppercase tracking-wider">Chọn Ngày</span>
            <span className="block text-xs font-black text-white truncate mt-0.5">
              {selectedDateStr ? formatShowDate(selectedDateStr) : 'Chọn ngày xem phim...'}
            </span>
          </div>

          <AnimatePresence>
            {openDropdown === 'date' && dates.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute left-0 right-0 bottom-full mb-3 max-h-60 overflow-y-auto bg-[#0f0f15] border border-white/10 rounded-2xl shadow-2xl py-2 z-40 scrollbar-none"
              >
                {dates.map((d) => (
                  <div
                    key={d}
                    onClick={() => {
                      setSelectedDateStr(d);
                      setOpenDropdown(null);
                    }}
                    className="px-4 py-2.5 hover:bg-emerald-500/10 hover:text-emerald-400 text-xs font-bold text-gray-300 transition-colors"
                  >
                    {formatShowDate(d)}
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 4. Time Dropdown */}
        <div 
          onClick={(e) => {
            e.stopPropagation();
            if (!selectedDateStr) {
              showToast('Vui lòng chọn ngày chiếu trước!', 'info');
              return;
            }
            setOpenDropdown(openDropdown === 'slot' ? null : 'slot');
          }}
          className={`relative w-full lg:flex-1 p-3.5 bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 rounded-2xl cursor-pointer transition-all flex items-center gap-3.5 ${
            !selectedDateStr ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl">
            <Clock size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <span className="block text-[10px] text-gray-500 font-bold uppercase tracking-wider">Suất Chiếu</span>
            <span className="block text-xs font-black text-white truncate mt-0.5">
              {selectedSlot 
                ? `${new Date(selectedSlot.startTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false })} (${selectedSlot.hall?.name || 'A'})` 
                : 'Chọn giờ suất chiếu...'}
            </span>
          </div>

          <AnimatePresence>
            {openDropdown === 'slot' && availableSlots.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute left-0 right-0 bottom-full mb-3 max-h-60 overflow-y-auto bg-[#0f0f15] border border-white/10 rounded-2xl shadow-2xl py-2 z-40 scrollbar-none"
              >
                {availableSlots.map((s) => {
                  const timeStr = new Date(s.startTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });
                  return (
                    <div
                      key={s.showtimeId}
                      onClick={() => {
                        setSelectedShowtimeId(s.showtimeId);
                        setOpenDropdown(null);
                      }}
                      className="px-4 py-2.5 hover:bg-indigo-500/10 hover:text-indigo-400 text-xs font-bold text-gray-300 transition-colors flex items-center justify-between"
                    >
                      <span>{timeStr}</span>
                      <span className="text-[10px] text-gray-500 font-semibold">{s.hall?.name || 'Phòng chiếu'}</span>
                    </div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 5. Submit Action Button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleBookNow}
          className="w-full lg:w-auto px-8 py-4 bg-brand hover:bg-brand-hover text-white text-xs font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-brand/20 transition-all flex items-center justify-center gap-2 cursor-pointer flex-shrink-0"
        >
          <Ticket size={16} /> Mua Vé Ngay
        </motion.button>

      </div>
    </div>
  );
};
