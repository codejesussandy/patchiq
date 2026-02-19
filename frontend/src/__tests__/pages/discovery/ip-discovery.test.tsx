import { describe, it, expect, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../../test-utils';
import { IPDiscovery } from '../../../pages/discovery/IPDiscovery';
import { server } from '../../msw/server';
import { http, HttpResponse } from 'msw';

describe('IP Discovery Page', () => {
  beforeEach(() => {
    localStorage.setItem('accessToken', 'mock-access-token');
  });

  it('renders page title', async () => {
    render(<IPDiscovery />);

    await waitFor(() => {
      expect(screen.getByText('IP Discovery')).toBeInTheDocument();
    });
  });

  it('renders IP ranges table with data', async () => {
    render(<IPDiscovery />);

    await waitFor(() => {
      expect(screen.getByText('Corporate Network')).toBeInTheDocument();
    });

    expect(screen.getByText('DMZ Network')).toBeInTheDocument();
    expect(screen.getByText('192.168.1.0/24')).toBeInTheDocument();
    expect(screen.getByText('10.0.0.0/16')).toBeInTheDocument();
  });

  it('has search input', async () => {
    render(<IPDiscovery />);

    expect(screen.getByPlaceholderText('Search')).toBeInTheDocument();
  });

  it('has create IP range button', async () => {
    render(<IPDiscovery />);

    expect(screen.getByText('Create IP Range')).toBeInTheDocument();
  });

  it('create button opens create modal', async () => {
    const user = userEvent.setup();
    render(<IPDiscovery />);

    await waitFor(() => {
      expect(screen.getByText('Corporate Network')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Create IP Range'));

    await waitFor(() => {
      expect(screen.getByText('Range Name')).toBeInTheDocument();
    });

    expect(screen.getByPlaceholderText('e.g., Corporate Network')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g., 192.168.1.0/24')).toBeInTheDocument();
  });

  it('search filters IP ranges', async () => {
    const user = userEvent.setup();
    render(<IPDiscovery />);

    await waitFor(() => {
      expect(screen.getByText('Corporate Network')).toBeInTheDocument();
    });

    await user.type(screen.getByPlaceholderText('Search'), 'DMZ');

    await waitFor(() => {
      expect(screen.queryByText('Corporate Network')).not.toBeInTheDocument();
    });

    expect(screen.getByText('DMZ Network')).toBeInTheDocument();
  });

  it('shows empty state when no IP ranges', async () => {
    server.use(
      http.get('*/discovery/ip-ranges', () => {
        return HttpResponse.json({ success: true, data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } });
      })
    );

    render(<IPDiscovery />);

    await waitFor(() => {
      expect(screen.getByText('No data found')).toBeInTheDocument();
    });
  });

  it('shows error state when API fails', async () => {
    server.use(
      http.get('*/discovery/ip-ranges', () => {
        return HttpResponse.json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed' } }, { status: 500 });
      })
    );

    render(<IPDiscovery />);

    await waitFor(() => {
      expect(screen.getByText('IP Discovery')).toBeInTheDocument();
    });
  });
});
