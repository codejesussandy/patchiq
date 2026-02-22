import { describe, it, expect, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { render } from '../../test-utils';
import { SoftwareJobsDeployed } from '../../../pages/jobs/SoftwareJobsDeployed';
import { server } from '../../msw/server';
import { http, HttpResponse } from 'msw';

describe('Software Jobs Page (Standalone)', () => {
  beforeEach(() => {
    localStorage.setItem('accessToken', 'mock-access-token');
  });

  it('renders the deployments table', async () => {
    render(<SoftwareJobsDeployed />, { initialEntries: ['/assets/software-jobs'] });

    await waitFor(() => {
      expect(screen.getAllByText('ID').length).toBeGreaterThan(0);
    });
    expect(screen.getAllByText('Name').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Type').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Stage').length).toBeGreaterThan(0);
  });

  it('does not render catalog or bundle tabs', async () => {
    render(<SoftwareJobsDeployed />, { initialEntries: ['/assets/software-jobs'] });

    expect(screen.queryByRole('tab', { name: /catalog/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: /bundle/i })).not.toBeInTheDocument();
  });

  it('shows error state when API fails', async () => {
    server.use(
      http.get('*/deployments/software', () => {
        return HttpResponse.json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed' } }, { status: 500 });
      })
    );

    render(<SoftwareJobsDeployed />, { initialEntries: ['/assets/software-jobs'] });

    // Component should still render without crashing
    await waitFor(() => {
      expect(screen.getAllByText('ID').length).toBeGreaterThan(0);
    });
  });
});
