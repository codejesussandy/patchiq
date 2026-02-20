import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../../test-utils';
import { BulkActionBar } from '@/components/shared/BulkActionBar';

describe('BulkActionBar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when selectedCount is 0', () => {
    render(
      <BulkActionBar selectedCount={0} onClear={vi.fn()}>
        <button>Action</button>
      </BulkActionBar>,
    );
    expect(screen.queryByText('0 selected')).not.toBeInTheDocument();
    expect(screen.queryByText('Action')).not.toBeInTheDocument();
    expect(screen.queryByText('Clear Selection')).not.toBeInTheDocument();
  });

  it('renders selected count when selectedCount is greater than 0', () => {
    render(
      <BulkActionBar selectedCount={5} onClear={vi.fn()}>
        <button>Deploy</button>
      </BulkActionBar>,
    );
    expect(screen.getByText('5 selected')).toBeInTheDocument();
  });

  it('renders action buttons passed as children', () => {
    render(
      <BulkActionBar selectedCount={3} onClear={vi.fn()}>
        <button>Deploy</button>
        <button>Delete</button>
      </BulkActionBar>,
    );
    expect(screen.getByText('Deploy')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });

  it('renders Clear Selection button', () => {
    render(
      <BulkActionBar selectedCount={2} onClear={vi.fn()}>
        <button>Action</button>
      </BulkActionBar>,
    );
    expect(screen.getByText('Clear Selection')).toBeInTheDocument();
  });

  it('calls onClear when Clear Selection is clicked', async () => {
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
