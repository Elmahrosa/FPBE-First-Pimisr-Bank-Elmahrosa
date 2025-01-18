// date-fns v2.30.0 - Core date formatting functionality
import { format, formatDistance, formatRelative, isToday, isYesterday } from 'date-fns';
// date-fns v2.30.0 - English locale
import { enUS } from 'date-fns/locale';

// Global constants for date formatting
const DEFAULT_DATE_FORMAT = 'yyyy-MM-dd';
const DEFAULT_TIME_FORMAT = 'HH:mm:ss';
const DEFAULT_DATETIME_FORMAT = 'yyyy-MM-dd HH:mm:ss';
const RELATIVE_TIME_THRESHOLD_DAYS = 7;

/**
 * Type definition for supported date input types
 */
type DateInput = Date | string | number;

/**
 * Error class for date-related errors
 */
class DateFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DateFormatError';
  }
}

/**
 * Validates and converts input to Date object
 * @param date Input date to validate
 * @throws {DateFormatError} If date is invalid
 */
const validateDate = (date: DateInput): Date => {
  if (!date) {
    throw new DateFormatError('Date input is required');
  }

  const dateObject = date instanceof Date ? date : new Date(date);
  
  if (isNaN(dateObject.getTime())) {
    throw new DateFormatError('Invalid date format');
  }

  return dateObject;
};

/**
 * Formats transaction dates with smart relative/absolute formatting
 * @param date Transaction date to format
 * @param useRelative Whether to use relative formatting when applicable
 * @param locale Locale for formatting (defaults to enUS)
 * @returns Formatted date string optimized for transaction display
 */
export const formatTransactionDate = (
  date: DateInput,
  useRelative: boolean = true,
  locale: Locale = enUS
): string => {
  try {
    const dateObject = validateDate(date);
    
    if (useRelative) {
      if (isToday(dateObject)) {
        return format(dateObject, `'Today at' ${DEFAULT_TIME_FORMAT}`, { locale });
      }
      
      if (isYesterday(dateObject)) {
        return format(dateObject, `'Yesterday at' ${DEFAULT_TIME_FORMAT}`, { locale });
      }
      
      const daysDiff = Math.floor((Date.now() - dateObject.getTime()) / (1000 * 60 * 60 * 24));
      if (daysDiff < RELATIVE_TIME_THRESHOLD_DAYS) {
        return formatRelative(dateObject, new Date(), { locale });
      }
    }
    
    return format(dateObject, DEFAULT_DATETIME_FORMAT, { locale });
  } catch (error) {
    if (error instanceof DateFormatError) {
      throw error;
    }
    throw new DateFormatError('Error formatting transaction date');
  }
};

/**
 * Formats mining session duration with precise calculations
 * @param startTime Start time of mining session
 * @param endTime End time of mining session
 * @param locale Locale for formatting (defaults to enUS)
 * @returns Formatted duration string
 */
export const formatMiningDuration = (
  startTime: DateInput,
  endTime: DateInput,
  locale: Locale = enUS
): string => {
  try {
    const start = validateDate(startTime);
    const end = validateDate(endTime);
    
    const durationMs = end.getTime() - start.getTime();
    if (durationMs < 0) {
      throw new DateFormatError('End time cannot be before start time');
    }
    
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((durationMs % (1000 * 60)) / 1000);
    
    const parts: string[] = [];
    
    if (hours > 0) {
      parts.push(`${hours}h`);
    }
    if (minutes > 0 || hours > 0) {
      parts.push(`${minutes}m`);
    }
    if (seconds > 0 || parts.length === 0) {
      parts.push(`${seconds}s`);
    }
    
    return parts.join(' ');
  } catch (error) {
    if (error instanceof DateFormatError) {
      throw error;
    }
    throw new DateFormatError('Error formatting mining duration');
  }
};

/**
 * Formats date and time according to specified format string
 * @param date Date to format
 * @param formatString Custom format string (optional)
 * @param locale Locale for formatting (defaults to enUS)
 * @returns Formatted datetime string
 */
export const formatDatetime = (
  date: DateInput,
  formatString: string = DEFAULT_DATETIME_FORMAT,
  locale: Locale = enUS
): string => {
  try {
    const dateObject = validateDate(date);
    return format(dateObject, formatString, { locale });
  } catch (error) {
    if (error instanceof DateFormatError) {
      throw error;
    }
    throw new DateFormatError('Error formatting datetime');
  }
};

/**
 * Gets relative time string with smart formatting
 * @param date Date to get relative time for
 * @param locale Locale for formatting (defaults to enUS)
 * @returns Localized relative time string
 */
export const getRelativeTime = (
  date: DateInput,
  locale: Locale = enUS
): string => {
  try {
    const dateObject = validateDate(date);
    const now = new Date();
    
    if (Math.abs(now.getTime() - dateObject.getTime()) < 1000) {
      return 'just now';
    }
    
    return formatDistance(dateObject, now, {
      addSuffix: true,
      locale
    });
  } catch (error) {
    if (error instanceof DateFormatError) {
      throw error;
    }
    throw new DateFormatError('Error getting relative time');
  }
};