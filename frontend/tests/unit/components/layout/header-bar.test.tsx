import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../../test-utils';
import { HeaderBar } from '@/components/layout/HeaderBar';

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

describe('HeaderBar', () => {
  const defaultProps = {
    selectedTopMenu: ['/dashboard'],
    organizations: [
      { id: '1', name: 'Org One' },
      { id: '2', name: 'Org Two' },
    ],
    selectedOrgId: '1',
    onOrgSwitch: vi.fn(),
    chatOpen: false,
    onToggleChat: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('accessToken', 'mock-token');
  });

  it('renders the app name', () => {
    render(<HeaderBar {...defaultProps} />);
    expect(screen.getByText('Patch Manager')).toBeInTheDocument();
  });

  it('renders the header banner role', () => {
    render(<HeaderBar {...defaultProps} />);
    expect(screen.getByRole('banner')).toBeInTheDocument();
  });

  it('renders top navigation menu items', () => {
    render(<HeaderBar {...defaultProps} />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Assets')).toBeInTheDocument();
    expect(screen.getByText('Patches')).toBeInTheDocument();
    expect(screen.getByText('Vulnerability')).toBeInTheDocument();
    expect(screen.getByText('Reports')).toBeInTheDocument();
  });

  it('renders user profile menu trigger', () => {
    render(<HeaderBar {...defaultProps} />);
    expect(screen.getByLabelText('User profile menu')).toBeInTheDocument();
  });

  it('renders search area', () => {
    render(<HeaderBar {...defaultProps} />);
    expect(screen.getByLabelText('Search')).toBeInTheDocument();
  });

  it('renders AI assistant toggle button', () => {
    render(<HeaderBar {...defaultProps} />);
    expect(screen.getByLabelText('Toggle AI Assistant')).toBeInTheDocument();
  });

  it('calls onToggleChat when AI assistant button is clicked', async () => {
    const onToggleChat = vi.fn();
    render(<HeaderBar {...defaultProps} onToggleChat={onToggleChat} />);
    await userEvent.click(screen.getByLabelText('Toggle AI Assistant'));
    expect(onToggleChat).toHaveBeenCalledOnce();
  });

  it('renders notification bell icon', () => {
    const { container } = render(<HeaderBar {...defaultProps} />);
    expect(container.querySelector('.anticon-bell')).toBeInTheDocument();
  });

  it('renders mobile menu button when showMobileMenu is true', () => {
    render(
      <HeaderBar {...defaultProps} showMobileMenu onMobileMenuToggle={vi.fn()} />,
    );
    expect(screen.getByLabelText('Open navigation menu')).toBeInTheDocument();
  });

  it('does not render mobile menu button when showMobileMenu is false', () => {
    render(<HeaderBar {...defaultProps} />);
    expect(screen.queryByLabelText('Open navigation menu')).not.toBeInTheDocument();
  });

  it('calls onMobileMenuToggle when mobile menu button is clicked', async () => {
    const onMobileMenuToggle = vi.fn();
    render(
      <HeaderBar {...defaultProps} showMobileMenu onMobileMenuToggle={onMobileMenuToggle} />,
    );
    await userEvent.click(screen.getByLabelText('Open navigation menu'));
    expect(onMobileMenuToggle).toHaveBeenCalledOnce();
  });
});
