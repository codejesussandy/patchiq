import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../test-utils';
import { RolesAndPrivileges } from '@/pages/settings/RolesAndPrivileges';

vi.mock('@/hooks/useSettings', () => ({
  useRoles: vi.fn(() => ({
    data: [
      { id: '1', name: 'Admin', users: 5, branch: 'HQ', description: 'Full access', isSystem: true, permissions: [] },
      { id: '2', name: 'Viewer', users: 10, branch: 'Branch1', description: 'Read-only', isSystem: false, permissions: [] },
    ],
    isLoading: false,
  })),
  useCreateRole: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useUpdateRole: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useDeleteRole: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
}));

vi.mock('@/hooks/useModal', () => ({
  useModal: vi.fn(() => ({
    open: false,
    selectedItem: null,
    onOpen: vi.fn(),
    onClose: vi.fn(),
  })),
}));

describe('RolesAndPrivileges', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the Create New Role button', () => {
    render(<RolesAndPrivileges />);
    expect(screen.getByRole('button', { name: /create new role/i })).toBeInTheDocument();
  });

  it('renders roles in the table', () => {
    render(<RolesAndPrivileges />);
    expect(screen.getByText('Admin')).toBeInTheDocument();
    expect(screen.getByText('Viewer')).toBeInTheDocument();
  });

  it('shows system badge for system roles', () => {
    render(<RolesAndPrivileges />);
    expect(screen.getByText('(System)')).toBeInTheDocument();
  });

  it('renders search input', () => {
    render(<RolesAndPrivileges />);
    expect(screen.getByPlaceholderText('Search')).toBeInTheDocument();
  });

  it('displays total roles count', () => {
    render(<RolesAndPrivileges />);
    expect(screen.getByText(/Total 2 Roles Found/)).toBeInTheDocument();
  });
});
