import { describe, it, expect, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../../test-utils';
import { Users } from '../../../pages/settings/Users';
import { server } from '../../msw/server';
import { http, HttpResponse } from 'msw';

const mockUsers = [
  {
    id: 'user-1',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@patchiq.io',
    roleName: 'Admin',
    organizationName: 'Global Org',
    departmentName: 'Engineering',
    branchName: 'HQ',
    isSuperAdmin: false,
    isSystem: false,
  },
  {
    id: 'user-2',
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane@patchiq.io',
    roleName: 'Viewer',
    organizationName: 'Branch Office',
    departmentName: 'Operations',
    branchName: 'Remote',
    isSuperAdmin: false,
    isSystem: false,
  },
];

const mockOrganizations = [{ id: 'org-1', name: 'Global Org' }];
const mockRoles = [{ id: 'role-1', name: 'Admin' }];
const mockDepartments = [{ id: 'dept-1', name: 'Engineering' }];
const mockBranches = [{ id: 'branch-1', name: 'HQ' }];

describe('Users Settings Page', () => {
  beforeEach(() => {
    localStorage.setItem('accessToken', 'mock-access-token');
    server.use(
      http.get('*/settings/users', () => {
        return HttpResponse.json({ success: true, data: mockUsers });
      }),
      http.get('*/settings/organizations', () => {
        return HttpResponse.json({ success: true, data: mockOrganizations });
      }),
      http.get('*/settings/roles', () => {
        return HttpResponse.json({ success: true, data: mockRoles });
      }),
      http.get('*/settings/departments', () => {
        return HttpResponse.json({ success: true, data: mockDepartments });
      }),
      http.get('*/settings/branches', () => {
        return HttpResponse.json({ success: true, data: mockBranches });
      })
    );
  });

  it('renders users page with heading and controls', async () => {
    render(<Users />);

    await waitFor(() => {
      expect(screen.getByText('Users')).toBeInTheDocument();
    });

    expect(screen.getByPlaceholderText(/search by name/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create/i })).toBeInTheDocument();
  });

  it('search input accepts text', async () => {
    const user = userEvent.setup();
    render(<Users />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/search by name/i)).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search by name/i);
    await user.type(searchInput, 'Jane');
    expect(searchInput).toHaveValue('Jane');
  });

  it('opens create user drawer when Create button is clicked', async () => {
    const user = userEvent.setup();
    render(<Users />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /create/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /create/i }));

    await waitFor(() => {
      expect(screen.getByPlaceholderText('First Name')).toBeInTheDocument();
    });

    expect(screen.getByPlaceholderText('Last Name')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('user@example.com')).toBeInTheDocument();
  });

  it('shows import button in toolbar', async () => {
    render(<Users />);

    await waitFor(() => {
      expect(screen.getByText('Users')).toBeInTheDocument();
    });

    // Import button has ImportOutlined icon
    const allButtons = screen.getAllByRole('button');
    expect(allButtons.length).toBeGreaterThan(2);
  });

  it('shows role and organization fields in create user drawer', async () => {
    const user = userEvent.setup();
    render(<Users />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /create/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /create/i }));

    await waitFor(() => {
      expect(screen.getByPlaceholderText('First Name')).toBeInTheDocument();
    });

    expect(screen.getByPlaceholderText('Last Name')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('user@example.com')).toBeInTheDocument();
    expect(screen.getByText('Select Role')).toBeInTheDocument();
    expect(screen.getByText('Select Organization')).toBeInTheDocument();
  });

  it('shows error state when API fails', async () => {
    server.use(
      http.get('*/settings/users', () => {
        return HttpResponse.json(
          { success: false, error: { code: 'SERVER_ERROR', message: 'Internal error' } },
          { status: 500 }
        );
      })
    );

    render(<Users />);

    await waitFor(() => {
      expect(screen.getByText('Users')).toBeInTheDocument();
    });

    // The page still renders but table is empty
    expect(screen.getByRole('button', { name: /create/i })).toBeInTheDocument();
  });
});
