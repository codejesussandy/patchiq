import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../../test-utils';
import { PatchJobs } from '@/pages/jobs/PatchJobs';

vi.mock('@/hooks/useJobs', () => ({
  useDeploymentPolicies: vi.fn(() => ({
    data: [
      {
        id: 'pol-1',
        policyId: 'POL-001',
        name: 'Critical Security Policy',
        description: 'Auto-deploy critical security patches',
        type: 'SCHEDULE',
        createdBy: 'admin',
        createdOn: '2024-01-15',
        createdAt: '2024-01-15',
      },
      {
        id: 'pol-2',
        policyId: 'POL-002',
        name: 'Instant Deploy Policy',
        description: 'Deploy patches immediately',
        type: 'INSTANT',
        createdBy: 'admin',
        createdOn: '2024-02-01',
        createdAt: '2024-02-01',
      },
    ],
    isLoading: false,
    refetch: vi.fn(),
  })),
  useDeleteDeploymentPolicy: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
  })),
  useSoftwareAgents: vi.fn(() => ({
    data: [],
  })),
}));

vi.mock('@/hooks/usePatches', () => ({
  usePatches: vi.fn(() => ({
    data: { data: [] },
    isLoading: false,
    refetch: vi.fn(),
  })),
  useCreateDeployment: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
  })),
}));

vi.mock('@/components/patches', () => ({
  SeverityBadge: ({ severity }: any) => <span data-testid="severity-badge">{severity}</span>,
  OSIcon: ({ os }: any) => <span data-testid="os-icon">{os}</span>,
}));

vi.mock('@/components/shared/DataTable', () => ({
  DataTable: ({ columns, data, loading }: any) => (
    <div data-testid="data-table">
      {loading && <span>Loading...</span>}
      <table>
        <thead>
          <tr>
            {columns?.map((col: any) => (
              <th key={col.key}>{col.title}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data?.map((row: any) => (
            <tr key={row.id}>
              <td>{row.name}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ),
}));

vi.mock('@/pages/jobs/components', () => ({
  JobToolbar: ({ searchText, onSearchChange, onCreate }: any) => (
    <div data-testid="job-toolbar">
      <input
        placeholder="Search..."
        value={searchText}
        onChange={(e: any) => onSearchChange(e.target.value)}
      />
      <button onClick={onCreate}>Create</button>
    </div>
  ),
  exportToCsv: vi.fn(),
}));

describe('PatchJobs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the job toolbar', () => {
    render(<PatchJobs />);
    expect(screen.getByTestId('job-toolbar')).toBeInTheDocument();
  });

  it('renders the search input', () => {
    render(<PatchJobs />);
    expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
  });

  it('renders the Create button', () => {
    render(<PatchJobs />);
    expect(screen.getByText('Create')).toBeInTheDocument();
  });

  it('renders the data table', () => {
    render(<PatchJobs />);
    expect(screen.getByTestId('data-table')).toBeInTheDocument();
  });

  it('renders table column headers', () => {
    render(<PatchJobs />);
    expect(screen.getByText('ID')).toBeInTheDocument();
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Description')).toBeInTheDocument();
    expect(screen.getByText('Type')).toBeInTheDocument();
    expect(screen.getByText('Created By')).toBeInTheDocument();
    expect(screen.getByText('Created On')).toBeInTheDocument();
  });

  it('renders policy data in the table', () => {
    render(<PatchJobs />);
    expect(screen.getByText('Critical Security Policy')).toBeInTheDocument();
    expect(screen.getByText('Instant Deploy Policy')).toBeInTheDocument();
  });

  it('accepts text in the search input', async () => {
    const user = userEvent.setup();
    render(<PatchJobs />);
    const searchInput = screen.getByPlaceholderText('Search...');
    await user.type(searchInput, 'Critical');
    expect(searchInput).toHaveValue('Critical');
  });
});
