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
  compareAsc,
} from 'date-fns';
import enUS from 'date-fns/locale/en-US'; // v2: Default import for locale

// Default locale for consistency (can be overridden for user preferences)
const DEFAULT_LOCALE = enUS;

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
  locale = DEFAULT_LOCALE
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

// ... (rest of the functions remain the same, but update locale param to use DEFAULT_LOCALE or passed locale)
// For example, in formatTransactionDate:
export const formatTransactionDate = (
  timestamp: string | Date,
  locale = DEFAULT_LOCALE
): string => {
  const date = typeof timestamp === 'string' ? parseISO(timestamp) : timestamp;
  if (!isValid(date)) {
    return 'Invalid Date';
  }

  const daysAgo = differenceInDays(new Date(), date);
  if (daysAgo === 0) {
    return format(date, 'p', { locale });
  } else if (daysAgo === 1) {
    return `Yesterday ${format(date, 'p', { locale })}`;
  } else if (daysAgo < 7) {
    return `${format(date, 'EEEE', { locale })} ${format(date, 'p', { locale })}`;
  } else {
    return format(date, 'PPP p', { locale });
  }
};

// Similarly update formatRelativeTime, etc., to use { locale } in format calls.
// Full code as before, just with the import fix.
