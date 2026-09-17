import React from 'react';
import { motion } from 'framer-motion';
import type { Cinema } from '../../types';
import { getImageUrl } from '../../api/client';

interface CinemaHeroProps {
  cinema: Cinema | null;
  loading: boolean;
}

export const CinemaHero: React.FC<CinemaHeroProps> = ({ cinema, loading }) => {
  return (
    <div className="relative w-full h-[40vh] md:h-[48vh] flex items-end overflow-hidden bg-background border-b border-white/5">
      {/* Dynamic Background Banner Image */}
      <div className="absolute inset-0 z-0">
        <img
          src={getImageUrl(cinema?.bannerUrl || cinema?.imageUrl) || "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=1600"}
          alt={cinema?.name || "Cinema Banner"}
          className="w-full h-full object-cover object-center filter brightness-[0.35]"
        />
        {/* Standard linear-gradient to top overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
      </div>

      {/* Hero Content */}
      <div className="max-w-7xl mx-auto w-full px-6 md:px-12 pb-10 md:pb-14 z-10 text-left">
        {loading ? (
          <div className="flex flex-col gap-3 max-w-lg">
            <div className="h-12 w-3/4 bg-white/5 rounded-2xl animate-pulse" />
            <div className="h-4 w-1/2 bg-white/5 mt-2 rounded-xl animate-pulse" />
          </div>
        ) : (
          cinema && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="flex flex-col max-w-4xl gap-2"
            >
              {/* Premium Heading using font-sans font-black */}
              <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight text-white leading-none">
                {cinema.name}
              </h1>

              {/* Muted Subtitle address */}
              <p className="text-xs md:text-sm text-gray-400 font-medium leading-relaxed max-w-xl">
                {cinema.address}
              </p>
            </motion.div>
          )
        )}
      </div>
    </div>
  );
};
