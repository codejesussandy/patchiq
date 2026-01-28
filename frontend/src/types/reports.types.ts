/**
 * Reports Module Types - Aligned with backend types
 */

// Core type definitions
export type ReportType = 'patch' | 'asset' | 'vulnerability' | 'compliance' | 'audit' | 'custom';
export type ReportFormat = 'PDF' | 'CSV' | 'Excel';
export type ReportStatus = 'draft' | 'generating' | 'completed' | 'failed';
export type ScheduleFrequency = 'daily' | 'weekly' | 'monthly';

// Filter interface
export interface ReportFilters {
  dateRange?: {
    start: string;
    end: string;
  };
  severity?: string[];
  status?: string[];
  category?: string[];
  [key: string]: unknown;
}

// Schedule interface
export interface ReportSchedule {
  enabled: boolean;
  frequency: ScheduleFrequency;
  time?: string; // HH:mm format
  dayOfWeek?: number; // 0-6 for weekly
  dayOfMonth?: number; // 1-31 for monthly
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
  filters?: ReportFilters;
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

// Report Template interface
export interface ReportTemplate {
  id: string;
  name: string;
  type: ReportType;
  description: string;
  availableColumns: string[];
  defaultColumns: string[];
  availableFilters: string[];
}

// Wizard Step interfaces
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
  filters?: ReportFilters;
  columns?: string[];
}

export interface CreateReportStep2Response {
  reportId: string;
  preview: ReportPreview;
}

export interface CreateReportStep3Data {
  format: ReportFormat;
  schedule?: Omit<ReportSchedule, 'nextRunAt' | 'lastRunAt'>;
}

export interface ReportPreview {
  rowCount: number;
  sampleData: Record<string, unknown>[];
}

// Simple create (all-in-one)
export interface CreateReportData {
  name: string;
  type: ReportType;
  description?: string;
  format: ReportFormat;
  filters?: ReportFilters;
  columns?: string[];
  schedule?: Omit<ReportSchedule, 'nextRunAt' | 'lastRunAt'>;
}

// Update report data
export interface UpdateReportData {
  name?: string;
  description?: string;
  filters?: ReportFilters;
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
export const REPORT_COLUMNS: Record<ReportType, string[]> = {
  patch: [
    'patchId',
    'software',
    'category',
    'severity',
    'os',
    'status',
    'releaseDate',
    'kbNumber',
    'affectedEndpoints',
    'installedEndpoints',
    'pendingEndpoints',
    'failedEndpoints',
  ],
  asset: [
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
  vulnerability: [
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
  compliance: [
    'assetName',
    'complianceScore',
    'patchesInstalled',
    'patchesPending',
    'patchesFailed',
    'criticalVulnerabilities',
    'highVulnerabilities',
    'lastAuditDate',
  ],
  audit: [
    'timestamp',
    'module',
    'operation',
    'user',
    'status',
    'message',
    'ipAddress',
  ],
  custom: [],
};

// Filter definitions for each report type
export const REPORT_FILTERS: Record<ReportType, string[]> = {
  patch: ['severity', 'os', 'status', 'category', 'dateRange'],
  asset: ['category', 'status', 'operationalStatus', 'osType'],
  vulnerability: ['severity', 'exploitable', 'riskScoreRange', 'cvssRange', 'publishedDateRange'],
  compliance: ['complianceScoreRange', 'auditDateRange'],
  audit: ['module', 'operation', 'user', 'status', 'dateRange'],
  custom: [],
};

// Report type labels for UI display
export const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  patch: 'Patch',
  asset: 'Asset',
  vulnerability: 'Vulnerability',
  compliance: 'Compliance',
  audit: 'Audit',
  custom: 'Custom',
};

// Report status labels and colors for UI display
export const REPORT_STATUS_CONFIG: Record<ReportStatus, { label: string; color: string }> = {
  draft: { label: 'Draft', color: 'default' },
  generating: { label: 'Generating', color: 'processing' },
  completed: { label: 'Completed', color: 'success' },
  failed: { label: 'Failed', color: 'error' },
};

// Report format labels for UI display
export const REPORT_FORMAT_LABELS: Record<ReportFormat, string> = {
  PDF: 'PDF',
  CSV: 'CSV',
  Excel: 'Excel',
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
