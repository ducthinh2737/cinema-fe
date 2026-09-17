/**
 * Parses date string returned from backend (without timezone offset/Z)
 * as a UTC date to ensure correct local time formatting.
 */
export const parseApiDate = (dateOrString: Date | string): Date => {
  if (dateOrString instanceof Date) return dateOrString;
  if (typeof dateOrString === 'string') {
    if (dateOrString.includes('T') && !dateOrString.endsWith('Z') && !/[+-]\d{2}:\d{2}$/.test(dateOrString)) {
      return new Date(`${dateOrString}Z`);
    }
  }
  return new Date(dateOrString);
};
