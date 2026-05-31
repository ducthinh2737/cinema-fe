import React from 'react';
import { motion } from 'framer-motion';
import { Wifi, Heart, Coffee, ShieldCheck, Volume2, CarFront } from 'lucide-react';

export const CinemaFacilities: React.FC = () => {
  const facilities = [
    {
      icon: <CarFront className="w-5 h-5 text-emerald-400" />,
      title: "Bãi đỗ xe rộng rãi",
      desc: "Trông giữ xe máy & ô tô an toàn, rộng rãi, tiện lợi."
    },
    {
      icon: <Wifi className="w-5 h-5 text-blue-400" />,
      title: "Wifi tốc độ cao",
      desc: "Phủ sóng miễn phí toàn khu vực phòng chờ sảnh rạp."
    },
    {
      icon: <Coffee className="w-5 h-5 text-amber-400" />,
      title: "Quầy Food & Drink",
      desc: "Đầy đủ bắp rang bơ thơm ngon, nước ngọt và combo độc quyền."
    },
    {
      icon: <ShieldCheck className="w-5 h-5 text-cyan-400" />,
      title: "Phòng chiếu IMAX / VIP",
      desc: "Màn hình cong khổng lồ chuẩn quốc tế sắc nét vượt trội."
    },
    {
      icon: <Volume2 className="w-5 h-5 text-purple-400" />,
      title: "Dolby Atmos 7.1",
      desc: "Hệ thống âm thanh vòm sống động tái hiện từng tiếng động nhỏ."
    },
    {
      icon: <Heart className="w-5 h-5 text-brand" />,
      title: "Ghế đôi Couple",
      desc: "Ghế đôi Sweetbox riêng tư mang đến cảm giác thoải mái."
    }
  ];

  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.08
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.35 } }
  };

  return (
    <div className="glass-panel p-6 md:p-8 rounded-3xl border border-white/5 text-left flex flex-col gap-6 relative overflow-hidden">
      <div>
        <h3 className="text-lg font-black text-white uppercase tracking-wider">Tiện Ích Tại Rạp</h3>
        <p className="text-xs text-gray-400 mt-1">Các cơ sở vật chất và tiện ích có sẵn tại cụm rạp này.</p>
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-50px" }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
      >
        {facilities.map((fac, idx) => (
          <motion.div
            key={idx}
            variants={itemVariants}
            whileHover={{ y: -3, scale: 1.02, backgroundColor: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.1)' }}
            className="p-4 rounded-2xl bg-white/[0.015] border border-white/5 text-left flex items-start gap-4 transition-all duration-300 select-none group"
          >
            <div className="p-3 bg-white/5 border border-white/5 rounded-xl shrink-0 group-hover:bg-white/10 transition-colors">
              {fac.icon}
            </div>
            <div className="flex flex-col gap-1 min-w-0">
              <h4 className="text-xs font-black text-white group-hover:text-brand-gold transition-colors truncate">
                {fac.title}
              </h4>
              <p className="text-[10px] text-gray-500 font-semibold leading-relaxed">
                {fac.desc}
              </p>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
};
