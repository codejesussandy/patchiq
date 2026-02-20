import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../../test-utils';
import { PatchDeployed } from '@/pages/patches/PatchDeployed';

vi.mock('@/hooks/usePatches', () => ({
  useDeployments: vi.fn(() => ({
    data: [
      {
        id: 'dep-1',
        name: 'Security Deployment Q1',
        deploymentId: 'DEP-001',
        type: 'INSTALL',
        status: 'COMPLETED',
        pending: 0,
        succeeded: 15,
        failed: 1,
        createdBy: 'admin',
        createdOn: '2024-01-20',
      },
      {
        id: 'dep-2',
        name: 'Emergency Rollback',
        deploymentId: 'DEP-002',
        type: 'ROLLBACK',
        status: 'IN_PROGRESS',
        pending: 5,
        succeeded: 3,
        failed: 0,
        createdBy: 'admin',
        createdOn: '2024-02-01',
      },
    ],
    isLoading: false,
  })),
  usePatches: vi.fn(() => ({
    data: { data: [] },
  })),
  useCreateDeployment: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
  useDeploymentTasks: vi.fn(() => ({
    data: [],
    isLoading: false,
    refetch: vi.fn(),
  })),
}));

vi.mock('@/hooks/useSettings', () => ({
  useComputerGroups: vi.fn(() => ({ data: [] })),
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

vi.mock('@/pages/patches/components/CreateDeploymentModal', () => ({
  CreateDeploymentModal: () => null,
  PreviewDeploymentModal: () => null,
}));

vi.mock('@/pages/patches/components/DeploymentTasksModal', () => ({
  DeploymentTasksModal: () => null,
}));

describe('PatchDeployed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the page title', () => {
    render(<PatchDeployed />);
    expect(screen.getByText('Patch Deployed')).toBeInTheDocument();
  });

  it('renders the Create button', () => {
    render(<PatchDeployed />);
    expect(screen.getByText('Create')).toBeInTheDocument();
  });

  it('renders the search input', () => {
    render(<PatchDeployed />);
    expect(screen.getByPlaceholderText('Search')).toBeInTheDocument();
  });

  it('renders the filter button', () => {
    render(<PatchDeployed />);
    expect(screen.getByText('Filter')).toBeInTheDocument();
  });

  it('renders the data table', () => {
    render(<PatchDeployed />);
    expect(screen.getByTestId('data-table')).toBeInTheDocument();
  });

  it('renders table column headers', () => {
    render(<PatchDeployed />);
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('ID')).toBeInTheDocument();
    expect(screen.getByText('Type')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('Succeeded')).toBeInTheDocument();
    expect(screen.getByText('Failed')).toBeInTheDocument();
  });

  it('renders deployment data in the table', () => {
    render(<PatchDeployed />);
    expect(screen.getByText('Security Deployment Q1')).toBeInTheDocument();
    expect(screen.getByText('Emergency Rollback')).toBeInTheDocument();
  });

  it('accepts text in the search input', async () => {
    const user = userEvent.setup();
    render(<PatchDeployed />);
    const searchInput = screen.getByPlaceholderText('Search');
    await user.type(searchInput, 'Security');
    expect(searchInput).toHaveValue('Security');
  });
});
