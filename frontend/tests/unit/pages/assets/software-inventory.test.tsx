import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../../test-utils';
import { SoftwareInventory } from '@/pages/assets/SoftwareInventory';

vi.mock('@/hooks/useAssets', () => ({
  useSoftwareInventory: vi.fn(() => ({
    data: [
      {
        id: 'sw-1',
        softwareName: 'Visual Studio Code',
        version: '1.85.0',
        softwareType: 'application',
        manufacturer: 'Microsoft',
        totalInstances: 42,
      },
      {
        id: 'sw-2',
        softwareName: 'Chrome',
        version: '120.0',
        softwareType: 'application',
        manufacturer: 'Google',
        totalInstances: 100,
      },
    ],
    isLoading: false,
  })),
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
              <td>{row.softwareName}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ),
}));

describe('SoftwareInventory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the page title', () => {
    render(<SoftwareInventory />);
    expect(screen.getByText('Software Inventory')).toBeInTheDocument();
  });

  it('renders the Import from CSV button', () => {
    render(<SoftwareInventory />);
    expect(screen.getByText('Import from CSV')).toBeInTheDocument();
  });

  it('renders the data table', () => {
    render(<SoftwareInventory />);
    expect(screen.getByTestId('data-table')).toBeInTheDocument();
  });

  it('renders table column headers', () => {
    render(<SoftwareInventory />);
    expect(screen.getByText('Software Name')).toBeInTheDocument();
    expect(screen.getByText('Version')).toBeInTheDocument();
    expect(screen.getByText('Software Type')).toBeInTheDocument();
    expect(screen.getByText('Manufacturer')).toBeInTheDocument();
    expect(screen.getByText('Total Instances')).toBeInTheDocument();
  });

  it('renders the search input', () => {
    render(<SoftwareInventory />);
    expect(screen.getByPlaceholderText('Search')).toBeInTheDocument();
  });

  it('renders the category filter dropdown', () => {
    render(<SoftwareInventory />);
    expect(screen.getByText('All Categories')).toBeInTheDocument();
  });

  it('accepts text in the search input', async () => {
    const user = userEvent.setup();
    render(<SoftwareInventory />);
    const searchInput = screen.getByPlaceholderText('Search');
    await user.type(searchInput, 'Visual Studio');
    expect(searchInput).toHaveValue('Visual Studio');
  });

  it('renders software rows in the table', () => {
    render(<SoftwareInventory />);
    expect(screen.getByText('Visual Studio Code')).toBeInTheDocument();
    expect(screen.getByText('Chrome')).toBeInTheDocument();
  });
});
