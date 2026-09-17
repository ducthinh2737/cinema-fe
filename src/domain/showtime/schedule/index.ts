import dayjs from 'dayjs';
import { buildHallIndex, detectScheduleConflict, findScheduleConflict, type HallShowtimeIndex, type NormalizedInterval } from '../conflict';
import { TIMEZONE } from '../time';

interface Params {
  mode: 'Manual' | 'Auto';
  movieIds: number[];
  movieWeights?: Record<number, number>;
  optimizePrimeTime?: boolean;
  hallIds: number[];
  priceId: number;
  dates: string[];
  timeSlots: string[];
  autoStartHour?: number;
  autoEndHour?: number;
  bufferMinutes?: number;
  staggerMinutes?: number;
  existingShowtimes: any[];
  movies: any[];
  hallsList: any[];
  cinemaOpeningTime?: string;
  cinemaClosingTime?: string;
}

/**
 * SAFE scheduler (no mutation index, deterministic, greedy jumping conflict solver)
 */
export const generateAutoSchedule = (params: Params) => {
  const {
    movieIds,
    movieWeights = {},
    optimizePrimeTime = false,
    hallIds,
    dates,
    timeSlots,
    autoStartHour = 8,
    bufferMinutes = 15,
    staggerMinutes = 20,
    existingShowtimes,
    movies,
    hallsList,
    mode,
    cinemaOpeningTime
  } = params;

  if (!movieIds || movieIds.length === 0) return [];

  const weightedMovieIds: number[] = [];
  movieIds.forEach(id => {
    const w = movieWeights[id] || 1;
    for (let count = 0; count < w; count++) {
      weightedMovieIds.push(id);
    }
  });

  // Sort candidate movies for Prime Time based on:
  // 1. Movie Weight (higher is better)
  // 2. Is Featured (Featured/Hot movies first)
  // 3. Release date (newer release date first)
  const primeTimeSortedMovies = [...movies]
    .filter(m => movieIds.includes(m.movieId))
    .sort((a, b) => {
      const weightA = movieWeights[a.movieId] ?? 1;
      const weightB = movieWeights[b.movieId] ?? 1;
      if (weightA !== weightB) return weightB - weightA;

      const featA = a.isFeatured ? 1 : 0;
      const featB = b.isFeatured ? 1 : 0;
      if (featA !== featB) return featB - featA;

      const relA = a.releaseDate ? new Date(a.releaseDate).getTime() : 0;
      const relB = b.releaseDate ? new Date(b.releaseDate).getTime() : 0;
      return relB - relA;
    });

  const baseIndex = buildHallIndex(existingShowtimes, movies, bufferMinutes);

  const result: any[] = [];

  // ✅ GLOBAL SAFE INDEX (fix cross-hall conflict sync)
  const index: HallShowtimeIndex = new Map();
  baseIndex.forEach((val, key) => {
    index.set(key, [...val]);
  });

  for (const date of dates) {
    for (let i = 0; i < hallIds.length; i++) {
      const hallId = hallIds[i];
      const hall = hallsList.find(h => h.hallId === hallId);

      // =========================
      // MANUAL MODE
      // =========================
      if (mode === 'Manual') {
        for (const time of timeSlots) {
          for (const movieId of movieIds) {
            const movie = movies.find(m => m.movieId === movieId);
            if (!movie) continue;

            const duration = movie.duration;

            let start = dayjs(`${date}T${time}`).tz(TIMEZONE);
            const hourPart = parseInt(time.split(':')[0], 10);
            if (hourPart < autoStartHour) {
              start = start.add(1, 'day');
            }
            const startStr = start.format('YYYY-MM-DDTHH:mm');

            const conflict = detectScheduleConflict({
              movieId,
              hallId,
              startTimeStr: startStr,
              index,
              movies,
              bufferMinutes
            });

            const isValid = !conflict;

            result.push({
              date: start.format('YYYY-MM-DD'),
              time,
              hallId,
              hallName: hall?.name,
              movieId,
              movieTitle: movie.title,
              isValid,
              conflict
            });

            if (isValid) {
              const end = start.add(duration + bufferMinutes, 'minute');

              const fake: NormalizedInterval = {
                showtimeId: -Math.random(),
                movieId,
                hallId,
                startTimeMs: start.valueOf(),
                endTimeMs: end.valueOf(),
                rawEndTimeMs: start.add(duration, 'minute').valueOf(),
                movieTitle: movie.title
              };

              if (!index.has(hallId)) index.set(hallId, []);
              index.get(hallId)!.push(fake);
            }
          }
        }
      }

      // =========================
      // AUTO MODE
      // =========================
      else {
        const roundUpTo10Minutes = (d: dayjs.Dayjs): dayjs.Dayjs => {
          const minutes = d.minute();
          const remainder = minutes % 10;
          if (remainder === 0) return d.second(0).millisecond(0);
          return d.add(10 - remainder, 'minute').second(0).millisecond(0);
        };

        let startHour = autoStartHour;
        let startMinute = 0;
        if (cinemaOpeningTime) {
          const parts = cinemaOpeningTime.split(':');
          if (parts.length >= 2) {
            startHour = parseInt(parts[0], 10);
            startMinute = parseInt(parts[1], 10);
          }
        }

        let cursor = dayjs(`${date}T00:00:00`)
          .tz(TIMEZONE)
          .hour(startHour)
          .minute(startMinute + i * staggerMinutes);
        cursor = roundUpTo10Minutes(cursor);

        let endLimit = dayjs(`${date}T00:00:00`)
          .tz(TIMEZONE)
          .add(1, 'day')
          .hour(3)
          .minute(0)
          .second(0);

        const closingLimit = dayjs(`${date}T00:00:00`)
          .tz(TIMEZONE)
          .add(1, 'day')
          .hour(2)
          .minute(0)
          .second(0);

        let step = 0;
        let movieCycleIndex = i;
        let roomPrimeCounter = 0;

        while (!cursor.isAfter(endLimit) && step++ < 50) {
          let movie: any;
          let isPrimeTimeActive = false;

          const currentHour = cursor.hour();
          if (optimizePrimeTime && currentHour >= 18 && currentHour < 22 && primeTimeSortedMovies.length > 0) {
            const primeIdx = (i + roomPrimeCounter) % primeTimeSortedMovies.length;
            movie = primeTimeSortedMovies[primeIdx];
            isPrimeTimeActive = true;
          } else {
            const movieId = weightedMovieIds[movieCycleIndex % weightedMovieIds.length];
            movie = movies.find(m => m.movieId === movieId);
          }

          if (!movie) {
            if (isPrimeTimeActive) {
              roomPrimeCounter++;
            } else {
              movieCycleIndex++;
            }
            continue;
          }

          const movieId = movie.movieId;
          const duration = movie.duration;
          const slotSize = duration + bufferMinutes;

          const proposedEndTime = cursor.add(duration + bufferMinutes, 'minute');
          if (proposedEndTime.isAfter(closingLimit)) {
            break;
          }

          const startStr = cursor.format('YYYY-MM-DDTHH:mm');

          const conflict = findScheduleConflict({
            movieId,
            hallId,
            startTimeStr: startStr,
            index,
            movies,
            bufferMinutes
          });

          if (!conflict) {
            const start = dayjs(startStr).tz(TIMEZONE);

            result.push({
              date: start.format('YYYY-MM-DD'),
              time: start.format('HH:mm'),
              hallId,
              hallName: hall?.name,
              movieId,
              movieTitle: movie.title,
              isValid: true,
              conflict: null
            });

            // add fake interval
            const end = start.add(duration + bufferMinutes, 'minute');

            const fake: NormalizedInterval = {
              showtimeId: -Math.random(),
              movieId,
              hallId,
              startTimeMs: start.valueOf(),
              endTimeMs: end.valueOf(),
              rawEndTimeMs: start.add(duration, 'minute').valueOf(),
              movieTitle: movie.title
            };

            if (!index.has(hallId)) index.set(hallId, []);
            index.get(hallId)!.push(fake);

            cursor = roundUpTo10Minutes(cursor.add(slotSize, 'minute'));
            
            if (isPrimeTimeActive) {
              roomPrimeCounter++;
            } else {
              movieCycleIndex++;
            }
          } else {
            if (conflict === 'PAST_TIME') {
              const now = dayjs().tz(TIMEZONE);
              if (now.isAfter(cursor)) {
                const safeNow = now.add(10, 'minute');
                const roundedMinutes = Math.ceil(safeNow.minute() / 10) * 10;
                const baseNow = safeNow.minute(roundedMinutes).second(0).millisecond(0);
                cursor = roundUpTo10Minutes(baseNow.add(i * staggerMinutes, 'minute'));
              } else {
                cursor = roundUpTo10Minutes(cursor.add(10, 'minute'));
              }
            } else {
              // Directly jump to the end of the conflict interval (including its buffer)
              cursor = roundUpTo10Minutes(dayjs(conflict.endTimeMs).tz(TIMEZONE));
            }
          }
        }
      }
    }
  }

  return result;
};