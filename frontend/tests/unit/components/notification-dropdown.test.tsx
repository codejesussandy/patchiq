import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../test-utils';
import { NotificationDropdown } from '@/components/NotificationDropdown';

vi.mock('@/hooks/useNotificationSSE', () => ({
  useNotificationSSE: vi.fn(),
}));

const mockNotifications = [
  {
    id: '1',
    title: 'Agent Connected',
    message: 'Agent node-1 has connected',
    type: 'success' as const,
    category: 'agent' as const,
    read: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: '2',
    title: 'Deployment Complete',
    message: 'Deployment to servers finished',
    type: 'info' as const,
    category: 'deployment' as const,
    read: true,
    createdAt: new Date().toISOString(),
  },
];

vi.mock('@/services/notification.service', () => ({
  notificationService: {
    getUnreadCount: vi.fn().mockResolvedValue(1),
    getNotifications: vi.fn().mockResolvedValue([
      {
        id: '1',
        title: 'Agent Connected',
        message: 'Agent node-1 has connected',
        type: 'success',
        category: 'agent',
        read: false,
        createdAt: new Date().toISOString(),
      },
      {
        id: '2',
        title: 'Deployment Complete',
        message: 'Deployment to servers finished',
        type: 'info',
        category: 'deployment',
        read: true,
        createdAt: new Date().toISOString(),
      },
    ]),
    markAsRead: vi.fn().mockResolvedValue(undefined),
    markAllAsRead: vi.fn().mockResolvedValue(undefined),
    deleteNotification: vi.fn().mockResolvedValue(undefined),
  },
  NotificationType: {},
}));

describe('NotificationDropdown', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('accessToken', 'mock-token');
  });

  it('renders the bell icon', () => {
    const { container } = render(<NotificationDropdown />);
    expect(container.querySelector('.anticon-bell')).toBeInTheDocument();
  });

  it('renders unread count badge', async () => {
    const { container } = render(<NotificationDropdown />);
    await waitFor(() => {
      const badge = container.querySelector('.ant-badge');
      expect(badge).toBeInTheDocument();
    });
  });

  it('shows notification list when dropdown is opened', async () => {
    const user = userEvent.setup();
    const { container } = render(<NotificationDropdown />);

    const bell = container.querySelector('.anticon-bell')!;
    await user.click(bell);

    await waitFor(() => {
      expect(screen.getByText('Notifications')).toBeInTheDocument();
    });
  });

  it('shows notification titles when dropdown is opened', async () => {
    const user = userEvent.setup();
    const { container } = render(<NotificationDropdown />);

    const bell = container.querySelector('.anticon-bell')!;
    await user.click(bell);

    await waitFor(() => {
      expect(screen.getByText('Agent Connected')).toBeInTheDocument();
      expect(screen.getByText('Deployment Complete')).toBeInTheDocument();
    });
  });

  it('shows View All Notifications link', async () => {
    const user = userEvent.setup();
    const { container } = render(<NotificationDropdown />);

    const bell = container.querySelector('.anticon-bell')!;
    await user.click(bell);

    await waitFor(() => {
      expect(screen.getByText('View All Notifications')).toBeInTheDocument();
    });
  });

  it('shows Mark all as read button when there are unread notifications', async () => {
    const user = userEvent.setup();
    const { container } = render(<NotificationDropdown />);

    const bell = container.querySelector('.anticon-bell')!;
    await user.click(bell);

    await waitFor(() => {
      expect(screen.getByText('Mark all as read')).toBeInTheDocument();
    });
  });

  it('shows mark-as-read button on unread notifications', async () => {
    const user = userEvent.setup();
    const { container } = render(<NotificationDropdown />);

    const bell = container.querySelector('.anticon-bell')!;
    await user.click(bell);

    await waitFor(() => {
      expect(screen.getByText('Agent Connected')).toBeInTheDocument();
    });

    const markReadButtons = screen.getAllByLabelText('Mark as read');
    expect(markReadButtons.length).toBeGreaterThan(0);
  });

  it('shows delete buttons on notifications', async () => {
    const user = userEvent.setup();
    const { container } = render(<NotificationDropdown />);

    const bell = container.querySelector('.anticon-bell')!;
    await user.click(bell);

    await waitFor(() => {
      expect(screen.getByText('Agent Connected')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByLabelText('Delete notification');
    expect(deleteButtons.length).toBeGreaterThan(0);
  });
});
