import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../../test-utils';
import { ConfirmModal } from '@/components/shared/ConfirmModal';

describe('ConfirmModal', () => {
  const defaultProps = {
    title: 'Delete Item',
    description: 'Are you sure you want to delete this item?',
    open: true,
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders title when open', () => {
    render(<ConfirmModal {...defaultProps} />);
    expect(screen.getByText('Delete Item')).toBeInTheDocument();
  });

  it('renders description text', () => {
    render(<ConfirmModal {...defaultProps} />);
    expect(screen.getByText('Are you sure you want to delete this item?')).toBeInTheDocument();
  });

  it('renders description as ReactNode', () => {
    render(
      <ConfirmModal
        {...defaultProps}
        description={<span data-testid="custom-desc">Custom content</span>}
      />,
    );
    expect(screen.getByTestId('custom-desc')).toBeInTheDocument();
  });

  it('renders confirm button with default text', () => {
    render(<ConfirmModal {...defaultProps} />);
    expect(screen.getByTestId('confirm-modal-confirm')).toHaveTextContent('Confirm');
  });

  it('renders cancel button with default text', () => {
    render(<ConfirmModal {...defaultProps} />);
    expect(screen.getByTestId('confirm-modal-cancel')).toHaveTextContent('Cancel');
  });

  it('renders custom confirmText and cancelText', () => {
    render(<ConfirmModal {...defaultProps} confirmText="Yes, delete" cancelText="No, keep" />);
    expect(screen.getByText('Yes, delete')).toBeInTheDocument();
    expect(screen.getByText('No, keep')).toBeInTheDocument();
  });

  it('calls onConfirm when confirm button is clicked', async () => {
    const onConfirm = vi.fn();
    render(<ConfirmModal {...defaultProps} onConfirm={onConfirm} />);
    await userEvent.click(screen.getByTestId('confirm-modal-confirm'));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('calls onCancel when cancel button is clicked', async () => {
    const onCancel = vi.fn();
    render(<ConfirmModal {...defaultProps} onCancel={onCancel} />);
    await userEvent.click(screen.getByTestId('confirm-modal-cancel'));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('disables confirm button when loading', () => {
    render(<ConfirmModal {...defaultProps} loading />);
    expect(screen.getByTestId('confirm-modal-confirm')).toBeDisabled();
  });

  it('shows loading spinner on confirm button when loading', () => {
    render(<ConfirmModal {...defaultProps} loading />);
    const btn = screen.getByTestId('confirm-modal-confirm');
    expect(btn.querySelector('.ant-btn-loading-icon')).toBeInTheDocument();
  });

  it('applies danger styling when danger is true', () => {
    render(<ConfirmModal {...defaultProps} danger />);
    const btn = screen.getByTestId('confirm-modal-confirm');
    expect(btn.classList.toString()).toContain('danger');
  });

  it('does not render when open is false', () => {
    render(<ConfirmModal {...defaultProps} open={false} />);
    expect(screen.queryByText('Delete Item')).not.toBeInTheDocument();
  });
});
