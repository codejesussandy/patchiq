import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../../test-utils';
import { OSLicenses } from '../../../pages/assets/OSLicenses';

describe('OSLicenses Page', () => {
  beforeEach(() => {
    localStorage.setItem('accessToken', 'mock-access-token');
  });

  it('renders page title "OS License"', async () => {
    render(<OSLicenses />, { initialEntries: ['/assets/os-licenses'] });
    expect(await screen.findByRole('heading', { name: /os license/i })).toBeInTheDocument();
  });

  it('renders New License button', async () => {
    render(<OSLicenses />, { initialEntries: ['/assets/os-licenses'] });
    expect(await screen.findByRole('button', { name: /new license/i })).toBeInTheDocument();
  });

  it('renders Auto Fetch button', async () => {
    render(<OSLicenses />, { initialEntries: ['/assets/os-licenses'] });
    expect(await screen.findByRole('button', { name: /auto fetch/i })).toBeInTheDocument();
  });

  it('renders search input', async () => {
    render(<OSLicenses />, { initialEntries: ['/assets/os-licenses'] });
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search')).toBeInTheDocument();
    });
  });
});
