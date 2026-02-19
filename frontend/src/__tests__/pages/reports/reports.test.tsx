import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../../test-utils';
import { Reports } from '../../../pages/Reports';
import { server } from '../../msw/server';
import { http, HttpResponse } from 'msw';

// Mock downloadBlob to avoid errors in jsdom
vi.mock('../../../services/reports.service', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    downloadBlob: vi.fn(),
  };
});

describe('Reports Page', () => {
  beforeEach(() => {
    localStorage.setItem('accessToken', 'mock-access-token');
  });

  it('renders reports table with data from API', async () => {
    render(<Reports />);

    await waitFor(() => {
      expect(screen.getByText('Monthly Patch Report')).toBeInTheDocument();
    });
    expect(screen.getByText('Weekly Vuln Scan')).toBeInTheDocument();
  });

  it('shows report status tags', async () => {
    render(<Reports />);

    await waitFor(() => {
      expect(screen.getByText('Monthly Patch Report')).toBeInTheDocument();
    });

    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('Processing')).toBeInTheDocument();
  });

  it('opens create report wizard', async () => {
    const user = userEvent.setup();
    render(<Reports />);

    await waitFor(() => {
      expect(screen.getByText('Monthly Patch Report')).toBeInTheDocument();
    });

    const createButton = screen.getByRole('button', { name: /create/i });
    await user.click(createButton);

    await waitFor(() => {
      // The wizard modal should open — look for a modal or wizard step content
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  it('opens report details drawer when clicking name', async () => {
    const user = userEvent.setup();
    render(<Reports />);

    await waitFor(() => {
      expect(screen.getByText('Monthly Patch Report')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Monthly Patch Report'));

    await waitFor(() => {
      expect(screen.getByText('Report Details')).toBeInTheDocument();
    });
  });

  it('deletes report with confirmation', async () => {
    const user = userEvent.setup();
    let deleteWasCalled = false;

    server.use(
      http.delete('*/reports/:id', () => {
        deleteWasCalled = true;
        return HttpResponse.json({ success: true, data: null });
      })
    );

    render(<Reports />);

    await waitFor(() => {
      expect(screen.getByText('Monthly Patch Report')).toBeInTheDocument();
    });

    // Click delete button (danger button in actions column for first row)
    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    await user.click(deleteButtons[0]);

    // Popconfirm should appear — click Yes
    await waitFor(() => {
      expect(screen.getByText('Yes')).toBeInTheDocument();
    });
    await user.click(screen.getByText('Yes'));

    await waitFor(() => {
      expect(deleteWasCalled).toBe(true);
    });
  });

  it('exports reports to CSV', async () => {
    const user = userEvent.setup();
    const { downloadBlob } = await import('../../../services/reports.service');

    render(<Reports />);

    await waitFor(() => {
      expect(screen.getByText('Monthly Patch Report')).toBeInTheDocument();
    });

    const exportButton = screen.getByRole('button', { name: /export/i });
    await user.click(exportButton);

    await waitFor(() => {
      expect(downloadBlob).toHaveBeenCalled();
    });
  });

  it('filters reports by search text', async () => {
    const user = userEvent.setup();
    render(<Reports />);

    await waitFor(() => {
      expect(screen.getByText('Monthly Patch Report')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search by name/i);
    await user.type(searchInput, 'Monthly');

    await waitFor(() => {
      expect(screen.getByText('Monthly Patch Report')).toBeInTheDocument();
    });
  });

  it('shows error state when API fails', async () => {
    server.use(
      http.get('*/reports', () => {
        return HttpResponse.json({ error: 'Server error' }, { status: 500 });
      })
    );

    render(<Reports />);

    // Data should not appear when API fails; table should be empty or show error
    await waitFor(() => {
      expect(screen.queryByText('Monthly Patch Report')).not.toBeInTheDocument();
    });
  });
});
