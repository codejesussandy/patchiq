/**
 * Reports Module Types
 */

export type ReportType = 'patch' | 'asset' | 'vulnerability' | 'compliance' | 'audit' | 'custom';
export type ReportFormat = 'PDF' | 'CSV' | 'Excel';
export type ReportStatus = 'draft' | 'generating' | 'completed' | 'failed';
export type ScheduleFrequency = 'daily' | 'weekly' | 'monthly';

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
  time?: string; // HH:mm format
  dayOfWeek?: number; // 0-6 for weekly
  dayOfMonth?: number; // 1-31 for monthly
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

export interface ReportPreview {
  rowCount: number;
  sampleData: Record<string, unknown>[];
}

// Column definitions for each report type
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
