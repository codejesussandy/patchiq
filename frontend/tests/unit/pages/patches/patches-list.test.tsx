import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../../test-utils';
import { AllPatches } from '@/pages/patches/AllPatches';

vi.mock('@/hooks/usePatches', () => ({
  usePatches: vi.fn(() => ({
    data: {
      data: [
        {
          id: 'p-1',
          patchId: 'PATCH-001',
          software: 'Windows Security Update',
          os: 'WINDOWS',
          severity: 'CRITICAL',
          category: 'Security Updates',
          endpoints: 15,
          kbNumber: 'KB5034441',
          publishedAt: '2024-01-15',
          supersededBy: [],
        },
        {
          id: 'p-2',
          patchId: 'PATCH-002',
          software: 'Chrome Update',
          os: 'WINDOWS',
          severity: 'HIGH',
          category: 'Application Updates',
          endpoints: 42,
          kbNumber: '',
          publishedAt: '2024-02-01',
          supersededBy: [],
        },
      ],
    },
    isLoading: false,
  })),
  useDiscoverPatches: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
  })),
  useDeletePatch: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
  useCreatePatch: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
  useCreateDeployment: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
}));

vi.mock('@/hooks/useAgents', () => ({
  useAgents: vi.fn(() => ({ data: [] })),
}));

vi.mock('@/hooks/useModal', () => ({
  useModal: vi.fn(() => ({
    open: false,
    selectedItem: null,
    onOpen: vi.fn(),
    onClose: vi.fn(),
  })),
}));

vi.mock('@/hooks/usePatchTemplates', () => ({
  usePatchTemplates: vi.fn(() => ({ data: [], isLoading: false })),
  usePatchTemplateLatestVersion: vi.fn(() => ({ data: null, isFetching: false })),
}));

vi.mock('@/components/patches', () => ({
  SeverityBadge: ({ severity }: any) => <span data-testid="severity-badge">{severity}</span>,
  OSIcon: ({ os }: any) => <span data-testid="os-icon">{os}</span>,
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
              <td>{row.software}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ),
}));

vi.mock('@/pages/patches/components/PatchCreateEditModal', () => ({
  PatchCreateEditModal: () => null,
}));

vi.mock('@/pages/patches/components/BulkAddModal', () => ({
  BulkAddModal: () => null,
}));

vi.mock('@/pages/patches/components/PatchFilterModal', () => ({
  PatchFilterModal: () => null,
}));

vi.mock('@/pages/patches/components/DeployModal', () => ({
  DeployModal: () => null,
}));

vi.mock('@/pages/patches/components/TemplatePickerModal', () => ({
  TemplatePickerModal: () => null,
}));

vi.mock('@/utils/error', () => ({
  getErrorMessage: vi.fn((err: unknown, fallback: string) => fallback),
}));

describe('AllPatches', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the page title', () => {
    render(<AllPatches />);
    expect(screen.getByText('All Patches')).toBeInTheDocument();
  });

  it('renders the data table', () => {
    render(<AllPatches />);
    expect(screen.getByTestId('data-table')).toBeInTheDocument();
  });

  it('renders table column headers', () => {
    render(<AllPatches />);
    expect(screen.getByText('Software')).toBeInTheDocument();
    expect(screen.getByText('ID')).toBeInTheDocument();
    expect(screen.getByText('Endpoints')).toBeInTheDocument();
    expect(screen.getByText('OS')).toBeInTheDocument();
    expect(screen.getByText('Severity')).toBeInTheDocument();
  });

  it('renders the search input', () => {
    render(<AllPatches />);
    expect(screen.getByPlaceholderText('Search')).toBeInTheDocument();
  });

  it('renders the filter button', () => {
    render(<AllPatches />);
    expect(screen.getByText('Filter')).toBeInTheDocument();
  });

  it('renders the Create Patch button', () => {
    render(<AllPatches />);
    expect(screen.getByText('Create Patch')).toBeInTheDocument();
  });

  it('renders the Discover Patches button', () => {
    render(<AllPatches />);
    expect(screen.getByText('Discover Patches')).toBeInTheDocument();
  });

  it('renders the Bulk Add button', () => {
    render(<AllPatches />);
    expect(screen.getByText('Bulk Add')).toBeInTheDocument();
  });

  it('renders the From Template button', () => {
    render(<AllPatches />);
    expect(screen.getByText('From Template')).toBeInTheDocument();
  });

  it('renders patch data in the table', () => {
    render(<AllPatches />);
    expect(screen.getByText('Windows Security Update')).toBeInTheDocument();
    expect(screen.getByText('Chrome Update')).toBeInTheDocument();
  });

  it('accepts text in the search input', async () => {
    const user = userEvent.setup();
    render(<AllPatches />);
    const searchInput = screen.getByPlaceholderText('Search');
    await user.type(searchInput, 'Windows');
    expect(searchInput).toHaveValue('Windows');
  });
});
