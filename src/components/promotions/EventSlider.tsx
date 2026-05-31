import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Sparkles, Calendar } from 'lucide-react';

export interface EventItem {
  id: number;
  title: string;
  image: string;
  date: string;
  tag: string;
  description: string;
}

interface EventSliderProps {
  events: EventItem[];
}

export const EventSlider: React.FC<EventSliderProps> = ({ events }) => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (events.length <= 1) return;
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % events.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [events.length]);

  if (!events || events.length === 0) return null;

  const handlePrev = () => {
    setIndex((prev) => (prev === 0 ? events.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setIndex((prev) => (prev + 1) % events.length);
  };

  const current = events[index];

  return (
    <div className="relative w-full aspect-[21/9] min-h-[220px] rounded-3xl overflow-hidden border border-white/5 bg-[#0c0c12] shadow-2xl select-none group text-left">
      <AnimatePresence mode="wait">
        <motion.div
          key={current.id}
          initial={{ opacity: 0, scale: 1.02 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
          className="absolute inset-0 w-full h-full"
        >
          {/* Backdrop Banner */}
          <img
            src={current.image || 'https://images.unsplash.com/photo-1514306191717-452ec28c7814?q=80&w=1200'}
            alt={current.title}
            className="w-full h-full object-cover filter brightness-[0.35] contrast-[1.05]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#07070a]/90 via-black/30 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#07070a]/95 via-transparent to-transparent hidden md:block" />
        </motion.div>
      </AnimatePresence>

      {/* Floating detail tag */}
      <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-10 z-10 gap-2 md:gap-3 max-w-xl">
        <div className="flex items-center gap-2">
          <span className="bg-brand-gold text-black text-[9px] font-black uppercase px-2.5 py-0.5 rounded tracking-wider flex items-center gap-1 shadow-lg shadow-brand-gold/10">
            <Sparkles size={9} /> {current.tag}
          </span>
          <span className="text-[10px] text-gray-400 font-bold flex items-center gap-1">
            <Calendar size={11} className="text-brand" /> {current.date}
          </span>
        </div>

        <h3 className="text-lg md:text-2xl font-black text-white uppercase tracking-tight leading-snug drop-shadow-md">
          {current.title}
        </h3>

        <p className="text-xs text-gray-400 leading-relaxed drop-shadow line-clamp-2 hidden sm:block">
          {current.description}
        </p>
      </div>

      {/* Sliding Arrow buttons */}
      {events.length > 1 && (
        <>
          <button
            onClick={handlePrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 h-9 w-9 rounded-xl border border-white/5 bg-black/40 hover:bg-black/85 text-white flex items-center justify-center transition-all cursor-pointer opacity-0 group-hover:opacity-100 backdrop-blur-sm"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={handleNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 h-9 w-9 rounded-xl border border-white/5 bg-black/40 hover:bg-black/85 text-white flex items-center justify-center transition-all cursor-pointer opacity-0 group-hover:opacity-100 backdrop-blur-sm"
          >
            <ChevronRight size={16} />
          </button>
        </>
      )}

      {/* Slide dots */}
      {events.length > 1 && (
        <div className="absolute bottom-6 right-6 z-20 flex items-center gap-1.5">
          {events.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                i === index ? 'w-5 bg-brand' : 'w-1.5 bg-white/20 hover:bg-white/50'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
};
