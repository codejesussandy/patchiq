import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../test-utils';
import { Notifications } from '@/pages/Notifications';

vi.mock('@/hooks/useNotifications', () => ({
  useNotificationHistory: vi.fn(() => ({
    data: {
      data: [
        { id: '1', type: 'info', category: 'system', title: 'System Update', message: 'Platform updated to v2.1', read: false, createdAt: '2024-06-15T10:00:00Z' },
        { id: '2', type: 'success', category: 'deployment', title: 'Deployment Complete', message: 'Patch KB123 deployed', read: true, createdAt: '2024-06-14T08:00:00Z' },
        { id: '3', type: 'warning', category: 'vulnerability', title: 'New CVE Found', message: 'CVE-2024-0001 detected', read: false, createdAt: '2024-06-13T06:00:00Z' },
      ],
      total: 3,
    },
    isLoading: false,
    refetch: vi.fn(),
  })),
  useMarkAsRead: vi.fn(() => ({ mutateAsync: vi.fn() })),
  useDeleteNotification: vi.fn(() => ({ mutateAsync: vi.fn() })),
  useBulkMarkAsRead: vi.fn(() => ({ mutateAsync: vi.fn() })),
  useBulkDeleteNotifications: vi.fn(() => ({ mutateAsync: vi.fn() })),
}));

describe('Notifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the page title', () => {
    render(<Notifications />);
    expect(screen.getByText('Notification History')).toBeInTheDocument();
  });

  it('renders search input', () => {
    render(<Notifications />);
    expect(screen.getByPlaceholderText(/search title or message/i)).toBeInTheDocument();
  });

  it('renders Refresh button', () => {
    render(<Notifications />);
    expect(screen.getByText('Refresh')).toBeInTheDocument();
  });

  it('renders notification data in table', () => {
    render(<Notifications />);
    expect(screen.getByText('System Update')).toBeInTheDocument();
    expect(screen.getByText('Deployment Complete')).toBeInTheDocument();
    expect(screen.getByText('New CVE Found')).toBeInTheDocument();
  });

  it('renders the notification table', () => {
    render(<Notifications />);
    expect(screen.getByText('System Update')).toBeInTheDocument();
  });
});
