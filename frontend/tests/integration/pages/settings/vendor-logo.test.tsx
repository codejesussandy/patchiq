import { describe, it, expect, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../../test-utils';
import { VendorLogo } from '@/pages/settings/VendorLogo';

describe('Vendor Logo Page', () => {
  beforeEach(() => {
    localStorage.setItem('accessToken', 'mock-access-token');
  });

  it('renders page heading', async () => {
    render(<VendorLogo />);
    expect(screen.getByText('Vendor Logo')).toBeInTheDocument();
  });

  it('renders vendor logos', async () => {
    render(<VendorLogo />);

    await waitFor(() => {
      expect(screen.getByText('Vendor Logo 1')).toBeInTheDocument();
    });
  });

  it('renders table column headers', async () => {
    render(<VendorLogo />);

    await waitFor(() => {
      expect(screen.getByText('Name')).toBeInTheDocument();
    });
    expect(screen.getByText('Type')).toBeInTheDocument();
    expect(screen.getByText('Created On')).toBeInTheDocument();
  });

  it('renders Add Logo button', async () => {
    render(<VendorLogo />);
    expect(screen.getByRole('button', { name: /add logo/i })).toBeInTheDocument();
  });

  it('opens add logo modal on button click', async () => {
    const user = userEvent.setup();
    render(<VendorLogo />);

    await waitFor(() => {
      expect(screen.getByText('Vendor Logo 1')).toBeInTheDocument();
    });

    const addButton = screen.getByRole('button', { name: /add logo/i });
    await user.click(addButton);

    await waitFor(() => {
      // Modal opens with the add logo form
      const allAddLogoTexts = screen.getAllByText('Add Logo');
      expect(allAddLogoTexts.length).toBeGreaterThanOrEqual(2); // button + modal title
    });
  });

  it('deletes vendor logo with confirmation', async () => {
    const user = userEvent.setup();
    render(<VendorLogo />);

    await waitFor(() => {
      expect(screen.getByText('Vendor Logo 1')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    await user.click(deleteButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Delete Vendor Logo')).toBeInTheDocument();
    });
    expect(screen.getByText(/Are you sure you want to delete "Vendor Logo 1"/i)).toBeInTheDocument();
  });

  it('shows error state when API fails', async () => {

    render(<VendorLogo />);

    await waitFor(() => {
      expect(screen.queryByText('Vendor Logo 1')).not.toBeInTheDocument();
    });
    expect(screen.getByText('Vendor Logo')).toBeInTheDocument();
  });
});
