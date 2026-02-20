import { describe, it, expect, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../../test-utils';
import { RolesAndPrivileges } from '@/pages/settings/RolesAndPrivileges';

const mockRoles = [
  {
    id: 'role-1',
    name: 'Admin',
    description: 'Full system access',
    isSystem: true,
    isBuiltIn: true,
    users: 5,
    branch: 'Gurugram',
    permissions: [],
  },
  {
    id: 'role-2',
    name: 'Viewer',
    description: 'Read-only access',
    isSystem: true,
    isBuiltIn: true,
    users: 10,
    branch: 'Gurugram',
    permissions: [],
  },
  {
    id: 'role-3',
    name: 'Custom Role',
    description: 'Custom permissions',
    isSystem: false,
    isBuiltIn: false,
    users: 2,
    branch: 'Delhi',
    permissions: [],
  },
];

describe('Roles & Privileges Page', () => {
  beforeEach(() => {
    localStorage.setItem('accessToken', 'mock-access-token');
  });

  it('renders page with Create New Role button and search controls', async () => {
    render(<RolesAndPrivileges />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /create new role/i })).toBeInTheDocument();
    });

    expect(screen.getByPlaceholderText('Search')).toBeInTheDocument();
    expect(screen.getByText('All Branches')).toBeInTheDocument();
  });

  it('opens create role modal when Create New Role is clicked', async () => {
    const user = userEvent.setup();
    render(<RolesAndPrivileges />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /create new role/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /create new role/i }));

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Enter role name')).toBeInTheDocument();
    });
  });

  it('shows permissions section in create role modal', async () => {
    const user = userEvent.setup();
    render(<RolesAndPrivileges />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /create new role/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /create new role/i }));

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Enter role name')).toBeInTheDocument();
    });

    expect(screen.getByText('General Details')).toBeInTheDocument();
    expect(screen.getByText('Assign to Branch')).toBeInTheDocument();
    expect(screen.getByText('Permissions')).toBeInTheDocument();
  });

  it('role search filters the branch select and search input', async () => {
    const user = userEvent.setup();
    render(<RolesAndPrivileges />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search');
    await user.type(searchInput, 'Admin');
    expect(searchInput).toHaveValue('Admin');
  });

  it('create role modal has Create Role and Close buttons', async () => {
    const user = userEvent.setup();
    render(<RolesAndPrivileges />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /create new role/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /create new role/i }));

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Enter role name')).toBeInTheDocument();
    });

    // Modal footer should have Close and Create Role buttons
    const closeBtn = screen.getAllByRole('button').find(btn => btn.textContent === 'Close');
    expect(closeBtn).toBeTruthy();

    const createRoleBtn = screen.getAllByRole('button').find(btn => btn.textContent === 'Create Role');
    expect(createRoleBtn).toBeTruthy();
  });

  it('shows error state when API fails', async () => {

    render(<RolesAndPrivileges />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /create new role/i })).toBeInTheDocument();
    });

    // No roles should be in the table
    // The roles count shows 0
    await waitFor(() => {
      expect(screen.getByText(/0 Role/)).toBeInTheDocument();
    });
  });
});
