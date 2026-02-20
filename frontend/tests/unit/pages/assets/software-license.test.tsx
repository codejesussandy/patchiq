import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../../test-utils';
import { SoftwareLicense } from '@/pages/assets/SoftwareLicense';

vi.mock('@/hooks/useAssets', () => ({
  useSoftwareLicenses: vi.fn(() => ({
    data: [
      {
        id: 'sl-1',
        licenseName: 'Office 365 Pro',
        softwareName: 'Microsoft Office',
        status: 'ALLOCATED',
        licenseCount: 50,
        vendorName: 'Microsoft',
        purchaseDate: '2024-01-01',
        expiryDate: '2025-01-01',
      },
    ],
    isLoading: false,
  })),
  useOSLicenses: vi.fn(() => ({
    data: [
      {
        id: 'ol-1',
        licenseName: 'Windows 11 Enterprise',
        osType: 'Windows',
        status: 'AVAILABLE',
        licenseCount: 100,
        vendorName: 'Microsoft',
        purchaseDate: '2024-01-01',
        expiryDate: '2025-01-01',
      },
    ],
    isLoading: false,
  })),
  useCreateSoftwareLicense: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useUpdateSoftwareLicense: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useDeleteSoftwareLicense: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
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

vi.mock('@/pages/assets/components/LicenseFormModal', () => ({
  LicenseFormModal: () => null,
}));

vi.mock('@shared/types', () => ({
  formatEnum: (val: string) => val,
}));

describe('SoftwareLicense', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the page title', () => {
    render(<SoftwareLicense />);
    expect(screen.getByText('Software Licenses')).toBeInTheDocument();
  });

  it('renders the New License button', () => {
    render(<SoftwareLicense />);
    expect(screen.getByText('New License')).toBeInTheDocument();
  });

  it('renders Application Licenses tab', () => {
    render(<SoftwareLicense />);
    expect(screen.getByText('Application Licenses')).toBeInTheDocument();
  });

  it('renders OS Licenses tab', () => {
    render(<SoftwareLicense />);
    expect(screen.getByText('OS Licenses')).toBeInTheDocument();
  });

  it('renders the search input on Application Licenses tab', () => {
    render(<SoftwareLicense />);
    expect(screen.getByPlaceholderText('Search')).toBeInTheDocument();
  });

  it('renders software license columns on Application tab', () => {
    render(<SoftwareLicense />);
    expect(screen.getByText('License Name')).toBeInTheDocument();
    expect(screen.getByText('Software Name')).toBeInTheDocument();
    expect(screen.getByText('License Count')).toBeInTheDocument();
    expect(screen.getByText('Vendor Name')).toBeInTheDocument();
  });

  it('switches to OS Licenses tab', async () => {
    const user = userEvent.setup();
    render(<SoftwareLicense />);
    const osTab = screen.getByText('OS Licenses');
    await user.click(osTab);
    await waitFor(() => {
      expect(screen.getByText('OS Type')).toBeInTheDocument();
    });
  });

  it('renders software license data in the table', () => {
    render(<SoftwareLicense />);
    expect(screen.getByText('Office 365 Pro')).toBeInTheDocument();
  });

  it('accepts text in the search input', async () => {
    const user = userEvent.setup();
    render(<SoftwareLicense />);
    const searchInput = screen.getByPlaceholderText('Search');
    await user.type(searchInput, 'Office');
    expect(searchInput).toHaveValue('Office');
  });
});
