import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../../test-utils';
import { SoftwareInventory } from '../../../pages/assets/SoftwareInventory';

describe('SoftwareInventory Page', () => {
  beforeEach(() => {
    localStorage.setItem('accessToken', 'mock-access-token');
  });

  it('renders page title "Software Inventory"', async () => {
    render(<SoftwareInventory />, { initialEntries: ['/assets/software'] });
    expect(await screen.findByRole('heading', { name: /software inventory/i })).toBeInTheDocument();
  });

  it('renders search input', async () => {
    render(<SoftwareInventory />, { initialEntries: ['/assets/software'] });
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search')).toBeInTheDocument();
    });
  });

  it('renders Import from CSV button', async () => {
    render(<SoftwareInventory />, { initialEntries: ['/assets/software'] });
    expect(await screen.findByRole('button', { name: /import from csv/i })).toBeInTheDocument();
  });

  it('search input accepts text', async () => {
    const user = userEvent.setup();
    render(<SoftwareInventory />, { initialEntries: ['/assets/software'] });
    const searchInput = await screen.findByPlaceholderText('Search');
    await user.type(searchInput, 'Chrome');
    expect(searchInput).toHaveValue('Chrome');
  });
});
