import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

/**
 * Enterprise-grade hook for stable countdown timer tracking.
 * Calculates time remaining using actual system clock offsets to prevent interval drifting or stale closure lag.
 */
export const useSeatTimer = (initialSeconds: number = 600, onTimeout: () => void) => {
  const [timeLeft, setTimeLeft] = useState<number>(initialSeconds);
  const timerRef = useRef<any>(null);
  const timeoutCallbackRef = useRef<() => void>(onTimeout);

  // Keep timeout callback reference fresh
  useEffect(() => {
    timeoutCallbackRef.current = onTimeout;
  }, [onTimeout]);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const resetTimer = useCallback((seconds: number = 600) => {
    stopTimer();
    setTimeLeft(seconds);
    
    const startTime = Date.now();
    const targetSeconds = seconds;

    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const remaining = Math.max(targetSeconds - elapsed, 0);

      setTimeLeft(remaining);

      if (remaining <= 0) {
        stopTimer();
        timeoutCallbackRef.current();
      }
    }, 1000);
  }, [stopTimer]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTimer();
    };
  }, [stopTimer]);

  const formattedTime = useMemo(() => {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, [timeLeft]);

  return {
    timeLeft,
    formattedTime,
    resetTimer,
    stopTimer
  };
};
