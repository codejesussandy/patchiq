import { api } from './api.service';
import type { Report, VulnerabilityReportData } from '../types/reports.types';

export interface CreateReportData {
  name: string;
  type: Report['type'];
  description: string;
  downloadFormats: ('pdf' | 'excel')[];
  createdBy?: string;
}

export interface UpdateReportData {
  name?: string;
  type?: Report['type'];
  description?: string;
  downloadFormats?: ('pdf' | 'excel')[];
}

export const reportsService = {
  // Get all reports
  async getReports(): Promise<Report[]> {
    const response = await api.get(`/reports`);
    // Backend returns paginated response { data, total, page, limit, totalPages }
    return Array.isArray(response.data) ? response.data : (response.data.data || []);
  },

  // Get a specific report
  async getReport(id: string): Promise<Report> {
    const response = await api.get(`/reports/${id}`);
    return response.data;
  },

  // Create a new report
  async createReport(data: CreateReportData): Promise<Report> {
    const response = await api.post(`/reports`, data);
    return response.data;
  },

  // Update a report
  async updateReport(id: string, data: UpdateReportData): Promise<Report> {
    const response = await api.put(`/reports/${id}`, data);
    return response.data;
  },

  // Delete a report
  async deleteReport(id: string): Promise<void> {
    await api.delete(`/reports/${id}`);
  },

  // Get vulnerability report data
  async getVulnerabilityReports(): Promise<VulnerabilityReportData> {
    const response = await api.get(`/reports/vulnerabilities`);
    return response.data;
  },

  // Download report
  async downloadReport(id: string, format: 'pdf' | 'excel'): Promise<Blob> {
    const response = await api.get(
      `/reports/${id}/download?format=${format}`,
      { responseType: 'blob' }
    );
    return response.data;
  },

  // Schedule report
  async scheduleReport(reportData: {
    name: string;
    type: string;
    frequency: string;
    recipients: string[];
  }): Promise<Report> {
    const response = await api.post(`/reports/schedule`, reportData);
    return response.data;
  },
};
