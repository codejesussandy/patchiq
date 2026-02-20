import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { render } from '../../test-utils';
import { MainLayout } from '@/components/MainLayout';

vi.mock('@/services/category.service', () => ({
  categoryService: {
    getCategories: vi.fn().mockResolvedValue([]),
    getSubCategories: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('@/services/settings.service', () => ({
  settingsService: {
    getOrganizations: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('@/hooks/useNotificationSSE', () => ({
  useNotificationSSE: vi.fn(),
}));

vi.mock('@/services/notification.service', () => ({
  notificationService: {
    getUnreadCount: vi.fn().mockResolvedValue(0),
    getNotifications: vi.fn().mockResolvedValue([]),
    markAsRead: vi.fn().mockResolvedValue(undefined),
    markAllAsRead: vi.fn().mockResolvedValue(undefined),
    deleteNotification: vi.fn().mockResolvedValue(undefined),
  },
  NotificationType: {},
}));

describe('MainLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('accessToken', 'mock-token');
  });

  it('renders the header banner', async () => {
    render(
      <MainLayout><div>Page Content</div></MainLayout>,
      { initialEntries: ['/dashboard'] },
    );
    await waitFor(() => {
      expect(screen.getByRole('banner')).toBeInTheDocument();
    });
  });

  it('renders the app name in the header', async () => {
    render(
      <MainLayout><div>Page Content</div></MainLayout>,
      { initialEntries: ['/dashboard'] },
    );
    await waitFor(() => {
      expect(screen.getByText('Patch Manager')).toBeInTheDocument();
    });
  });

  it('renders main content area', async () => {
    render(
      <MainLayout><div>Page Content</div></MainLayout>,
      { initialEntries: ['/dashboard'] },
    );
    await waitFor(() => {
      expect(screen.getByRole('main')).toBeInTheDocument();
    });
  });

  it('renders children content', async () => {
    render(
      <MainLayout><div>My Page Content</div></MainLayout>,
      { initialEntries: ['/dashboard'] },
    );
    await waitFor(() => {
      expect(screen.getByText('My Page Content')).toBeInTheDocument();
    });
  });

  it('renders user profile menu button', async () => {
    render(
      <MainLayout><div>Content</div></MainLayout>,
      { initialEntries: ['/dashboard'] },
    );
    await waitFor(() => {
      expect(screen.getByLabelText('User profile menu')).toBeInTheDocument();
    });
  });

  it('renders AI assistant toggle button', async () => {
    render(
      <MainLayout><div>Content</div></MainLayout>,
      { initialEntries: ['/dashboard'] },
    );
    await waitFor(() => {
      expect(screen.getByLabelText('Toggle AI Assistant')).toBeInTheDocument();
    });
  });

  it('renders top navigation menu items', async () => {
    render(
      <MainLayout><div>Content</div></MainLayout>,
      { initialEntries: ['/dashboard'] },
    );
    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Assets')).toBeInTheDocument();
      expect(screen.getByText('Patches')).toBeInTheDocument();
    });
  });

  // In JSDOM, Grid.useBreakpoint() returns false for all breakpoints,
  // so the layout treats it as mobile/tablet and shows drawer button instead of sidebar.
  it('shows mobile menu button on assets route in small viewport', async () => {
    render(
      <MainLayout><div>Content</div></MainLayout>,
      { initialEntries: ['/assets'] },
    );
    await waitFor(() => {
      expect(screen.getByLabelText('Open navigation menu')).toBeInTheDocument();
    });
  });

  it('shows mobile menu button on settings route in small viewport', async () => {
    render(
      <MainLayout><div>Content</div></MainLayout>,
      { initialEntries: ['/settings/user-management/organization'] },
    );
    await waitFor(() => {
      expect(screen.getByLabelText('Open navigation menu')).toBeInTheDocument();
    });
  });
});
