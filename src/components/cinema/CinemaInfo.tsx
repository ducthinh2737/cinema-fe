import React from 'react';
import { Phone, Mail, Clock, MapPin, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Cinema } from '../../types';

interface CinemaInfoProps {
  cinema: Cinema | null;
  loading: boolean;
}

export const CinemaInfo: React.FC<CinemaInfoProps> = ({ cinema, loading }) => {
  if (loading) {
    return (
      <div className="glass-panel p-6 rounded-3xl border border-white/5 animate-pulse flex flex-col gap-4">
        <div className="h-6 bg-white/10 rounded w-1/3" />
        <div className="h-4 bg-white/5 rounded w-full" />
        <div className="h-4 bg-white/5 rounded w-5/6" />
        <div className="h-4 bg-white/5 rounded w-2/3" />
      </div>
    );
  }

  if (!cinema) return null;

  // Static fallback data for cinema details not in backend schema
  const details = {
    hotline: '1900 6467',
    email: `contact@betacinemas.vn`,
    hours: '08:00 - 23:30 (Mở cửa tất cả các ngày trong tuần, kể cả ngày Lễ, Tết)',
    description: `Chào mừng bạn đến với ${cinema.name}. Rạp chiếu phim được trang bị hệ thống màn chiếu sắc nét tiêu chuẩn quốc tế, âm thanh vòm Dolby sống động cùng hệ thống phòng chiếu hiện đại và ghế ngồi êm ái. Với không gian thiết kế trẻ trung, hiện đại và ấm áp, chúng tôi cam kết mang tới cho khán giả những trải nghiệm điện ảnh thăng hoa cùng phút giây thư giãn tuyệt vời bên người thân.`
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="glass-panel p-6 md:p-8 rounded-3xl border border-white/5 text-left flex flex-col gap-6 relative overflow-hidden"
    >
      {/* Ambient background glow */}
      <div className="absolute -top-10 -right-10 w-48 h-48 bg-brand-gold/5 rounded-full blur-[40px] pointer-events-none" />

      <div>
        <h3 className="text-lg font-black text-white uppercase tracking-wider flex items-center gap-2">
          <Sparkles className="text-brand-gold shrink-0" size={16} /> Thông Tin Chi Tiết
        </h3>
        <p className="text-xs text-gray-400 mt-1">Thông tin liên hệ và giới thiệu chung về cụm rạp.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs font-semibold text-gray-300">
        {/* Address Row */}
        <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors">
          <div className="p-2.5 bg-brand-gold/10 rounded-xl text-brand-gold shrink-0">
            <MapPin size={16} />
          </div>
          <div className="flex flex-col gap-1 min-w-0">
            <span className="text-[10px] text-gray-500 uppercase tracking-wider">Địa Chỉ</span>
            <span className="text-white font-bold leading-normal">{cinema.address}</span>
          </div>
        </div>

        {/* Hotline Row */}
        <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors">
          <div className="p-2.5 bg-brand-gold/10 rounded-xl text-brand-gold shrink-0">
            <Phone size={16} />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-gray-500 uppercase tracking-wider">Hotline Đặt Vé</span>
            <a href={`tel:${details.hotline}`} className="text-white hover:text-brand font-bold transition-colors">
              {details.hotline}
            </a>
          </div>
        </div>

        {/* Email Row */}
        <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors">
          <div className="p-2.5 bg-brand-gold/10 rounded-xl text-brand-gold shrink-0">
            <Mail size={16} />
          </div>
          <div className="flex flex-col gap-1 min-w-0 truncate">
            <span className="text-[10px] text-gray-500 uppercase tracking-wider">Email Liên Hệ</span>
            <a href={`mailto:${details.email}`} className="text-white hover:text-brand font-bold transition-colors truncate">
              {details.email}
            </a>
          </div>
        </div>

        {/* Operating Hours Row */}
        <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors">
          <div className="p-2.5 bg-brand-gold/10 rounded-xl text-brand-gold shrink-0">
            <Clock size={16} />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-gray-500 uppercase tracking-wider">Giờ Hoạt Động</span>
            <span className="text-white font-bold leading-normal">{details.hours}</span>
          </div>
        </div>
      </div>

      {/* About Section */}
      <div className="border-t border-white/5 pt-5 flex flex-col gap-2">
        <h4 className="text-xs font-black uppercase text-brand-gold tracking-widest">Giới Thiệu Chung</h4>
        <p className="text-xs text-gray-400 font-semibold leading-relaxed">
          {details.description}
        </p>
      </div>
    </motion.div>
  );
};
