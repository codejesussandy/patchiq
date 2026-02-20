import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../../test-utils';
import { ZeroTouchDeployment } from '@/pages/patches/ZeroTouchDeployment';

vi.mock('@/hooks/usePatches', () => ({
  useZeroTouchConfigs: vi.fn(() => ({
    data: [
      {
        id: 'zt-1',
        name: 'Auto Security Patches',
        description: 'Automatically deploy critical security patches',
        applicationType: 'Security',
        scope: 'ALL_COMPUTERS',
        status: 'ACTIVE',
        createdBy: 'admin',
        createdOn: '2024-01-10',
        autoDeploymentRules: { severity: ['CRITICAL', 'HIGH'] },
      },
      {
        id: 'zt-2',
        name: 'Office Updates',
        description: 'Auto deploy Office suite updates',
        applicationType: 'Productivity',
        scope: 'SPECIFIC_GROUP',
        status: 'PAUSED',
        createdBy: 'admin',
        createdOn: '2024-02-01',
        autoDeploymentRules: { severity: ['MEDIUM'] },
      },
    ],
    isLoading: false,
  })),
  useCreateZeroTouchConfig: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useUpdateZeroTouchConfig: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useDeleteZeroTouchConfig: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
}));

vi.mock('@/hooks/useAssets', () => ({
  useSoftwareInventory: vi.fn(() => ({ data: [] })),
  useAssets: vi.fn(() => ({ data: [] })),
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

vi.mock('@/pages/patches/components/ZeroTouchConfigForm', () => ({
  ZeroTouchConfigForm: () => <div data-testid="zero-touch-form">Config Form</div>,
}));

vi.mock('@/pages/patches/components/ViewConfigModal', () => ({
  ViewConfigModal: () => null,
}));

describe('ZeroTouchDeployment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the page title', () => {
    render(<ZeroTouchDeployment />);
    expect(screen.getByText('Zero Touch Deployment')).toBeInTheDocument();
  });

  it('renders the Create button', () => {
    render(<ZeroTouchDeployment />);
    expect(screen.getByText('Create')).toBeInTheDocument();
  });

  it('renders the search input', () => {
    render(<ZeroTouchDeployment />);
    expect(screen.getByPlaceholderText('Search configurations')).toBeInTheDocument();
  });

  it('renders the data table', () => {
    render(<ZeroTouchDeployment />);
    expect(screen.getByTestId('data-table')).toBeInTheDocument();
  });

  it('renders table column headers', () => {
    render(<ZeroTouchDeployment />);
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Description')).toBeInTheDocument();
    expect(screen.getByText('Application Type')).toBeInTheDocument();
    expect(screen.getByText('Scope')).toBeInTheDocument();
    expect(screen.getByText('Auto Deploy')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
  });

  it('renders configuration data in the table', () => {
    render(<ZeroTouchDeployment />);
    expect(screen.getByText('Auto Security Patches')).toBeInTheDocument();
    expect(screen.getByText('Office Updates')).toBeInTheDocument();
  });

  it('accepts text in the search input', async () => {
    const user = userEvent.setup();
    render(<ZeroTouchDeployment />);
    const searchInput = screen.getByPlaceholderText('Search configurations');
    await user.type(searchInput, 'Security');
    expect(searchInput).toHaveValue('Security');
  });
});
