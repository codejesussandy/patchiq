import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmModal } from '../ConfirmModal';

describe('ConfirmModal', () => {
  const defaultProps = {
    title: 'Confirm Action',
    description: 'Are you sure you want to proceed?',
    open: true,
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  };

  it('renders with title and description', () => {
    render(<ConfirmModal {...defaultProps} />);

    expect(screen.getByText('Confirm Action')).toBeInTheDocument();
    expect(screen.getByText('Are you sure you want to proceed?')).toBeInTheDocument();
  });

  it('renders with custom button text', () => {
    render(
      <ConfirmModal
        {...defaultProps}
        confirmText="Yes, Delete"
        cancelText="No, Keep"
      />
    );

    expect(screen.getByText('Yes, Delete')).toBeInTheDocument();
    expect(screen.getByText('No, Keep')).toBeInTheDocument();
  });

  it('calls onConfirm when confirm button is clicked', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();

    render(<ConfirmModal {...defaultProps} onConfirm={onConfirm} />);

    const confirmButton = screen.getByText('Confirm');
    await user.click(confirmButton);

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();

    render(<ConfirmModal {...defaultProps} onCancel={onCancel} />);

    const cancelButton = screen.getByText('Cancel');
    await user.click(cancelButton);

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('shows loading state on confirm button', () => {
    render(<ConfirmModal {...defaultProps} loading={true} />);

    const confirmButton = screen.getByText('Confirm').closest('button');
    expect(confirmButton).toHaveClass('ant-btn-loading');
  });

  it('renders danger variant when danger prop is true', () => {
    render(<ConfirmModal {...defaultProps} danger={true} />);

    const confirmButton = screen.getByText('Confirm').closest('button');
    expect(confirmButton).toHaveClass('ant-btn-dangerous');
  });

  it('does not render when open is false', () => {
    const { container } = render(<ConfirmModal {...defaultProps} open={false} />);

    // Modal should not be visible in DOM when closed
    const modal = container.querySelector('.ant-modal');
    expect(modal).toBeNull();
  });

  it('renders description as React node', () => {
    const description = (
      <div>
        <p>First paragraph</p>
        <p>Second paragraph</p>
      </div>
    );

    render(<ConfirmModal {...defaultProps} description={description} />);

    expect(screen.getByText('First paragraph')).toBeInTheDocument();
    expect(screen.getByText('Second paragraph')).toBeInTheDocument();
  });

  it('handles async onConfirm callback', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn().mockResolvedValue(undefined);

    render(<ConfirmModal {...defaultProps} onConfirm={onConfirm} />);

    const confirmButton = screen.getByText('Confirm');
    await user.click(confirmButton);

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
