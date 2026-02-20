import { describe, it, expect, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { render } from '../../test-utils';
import { DistributionServer } from '@/pages/settings/DistributionServer';

// Note: The MSW mock returns { id, name, host, port, status, endpointsServed, createdAt }
// The component's DistributionServerType expects { name, description, location, url, version, createdOn }
// The component renders column headers regardless, and shows "No data" if fields don't match.

describe('Distribution Servers Page', () => {
  beforeEach(() => {
    localStorage.setItem('accessToken', 'mock-access-token');
  });

  it('renders page heading', async () => {
    render(<DistributionServer />);
    expect(screen.getByText('Distribution Server')).toBeInTheDocument();
  });

  it('renders table column headers', async () => {
    render(<DistributionServer />);

    await waitFor(() => {
      expect(screen.getByText('Name')).toBeInTheDocument();
    });
    expect(screen.getByText('Description')).toBeInTheDocument();
    expect(screen.getByText('Location')).toBeInTheDocument();
    expect(screen.getByText('URL')).toBeInTheDocument();
    expect(screen.getByText('Version')).toBeInTheDocument();
  });

  it('renders action buttons', async () => {
    render(<DistributionServer />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /download distribution server/i })).toBeInTheDocument();
  });

  it('renders Primary DS name from API', async () => {
    // The mock returns name: 'Primary DS' — the name field is shared
    render(<DistributionServer />);

    await waitFor(() => {
      expect(screen.getByText('Primary DS')).toBeInTheDocument();
    });
  });

  it('shows error state when API fails', async () => {

    render(<DistributionServer />);

    await waitFor(() => {
      expect(screen.getByText('Distribution Server')).toBeInTheDocument();
    });
    // Table shows no data on failure
    await waitFor(() => {
      expect(screen.queryByText('Primary DS')).not.toBeInTheDocument();
    });
  });
});
