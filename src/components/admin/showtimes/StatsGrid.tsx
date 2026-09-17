import React from 'react';
import { Clock, Film, Building, Users } from 'lucide-react';

interface StatsGridProps {
  stats: {
    totalToday: number;
    uniqueMoviesToday: number;
    activeHallsToday: number;
    avgOccupancy: number;
  };
}

export const StatsGrid: React.FC<StatsGridProps> = React.memo(({ stats }) => {
  const cards = [
    {
      icon: <Clock size={18} className="text-blue-400" />,
      iconBg: 'bg-blue-500/10 border-blue-500/20',
      gradient: 'from-blue-500/5',
      label: 'Suất chiếu hôm nay',
      value: `${stats.totalToday}`,
      unit: 'suất'
    },
    {
      icon: <Film size={18} className="text-red-400" />,
      iconBg: 'bg-red-500/10 border-red-500/20',
      gradient: 'from-red-500/5',
      label: 'Phim đang chiếu',
      value: `${stats.uniqueMoviesToday}`,
      unit: 'phim'
    },
    {
      icon: <Building size={18} className="text-yellow-400" />,
      iconBg: 'bg-yellow-500/10 border-yellow-500/20',
      gradient: 'from-yellow-500/5',
      label: 'Phòng hoạt động',
      value: `${stats.activeHallsToday}`,
      unit: 'phòng'
    },
    {
      icon: <Users size={18} className="text-green-400" />,
      iconBg: 'bg-green-500/10 border-green-500/20',
      gradient: 'from-green-500/5',
      label: 'Lấp đầy TB',
      value: stats.avgOccupancy > 0 ? `${stats.avgOccupancy}` : '—',
      unit: stats.avgOccupancy > 0 ? '%' : ''
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((card, i) => (
        <div key={i} className="bg-[#0D111C]/60 border border-white/5 p-3.5 rounded-2xl flex items-center gap-3 shadow-lg backdrop-blur-md relative overflow-hidden group text-left">
          <div className={`absolute inset-0 bg-gradient-to-r ${card.gradient} to-transparent opacity-0 group-hover:opacity-100 transition-opacity`} />
          <div className={`h-9 w-9 rounded-xl ${card.iconBg} border flex items-center justify-center shrink-0`}>
            {card.icon}
          </div>
          <div className="flex flex-col text-left min-w-0">
            <span className="text-[10px] font-semibold text-gray-500 truncate">{card.label}</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black font-mono text-white leading-none">{card.value}</span>
              {card.unit && <span className="text-xs text-gray-400 font-semibold">{card.unit}</span>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
});

StatsGrid.displayName = 'StatsGrid';
