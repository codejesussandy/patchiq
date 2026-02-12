import type { DashboardData, DashboardStats, TopVulnerabilities } from '../types/dashboard.types';
import { api } from './api.service';

export const dashboardService = {
  getDashboardData: async (): Promise<DashboardData> => {
    const response = await api.get<DashboardData>('/dashboard');
    return response.data;
  },

  getStats: async (): Promise<DashboardStats> => {
    const response = await api.get<DashboardStats>('/dashboard/stats');
    return response.data;
  },

  getTopVulnerabilities: async (): Promise<TopVulnerabilities> => {
    const response = await api.get<TopVulnerabilities>('/dashboard/top-vulnerabilities');
    return response.data;
  },

  refreshDashboard: async (): Promise<DashboardData> => {
    const response = await api.post<DashboardData>('/dashboard/refresh');
    return response.data;
  },
};

export default dashboardService;
