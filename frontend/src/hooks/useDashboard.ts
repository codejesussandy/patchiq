import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dashboardService } from '../services/dashboard.service';

export const dashboardKeys = {
  all: ['dashboard'] as const,
  data: () => [...dashboardKeys.all, 'data'] as const,
  stats: () => [...dashboardKeys.all, 'stats'] as const,
  topVulnerabilities: () => [...dashboardKeys.all, 'top-vulnerabilities'] as const,
};

export function useDashboardData() {
  return useQuery({ queryKey: dashboardKeys.data(), queryFn: () => dashboardService.getDashboardData() });
}

export function useDashboardStats() {
  return useQuery({ queryKey: dashboardKeys.stats(), queryFn: () => dashboardService.getStats() });
}

export function useTopVulnerabilities() {
  return useQuery({ queryKey: dashboardKeys.topVulnerabilities(), queryFn: () => dashboardService.getTopVulnerabilities() });
}

export function useRefreshDashboard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => dashboardService.refreshDashboard(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: dashboardKeys.all });
    },
  });
}
