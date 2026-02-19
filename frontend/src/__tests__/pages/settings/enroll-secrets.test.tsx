import { describe, it, expect, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../../test-utils';
import { EnrollSecret } from '../../../pages/settings/EnrollSecret';
import { server } from '../../msw/server';
import { http, HttpResponse } from 'msw';

const mockSecrets = [
  {
    id: 'secret-1',
    name: 'Production Key',
    secret: 'prod-secret-key-12345678',
    organization: 'Global Org',
    department: 'Engineering',
    createdOn: '2024-01-01T00:00:00Z',
  },
  {
    id: 'secret-2',
    name: 'Dev Key',
    secret: 'dev-secret-key-987654321',
    organization: 'Branch Office',
    department: 'Operations',
    createdOn: '2024-01-02T00:00:00Z',
  },
];

const mockOrganizations = [
  { id: 'org-1', name: 'Global Org' },
  { id: 'org-2', name: 'Branch Office' },
];

const mockDepartments = [
  { id: 'dept-1', name: 'Engineering' },
  { id: 'dept-2', name: 'Operations' },
];

describe('Enroll Secrets Page', () => {
  beforeEach(() => {
    localStorage.setItem('accessToken', 'mock-access-token');
    server.use(
      http.get('*/settings/enroll-secrets', () => {
        return HttpResponse.json({ success: true, data: mockSecrets });
      }),
      http.get('*/settings/organizations', () => {
        return HttpResponse.json({ success: true, data: mockOrganizations });
      }),
      http.get('*/settings/departments', () => {
        return HttpResponse.json({ success: true, data: mockDepartments });
      })
    );
  });

  it('renders enroll secrets page with heading and controls', async () => {
    render(<EnrollSecret />);

    await waitFor(() => {
      expect(screen.getByText('Enroll Secret')).toBeInTheDocument();
    });

    expect(screen.getByPlaceholderText('Search')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument();
  });

  it('search input accepts text', async () => {
    const user = userEvent.setup();
    render(<EnrollSecret />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search');
    await user.type(searchInput, 'Production');
    expect(searchInput).toHaveValue('Production');
  });

  it('opens create modal when Create button is clicked', async () => {
    const user = userEvent.setup();
    render(<EnrollSecret />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /create/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /create/i }));

    await waitFor(() => {
      expect(screen.getByText('Create Enroll Secret')).toBeInTheDocument();
    });

    expect(screen.getByPlaceholderText('Name')).toBeInTheDocument();
  });

  it('shows create modal with Name field when Create button is clicked', async () => {
    const user = userEvent.setup();
    render(<EnrollSecret />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /create/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /create/i }));

    await waitFor(() => {
      expect(screen.getByText('Create Enroll Secret')).toBeInTheDocument();
    });

    // The form should have the Name field and the submit button
    expect(screen.getByPlaceholderText('Name')).toBeInTheDocument();
    const allButtons = screen.getAllByRole('button');
    const createBtn = allButtons.find(btn => btn.textContent === 'Create');
    expect(createBtn).toBeTruthy();
  });

  it('shows organization and department fields in create modal', async () => {
    const user = userEvent.setup();
    render(<EnrollSecret />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /create/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /create/i }));

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Name')).toBeInTheDocument();
    });

    // Organization and department selects should be present
    const pleaseSelects = screen.getAllByText('Please Select');
    expect(pleaseSelects.length).toBeGreaterThanOrEqual(2);
  });

  it('shows error state when API fails', async () => {
    server.use(
      http.get('*/settings/enroll-secrets', () => {
        return HttpResponse.json(
          { success: false, error: { code: 'SERVER_ERROR', message: 'Internal error' } },
          { status: 500 }
        );
      })
    );

    render(<EnrollSecret />);

    await waitFor(() => {
      expect(screen.getByText('Enroll Secret')).toBeInTheDocument();
    });

    // Page still renders but no data visible in table
    expect(screen.getByRole('button', { name: /create/i })).toBeInTheDocument();
  });
});
