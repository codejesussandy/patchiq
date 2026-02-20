import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../../test-utils';
import { PatchRecommendations } from '@/pages/patches/PatchRecommendations';

vi.mock('@/hooks/usePatchRecommendations', () => ({
  usePatchRecommendations: vi.fn(() => ({
    data: {
      data: [
        {
          id: 'rec-1',
          vulnerability: { id: 'v-1', cveId: 'CVE-2024-0001' },
          asset: { id: 'a-1', name: 'Server-01' },
          patch: { id: 'p-1', patchId: 'PATCH-001' },
          severity: 'CRITICAL',
          status: 'RECOMMENDED',
          riskScore: 9.5,
          affectedSoftware: 'Windows 11',
        },
        {
          id: 'rec-2',
          vulnerability: { id: 'v-2', cveId: 'CVE-2024-0002' },
          asset: { id: 'a-2', name: 'Workstation-02' },
          patch: { id: 'p-2', patchId: 'PATCH-002' },
          severity: 'HIGH',
          status: 'ACCEPTED',
          riskScore: 7.2,
          affectedSoftware: 'Chrome',
        },
      ],
    },
    isLoading: false,
    isRefetching: false,
    refetch: vi.fn(),
  })),
  usePatchRecommendationDashboardStats: vi.fn(() => ({
    data: {
      bySeverity: { critical: 5, high: 10, medium: 15, low: 3 },
      byStatus: { recommended: 12, accepted: 8, deployed: 5 },
    },
    isLoading: false,
    isRefetching: false,
  })),
  useAcceptRecommendation: vi.fn(() => ({ mutateAsync: vi.fn() })),
  useRejectRecommendation: vi.fn(() => ({ mutateAsync: vi.fn() })),
  useDeployRecommendation: vi.fn(() => ({ mutateAsync: vi.fn() })),
  useBulkAcceptRecommendations: vi.fn(() => ({ mutateAsync: vi.fn() })),
  useBulkRejectRecommendations: vi.fn(() => ({ mutateAsync: vi.fn() })),
  useBulkDeployRecommendations: vi.fn(() => ({ mutateAsync: vi.fn() })),
}));

vi.mock('@/components/shared/BulkActionBar', () => ({
  BulkActionBar: ({ children }: any) => <div data-testid="bulk-action-bar">{children}</div>,
}));

vi.mock('@/components/shared/DataTable', () => ({
  DataTable: ({ columns, data }: any) => (
    <div data-testid="data-table">
      <table>
        <thead>
          <tr>
            {columns?.map((col: any) => (
              <th key={col.key || col.dataIndex}>{col.title}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data?.map((row: any) => (
            <tr key={row.id}>
              <td>{row.vulnerability?.cveId}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ),
}));

vi.mock('@/pages/patches/components/recommendations/recommendationColumns', () => ({
  buildRecommendationColumns: vi.fn(() => [
    { title: 'CVE', key: 'cve', dataIndex: 'cve' },
    { title: 'Asset', key: 'asset', dataIndex: 'asset' },
    { title: 'Severity', key: 'severity', dataIndex: 'severity' },
    { title: 'Status', key: 'status', dataIndex: 'status' },
  ]),
}));

vi.mock('@/pages/patches/components/recommendations/StatCard', () => ({
  StatCard: ({ title, value }: any) => (
    <div data-testid={`stat-card-${title.toLowerCase()}`}>
      <span>{title}</span>
      <span>{value}</span>
    </div>
  ),
}));

vi.mock('@/utils/error', () => ({
  getErrorMessage: vi.fn((err: unknown, fallback: string) => fallback),
}));

describe('PatchRecommendations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the page title', () => {
    render(<PatchRecommendations />);
    expect(screen.getByText('Patch Recommendations')).toBeInTheDocument();
  });

  it('renders the Refresh button', () => {
    render(<PatchRecommendations />);
    expect(screen.getByText('Refresh')).toBeInTheDocument();
  });

  it('renders severity stat cards', () => {
    render(<PatchRecommendations />);
    expect(screen.getByTestId('stat-card-critical')).toBeInTheDocument();
    expect(screen.getByTestId('stat-card-high')).toBeInTheDocument();
    expect(screen.getByTestId('stat-card-medium')).toBeInTheDocument();
    expect(screen.getByTestId('stat-card-low')).toBeInTheDocument();
  });

  it('renders status stat cards', () => {
    render(<PatchRecommendations />);
    expect(screen.getByTestId('stat-card-recommended')).toBeInTheDocument();
    expect(screen.getByTestId('stat-card-accepted')).toBeInTheDocument();
    expect(screen.getByTestId('stat-card-deployed')).toBeInTheDocument();
  });

  it('renders stat card values', () => {
    render(<PatchRecommendations />);
    const criticalCard = screen.getByTestId('stat-card-critical');
    expect(criticalCard).toHaveTextContent('5');
    const highCard = screen.getByTestId('stat-card-high');
    expect(highCard).toHaveTextContent('10');
    const mediumCard = screen.getByTestId('stat-card-medium');
    expect(mediumCard).toHaveTextContent('15');
  });

  it('renders the recommendations data table', () => {
    render(<PatchRecommendations />);
    expect(screen.getByText('Recommendations')).toBeInTheDocument();
    expect(screen.getByTestId('data-table')).toBeInTheDocument();
  });

  it('renders the search input', () => {
    render(<PatchRecommendations />);
    expect(screen.getByPlaceholderText('Search CVE, Asset, Patch...')).toBeInTheDocument();
  });

  it('accepts text in the search input', async () => {
    const user = userEvent.setup();
    render(<PatchRecommendations />);
    const searchInput = screen.getByPlaceholderText('Search CVE, Asset, Patch...');
    await user.type(searchInput, 'CVE-2024');
    expect(searchInput).toHaveValue('CVE-2024');
  });

  it('renders the bulk action bar', () => {
    render(<PatchRecommendations />);
    expect(screen.getByTestId('bulk-action-bar')).toBeInTheDocument();
  });
});
