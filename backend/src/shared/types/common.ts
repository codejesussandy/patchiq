/**
 * Backend-internal common types.
 * Generic API types (PaginationParams, ApiResponse, etc.) are in api.types.ts.
 */

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  organizationId?: string;
  type: 'access' | 'refresh';
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export type SortOrder = 'asc' | 'desc';

export interface DateRange {
  start: Date;
  end: Date;
}
