import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

export const TIMEZONE = 'Asia/Ho_Chi_Minh';

/**
 * 🔥 SINGLE RULE:
 * - DB = UTC
 * - UI = LOCAL TZ
 * - Engine = ALWAYS ms (dayjs.valueOf())
 */

export const parseShowtimeTime = (input: string | Date) => {
  if (!input) return dayjs(null);

  // Date object → assume UTC-safe
  if (input instanceof Date) {
    return dayjs.utc(input).tz(TIMEZONE);
  }

  const str = input.trim();

  // ISO UTC (backend standard)
  if (str.endsWith('Z')) {
    return dayjs.utc(str).tz(TIMEZONE);
  }

  // YYYY-MM-DD only → midnight local
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return dayjs.tz(`${str}T00:00:00`, TIMEZONE);
  }

  // ISO without timezone → ALWAYS treat as UTC from DB
  // (IMPORTANT: unless it has exactly 1 colon, which represents client datetime-local input)
  if (str.includes('T') && !/[+-]\d{2}:\d{2}$/.test(str)) {
    if (str.split(':').length >= 3) {
      return dayjs.utc(str).tz(TIMEZONE);
    }
    return dayjs.tz(str, TIMEZONE);
  }

  // fallback safe
  return dayjs.tz(str, TIMEZONE);
};

/**
 * Normalize to ISO UTC (FOR STORAGE ONLY)
 */
export const toUTC = (input: string | Date | dayjs.Dayjs) => {
  const d = dayjs.isDayjs(input)
    ? input
    : parseShowtimeTime(input);

  return d.utc().toISOString();
};

/**
 * Normalize date key (FOR INDEXING ONLY)
 */
export const toLocalDate = (input: string | Date | dayjs.Dayjs) => {
  const d = dayjs.isDayjs(input)
    ? input
    : parseShowtimeTime(input);

  return d.format('YYYY-MM-DD');
};

/**
 * FORMAT ONLY (NO LOGIC)
 */
export const formatLocalDate = (
  input: string | Date,
  format = 'DD/MM/YYYY'
) => {
  return parseShowtimeTime(input).format(format);
};

/**
 * PURE: minutes from day start
 */
export const getMinutesFromStartOfDay = (
  input: string | Date | dayjs.Dayjs
) => {
  const t = dayjs.isDayjs(input)
    ? input
    : parseShowtimeTime(input);

  return t.hour() * 60 + t.minute();
};

/**
 * STRICT validator
 */
export const isValidTimeStr = (time: string) =>
  /^([0-1]?\d|2[0-3]):[0-5]\d$/.test(time);

/**
 * PURE calculation (engine-safe)
 */
export const calculateEndTime = (
  startTimeStr: string,
  duration: number,
  cleanup = 15
) => {
  const start = parseShowtimeTime(startTimeStr);

  const end = start.add(duration, 'minute');
  const total = end.add(cleanup, 'minute');

  return {
    start,
    end,
    total,
    startTimeStr: start.format('HH:mm'),
    endTimeStr: end.format('HH:mm'),
    totalEndTimeStr: total.format('HH:mm')
  };
};

/**
 * UI helper only
 */
export const getUpcomingDates = (count = 7) => {
  const base = dayjs().tz(TIMEZONE);

  return Array.from({ length: count }, (_, i) => {
    const d = base.add(i, 'day');

    return {
      dateVal: d.format('YYYY-MM-DD'),
      displayVal: d.format('DD/MM (ddd)')
    };
  });
};