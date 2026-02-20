import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../../test-utils';
import { AllPatches } from '../../../pages/patches/AllPatches';

describe('AllPatches Page', () => {
  beforeEach(() => {
    localStorage.setItem('accessToken', 'mock-access-token');
  });

  it('renders page title "All Patches"', async () => {
    render(<AllPatches />, { initialEntries: ['/patches'] });

    await waitFor(() => {
      expect(screen.getByText('All Patches')).toBeInTheDocument();
    });
  });

  it('renders Create Patch button', async () => {
    render(<AllPatches />, { initialEntries: ['/patches'] });

    await waitFor(() => {
      expect(screen.getByText('Create Patch')).toBeInTheDocument();
    });
  });

  it('renders Discover Patches button', async () => {
    render(<AllPatches />, { initialEntries: ['/patches'] });

    await waitFor(() => {
      expect(screen.getByText('Discover Patches')).toBeInTheDocument();
    });
  });

  it('renders Bulk Add button', async () => {
    render(<AllPatches />, { initialEntries: ['/patches'] });

    await waitFor(() => {
      expect(screen.getByText('Bulk Add')).toBeInTheDocument();
    });
  });

  it('renders search input with placeholder "Search"', async () => {
    render(<AllPatches />, { initialEntries: ['/patches'] });

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search')).toBeInTheDocument();
    });
  });

  it('renders Filter button', async () => {
    render(<AllPatches />, { initialEntries: ['/patches'] });

    await waitFor(() => {
      expect(screen.getByText('Filter')).toBeInTheDocument();
    });
  });

  it('search input accepts text', async () => {
    const user = userEvent.setup();
    render(<AllPatches />, { initialEntries: ['/patches'] });

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search');
    await user.type(searchInput, 'Windows');
    expect(searchInput).toHaveValue('Windows');
  });

  it('clicking Create Patch opens modal', async () => {
    const user = userEvent.setup();
    render(<AllPatches />, { initialEntries: ['/patches'] });

    await waitFor(() => {
      expect(screen.getByText('Create Patch')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Create Patch'));

    await waitFor(() => {
      expect(screen.getByText('Define Patch')).toBeInTheDocument();
    });
  });

  it('renders patch data from API', async () => {
    render(<AllPatches />, { initialEntries: ['/patches'] });
    await waitFor(() => {
      expect(screen.getByText('Windows 11 Cumulative Update')).toBeInTheDocument();
    }, { timeout: 5000 });
    expect(screen.getByText('Ubuntu 22.04 Security Patch')).toBeInTheDocument();
  });

  it('clicking Filter opens filter modal', async () => {
    const user = userEvent.setup();
    render(<AllPatches />, { initialEntries: ['/patches'] });

    await waitFor(() => {
      expect(screen.getByText('Filter')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Filter'));

    await waitFor(() => {
      expect(screen.getByText('Apply Filters')).toBeInTheDocument();
    });
  });
});
