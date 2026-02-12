/**
 * Reports Module Types - Aligned with backend types
 */

import type {
  ReportFrequency,
  ReportType,
  ReportFormat,
  ReportStatus,
} from '@shared/types';

// Re-export shared types
export type {
  ReportFilters,
  ReportPreview,
  ReportTemplate,
  ReportType,
  ReportFormat,
  ReportStatus,
} from '@shared/types';

export type ScheduleFrequency = ReportFrequency;

// Schedule interface (UI version with extra fields)
export interface ReportSchedule {
  enabled: boolean;
  frequency: ScheduleFrequency;
  time?: string;
  dayOfWeek?: number;
  dayOfMonth?: number;
  recipients: string[];
  nextRunAt?: string;
  lastRunAt?: string;
}

// Main Report interface
export interface Report {
  id: string;
  name: string;
  description?: string;
  type: ReportType;
  format: ReportFormat;
  status: ReportStatus;
  filters?: import('@shared/types').ReportFilters;
  columns?: string[];
  schedule?: ReportSchedule;
  filePath?: string;
  fileSize?: number;
  generatedAt?: string;
  errorMessage?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt?: string;
}

// Wizard Step interfaces (UI-only)
export interface CreateReportStep1Data {
  type: ReportType;
  name: string;
  description?: string;
}

export interface CreateReportStep1Response {
  reportId: string;
  availableColumns: string[];
  availableFilters: string[];
}

export interface CreateReportStep2Data {
  filters?: import('@shared/types').ReportFilters;
  columns?: string[];
}

export interface CreateReportStep2Response {
  reportId: string;
  preview: import('@shared/types').ReportPreview;
}

export interface CreateReportStep3Data {
  format: ReportFormat;
  schedule?: Omit<ReportSchedule, 'nextRunAt' | 'lastRunAt'>;
}

// Simple create (all-in-one)
export interface CreateReportData {
  name: string;
  type: ReportType;
  description?: string;
  format: ReportFormat;
  filters?: import('@shared/types').ReportFilters;
  columns?: string[];
  schedule?: Omit<ReportSchedule, 'nextRunAt' | 'lastRunAt'>;
}

// Update report data
export interface UpdateReportData {
  name?: string;
  description?: string;
  filters?: import('@shared/types').ReportFilters;
  columns?: string[];
  format?: ReportFormat;
  schedule?: Omit<ReportSchedule, 'nextRunAt' | 'lastRunAt'>;
}

// List reports params
export interface ListReportsParams {
  page?: number;
  limit?: number;
  type?: ReportType;
  status?: ReportStatus;
  format?: ReportFormat;
  search?: string;
  sortBy?: 'name' | 'type' | 'status' | 'createdAt' | 'generatedAt';
  sortOrder?: 'asc' | 'desc';
  startDate?: string;
  endDate?: string;
}

// Paginated response
export interface PaginatedReportsResponse {
  data: Report[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Schedule interfaces
export interface ScheduledReport {
  id: string;
  name: string;
  type: ReportType;
  format: ReportFormat;
  frequency: ScheduleFrequency;
  time?: string;
  dayOfWeek?: number;
  dayOfMonth?: number;
  recipients: string[];
  isActive: boolean;
  nextRunAt?: string;
  lastRunAt?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateScheduleData {
  reportId: string;
  enabled: boolean;
  frequency: ScheduleFrequency;
  time?: string;
  dayOfWeek?: number;
  dayOfMonth?: number;
  recipients: string[];
}

export interface UpdateScheduleData {
  enabled?: boolean;
  frequency?: ScheduleFrequency;
  time?: string;
  dayOfWeek?: number;
  dayOfMonth?: number;
  recipients?: string[];
}

// Send report interfaces
export interface SendReportData {
  recipients: string[];
  subject?: string;
  message?: string;
  format?: ReportFormat;
}

// Column definitions for each report type (for UI display)
// Keys use shared UPPERCASE ReportType values
export const REPORT_COLUMNS: Partial<Record<ReportType, string[]>> = {
  PATCH: [
    'patchId',
    'software',
    'category',
    'severity',
    'os',
    'status',
    'publishedAt',
    'kbNumber',
    'affectedEndpoints',
    'installedEndpoints',
    'pendingEndpoints',
    'failedEndpoints',
  ],
  ASSET: [
    'assetId',
    'name',
    'category',
    'subCategory',
    'status',
    'operationalStatus',
    'osType',
    'osVersion',
    'ipAddress',
    'lastSeen',
  ],
  VULNERABILITY: [
    'cve',
    'severity',
    'epss',
    'riskScore',
    'cvss3BaseScore',
    'exploitable',
    'endpoints',
    'affectedSoftwares',
    'published',
  ],
  COMPLIANCE: [
    'assetName',
    'complianceScore',
    'patchesInstalled',
    'patchesPending',
    'patchesFailed',
    'criticalVulnerabilities',
    'highVulnerabilities',
    'lastAuditDate',
  ],
  AUDIT: [
    'timestamp',
    'module',
    'operation',
    'user',
    'status',
    'message',
    'ipAddress',
  ],
  CUSTOM: [],
};

// Filter definitions for each report type
export const REPORT_FILTERS: Partial<Record<ReportType, string[]>> = {
  PATCH: ['severity', 'os', 'status', 'category', 'dateRange'],
  ASSET: ['category', 'status', 'operationalStatus', 'osType'],
  VULNERABILITY: ['severity', 'exploitable', 'riskScoreRange', 'cvssRange', 'publishedDateRange'],
  COMPLIANCE: ['complianceScoreRange', 'auditDateRange'],
  AUDIT: ['module', 'operation', 'user', 'status', 'dateRange'],
  CUSTOM: [],
};

// Report type labels for UI display
export const REPORT_TYPE_LABELS: Partial<Record<ReportType, string>> = {
  VULNERABILITY: 'Vulnerability',
  PATCH: 'Patch',
  COMPLIANCE: 'Compliance',
  ASSET: 'Asset',
  ENDPOINT: 'Endpoint',
  HARDWARE: 'Hardware',
  AUDIT: 'Audit',
  CUSTOM: 'Custom',
};

// Report status labels and colors for UI display
export const REPORT_STATUS_CONFIG: Record<ReportStatus, { label: string; color: string }> = {
  PENDING: { label: 'Pending', color: 'default' },
  PROCESSING: { label: 'Processing', color: 'processing' },
  COMPLETED: { label: 'Completed', color: 'success' },
  FAILED: { label: 'Failed', color: 'error' },
};

// Report format labels for UI display
export const REPORT_FORMAT_LABELS: Record<ReportFormat, string> = {
  PDF: 'PDF',
  CSV: 'CSV',
  XLSX: 'Excel',
  JSON: 'JSON',
};

// Legacy types (kept for backward compatibility)
export interface VulnerabilityReport {
  id: string;
  cve: string;
  title: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  cvssScore: number;
  epssScore: number;
  affectedEndpoints: number;
  publishedDate: string;
  discoveredDate: string;
  remediated: boolean;
}

export interface VulnerabilityReportData {
  byCvss: VulnerabilityReport[];
  byEpss: VulnerabilityReport[];
}
