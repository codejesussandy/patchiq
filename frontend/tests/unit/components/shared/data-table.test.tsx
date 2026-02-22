import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../../test-utils';
import { DataTable } from '@/components/shared/DataTable';

vi.mock('@/hooks/useDebouncedSearch', () => ({
  useDebouncedSearch: () => ({
    value: '',
    debouncedValue: '',
    setValue: vi.fn(),
    clear: vi.fn(),
  }),
}));

const mockColumns = [
  { title: 'Name', dataIndex: 'name', key: 'name' },
  { title: 'Status', dataIndex: 'status', key: 'status' },
];

const mockData = [
  { id: '1', name: 'Item 1', status: 'Active' },
  { id: '2', name: 'Item 2', status: 'Inactive' },
  { id: '3', name: 'Item 3', status: 'Active' },
];

describe('DataTable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders column headers', () => {
    render(<DataTable columns={mockColumns} data={mockData} />);
    expect(screen.getAllByText('Name')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Status')[0]).toBeInTheDocument();
  });

  it('renders data rows', () => {
    render(<DataTable columns={mockColumns} data={mockData} />);
    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('Item 2')).toBeInTheDocument();
    expect(screen.getByText('Item 3')).toBeInTheDocument();
  });

  it('shows loading spinner when loading is true', () => {
    const { container } = render(
      <DataTable columns={mockColumns} data={[]} loading />,
    );
    expect(container.querySelector('.ant-spin')).toBeInTheDocument();
  });

  it('shows empty state when data is empty', () => {
    render(<DataTable columns={mockColumns} data={[]} />);
    expect(screen.getByText('No data found')).toBeInTheDocument();
  });

  it('shows empty state when data is undefined', () => {
    render(<DataTable columns={mockColumns} data={undefined} />);
    expect(screen.getByText('No data found')).toBeInTheDocument();
  });

  it('renders pagination when pagination prop is provided', () => {
    const { container } = render(
      <DataTable
        columns={mockColumns}
        data={mockData}
        pagination={{ current: 1, pageSize: 10, total: 50 }}
      />,
    );
    expect(container.querySelector('.ant-pagination')).toBeInTheDocument();
  });

  it('renders search input when searchable is true', () => {
    render(
      <DataTable columns={mockColumns} data={mockData} searchable />,
    );
    expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
  });

  it('renders custom search placeholder', () => {
    render(
      <DataTable
        columns={mockColumns}
        data={mockData}
        searchable
        searchPlaceholder="Find items..."
      />,
    );
    expect(screen.getByPlaceholderText('Find items...')).toBeInTheDocument();
  });

  it('does not render search input when searchable is false', () => {
    render(<DataTable columns={mockColumns} data={mockData} />);
    expect(screen.queryByPlaceholderText('Search...')).not.toBeInTheDocument();
  });

  it('calls onSearch when typing in search input', async () => {
    const onSearch = vi.fn();
    render(
      <DataTable
        columns={mockColumns}
        data={mockData}
        searchable
        onSearch={onSearch}
      />,
    );
    const input = screen.getByPlaceholderText('Search...');
    await userEvent.type(input, 'test');
    await waitFor(() => {
      expect(onSearch).toHaveBeenCalled();
    });
  });

  it('renders row selection checkboxes when selectable is true', () => {
    const { container } = render(
      <DataTable
        columns={mockColumns}
        data={mockData}
        selectable
        selectedRowKeys={[]}
        onSelectionChange={vi.fn()}
      />,
    );
    const checkboxes = container.querySelectorAll('.ant-checkbox');
    expect(checkboxes.length).toBeGreaterThan(0);
  });

  it('renders toolbar content', () => {
    render(
      <DataTable
        columns={mockColumns}
        data={mockData}
        toolbar={<button>Add New</button>}
      />,
    );
    expect(screen.getByText('Add New')).toBeInTheDocument();
  });

  it('renders row actions column', () => {
    render(
      <DataTable
        columns={mockColumns}
        data={mockData}
        rowActions={() => <button>Edit</button>}
      />,
    );
    const editButtons = screen.getAllByText('Edit');
    expect(editButtons.length).toBeGreaterThan(0);
  });

  it('renders filterBar content', () => {
    render(
      <DataTable
        columns={mockColumns}
        data={mockData}
        filterBar={<div>Filter controls</div>}
      />,
    );
    expect(screen.getByText('Filter controls')).toBeInTheDocument();
  });

  it('hides columns with defaultHidden set to true', () => {
    const columnsWithHidden = [
      { title: 'Name', dataIndex: 'name', key: 'name' },
      { title: 'Hidden Col', dataIndex: 'hidden', key: 'hidden', defaultHidden: true },
    ];
    render(<DataTable columns={columnsWithHidden} data={mockData} />);
    expect(screen.getAllByText('Name')[0]).toBeInTheDocument();
    expect(screen.queryByText('Hidden Col')).not.toBeInTheDocument();
  });

  it('calls onRowClick when a row is clicked', async () => {
    const onRowClick = vi.fn();
    render(
      <DataTable
        columns={mockColumns}
        data={mockData}
        onRowClick={onRowClick}
      />,
    );
    await userEvent.click(screen.getByText('Item 1'));
    expect(onRowClick).toHaveBeenCalledWith(mockData[0]);
  });

  it('disables pagination when pagination is false', () => {
    const { container } = render(
      <DataTable columns={mockColumns} data={mockData} pagination={false} />,
    );
    expect(container.querySelector('.ant-pagination')).not.toBeInTheDocument();
  });
});
