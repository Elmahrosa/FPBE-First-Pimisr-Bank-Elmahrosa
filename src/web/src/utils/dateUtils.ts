// src/web/src/utils/dateUtils.ts
import {
  format,
  parseISO,
  isValid,
  isToday,
  isYesterday,
  formatDistanceToNow,
  differenceInDays,
  addDays,
  subDays,
  startOfDay,
  endOfDay,
  compareAsc,
} from 'date-fns';
import { enUS, Locale } from 'date-fns/locale';

// Default locale for consistency (can be overridden for user preferences)
const DEFAULT_LOCALE: Locale = enUS;

/**
 * Formats a date string or Date object to a readable string.
 * SSR-safe: Uses explicit locale to match server/client output.
 * @param date - Date string (ISO format) or Date object
 * @param formatStr - Date-fns format string (e.g., 'PPP' for 'Jan 1st, 2023')
 * @param locale - Optional locale (defaults to enUS)
 * @returns Formatted string or empty if invalid date
 * @example formatDate('2023-10-01T12:00:00Z', 'PPP') // 'Oct 1st, 2023'
 */
export const formatDate = (
  date: string | Date,
  formatStr: string = 'PPP',
  locale: Locale = DEFAULT_LOCALE
): string => {
  let parsedDate: Date;
  if (typeof date === 'string') {
    parsedDate = parseISO(date);
  } else {
    parsedDate = date;
  }

  if (!isValid(parsedDate)) {
    console.warn('Invalid date provided to formatDate:', date);
    return '';
  }

  return format(parsedDate, formatStr, { locale });
};

/**
 * Formats a transaction timestamp for banking displays (e.g., "Oct 1, 2023 2:30 PM").
 * Includes time for recent transactions; falls back to date-only for older ones.
 * @param timestamp - ISO string or Date (e.g., transaction creation time)
 * @param locale - Optional locale
 * @returns Formatted transaction string
 * @example formatTransactionDate('2023-10-01T14:30:00Z') // 'Oct 1, 2023 2:30 PM'
 */
export const formatTransactionDate = (
  timestamp: string | Date,
  locale: Locale = DEFAULT_LOCALE
): string => {
  const date = typeof timestamp === 'string' ? parseISO(timestamp) : timestamp;
  if (!isValid(date)) {
    return 'Invalid Date';
  }

  const daysAgo = differenceInDays(new Date(), date);
  if (daysAgo === 0) {
    // Today: Show time only
    return format(date, 'p', { locale }); // e.g., '2:30 PM'
  } else if (daysAgo === 1) {
    // Yesterday: "Yesterday 2:30 PM"
    return `Yesterday ${format(date, 'p', { locale })}`;
  } else if (daysAgo < 7) {
    // This week: "Sunday 2:30 PM"
    return `${format(date, 'EEEE', { locale })} ${format(date, 'p', { locale })}`;
  } else {
    // Older: Full date and time
    return format(date, 'PPP p', { locale }); // e.g., 'Oct 1st, 2023 2:30 PM'
  }
};

/**
 * Formats a relative time for notifications (e.g., "2 hours ago" or "in 3 days").
 * SSR-safe: Based on server time; for real-time, call on client with useEffect.
 * @param date - Date string or Date
 * @param addSuffix - Whether to add "ago" or "in" suffix
 * @param locale - Optional locale
 * @returns Relative string
 * @example formatRelativeTime('2023-10-01T12:00:00Z') // 'in 2 days' (if today is Sep 29)
 */
export const formatRelativeTime = (
  date: string | Date,
  addSuffix: boolean = true,
  locale: Locale = DEFAULT_LOCALE
): string => {
  const parsedDate = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(parsedDate)) {
    return 'Invalid Date';
  }
  return formatDistanceToNow(parsedDate, { addSuffix, locale });
};

/**
 * Checks if a date is today (start-of-day comparison for timezone safety).
 * @param date - Date string or Date
 * @returns boolean
 * @example isToday('2023-10-01T00:00:00Z') // false (if today is Oct 2)
 */
export const isTodayDate = (date: string | Date): boolean => {
  const parsedDate = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(parsedDate)) return false;
  return isToday(startOfDay(parsedDate));
};

/**
 * Checks if a date is yesterday.
 * @param date - Date string or Date
 * @returns boolean
 */
export const isYesterdayDate = (date: string | Date): boolean => {
  const parsedDate = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(parsedDate)) return false;
  return isYesterday(startOfDay(parsedDate));
};

/**
 * Calculates business days (excludes weekends) between two dates.
 * Useful for loan/interest calculations in banking.
 * @param startDate - Start date
 * @param endDate - End date
 * @returns Number of business days
 * @example businessDaysBetween('2023-10-01', '2023-10-05') // 4 (Mon-Fri)
 */
export const businessDaysBetween = (startDate: string | Date, endDate: string | Date): number => {
  const start = startOfDay(typeof startDate === 'string' ? parseISO(startDate) : startDate);
  const end = startOfDay(typeof endDate === 'string' ? parseISO(endDate) : endDate);
  if (!isValid(start) || !isValid(end) || compareAsc(start, end) > 0) {
    return 0;
  }

  let count = 0;
  let current = start;
  while (compareAsc(current, end) <= 0) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday (0) or Saturday (6)
      count++;
    }
    current = addDays(current, 1);
  }
  return count;
};

/**
 * Adds or subtracts days from a date (with validation).
 * @param date - Base date
 * @param days - Number of days to add (negative to subtract)
 * @returns New Date object
 */
export const addBusinessDays = (date: string | Date, days: number): Date => {
  const parsedDate = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(parsedDate)) {
    throw new Error('Invalid base date');
  }
  return days >= 0 ? addDays(parsedDate, days) : subDays(parsedDate, Math.abs(days));
};

// Export types for use in components
export type DateFormat = 'short' | 'medium' | 'long' | 'full' | string;
export type SupportedLocale = typeof enUS; // Extend as needed for i18n
