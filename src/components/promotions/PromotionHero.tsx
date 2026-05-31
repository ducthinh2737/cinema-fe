import React from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, Home, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

export const PromotionHero: React.FC = () => {
  return (
    <div className="relative h-[40vh] min-h-[300px] w-full overflow-hidden flex items-center bg-[#07070a] select-none">
      {/* Background Image with Cinematic Overlay */}
      <div className="absolute inset-0">
        <img
          src="https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=1470"
          alt="Promotions Banner Background"
          className="w-full h-full object-cover object-center filter brightness-[0.25] contrast-[1.1] scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-transparent" />
      </div>

      {/* Floating Neon Glow Effects */}
      <div className="absolute top-1/4 left-1/3 w-72 h-72 bg-brand/10 rounded-full blur-[120px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-brand-gold/10 rounded-full blur-[130px] pointer-events-none animate-pulse" style={{ animationDuration: '8s' }} />

      {/* Hero Content Wrapper */}
      <div className="max-w-7xl mx-auto w-full px-6 md:px-12 relative z-10 text-left flex flex-col gap-4">
        {/* Breadcrumbs */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 text-xs font-semibold text-gray-400 bg-white/[0.03] border border-white/5 rounded-xl px-4 py-2 w-max backdrop-blur-md"
        >
          <Link to="/" className="hover:text-white transition-colors flex items-center gap-1.5">
            <Home size={12} />
            <span>Trang Chủ</span>
          </Link>
          <ChevronRight size={10} className="text-gray-600" />
          <span className="text-brand-gold">Tin Mới & Ưu Đãi</span>
        </motion.div>

        {/* Cinematic Animated Titles */}
        <div className="flex flex-col gap-2 mt-2">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1, duration: 0.6 }}
            className="flex items-center gap-2 text-brand text-[10px] font-black uppercase tracking-widest bg-brand/10 border border-brand/20 px-3 py-1 rounded-md w-max"
          >
            <Sparkles size={10} className="animate-pulse" /> Khuyến mãi độc quyền
          </motion.div>
          
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="text-4xl md:text-5xl font-black text-white tracking-tight uppercase leading-tight font-sans drop-shadow-lg"
          >
            Tin Mới & <span className="bg-gradient-to-r from-brand-gold via-yellow-400 to-brand-gold bg-clip-text text-transparent">Ưu Đãi</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="text-xs md:text-sm text-gray-400 max-w-xl font-medium leading-relaxed drop-shadow"
          >
            Tổng hợp tin tức điện ảnh nóng hổi nhất, các chương trình khuyến mãi đặc biệt và voucher giảm giá cực hấp dẫn dành riêng cho thành viên CinemaPass.
          </motion.p>
        </div>
      </div>
    </div>
  );
};
