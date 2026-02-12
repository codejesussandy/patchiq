import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reportsService } from '../services/reports.service';
import type {
  ListReportsParams,
  CreateReportData,
  UpdateReportData,
  CreateScheduleData,
  UpdateScheduleData,
  SendReportData,
  ReportFormat,
  CreateReportStep1Data,
  CreateReportStep2Data,
  CreateReportStep3Data,
} from '../types/reports.types';

export const reportKeys = {
  all: ['reports'] as const,
  lists: (params?: ListReportsParams) => [...reportKeys.all, 'list', params] as const,
  detail: (id: string) => [...reportKeys.all, 'detail', id] as const,
  preview: (id: string) => [...reportKeys.all, 'preview', id] as const,
  templates: () => [...reportKeys.all, 'templates'] as const,
  schedules: () => [...reportKeys.all, 'schedules'] as const,
  vulnerabilityReports: () => [...reportKeys.all, 'vulnerability'] as const,
};

export function useReports(params?: ListReportsParams) {
  return useQuery({ queryKey: reportKeys.lists(params), queryFn: () => reportsService.getReports(params) });
}

export function useReport(id: string) {
  return useQuery({ queryKey: reportKeys.detail(id), queryFn: () => reportsService.getReport(id), enabled: !!id });
}

export function useReportPreview(id: string, limit?: number) {
  return useQuery({ queryKey: reportKeys.preview(id), queryFn: () => reportsService.getPreview(id, limit), enabled: !!id });
}

export function useReportTemplates() {
  return useQuery({ queryKey: reportKeys.templates(), queryFn: () => reportsService.getTemplates() });
}

export function useReportSchedules() {
  return useQuery({ queryKey: reportKeys.schedules(), queryFn: () => reportsService.getSchedules() });
}

export function useVulnerabilityReports() {
  return useQuery({ queryKey: reportKeys.vulnerabilityReports(), queryFn: () => reportsService.getVulnerabilityReports() });
}

// ============================================
// Mutations
// ============================================

export function useCreateReport() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (data: CreateReportData) => reportsService.createReport(data), onSuccess: () => { qc.invalidateQueries({ queryKey: reportKeys.all }); } });
}

export function useUpdateReport() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ id, data }: { id: string; data: UpdateReportData }) => reportsService.updateReport(id, data), onSuccess: () => { qc.invalidateQueries({ queryKey: reportKeys.all }); } });
}

export function useDeleteReport() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => reportsService.deleteReport(id), onSuccess: () => { qc.invalidateQueries({ queryKey: reportKeys.all }); } });
}

export function useRegenerateReport() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => reportsService.regenerateReport(id), onSuccess: () => { qc.invalidateQueries({ queryKey: reportKeys.all }); } });
}

export function useDownloadReport() {
  return useMutation({ mutationFn: ({ id, format }: { id: string; format?: ReportFormat }) => reportsService.downloadReport(id, format) });
}

export function useSendReport() {
  return useMutation({ mutationFn: ({ id, data }: { id: string; data: SendReportData }) => reportsService.sendReport(id, data) });
}

export function useCreateSchedule() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (data: CreateScheduleData) => reportsService.createSchedule(data), onSuccess: () => { qc.invalidateQueries({ queryKey: reportKeys.schedules() }); } });
}

export function useUpdateSchedule() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ id, data }: { id: string; data: UpdateScheduleData }) => reportsService.updateSchedule(id, data), onSuccess: () => { qc.invalidateQueries({ queryKey: reportKeys.schedules() }); } });
}

export function useDeleteSchedule() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => reportsService.deleteSchedule(id), onSuccess: () => { qc.invalidateQueries({ queryKey: reportKeys.schedules() }); } });
}

// ============================================
// Wizard Step Mutations
// ============================================

export function useCreateReportStep1() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (data: CreateReportStep1Data) => reportsService.createReportStep1(data), onSuccess: () => { qc.invalidateQueries({ queryKey: reportKeys.all }); } });
}

export function useCreateReportStep2() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ reportId, data }: { reportId: string; data: CreateReportStep2Data }) => reportsService.createReportStep2(reportId, data), onSuccess: () => { qc.invalidateQueries({ queryKey: reportKeys.all }); } });
}

export function useCreateReportStep3() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ reportId, data }: { reportId: string; data: CreateReportStep3Data }) => reportsService.createReportStep3(reportId, data), onSuccess: () => { qc.invalidateQueries({ queryKey: reportKeys.all }); } });
}
