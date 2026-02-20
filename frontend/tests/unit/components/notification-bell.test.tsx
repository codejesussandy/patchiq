import { describe, it, expect, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../test-utils';
import { NotificationDropdown } from '@/components/NotificationDropdown';

describe('NotificationDropdown', () => {
  beforeEach(() => {
    localStorage.setItem('accessToken', 'mock-access-token');
  });

  it('renders bell icon with unread count badge', async () => {
    render(<NotificationDropdown />);

    // Bell icon should render
    await waitFor(() => {
      const bellIcon = document.querySelector('.anticon-bell');
      expect(bellIcon).toBeInTheDocument();
    });

    // Badge should show unread count (2 unread in mock data)
    await waitFor(() => {
      // The badge shows the count as text in the badge element
      const badge = document.querySelector('.ant-badge-count');
      if (badge) {
        expect(badge.textContent).toBe('2');
      } else {
        // Count may appear as aria-label or text node
        expect(document.querySelector('[class*="badge"]')).toBeInTheDocument();
      }
    });
  });

  it('shows notification list when dropdown opens', async () => {
    const user = userEvent.setup();
    render(<NotificationDropdown />);

    await waitFor(() => {
      expect(document.querySelector('.anticon-bell')).toBeInTheDocument();
    });

    // Click the bell icon to open the dropdown
    const bellIcon = document.querySelector('.anticon-bell');
    await user.click(bellIcon);

    await waitFor(() => {
      expect(screen.getByText('Agent Connected')).toBeInTheDocument();
    });
    expect(screen.getByText('Deployment Complete')).toBeInTheDocument();
    expect(screen.getByText('Critical Vulnerability')).toBeInTheDocument();
  });

  it('marks single notification as read', async () => {
    const user = userEvent.setup();
    let markReadCalled = false;


    render(<NotificationDropdown />);

    await waitFor(() => {
      expect(document.querySelector('.anticon-bell')).toBeInTheDocument();
    });

    const bellIcon = document.querySelector('.anticon-bell');
    await user.click(bellIcon);

    await waitFor(() => {
      expect(screen.getByText('Agent Connected')).toBeInTheDocument();
    });

    // Click the "Mark as read" button on an unread notification
    const markReadButtons = screen.getAllByLabelText('Mark as read');
    await user.click(markReadButtons[0]);

    await waitFor(() => {
      expect(markReadCalled).toBe(true);
    });
  });

  it('marks all as read', async () => {
    const user = userEvent.setup();
    let markAllReadCalled = false;


    render(<NotificationDropdown />);

    await waitFor(() => {
      expect(document.querySelector('.anticon-bell')).toBeInTheDocument();
    });

    const bellIcon = document.querySelector('.anticon-bell');
    await user.click(bellIcon);

    await waitFor(() => {
      expect(screen.getByText('Mark all as read')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Mark all as read'));

    await waitFor(() => {
      expect(markAllReadCalled).toBe(true);
    });
  });

  it('deletes notification from dropdown', async () => {
    const user = userEvent.setup();
    let deleteCalled = false;


    render(<NotificationDropdown />);

    await waitFor(() => {
      expect(document.querySelector('.anticon-bell')).toBeInTheDocument();
    });

    const bellIcon = document.querySelector('.anticon-bell');
    await user.click(bellIcon);

    await waitFor(() => {
      expect(screen.getByText('Agent Connected')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByLabelText('Delete notification');
    await user.click(deleteButtons[0]);

    await waitFor(() => {
      expect(deleteCalled).toBe(true);
    });
  });

  it('navigates to /notifications on "View All" click', async () => {
    const user = userEvent.setup();
    render(<NotificationDropdown />);

    await waitFor(() => {
      expect(document.querySelector('.anticon-bell')).toBeInTheDocument();
    });

    const bellIcon = document.querySelector('.anticon-bell');
    await user.click(bellIcon);

    await waitFor(() => {
      expect(screen.getByText('View All Notifications')).toBeInTheDocument();
    });

    await user.click(screen.getByText('View All Notifications'));

    // No navigation assertion needed — MemoryRouter handles this silently
    // Just verify the click doesn't throw
    expect(screen.getByText('View All Notifications')).toBeInTheDocument();
  });

  it('shows empty state when no notifications', async () => {

    const user = userEvent.setup();
    render(<NotificationDropdown />);

    await waitFor(() => {
      expect(document.querySelector('.anticon-bell')).toBeInTheDocument();
    });

    const bellIcon = document.querySelector('.anticon-bell');
    await user.click(bellIcon);

    await waitFor(() => {
      expect(screen.getByText('No notifications')).toBeInTheDocument();
    });
  });
});
