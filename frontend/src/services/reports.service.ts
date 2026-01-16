import axios from 'axios';
import type { Report, VulnerabilityReportData } from '../types/reports.types';

const API_BASE_URL = 'http://localhost:3000/v1';

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
    const response = await axios.get(`${API_BASE_URL}/reports`);
    return response.data;
  },

  // Get a specific report
  async getReport(id: string): Promise<Report> {
    const response = await axios.get(`${API_BASE_URL}/reports/${id}`);
    return response.data;
  },

  // Create a new report
  async createReport(data: CreateReportData): Promise<Report> {
    const response = await axios.post(`${API_BASE_URL}/reports`, data);
    return response.data;
  },

  // Update a report
  async updateReport(id: string, data: UpdateReportData): Promise<Report> {
    const response = await axios.put(`${API_BASE_URL}/reports/${id}`, data);
    return response.data;
  },

  // Delete a report
  async deleteReport(id: string): Promise<void> {
    await axios.delete(`${API_BASE_URL}/reports/${id}`);
  },

  // Get vulnerability report data
  async getVulnerabilityReports(): Promise<VulnerabilityReportData> {
    const response = await axios.get(`${API_BASE_URL}/reports/vulnerabilities`);
    return response.data;
  },

  // Download report
  async downloadReport(id: string, format: 'pdf' | 'excel'): Promise<Blob> {
    const response = await axios.get(
      `${API_BASE_URL}/reports/${id}/download?format=${format}`,
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
    const response = await axios.post(`${API_BASE_URL}/reports/schedule`, reportData);
    return response.data;
  },
};
