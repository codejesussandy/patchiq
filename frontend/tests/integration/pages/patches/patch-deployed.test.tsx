import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../../test-utils';
import { PatchDeployed } from '@/pages/patches/PatchDeployed';

describe('PatchDeployed Page', () => {
  beforeEach(() => {
    localStorage.setItem('accessToken', 'mock-access-token');
  });

  it('renders page title "Patch Deployed"', async () => {
    render(<PatchDeployed />, { initialEntries: ['/patches/deployed'] });

    await waitFor(() => {
      expect(screen.getByText('Patch Deployed')).toBeInTheDocument();
    });
  });

  it('renders Create button', async () => {
    render(<PatchDeployed />, { initialEntries: ['/patches/deployed'] });

    await waitFor(() => {
      expect(screen.getByText('Create')).toBeInTheDocument();
    });
  });

  it('renders search input', async () => {
    render(<PatchDeployed />, { initialEntries: ['/patches/deployed'] });

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search')).toBeInTheDocument();
    });
  });

  it('renders Filter button', async () => {
    render(<PatchDeployed />, { initialEntries: ['/patches/deployed'] });

    await waitFor(() => {
      expect(screen.getByText('Filter')).toBeInTheDocument();
    });
  });

  it('search input accepts text', async () => {
    const user = userEvent.setup();
    render(<PatchDeployed />, { initialEntries: ['/patches/deployed'] });

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search');
    await user.type(searchInput, 'January');
    expect(searchInput).toHaveValue('January');
  });
});
