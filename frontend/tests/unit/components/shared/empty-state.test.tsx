import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchOutlined } from '@ant-design/icons';
import { render } from '../../test-utils';
import { EmptyState, NoDataEmptyState, NoSearchResultsEmptyState } from '@/components/shared/EmptyState';

describe('EmptyState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders title', () => {
    render(<EmptyState title="No items found" />);
    expect(screen.getByText('No items found')).toBeInTheDocument();
  });

  it('renders description when provided', () => {
    render(
      <EmptyState title="No items" description="Try adding some items to get started" />,
    );
    expect(screen.getByText('Try adding some items to get started')).toBeInTheDocument();
  });

  it('does not render description when not provided', () => {
    render(<EmptyState title="No items" />);
    expect(screen.queryByText('Try adding')).not.toBeInTheDocument();
  });

  it('renders icon when showImage is false and icon is provided', () => {
    const { container } = render(
      <EmptyState
        title="No results"
        icon={<SearchOutlined data-testid="search-icon" />}
        showImage={false}
      />,
    );
    expect(screen.getByTestId('search-icon')).toBeInTheDocument();
  });

  it('renders action button when actions are provided', () => {
    const onClick = vi.fn();
    render(
      <EmptyState
        title="No items"
        actions={[{ label: 'Create New', onClick }]}
      />,
    );
    expect(screen.getByText('Create New')).toBeInTheDocument();
  });

  it('calls action onClick when action button is clicked', async () => {
    const onClick = vi.fn();
    render(
      <EmptyState
        title="No items"
        actions={[{ label: 'Create New', onClick }]}
      />,
    );
    await userEvent.click(screen.getByText('Create New'));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('renders multiple action buttons', () => {
    render(
      <EmptyState
        title="No items"
        actions={[
          { label: 'Create', onClick: vi.fn() },
          { label: 'Import', onClick: vi.fn() },
        ]}
      />,
    );
    expect(screen.getByText('Create')).toBeInTheDocument();
    expect(screen.getByText('Import')).toBeInTheDocument();
  });

  it('renders default Empty image when showImage is true', () => {
    const { container } = render(<EmptyState title="No data" showImage />);
    expect(container.querySelector('.ant-empty')).toBeInTheDocument();
  });
});

describe('NoDataEmptyState', () => {
  it('renders with default title and description', () => {
    render(<NoDataEmptyState />);
    expect(screen.getByText('No Data Available')).toBeInTheDocument();
    expect(screen.getByText('Get started by creating your first item')).toBeInTheDocument();
  });

  it('renders Create New button when onCreate is provided', () => {
    render(<NoDataEmptyState onCreate={vi.fn()} />);
    expect(screen.getByText('Create New')).toBeInTheDocument();
  });
});

describe('NoSearchResultsEmptyState', () => {
  it('renders with default title and description', () => {
    render(<NoSearchResultsEmptyState />);
    expect(screen.getByText('No Results Found')).toBeInTheDocument();
    expect(screen.getByText('Try adjusting your search criteria or filters')).toBeInTheDocument();
  });

  it('renders Clear Filters button when onClear is provided', () => {
    render(<NoSearchResultsEmptyState onClear={vi.fn()} />);
    expect(screen.getByText('Clear Filters')).toBeInTheDocument();
  });
});
