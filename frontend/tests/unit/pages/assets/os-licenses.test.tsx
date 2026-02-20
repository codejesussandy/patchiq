import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../../test-utils';
import { OSLicenses } from '@/pages/assets/OSLicenses';

vi.mock('@/hooks/useAssets', () => ({
  useOSLicenses: vi.fn(() => ({
    data: [
      {
        id: 'ol-1',
        licenseName: 'Windows 11 Enterprise',
        osType: 'Windows',
        status: 'ALLOCATED',
        licenseCount: 100,
        vendorName: 'Microsoft',
        purchaseDate: '2024-01-01',
        expiryDate: '2025-01-01',
      },
      {
        id: 'ol-2',
        licenseName: 'RHEL Server',
        osType: 'Linux',
        status: 'AVAILABLE',
        licenseCount: 25,
        vendorName: 'Red Hat',
        purchaseDate: '2024-06-01',
        expiryDate: '2025-06-01',
      },
    ],
    isLoading: false,
  })),
  useCreateOSLicense: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useUpdateOSLicense: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useDeleteOSLicense: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
}));

vi.mock('@/hooks/useModal', () => ({
  useModal: vi.fn(() => ({
    open: false,
    selectedItem: null,
    onOpen: vi.fn(),
    onClose: vi.fn(),
  })),
}));

vi.mock('@/components/shared/ConfirmModal', () => ({
  ConfirmModal: () => null,
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
              <td>{row.licenseName}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ),
}));

vi.mock('@/pages/assets/components/OSLicenseFormModal', () => ({
  OSLicenseFormModal: () => null,
}));

vi.mock('@shared/types', () => ({
  formatEnum: (val: string) => val,
}));

describe('OSLicenses', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the page title', () => {
    render(<OSLicenses />);
    expect(screen.getByText('OS License')).toBeInTheDocument();
  });

  it('renders the New License button', () => {
    render(<OSLicenses />);
    expect(screen.getByText('New License')).toBeInTheDocument();
  });

  it('renders the Auto Fetch button', () => {
    render(<OSLicenses />);
    expect(screen.getByText('Auto Fetch')).toBeInTheDocument();
  });

  it('renders the data table', () => {
    render(<OSLicenses />);
    expect(screen.getByTestId('data-table')).toBeInTheDocument();
  });

  it('renders table column headers', () => {
    render(<OSLicenses />);
    expect(screen.getByText('License Name')).toBeInTheDocument();
    expect(screen.getByText('OS Type')).toBeInTheDocument();
    expect(screen.getByText('License Count')).toBeInTheDocument();
    expect(screen.getByText('Vendor Name')).toBeInTheDocument();
  });

  it('renders the search input', () => {
    render(<OSLicenses />);
    expect(screen.getByPlaceholderText('Search')).toBeInTheDocument();
  });

  it('renders OS license data in the table', () => {
    render(<OSLicenses />);
    expect(screen.getByText('Windows 11 Enterprise')).toBeInTheDocument();
    expect(screen.getByText('RHEL Server')).toBeInTheDocument();
  });

  it('accepts text in the search input', async () => {
    const user = userEvent.setup();
    render(<OSLicenses />);
    const searchInput = screen.getByPlaceholderText('Search');
    await user.type(searchInput, 'Windows');
    expect(searchInput).toHaveValue('Windows');
  });

  it('renders the OS type filter dropdown', () => {
    render(<OSLicenses />);
    expect(screen.getByText('All OS')).toBeInTheDocument();
  });

  it('renders the status filter dropdown', () => {
    render(<OSLicenses />);
    expect(screen.getByText('All Status')).toBeInTheDocument();
  });
});
