import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Clock, Ticket, DollarSign, Award, Play } from 'lucide-react';
import { RevenueChart } from './MovieComponents';
import type { RevenueData } from './MovieComponents';
import type { Movie } from '../../../types';

import { getImageUrl } from '../../../api/client';

interface MovieDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  movie: Movie | null;
  bookingCount?: number;
  revenue?: number;
  showtimeCount?: number;
  chartData?: RevenueData[];
}

export const MovieDrawer: React.FC<MovieDrawerProps> = ({
  isOpen,
  onClose,
  movie,
  bookingCount = 120,
  revenue = 15000000,
  showtimeCount = 48,
  chartData = [
    { name: 'Tuần 1', revenue: 4500000, tickets: 35 },
    { name: 'Tuần 2', revenue: 6200000, tickets: 50 },
    { name: 'Tuần 3', revenue: 3100000, tickets: 25 },
    { name: 'Tuần 4', revenue: 1200000, tickets: 10 }
  ]
}) => {
  if (!movie) return null;

  // Extract youtube ID for embed
  const getYoutubeEmbedUrl = (url?: string) => {
    if (!url) return null;
    let videoId = '';
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    if (match && match[2].length === 11) {
      videoId = match[2];
    }
    return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
  };

  const embedUrl = getYoutubeEmbedUrl(movie.trailerUrl);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop Glass overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs cursor-pointer"
          />

          {/* Side Drawer Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-lg bg-[#07070a] border-l border-white/5 shadow-2xl flex flex-col overflow-y-auto select-none text-left"
          >
            
            {/* Header image Backdrop */}
            <div className="relative aspect-[16/9] w-full shrink-0 bg-[#0c0c12]">
              <img
                src={getImageUrl(movie.bannerUrl || movie.posterUrl) || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=800'}
                alt={movie.title}
                className="w-full h-full object-cover filter brightness-50"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#07070a] via-transparent to-transparent" />
              
              {/* Close Button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 bg-black/50 hover:bg-black/80 border border-white/10 text-white p-2 rounded-xl transition-all cursor-pointer"
                title="Đóng drawer"
              >
                <X size={15} />
              </button>

              {/* Title tag overlay */}
              <div className="absolute bottom-4 left-6 right-6">
                <div className="flex flex-wrap gap-1.5">
                  <span className="px-2 py-0.5 bg-brand-gold/20 border border-brand-gold/30 text-brand-gold text-[8px] font-black uppercase tracking-wider rounded-md">
                    {movie.genreName || movie.genre?.genreName || 'Chưa Phân Loại'}
                  </span>
                  {movie.movieFormats && movie.movieFormats.map((fmt) => (
                    <span
                      key={fmt.movieFormatId}
                      className="px-2 py-0.5 bg-white/10 border border-white/20 text-white text-[8px] font-black uppercase tracking-wider rounded-md"
                    >
                      {fmt.formatName}
                    </span>
                  ))}
                </div>
                <h3 className="text-lg md:text-xl font-black text-white mt-1.5 uppercase tracking-tight leading-snug drop-shadow-md">
                  {movie.title}
                </h3>
              </div>
            </div>

            {/* Drawer Body content */}
            <div className="p-6 flex flex-col gap-6 flex-grow">
              
              {/* Grid metadata */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2 text-xs font-bold text-gray-400 bg-white/[0.01] border border-white/5 p-3 rounded-2xl">
                  <Clock size={14} className="text-brand-gold" />
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[8px] text-gray-500 uppercase">Thời Lượng</span>
                    <span className="text-white">{movie.duration} phút</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs font-bold text-gray-400 bg-white/[0.01] border border-white/5 p-3 rounded-2xl">
                  <Calendar size={14} className="text-brand" />
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[8px] text-gray-500 uppercase">Khởi Chiếu</span>
                    <span className="text-white font-mono">{new Date(movie.releaseDate).toLocaleDateString('vi-VN')}</span>
                  </div>
                </div>
              </div>

              {/* Statistics counter KPI boxes */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-[#0c0c12] border border-white/5 p-3 rounded-2xl text-center flex flex-col gap-1.5">
                  <Ticket size={14} className="text-brand mx-auto" />
                  <div className="flex flex-col">
                    <span className="text-[8px] text-gray-500 uppercase font-extrabold">Đã Bán</span>
                    <span className="text-xs font-mono font-black text-white mt-0.5">{bookingCount} vé</span>
                  </div>
                </div>

                <div className="bg-[#0c0c12] border border-white/5 p-3 rounded-2xl text-center flex flex-col gap-1.5">
                  <DollarSign size={14} className="text-brand-gold mx-auto" />
                  <div className="flex flex-col">
                    <span className="text-[8px] text-gray-500 uppercase font-extrabold">Doanh Thu</span>
                    <span className="text-xs font-mono font-black text-brand-gold mt-0.5">
                      {(revenue / 1_000_000).toFixed(1)}M
                    </span>
                  </div>
                </div>

                <div className="bg-[#0c0c12] border border-white/5 p-3 rounded-2xl text-center flex flex-col gap-1.5">
                  <Award size={14} className="text-blue-400 mx-auto" />
                  <div className="flex flex-col">
                    <span className="text-[8px] text-gray-500 uppercase font-extrabold">Suất Chiếu</span>
                    <span className="text-xs font-mono font-black text-white mt-0.5">{showtimeCount} suất</span>
                  </div>
                </div>
              </div>

              {/* Summary Description */}
              {movie.description && (
                <div className="flex flex-col gap-2">
                  <span className="text-[9px] text-gray-500 font-extrabold uppercase tracking-wider">Tóm tắt nội dung</span>
                  <p className="text-xs text-gray-400 leading-relaxed font-medium bg-white/[0.01] border border-white/5 p-4 rounded-2xl">
                    {movie.description}
                  </p>
                </div>
              )}

              {/* Embedded Trailer Section */}
              {embedUrl ? (
                <div className="flex flex-col gap-2">
                  <span className="text-[9px] text-gray-500 font-extrabold uppercase tracking-wider flex items-center gap-1">
                    <Play size={12} className="text-brand fill-brand" /> Trailer Phim
                  </span>
                  <div className="aspect-video w-full rounded-2xl overflow-hidden border border-white/5 shadow-lg bg-black">
                    <iframe
                      src={embedUrl}
                      title="Movie Trailer"
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                </div>
              ) : movie.trailerUrl ? (
                <div className="flex flex-col gap-2">
                  <span className="text-[9px] text-gray-500 font-extrabold uppercase tracking-wider">Trailer Link</span>
                  <a 
                    href={movie.trailerUrl} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-xs text-brand hover:underline font-bold"
                  >
                    Xem trên YouTube →
                  </a>
                </div>
              ) : null}

              {/* Analytics chart */}
              <div className="flex flex-col gap-2.5">
                <span className="text-[9px] text-gray-500 font-extrabold uppercase tracking-wider">Doanh Thu Theo Tuần</span>
                <div className="bg-[#0c0c12]/80 border border-white/5 p-4 rounded-3xl h-60">
                  <RevenueChart data={chartData} type="revenue" />
                </div>
              </div>

            </div>

          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
export default MovieDrawer;
