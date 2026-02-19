import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../../test-utils';
import { SoftwareLicense } from '../../../pages/assets/SoftwareLicense';

describe('SoftwareLicense Page', () => {
  beforeEach(() => {
    localStorage.setItem('accessToken', 'mock-access-token');
  });

  it('renders page title "Software Licenses"', async () => {
    render(<SoftwareLicense />, { initialEntries: ['/assets/licenses'] });
    expect(await screen.findByRole('heading', { name: /software licenses/i })).toBeInTheDocument();
  });

  it('renders New License button', async () => {
    render(<SoftwareLicense />, { initialEntries: ['/assets/licenses'] });
    expect(await screen.findByRole('button', { name: /new license/i })).toBeInTheDocument();
  });

  it('renders Application Licenses and OS Licenses tabs', async () => {
    render(<SoftwareLicense />, { initialEntries: ['/assets/licenses'] });
    await waitFor(() => {
      expect(screen.getByText('Application Licenses')).toBeInTheDocument();
      expect(screen.getByText('OS Licenses')).toBeInTheDocument();
    });
  });

  it('renders search input', async () => {
    render(<SoftwareLicense />, { initialEntries: ['/assets/licenses'] });
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search')).toBeInTheDocument();
    });
  });

  it('search input accepts text', async () => {
    const user = userEvent.setup();
    render(<SoftwareLicense />, { initialEntries: ['/assets/licenses'] });
    const searchInput = await screen.findByPlaceholderText('Search');
    await user.type(searchInput, 'Office');
    expect(searchInput).toHaveValue('Office');
  });

  it('clicking New License opens modal', async () => {
    const user = userEvent.setup();
    render(<SoftwareLicense />, { initialEntries: ['/assets/licenses'] });
    const newBtn = await screen.findByRole('button', { name: /new license/i });
    await user.click(newBtn);
    await waitFor(() => {
      expect(screen.getByText(/add new software license/i)).toBeInTheDocument();
    });
  });
});
