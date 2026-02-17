import dayjs from 'dayjs';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import relativeTime from 'dayjs/plugin/relativeTime';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import 'dayjs/locale/en';
import 'dayjs/locale/es';
import 'dayjs/locale/fr';
import 'dayjs/locale/de';
import 'dayjs/locale/zh';
import 'dayjs/locale/ja';

// Enable plugins
dayjs.extend(relativeTime);
dayjs.extend(localizedFormat);
dayjs.extend(utc);
dayjs.extend(timezone);

// Default to English locale
dayjs.locale('en');

/**
 * Set the locale for date formatting
 */
export const setDateLocale = (locale: string) => {
  dayjs.locale(locale);
};

/**
 * Get current locale
 */
export const getDateLocale = (): string => {
  return dayjs.locale();
};

/**
 * Standard date/time formats used across the application
 */
export const DATE_FORMATS = {
  // Full formats
  FULL_DATETIME: 'YYYY-MM-DD HH:mm:ss',
  FULL_DATETIME_12H: 'YYYY-MM-DD hh:mm:ss A',

  // Date only
  DATE: 'YYYY-MM-DD',
  DATE_SHORT: 'MMM DD, YYYY',
  DATE_LONG: 'MMMM DD, YYYY',

  // Time only
  TIME: 'HH:mm:ss',
  TIME_12H: 'hh:mm A',
  TIME_SHORT: 'HH:mm',

  // Localized
  LOCALIZED_DATE: 'LL',        // April 29, 2023
  LOCALIZED_DATETIME: 'LLL',   // April 29, 2023 12:30 PM
  LOCALIZED_FULL: 'LLLL',      // Saturday, April 29, 2023 12:30 PM
} as const;

/**
 * Format a date/time value consistently
 * Uses localized format if useLocale is true
 */
export const formatDateTime = (
  value: string | Date | dayjs.Dayjs | null | undefined,
  format: string = DATE_FORMATS.FULL_DATETIME,
  useLocale = false
): string => {
  if (!value) return '—';

  const date = dayjs(value);
  if (!date.isValid()) return '—';

  // Use localized format if requested
  if (useLocale) {
    switch (format) {
      case DATE_FORMATS.DATE:
      case DATE_FORMATS.DATE_SHORT:
      case DATE_FORMATS.DATE_LONG:
        return date.format(DATE_FORMATS.LOCALIZED_DATE);
      case DATE_FORMATS.FULL_DATETIME:
      case DATE_FORMATS.FULL_DATETIME_12H:
        return date.format(DATE_FORMATS.LOCALIZED_DATETIME);
      default:
        return date.format(DATE_FORMATS.LOCALIZED_FULL);
    }
  }

  return date.format(format);
};

/**
 * Format date only (no time)
 */
export const formatDate = (value: string | Date | dayjs.Dayjs | null | undefined): string => {
  return formatDateTime(value, DATE_FORMATS.DATE_SHORT);
};

/**
 * Format time only (no date)
 */
export const formatTime = (value: string | Date | dayjs.Dayjs | null | undefined): string => {
  return formatDateTime(value, DATE_FORMATS.TIME_SHORT);
};

/**
 * Format as relative time ("2 hours ago", "in 3 days")
 */
export const formatRelativeTime = (value: string | Date | dayjs.Dayjs | null | undefined): string => {
  if (!value) return '—';

  const date = dayjs(value);
  if (!date.isValid()) return '—';

  return date.fromNow();
};

/**
 * Format with both absolute and relative time
 * Example: "2024-01-15 14:30 (2 hours ago)"
 */
export const formatDateTimeWithRelative = (
  value: string | Date | dayjs.Dayjs | null | undefined
): string => {
  if (!value) return '—';

  const date = dayjs(value);
  if (!date.isValid()) return '—';

  const absolute = date.format(DATE_FORMATS.FULL_DATETIME);
  const relative = date.fromNow();

  return `${absolute} (${relative})`;
};

/**
 * Format duration in human-readable format
 * Example: "2h 30m", "45s", "3d 5h"
 */
export const formatDuration = (milliseconds: number): string => {
  if (!milliseconds || milliseconds < 0) return '0s';

  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    const remainingHours = hours % 24;
    return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
  }

  if (hours > 0) {
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  }

  if (minutes > 0) {
    const remainingSeconds = seconds % 60;
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  }

  return `${seconds}s`;
};

/**
 * Check if date is in the past
 */
export const isPast = (value: string | Date | dayjs.Dayjs): boolean => {
  return dayjs(value).isBefore(dayjs());
};

/**
 * Check if date is in the future
 */
export const isFuture = (value: string | Date | dayjs.Dayjs): boolean => {
  return dayjs(value).isAfter(dayjs());
};

/**
 * Check if date is today
 */
export const isToday = (value: string | Date | dayjs.Dayjs): boolean => {
  return dayjs(value).isSame(dayjs(), 'day');
};

/**
 * Get time zone display name
 */
export const getTimeZone = (): string => {
  return dayjs.tz.guess();
};

/**
 * Convert to user's timezone
 */
export const toUserTimezone = (value: string | Date | dayjs.Dayjs): dayjs.Dayjs => {
  return dayjs(value).tz(getTimeZone());
};
