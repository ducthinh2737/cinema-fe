import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Movie } from '../../types';
import { Clock, Play, Info, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getImageUrl } from '../../api/client';

interface MovieCardProps {
  movie: Movie;
}

export const MovieCard: React.FC<MovieCardProps> = ({ movie }) => {
  const navigate = useNavigate();
  const [showTrailer, setShowTrailer] = useState<string | null>(null);

  const getYoutubeId = (url: string) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  };

  const handlePlayTrailer = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (movie.trailerUrl) {
      const id = getYoutubeId(movie.trailerUrl);
      if (id) setShowTrailer(id);
    } else {
      navigate(`/movie/${movie.slug}`);
    }
  };

  const handleBookTicket = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/movie/${movie.slug}/showtimes`);
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
            <div className={`absolute top-3 right-3 px-2 py-1 rounded-lg text-[9px] font-black tracking-wider uppercase backdrop-blur-md shadow-lg border ${
              movie.ageRatingId === 1 ? 'bg-green-600/80 border-green-500/30 text-white' :
              movie.ageRatingId === 2 ? 'bg-blue-600/80 border-blue-500/30 text-white' :
              movie.ageRatingId === 3 ? 'bg-orange-500/80 border-orange-500/30 text-white' :
              movie.ageRatingId === 4 ? 'bg-red-500/80 border-red-500/30 text-white' :
              movie.ageRatingId === 5 ? 'bg-red-850 border-red-800/30 text-white' : 'bg-pink-800/80 border-pink-700/30 text-white'
            }`}>
              {['P', 'K', 'T13', 'T16', 'T18', 'C18'][(movie.ageRatingId ?? 1) - 1] || 'P'}
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

            <div className="flex flex-col gap-2 w-full mt-1">
              <button
                onClick={handleBookTicket}
                className="w-full py-2 bg-brand hover:bg-brand-hover text-white text-[10px] font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-md shadow-brand/20 cursor-pointer"
              >
                <Play size={10} fill="currentColor" /> Đặt Vé
              </button>
              
              <button
                onClick={handlePlayTrailer}
                className="w-full py-2 bg-white/10 hover:bg-white/20 text-white text-[10px] font-black uppercase tracking-wider rounded-xl transition-all border border-white/10 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Info size={10} /> Chi tiết / Trailer
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

      {/* Dynamic Trailer Lightbox Modal */}
      <AnimatePresence>
        {showTrailer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="relative w-full max-w-3xl aspect-video rounded-3xl overflow-hidden border border-white/10 bg-black shadow-2xl"
            >
              <button
                onClick={() => setShowTrailer(null)}
                className="absolute top-4 right-4 z-10 p-2 bg-black/60 hover:bg-black/90 text-white rounded-full border border-white/10 transition-all cursor-pointer"
              >
                <X size={16} />
              </button>
              <iframe
                src={`https://www.youtube.com/embed/${showTrailer}?autoplay=1`}
                title="Trailer phim"
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
