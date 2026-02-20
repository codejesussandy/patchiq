import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../../test-utils';
import { AllAssets } from '../../../pages/assets/AllAssets';

describe('AllAssets Page', () => {
  beforeEach(() => {
    localStorage.setItem('accessToken', 'mock-access-token');
  });

  it('renders the page title', async () => {
    render(<AllAssets />, { initialEntries: ['/assets'] });
    expect(await screen.findByRole('heading', { name: /assets/i })).toBeInTheDocument();
  });

  it('renders search input', async () => {
    render(<AllAssets />, { initialEntries: ['/assets'] });
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search assets...')).toBeInTheDocument();
    });
  });

  it('renders Add Assets button', async () => {
    render(<AllAssets />, { initialEntries: ['/assets'] });
    expect(await screen.findByRole('button', { name: /add assets/i })).toBeInTheDocument();
  });

  it('renders Download Agent button', async () => {
    render(<AllAssets />, { initialEntries: ['/assets'] });
    expect(await screen.findByRole('button', { name: /download agent/i })).toBeInTheDocument();
  });

  it('renders Filter button', async () => {
    render(<AllAssets />, { initialEntries: ['/assets'] });
    expect(await screen.findByRole('button', { name: /filter/i })).toBeInTheDocument();
  });

  it('search input accepts text', async () => {
    const user = userEvent.setup();
    render(<AllAssets />, { initialEntries: ['/assets'] });
    const searchInput = await screen.findByPlaceholderText('Search assets...');
    await user.type(searchInput, 'Server');
    expect(searchInput).toHaveValue('Server');
  });

  it('renders asset data from API', async () => {
    render(<AllAssets />, { initialEntries: ['/assets'] });
    // The table renders hostname (not name) as the identity column
    await waitFor(() => {
      expect(screen.getByText('srv-01.local')).toBeInTheDocument();
    }, { timeout: 5000 });
    expect(screen.getByText('ws-01.local')).toBeInTheDocument();
  });

  it('opens add asset modal when Add Assets clicked', async () => {
    const user = userEvent.setup();
    render(<AllAssets />, { initialEntries: ['/assets'] });
    const addBtn = await screen.findByRole('button', { name: /add assets/i });

    // Verify modal is NOT open before click
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(addBtn);

    // Verify modal IS open after click
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  it('opens filter modal when Filter button clicked', async () => {
    const user = userEvent.setup();
    render(<AllAssets />, { initialEntries: ['/assets'] });
    const filterBtn = await screen.findByRole('button', { name: /filter/i });
    await user.click(filterBtn);
    await waitFor(() => {
      expect(screen.getByText('Filter Assets')).toBeInTheDocument();
    });
  });
});
