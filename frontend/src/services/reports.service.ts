import { api } from './api.service';
import type {
  Report,
  ReportTemplate,
  ListReportsParams,
  PaginatedReportsResponse,
  CreateReportData,
  UpdateReportData,
  CreateReportStep1Data,
  CreateReportStep1Response,
  CreateReportStep2Data,
  CreateReportStep2Response,
  CreateReportStep3Data,
  ReportFormat,
  ScheduledReport,
  CreateScheduleData,
  UpdateScheduleData,
  SendReportData,
  VulnerabilityReportData,
} from '../types/reports.types';

export const reportsService = {
  // ============================================
  // REPORTS CRUD
  // ============================================

  /**
   * Get all reports with optional filtering and pagination
   */
  async getReports(params?: ListReportsParams): Promise<PaginatedReportsResponse> {
    const response = await api.get('/reports', { params });
    // Handle both array and paginated response formats
    if (Array.isArray(response.data)) {
      return {
        data: response.data,
        total: response.data.length,
        page: 1,
        limit: response.data.length,
        totalPages: 1,
      };
    }
    return response.data;
  },

  /**
   * Get a specific report by ID
   */
  async getReport(id: string): Promise<Report> {
    const response = await api.get(`/reports/${id}`);
    return response.data;
  },

  /**
   * Create a new report (simple mode - all in one)
   */
  async createReport(data: CreateReportData): Promise<Report> {
    const response = await api.post('/reports', data);
    return response.data;
  },

  /**
   * Update an existing report
   */
  async updateReport(id: string, data: UpdateReportData): Promise<Report> {
    const response = await api.put(`/reports/${id}`, data);
    return response.data;
  },

  /**
   * Delete a report
   */
  async deleteReport(id: string): Promise<void> {
    await api.delete(`/reports/${id}`);
  },

  /**
   * Download a report file
   */
  async downloadReport(id: string, format?: ReportFormat): Promise<Blob> {
    const params = format ? { format } : {};
    const response = await api.get(`/reports/${id}/download`, {
      params,
      responseType: 'blob',
    });
    return response.data;
  },

  /**
   * Regenerate a report
   */
  async regenerateReport(id: string): Promise<Report> {
    const response = await api.post(`/reports/${id}/regenerate`);
    return response.data;
  },

  // ============================================
  // WIZARD API (3-step creation)
  // ============================================

  /**
   * Wizard Step 1: Create draft report with type and name
   * Returns reportId and available columns/filters for the selected type
   */
  async createReportStep1(data: CreateReportStep1Data): Promise<CreateReportStep1Response> {
    const response = await api.post('/reports', {
      step: 1,
      data,
    });
    return response.data;
  },

  /**
   * Wizard Step 2: Configure filters and columns
   * Returns preview data
   */
  async createReportStep2(reportId: string, data: CreateReportStep2Data): Promise<CreateReportStep2Response> {
    const response = await api.post('/reports', {
      step: 2,
      reportId,
      data,
    });
    return response.data;
  },

  /**
   * Wizard Step 3: Set format and schedule, trigger generation
   */
  async createReportStep3(reportId: string, data: CreateReportStep3Data): Promise<Report> {
    const response = await api.post('/reports', {
      step: 3,
      reportId,
      data,
    });
    return response.data;
  },

  // ============================================
  // TEMPLATES
  // ============================================

  /**
   * Get available report templates
   */
  async getTemplates(): Promise<ReportTemplate[]> {
    const response = await api.get('/reports/templates');
    const body = response.data;
    return Array.isArray(body) ? body : body.data ?? [];
  },

  // ============================================
  // SCHEDULES
  // ============================================

  /**
   * List all report schedules
   */
  async getSchedules(): Promise<ScheduledReport[]> {
    const response = await api.get('/reports/schedules');
    return Array.isArray(response.data) ? response.data : (response.data.data || []);
  },

  /**
   * Create a new schedule
   */
  async createSchedule(data: CreateScheduleData): Promise<ScheduledReport> {
    const response = await api.post('/reports/schedules', data);
    return response.data;
  },

  /**
   * Update a schedule
   */
  async updateSchedule(id: string, data: UpdateScheduleData): Promise<ScheduledReport> {
    const response = await api.put(`/reports/schedules/${id}`, data);
    return response.data;
  },

  /**
   * Delete a schedule
   */
  async deleteSchedule(id: string): Promise<void> {
    await api.delete(`/reports/schedules/${id}`);
  },

  // ============================================
  // ACTIONS
  // ============================================

  /**
   * Send a report via email
   */
  async sendReport(id: string, data: SendReportData): Promise<{ success: boolean; message: string }> {
    const response = await api.post(`/reports/${id}/send`, data);
    return response.data;
  },

  /**
   * Get report preview (sample data)
   */
  async getPreview(id: string, limit?: number): Promise<{ rowCount: number; sampleData: Record<string, unknown>[] }> {
    const response = await api.get(`/reports/${id}/preview`, {
      params: { limit: limit || 10 },
    });
    return response.data;
  },

  // ============================================
  // LEGACY ENDPOINTS (for backward compatibility)
  // ============================================

  /**
   * Get vulnerability report data (legacy)
   */
  async getVulnerabilityReports(): Promise<VulnerabilityReportData> {
    const response = await api.get('/reports/vulnerabilities');
    return response.data;
  },
};

// Helper function to format file size
export function formatFileSize(bytes?: number): string {
  if (!bytes) return 'N/A';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

// Helper function to get file extension from format
export function getFileExtension(format: ReportFormat): string {
  const extensions: Record<ReportFormat, string> = {
    PDF: 'pdf',
    CSV: 'csv',
    Excel: 'xlsx',
  };
  return extensions[format] || 'csv';
}

// Helper function to trigger file download from blob
export function downloadBlob(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}
