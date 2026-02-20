import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../../test-utils';
import { ActionMenu } from '@/components/shared/ActionMenu';

describe('ActionMenu', () => {
  const mockItems = [
    { key: 'edit', label: 'Edit', onClick: vi.fn() },
    { key: 'duplicate', label: 'Duplicate', onClick: vi.fn() },
    { key: 'delete', label: 'Delete', danger: true, onClick: vi.fn() },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the trigger button with more icon', () => {
    render(<ActionMenu items={mockItems} />);
    expect(screen.getByLabelText('More actions')).toBeInTheDocument();
  });

  it('renders custom aria label', () => {
    render(<ActionMenu items={mockItems} ariaLabel="Row actions" />);
    expect(screen.getByLabelText('Row actions')).toBeInTheDocument();
  });

  it('shows menu items when trigger button is clicked', async () => {
    const user = userEvent.setup();
    render(<ActionMenu items={mockItems} />);

    await user.click(screen.getByLabelText('More actions'));

    await waitFor(() => {
      expect(screen.getByText('Edit')).toBeInTheDocument();
    });
    expect(screen.getByText('Duplicate')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });

  it('calls onClick handler when a menu item is clicked', async () => {
    const user = userEvent.setup();
    render(<ActionMenu items={mockItems} />);

    await user.click(screen.getByLabelText('More actions'));

    await waitFor(() => {
      expect(screen.getByText('Edit')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Edit'));
    expect(mockItems[0].onClick).toHaveBeenCalled();
  });

  it('renders danger items with danger styling', async () => {
    const user = userEvent.setup();
    render(<ActionMenu items={mockItems} />);

    await user.click(screen.getByLabelText('More actions'));

    await waitFor(() => {
      expect(screen.getByText('Delete')).toBeInTheDocument();
    });

    const deleteItem = screen.getByText('Delete').closest('.ant-dropdown-menu-item');
    expect(deleteItem?.classList.toString()).toContain('danger');
  });

  it('renders disabled items as disabled', async () => {
    const user = userEvent.setup();
    const items = [
      { key: 'action', label: 'Disabled Action', disabled: true, onClick: vi.fn() },
    ];
    render(<ActionMenu items={items} />);

    await user.click(screen.getByLabelText('More actions'));

    await waitFor(() => {
      expect(screen.getByText('Disabled Action')).toBeInTheDocument();
    });

    const menuItem = screen.getByText('Disabled Action').closest('.ant-dropdown-menu-item');
    expect(menuItem?.classList.toString()).toContain('disabled');
  });
});
