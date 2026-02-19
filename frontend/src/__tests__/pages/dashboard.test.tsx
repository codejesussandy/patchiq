import { describe, it, expect, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../test-utils';
import { Dashboard } from '../../pages/Dashboard';
import { server } from '../msw/server';
import { http, HttpResponse } from 'msw';

describe('Dashboard Page', () => {
  beforeEach(() => {
    localStorage.setItem('accessToken', 'mock-access-token');
  });

  it('shows loading state while data is fetching', () => {
    render(<Dashboard />, { initialEntries: ['/dashboard'] });
    expect(screen.getByText('Loading dashboard...')).toBeInTheDocument();
  });

  it('renders dashboard with stats from API', async () => {
    render(<Dashboard />, { initialEntries: ['/dashboard'] });

    await waitFor(() => {
      expect(screen.getByText('Executive Dashboard')).toBeInTheDocument();
    });

    expect(screen.getByText('Total Endpoints')).toBeInTheDocument();
    expect(screen.getByText('Total Vulnerability')).toBeInTheDocument();
    expect(screen.getByText('Refresh')).toBeInTheDocument();
  });

  it('renders stat cards with correct values', async () => {
    render(<Dashboard />, { initialEntries: ['/dashboard'] });

    await waitFor(() => {
      expect(screen.getByText('Executive Dashboard')).toBeInTheDocument();
    });

    // Check stat card values via aria-labels
    expect(screen.getByLabelText(/Total Endpoints: 150/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Total Linux Endpoints: 60/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Total Windows Endpoints: 80/)).toBeInTheDocument();
  });

  it('shows error state when API fails', async () => {
    server.use(
      http.get('*/dashboard', () => {
        return HttpResponse.json(
          { success: false, error: { code: 'SERVER_ERROR', message: 'Internal error' } },
          { status: 500 }
        );
      })
    );

    render(<Dashboard />, { initialEntries: ['/dashboard'] });

    await waitFor(() => {
      expect(screen.getByText('Failed to load dashboard data.')).toBeInTheDocument();
    });

    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('refresh button triggers refetch', async () => {
    const user = userEvent.setup();
    render(<Dashboard />, { initialEntries: ['/dashboard'] });

    await waitFor(() => {
      expect(screen.getByText('Refresh')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Refresh'));

    // After refresh, dashboard should still show data
    await waitFor(() => {
      expect(screen.getByText('Executive Dashboard')).toBeInTheDocument();
    });
  });

  it('renders chart sections', async () => {
    render(<Dashboard />, { initialEntries: ['/dashboard'] });

    await waitFor(() => {
      expect(screen.getByText('Executive Dashboard')).toBeInTheDocument();
    });

    expect(screen.getByText('Vulnerability Classification')).toBeInTheDocument();
    expect(screen.getByText('Top 10 Vulnerability by CVSS')).toBeInTheDocument();
    expect(screen.getByText('Platform wise Total Endpoints')).toBeInTheDocument();
  });
});
