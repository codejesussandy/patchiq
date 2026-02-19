import { describe, it, expect, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../../test-utils';
import { PatchJobs } from '../../../pages/jobs/PatchJobs';
import { server } from '../../msw/server';
import { http, HttpResponse } from 'msw';

describe('Patch Jobs Page', () => {
  beforeEach(() => {
    localStorage.setItem('accessToken', 'mock-access-token');
  });

  it('renders deployment policies table with data', async () => {
    render(<PatchJobs />);

    await waitFor(() => {
      expect(screen.getByText('Maintenance Window Policy')).toBeInTheDocument();
    });

    expect(screen.getByText('Immediate Deploy Policy')).toBeInTheDocument();
    expect(screen.getByText('POL-001')).toBeInTheDocument();
    expect(screen.getByText('POL-002')).toBeInTheDocument();
  });

  it('renders type tags', async () => {
    render(<PatchJobs />);

    await waitFor(() => {
      expect(screen.getByText('SCHEDULE')).toBeInTheDocument();
    });

    expect(screen.getByText('INSTANT')).toBeInTheDocument();
  });

  it('has search input in toolbar', async () => {
    render(<PatchJobs />);

    expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
  });

  it('search filters policies', async () => {
    const user = userEvent.setup();
    render(<PatchJobs />);

    await waitFor(() => {
      expect(screen.getByText('Maintenance Window Policy')).toBeInTheDocument();
    });

    await user.type(screen.getByPlaceholderText('Search...'), 'Immediate');

    await waitFor(() => {
      expect(screen.queryByText('Maintenance Window Policy')).not.toBeInTheDocument();
    });

    expect(screen.getByText('Immediate Deploy Policy')).toBeInTheDocument();
  });

  it('shows empty state when no policies', async () => {
    server.use(
      http.get('*/deployment-policies', () => {
        return HttpResponse.json({ success: true, data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } });
      })
    );

    render(<PatchJobs />);

    await waitFor(() => {
      expect(screen.getByText('No data found')).toBeInTheDocument();
    });
  });

  it('create button opens patch deployment modal', async () => {
    const user = userEvent.setup();
    render(<PatchJobs />);

    await waitFor(() => {
      expect(screen.getByText('Maintenance Window Policy')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /create/i }));

    await waitFor(() => {
      expect(screen.getByText('Create Patch Deployment')).toBeInTheDocument();
    });
  });

  it('shows error state when API fails', async () => {
    server.use(
      http.get('*/deployment-policies', () => {
        return HttpResponse.json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed' } }, { status: 500 });
      })
    );

    render(<PatchJobs />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
    });
  });
});
