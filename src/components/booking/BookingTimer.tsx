import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Timer, AlertTriangle, Play, Pause, Volume2, VolumeX } from 'lucide-react';

interface BookingTimerProps {
  initialSeconds: number;
  onExpire: () => void;
}

export const BookingTimer: React.FC<BookingTimerProps> = ({
  initialSeconds,
  onExpire,
}) => {
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);
  const [isPaused, setIsPaused] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  
  const targetTimeRef = useRef<number>(Date.now() + initialSeconds * 1000);
  const hasWarnedRef = useRef(false);
  const lastTickRef = useRef(0);

  // Generate dynamic frequency alerts via Web Audio API (no external mp3 files required)
  const playBeep = (frequency: number, duration: number, type: OscillatorType = 'sine') => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.type = type;
      oscillator.frequency.value = frequency;
      
      gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);

      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + duration);
    } catch (err) {
      console.warn('AudioContext warning beep trigger skipped:', err);
    }
  };

  useEffect(() => {
    // Reset target time on initial seconds changes
    targetTimeRef.current = Date.now() + secondsLeft * 1000;
  }, [initialSeconds]);

  useEffect(() => {
    if (isPaused) return;

    const tick = () => {
      const remainingMs = targetTimeRef.current - Date.now();
      const remainingSecs = Math.max(0, Math.ceil(remainingMs / 1000));
      
      setSecondsLeft(remainingSecs);

      // Handle Expiration
      if (remainingSecs <= 0) {
        playBeep(220, 0.8, 'sawtooth');
        onExpire();
        return;
      }

      // Play audio cues
      // Warning sound at 2 minutes (120s)
      if (remainingSecs === 120 && !hasWarnedRef.current) {
        playBeep(587.33, 0.4, 'sine'); // D5 note chime
        hasWarnedRef.current = true;
      }
      
      // Intense countdown warning beeps every 15 seconds when below 1 minute (60s)
      if (remainingSecs < 60 && remainingSecs % 15 === 0 && lastTickRef.current !== remainingSecs) {
        playBeep(880, 0.15, 'sine'); // A5 short tick
        lastTickRef.current = remainingSecs;
      }
      
      // Fast ticks in the final 10 seconds
      if (remainingSecs <= 10 && lastTickRef.current !== remainingSecs) {
        playBeep(1200, 0.05, 'triangle');
        lastTickRef.current = remainingSecs;
      }
    };

    tick();
    const interval = setInterval(tick, 200);

    return () => clearInterval(interval);
  }, [isPaused, onExpire]);

  const handlePauseToggle = () => {
    setIsPaused((prev) => {
      if (!prev) {
        // Pausing: targetTimeRef is no longer ticking
        // Store seconds left in state
      } else {
        // Resuming: recalculate the target absolute time
        targetTimeRef.current = Date.now() + secondsLeft * 1000;
      }
      // Play a click sound
      playBeep(600, 0.05, 'sine');
      return !prev;
    });
  };

  const formatTime = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const isLowTime = secondsLeft < 120; // 2 minutes warning threshold
  const isCriticalTime = secondsLeft <= 30; // 30 seconds final rush

  // SVG circular properties
  const radius = 16;
  const strokeWidth = 3;
  const circumference = 2 * Math.PI * radius; // ~100.53
  const strokeDashoffset = circumference * (1 - secondsLeft / initialSeconds);

  // Shake animation configuration for critical time
  const containerAnimation = isCriticalTime
    ? {
        x: [0, -2, 2, -2, 2, 0],
        transition: { repeat: Infinity, duration: 0.5, repeatType: 'reverse' as const }
      }
    : isLowTime
    ? {
        scale: [1, 1.02, 1],
        transition: { repeat: Infinity, duration: 1.5 }
      }
    : {};

  return (
    <motion.div
      animate={containerAnimation}
      className={`flex items-center gap-4 px-4 py-2.5 rounded-2xl border transition-all duration-500 select-none backdrop-blur-md relative overflow-hidden ${
        isPaused
          ? 'border-amber-500/20 bg-amber-500/5 text-amber-400'
          : isLowTime
          ? 'border-brand/40 bg-brand/10 text-brand shadow-[0_0_25px_rgba(229,9,20,0.2)]'
          : 'border-white/5 bg-white/[0.02] text-gray-300'
      }`}
    >
      {/* Circular Progress SVG Dial */}
      <div className="relative w-10 h-10 flex-shrink-0 flex items-center justify-center">
        <svg className="w-full h-full transform -rotate-90">
          {/* Background Track */}
          <circle
            cx="20"
            cy="20"
            r={radius}
            strokeWidth={strokeWidth}
            stroke="currentColor"
            className="opacity-10"
            fill="transparent"
          />
          {/* Animated Progress Ring */}
          <motion.circle
            cx="20"
            cy="20"
            r={radius}
            strokeWidth={strokeWidth}
            stroke={isPaused ? '#f59e0b' : isLowTime ? '#e50914' : '#e5a93b'}
            fill="transparent"
            strokeDasharray={circumference}
            animate={{ strokeDashoffset }}
            transition={{ duration: 0.5, ease: 'linear' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          {isPaused ? (
            <Pause size={12} className="text-amber-500 animate-pulse" />
          ) : isLowTime ? (
            <AlertTriangle size={12} className="text-brand animate-pulse" />
          ) : (
            <Timer size={12} className="text-brand-gold" />
          )}
        </div>
      </div>

      {/* Timer Digital Output */}
      <div className="flex flex-col text-left min-w-[80px]">
        <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">
          {isPaused ? 'ĐÃ TẠM DỪNG' : 'THỜI GIAN GIỮ GHẾ'}
        </span>
        <span className={`text-base font-black tracking-wider leading-none mt-1 font-mono ${
          isLowTime && !isPaused ? 'text-brand drop-shadow-[0_0_8px_rgba(229,9,20,0.5)]' : ''
        }`}>
          {formatTime(secondsLeft)}
        </span>
      </div>

      {/* Control Buttons */}
      <div className="flex items-center gap-1 border-l border-white/10 pl-3">
        {/* Play/Pause Button */}
        <button
          onClick={handlePauseToggle}
          className={`p-1.5 rounded-lg border hover:bg-white/5 transition-all cursor-pointer ${
            isPaused
              ? 'border-amber-500/20 text-amber-500 hover:border-amber-500/40'
              : 'border-white/5 text-gray-400 hover:text-white'
          }`}
          title={isPaused ? 'Tiếp tục' : 'Tạm dừng'}
        >
          {isPaused ? <Play size={12} /> : <Pause size={12} />}
        </button>

        {/* Audio Toggle Button */}
        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          className={`p-1.5 rounded-lg border border-white/5 transition-all cursor-pointer ${
            soundEnabled ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-400'
          }`}
          title={soundEnabled ? 'Tắt âm' : 'Bật âm'}
        >
          {soundEnabled ? <Volume2 size={12} /> : <VolumeX size={12} />}
        </button>
      </div>
    </motion.div>
  );
};
