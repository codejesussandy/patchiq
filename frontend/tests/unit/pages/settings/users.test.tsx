import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../test-utils';
import { Users } from '@/pages/settings/Users';

vi.mock('@/hooks/useSettings', () => ({
  useUsers: vi.fn(() => ({
    data: [
      { id: '1', firstName: 'John', lastName: 'Doe', email: 'john@example.com', phone: '555-1234', organizationName: 'Acme', roleName: 'Admin', branchName: 'HQ', departmentName: 'IT', createdAt: '2024-01-01T00:00:00Z' },
      { id: '2', firstName: 'Jane', lastName: 'Smith', email: 'jane@example.com', phone: '', organizationName: 'Acme', roleName: 'User', branchName: 'Branch1', departmentName: 'Sales', createdAt: '2024-02-01T00:00:00Z' },
    ],
    isLoading: false,
    refetch: vi.fn(),
  })),
  useCreateUser: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useUpdateUser: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useDeleteUser: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useOrganizations: vi.fn(() => ({ data: [{ id: '1', name: 'Acme' }] })),
  useDepartments: vi.fn(() => ({ data: [{ id: '1', name: 'IT' }] })),
  useRoles: vi.fn(() => ({ data: [{ id: '1', name: 'Admin' }] })),
  useBranches: vi.fn(() => ({ data: [{ id: '1', name: 'HQ' }] })),
}));

vi.mock('@/hooks/useModal', () => ({
  useModal: vi.fn(() => ({
    open: false,
    selectedItem: null,
    onOpen: vi.fn(),
    onClose: vi.fn(),
  })),
}));

describe('Users', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the page title', () => {
    render(<Users />);
    expect(screen.getByText('Users')).toBeInTheDocument();
  });

  it('renders the search input', () => {
    render(<Users />);
    expect(screen.getByPlaceholderText(/search by name/i)).toBeInTheDocument();
  });

  it('renders the Create button', () => {
    render(<Users />);
    expect(screen.getByRole('button', { name: /create/i })).toBeInTheDocument();
  });

  it('renders user data in the table', () => {
    render(<Users />);
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
    expect(screen.getByText('jane@example.com')).toBeInTheDocument();
  });

  it('renders column headers', () => {
    render(<Users />);
    expect(screen.getAllByText('Email')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Role')[0]).toBeInTheDocument();
  });
});
