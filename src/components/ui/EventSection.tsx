import React from 'react';
import { Calendar, Award, Flame, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

export const EventSection: React.FC = () => {
  const events = [
    {
      id: 1,
      title: "Liên Hoan Phim Hoạt Hình Anime Nhật Bản",
      date: "01/06 - 15/06/2026",
      desc: "Trải nghiệm lại các tuyệt tác điện ảnh của Studio Ghibli và Makoto Shinkai độc quyền tại CinemaPass.",
      tag: "Film Festival",
      image: "https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=400",
      gradient: "from-[#ef4444]/20 to-[#e5a93b]/20"
    },
    {
      id: 2,
      title: "Ra Mắt Combo Minion Siêu Cấp Đáng Yêu",
      date: "Áp dụng ngay hôm nay",
      desc: "Nhận ngay 1 ly Minion Bucket giới hạn cùng 2 nước ngọt lớn khi mua Combo Minion Gold.",
      tag: "Exclusive Combo",
      image: "https://images.unsplash.com/photo-1594909122845-11baa439b7bf?q=80&w=400",
      gradient: "from-[#3b82f6]/20 to-[#ef4444]/20"
    },
    {
      id: 3,
      title: "Đêm Điện Ảnh Couple Sweetbox Night",
      date: "Mỗi tối Thứ Sáu hàng tuần",
      desc: "Đặt ghế đôi Sweetbox trực tuyến để được giảm giá 15% kèm miễn phí 1 bắp ngọt khổng lồ.",
      tag: "Special Night",
      image: "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?q=80&w=400",
      gradient: "from-[#8b5cf6]/20 to-[#ec4899]/20"
    }
  ];

  return (
    <div className="flex flex-col gap-6 w-full select-none text-left">
      <div>
        <h3 className="text-lg font-black uppercase tracking-widest text-white border-l-4 border-brand-gold pl-3 flex items-center gap-2">
          <Award className="text-brand-gold" size={20} /> Sự Kiện Nổi Bật
        </h3>
        <p className="text-xs text-gray-500 mt-1 pl-4">Khám phá các liên hoan phim quốc tế và combo ưu đãi giới hạn độc quyền.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {events.map((evt) => (
          <motion.div
            key={evt.id}
            whileHover={{ y: -6, scale: 1.02 }}
            className={`relative rounded-3xl overflow-hidden bg-gradient-to-br ${evt.gradient} border border-white/5 shadow-glass flex flex-col group`}
          >
            {/* Visual Header Image */}
            <div className="relative h-44 overflow-hidden">
              <img
                src={evt.image}
                alt={evt.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500 filter brightness-90 group-hover:brightness-75"
              />
              <span className="absolute top-4 left-4 bg-black/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10 text-[9px] font-black text-brand-gold uppercase tracking-wider">
                {evt.tag}
              </span>
            </div>

            {/* Info details */}
            <div className="p-5 flex flex-col justify-between flex-grow gap-4">
              <div className="flex flex-col gap-2">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1">
                  <Calendar size={12} className="text-brand" /> {evt.date}
                </span>
                <h4 className="text-sm font-black text-white group-hover:text-brand-gold transition-colors leading-snug line-clamp-2">
                  {evt.title}
                </h4>
                <p className="text-[11px] text-gray-400 font-medium leading-relaxed line-clamp-3">
                  {evt.desc}
                </p>
              </div>

              <div className="flex items-center justify-between border-t border-white/5 pt-4 mt-auto">
                <span className="text-[10px] text-brand-gold font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer">
                  Chi Tiết Sự Kiện <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
                </span>
                <Flame size={14} className="text-brand animate-pulse" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
