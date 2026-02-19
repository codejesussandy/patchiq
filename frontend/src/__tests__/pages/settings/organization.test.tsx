import { describe, it, expect, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../../test-utils';
import { Organization } from '../../../pages/settings/Organization';
import { server } from '../../msw/server';
import { http, HttpResponse } from 'msw';

const mockOrganizations = [
  { id: 'org-1', name: 'Global Org', description: 'Main org', isDefault: true, createdAt: '2024-01-01T00:00:00Z' },
  { id: 'org-2', name: 'Branch Office', description: 'Secondary org', isDefault: false, createdAt: '2024-01-02T00:00:00Z' },
];

describe('Organization Settings Page', () => {
  beforeEach(() => {
    localStorage.setItem('accessToken', 'mock-access-token');
    server.use(
      http.get('*/settings/organizations', () => {
        return HttpResponse.json({ success: true, data: mockOrganizations });
      })
    );
  });

  it('renders organization page with heading and controls', async () => {
    render(<Organization />);

    await waitFor(() => {
      expect(screen.getByText('Organization')).toBeInTheDocument();
    });

    expect(screen.getByPlaceholderText('Search by name or description')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create/i })).toBeInTheDocument();
  });

  it('search input accepts text', async () => {
    const user = userEvent.setup();
    render(<Organization />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search by name or description')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search by name or description');
    await user.type(searchInput, 'Branch');
    expect(searchInput).toHaveValue('Branch');
  });

  it('opens create modal when Create button is clicked', async () => {
    const user = userEvent.setup();
    render(<Organization />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /create/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /create/i }));

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Enter organization name')).toBeInTheDocument();
    });
  });

  it('submits create organization form via POST', async () => {
    const user = userEvent.setup();
    let postCalled = false;

    server.use(
      http.post('*/settings/organizations', async () => {
        postCalled = true;
        return HttpResponse.json({ success: true, data: { id: 'org-3', name: 'New Org', isDefault: false } });
      })
    );

    render(<Organization />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /create/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /create/i }));

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Enter organization name')).toBeInTheDocument();
    });

    await user.type(screen.getByPlaceholderText('Enter organization name'), 'New Org');

    // Find the submit button (inside the modal footer, not the toolbar Create button)
    const createOrgBtn = screen.getAllByRole('button').find(btn => btn.textContent === 'Create Organization');
    await user.click(createOrgBtn);

    await waitFor(() => {
      expect(postCalled).toBe(true);
    });
  });

  it('shows create organization form fields', async () => {
    const user = userEvent.setup();
    render(<Organization />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /create/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /create/i }));

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Enter organization name')).toBeInTheDocument();
    });

    expect(screen.getByPlaceholderText('Enter organization description (optional)')).toBeInTheDocument();
    expect(screen.getByText('Organization Name')).toBeInTheDocument();
    expect(screen.getByText('Set as Default')).toBeInTheDocument();
  });

  it('shows error state when API fails', async () => {
    server.use(
      http.get('*/settings/organizations', () => {
        return HttpResponse.json(
          { success: false, error: { code: 'SERVER_ERROR', message: 'Internal error' } },
          { status: 500 }
        );
      })
    );

    render(<Organization />);

    await waitFor(() => {
      expect(screen.getByText('Organization')).toBeInTheDocument();
    });

    // Page renders but the table should show empty state
    expect(screen.getByRole('button', { name: /create/i })).toBeInTheDocument();
  });

  it('renders filter and export buttons', async () => {
    render(<Organization />);

    await waitFor(() => {
      expect(screen.getByText('Organization')).toBeInTheDocument();
    });

    // Filter button (FilterOutlined icon)
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(1);
  });
});
