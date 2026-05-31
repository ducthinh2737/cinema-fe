import React, { useState, useEffect } from 'react';
import { Timer, AlertTriangle } from 'lucide-react';

interface CountdownTimerProps {
  initialSeconds: number;
  onExpire: () => void;
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({
  initialSeconds,
  onExpire,
}) => {
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);

  useEffect(() => {
    if (secondsLeft <= 0) {
      onExpire();
      return;
    }

    const timer = setInterval(() => {
      setSecondsLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [secondsLeft, onExpire]);

  const formatTime = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const isLowTime = secondsLeft < 120; // less than 2 minutes

  return (
    <div className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl border transition-all duration-300 ${
      isLowTime
        ? 'border-brand/40 bg-brand/10 text-brand shadow-[0_0_15px_rgba(229,9,20,0.15)] animate-pulse'
        : 'border-white/5 bg-white/[0.02] text-gray-300'
    }`}>
      {isLowTime ? (
        <AlertTriangle size={15} className="text-brand flex-shrink-0" />
      ) : (
        <Timer size={15} className="text-brand-gold flex-shrink-0" />
      )}
      
      <div className="flex flex-col text-left">
        <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">Seat Hold Time</span>
        <span className="text-sm font-black tracking-wider leading-none mt-0.5 font-mono">
          {formatTime(secondsLeft)}
        </span>
      </div>
    </div>
  );
};
