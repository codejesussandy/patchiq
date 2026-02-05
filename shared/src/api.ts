/**
 * Shared API Types
 * Common request/response types for API communication
 */

// ============================================
// Generic API Response Types
// ============================================

export interface SuccessResponse<T = unknown> {
  success: true;
  data: T;
  message?: string;
}

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Array<{
      field: string;
      message: string;
    }>;
  };
}

export type ApiResponse<T = unknown> = SuccessResponse<T> | ErrorResponse;

// ============================================
// Pagination Types
// ============================================

export interface PaginationParams {
  page: number;
  limit: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  success: true;
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ============================================
// Filter Types
// ============================================

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

export interface QueryParams extends FilterParams, SortParams, Partial<PaginationParams> {}

// ============================================
// Bulk Operation Types
// ============================================

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

// ============================================
// Auth API Types
// ============================================

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponseData {
  user: {
    id: string;
    email: string;
    name: string | null;
    role: string;
    isOnboarded: boolean;
    organizationId: string | null;
    departmentId: string | null;
    locationId: string | null;
    createdAt: string;
    updatedAt: string;
  };
  accessToken: string;
  refreshToken: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponseData {
  accessToken: string;
  refreshToken: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
  confirmPassword: string;
}

export interface OnboardingRequest {
  name: string;
  contactNumber: string;
  password: string;
  confirmPassword: string;
}

// ============================================
// Agent API Types
// ============================================

export interface AgentRegistrationRequest {
  machineId: string;
  hostname?: string;
  os?: string;
  osVersion?: string;
  architecture?: string;
  agentVersion?: string;
  ipAddress?: string;
  macAddress?: string;
  serialNumber?: string;
  capabilities?: string[];
}

export interface AgentRegistrationResponse {
  agentId: string;
  assetId: string | null;
  accessToken: string;
  refreshToken: string;
  tokenExpiresIn: number;
  config: AgentConfig;
  isReRegistration: boolean;
  message?: string;
}

export interface AgentConfig {
  heartbeatIntervalSeconds: number;
  inventoryScheduleCron: string;
  telemetryIntervalSeconds: number;
  telemetryEnabled: boolean;
  patchScanScheduleCron: string;
  logLevel: string;
}

export interface HeartbeatResponse {
  acknowledged: boolean;
  serverTime: string;
  commandsPending: boolean;
  configUpdated: boolean;
  inventoryRequested: boolean;
}

export interface PendingCommand {
  id: string;
  type: string;
  payload?: unknown;
  createdAt: string;
}

// ============================================
// Common List Params
// ============================================

export interface AgentListParams extends PaginationParams {
  status?: string;
  os?: string;
  search?: string;
}

export interface AssetListParams extends PaginationParams {
  status?: string;
  operationalStatus?: string;
  categoryId?: string;
  subCategoryId?: string;
  search?: string;
}

export interface PatchListParams extends PaginationParams {
  severity?: string;
  os?: string;
  category?: string;
  testStatus?: string;
  approvalStatus?: string;
  search?: string;
}

export interface VulnerabilityListParams extends PaginationParams {
  severity?: string;
  isZeroDay?: boolean;
  search?: string;
}

// ============================================
// Create/Update Input Types
// ============================================

export interface CreateAssetInput {
  name: string;
  type?: string;
  status?: string;
  serialNumber?: string;
  assetTag?: string;
  os?: string;
  osVersion?: string;
  ipAddress?: string;
  macAddress?: string;
  manufacturer?: string;
  model?: string;
  organizationId?: string;
  locationId?: string;
  tags?: string[];
}

export interface UpdateAssetInput {
  name?: string;
  type?: string;
  status?: string;
  serialNumber?: string;
  assetTag?: string;
  os?: string;
  osVersion?: string;
  ipAddress?: string;
  macAddress?: string;
  manufacturer?: string;
  model?: string;
  organizationId?: string | null;
  locationId?: string | null;
  tags?: string[];
}

export interface CreateTagInput {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  priority?: number;
  compliance?: boolean;
}

export interface UpdateTagInput {
  name?: string;
  description?: string;
  color?: string;
  icon?: string;
  priority?: number;
  compliance?: boolean;
}

export interface CreateCategoryInput {
  name: string;
  color?: string;
  description?: string;
  isDefault?: boolean;
}

export interface UpdateCategoryInput {
  name?: string;
  color?: string;
  description?: string;
  isDefault?: boolean;
}

export interface CreateSubCategoryInput {
  categoryId: string;
  name: string;
  criticality?: string;
  description?: string;
}

export interface UpdateSubCategoryInput {
  categoryId?: string;
  name?: string;
  criticality?: string;
  description?: string;
}
