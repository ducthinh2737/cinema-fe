import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Movie } from '../../types';
import { Clock, Play, Heart } from 'lucide-react';
import { motion } from 'framer-motion';
import { getImageUrl } from '../../api/client';
import { getAgeRatingCode, getAgeRatingColorClass } from '../../utils/ageRatingHelpers';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../contexts/ToastContext';


interface MovieCardProps {
  movie: Movie;
}

export const MovieCard: React.FC<MovieCardProps> = ({ movie }) => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    try {
      const storedFavs = localStorage.getItem('favoriteMovies');
      if (storedFavs) {
        const favs = JSON.parse(storedFavs);
        if (Array.isArray(favs)) {
          setIsFavorite(favs.some((m: any) => m.id === movie.id));
        }
      }
    } catch (err) {
      console.error("Error loading favorite status in MovieCard", err);
    }
  }, [movie.id]);

  useEffect(() => {
    const handleStorageChange = () => {
      try {
        const storedFavs = localStorage.getItem('favoriteMovies');
        if (storedFavs) {
          const favs = JSON.parse(storedFavs);
          if (Array.isArray(favs)) {
            setIsFavorite(favs.some((m: any) => m.id === movie.id));
          }
        }
      } catch (err) {
        console.error(err);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    // Also listen to a custom local event to capture same-window localStorage changes
    window.addEventListener('local-storage-favorites-updated', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('local-storage-favorites-updated', handleStorageChange);
    };
  }, [movie.id]);

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      showToast('Vui lòng đăng nhập để lưu phim yêu thích.', 'warning');
      return;
    }
    try {
      const storedFavsStr = localStorage.getItem('favoriteMovies');
      let favs = storedFavsStr ? JSON.parse(storedFavsStr) : [];
      if (!Array.isArray(favs)) favs = [];

      if (isFavorite) {
        favs = favs.filter((m: any) => m.id !== movie.id);
        setIsFavorite(false);
        showToast('Đã xóa khỏi danh sách yêu thích.', 'success');
      } else {
        const favoriteMovieItem = {
          id: movie.id,
          title: movie.title,
          slug: movie.slug,
          posterUrl: movie.posterUrl,
          genre: {
            name: movie.genreName || movie.genre?.genreName || movie.genre?.name || 'Chưa rõ'
          }
        };
        favs.push(favoriteMovieItem);
        setIsFavorite(true);
        showToast('Đã thêm vào danh sách yêu thích!', 'success');
      }
      localStorage.setItem('favoriteMovies', JSON.stringify(favs));
      window.dispatchEvent(new Event('local-storage-favorites-updated'));
    } catch (err) {
      console.error("Error toggling favorite in MovieCard", err);
      showToast('Không thể cập nhật danh sách yêu thích.', 'error');
    }
  };

  const handleBookTicket = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/movie/${movie.slug}`);
  };

  const getDaysRemaining = (releaseDateStr: string) => {
    if (!releaseDateStr) return 'Sắp Chiếu';
    const diffTime = new Date(releaseDateStr).getTime() - Date.now();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? `Còn ${diffDays} ngày` : 'Sắp Chiếu';
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return '';
    }
  };

  const getStatusLabel = () => {
    if (movie.status === 'NowShowing') return 'Đang Chiếu';
    if (movie.status === 'ComingSoon') return getDaysRemaining(movie.releaseDate);
    if (movie.status === 'Ended') return 'Đã Kết Thúc';
    // Fallback if status is undefined
    const isShowing = new Date(movie.releaseDate) <= new Date();
    return isShowing ? 'Đang Chiếu' : getDaysRemaining(movie.releaseDate);
  };

  return (
    <>
      <motion.div
        onClick={() => navigate(`/movie/${movie.slug}`)}
        whileHover={{ y: -8, scale: 1.03 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className="group cursor-pointer flex flex-col gap-3 text-left relative select-none w-full"
      >
        {/* Poster Wrapper */}
        <div className="relative overflow-hidden rounded-2xl aspect-[2/3] bg-[#0c0c12] border border-white/5 group-hover:border-brand-gold/30 transition-all duration-300 shadow-xl group-hover:shadow-[0_0_25px_rgba(229,169,59,0.15)]">
          <img
            src={getImageUrl(movie.posterUrl) || 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?q=80&w=400'}
            alt={movie.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-all duration-700 filter group-hover:brightness-50"
            loading="lazy"
          />

          {/* Status Label (Đang Chiếu / Sắp Chiếu) */}
          <div className="absolute top-3 left-3 bg-[#e5a93b] text-black font-black px-2.5 py-1 rounded-lg text-[9px] uppercase tracking-wider shadow-lg shadow-brand-gold/15">
            {getStatusLabel()}
          </div>

          {/* Age Rating Badge */}
          {movie.ageRatingId && (
            <div className={`absolute top-3 right-3 px-2 py-1 rounded-lg text-[9px] font-black tracking-wider uppercase backdrop-blur-md shadow-lg border ${getAgeRatingColorClass(movie.ageRatingId)}`}>
              {getAgeRatingCode(movie.ageRatingId)}
            </div>
          )}
          
          {/* Hover Overlay with CTAs */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4 gap-3">
            <div className="flex flex-col gap-1 text-left">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-brand-gold">
                {movie.genreName || movie.genre?.name || 'Hành động'}
              </span>
              <h4 className="text-xs font-black text-white leading-snug line-clamp-2">
                {movie.title}
              </h4>
            </div>

            <div className="flex gap-2 w-full mt-1">
              <button
                onClick={handleBookTicket}
                className="flex-grow py-2 bg-brand hover:bg-brand-hover text-white text-[10px] font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-md shadow-brand/20 cursor-pointer"
              >
                <Play size={10} fill="currentColor" /> Đặt Vé
              </button>

              <button
                onClick={handleToggleFavorite}
                className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-center shrink-0 ${
                  isFavorite
                    ? 'bg-brand/25 border-brand text-brand'
                    : 'bg-white/10 border-white/10 text-gray-300 hover:bg-white/20 hover:text-white'
                }`}
                title={isFavorite ? "Xóa khỏi danh sách yêu thích" : "Thêm vào danh sách yêu thích"}
              >
                <Heart size={12} fill={isFavorite ? '#ef4444' : 'none'} className={isFavorite ? 'text-brand' : 'text-gray-300'} />
              </button>
            </div>
          </div>
        </div>

        {/* Text Details below poster */}
        <div className="flex flex-col gap-1 px-1">
          <h3 className="text-sm font-black text-white group-hover:text-brand transition-colors line-clamp-1">
            {movie.title}
          </h3>
          <div className="flex items-center gap-2.5 text-[10px] text-gray-500 font-bold uppercase tracking-wider">
            <span className="flex items-center gap-1"><Clock size={10} className="text-brand-gold" /> {movie.duration} phút</span>
            <span>•</span>
            <span>{movie.language || 'Phụ đề'}</span>
          </div>
          {(movie.status === 'ComingSoon' || (!movie.status && new Date(movie.releaseDate) > new Date())) && movie.releaseDate && (
            <div className="text-[10px] text-brand-gold font-extrabold uppercase tracking-wider mt-0.5">
              Khởi chiếu: {formatDate(movie.releaseDate)}
            </div>
          )}
        </div>
      </motion.div>
    </>
  );
};
