import React from 'react';
import { Gift, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

export const PromotionSection: React.FC = () => {
  const promos = [
    {
      id: 1,
      title: "Đồng Giá 45K Vé Học Sinh Sinh Viên",
      desc: "Áp dụng cho mọi suất chiếu từ Thứ 2 đến Thứ 6 hàng tuần khi xuất trình thẻ HSSV hợp lệ.",
      code: "STUDENT45",
      badge: "Học sinh - Sinh viên",
      gradient: "from-[#1a2c5a] to-[#0d162d]"
    },
    {
      id: 2,
      title: "Thứ Ba Vui Vẻ - Đồng Giá 50K/vé 2D",
      desc: "Xem phim thả ga ngày thứ ba hàng tuần với ưu đãi vé 2D đồng giá cực sốc tại rạp.",
      code: "HAPPYTUE",
      badge: "Ưu đãi tuần",
      gradient: "from-brand to-[#7a030a]"
    },
    {
      id: 3,
      title: "Ưu Đãi Combo Bắp Nước Sweetbox",
      desc: "Tặng ngay 1 bắp ngọt lớn và 2 nước ngọt mát lạnh khi mua vé đôi ghế Sweetbox trực tuyến.",
      code: "SWEETBOXCOMBO",
      badge: "Combo Sweetbox",
      gradient: "from-[#2e0854] to-[#120224]"
    }
  ];

  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
  };

  return (
    <div className="glass-panel p-6 md:p-8 rounded-3xl border border-white/5 text-left flex flex-col gap-6 relative overflow-hidden">
      <div>
        <h3 className="text-lg font-black text-white uppercase tracking-wider flex items-center gap-2">
          <Gift className="text-brand-gold" size={18} /> Chương Trình Ưu Đãi Bán Chạy
        </h3>
        <p className="text-xs text-gray-400 mt-1">Các chương trình khuyến mãi và quà tặng đặc sắc dành riêng cho bạn.</p>
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-50px" }}
        className="grid grid-cols-1 md:grid-cols-3 gap-5"
      >
        {promos.map((promo) => (
          <motion.div
            key={promo.id}
            variants={cardVariants}
            whileHover={{ y: -4, scale: 1.02 }}
            className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${promo.gradient} p-5 border border-white/5 flex flex-col justify-between gap-6 group`}
          >
            {/* Sphere glow */}
            <div className="absolute top-[-30%] right-[-10%] w-32 h-32 bg-brand-gold/10 rounded-full blur-[30px] pointer-events-none" />

            <div className="flex flex-col gap-2 relative z-10">
              <span className="text-[8px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded bg-black/40 text-brand-gold w-max border border-white/5">
                {promo.badge}
              </span>
              <h4 className="text-sm font-black text-white group-hover:text-brand-gold transition-colors leading-snug">
                {promo.title}
              </h4>
              <p className="text-[10px] text-gray-400 font-semibold leading-relaxed">
                {promo.desc}
              </p>
            </div>

            <div className="flex items-center justify-between border-t border-white/5 pt-4 mt-auto relative z-10">
              <div className="flex flex-col gap-0.5 font-mono">
                <span className="text-[8px] uppercase text-gray-500 font-sans font-bold">Mã Code</span>
                <span className="text-xs font-black text-white tracking-widest">{promo.code}</span>
              </div>
              <span className="text-[9px] text-brand-gold font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer">
                Chi Tiết <ArrowRight size={10} className="group-hover:translate-x-1 transition-transform" />
              </span>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
};
