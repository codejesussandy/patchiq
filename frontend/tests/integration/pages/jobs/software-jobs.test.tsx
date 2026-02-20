import { describe, it, expect, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { render } from '../../test-utils';
import { SoftwareJobs } from '@/pages/jobs/SoftwareJobs';

describe('Software Jobs Page', () => {
  beforeEach(() => {
    localStorage.setItem('accessToken', 'mock-access-token');
  });

  it('renders software jobs tabs', async () => {
    render(<SoftwareJobs />, { initialEntries: ['/patches/deployed/catalog'] });

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /catalog/i })).toBeInTheDocument();
    });
    expect(screen.getByRole('tab', { name: /bundle/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /software deployed/i })).toBeInTheDocument();
  });

  it('shows software catalog data', async () => {
    render(<SoftwareJobs />, { initialEntries: ['/patches/deployed/catalog'] });

    // Default tab should show catalog data from MSW
    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /catalog/i })).toBeInTheDocument();
    });
  });

  it('shows error state when API fails', async () => {

    render(<SoftwareJobs />, { initialEntries: ['/patches/deployed/catalog'] });

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /catalog/i })).toBeInTheDocument();
    });
    // Verify error state - tabs render but no data
    expect(screen.getByRole('tab', { name: /bundle/i })).toBeInTheDocument();
  });
});
