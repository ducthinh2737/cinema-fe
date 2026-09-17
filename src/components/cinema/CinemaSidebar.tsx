import React from 'react';
import { Search } from 'lucide-react';
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
          className="w-full bg-white/[0.02] border border-white/5 focus:border-brand/50 rounded-2xl py-3 pl-10 pr-4 text-xs font-semibold text-white placeholder-gray-500 focus:outline-none transition-all duration-300"
        />
      </div>

      {/* Renders list of cinemas */}
      {loading ? (
        <div className="flex flex-col gap-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 w-full bg-white/5 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : filteredCinemas.length === 0 ? (
        <div className="text-center py-10 text-xs text-gray-500 bg-white/[0.01] rounded-2xl border border-white/5">
          Không tìm thấy rạp nào phù hợp.
        </div>
      ) : (
        <div className="flex md:flex-col gap-3 overflow-x-auto md:overflow-x-visible pb-3 md:pb-0 scrollbar-none snap-x snap-mandatory">
          {filteredCinemas.map((cinema) => {
            const isActive = cinema.cinemaId === activeCinemaId;
            return (
              <div
                key={cinema.cinemaId}
                onClick={() => onSelectCinema(cinema.cinemaId)}
                className={`relative shrink-0 w-[240px] md:w-full snap-start p-4 rounded-2xl text-left cursor-pointer transition-all duration-300 flex flex-col gap-1.5 select-none border ${
                  isActive
                    ? 'bg-brand/10 border-brand/50 text-white shadow-lg shadow-brand/10'
                    : 'bg-white/[0.01] border-white/5 hover:border-white/10 hover:bg-white/[0.03]'
                }`}
              >
                {/* Cinema Name */}
                <h4 className={`text-xs uppercase tracking-wider font-black transition-colors ${
                  isActive ? 'text-white' : 'text-gray-300 hover:text-white'
                }`}>
                  {cinema.name}
                </h4>

                {/* City */}
                <span className="text-[11px] font-semibold text-gray-500 leading-none">
                  {cinema.city}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
