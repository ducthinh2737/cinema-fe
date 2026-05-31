import React from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, Calendar } from 'lucide-react';

export interface NewsItem {
  id: number;
  title: string;
  shortDesc: string;
  image: string;
  date: string;
  category: string;
  categoryLabel: string;
  slug: string;
  trending?: boolean;
}

interface NewsCardProps {
  news: NewsItem;
  onClick: (slug: string) => void;
}

export const NewsCard: React.FC<NewsCardProps> = ({ news, onClick }) => {
  return (
    <motion.div
      onClick={() => onClick(news.slug)}
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className="group cursor-pointer bg-white/[0.01] hover:bg-white/[0.03] border border-white/5 hover:border-white/10 rounded-2xl p-4 flex gap-4 transition-all duration-300 select-none text-left"
    >
      {/* Small Thumbnail */}
      <div className="w-24 sm:w-28 aspect-square rounded-xl overflow-hidden shrink-0 bg-[#0c0c12] border border-white/5">
        <img
          src={news.image || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=400'}
          alt={news.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 filter brightness-90 group-hover:brightness-75"
          loading="lazy"
        />
      </div>

      {/* Details details */}
      <div className="flex-grow flex flex-col justify-between py-1 min-w-0">
        <div className="flex flex-col gap-1.5">
          {/* Header row with tags */}
          <div className="flex items-center gap-2">
            <span className="text-[8px] font-black uppercase tracking-wider text-brand bg-brand/10 border border-brand/20 px-2 py-0.5 rounded">
              {news.categoryLabel}
            </span>
            {news.trending && (
              <span className="text-[8px] font-black uppercase tracking-wider text-brand-gold bg-brand-gold/10 border border-brand-gold/20 px-2 py-0.5 rounded animate-pulse">
                Hot
              </span>
            )}
          </div>

          {/* Title */}
          <h4 className="text-sm font-black text-white group-hover:text-brand transition-colors line-clamp-2 leading-snug tracking-tight">
            {news.title}
          </h4>

          {/* Short Desc */}
          <p className="text-[11px] text-gray-500 line-clamp-1 leading-relaxed">
            {news.shortDesc}
          </p>
        </div>

        {/* Date line */}
        <div className="flex items-center justify-between gap-2 border-t border-white/5 pt-1.5 mt-1">
          <div className="flex items-center gap-1 text-[9px] text-gray-500 font-bold">
            <Calendar size={10} className="text-gray-600" />
            <span>{news.date}</span>
          </div>

          <div className="flex items-center gap-0.5 text-[9px] font-black uppercase tracking-widest text-brand-gold group-hover:text-brand transition-colors">
            <span>Đọc tiếp</span>
            <ChevronRight size={10} className="group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </div>
    </motion.div>
  );
};
