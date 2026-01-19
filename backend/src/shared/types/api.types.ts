/**
 * API Request/Response types
 * Standard response formats for the PatchIQ API
 */

// Standard success response
export interface SuccessResponse<T = unknown> {
  success: true;
  data: T;
  message?: string;
}

// Standard error response
export interface ErrorResponse {
  success: false;
  error: string;
  message: string;
  details?: Record<string, unknown>;
}

// Combined API response type
export type ApiResponseType<T = unknown> = SuccessResponse<T> | ErrorResponse;

// Paginated list response
export interface PaginatedListResponse<T> {
  success: true;
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Auth response types
export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    name: string | null;
    role: string;
    organizationId: string | null;
  };
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
}

export interface UserProfileResponse {
  id: string;
  email: string;
  name: string | null;
  contactNumber: string | null;
  role: string;
  isActive: boolean;
  isOnboarded: boolean;
  organizationId: string | null;
  lastLoginAt: Date | null;
  createdAt: Date;
}

// Common request types
export interface IdParam {
  id: string;
}

export interface SlugParam {
  slug: string;
}

// Bulk operation types
export interface BulkOperationRequest {
  ids: string[];
}

export interface BulkOperationResponse {
  success: number;
  failed: number;
  errors?: Array<{
    id: string;
    error: string;
  }>;
}

// Filter/Search types
export interface FilterParams {
  search?: string;
  status?: string;
  type?: string;
  severity?: string;
  startDate?: string;
  endDate?: string;
}

export interface SortParams {
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface QueryParams extends FilterParams, SortParams {
  page?: number;
  limit?: number;
}

// Health check response
export interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy';
  version: string;
  timestamp: string;
  services?: {
    database: 'up' | 'down';
    cache?: 'up' | 'down';
  };
}

// Statistics response
export interface StatsResponse {
  [key: string]: number | string | boolean | null;
}

// Counts response (for dashboard widgets)
export interface CountsResponse {
  total: number;
  active?: number;
  inactive?: number;
  pending?: number;
}

// Upload response
export interface UploadResponse {
  id: string;
  filename: string;
  size: number;
  mimeType: string;
  url: string;
}

// Export request/response
export interface ExportRequest {
  format: 'csv' | 'pdf' | 'xlsx';
  filters?: FilterParams;
  columns?: string[];
}

export interface ExportResponse {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  downloadUrl?: string;
  expiresAt?: string;
}
