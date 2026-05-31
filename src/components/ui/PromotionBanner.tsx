import React from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

interface PromotionBannerProps {
  title: string;
  subtitle: string;
  code: string;
  discount: string;
  bgGradient?: string;
}

export const PromotionBanner: React.FC<PromotionBannerProps> = ({
  title,
  subtitle,
  code,
  discount,
  bgGradient = 'from-brand to-[#7a030a]',
}) => {
  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      className={`relative overflow-hidden rounded-3xl bg-gradient-to-r ${bgGradient} p-8 text-left shadow-glass flex flex-col md:flex-row items-center justify-between gap-6 border border-white/5 select-none`}
    >
      {/* Decorative sphere blur */}
      <div className="absolute top-[-50%] right-[-10%] w-72 h-72 bg-brand-gold/10 rounded-full blur-[60px]" />

      <div className="flex flex-col gap-2 relative z-10">
        <span className="flex items-center gap-1.5 text-brand-gold text-[10px] font-extrabold uppercase tracking-widest bg-black/35 px-3 py-1 rounded-full w-max">
          <Sparkles size={10} /> Ưu Đãi Đặc Biệt
        </span>
        <h3 className="text-xl md:text-2xl font-black text-white leading-tight">
          {title}
        </h3>
        <p className="text-xs text-gray-300 max-w-md">{subtitle}</p>
      </div>

      <div className="flex items-center gap-4 relative z-10 shrink-0">
        <div className="bg-black/40 backdrop-blur-md border border-white/10 px-5 py-3 rounded-2xl flex flex-col items-center gap-1 text-center font-mono">
          <span className="text-[10px] uppercase text-gray-400 font-sans font-bold">Nhập Mã</span>
          <span className="text-sm font-black text-brand-gold tracking-widest">{code}</span>
        </div>
        <div className="flex flex-col text-left">
          <span className="text-2xl font-black text-white">GIẢM {discount}</span>
          <span className="text-[10px] text-gray-300 font-bold uppercase tracking-wider flex items-center gap-1">
            Nhận Ưu Đãi <ArrowRight size={10} />
          </span>
        </div>
      </div>
    </motion.div>
  );
};
