import { parse } from 'csv-parse/sync';

/**
 * Parse a CSV buffer into an array of row objects.
 * Handles BOM stripping and empty files gracefully.
 */
export function parseCsv(buffer: Buffer): Record<string, string>[] {
  // Strip UTF-8 BOM if present
  let content = buffer.toString('utf-8');
  if (content.charCodeAt(0) === 0xfeff) {
    content = content.slice(1);
  }

  const trimmed = content.trim();
  if (!trimmed) {
    return [];
  }

  const records = parse(trimmed, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  }) as Record<string, string>[];

  return records;
}
