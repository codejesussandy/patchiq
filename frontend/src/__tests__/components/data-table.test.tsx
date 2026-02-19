import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../test-utils';
import { DataTable } from '../../components/shared/DataTable';

const mockColumns = [
  { title: 'Name', dataIndex: 'name', key: 'name' },
  { title: 'Status', dataIndex: 'status', key: 'status' },
];

const mockData = [
  { id: '1', name: 'Item 1', status: 'Active' },
  { id: '2', name: 'Item 2', status: 'Inactive' },
];

describe('DataTable', () => {
  it('renders without errors with data', () => {
    const { container } = render(
      <DataTable columns={mockColumns} data={mockData} />,
    );
    expect(container.querySelector('.ant-table')).toBeInTheDocument();
  });

  it('renders "No data found" empty state when data is empty', () => {
    render(<DataTable columns={mockColumns} data={[]} />);
    expect(screen.getByText('No data found')).toBeInTheDocument();
  });

  it('shows loading state when loading is true', () => {
    const { container } = render(
      <DataTable columns={mockColumns} data={[]} loading />,
    );
    expect(container.querySelector('.ant-spin')).toBeInTheDocument();
  });

  it('renders search input when searchable is true', () => {
    render(
      <DataTable
        columns={mockColumns}
        data={mockData}
        searchable
        searchPlaceholder="Search items..."
      />,
    );
    expect(screen.getByPlaceholderText('Search items...')).toBeInTheDocument();
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

  it('renders toolbar content when toolbar prop provided', () => {
    render(
      <DataTable
        columns={mockColumns}
        data={mockData}
        toolbar={<button>Add New</button>}
      />,
    );
    expect(screen.getByText('Add New')).toBeInTheDocument();
  });

  it('renders filterBar content when filterBar prop provided', () => {
    render(
      <DataTable
        columns={mockColumns}
        data={mockData}
        filterBar={<button>Filter</button>}
      />,
    );
    expect(screen.getByText('Filter')).toBeInTheDocument();
  });

  it('renders without errors with undefined data', () => {
    const { container } = render(
      <DataTable columns={mockColumns} data={undefined} />,
    );
    expect(container.querySelector('.ant-table')).toBeInTheDocument();
  });

  it('renders with custom rowKey', () => {
    const { container } = render(
      <DataTable columns={mockColumns} data={mockData} rowKey="id" />,
    );
    expect(container.querySelector('.ant-table')).toBeInTheDocument();
  });

  it('does not render search input when searchable is false', () => {
    render(<DataTable columns={mockColumns} data={mockData} />);
    expect(screen.queryByPlaceholderText('Search...')).not.toBeInTheDocument();
  });

  it('renders with default search placeholder', () => {
    render(<DataTable columns={mockColumns} data={mockData} searchable />);
    expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
  });
});
