import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MapPin, Film, Calendar } from 'lucide-react';
import type { Cinema } from '../../types';

interface CinemaHeroProps {
  cinema: Cinema | null;
  loading: boolean;
}

export const CinemaHero: React.FC<CinemaHeroProps> = ({ cinema, loading }) => {
  return (
    <div className="relative w-full h-[38vh] md:h-[45vh] flex items-end overflow-hidden border-b border-white/5">
      {/* Dynamic Background Banner Image with Premium Overlays */}
      <div className="absolute inset-0 z-0">
        <img
          src={cinema?.imageUrl || "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=1600"}
          alt={cinema?.name || "Cinema Banner"}
          className="w-full h-full object-cover filter brightness-[0.35] scale-105"
        />
        {/* Modern Cinematic Overlay Gradients */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-transparent to-background/30" />
        <div className="absolute inset-0 bg-black/20" />
      </div>

      {/* Hero Content */}
      <div className="max-w-7xl mx-auto w-full px-6 md:px-12 pb-8 md:pb-12 z-10 text-left">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-2 text-xs font-bold text-gray-400/80 mb-4 select-none">
          <Link to="/" className="hover:text-brand transition-colors">Trang Chủ</Link>
          <span>/</span>
          <span className="text-brand-gold">Hệ Thống Rạp Chiếu</span>
          {cinema && (
            <>
              <span>/</span>
              <span className="text-white truncate max-w-[150px] md:max-w-none">{cinema.name}</span>
            </>
          )}
        </nav>

        {loading ? (
          <div className="flex flex-col gap-3 max-w-lg">
            <div className="h-10 bg-white/10 rounded-lg animate-pulse w-3/4" />
            <div className="h-5 bg-white/5 rounded animate-pulse w-1/2" />
          </div>
        ) : (
          cinema && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="flex flex-col gap-3 max-w-4xl"
            >
              {/* Premium Glow City Badge */}
              <div className="flex items-center gap-1.5 text-[10px] font-black text-brand-gold uppercase tracking-widest bg-brand-gold/10 border border-brand-gold/25 px-3 py-1 rounded-full w-max">
                <MapPin size={10} /> {cinema.city}
              </div>

              {/* Title with Ambient Drop Shadow */}
              <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-tight filter drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]">
                {cinema.name}
              </h1>

              {/* Short tagline/sub-info */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400 font-semibold mt-1">
                <span className="flex items-center gap-1"><Film size={12} className="text-brand" /> Phòng Chiếu Hiện Đại</span>
                <span>•</span>
                <span className="flex items-center gap-1"><Calendar size={12} className="text-brand-gold" /> Mở Cửa Hàng Ngày</span>
              </div>
            </motion.div>
          )
        )}
      </div>
    </div>
  );
};
