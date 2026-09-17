import dayjs from 'dayjs';
import type {
  ApiShowtime,
  NormalizedMovie,
  MappedHall,
  DryRunShowtime
} from '../../../types/showtime';

import { parseShowtimeTime, TIMEZONE } from '../time';

import type {
  TimelineShowtimeBlock,
  TimelineMatrixRow,
  TimelineMatrixResult
} from '../types';

/**
 * Build O(1 movie lookup map (CRITICAL PERFORMANCE FIX)
 */
const buildMovieMap = (movies: NormalizedMovie[]) => {
  const map = new Map<number, NormalizedMovie>();
  for (const m of movies) {
    map.set(m.movieId, m);
  }
  return map;
};

/**
 * Calculate timeline position (fully absolute + safe overflow)
 */
export const calculateTimelinePosition = (params: {
  startTime: dayjs.Dayjs;
  durationMinutes: number;
  rangeStart: dayjs.Dayjs;
  rangeEnd: dayjs.Dayjs;
}) => {
  const { startTime, durationMinutes, rangeStart, rangeEnd } = params;

  const totalMinutes = rangeEnd.diff(rangeStart, 'minute');
  if (totalMinutes <= 0) return { leftPercent: 0, widthPercent: 0 };

  const startDiff = startTime.diff(rangeStart, 'minute');
  const endTime = startTime.add(durationMinutes, 'minute');
  const endDiff = endTime.diff(rangeStart, 'minute');

  // fully outside
  if (endDiff <= 0 || startDiff >= totalMinutes) {
    return { leftPercent: 0, widthPercent: 0 };
  }

  let leftPercent = (startDiff / totalMinutes) * 100;
  let widthPercent = (durationMinutes / totalMinutes) * 100;

  if (leftPercent < 0) {
    widthPercent += leftPercent;
    leftPercent = 0;
  }

  if (leftPercent + widthPercent > 100) {
    widthPercent = 100 - leftPercent;
  }

  return {
    leftPercent: Math.max(0, Math.min(100, leftPercent)),
    widthPercent: Math.max(0, Math.min(100, widthPercent))
  };
};

/**
 * BUILD TIMELINE MATRIX (PRODUCTION SAFE)
 */
export const buildTimelineMatrix = (
  hallList: MappedHall[],
  dateStr: string,
  showtimesList: ApiShowtime[],
  movies: NormalizedMovie[],
  proposedShowtimes: DryRunShowtime[] = [],
  startHour: number = 8,
  endHour: number = 24
): TimelineMatrixResult => {

  const movieMap = buildMovieMap(movies);

  const rangeStart = dayjs.tz(`${dateStr}T00:00:00`, TIMEZONE)
    .hour(startHour)
    .minute(0)
    .second(0)
    .millisecond(0);

  // FIX: handle overnight properly (08:00 → 04:00 next day)
  let rangeEnd = dayjs.tz(`${dateStr}T00:00:00`, TIMEZONE)
    .hour(endHour)
    .minute(0)
    .second(0)
    .second(0)
    .millisecond(0);

  if (endHour <= startHour) {
    rangeEnd = rangeEnd.add(1, 'day');
  }

  const matrix: TimelineMatrixRow[] = hallList.map(hall => {

    // =========================
    // DB SHOWTIMES
    // =========================
    const dbBlocks: TimelineShowtimeBlock[] = showtimesList
      .filter(st =>
        st.hallId === hall.hallId &&
        !st.isCancelled
      )
      .map(st => {
        const movie = movieMap.get(st.movieId);
        const duration = movie?.duration ?? st.movie?.duration ?? 120;

        const start = parseShowtimeTime(st.startTime);
        const end = start.add(duration, 'minute');

        const pos = calculateTimelinePosition({
          startTime: start,
          durationMinutes: duration,
          rangeStart,
          rangeEnd
        });

        const now = dayjs().tz(TIMEZONE);
        let status: 'upcoming' | 'showing' | 'finished' = 'upcoming';
        if (now.isAfter(end)) {
          status = 'finished';
        } else if (now.isAfter(start) || now.isSame(start)) {
          status = 'showing';
        }

        return {
          showtimeId: st.showtimeId,
          movieId: st.movieId,
          movieTitle: st.movie?.title || movie?.title || 'Phim khác',
          posterUrl: st.movie?.posterUrl || movie?.posterUrl,
          duration,
          startTime: start.format('HH:mm'),
          endTime: end.format('HH:mm'),
          leftPercent: pos.leftPercent,
          widthPercent: pos.widthPercent,
          isConflict: false,
          conflictReason: null,
          availableSeats: st.availableSeats,
          totalSeats: st.totalSeats,
          isCancelled: st.isCancelled,
          isDb: true,
          status
        };
      });

    // =========================
    // PROPOSED SHOWTIMES
    // =========================
    const propBlocks: TimelineShowtimeBlock[] = proposedShowtimes
      .filter(st => st.hallId === hall.hallId)
      .map(st => {

        const time = parseShowtimeTime(`${st.date}T${st.time}`);
        const movie = st.movieId
          ? movieMap.get(st.movieId)
          : movies.find(m => m.title === st.movieTitle);

        const duration = movie?.duration ?? 120;
        const end = time.add(duration, 'minute');

        const pos = calculateTimelinePosition({
          startTime: time,
          durationMinutes: duration,
          rangeStart,
          rangeEnd
        });

        return {
          movieId: movie?.movieId || 0,
          movieTitle: st.movieTitle,
          duration,
          startTime: st.time,
          endTime: end.format('HH:mm'),
          leftPercent: pos.leftPercent,
          widthPercent: pos.widthPercent,
          isConflict: !st.isValid,
          conflictReason: st.conflict,
          isDb: false
        };
      });

    return {
      hallId: hall.hallId,
      hallName: hall.name,
      hallTypeName: hall.hallTypeName,
      blocks: [...dbBlocks, ...propBlocks]
    };
  });

  return {
    matrix,
    timelineRange: {
      startHour,
      endHour,
      totalMinutes: rangeEnd.diff(rangeStart, 'minute')
    }
  };
};