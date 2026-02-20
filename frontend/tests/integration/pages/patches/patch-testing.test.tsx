import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../../test-utils';
import { PatchTestApprove } from '@/pages/patches/PatchTestApprove';

describe('PatchTestApprove Page', () => {
  beforeEach(() => {
    localStorage.setItem('accessToken', 'mock-access-token');
  });

  it('renders page title "Patch Test and Approve"', async () => {
    render(<PatchTestApprove />, { initialEntries: ['/patches/test-approve'] });

    await waitFor(() => {
      expect(screen.getByText('Patch Test and Approve')).toBeInTheDocument();
    });
  });

  it('renders Create button', async () => {
    render(<PatchTestApprove />, { initialEntries: ['/patches/test-approve'] });

    await waitFor(() => {
      expect(screen.getByText('Create')).toBeInTheDocument();
    });
  });

  it('renders search input', async () => {
    render(<PatchTestApprove />, { initialEntries: ['/patches/test-approve'] });

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search tests')).toBeInTheDocument();
    });
  });

  it('search input accepts text', async () => {
    const user = userEvent.setup();
    render(<PatchTestApprove />, { initialEntries: ['/patches/test-approve'] });

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search tests')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search tests');
    await user.type(searchInput, 'Windows');
    expect(searchInput).toHaveValue('Windows');
  });

  it('clicking Create opens modal with title "Create Patch Test"', async () => {
    const user = userEvent.setup();
    render(<PatchTestApprove />, { initialEntries: ['/patches/test-approve'] });

    await waitFor(() => {
      expect(screen.getByText('Create')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Create'));

    await waitFor(() => {
      expect(screen.getByText('Create Patch Test')).toBeInTheDocument();
    });
  });
});
