import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import dayjs from 'dayjs';
import {
  DATE_FORMATS,
  formatDateTime,
  formatDate,
  formatTime,
  formatRelativeTime,
  formatDateTimeWithRelative,
  formatDuration,
  isPast,
  isFuture,
  isToday,
  setDateLocale,
  getDateLocale,
  getTimeZone,
} from '@/utils/dateFormat';

describe('dateFormat', () => {
  beforeEach(() => {
    setDateLocale('en');
  });

  describe('DATE_FORMATS constants', () => {
    it('should have all expected format constants', () => {
      expect(DATE_FORMATS.FULL_DATETIME).toBe('YYYY-MM-DD HH:mm:ss');
      expect(DATE_FORMATS.FULL_DATETIME_12H).toBe('YYYY-MM-DD hh:mm:ss A');
      expect(DATE_FORMATS.DATE).toBe('YYYY-MM-DD');
      expect(DATE_FORMATS.DATE_SHORT).toBe('MMM DD, YYYY');
      expect(DATE_FORMATS.DATE_LONG).toBe('MMMM DD, YYYY');
      expect(DATE_FORMATS.TIME).toBe('HH:mm:ss');
      expect(DATE_FORMATS.TIME_12H).toBe('hh:mm A');
      expect(DATE_FORMATS.TIME_SHORT).toBe('HH:mm');
      expect(DATE_FORMATS.LOCALIZED_DATE).toBe('LL');
      expect(DATE_FORMATS.LOCALIZED_DATETIME).toBe('LLL');
      expect(DATE_FORMATS.LOCALIZED_FULL).toBe('LLLL');
    });
  });

  describe('formatDateTime', () => {
    it('should return em-dash for null', () => {
      expect(formatDateTime(null)).toBe('—');
    });

    it('should return em-dash for undefined', () => {
      expect(formatDateTime(undefined)).toBe('—');
    });

    it('should return em-dash for empty string', () => {
      expect(formatDateTime('')).toBe('—');
    });

    it('should return em-dash for invalid date string', () => {
      expect(formatDateTime('not-a-date')).toBe('—');
    });

    it('should format a valid ISO date string with default format', () => {
      const result = formatDateTime('2024-06-15T14:30:00Z');
      // Default format is YYYY-MM-DD HH:mm:ss
      expect(result).toMatch(/2024-06-15/);
      expect(result).toMatch(/\d{2}:\d{2}:\d{2}/);
    });

    it('should format a Date object', () => {
      const date = new Date('2024-01-15T10:00:00Z');
      const result = formatDateTime(date);
      expect(result).toMatch(/2024-01-15/);
    });

    it('should format a dayjs object', () => {
      const d = dayjs('2024-03-20T08:45:00Z');
      const result = formatDateTime(d);
      expect(result).toMatch(/2024-03-20/);
    });

    it('should use a custom format', () => {
      const result = formatDateTime('2024-06-15T14:30:00Z', DATE_FORMATS.DATE);
      expect(result).toBe('2024-06-15');
    });

    it('should format with DATE_SHORT format', () => {
      const result = formatDateTime('2024-06-15T14:30:00Z', DATE_FORMATS.DATE_SHORT);
      expect(result).toBe('Jun 15, 2024');
    });

    it('should use localized format for DATE when useLocale is true', () => {
      const result = formatDateTime('2024-06-15T14:30:00Z', DATE_FORMATS.DATE, true);
      // LL format in English: "June 15, 2024"
      expect(result).toContain('June');
      expect(result).toContain('2024');
    });

    it('should use localized format for DATE_SHORT when useLocale is true', () => {
      const result = formatDateTime('2024-06-15T14:30:00Z', DATE_FORMATS.DATE_SHORT, true);
      expect(result).toContain('June');
      expect(result).toContain('2024');
    });

    it('should use localized format for DATE_LONG when useLocale is true', () => {
      const result = formatDateTime('2024-06-15T14:30:00Z', DATE_FORMATS.DATE_LONG, true);
      expect(result).toContain('June');
      expect(result).toContain('2024');
    });

    it('should use localized DATETIME format for FULL_DATETIME when useLocale is true', () => {
      const result = formatDateTime('2024-06-15T14:30:00Z', DATE_FORMATS.FULL_DATETIME, true);
      // LLL format in English: "June 15, 2024 ..."
      expect(result).toContain('June');
      expect(result).toContain('2024');
    });

    it('should use localized DATETIME format for FULL_DATETIME_12H when useLocale is true', () => {
      const result = formatDateTime('2024-06-15T14:30:00Z', DATE_FORMATS.FULL_DATETIME_12H, true);
      expect(result).toContain('June');
      expect(result).toContain('2024');
    });

    it('should use LOCALIZED_FULL for unrecognized format when useLocale is true', () => {
      const result = formatDateTime('2024-06-15T14:30:00Z', 'some-custom-format', true);
      // LLLL format in English: "Saturday, June 15, 2024 ..."
      expect(result).toContain('2024');
    });
  });

  describe('formatDate', () => {
    it('should format date using DATE_SHORT format', () => {
      const result = formatDate('2024-06-15T14:30:00Z');
      expect(result).toBe('Jun 15, 2024');
    });

    it('should return em-dash for null', () => {
      expect(formatDate(null)).toBe('—');
    });

    it('should return em-dash for undefined', () => {
      expect(formatDate(undefined)).toBe('—');
    });
  });

  describe('formatTime', () => {
    it('should format time using TIME_SHORT format', () => {
      const result = formatTime('2024-06-15T14:30:00Z');
      // TIME_SHORT is HH:mm, result depends on timezone
      expect(result).toMatch(/\d{2}:\d{2}/);
    });

    it('should return em-dash for null', () => {
      expect(formatTime(null)).toBe('—');
    });

    it('should return em-dash for undefined', () => {
      expect(formatTime(undefined)).toBe('—');
    });
  });

  describe('formatRelativeTime', () => {
    it('should return em-dash for null', () => {
      expect(formatRelativeTime(null)).toBe('—');
    });

    it('should return em-dash for undefined', () => {
      expect(formatRelativeTime(undefined)).toBe('—');
    });

    it('should return em-dash for empty string', () => {
      expect(formatRelativeTime('')).toBe('—');
    });

    it('should return em-dash for invalid date', () => {
      expect(formatRelativeTime('not-a-date')).toBe('—');
    });

    it('should return relative time for a past date', () => {
      const pastDate = dayjs().subtract(2, 'hour').toISOString();
      const result = formatRelativeTime(pastDate);
      expect(result).toContain('ago');
    });

    it('should return relative time for a future date', () => {
      const futureDate = dayjs().add(3, 'day').toISOString();
      const result = formatRelativeTime(futureDate);
      expect(result).toContain('in');
    });
  });

  describe('formatDateTimeWithRelative', () => {
    it('should return em-dash for null', () => {
      expect(formatDateTimeWithRelative(null)).toBe('—');
    });

    it('should return em-dash for undefined', () => {
      expect(formatDateTimeWithRelative(undefined)).toBe('—');
    });

    it('should return em-dash for empty string', () => {
      expect(formatDateTimeWithRelative('')).toBe('—');
    });

    it('should return em-dash for invalid date', () => {
      expect(formatDateTimeWithRelative('invalid-date')).toBe('—');
    });

    it('should return absolute datetime with relative time in parentheses', () => {
      const pastDate = dayjs().subtract(5, 'minute').toISOString();
      const result = formatDateTimeWithRelative(pastDate);
      // Should contain both an absolute datetime and "(X minutes ago)"
      expect(result).toMatch(/\d{4}-\d{2}-\d{2}/);
      expect(result).toContain('(');
      expect(result).toContain(')');
      expect(result).toContain('ago');
    });
  });

  describe('formatDuration', () => {
    it('should return "0s" for 0 milliseconds', () => {
      expect(formatDuration(0)).toBe('0s');
    });

    it('should return "0s" for negative milliseconds', () => {
      expect(formatDuration(-1000)).toBe('0s');
    });

    it('should return "0s" for NaN', () => {
      expect(formatDuration(NaN)).toBe('0s');
    });

    it('should format seconds only', () => {
      expect(formatDuration(5000)).toBe('5s');
    });

    it('should format 1 second', () => {
      expect(formatDuration(1000)).toBe('1s');
    });

    it('should format minutes only (exact)', () => {
      expect(formatDuration(120_000)).toBe('2m');
    });

    it('should format minutes and seconds', () => {
      expect(formatDuration(90_000)).toBe('1m 30s');
    });

    it('should format hours only (exact)', () => {
      expect(formatDuration(3_600_000)).toBe('1h');
    });

    it('should format hours and minutes', () => {
      expect(formatDuration(5_400_000)).toBe('1h 30m');
    });

    it('should format days only (exact)', () => {
      expect(formatDuration(86_400_000)).toBe('1d');
    });

    it('should format days and hours', () => {
      expect(formatDuration(93_600_000)).toBe('1d 2h');
    });

    it('should format multiple days', () => {
      expect(formatDuration(259_200_000)).toBe('3d');
    });

    it('should handle edge case: 59 seconds', () => {
      expect(formatDuration(59_000)).toBe('59s');
    });

    it('should handle edge case: exactly 60 seconds', () => {
      expect(formatDuration(60_000)).toBe('1m');
    });

    it('should handle edge case: 23 hours 59 minutes', () => {
      const ms = (23 * 60 * 60 + 59 * 60) * 1000;
      expect(formatDuration(ms)).toBe('23h 59m');
    });

    it('should handle sub-second values (rounds down to 0s)', () => {
      expect(formatDuration(500)).toBe('0s');
    });

    it('should handle exactly 999ms (rounds down to 0s)', () => {
      expect(formatDuration(999)).toBe('0s');
    });
  });

  describe('isPast', () => {
    it('should return true for a date in the past', () => {
      expect(isPast('2020-01-01')).toBe(true);
    });

    it('should return false for a date in the future', () => {
      expect(isPast('2099-01-01')).toBe(false);
    });

    it('should return true for a past Date object', () => {
      expect(isPast(new Date('2000-01-01'))).toBe(true);
    });
  });

  describe('isFuture', () => {
    it('should return true for a date in the future', () => {
      expect(isFuture('2099-12-31')).toBe(true);
    });

    it('should return false for a date in the past', () => {
      expect(isFuture('2020-01-01')).toBe(false);
    });

    it('should return true for a future Date object', () => {
      expect(isFuture(new Date('2099-06-15'))).toBe(true);
    });
  });

  describe('isToday', () => {
    it('should return true for today', () => {
      expect(isToday(new Date())).toBe(true);
    });

    it('should return true for today as dayjs', () => {
      expect(isToday(dayjs())).toBe(true);
    });

    it('should return false for yesterday', () => {
      const yesterday = dayjs().subtract(1, 'day');
      expect(isToday(yesterday)).toBe(false);
    });

    it('should return false for tomorrow', () => {
      const tomorrow = dayjs().add(1, 'day');
      expect(isToday(tomorrow)).toBe(false);
    });

    it('should return false for a distant past date', () => {
      expect(isToday('2020-01-01')).toBe(false);
    });
  });

  describe('setDateLocale / getDateLocale', () => {
    afterEach(() => {
      setDateLocale('en');
    });

    it('should default to English locale', () => {
      expect(getDateLocale()).toBe('en');
    });

    it('should set locale to Spanish', () => {
      setDateLocale('es');
      expect(getDateLocale()).toBe('es');
    });

    it('should set locale to French', () => {
      setDateLocale('fr');
      expect(getDateLocale()).toBe('fr');
    });

    it('should set locale to German', () => {
      setDateLocale('de');
      expect(getDateLocale()).toBe('de');
    });

    it('should set locale to Chinese', () => {
      setDateLocale('zh');
      expect(getDateLocale()).toBe('zh');
    });

    it('should set locale to Japanese', () => {
      setDateLocale('ja');
      expect(getDateLocale()).toBe('ja');
    });
  });

  describe('getTimeZone', () => {
    it('should return a non-empty string', () => {
      const tz = getTimeZone();
      expect(typeof tz).toBe('string');
      expect(tz.length).toBeGreaterThan(0);
    });
  });
});
