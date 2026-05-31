import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Image as ImageIcon } from 'lucide-react';

interface CinemaGalleryProps {
  cinemaName: string;
}

export const CinemaGallery: React.FC<CinemaGalleryProps> = ({ cinemaName }) => {
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Curated realistic cinema interior images
  const galleryImages = [
    {
      url: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=800",
      caption: "Lobby chính cụm rạp sang trọng"
    },
    {
      url: "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?q=80&w=800",
      caption: "Phòng chiếu tiêu chuẩn IMAX cao cấp"
    },
    {
      url: "https://images.unsplash.com/photo-1574267431622-7911852d82f7?q=80&w=800",
      caption: "Hàng ghế đôi Sweetbox lãng mạn"
    },
    {
      url: "https://images.unsplash.com/photo-1478720568477-152d9b164e26?q=80&w=800",
      caption: "Không gian quầy bán bắp rang bơ & nước uống"
    },
    {
      url: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=800",
      caption: "Góc thư giãn check-in cực chất"
    }
  ];

  return (
    <div className="glass-panel p-6 md:p-8 rounded-3xl border border-white/5 text-left flex flex-col gap-6 relative overflow-hidden">
      <div>
        <h3 className="text-lg font-black text-white uppercase tracking-wider flex items-center gap-2">
          <ImageIcon className="text-brand-gold shrink-0" size={16} /> Hình Ảnh Không Gian Rạp
        </h3>
        <p className="text-xs text-gray-400 mt-1">Khám phá nội thất phòng chiếu và góc sảnh đẳng cấp của {cinemaName}.</p>
      </div>

      <div className="flex flex-col gap-4">
        {/* Large Preview Image */}
        <div className="relative h-[250px] md:h-[400px] w-full rounded-2xl overflow-hidden bg-black/40 border border-white/5 group">
          <AnimatePresence mode="wait">
            <motion.img
              key={activeImageIndex}
              src={galleryImages[activeImageIndex].url}
              alt={galleryImages[activeImageIndex].caption}
              initial={{ opacity: 0, scale: 1.02 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          </AnimatePresence>

          {/* Gradient Overlay for Caption */}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 flex items-end">
            <motion.span
              key={activeImageIndex}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xs font-bold text-white tracking-wide"
            >
              {galleryImages[activeImageIndex].caption}
            </motion.span>
          </div>
        </div>

        {/* Thumbnail Selector Slider */}
        <div className="flex items-center gap-2.5 overflow-x-auto pb-2 scrollbar-none snap-x">
          {galleryImages.map((img, idx) => {
            const isActive = idx === activeImageIndex;
            return (
              <motion.div
                key={idx}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setActiveImageIndex(idx)}
                className={`relative shrink-0 w-20 h-14 md:w-28 md:h-20 rounded-xl overflow-hidden border cursor-pointer snap-start transition-all duration-300 ${
                  isActive
                    ? 'border-brand shadow-[0_0_10px_rgba(229,9,20,0.35)] scale-102'
                    : 'border-white/5 hover:border-white/20 opacity-60 hover:opacity-100'
                }`}
              >
                <img
                  src={img.url}
                  alt={img.caption}
                  className="w-full h-full object-cover"
                />
                {isActive && (
                  <div className="absolute inset-0 bg-brand/5 border border-brand/50 rounded-xl pointer-events-none" />
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
