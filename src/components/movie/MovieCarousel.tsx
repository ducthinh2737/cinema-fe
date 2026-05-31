import React, { useRef } from 'react';
import type { Movie } from '../../types';
import { MovieCard } from './MovieCard';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface MovieCarouselProps {
  movies: Movie[];
}

export const MovieCarousel: React.FC<MovieCarouselProps> = ({ movies }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current;
      const scrollTo = direction === 'left' ? scrollLeft - clientWidth * 0.75 : scrollLeft + clientWidth * 0.75;
      scrollRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
    }
  };

  return (
    <div className="relative group w-full">
      {/* Scroll Left button */}
      <button
        onClick={() => scroll('left')}
        className="absolute left-[-20px] top-1/2 -translate-y-1/2 z-10 bg-black/60 backdrop-blur-md hover:bg-black border border-white/10 p-2.5 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-md cursor-pointer hidden md:block"
      >
        <ChevronLeft size={20} />
      </button>

      {/* Slider View container */}
      <div
        ref={scrollRef}
        className="flex gap-6 overflow-x-auto scrollbar-none py-4 px-1 scroll-smooth"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {movies.map((movie) => (
          <div key={movie.id} className="min-w-[180px] sm:min-w-[220px] max-w-[240px] flex-shrink-0">
            <MovieCard movie={movie} />
          </div>
        ))}
      </div>

      {/* Scroll Right button */}
      <button
        onClick={() => scroll('right')}
        className="absolute right-[-20px] top-1/2 -translate-y-1/2 z-10 bg-black/60 backdrop-blur-md hover:bg-black border border-white/10 p-2.5 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-md cursor-pointer hidden md:block"
      >
        <ChevronRight size={20} />
      </button>
    </div>
  );
};
