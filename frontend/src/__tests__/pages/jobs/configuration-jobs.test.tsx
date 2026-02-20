import { describe, it, expect, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { render } from '../../test-utils';
import { ConfigurationJobs } from '../../../pages/jobs/ConfigurationJobs';
import { ConfigurationJobsCatalog } from '../../../pages/jobs/ConfigurationJobsCatalog';
import { server } from '../../msw/server';
import { http, HttpResponse } from 'msw';

describe('Configuration Jobs Page', () => {
  beforeEach(() => {
    localStorage.setItem('accessToken', 'mock-access-token');
  });

  it('renders configuration catalog data', async () => {
    render(<ConfigurationJobsCatalog />);

    await waitFor(() => {
      expect(screen.getByText('Enable Firewall')).toBeInTheDocument();
    });

    expect(screen.getByText('Update Packages')).toBeInTheDocument();
  });

  it('shows config item details', async () => {
    render(<ConfigurationJobsCatalog />);

    await waitFor(() => {
      expect(screen.getByText('Enable Firewall')).toBeInTheDocument();
    });

    expect(screen.getByText('Enable Windows firewall')).toBeInTheDocument();
    expect(screen.getByText('Update all packages')).toBeInTheDocument();
  });

  it('shows empty state when no config items', async () => {
    server.use(
      http.get('*/jobs/config/catalog', () => {
        return HttpResponse.json({ success: true, data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } });
      })
    );

    render(<ConfigurationJobsCatalog />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
    });

    expect(screen.queryByText('Enable Firewall')).not.toBeInTheDocument();
  });

  it('shows error state when API fails', async () => {
    server.use(
      http.get('*/jobs/config/catalog', () => {
        return HttpResponse.json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed' } }, { status: 500 });
      })
    );

    render(<ConfigurationJobs />, { initialEntries: ['/jobs/configuration-jobs/catalog'] });

    // Verify tabs still render (page structure intact)
    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /catalog/i })).toBeInTheDocument();
    });
    // Verify no catalog data is shown (error prevents data load)
    expect(screen.queryByText('Enable Firewall')).not.toBeInTheDocument();
  });
});
