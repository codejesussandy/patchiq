import { describe, it, expect, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../../test-utils';
import { SoftwareInventory } from '@/pages/assets/SoftwareInventory';

describe('SoftwareInventory Page', () => {
  beforeEach(() => {
    localStorage.setItem('accessToken', 'mock-access-token');
  });

  // ── Render ──────────────────────────────────────────────────────────────────

  it('renders page title "Software Inventory"', async () => {
    render(<SoftwareInventory />, { initialEntries: ['/assets/software'] });
    expect(await screen.findByRole('heading', { name: /software inventory/i })).toBeInTheDocument();
  });

  it('renders Import from CSV button', async () => {
    render(<SoftwareInventory />, { initialEntries: ['/assets/software'] });
    expect(await screen.findByRole('button', { name: /import from csv/i })).toBeInTheDocument();
  });

  it('renders search input', async () => {
    render(<SoftwareInventory />, { initialEntries: ['/assets/software'] });
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search')).toBeInTheDocument();
    });
  });

  it('renders category filter dropdown', async () => {
    render(<SoftwareInventory />, { initialEntries: ['/assets/software'] });
    await waitFor(() => {
      expect(screen.getByText('All Categories')).toBeInTheDocument();
    });
  });

  it('does not render OS filter dropdown', async () => {
    render(<SoftwareInventory />, { initialEntries: ['/assets/software'] });
    await waitFor(() => {
      expect(screen.queryByText('All OS')).not.toBeInTheDocument();
    });
  });

  // ── Data ────────────────────────────────────────────────────────────────────

  it('shows software inventory data from API', async () => {
    render(<SoftwareInventory />, { initialEntries: ['/assets/software'] });
    expect(await screen.findByText('Visual Studio Code')).toBeInTheDocument();
    expect(await screen.findByText('Google Chrome')).toBeInTheDocument();
  });

  it('shows manufacturer column data', async () => {
    render(<SoftwareInventory />, { initialEntries: ['/assets/software'] });
    await waitFor(() => {
      expect(screen.getByText('Microsoft')).toBeInTheDocument();
      expect(screen.getByText('Google')).toBeInTheDocument();
    });
  });

  it('shows version column data', async () => {
    render(<SoftwareInventory />, { initialEntries: ['/assets/software'] });
    await waitFor(() => {
      expect(screen.getByText('1.85.0')).toBeInTheDocument();
      expect(screen.getByText('120.0')).toBeInTheDocument();
    });
  });

  // ── Search ──────────────────────────────────────────────────────────────────

  it('search input accepts text', async () => {
    const user = userEvent.setup();
    render(<SoftwareInventory />, { initialEntries: ['/assets/software'] });
    const searchInput = await screen.findByPlaceholderText('Search');
    await user.type(searchInput, 'Chrome');
    expect(searchInput).toHaveValue('Chrome');
  });

  it('search filters by software name', async () => {
    const user = userEvent.setup();
    render(<SoftwareInventory />, { initialEntries: ['/assets/software'] });

    await screen.findByText('Visual Studio Code');
    await screen.findByText('Google Chrome');

    await user.type(screen.getByPlaceholderText('Search'), 'Chrome');

    await waitFor(() => {
      expect(screen.getByText('Google Chrome')).toBeInTheDocument();
      expect(screen.queryByText('Visual Studio Code')).not.toBeInTheDocument();
    });
  });

  it('search filters by manufacturer', async () => {
    const user = userEvent.setup();
    render(<SoftwareInventory />, { initialEntries: ['/assets/software'] });

    await screen.findByText('Visual Studio Code');

    await user.type(screen.getByPlaceholderText('Search'), 'Microsoft');

    await waitFor(() => {
      expect(screen.getByText('Visual Studio Code')).toBeInTheDocument();
      expect(screen.queryByText('Google Chrome')).not.toBeInTheDocument();
    });
  });

  it('search filters by version', async () => {
    const user = userEvent.setup();
    render(<SoftwareInventory />, { initialEntries: ['/assets/software'] });

    await screen.findByText('Google Chrome');

    await user.type(screen.getByPlaceholderText('Search'), '120.0');

    await waitFor(() => {
      expect(screen.getByText('Google Chrome')).toBeInTheDocument();
      expect(screen.queryByText('Visual Studio Code')).not.toBeInTheDocument();
    });
  });

  it('clearing search restores all results', async () => {
    const user = userEvent.setup();
    render(<SoftwareInventory />, { initialEntries: ['/assets/software'] });

    await screen.findByText('Visual Studio Code');
    const searchInput = screen.getByPlaceholderText('Search');

    await user.type(searchInput, 'Chrome');
    await waitFor(() => expect(screen.queryByText('Visual Studio Code')).not.toBeInTheDocument());

    await user.clear(searchInput);
    await waitFor(() => {
      expect(screen.getByText('Visual Studio Code')).toBeInTheDocument();
      expect(screen.getByText('Google Chrome')).toBeInTheDocument();
    });
  });

  // ── Category filter ─────────────────────────────────────────────────────────

  it('category filter shows "Application" option', async () => {
    const user = userEvent.setup();
    render(<SoftwareInventory />, { initialEntries: ['/assets/software'] });

    // Click the "All Categories" select trigger to open dropdown
    await user.click(await screen.findByText('All Categories'));

    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Application' })).toBeInTheDocument();
    });
  });

  it('category filter dropdown opens and shows Application option', async () => {
    const user = userEvent.setup();
    render(<SoftwareInventory />, { initialEntries: ['/assets/software'] });

    await user.click(await screen.findByText('All Categories'));

    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Application' })).toBeInTheDocument();
    });
  });

  it('category filter dropdown renders with correct default value', async () => {
    render(<SoftwareInventory />, { initialEntries: ['/assets/software'] });
    // Default value shown in the select trigger
    expect(await screen.findByText('All Categories')).toBeInTheDocument();
  });
});
