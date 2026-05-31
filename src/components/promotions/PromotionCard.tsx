import React from 'react';
import { motion } from 'framer-motion';
import { Calendar, ChevronRight } from 'lucide-react';

export interface PromotionItem {
  id: number;
  title: string;
  shortDesc: string;
  image: string;
  date: string;
  category: string;
  categoryLabel: string;
  slug: string;
}

interface PromotionCardProps {
  item: PromotionItem;
  onClick: (slug: string) => void;
}

export const PromotionCard: React.FC<PromotionCardProps> = ({ item, onClick }) => {
  return (
    <motion.div
      onClick={() => onClick(item.slug)}
      whileHover={{ y: -6, scale: 1.01 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className="group cursor-pointer bg-white/[0.02] border border-white/5 hover:border-brand/30 rounded-3xl overflow-hidden flex flex-col gap-4 shadow-xl hover:shadow-[0_0_30px_rgba(224,36,36,0.1)] transition-all duration-300 select-none text-left"
    >
      {/* Thumbnail Wrapper */}
      <div className="relative aspect-[16/10] overflow-hidden bg-[#0c0c12]">
        <img
          src={item.image || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=600'}
          alt={item.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 filter brightness-90 group-hover:brightness-75"
          loading="lazy"
        />

        {/* Tag Category Badge */}
        <div className="absolute top-4 left-4 bg-black/70 backdrop-blur-md border border-white/10 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider text-brand-gold">
          {item.categoryLabel}
        </div>
      </div>

      {/* Details Container */}
      <div className="px-6 pb-6 flex-grow flex flex-col justify-between gap-4">
        <div className="flex flex-col gap-2">
          {/* Validity dates */}
          <div className="flex items-center gap-1.5 text-[10px] text-gray-500 font-bold tracking-wider">
            <Calendar size={11} className="text-brand" />
            <span>HẠN DÙNG: {item.date}</span>
          </div>

          {/* Title */}
          <h3 className="text-base font-black text-white group-hover:text-brand transition-colors line-clamp-2 leading-snug uppercase tracking-tight">
            {item.title}
          </h3>

          {/* Short Desc */}
          <p className="text-xs text-gray-400 font-medium leading-relaxed line-clamp-3">
            {item.shortDesc}
          </p>
        </div>

        {/* Read More button */}
        <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-brand-gold group-hover:text-brand transition-colors w-max pt-1 border-t border-white/5 w-full">
          <span>Xem Chi Tiết</span>
          <ChevronRight size={12} className="group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </motion.div>
  );
};
