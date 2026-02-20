import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../../test-utils';
import { AllAssets } from '@/pages/assets/AllAssets';

// Mock all hooks used by AllAssets
vi.mock('@/hooks/useAssets', () => ({
  useAssetsList: vi.fn(() => ({
    data: {
      data: [
        {
          id: '1',
          name: 'Server-01',
          hostname: 'server-01.local',
          ipAddress: '192.168.1.1',
          operationalStatus: 'CONNECTED',
          status: 'IN_USE',
          categoryId: 'cat-1',
          subCategoryId: 'sub-1',
          createdAt: '2024-01-01',
        },
        {
          id: '2',
          name: 'Workstation-02',
          hostname: 'ws-02.local',
          ipAddress: '192.168.1.2',
          operationalStatus: 'DISCONNECTED',
          status: 'AVAILABLE',
          categoryId: null,
          subCategoryId: null,
          createdAt: '2024-01-02',
        },
      ],
      total: 2,
    },
    isLoading: false,
  })),
  useCategories: vi.fn(() => ({
    data: [{ id: 'cat-1', name: 'Servers', color: 'blue' }],
  })),
  useSubCategories: vi.fn(() => ({
    data: [{ id: 'sub-1', name: 'Web Servers', categoryId: 'cat-1' }],
  })),
  useUpdateAsset: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
  useDeleteAsset: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
}));

vi.mock('@/hooks/useModal', () => ({
  useModal: vi.fn(() => ({
    open: false,
    selectedItem: null,
    onOpen: vi.fn(),
    onClose: vi.fn(),
  })),
}));

vi.mock('@/hooks/useTableParams', () => ({
  useTableParams: vi.fn(() => ({
    page: 1,
    pageSize: 20,
    search: '',
    sort: { field: 'createdAt', order: 'desc' },
    filters: { status: '', operationalStatus: '', categoryId: '' },
    setPage: vi.fn(),
    setPageSize: vi.fn(),
    setSearch: vi.fn(),
    setFilters: vi.fn(),
  })),
}));

vi.mock('@/components/ColumnSettingsDrawer', () => ({
  ColumnSettingsDrawer: () => null,
  useColumnConfig: vi.fn(() => [
    [
      { key: 'assetId', title: 'Asset ID', visible: true, pinned: false, width: 200, group: 'Basic' },
      { key: 'networkIdentity', title: 'Network Identity', visible: true, pinned: false, width: 180, group: 'Basic' },
      { key: 'category', title: 'Category', visible: true, pinned: false, width: 180, group: 'Organization' },
      { key: 'operationalStatus', title: 'Operational Status', visible: true, pinned: false, width: 150, group: 'Status' },
      { key: 'status', title: 'Status', visible: true, pinned: false, width: 150, group: 'Status' },
      { key: 'action', title: 'Actions', visible: true, pinned: false, required: true, width: 50, group: 'Actions' },
    ],
    vi.fn(),
  ]),
}));

vi.mock('@/components/icons/TableSettingsIcon', () => ({
  TableSettingsIcon: () => <span>settings-icon</span>,
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
              <td>{row.name || row.assetId}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ),
}));

vi.mock('@/pages/assets/components/AddAssetModal', () => ({
  AddAssetModal: () => null,
}));

vi.mock('@/pages/assets/components/allassets/DownloadAgentModal', () => ({
  DownloadAgentModal: () => null,
}));

vi.mock('@shared/types', () => ({
  formatEnum: (val: string) => val,
}));

describe('AllAssets', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the page title', () => {
    render(<AllAssets />);
    expect(screen.getByText('Assets')).toBeInTheDocument();
  });

  it('renders the data table', () => {
    render(<AllAssets />);
    expect(screen.getByTestId('data-table')).toBeInTheDocument();
  });

  it('renders table column headers', () => {
    render(<AllAssets />);
    expect(screen.getByText('Asset ID')).toBeInTheDocument();
    expect(screen.getByText('Network Identity')).toBeInTheDocument();
    expect(screen.getByText('Category')).toBeInTheDocument();
    expect(screen.getByText('Operational Status')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
  });

  it('renders the search input', () => {
    render(<AllAssets />);
    expect(screen.getByPlaceholderText('Search assets...')).toBeInTheDocument();
  });

  it('renders the filter button', () => {
    render(<AllAssets />);
    expect(screen.getByText('Filter')).toBeInTheDocument();
  });

  it('renders the Add Assets button', () => {
    render(<AllAssets />);
    expect(screen.getByText('Add Assets')).toBeInTheDocument();
  });

  it('renders the Download Agent button', () => {
    render(<AllAssets />);
    expect(screen.getByText('Download Agent')).toBeInTheDocument();
  });

  it('renders the Upload File button', () => {
    render(<AllAssets />);
    expect(screen.getByText('Upload File')).toBeInTheDocument();
  });

  it('search input is present and can be focused', async () => {
    const user = userEvent.setup();
    render(<AllAssets />);
    const searchInput = screen.getByPlaceholderText('Search assets...');
    await user.click(searchInput);
    expect(searchInput).toHaveFocus();
  });

  it('opens filter modal when filter button is clicked', async () => {
    const user = userEvent.setup();
    render(<AllAssets />);
    const filterBtn = screen.getByText('Filter');
    await user.click(filterBtn);
    await waitFor(() => {
      expect(screen.getByText('Filter Assets')).toBeInTheDocument();
    });
  });
});
