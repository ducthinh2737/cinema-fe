import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Film, Check } from 'lucide-react';
import type { Cinema } from '../../types';

interface CinemaSelectorProps {
  cinemas: Cinema[];
  selectedCinemaId: number | null;
  onSelectCinema: (id: number | null) => void;
}

export const CinemaSelector: React.FC<CinemaSelectorProps> = ({
  cinemas,
  selectedCinemaId,
  onSelectCinema,
}) => {
  const [selectedCity, setSelectedCity] = useState<string>('All');

  // Extract unique cities from available cinemas list
  const cities = ['All', ...Array.from(new Set(cinemas.map(c => c.city).filter(Boolean)))];

  const filteredCinemas = selectedCity === 'All'
    ? cinemas
    : cinemas.filter(c => c.city === selectedCity);

  return (
    <div className="flex flex-col gap-4 select-none">
      
      {/* Selector Header & City Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
          <MapPin size={12} className="text-brand" />
          Filter by Cinema Location
        </span>
        
        {/* City Filter Tabs */}
        <div className="flex items-center gap-1.5 bg-white/[0.02] border border-white/5 p-1 rounded-xl w-fit">
          {cities.map((city) => {
            const active = selectedCity === city;
            return (
              <button
                key={city}
                onClick={() => setSelectedCity(city)}
                className={`relative px-3 py-1.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-colors cursor-pointer ${
                  active ? 'text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                {active && (
                  <motion.div
                    layoutId="activeCityBg"
                    className="absolute inset-0 bg-brand rounded-lg shadow-[0_0_10px_rgba(229,9,20,0.3)] z-0"
                    transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                  />
                )}
                <span className="relative z-10">{city}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Cinemas Horizontal Scroll or Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* "All Cinemas" Option */}
        <div
          onClick={() => onSelectCinema(null)}
          className={`relative p-5 rounded-2xl border text-left cursor-pointer transition-all flex items-center gap-4 ${
            selectedCinemaId === null
              ? 'border-brand bg-brand/10 shadow-[0_0_15px_rgba(229,9,20,0.15)]'
              : 'border-white/5 hover:border-white/15 bg-white/[0.02] hover:bg-white/[0.04]'
          }`}
        >
          <div className={`h-10 w-10 rounded-xl flex items-center justify-center border ${
            selectedCinemaId === null ? 'bg-brand/20 border-brand/40 text-brand' : 'bg-white/5 border-white/5 text-gray-400'
          }`}>
            <Film size={18} />
          </div>
          <div className="flex-grow min-w-0">
            <h4 className="text-xs font-black text-white uppercase tracking-wider">All Cinemas</h4>
            <p className="text-[10px] text-gray-500 mt-0.5 truncate">Show showtimes for all available theatres</p>
          </div>
          {selectedCinemaId === null && (
            <div className="h-5 w-5 bg-brand text-white rounded-full flex items-center justify-center border border-brand-gold/30">
              <Check size={12} />
            </div>
          )}
        </div>

        {/* Dynamic Cinemas List */}
        <AnimatePresence mode="popLayout">
          {filteredCinemas.map((cinema) => {
            const active = selectedCinemaId === cinema.cinemaId;

            return (
              <motion.div
                key={cinema.cinemaId}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                onClick={() => onSelectCinema(cinema.cinemaId)}
                className={`relative p-5 rounded-2xl border text-left cursor-pointer transition-all flex items-center gap-4 ${
                  active
                    ? 'border-brand bg-brand/10 shadow-[0_0_15px_rgba(229,9,20,0.15)]'
                    : 'border-white/5 hover:border-white/15 bg-white/[0.02] hover:bg-white/[0.04]'
                }`}
              >
                <div className={`h-10 w-10 rounded-xl overflow-hidden flex items-center justify-center border ${
                  active ? 'bg-brand/20 border-brand/40 text-brand' : 'bg-white/5 border-white/5 text-gray-400'
                }`}>
                  {cinema.imageUrl ? (
                    <img src={cinema.imageUrl} alt={cinema.name} className="h-full w-full object-cover" />
                  ) : (
                    <Film size={18} />
                  )}
                </div>

                <div className="flex-grow min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-black text-white uppercase tracking-wider truncate">{cinema.name}</h4>
                    <span className="text-[8px] font-extrabold bg-white/5 text-gray-400 border border-white/5 px-1.5 py-0.5 rounded uppercase">
                      {cinema.city}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-500 mt-1 truncate" title={cinema.address}>
                    {cinema.address}
                  </p>
                </div>

                {active && (
                  <div className="h-5 w-5 bg-brand text-white rounded-full flex items-center justify-center border border-brand-gold/30 flex-shrink-0">
                    <Check size={12} />
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

    </div>
  );
};
