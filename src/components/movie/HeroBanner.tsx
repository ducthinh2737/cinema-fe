import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Movie } from '../../types';
import { getImageUrl } from '../../api/client';

interface HeroBannerProps {
  movies: Movie[];
}

const AUTOPLAY_MS = 6000;

export const HeroBanner: React.FC<HeroBannerProps> = ({ movies }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(1); // 1 = forward (next), -1 = backward (prev)
  const [isHoveringStrip, setIsHoveringStrip] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const goTo = (index: number) => {
    setDirection(index > currentIndex ? 1 : -1);
    setCurrentIndex(index);
  };

  // Auto-play interval (paused while hovering the thumbnail strip)
  useEffect(() => {
    if (movies.length <= 1 || isHoveringStrip) return;
    timerRef.current = setInterval(() => {
      setDirection(1);
      setCurrentIndex((prev) => (prev + 1) % movies.length);
    }, AUTOPLAY_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [movies.length, isHoveringStrip]);

  if (!movies || movies.length === 0) {
    return (
      <div className="h-[75vh] w-full bg-[#07070a] flex items-center justify-center">
        <div className="h-10 w-10 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const activeMovie = movies[currentIndex];

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDirection(-1);
    setCurrentIndex((prev) => (prev === 0 ? movies.length - 1 : prev - 1));
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % movies.length);
  };

  // True horizontal slide: incoming slide enters from the side it's coming from,
  // outgoing slide exits to the opposite side. Drag-to-swipe supported via framer-motion.
  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? '100%' : '-100%',
      opacity: 1,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir: number) => ({
      x: dir > 0 ? '-100%' : '100%',
      opacity: 1,
    }),
  };

  return (
    <div className="relative h-[75vh] md:h-[80vh] w-full overflow-hidden select-none bg-[#07070a]">
      {/* Sliding Track */}
      <AnimatePresence initial={false} custom={direction} mode="popLayout">
        <motion.div
          key={activeMovie.id}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ x: { type: 'spring', stiffness: 300, damping: 32 }, opacity: { duration: 0.15 } }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.15}
          onDragEnd={(_e, info) => {
            const threshold = 80;
            if (info.offset.x < -threshold) {
              setDirection(1);
              setCurrentIndex((prev) => (prev + 1) % movies.length);
            } else if (info.offset.x > threshold) {
              setDirection(-1);
              setCurrentIndex((prev) => (prev === 0 ? movies.length - 1 : prev - 1));
            }
          }}
          className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing"
        >
          {/* Backdrop Image */}
          <img
            src={getImageUrl(activeMovie.bannerUrl) || getImageUrl(activeMovie.posterUrl) || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=1470'}
            alt={activeMovie.title}
            draggable={false}
            className="absolute inset-0 w-full h-full object-cover object-top filter brightness-[1] contrast-[1.05] pointer-events-none"
          />

          {/* Cinematic Overlays */}
          <div className="absolute inset-0 bg-gradient-to-t from-background/50 via-background/15 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-background/30 via-transparent to-transparent hidden md:block" />
        </motion.div>
      </AnimatePresence>

      {/* Slide Navigation Arrows */}
      {movies.length > 1 && (
        <>
          <button
            onClick={handlePrev}
            aria-label="Phim trước"
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 h-11 w-11 rounded-full border border-white/10 bg-black/40 hover:bg-black/70 hover:border-white/30 text-white flex items-center justify-center transition-all cursor-pointer group backdrop-blur-sm"
          >
            <ChevronLeft size={20} className="group-hover:-translate-x-0.5 transition-transform" />
          </button>
          <button
            onClick={handleNext}
            aria-label="Phim tiếp theo"
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 h-11 w-11 rounded-full border border-white/10 bg-black/40 hover:bg-black/70 hover:border-white/30 text-white flex items-center justify-center transition-all cursor-pointer group backdrop-blur-sm"
          >
            <ChevronRight size={20} className="group-hover:translate-x-0.5 transition-transform" />
          </button>
        </>
      )}

      {/* Thumbnail Mini-Carousel (Netflix-style) */}
      {movies.length > 1 && (
        <div
          onMouseEnter={() => setIsHoveringStrip(true)}
          onMouseLeave={() => setIsHoveringStrip(false)}
          className="absolute bottom-5 left-6 md:left-12 z-20 flex items-end gap-2 px-3 py-2 rounded-xl bg-black/30 backdrop-blur-md border border-white/10"
        >
          {movies.map((movie, index) => {
            const isActive = index === currentIndex;
            return (
              <button
                key={movie.id}
                onClick={() => goTo(index)}
                aria-label={movie.title}
                aria-current={isActive}
                className={`relative shrink-0 overflow-hidden rounded-md transition-all duration-300 ease-out cursor-pointer ${isActive
                    ? 'h-14 w-24 ring-2 ring-brand ring-offset-1 ring-offset-black/30'
                    : 'h-10 w-16 opacity-50 hover:opacity-90 hover:h-11 hover:w-[4.25rem]'
                  }`}
              >
                <img
                  src={getImageUrl(movie.posterUrl) || getImageUrl(movie.bannerUrl) || ''}
                  alt=""
                  draggable={false}
                  className="absolute inset-0 w-full h-full object-cover"
                />
                {!isActive && <div className="absolute inset-0 bg-black/30" />}
                {isActive && (
                  <motion.div
                    key={`progress-${activeMovie.id}-${isHoveringStrip}`}
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: isHoveringStrip ? 0 : 1 }}
                    transition={{ duration: isHoveringStrip ? 0 : AUTOPLAY_MS / 1000, ease: 'linear' }}
                    className="absolute bottom-0 left-0 right-0 h-[3px] bg-brand origin-left"
                  />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};