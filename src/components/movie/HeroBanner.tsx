import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Clock, Info, ChevronLeft, ChevronRight, X } from 'lucide-react';
import type { Movie } from '../../types';
import { getImageUrl } from '../../api/client';

interface HeroBannerProps {
  movies: Movie[];
}

export const HeroBanner: React.FC<HeroBannerProps> = ({ movies }) => {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showTrailer, setShowTrailer] = useState<string | null>(null);

  // Auto-play interval
  useEffect(() => {
    if (movies.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % movies.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [movies.length]);

  if (!movies || movies.length === 0) {
    return (
      <div className="h-[75vh] w-full bg-[#07070a] flex items-center justify-center">
        <div className="h-10 w-10 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const activeMovie = movies[currentIndex];

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev === 0 ? movies.length - 1 : prev - 1));
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % movies.length);
  };

  // Helper to extract YouTube video ID from URL
  const getYoutubeId = (url: string) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  };

  const isShowing = new Date(activeMovie.releaseDate) <= new Date();

  return (
    <div className="relative h-[75vh] md:h-[80vh] w-full overflow-hidden select-none bg-[#07070a]">
      {/* Background Slides */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeMovie.id}
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
          className="absolute inset-0 w-full h-full"
        >
          {/* Backdrop Image */}
          <img
            src={getImageUrl(activeMovie.bannerUrl) || getImageUrl(activeMovie.posterUrl) || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=1470'}
            alt={activeMovie.title}
            className="absolute inset-0 w-full h-full object-cover object-top filter brightness-[0.4] contrast-[1.05]"
          />
          
          {/* Cinematic Overlays */}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-transparent to-transparent hidden md:block" />
        </motion.div>
      </AnimatePresence>

      {/* Hero content */}
      <div className="absolute inset-0 flex items-end">
        <div className="max-w-7xl mx-auto w-full px-6 md:px-12 pb-24 md:pb-28 text-left z-10 flex flex-col gap-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeMovie.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="flex flex-col gap-4 max-w-2xl"
            >
              {/* Badge */}
              <span className="bg-brand text-white text-[10px] font-black uppercase px-3 py-1 rounded-md w-max tracking-widest shadow-lg shadow-brand/20 leading-none">
                {isShowing ? 'Đang Chiếu' : 'Sắp Chiếu'}
              </span>
              
              {/* Movie Title */}
              <h1 className="text-4xl md:text-6xl font-black tracking-tight text-white leading-tight drop-shadow-lg uppercase font-sans">
                {activeMovie.title}
              </h1>

              {/* Meta indicators */}
              <div className="flex items-center gap-4 text-xs font-bold text-gray-300">

                <span className="flex items-center gap-1 bg-white/5 px-2.5 py-1 rounded-lg border border-white/5">
                  <Clock size={12} className="text-brand" /> {activeMovie.duration} phút
                </span>
                <span>•</span>
                <span className="text-gray-400 capitalize bg-white/5 px-2.5 py-1 rounded-lg border border-white/5">
                  {activeMovie.language || 'Phụ đề'}
                </span>
              </div>

              {/* Description */}
              <p className="text-xs md:text-sm text-gray-400 leading-relaxed drop-shadow line-clamp-3 max-w-xl font-medium mt-1">
                {activeMovie.description || 'Hành trình điện ảnh tuyệt tác đầy cảm xúc và hình ảnh sống động được mở ra cho bạn.'}
              </p>

              {/* Action buttons */}
              <div className="flex items-center gap-4 mt-3">
                <motion.button
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate(`/movie/${activeMovie.slug}`)}
                  className="bg-brand hover:bg-brand-hover text-white text-xs font-black uppercase tracking-widest px-6 py-3.5 rounded-xl transition-all shadow-lg shadow-brand/20 hover:shadow-brand/40 flex items-center gap-2 cursor-pointer border border-brand/20 hover:border-brand/40"
                >
                  <Play size={14} fill="currentColor" /> Đặt Vé Ngay
                </motion.button>
                
                {activeMovie.trailerUrl && (
                  <motion.button
                    whileHover={{ scale: 1.05, y: -2, backgroundColor: 'rgba(255,255,255,0.1)' }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      const id = getYoutubeId(activeMovie.trailerUrl!);
                      if (id) setShowTrailer(id);
                    }}
                    className="flex items-center gap-2 px-6 py-3.5 rounded-xl border border-white/20 bg-white/5 text-xs font-black uppercase tracking-widest text-white hover:bg-white/10 hover:border-white/30 transition-all cursor-pointer"
                  >
                    <Info size={14} /> Xem Trailer
                  </motion.button>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Slide Navigation Arrows */}
      {movies.length > 1 && (
        <>
          <button
            onClick={handlePrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 h-11 w-11 rounded-full border border-white/10 bg-black/40 hover:bg-black/70 hover:border-white/30 text-white flex items-center justify-center transition-all cursor-pointer group backdrop-blur-sm"
          >
            <ChevronLeft size={20} className="group-hover:-translate-x-0.5 transition-transform" />
          </button>
          <button
            onClick={handleNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 h-11 w-11 rounded-full border border-white/10 bg-black/40 hover:bg-black/70 hover:border-white/30 text-white flex items-center justify-center transition-all cursor-pointer group backdrop-blur-sm"
          >
            <ChevronRight size={20} className="group-hover:translate-x-0.5 transition-transform" />
          </button>
        </>
      )}

      {/* Pagination Dot Indicators */}
      {movies.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2.5">
          {movies.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                index === currentIndex ? 'w-8 bg-brand' : 'w-2 bg-white/30 hover:bg-white/60'
              }`}
            />
          ))}
        </div>
      )}

      {/* Dynamic Trailer Lightbox Modal */}
      <AnimatePresence>
        {showTrailer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="relative w-full max-w-4xl aspect-video rounded-3xl overflow-hidden border border-white/10 bg-black shadow-2xl"
            >
              <button
                onClick={() => setShowTrailer(null)}
                className="absolute top-4 right-4 z-10 p-2.5 bg-black/60 hover:bg-black/95 text-white rounded-full border border-white/10 hover:border-white/30 transition-all cursor-pointer"
              >
                <X size={18} />
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
    </div>
  );
};
