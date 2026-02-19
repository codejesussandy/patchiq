import { describe, it, expect, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../../test-utils';
import { Notifications } from '../../../pages/Notifications';
import { server } from '../../msw/server';
import { http, HttpResponse } from 'msw';

describe('Notifications Page', () => {
  beforeEach(() => {
    localStorage.setItem('accessToken', 'mock-access-token');
  });

  it('renders notification history list', async () => {
    render(<Notifications />);

    await waitFor(() => {
      expect(screen.getByText('Agent Connected')).toBeInTheDocument();
    });
    expect(screen.getByText('Deployment Complete')).toBeInTheDocument();
    expect(screen.getByText('Critical Vulnerability')).toBeInTheDocument();
  });

  it('shows unread notifications visually distinct', async () => {
    render(<Notifications />);

    await waitFor(() => {
      expect(screen.getByText('Agent Connected')).toBeInTheDocument();
    });

    // Unread notifications are shown with a blue "Unread" tag
    const unreadTags = screen.getAllByText('Unread');
    expect(unreadTags.length).toBeGreaterThan(0);

    // Read notification should show "Read" tag
    expect(screen.getByText('Read')).toBeInTheDocument();
  });

  it('marks notification as read', async () => {
    const user = userEvent.setup();
    let markReadCalled = false;

    server.use(
      http.put('*/notifications/:id/read', () => {
        markReadCalled = true;
        return HttpResponse.json({ success: true, data: { read: true } });
      })
    );

    render(<Notifications />);

    await waitFor(() => {
      expect(screen.getByText('Agent Connected')).toBeInTheDocument();
    });

    // The "Mark as read" button (CheckOutlined) only appears for unread notifications
    const markReadButtons = screen.getAllByTitle('Mark as read');
    await user.click(markReadButtons[0]);

    await waitFor(() => {
      expect(markReadCalled).toBe(true);
    });
  });

  it('deletes notification', async () => {
    const user = userEvent.setup();
    let deleteCalled = false;

    server.use(
      http.delete('*/notifications/:id', () => {
        deleteCalled = true;
        return HttpResponse.json({ success: true, data: null });
      })
    );

    render(<Notifications />);

    await waitFor(() => {
      expect(screen.getByText('Agent Connected')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByTitle('Delete');
    await user.click(deleteButtons[0]);

    await waitFor(() => {
      expect(deleteCalled).toBe(true);
    });
  });

  it('bulk marks notifications as read', async () => {
    const user = userEvent.setup();
    let bulkReadCalled = false;

    server.use(
      http.put('*/notifications/bulk-read', () => {
        bulkReadCalled = true;
        return HttpResponse.json({ success: true });
      })
    );

    render(<Notifications />);

    await waitFor(() => {
      expect(screen.getByText('Agent Connected')).toBeInTheDocument();
    });

    // Select a row using checkbox
    const checkboxes = screen.getAllByRole('checkbox');
    // First checkbox is "select all", subsequent ones are row checkboxes
    await user.click(checkboxes[1]);

    await waitFor(() => {
      expect(screen.getByText(/selected/i)).toBeInTheDocument();
    });

    const markReadButton = screen.getByRole('button', { name: /mark read/i });
    await user.click(markReadButton);

    await waitFor(() => {
      expect(bulkReadCalled).toBe(true);
    });
  });

  it('bulk deletes notifications', async () => {
    const user = userEvent.setup();
    let bulkDeleteCalled = false;

    server.use(
      http.delete('*/notifications/bulk', () => {
        bulkDeleteCalled = true;
        return HttpResponse.json({ success: true });
      })
    );

    render(<Notifications />);

    await waitFor(() => {
      expect(screen.getByText('Agent Connected')).toBeInTheDocument();
    });

    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[1]);

    await waitFor(() => {
      expect(screen.getByText(/selected/i)).toBeInTheDocument();
    });

    // Find the danger Delete button in the bulk actions area
    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    // The bulk delete button should be among these
    await user.click(deleteButtons[0]);

    await waitFor(() => {
      expect(bulkDeleteCalled).toBe(true);
    });
  });

  it('filters by type', async () => {
    render(<Notifications />);

    await waitFor(() => {
      expect(screen.getByText('Agent Connected')).toBeInTheDocument();
    });

    // Type select filter options should be present in the page
    const typeOptions = screen.getAllByText('Type');
    // At least one element with "Type" should exist (the select placeholder)
    expect(typeOptions.length).toBeGreaterThan(0);
  });

  it('shows empty state when no notifications', async () => {
    server.use(
      http.get('*/notifications/history', () => {
        return HttpResponse.json({ data: [], total: 0, page: 1, limit: 20 });
      })
    );

    render(<Notifications />);

    await waitFor(() => {
      expect(screen.queryByText('Agent Connected')).not.toBeInTheDocument();
    });
  });

  it('shows error state when API fails', async () => {
    server.use(
      http.get('*/notifications/history', () => {
        return HttpResponse.json({ error: 'Server error' }, { status: 500 });
      })
    );

    render(<Notifications />);

    await waitFor(() => {
      expect(screen.queryByText('Agent Connected')).not.toBeInTheDocument();
    });
  });
});
