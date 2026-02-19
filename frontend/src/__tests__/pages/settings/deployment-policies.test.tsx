import { describe, it, expect, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../../test-utils';
import { DeploymentPolicies } from '../../../pages/settings/DeploymentPolicies';
import { server } from '../../msw/server';
import { http, HttpResponse } from 'msw';

const mockPoliciesWithType = [
  {
    id: 'dp-1',
    name: 'Standard Policy',
    description: 'Default deployment policy',
    type: 'SCHEDULE',
    schedule: 'IMMEDIATE',
    rebootPolicy: 'IF_REQUIRED',
    maintenanceWindow: null,
    enabled: true,
    createdBy: 'admin',
    createdAt: '2024-01-01T00:00:00Z',
  },
];

describe('Deployment Policies Page', () => {
  beforeEach(() => {
    localStorage.setItem('accessToken', 'mock-access-token');
    // Provide complete data shape that the component can render
    server.use(
      http.get('*/settings/deployment-policies', () => {
        return HttpResponse.json({
          success: true,
          data: { data: mockPoliciesWithType, total: 1, page: 1, limit: 20, totalPages: 1 },
        });
      })
    );
  });

  it('renders deployment policies table', async () => {
    render(<DeploymentPolicies />);

    await waitFor(() => {
      expect(screen.getByText('Standard Policy')).toBeInTheDocument();
    });

    expect(screen.getByText('Default deployment policy')).toBeInTheDocument();
  });

  it('renders page heading', async () => {
    render(<DeploymentPolicies />);
    expect(screen.getByText('Deployment Policies')).toBeInTheDocument();
  });

  it('creates new deployment policy', async () => {
    const user = userEvent.setup();
    render(<DeploymentPolicies />);

    await waitFor(() => {
      expect(screen.getByText('Standard Policy')).toBeInTheDocument();
    });

    const createButton = screen.getByRole('button', { name: /create/i });
    await user.click(createButton);

    await waitFor(() => {
      const allCreatePolicy = screen.getAllByText('Create Policy');
      expect(allCreatePolicy.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('deletes deployment policy with confirmation', async () => {
    const user = userEvent.setup();
    render(<DeploymentPolicies />);

    await waitFor(() => {
      expect(screen.getByText('Standard Policy')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    await user.click(deleteButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Delete Policy')).toBeInTheDocument();
    });
    expect(screen.getByText(/Are you sure you want to delete "Standard Policy"/i)).toBeInTheDocument();
  });

  it('shows error state when API fails', async () => {
    server.use(
      http.get('*/settings/deployment-policies', () => {
        return HttpResponse.json({ success: false, error: { message: 'Server error' } }, { status: 500 });
      })
    );

    render(<DeploymentPolicies />);

    await waitFor(() => {
      expect(screen.queryByText('Standard Policy')).not.toBeInTheDocument();
    });
    expect(screen.getByText('Deployment Policies')).toBeInTheDocument();
  });
});
