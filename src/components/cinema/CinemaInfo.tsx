import React from 'react';
import { motion } from 'framer-motion';
import type { Cinema } from '../../types';

interface CinemaInfoProps {
  cinema: Cinema | null;
  loading: boolean;
}

export const CinemaInfo: React.FC<CinemaInfoProps> = ({ cinema, loading }) => {
  if (loading) {
    return (
      <div className="glass-panel p-6 rounded-3xl animate-pulse flex flex-col gap-4">
        <div className="h-6 bg-white/5 rounded-xl w-1/3" />
        <div className="h-4 bg-white/5 rounded-xl w-full" />
        <div className="h-4 bg-white/5 rounded-xl w-5/6" />
        <div className="h-4 bg-white/5 rounded-xl w-2/3" />
      </div>
    );
  }

  if (!cinema) return null;

  // Dynamic details with static fallback data for cinema details
  const details = {
    hotline: cinema.phone || '1900 2088',
    email: cinema.email || 'support@cinemapass.com',
    description: `Chào mừng bạn đến với ${cinema.name}. Rạp chiếu phim được trang bị hệ thống màn chiếu sắc nét tiêu chuẩn quốc tế, âm thanh vòm Dolby sống động cùng hệ thống phòng chiếu hiện đại và ghế ngồi êm ái. Với không gian thiết kế trẻ trung, hiện đại và ấm áp, chúng tôi cam kết mang tới cho khán giả những trải nghiệm điện ảnh thăng hoa cùng phút giây thư giãn tuyệt vời bên người thân.`
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="text-left flex flex-col gap-6 relative"
    >
      <div>
        <h3 className="text-lg font-black text-white uppercase tracking-wider">
          Thông Tin Chi Tiết
        </h3>

      </div>

      {/* 2-column grid specifications */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-0.5">
        {/* Address Row */}
        <div className="grid grid-cols-1 md:grid-cols-[140px_1fr] py-3.5 border-b border-dashed border-white/5 items-center gap-1 md:gap-4">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Địa Chỉ</span>
          <span className="text-sm text-gray-200 font-semibold flex items-center gap-2">
            <span className="text-gray-600"></span>
            <span>{cinema.address}</span>
          </span>
        </div>

        {/* Hotline Row */}
        <div className="grid grid-cols-1 md:grid-cols-[140px_1fr] py-3.5 border-b border-dashed border-white/5 items-center gap-1 md:gap-4">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Hotline Đặt Vé</span>
          <span className="text-sm text-gray-200 font-semibold flex items-center gap-2">
            <span className="text-gray-600"></span>
            <a href={`tel:${details.hotline}`} className="hover:text-brand transition-colors">
              {details.hotline}
            </a>
          </span>
        </div>

        {/* Email Row */}
        <div className="grid grid-cols-1 md:grid-cols-[140px_1fr] py-3.5 border-b border-dashed border-white/5 items-center gap-1 md:gap-4">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Email Liên Hệ</span>
          <span className="text-sm text-gray-200 font-semibold flex items-center gap-2 truncate">
            <span className="text-gray-600"></span>
            <a href={`mailto:${details.email}`} className="hover:text-brand transition-colors truncate">
              {details.email}
            </a>
          </span>
        </div>
      </div>

      {/* About Section */}
      <div className="border-t border-white/5 pt-5 flex flex-col gap-2">

        <p className="text-xs md:text-sm text-gray-400 leading-relaxed font-semibold">
          {details.description}
        </p>
      </div>
    </motion.div>
  );
};
