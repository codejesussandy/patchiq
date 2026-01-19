import {
  addDays,
  addHours,
  addMinutes,
  parseISO,
  isValid,
  format,
  formatDistanceToNow,
} from 'date-fns';

export function addDuration(date: Date, duration: string): Date {
  const match = duration.match(/^(\d+)([dhm])$/);
  if (!match) {
    throw new Error(`Invalid duration format: ${duration}`);
  }

  const [, value, unit] = match;
  const numValue = parseInt(value, 10);

  switch (unit) {
    case 'd':
      return addDays(date, numValue);
    case 'h':
      return addHours(date, numValue);
    case 'm':
      return addMinutes(date, numValue);
    default:
      throw new Error(`Invalid duration unit: ${unit}`);
  }
}

export function parseDate(dateString: string): Date | null {
  const date = parseISO(dateString);
  return isValid(date) ? date : null;
}

export function formatDate(date: Date, formatStr: string = 'yyyy-MM-dd'): string {
  return format(date, formatStr);
}

export function formatDateTime(date: Date): string {
  return format(date, "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'");
}

export function isExpired(expiresAt: Date): boolean {
  return new Date() > expiresAt;
}

export function getTimestampSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

export function getRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(d)) {
    return 'Invalid date';
  }
  return formatDistanceToNow(d, { addSuffix: true });
}
