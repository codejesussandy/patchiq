import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../../test-utils';
import { ProfileMenu } from '@/components/layout/ProfileMenu';

const mockLogout = vi.fn().mockResolvedValue(undefined);

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      role: 'ADMIN',
      avatar: null,
      organizationId: '1',
    },
    logout: mockLogout,
    isAuthenticated: true,
    isLoading: false,
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('ProfileMenu', () => {
  const defaultProps = {
    organizations: [
      { id: '1', name: 'Org Alpha' },
      { id: '2', name: 'Org Beta' },
    ],
    selectedOrgId: '1',
    onOrgSwitch: vi.fn(),
    onClose: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders user display name', () => {
    render(<ProfileMenu {...defaultProps} />);
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('renders user email', () => {
    render(<ProfileMenu {...defaultProps} />);
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
  });

  it('renders user role badge', () => {
    render(<ProfileMenu {...defaultProps} />);
    expect(screen.getByText('ADMIN')).toBeInTheDocument();
  });

  it('renders Organization section', () => {
    render(<ProfileMenu {...defaultProps} />);
    expect(screen.getByText('Organization')).toBeInTheDocument();
  });

  it('renders organization list', () => {
    render(<ProfileMenu {...defaultProps} />);
    expect(screen.getByText('Org Alpha')).toBeInTheDocument();
    expect(screen.getByText('Org Beta')).toBeInTheDocument();
  });

  it('shows "No organizations" when organizations list is empty', () => {
    render(<ProfileMenu {...defaultProps} organizations={[]} />);
    expect(screen.getByText('No organizations')).toBeInTheDocument();
  });

  it('calls onOrgSwitch when an organization is clicked', async () => {
    const onOrgSwitch = vi.fn();
    render(<ProfileMenu {...defaultProps} onOrgSwitch={onOrgSwitch} />);
    await userEvent.click(screen.getByText('Org Beta'));
    expect(onOrgSwitch).toHaveBeenCalledWith('2');
  });

  it('renders Profile menu item', () => {
    render(<ProfileMenu {...defaultProps} />);
    expect(screen.getByText('Profile')).toBeInTheDocument();
  });

  it('renders Settings menu item', () => {
    render(<ProfileMenu {...defaultProps} />);
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('renders Logout menu item', () => {
    render(<ProfileMenu {...defaultProps} />);
    expect(screen.getByText('Logout')).toBeInTheDocument();
  });

  it('calls logout and onClose when Logout is clicked', async () => {
    const onClose = vi.fn();
    render(<ProfileMenu {...defaultProps} onClose={onClose} />);
    await userEvent.click(screen.getByText('Logout'));
    expect(onClose).toHaveBeenCalledOnce();
    expect(mockLogout).toHaveBeenCalledOnce();
  });
});
