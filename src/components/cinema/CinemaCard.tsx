import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Phone, ArrowUpRight } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Cinema } from '../../types';

import { getImageUrl } from '../../api/client';

interface CinemaCardProps {
  cinema: Cinema;
}

export const CinemaCard: React.FC<CinemaCardProps> = ({ cinema }) => {
  const navigate = useNavigate();

  const handleDetails = () => {
    navigate(`/he-thong-rap?cinemaId=${cinema.cinemaId}`);
  };

  return (
    <motion.div
      onClick={handleDetails}
      whileHover={{ y: -6, scale: 1.02 }}
      className="group cursor-pointer rounded-3xl border border-white/5 bg-[#0a0a0f] overflow-hidden transition-all hover:bg-white/[0.02] flex flex-col relative select-none text-left shadow-sm hover:shadow-xl hover:border-brand-gold/20"
    >
      {/* Background/Thumbnail Image */}
      <div className="relative h-44 overflow-hidden bg-black/40">
        <img
          src={getImageUrl(cinema.imageUrl || cinema.bannerUrl) || "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?q=80&w=350"}
          alt={cinema.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500 filter brightness-90"
        />
        
        {/* City Tag */}
        <span className="absolute top-4 left-4 bg-brand text-[9px] font-black text-white px-2.5 py-1 rounded-lg uppercase tracking-wider">
          {cinema.city || "Hồ Chí Minh"}
        </span>

        {/* Hover overlay link icon */}
        <div className="absolute top-4 right-4 h-8 w-8 rounded-full bg-black/60 backdrop-blur-md border border-white/10 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
          <ArrowUpRight size={14} />
        </div>
      </div>

      {/* Info details */}
      <div className="p-5 flex flex-col justify-between flex-grow gap-4">
        <div className="flex flex-col gap-2">
          <h4 className="text-sm font-black text-white group-hover:text-brand-gold transition-colors leading-snug">
            {cinema.name}
          </h4>
          
          <div className="flex flex-col gap-2 mt-1 text-[11px] text-gray-400 font-medium">
            <span className="flex items-start gap-2 leading-relaxed line-clamp-2">
              <MapPin size={12} className="text-brand flex-shrink-0 mt-0.5" />
              <span>{cinema.address || "Chưa cập nhật địa chỉ"}</span>
            </span>
            <span className="flex items-center gap-2">
              <Phone size={12} className="text-brand-gold flex-shrink-0" />
              <span>{cinema.phone || `1900 2088 (máy lẻ ${cinema.cinemaId})`}</span>
            </span>
          </div>
        </div>

        <div className="border-t border-white/5 pt-3.5 mt-auto flex items-center justify-between">
          <span className="text-[10px] text-brand-gold font-bold uppercase tracking-wider">
            Xem lịch chiếu & giá vé
          </span>
          <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider bg-white/5 px-2 py-0.5 rounded">
            CinemaPass
          </span>
        </div>
      </div>
    </motion.div>
  );
};
