import React from 'react';
import { motion } from 'framer-motion';
import { MapPin, ChevronRight, Search } from 'lucide-react';
import type { Cinema } from '../../types';

interface CinemaSidebarProps {
  cinemas: Cinema[];
  activeCinemaId: number | null;
  onSelectCinema: (id: number) => void;
  loading: boolean;
}

export const CinemaSidebar: React.FC<CinemaSidebarProps> = ({
  cinemas,
  activeCinemaId,
  onSelectCinema,
  loading
}) => {
  const [searchTerm, setSearchTerm] = React.useState('');

  const filteredCinemas = cinemas.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.city.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      {/* Sidebar Search Bar */}
      <div className="relative w-full">
        <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-gray-500">
          <Search size={14} />
        </span>
        <input
          type="text"
          placeholder="Tìm rạp theo tên hoặc khu vực..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-white/5 border border-white/5 focus:border-brand-gold/30 rounded-xl py-2.5 pl-10 pr-4 text-xs font-bold text-gray-200 placeholder-gray-500 focus:outline-none transition-all duration-300 backdrop-blur-md"
        />
      </div>

      {/* Renders list of cinemas */}
      {loading ? (
        <div className="flex flex-col gap-2.5">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 w-full bg-white/5 border border-white/5 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : filteredCinemas.length === 0 ? (
        <div className="text-center py-8 text-xs text-gray-500 glass-panel rounded-2xl">
          Không tìm thấy rạp nào phù hợp.
        </div>
      ) : (
        <div className="flex md:flex-col gap-2.5 overflow-x-auto md:overflow-x-visible pb-3 md:pb-0 scrollbar-none snap-x snap-mandatory">
          {filteredCinemas.map((cinema) => {
            const isActive = cinema.cinemaId === activeCinemaId;
            return (
              <motion.div
                key={cinema.cinemaId}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => onSelectCinema(cinema.cinemaId)}
                className={`relative shrink-0 w-[240px] md:w-full snap-start p-4 rounded-2xl border text-left cursor-pointer transition-all duration-300 flex items-center justify-between gap-3 group select-none ${
                  isActive
                    ? 'bg-brand/10 border-brand/40 shadow-[0_0_15px_rgba(229,9,20,0.15)]'
                    : 'bg-white/[0.02] border-white/5 hover:border-white/10 hover:bg-white/[0.04]'
                }`}
              >
                {/* Active Highlight Marker (Layout Animation) */}
                {isActive && (
                  <motion.div
                    layoutId="activeCinemaGlow"
                    className="absolute inset-0 rounded-2xl border border-brand/50 pointer-events-none"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}

                <div className="flex flex-col gap-1 min-w-0">
                  {/* City Tag */}
                  <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded w-max leading-none ${
                    isActive 
                      ? 'bg-brand/20 text-brand' 
                      : 'bg-white/5 text-brand-gold'
                  }`}>
                    {cinema.city}
                  </span>
                  
                  {/* Cinema Name */}
                  <h4 className="text-xs font-black text-white truncate group-hover:text-brand transition-colors leading-tight">
                    {cinema.name}
                  </h4>

                  {/* Cinema Address */}
                  <span className="text-[10px] text-gray-500 truncate leading-none flex items-center gap-1">
                    <MapPin size={10} className="shrink-0" />
                    {cinema.address}
                  </span>
                </div>

                <div className={`p-1.5 rounded-lg border shrink-0 transition-all duration-300 ${
                  isActive 
                    ? 'bg-brand/15 border-brand/35 text-brand' 
                    : 'bg-white/5 border-white/5 text-gray-500 group-hover:text-gray-300 group-hover:border-white/10'
                }`}>
                  <ChevronRight size={12} className="md:block hidden" />
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};
