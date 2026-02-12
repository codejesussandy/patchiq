import type { ReportType, ReportFormat, ReportStatus, ReportFrequency } from '@shared/types';

// Re-export shared types for backward compatibility
export type { ReportType, ReportFormat, ReportStatus };
export type ScheduleFrequency = ReportFrequency;

// Re-export shared API types
export type { ReportPreview } from '@shared/types';

// Keep local types (use local ReportType/ReportFormat/ScheduleFrequency)
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

export interface ReportSchedule {
  enabled: boolean;
  frequency: ScheduleFrequency;
  time?: string;
  dayOfWeek?: number;
  dayOfMonth?: number;
  recipients: string[];
}

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
  fileUrl?: string;
  generatedAt?: string;
  errorMessage?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReportTemplate {
  id: string;
  name: string;
  type: ReportType;
  description: string;
  availableColumns: string[];
  defaultColumns: string[];
  availableFilters: string[];
}

export interface CreateReportStep1 {
  type: ReportType;
  name: string;
  description?: string;
}

export interface CreateReportStep2 {
  reportId: string;
  filters?: ReportFilters;
  columns?: string[];
}

export interface CreateReportStep3 {
  reportId: string;
  format: ReportFormat;
  schedule?: ReportSchedule;
}

// Keep const arrays (runtime values)
export const REPORT_COLUMNS: Record<ReportType, string[]> = {
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
  ENDPOINT: [],
  HARDWARE: [],
};

export const REPORT_FILTERS: Record<ReportType, string[]> = {
  PATCH: ['severity', 'os', 'status', 'category', 'dateRange'],
  ASSET: ['category', 'status', 'operationalStatus', 'osType'],
  VULNERABILITY: ['severity', 'exploitable', 'riskScoreRange', 'cvssRange', 'publishedDateRange'],
  COMPLIANCE: ['complianceScoreRange', 'auditDateRange'],
  AUDIT: ['module', 'operation', 'user', 'status', 'dateRange'],
  CUSTOM: [],
  ENDPOINT: [],
  HARDWARE: [],
};
