import { Response } from 'express';

/**
 * Standard API response helpers.
 * All endpoints should use these instead of raw res.json().
 */

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * Send a success response with data.
 * @example sendSuccess(res, { id: '123', name: 'test' })
 * // => { success: true, data: { id: '123', name: 'test' } }
 */
export function sendSuccess<T>(res: Response, data: T, statusCode = 200): void {
  res.status(statusCode).json({
    success: true,
    data,
  });
}

/**
 * Send a paginated success response.
 * @example sendPaginated(res, items, { page: 1, limit: 20, total: 100, totalPages: 5 })
 * // => { success: true, data: [...], meta: { page, limit, total, totalPages } }
 */
export function sendPaginated<T>(res: Response, data: T[], meta: PaginationMeta): void {
  res.status(200).json({
    success: true,
    data,
    meta,
  });
}

/**
 * Send an error response.
 * @example sendError(res, 400, 'VALIDATION_ERROR', 'Invalid input', { field: 'email' })
 * // => { success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: { field: 'email' } } }
 */
export function sendError(
  res: Response,
  statusCode: number,
  code: string,
  message: string,
  details?: unknown
): void {
  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      ...(details !== undefined && { details }),
    },
  });
}
