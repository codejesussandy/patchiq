import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../../test-utils';
import { PatchTestApprove } from '@/pages/patches/PatchTestApprove';

vi.mock('@/hooks/usePatches', () => ({
  usePatchTests: vi.fn(() => ({
    data: [
      {
        id: 'test-1',
        name: 'Security Patch Test',
        description: 'Testing critical security patches',
        applicationType: 'Security',
        scope: 'ALL_COMPUTERS',
        status: 'PENDING',
        createdBy: 'admin',
        createdOn: '2024-01-15',
      },
      {
        id: 'test-2',
        name: 'Office Update Test',
        description: 'Testing Office suite updates',
        applicationType: 'Productivity',
        scope: 'SPECIFIC_GROUP',
        status: 'APPROVED',
        createdBy: 'admin',
        createdOn: '2024-01-20',
      },
    ],
    isLoading: false,
  })),
  useCreatePatchTest: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useApprovePatchTest: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useDeletePatchTest: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
}));

vi.mock('@/hooks/useAssets', () => ({
  useSoftwareInventory: vi.fn(() => ({ data: [] })),
  useAssets: vi.fn(() => ({ data: [] })),
}));

vi.mock('@/hooks/useSettings', () => ({
  useComputerGroups: vi.fn(() => ({ data: [] })),
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
              <td>{row.name}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ),
}));

vi.mock('@/pages/patches/components/PatchTestForm', () => ({
  PatchTestForm: () => <div data-testid="patch-test-form">Test Form</div>,
}));

vi.mock('@/pages/patches/components/ViewTestModal', () => ({
  ViewTestModal: () => null,
}));

describe('PatchTestApprove', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the page title', () => {
    render(<PatchTestApprove />);
    expect(screen.getByText('Patch Test and Approve')).toBeInTheDocument();
  });

  it('renders the Create button', () => {
    render(<PatchTestApprove />);
    expect(screen.getByText('Create')).toBeInTheDocument();
  });

  it('renders the search input', () => {
    render(<PatchTestApprove />);
    expect(screen.getByPlaceholderText('Search tests')).toBeInTheDocument();
  });

  it('renders the data table', () => {
    render(<PatchTestApprove />);
    expect(screen.getByTestId('data-table')).toBeInTheDocument();
  });

  it('renders table column headers', () => {
    render(<PatchTestApprove />);
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Description')).toBeInTheDocument();
    expect(screen.getByText('Application Type')).toBeInTheDocument();
    expect(screen.getByText('Scope')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
  });

  it('renders test data in the table', () => {
    render(<PatchTestApprove />);
    expect(screen.getByText('Security Patch Test')).toBeInTheDocument();
    expect(screen.getByText('Office Update Test')).toBeInTheDocument();
  });

  it('accepts text in the search input', async () => {
    const user = userEvent.setup();
    render(<PatchTestApprove />);
    const searchInput = screen.getByPlaceholderText('Search tests');
    await user.type(searchInput, 'Security');
    expect(searchInput).toHaveValue('Security');
  });
});
