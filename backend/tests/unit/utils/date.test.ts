import {
  addDuration,
  parseDate,
  formatDate,
  formatDateTime,
  isExpired,
  getTimestampSeconds,
} from '@shared/utils/date';

describe('Date Utilities', () => {
  describe('addDuration', () => {
    it('should add days to a date', () => {
      const date = new Date('2024-01-01T12:00:00Z');
      const result = addDuration(date, '5d');

      // Check the difference in days
      const diffMs = result.getTime() - date.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      expect(diffDays).toBe(5);
    });

    it('should add hours to a date', () => {
      const date = new Date('2024-01-01T12:00:00Z');
      const result = addDuration(date, '3h');

      // Check the difference in hours
      const diffMs = result.getTime() - date.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      expect(diffHours).toBe(3);
    });

    it('should add minutes to a date', () => {
      const date = new Date('2024-01-01T12:00:00Z');
      const result = addDuration(date, '30m');

      // Check the difference in minutes
      const diffMs = result.getTime() - date.getTime();
      const diffMinutes = diffMs / (1000 * 60);
      expect(diffMinutes).toBe(30);
    });

    it('should throw for invalid duration format', () => {
      const date = new Date();

      expect(() => addDuration(date, 'invalid')).toThrow('Invalid duration format');
      expect(() => addDuration(date, '5x')).toThrow('Invalid duration format');
      expect(() => addDuration(date, 'd5')).toThrow('Invalid duration format');
    });
  });

  describe('parseDate', () => {
    it('should parse valid ISO date string', () => {
      const result = parseDate('2024-01-15T10:30:00Z');

      expect(result).toBeInstanceOf(Date);
      expect(result?.getFullYear()).toBe(2024);
      expect(result?.getMonth()).toBe(0); // January
      expect(result?.getDate()).toBe(15);
    });

    it('should return null for invalid date string', () => {
      const result = parseDate('not-a-date');

      expect(result).toBeNull();
    });

    it('should return null for empty string', () => {
      const result = parseDate('');

      expect(result).toBeNull();
    });
  });

  describe('formatDate', () => {
    it('should format date with default format', () => {
      const date = new Date('2024-01-15T10:30:00Z');
      const result = formatDate(date);

      expect(result).toBe('2024-01-15');
    });

    it('should format date with custom format', () => {
      const date = new Date('2024-01-15T10:30:00Z');
      const result = formatDate(date, 'dd/MM/yyyy');

      expect(result).toBe('15/01/2024');
    });
  });

  describe('formatDateTime', () => {
    it('should format date as ISO datetime', () => {
      const date = new Date('2024-01-15T10:30:45.123Z');
      const result = formatDateTime(date);

      expect(result).toMatch(/2024-01-15T\d{2}:\d{2}:\d{2}\.\d{3}Z/);
    });
  });

  describe('isExpired', () => {
    it('should return true for past date', () => {
      const pastDate = new Date(Date.now() - 1000 * 60 * 60); // 1 hour ago

      expect(isExpired(pastDate)).toBe(true);
    });

    it('should return false for future date', () => {
      const futureDate = new Date(Date.now() + 1000 * 60 * 60); // 1 hour from now

      expect(isExpired(futureDate)).toBe(false);
    });
  });

  describe('getTimestampSeconds', () => {
    it('should return current timestamp in seconds', () => {
      const before = Math.floor(Date.now() / 1000);
      const result = getTimestampSeconds();
      const after = Math.floor(Date.now() / 1000);

      expect(result).toBeGreaterThanOrEqual(before);
      expect(result).toBeLessThanOrEqual(after);
    });
  });
});
