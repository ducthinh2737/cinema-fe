import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Calendar } from 'lucide-react';

export interface TrendingPost {
  id: number;
  title: string;
  slug: string;
  views: string;
  date: string;
}

export interface PopularPromo {
  id: number;
  title: string;
  slug: string;
  image: string;
  discount: string;
}

interface TrendingSidebarProps {
  trendingPosts: TrendingPost[];
  popularPromos: PopularPromo[];
  onPostClick: (slug: string) => void;
}

export const TrendingSidebar: React.FC<TrendingSidebarProps> = ({
  trendingPosts,
  popularPromos,
  onPostClick,
}) => {
  return (
    <aside className="w-full flex flex-col gap-8 sticky top-28 select-none text-left">
      
      {/* 1. Popular Promotions (Mini-Cards) */}
      {popularPromos.length > 0 && (
        <div className="bg-[#0c0c12] border border-white/5 rounded-3xl p-6 flex flex-col gap-5">
          <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-1.5 pb-3 border-b border-white/5">
            <Sparkles size={13} className="text-brand-gold" /> Ưu Đãi Phổ Biến
          </h3>
          
          <div className="flex flex-col gap-4">
            {popularPromos.map((promo) => (
              <motion.div
                key={promo.id}
                onClick={() => onPostClick(promo.slug)}
                whileHover={{ x: 3 }}
                className="flex items-center gap-3.5 group cursor-pointer"
              >
                <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 border border-white/5 bg-[#07070a]">
                  <img
                    src={promo.image}
                    alt={promo.title}
                    className="w-full h-full object-cover filter brightness-90 group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="flex-grow flex flex-col gap-1 min-w-0">
                  <span className="text-[8px] font-black text-brand uppercase tracking-wider">
                    {promo.discount}
                  </span>
                  <h4 className="text-xs font-black text-white group-hover:text-brand transition-colors line-clamp-2 leading-tight">
                    {promo.title}
                  </h4>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* 2. Trending Posts (Text-list) */}
      {trendingPosts.length > 0 && (
        <div className="bg-[#0c0c12] border border-white/5 rounded-3xl p-6 flex flex-col gap-5">
          <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-1.5 pb-3 border-b border-white/5">
            <Sparkles size={13} className="text-brand" /> Tin Đọc Nhiều Nhất
          </h3>
          
          <div className="flex flex-col gap-5">
            {trendingPosts.map((post, idx) => (
              <div
                key={post.id}
                onClick={() => onPostClick(post.slug)}
                className="flex gap-3.5 cursor-pointer group"
              >
                <span className="text-xl font-black text-white/10 group-hover:text-brand-gold/60 transition-colors pt-0.5 w-5 text-center leading-none">
                  {(idx + 1).toString().padStart(2, '0')}
                </span>
                <div className="flex-grow flex flex-col gap-1.5 min-w-0">
                  <h4 className="text-xs font-black text-white group-hover:text-brand transition-colors line-clamp-2 leading-normal">
                    {post.title}
                  </h4>
                  <div className="flex items-center gap-3 text-[9px] text-gray-500 font-bold">
                    <span className="flex items-center gap-1">
                      <Calendar size={10} className="text-gray-600" /> {post.date}
                    </span>
                    <span>•</span>
                    <span>{post.views} lượt xem</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </aside>
  );
};
