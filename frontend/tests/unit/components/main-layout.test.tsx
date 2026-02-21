import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { render } from '../test-utils';
import { MainLayout } from '@/components/MainLayout';

// Mock heavy child components
vi.mock('@/components/chat/AIChatPanel', () => ({
  AIChatPanel: () => <div data-testid="ai-chat-panel" />,
}));

vi.mock('@/components/CategoryManagementModal', () => ({
  CategoryManagementModal: () => null,
}));

vi.mock('@/components/NotificationDropdown', () => ({
  NotificationDropdown: () => <div data-testid="notification-dropdown" />,
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: '1', email: 'admin@test.com', displayName: 'Admin User', role: 'admin' },
    isAuthenticated: true,
    login: vi.fn(),
    logout: vi.fn(),
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/services/category.service', () => ({
  categoryService: {
    getCategories: vi.fn().mockResolvedValue({ data: [] }),
  },
}));

vi.mock('@/services/settings.service', () => ({
  settingsService: {
    getOrganizations: vi.fn().mockResolvedValue({ data: [] }),
    getBranding: vi.fn().mockResolvedValue({ data: {} }),
  },
}));

describe('MainLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('accessToken', 'mock-access-token');
  });

  it('renders children content', async () => {
    render(
      <MainLayout><div>Page Content</div></MainLayout>,
      { initialEntries: ['/dashboard'] }
    );

    await waitFor(() => {
      expect(screen.getByText('Page Content')).toBeInTheDocument();
    });
  });

  it('renders header banner', async () => {
    render(
      <MainLayout><div>Content</div></MainLayout>,
      { initialEntries: ['/dashboard'] }
    );

    await waitFor(() => {
      expect(screen.getByRole('banner')).toBeInTheDocument();
    });
  });

  it('renders main content area', async () => {
    render(
      <MainLayout><div>Content</div></MainLayout>,
      { initialEntries: ['/dashboard'] }
    );

    await waitFor(() => {
      expect(screen.getByRole('main')).toBeInTheDocument();
    });
  });
});
