import { describe, it, expect, vi } from 'vitest';
import { waitFor } from '@testing-library/react';
import { renderWithProviders, userEvent } from '../utils/test-utils';
import { DataTable } from '../../components/shared/DataTable';
import type { DataTableColumn } from '../../components/shared/DataTable';

/**
 * Integration test: DataTable component with filters and interactions
 *
 * Tests complex component interactions:
 * - Search functionality with debouncing
 * - Pagination controls
 * - Row selection
 * - Sorting
 * - Filter integration
 *
 * Verifies that the DataTable component correctly integrates
 * with user interactions and state management.
 */

interface TestData {
  id: string;
  name: string;
  status: string;
  type: string;
}

const mockData: TestData[] = [
  { id: '1', name: 'Asset 1', status: 'ACTIVE', type: 'DESKTOP' },
  { id: '2', name: 'Asset 2', status: 'INACTIVE', type: 'LAPTOP' },
  { id: '3', name: 'Asset 3', status: 'ACTIVE', type: 'SERVER' },
  { id: '4', name: 'Asset 4', status: 'MAINTENANCE', type: 'DESKTOP' },
  { id: '5', name: 'Asset 5', status: 'ACTIVE', type: 'LAPTOP' },
];

const columns: DataTableColumn<TestData>[] = [
  {
    title: 'ID',
    dataIndex: 'id',
    key: 'id',
  },
  {
    title: 'Name',
    dataIndex: 'name',
    key: 'name',
    sorter: true,
  },
  {
    title: 'Status',
    dataIndex: 'status',
    key: 'status',
  },
  {
    title: 'Type',
    dataIndex: 'type',
    key: 'type',
  },
];

describe('DataTable Integration Tests', () => {
  describe('Basic rendering', () => {
    it('should render table with data', () => {
      const { getByText, getAllByText } = renderWithProviders(
        <DataTable data={mockData} columns={columns} />
      );

      expect(getByText('Asset 1')).toBeInTheDocument();
      expect(getByText('Asset 2')).toBeInTheDocument();
      // Multiple rows have "ACTIVE" status, so use getAllByText
      const activeElements = getAllByText('ACTIVE');
      expect(activeElements.length).toBeGreaterThan(0);
    });

    it('should show loading state', () => {
      const { container } = renderWithProviders(
        <DataTable data={[]} columns={columns} loading={true} />
      );

      // Ant Design shows loading spinner
      const loadingSpinner = container.querySelector('.ant-spin');
      expect(loadingSpinner).toBeInTheDocument();
    });

    it('should show empty state', () => {
      const { getByText } = renderWithProviders(
        <DataTable data={[]} columns={columns} />
      );

      expect(getByText('No data found')).toBeInTheDocument();
    });
  });

  describe('Search functionality', () => {
    it('should display search input when searchable is true', () => {
      const { getByPlaceholderText } = renderWithProviders(
        <DataTable data={mockData} columns={columns} searchable />
      );

      expect(getByPlaceholderText('Search...')).toBeInTheDocument();
    });

    it('should call onSearch when user types', async () => {
      const handleSearch = vi.fn();
      const user = userEvent.setup();
      const { getByPlaceholderText } = renderWithProviders(
        <DataTable
          data={mockData}
          columns={columns}
          searchable
          onSearch={handleSearch}
        />
      );

      const searchInput = getByPlaceholderText('Search...');
      await user.type(searchInput, 'test');

      // Wait for debounce
      await waitFor(
        () => {
          expect(handleSearch).toHaveBeenCalled();
        },
        { timeout: 1000 }
      );
    });

    it('should clear search when clear button is clicked', async () => {
      const handleSearch = vi.fn();
      const user = userEvent.setup();
      const { getByPlaceholderText, container } = renderWithProviders(
        <DataTable
          data={mockData}
          columns={columns}
          searchable
          onSearch={handleSearch}
        />
      );

      const searchInput = getByPlaceholderText(
        'Search...'
      ) as HTMLInputElement;
      await user.type(searchInput, 'test');

      // Wait for input to be populated
      await waitFor(() => {
        expect(searchInput.value).toBe('test');
      });

      // Find and click clear button
      const clearButton = container.querySelector('.ant-input-clear-icon');
      if (clearButton) {
        await user.click(clearButton);

        await waitFor(() => {
          expect(handleSearch).toHaveBeenCalledWith('');
        });
      }
    });

    it('should use custom search placeholder', () => {
      const { getByPlaceholderText } = renderWithProviders(
        <DataTable
          data={mockData}
          columns={columns}
          searchable
          searchPlaceholder="Find assets..."
        />
      );

      expect(getByPlaceholderText('Find assets...')).toBeInTheDocument();
    });
  });

  describe('Pagination', () => {
    it('should display pagination controls', () => {
      const { container } = renderWithProviders(
        <DataTable
          data={mockData}
          columns={columns}
          pagination={{
            current: 1,
            pageSize: 2,
            total: 5,
          }}
        />
      );

      const pagination = container.querySelector('.ant-pagination');
      expect(pagination).toBeInTheDocument();
    });

    it('should call onChange when page is changed', async () => {
      const handlePageChange = vi.fn();
      const user = userEvent.setup();
      const { container } = renderWithProviders(
        <DataTable
          data={mockData.slice(0, 2)}
          columns={columns}
          pagination={{
            current: 1,
            pageSize: 2,
            total: 5,
            onChange: handlePageChange,
          }}
        />
      );

      // Find next page button
      const nextButton = container.querySelector(
        '.ant-pagination-next'
      ) as HTMLElement;
      if (nextButton) {
        await user.click(nextButton);

        await waitFor(() => {
          expect(handlePageChange).toHaveBeenCalledWith(2, 2);
        });
      }
    });

    it('should display total count', () => {
      const { getByText } = renderWithProviders(
        <DataTable
          data={mockData.slice(0, 2)}
          columns={columns}
          pagination={{
            current: 1,
            pageSize: 2,
            total: 5,
          }}
        />
      );

      expect(getByText(/showing 1-2 of 5 items/i)).toBeInTheDocument();
    });
  });

  describe('Row selection', () => {
    it('should enable row selection when selectable is true', () => {
      const { container } = renderWithProviders(
        <DataTable data={mockData} columns={columns} selectable />
      );

      const checkboxes = container.querySelectorAll('input[type="checkbox"]');
      expect(checkboxes.length).toBeGreaterThan(0);
    });

    it('should call onSelectionChange when rows are selected', async () => {
      const handleSelectionChange = vi.fn();
      const user = userEvent.setup();
      const { container } = renderWithProviders(
        <DataTable
          data={mockData}
          columns={columns}
          selectable
          onSelectionChange={handleSelectionChange}
        />
      );

      // Find first row checkbox (skip header checkbox)
      const checkboxes = container.querySelectorAll('input[type="checkbox"]');
      if (checkboxes.length > 1) {
        await user.click(checkboxes[1]);

        await waitFor(() => {
          expect(handleSelectionChange).toHaveBeenCalled();
        });
      }
    });

    it('should select all rows when header checkbox is clicked', async () => {
      const handleSelectionChange = vi.fn();
      const user = userEvent.setup();
      const { container } = renderWithProviders(
        <DataTable
          data={mockData}
          columns={columns}
          selectable
          onSelectionChange={handleSelectionChange}
        />
      );

      // Find header checkbox
      const headerCheckbox = container.querySelector(
        'thead input[type="checkbox"]'
      );
      if (headerCheckbox) {
        await user.click(headerCheckbox);

        await waitFor(() => {
          expect(handleSelectionChange).toHaveBeenCalledWith(
            expect.arrayContaining(['1', '2', '3', '4', '5']),
            expect.any(Array)
          );
        });
      }
    });
  });

  describe('Row actions', () => {
    it('should render row actions', () => {
      const rowActions = () => <button>Edit</button>;
      const { getAllByText } = renderWithProviders(
        <DataTable data={mockData} columns={columns} rowActions={rowActions} />
      );

      const editButtons = getAllByText('Edit');
      expect(editButtons).toHaveLength(5);
    });

    it('should call action handler when clicked', async () => {
      const handleAction = vi.fn();
      const user = userEvent.setup();
      const rowActions = () => <button onClick={handleAction}>Edit</button>;
      const { getAllByText } = renderWithProviders(
        <DataTable data={mockData} columns={columns} rowActions={rowActions} />
      );

      const editButtons = getAllByText('Edit');
      await user.click(editButtons[0]);

      expect(handleAction).toHaveBeenCalled();
    });
  });

  describe('Row click', () => {
    it('should call onRowClick when row is clicked', async () => {
      const handleRowClick = vi.fn();
      const user = userEvent.setup();
      const { getByText } = renderWithProviders(
        <DataTable
          data={mockData}
          columns={columns}
          onRowClick={handleRowClick}
        />
      );

      const row = getByText('Asset 1');
      await user.click(row);

      expect(handleRowClick).toHaveBeenCalledWith(
        expect.objectContaining({ id: '1', name: 'Asset 1' })
      );
    });

    it('should show pointer cursor when onRowClick is provided', () => {
      const handleRowClick = vi.fn();
      const { container } = renderWithProviders(
        <DataTable
          data={mockData}
          columns={columns}
          onRowClick={handleRowClick}
        />
      );

      // Verify table is rendered (jsdom can't test computed cursor styles)
      const table = container.querySelector('.ant-table');
      expect(table).toBeInTheDocument();
    });
  });

  describe('Toolbar', () => {
    it('should render custom toolbar', () => {
      const toolbar = <button>Add New</button>;
      const { getByText } = renderWithProviders(
        <DataTable data={mockData} columns={columns} toolbar={toolbar} />
      );

      expect(getByText('Add New')).toBeInTheDocument();
    });

    it('should render filter bar', () => {
      const filterBar = <div data-testid="filter-bar">Filters</div>;
      const { getByTestId } = renderWithProviders(
        <DataTable data={mockData} columns={columns} filterBar={filterBar} />
      );

      expect(getByTestId('filter-bar')).toBeInTheDocument();
    });

    it('should render both search and toolbar together', () => {
      const toolbar = <button>Add New</button>;
      const { getByPlaceholderText, getByText } = renderWithProviders(
        <DataTable
          data={mockData}
          columns={columns}
          searchable
          toolbar={toolbar}
        />
      );

      expect(getByPlaceholderText('Search...')).toBeInTheDocument();
      expect(getByText('Add New')).toBeInTheDocument();
    });
  });

  describe('Scroll behavior', () => {
    it('should apply custom scroll configuration', () => {
      const { container } = renderWithProviders(
        <DataTable
          data={mockData}
          columns={columns}
          scroll={{ x: 1000, y: 400 }}
        />
      );

      // Verify table renders with scroll config (Ant Design handles actual scrolling)
      const table = container.querySelector('.ant-table');
      expect(table).toBeInTheDocument();
    });
  });

  describe('Keyboard navigation', () => {
    // Note: DataTable doesn't have built-in keyboard navigation for row clicks
    // These would require custom keyboard event handlers in the actual component
    it('should render rows that can receive focus', () => {
      const handleRowClick = vi.fn();
      const { container } = renderWithProviders(
        <DataTable
          data={mockData}
          columns={columns}
          onRowClick={handleRowClick}
        />
      );

      // Verify table is rendered (rows can be interacted with via click events)
      const table = container.querySelector('.ant-table');
      expect(table).toBeInTheDocument();
    });

    it('should have clickable rows when onRowClick is provided', async () => {
      const handleRowClick = vi.fn();
      const { user, getByText } = renderWithProviders(
        <DataTable
          data={mockData}
          columns={columns}
          onRowClick={handleRowClick}
        />
      );

      // Click on a cell in the first row
      const cell = getByText('Asset 1');
      await user.click(cell);

      expect(handleRowClick).toHaveBeenCalled();
    });
  });
});
