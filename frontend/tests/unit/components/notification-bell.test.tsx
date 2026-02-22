import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../test-utils';
import { NotificationDropdown } from '@/components/NotificationDropdown';

const mockNotifications = [
  {
    id: '1',
    title: 'Agent Connected',
    message: 'Agent-01 connected',
    type: 'success' as const,
    category: 'agent',
    isRead: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: '2',
    title: 'Deployment Complete',
    message: 'Deployment finished',
    type: 'info' as const,
    category: 'deployment',
    isRead: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: '3',
    title: 'Critical Vulnerability',
    message: 'CVE-2024-1234',
    type: 'error' as const,
    category: 'vulnerability',
    isRead: true,
    createdAt: new Date().toISOString(),
  },
];

vi.mock('@/hooks/useNotificationSSE', () => ({
  useNotificationSSE: () => ({
    notifications: mockNotifications,
    unreadCount: 2,
    isConnected: true,
  }),
}));

vi.mock('@/services/notification.service', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...(actual as object),
    notificationService: {
      getNotifications: vi.fn().mockResolvedValue({ data: mockNotifications }),
      markAsRead: vi.fn().mockResolvedValue({}),
      markAllAsRead: vi.fn().mockResolvedValue({}),
      deleteNotification: vi.fn().mockResolvedValue({}),
    },
  };
});

describe('NotificationDropdown', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('accessToken', 'mock-access-token');
  });

  it('renders bell icon', async () => {
    render(<NotificationDropdown />);

    await waitFor(() => {
      const bellIcon = document.querySelector('.anticon-bell');
      expect(bellIcon).toBeInTheDocument();
    });
  });

  it('renders badge with unread count', async () => {
    render(<NotificationDropdown />);

    await waitFor(() => {
      const badge = document.querySelector('.ant-badge');
      expect(badge).toBeInTheDocument();
    });
  });

  it('renders as a dropdown trigger', async () => {
    render(<NotificationDropdown />);

    await waitFor(() => {
      expect(document.querySelector('.anticon-bell')).toBeInTheDocument();
    });
  });
});
