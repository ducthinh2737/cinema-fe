import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { parseShowtimeTime } from '../time';

dayjs.extend(utc);
dayjs.extend(timezone);

export const TIMEZONE = 'Asia/Ho_Chi_Minh';

export interface NormalizedInterval {
  showtimeId: number;
  movieId: number;
  hallId: number;

  startTimeMs: number;
  endTimeMs: number;
  rawEndTimeMs: number;

  movieTitle: string;
}

export type HallShowtimeIndex = Map<number, NormalizedInterval[]>;

/**
 * SAFE overlap check (absolute time)
 */
export const isOverlap = (
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number
) => {
  return aStart < bEnd && aEnd > bStart;
};

/**
 * Checks if two time intervals overlap (startA < endB AND endA > startB)
 * Kept for backward compatibility.
 */
export const isTimeOverlap = (
  startA: dayjs.Dayjs,
  endA: dayjs.Dayjs,
  startB: dayjs.Dayjs,
  endB: dayjs.Dayjs
): boolean => {
  return startA.isBefore(endB) && endA.isAfter(startB);
};

/**
 * Get duration safely
 */
export const getMovieDuration = (
  movieId: number,
  movies: any[],
  fallback?: any
) => {
  const m = movies.find(x => x.movieId === movieId);
  return m?.duration ?? fallback?.duration ?? 120;
};

/**
 * Key generator for the index map: "hallId_YYYY-MM-DD"
 * Kept for backward compatibility.
 */
export const getShowtimeIndexKey = (hallId: number, dateStr: string): string => {
  return `${hallId}_${dateStr}`;
};

/**
 * Index map of existing showtimes for O(1) retrieval.
 * Key: "hallId_YYYY-MM-DD", Value: List of active showtimes for that hall on that day.
 * Kept for backward compatibility.
 */
export type ExistingShowtimesIndex = Map<string, any[]>;

/**
 * Builds a lookup index of active (non-cancelled) showtimes grouped by hall and date.
 * Kept for backward compatibility.
 */
export const buildExistingShowtimesIndex = (
  existingShowtimes: any[]
): ExistingShowtimesIndex => {
  const index: ExistingShowtimesIndex = new Map();

  existingShowtimes.forEach(st => {
    if (st.isCancelled) return;

    const start = parseShowtimeTime(st.startTime);
    const dateStr = start.format('YYYY-MM-DD');
    const key = getShowtimeIndexKey(st.hallId, dateStr);

    if (!index.has(key)) {
      index.set(key, []);
    }
    index.get(key)!.push(st);
  });

  return index;
};

/**
 * BUILD INDEX (CRITICAL FIX)
 * - normalize all time to ms
 * - include buffer in endTimeMs
 */
export const buildHallIndex = (
  showtimes: any[],
  movies: any[],
  bufferMinutes = 15
): HallShowtimeIndex => {
  const index: HallShowtimeIndex = new Map();

  for (const st of showtimes) {
    if (st.isCancelled) continue;

    const start = parseShowtimeTime(st.startTime);
    if (!start.isValid()) continue;

    const duration = getMovieDuration(st.movieId, movies, st.movie);

    const startMs = start.valueOf();
    const rawEndMs = start.add(duration, 'minute').valueOf();
    const endMs = start.add(duration + bufferMinutes, 'minute').valueOf();

    const item: NormalizedInterval = {
      showtimeId: st.showtimeId,
      movieId: st.movieId,
      hallId: st.hallId,
      startTimeMs: startMs,
      rawEndTimeMs: rawEndMs,
      endTimeMs: endMs,
      movieTitle: st.movie?.title ?? 'Unknown'
    };

    if (!index.has(st.hallId)) index.set(st.hallId, []);
    index.get(st.hallId)!.push(item);
  }

  return index;
};

/**
 * PURE CONFLICT DETECTOR (FIXED LOGIC)
 */
export const detectScheduleConflict = (params: {
  movieId: number;
  hallId: number;
  startTimeStr: string;
  index: HallShowtimeIndex;
  movies: any[];
  bufferMinutes?: number;
  editingShowtimeId?: number;
}): string | null => {
  const {
    movieId,
    hallId,
    startTimeStr,
    index,
    movies,
    bufferMinutes = 15,
    editingShowtimeId
  } = params;

  const start = dayjs(startTimeStr).tz(TIMEZONE);
  if (!start.isValid()) return 'Invalid time';

  const now = dayjs().tz(TIMEZONE);

  // ❗ prevent past time
  if (!editingShowtimeId && start.isBefore(now, 'minute')) {
    return 'Thời gian bắt đầu đã trôi qua';
  }

  const duration = getMovieDuration(movieId, movies);
  const startMs = start.valueOf();
  const endMs = start.add(duration + bufferMinutes, 'minute').valueOf();

  const hall = index.get(hallId);
  if (!hall) return null;

  for (const st of hall) {
    if (editingShowtimeId && st.showtimeId === editingShowtimeId) continue;

    if (isOverlap(startMs, endMs, st.startTimeMs, st.endTimeMs)) {
      return `Trùng lịch: ${st.movieTitle}`;
    }
  }

  return null;
};

export const findScheduleConflict = (params: {
  movieId: number;
  hallId: number;
  startTimeStr: string;
  index: HallShowtimeIndex;
  movies: any[];
  bufferMinutes?: number;
  editingShowtimeId?: number;
}): NormalizedInterval | 'PAST_TIME' | null => {
  const {
    movieId,
    hallId,
    startTimeStr,
    index,
    movies,
    bufferMinutes = 15,
    editingShowtimeId
  } = params;

  const start = dayjs(startTimeStr).tz(TIMEZONE);
  if (!start.isValid()) return null;

  const now = dayjs().tz(TIMEZONE);

  if (!editingShowtimeId && start.isBefore(now, 'minute')) {
    return 'PAST_TIME';
  }

  const duration = getMovieDuration(movieId, movies);
  const startMs = start.valueOf();
  const endMs = start.add(duration + bufferMinutes, 'minute').valueOf();

  const hall = index.get(hallId);
  if (!hall) return null;

  for (const st of hall) {
    if (editingShowtimeId && st.showtimeId === editingShowtimeId) continue;

    if (isOverlap(startMs, endMs, st.startTimeMs, st.endTimeMs)) {
      return st;
    }
  }

  return null;
};

/**
 * Validates whether a proposed showtime conflicts with existing showtimes.
 * Implements the backward-compatible signature.
 */
export const validateScheduleConflict = (
  movieId: number,
  hallId: number,
  startTimeStr: string,
  existingShowtimes: any[],
  movies: any[],
  editingShowtimeId?: number,
  bufferMinutes: number = 15
): string | null => {
  const index = buildHallIndex(existingShowtimes, movies, bufferMinutes);

  return detectScheduleConflict({
    movieId,
    hallId,
    startTimeStr,
    index,
    movies,
    bufferMinutes,
    editingShowtimeId
  });
};