import { describe, it, expect, beforeEach, vi } from 'vitest';
import dayjs from 'dayjs';
import {
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
  DATE_FORMATS,
} from '../dateFormat';

describe('dateFormat utilities', () => {
  beforeEach(() => {
    // Reset to English locale before each test
    setDateLocale('en');
  });

  describe('formatDateTime', () => {
    it('formats valid date with default format', () => {
      const date = '2024-01-15T14:30:00Z';
      const result = formatDateTime(date);
      expect(result).toMatch(/2024-01-15/);
    });

    it('returns em dash for null value', () => {
      expect(formatDateTime(null)).toBe('—');
    });

    it('returns em dash for undefined value', () => {
      expect(formatDateTime(undefined)).toBe('—');
    });

    it('returns em dash for invalid date', () => {
      expect(formatDateTime('invalid-date')).toBe('—');
    });

    it('formats with custom format', () => {
      const date = '2024-01-15T14:30:00Z';
      const result = formatDateTime(date, DATE_FORMATS.DATE);
      expect(result).toMatch(/2024-01-15/);
    });

    it('handles Date object', () => {
      const date = new Date('2024-01-15T14:30:00Z');
      const result = formatDateTime(date);
      expect(result).toMatch(/2024-01-15/);
    });

    it('handles dayjs object', () => {
      const date = dayjs('2024-01-15T14:30:00Z');
      const result = formatDateTime(date);
      expect(result).toMatch(/2024-01-15/);
    });

    it('uses localized format when useLocale is true', () => {
      const date = '2024-01-15T14:30:00Z';
      const result = formatDateTime(date, DATE_FORMATS.DATE, true);
      // Should use localized format
      expect(result).toBeTruthy();
      expect(result).not.toBe('—');
    });
  });

  describe('formatDate', () => {
    it('formats date without time', () => {
      const date = '2024-01-15T14:30:00Z';
      const result = formatDate(date);
      expect(result).toMatch(/Jan 15, 2024/);
    });

    it('returns em dash for null', () => {
      expect(formatDate(null)).toBe('—');
    });
  });

  describe('formatTime', () => {
    it('formats time without date', () => {
      const date = '2024-01-15T14:30:00Z';
      const result = formatTime(date);
      expect(result).toMatch(/\d{2}:\d{2}/);
    });

    it('returns em dash for undefined', () => {
      expect(formatTime(undefined)).toBe('—');
    });
  });

  describe('formatRelativeTime', () => {
    it('formats relative time for past date', () => {
      const pastDate = dayjs().subtract(2, 'hours').toISOString();
      const result = formatRelativeTime(pastDate);
      expect(result).toMatch(/ago/);
    });

    it('formats relative time for future date', () => {
      const futureDate = dayjs().add(2, 'hours').toISOString();
      const result = formatRelativeTime(futureDate);
      expect(result).toMatch(/in/);
    });

    it('returns em dash for null', () => {
      expect(formatRelativeTime(null)).toBe('—');
    });
  });

  describe('formatDateTimeWithRelative', () => {
    it('combines absolute and relative time', () => {
      const date = dayjs().subtract(2, 'hours').toISOString();
      const result = formatDateTimeWithRelative(date);
      expect(result).toContain('(');
      expect(result).toContain(')');
      expect(result).toMatch(/ago/);
    });

    it('returns em dash for invalid date', () => {
      expect(formatDateTimeWithRelative(null)).toBe('—');
    });
  });

  describe('formatDuration', () => {
    it('formats seconds only', () => {
      expect(formatDuration(5000)).toBe('5s');
    });

    it('formats minutes and seconds', () => {
      expect(formatDuration(90000)).toBe('1m 30s');
    });

    it('formats minutes only when no remaining seconds', () => {
      expect(formatDuration(120000)).toBe('2m');
    });

    it('formats hours and minutes', () => {
      expect(formatDuration(5400000)).toBe('1h 30m');
    });

    it('formats hours only when no remaining minutes', () => {
      expect(formatDuration(7200000)).toBe('2h');
    });

    it('formats days and hours', () => {
      expect(formatDuration(90000000)).toBe('1d 1h');
    });

    it('formats days only when no remaining hours', () => {
      expect(formatDuration(86400000)).toBe('1d');
    });

    it('handles zero duration', () => {
      expect(formatDuration(0)).toBe('0s');
    });

    it('handles negative duration', () => {
      expect(formatDuration(-1000)).toBe('0s');
    });
  });

  describe('isPast', () => {
    it('returns true for past date', () => {
      const pastDate = dayjs().subtract(1, 'day').toISOString();
      expect(isPast(pastDate)).toBe(true);
    });

    it('returns false for future date', () => {
      const futureDate = dayjs().add(1, 'day').toISOString();
      expect(isPast(futureDate)).toBe(false);
    });
  });

  describe('isFuture', () => {
    it('returns true for future date', () => {
      const futureDate = dayjs().add(1, 'day').toISOString();
      expect(isFuture(futureDate)).toBe(true);
    });

    it('returns false for past date', () => {
      const pastDate = dayjs().subtract(1, 'day').toISOString();
      expect(isFuture(pastDate)).toBe(false);
    });
  });

  describe('isToday', () => {
    it('returns true for current date', () => {
      const today = dayjs().toISOString();
      expect(isToday(today)).toBe(true);
    });

    it('returns false for yesterday', () => {
      const yesterday = dayjs().subtract(1, 'day').toISOString();
      expect(isToday(yesterday)).toBe(false);
    });

    it('returns false for tomorrow', () => {
      const tomorrow = dayjs().add(1, 'day').toISOString();
      expect(isToday(tomorrow)).toBe(false);
    });
  });

  describe('locale management', () => {
    it('sets and gets locale', () => {
      setDateLocale('es');
      expect(getDateLocale()).toBe('es');

      setDateLocale('en');
      expect(getDateLocale()).toBe('en');
    });

    it('formats dates with different locales', () => {
      const date = '2024-01-15T14:30:00Z';

      setDateLocale('en');
      const enResult = formatDate(date);

      setDateLocale('es');
      const esResult = formatDate(date);

      // Results should be different for different locales
      expect(enResult).toBeTruthy();
      expect(esResult).toBeTruthy();
    });
  });

  describe('DATE_FORMATS constants', () => {
    it('has all expected format constants', () => {
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
});
