import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../test-utils';
import { ConfirmModal } from '../../components/shared/ConfirmModal';
import { FormModal } from '../../components/shared/FormModal';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { FilterDrawer } from '../../components/shared/FilterDrawer';
import { BulkActionBar } from '../../components/shared/BulkActionBar';

// ---------------------------------------------------------------------------
// ConfirmModal
// ---------------------------------------------------------------------------
describe('ConfirmModal', () => {
  const defaultProps = {
    title: 'Delete Item',
    description: 'Are you sure you want to delete this item?',
    open: true,
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  };

  it('renders title and description when open', () => {
    render(<ConfirmModal {...defaultProps} />);
    expect(screen.getByText('Delete Item')).toBeInTheDocument();
    expect(screen.getByText('Are you sure you want to delete this item?')).toBeInTheDocument();
  });

  it('calls onConfirm when confirm button clicked', async () => {
    const onConfirm = vi.fn();
    render(<ConfirmModal {...defaultProps} onConfirm={onConfirm} />);
    await userEvent.click(screen.getByTestId('confirm-modal-confirm'));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('calls onCancel when cancel button clicked', async () => {
    const onCancel = vi.fn();
    render(<ConfirmModal {...defaultProps} onCancel={onCancel} />);
    await userEvent.click(screen.getByTestId('confirm-modal-cancel'));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('shows custom confirmText and cancelText', () => {
    render(<ConfirmModal {...defaultProps} confirmText="Yes, delete" cancelText="No, keep" />);
    expect(screen.getByText('Yes, delete')).toBeInTheDocument();
    expect(screen.getByText('No, keep')).toBeInTheDocument();
  });

  it('confirm button is disabled when loading', () => {
    render(<ConfirmModal {...defaultProps} loading />);
    expect(screen.getByTestId('confirm-modal-confirm')).toBeDisabled();
  });

  it('confirm button shows loading state when loading', () => {
    render(<ConfirmModal {...defaultProps} loading />);
    const btn = screen.getByTestId('confirm-modal-confirm');
    expect(btn.querySelector('.ant-btn-loading-icon')).toBeInTheDocument();
  });

  it('does not render when open is false', () => {
    render(<ConfirmModal {...defaultProps} open={false} />);
    expect(screen.queryByText('Delete Item')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// FormModal
// ---------------------------------------------------------------------------
describe('FormModal', () => {
  const defaultProps = {
    title: 'Create Item',
    open: true,
    onClose: vi.fn(),
    onSubmit: vi.fn(),
    children: <div>Form content here</div>,
  };

  it('renders title and children when open', () => {
    render(<FormModal {...defaultProps} />);
    expect(screen.getByText('Create Item')).toBeInTheDocument();
    expect(screen.getByText('Form content here')).toBeInTheDocument();
  });

  it('calls onClose when cancel button clicked', async () => {
    const onClose = vi.fn();
    render(<FormModal {...defaultProps} onClose={onClose} />);
    await userEvent.click(screen.getByTestId('form-modal-cancel'));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('shows custom okText', () => {
    render(<FormModal {...defaultProps} okText="Save" />);
    expect(screen.getByText('Save')).toBeInTheDocument();
  });

  it('submit button disabled when loading', () => {
    render(<FormModal {...defaultProps} loading />);
    expect(screen.getByTestId('form-modal-submit')).toBeDisabled();
  });

  it('does not render when open is false', () => {
    render(<FormModal {...defaultProps} open={false} />);
    expect(screen.queryByText('Create Item')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// StatusBadge
// ---------------------------------------------------------------------------
describe('StatusBadge', () => {
  it('renders status text with default formatting', () => {
    render(<StatusBadge status="VERIFIED" />);
    expect(screen.getByText('Verified')).toBeInTheDocument();
  });

  it('renders custom text when provided', () => {
    render(<StatusBadge status="VERIFIED" text="All Good" />);
    expect(screen.getByText('All Good')).toBeInTheDocument();
  });

  it('renders correct badge status for VERIFIED (success)', () => {
    const { container } = render(<StatusBadge status="VERIFIED" />);
    expect(container.querySelector('.ant-badge-status-success')).toBeInTheDocument();
  });

  it('renders correct badge status for FAILED (error)', () => {
    const { container } = render(<StatusBadge status="FAILED" />);
    expect(container.querySelector('.ant-badge-status-error')).toBeInTheDocument();
  });

  it('renders correct badge status for PENDING (processing)', () => {
    const { container } = render(<StatusBadge status="PENDING" />);
    expect(container.querySelector('.ant-badge-status-processing')).toBeInTheDocument();
  });

  it('renders default status for unknown status', () => {
    const { container } = render(<StatusBadge status="UNKNOWN_STATUS" />);
    expect(container.querySelector('.ant-badge-status-default')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// FilterDrawer
// ---------------------------------------------------------------------------
describe('FilterDrawer', () => {
  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    onApply: vi.fn(),
    onReset: vi.fn(),
    children: <div>Filter options</div>,
  };

  it('renders title and children when open', () => {
    render(<FilterDrawer {...defaultProps} />);
    expect(screen.getByText('Filters')).toBeInTheDocument();
    expect(screen.getByText('Filter options')).toBeInTheDocument();
  });

  it('shows active filter count badge when activeCount > 0', () => {
    render(<FilterDrawer {...defaultProps} activeCount={3} />);
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('calls onClose when Cancel clicked', async () => {
    const onClose = vi.fn();
    render(<FilterDrawer {...defaultProps} onClose={onClose} />);
    await userEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onReset when Reset clicked', async () => {
    const onReset = vi.fn();
    render(<FilterDrawer {...defaultProps} onReset={onReset} />);
    await userEvent.click(screen.getByText('Reset'));
    expect(onReset).toHaveBeenCalledOnce();
  });

  it('calls onApply when Apply clicked', async () => {
    const onApply = vi.fn();
    render(<FilterDrawer {...defaultProps} onApply={onApply} />);
    await userEvent.click(screen.getByText('Apply'));
    expect(onApply).toHaveBeenCalledOnce();
  });

  it('does not render content when open is false', () => {
    render(<FilterDrawer {...defaultProps} open={false} />);
    expect(screen.queryByText('Filter options')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// BulkActionBar
// ---------------------------------------------------------------------------
describe('BulkActionBar', () => {
  it('renders nothing when selectedCount is 0', () => {
    const { container } = render(
      <BulkActionBar selectedCount={0} onClear={vi.fn()}>
        <button>Action</button>
      </BulkActionBar>,
    );
    expect(screen.queryByText('5 selected')).not.toBeInTheDocument();
    expect(screen.queryByText('Action')).not.toBeInTheDocument();
  });

  it('shows selected count and children when selectedCount > 0', () => {
    render(
      <BulkActionBar selectedCount={5} onClear={vi.fn()}>
        <button>Deploy</button>
      </BulkActionBar>,
    );
    expect(screen.getByText('5 selected')).toBeInTheDocument();
    expect(screen.getByText('Deploy')).toBeInTheDocument();
  });

  it('calls onClear when Clear Selection clicked', async () => {
    const onClear = vi.fn();
    render(
      <BulkActionBar selectedCount={3} onClear={onClear}>
        <button>Action</button>
      </BulkActionBar>,
    );
    await userEvent.click(screen.getByText('Clear Selection'));
    expect(onClear).toHaveBeenCalledOnce();
  });
});
