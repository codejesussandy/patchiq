import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../test-utils';
import { Reports } from '@/pages/Reports';

vi.mock('@/hooks/useReports', () => ({
  useReports: vi.fn(() => ({
    data: {
      data: [
        { id: '1', name: 'Monthly Patch Report', description: 'Monthly summary', type: 'PATCH_SUMMARY', format: 'PDF', status: 'COMPLETED', fileSize: 1024000, generatedAt: '2024-06-15T10:00:00Z', createdBy: 'admin', createdAt: '2024-06-01T00:00:00Z', schedule: { enabled: false, frequency: 'DAILY' } },
        { id: '2', name: 'Vulnerability Report', description: 'Weekly vulns', type: 'VULNERABILITY', format: 'CSV', status: 'PROCESSING', fileSize: 0, generatedAt: null, createdBy: 'admin', createdAt: '2024-06-10T00:00:00Z', schedule: { enabled: true, frequency: 'WEEKLY', time: '08:00', recipients: ['admin@test.com'] } },
      ],
      total: 2,
    },
    isLoading: false,
    refetch: vi.fn(),
  })),
  useDeleteReport: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useRegenerateReport: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useDownloadReport: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
}));

vi.mock('@/services/reports.service', () => ({
  formatFileSize: vi.fn((size: number) => size > 0 ? '1 MB' : '0 B'),
  downloadBlob: vi.fn(),
  getFileExtension: vi.fn(() => 'pdf'),
}));

vi.mock('@/types/reports.types', () => ({
  REPORT_TYPE_LABELS: { PATCH_SUMMARY: 'Patch Summary', VULNERABILITY: 'Vulnerability' },
  REPORT_STATUS_CONFIG: {
    COMPLETED: { label: 'Completed', color: 'green' },
    PROCESSING: { label: 'Processing', color: 'blue' },
    PENDING: { label: 'Pending', color: 'default' },
    FAILED: { label: 'Failed', color: 'red' },
  },
  REPORT_FORMAT_LABELS: { PDF: 'PDF', CSV: 'CSV', XLSX: 'Excel' },
}));

vi.mock('@/pages/reports/components/CreateReportWizard', () => ({ CreateReportWizard: () => null }));
vi.mock('@/pages/reports/components/ScheduleReportModal', () => ({ ScheduleReportModal: () => null }));
vi.mock('@/pages/reports/components/SendReportModal', () => ({ SendReportModal: () => null }));

describe('Reports', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders search input', () => {
    render(<Reports />);
    expect(screen.getByPlaceholderText(/search by name/i)).toBeInTheDocument();
  });

  it('renders Create button', () => {
    render(<Reports />);
    expect(screen.getByRole('button', { name: /create/i })).toBeInTheDocument();
  });

  it('renders Refresh and Export buttons', () => {
    render(<Reports />);
    expect(screen.getByText('Refresh')).toBeInTheDocument();
    expect(screen.getByText('Export')).toBeInTheDocument();
  });

  it('renders report data in table', () => {
    render(<Reports />);
    expect(screen.getByText('Monthly Patch Report')).toBeInTheDocument();
    expect(screen.getByText('Vulnerability Report')).toBeInTheDocument();
  });

  it('renders filter dropdowns', () => {
    render(<Reports />);
    expect(screen.getByText('Clear')).toBeInTheDocument();
  });
});
