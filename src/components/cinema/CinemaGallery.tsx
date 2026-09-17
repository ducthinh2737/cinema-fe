import React from 'react';
import type { Cinema } from '../../types';
import { getImageUrl } from '../../api/client';

interface CinemaGalleryProps {
  cinema: Cinema;
}

export const CinemaGallery: React.FC<CinemaGalleryProps> = ({ cinema }) => {
  // Parse custom gallery URLs if uploaded
  const customGallery = cinema.galleryUrls
    ? cinema.galleryUrls.split(',').filter(Boolean).map((url, idx) => ({
        url: getImageUrl(url),
        caption: `Hình ảnh không gian rạp ${idx + 1}`
      }))
    : [];

  // Curated realistic cinema interior images
  const fallbackImages = [
    {
      url: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=800",
      caption: "Lobby chính cụm rạp sang trọng"
    },
    {
      url: "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?q=80&w=800",
      caption: "Phòng chiếu tiêu chuẩn IMAX cao cấp"
    },
    {
      url: "https://images.unsplash.com/photo-1595769816263-9b910be24d5f?q=80&w=800",
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

  const galleryImages = customGallery.length > 0 ? customGallery : fallbackImages;

  return (
    <div className="text-left flex flex-col gap-6 relative">

      {/* Masonry Layout 3 Col (CSS Columns) */}
      <div className="columns-1 sm:columns-2 md:columns-3 gap-4 space-y-4">
        {galleryImages.map((img, idx) => (
          <div 
            key={idx} 
            className="break-inside-avoid overflow-hidden rounded-2xl bg-black/40 border border-white/5 cursor-pointer transition-all duration-300 hover:scale-[1.03] hover:border-brand/40 shadow-lg hover:shadow-black/50"
          >
            <img
              src={img.url}
              alt={img.caption || `Gallery image ${idx}`}
              className="w-full h-auto object-cover block"
              loading="lazy"
            />
          </div>
        ))}
      </div>
    </div>
  );
};
