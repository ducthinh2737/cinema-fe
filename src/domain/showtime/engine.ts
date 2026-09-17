/**
 * Showtime Domain Engine - CLEAN VERSION
 */

// =====================
// CORE
// =====================
export {
  parseShowtimeTime,
  calculateEndTime,
  getMinutesFromStartOfDay,
  isValidTimeStr,
  getUpcomingDates,
  formatLocalDate
} from './time';

export {
  isTimeOverlap,
  getMovieDuration,
  buildExistingShowtimesIndex,
  detectScheduleConflict,
  validateScheduleConflict
} from './conflict';

// =====================
// APPLICATION
// =====================
export {
  generateAutoSchedule
} from './schedule';

export {
  calculateTimelinePosition,
  buildTimelineMatrix
} from './timeline';

// =====================
// TYPES (DOMAIN ONLY)
// =====================
export type {
  ExistingShowtimesIndex
} from './conflict';

export type {
  TimelineShowtimeBlock,
  TimelineRange,
  TimelineMatrixRow,
  TimelineMatrixResult
} from './types';