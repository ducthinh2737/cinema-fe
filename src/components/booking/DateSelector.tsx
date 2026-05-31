import React from 'react';
import { motion } from 'framer-motion';
import { Calendar } from 'lucide-react';

interface DateSelectorProps {
  dates: string[]; // string representation of Dates
  selectedDate: string;
  onSelectDate: (date: string) => void;
}

export const DateSelector: React.FC<DateSelectorProps> = ({
  dates,
  selectedDate,
  onSelectDate,
}) => {
  const getDayDetails = (dateStr: string) => {
    const d = new Date(dateStr);
    const dayName = d.toLocaleDateString('vi-VN', { weekday: 'short' });
    const dayNum = d.toLocaleDateString('vi-VN', { day: '2-digit' });
    const monthName = d.toLocaleDateString('vi-VN', { month: 'short' });
    return { dayName, dayNum, monthName };
  };

  return (
    <div className="flex flex-col gap-3 select-none">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
          <Calendar size={12} className="text-brand" />
          Chọn Ngày Chiếu
        </span>
        {selectedDate && (
          <button
            onClick={() => onSelectDate('')}
            className="text-[10px] font-bold text-brand hover:underline"
          >
            Hiện Tất Cả Ngày
          </button>
        )}
      </div>

      <div className="flex gap-3 overflow-x-auto pb-3 pt-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
        {/* "All Dates" card */}
        <button
          onClick={() => onSelectDate('')}
          className={`relative flex flex-col items-center justify-center min-w-[70px] h-20 rounded-2xl border text-center transition-all ${
            selectedDate === ''
              ? 'border-brand bg-brand/10 text-white shadow-[0_0_15px_rgba(229,9,20,0.15)]'
              : 'border-white/5 hover:border-white/15 bg-white/[0.02] hover:bg-white/[0.04] text-gray-400 hover:text-white'
          }`}
        >
          <span className="text-[10px] font-black uppercase tracking-wider mb-1">Tất Cả</span>
          <span className="text-sm font-black">Ngày</span>
        </button>

        {dates.map((dateStr) => {
          const { dayName, dayNum, monthName } = getDayDetails(dateStr);
          const active = selectedDate === dateStr;

          return (
            <button
              key={dateStr}
              onClick={() => onSelectDate(dateStr)}
              className={`relative flex flex-col items-center justify-center min-w-[70px] h-20 rounded-2xl border text-center transition-all cursor-pointer ${
                active
                  ? 'border-brand bg-brand/10 text-white shadow-[0_0_15px_rgba(229,9,20,0.15)]'
                  : 'border-white/5 hover:border-white/15 bg-white/[0.02] hover:bg-white/[0.04] text-gray-400 hover:text-white'
              }`}
            >
              {active && (
                <motion.div
                  layoutId="activeDateGlow"
                  className="absolute inset-0 rounded-2xl border border-brand/40 pointer-events-none"
                  transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                />
              )}

              <span className={`text-[10px] font-bold uppercase tracking-wider ${active ? 'text-brand-gold' : 'text-gray-500'}`}>
                {dayName}
              </span>
              <span className="text-2xl font-black leading-none my-0.5">{dayNum}</span>
              <span className="text-[9px] font-semibold text-gray-500 uppercase tracking-widest">{monthName}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
