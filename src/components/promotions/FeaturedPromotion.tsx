import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, Ticket, ArrowRight } from 'lucide-react';

export interface FeaturedPromoItem {
  id: number;
  title: string;
  desc: string;
  image: string;
  discountBadge: string;
  expiryDate: string; // ISO String or date string
  code: string;
  slug: string;
}

interface FeaturedPromotionProps {
  item: FeaturedPromoItem;
  onActionClick: (slug: string) => void;
}

export const FeaturedPromotion: React.FC<FeaturedPromotionProps> = ({ item, onActionClick }) => {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    const targetDate = new Date(item.expiryDate).getTime();
    
    const updateCountdown = () => {
      const now = new Date().getTime();
      const difference = targetDate - now;

      if (difference <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [item.expiryDate]);

  return (
    <div className="w-full bg-gradient-to-br from-[#0c0c12] via-[#08080c] to-[#040406] border border-white/5 rounded-3xl overflow-hidden shadow-2xl relative select-none">
      {/* Glow Backdrops */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-brand/5 rounded-full blur-[110px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-brand-gold/5 rounded-full blur-[110px] pointer-events-none" />

      <div className="flex flex-col lg:flex-row items-stretch">
        
        {/* Banner image on left/top */}
        <div className="flex-1 min-h-[250px] lg:min-h-0 relative overflow-hidden group">
          <img
            src={item.image || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=800'}
            alt={item.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 filter brightness-[0.75]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent lg:hidden" />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-black/90 hidden lg:block" />
          
          {/* Top floating discount tag */}
          <div className="absolute top-6 left-6 bg-brand text-white text-xs font-black uppercase px-4 py-2 rounded-xl tracking-wider shadow-lg shadow-brand/25 flex items-center gap-1.5 border border-brand/20">
            <Ticket size={13} /> {item.discountBadge}
          </div>
        </div>

        {/* Details & countdown on right */}
        <div className="flex-1 p-8 md:p-12 flex flex-col justify-between gap-6 relative z-10 text-left">
          
          {/* Title and details */}
          <div className="flex flex-col gap-4">
            <span className="text-[10px] text-brand-gold font-extrabold uppercase tracking-widest">
              Ưu đãi nổi bật tuần này
            </span>
            <h2 className="text-2xl md:text-3xl font-black text-white leading-tight uppercase tracking-tight">
              {item.title}
            </h2>
            <p className="text-xs md:text-sm text-gray-400 leading-relaxed font-medium">
              {item.desc}
            </p>
          </div>

          {/* Countdown timer */}
          <div className="flex flex-col gap-3 pb-6 border-b border-white/5">
            <span className="text-[9px] text-gray-500 font-extrabold uppercase tracking-widest flex items-center gap-1.5">
              <Clock size={12} className="text-brand" /> Thời gian còn lại
            </span>
            <div className="flex items-center gap-3">
              {[
                { value: timeLeft.days, label: 'Ngày' },
                { value: timeLeft.hours, label: 'Giờ' },
                { value: timeLeft.minutes, label: 'Phút' },
                { value: timeLeft.seconds, label: 'Giây' },
              ].map((unit, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="flex flex-col items-center">
                    <div className="bg-white/5 border border-white/5 rounded-xl h-14 w-14 flex items-center justify-center text-xl font-black text-white shadow-inner">
                      {unit.value.toString().padStart(2, '0')}
                    </div>
                    <span className="text-[8px] text-gray-500 font-extrabold uppercase tracking-wider mt-1">{unit.label}</span>
                  </div>
                  {index < 3 && <span className="text-xl font-black text-brand-gold/60 mb-5">:</span>}
                </div>
              ))}
            </div>
          </div>

          {/* Call to actions */}
          <div className="flex items-center justify-between gap-4 mt-2">
            <div className="flex flex-col gap-1">
              <span className="text-[8px] text-gray-500 font-bold uppercase tracking-wider">Mã khuyến mãi</span>
              <span className="text-sm font-black text-brand-gold select-all font-mono tracking-widest">{item.code}</span>
            </div>

            <motion.button
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onActionClick(item.slug)}
              className="px-6 py-3.5 bg-brand hover:bg-brand-hover text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-brand/20 flex items-center gap-2 cursor-pointer border border-brand/20"
            >
              Đặt Vé Ngay <ArrowRight size={14} />
            </motion.button>
          </div>

        </div>

      </div>
    </div>
  );
};
