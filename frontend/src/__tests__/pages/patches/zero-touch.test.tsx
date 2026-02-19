import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../../test-utils';
import { ZeroTouchDeployment } from '../../../pages/patches/ZeroTouchDeployment';

describe('ZeroTouchDeployment Page', () => {
  beforeEach(() => {
    localStorage.setItem('accessToken', 'mock-access-token');
  });

  it('renders page title "Zero Touch Deployment"', async () => {
    render(<ZeroTouchDeployment />, { initialEntries: ['/patches/zero-touch'] });

    await waitFor(() => {
      expect(screen.getByText('Zero Touch Deployment')).toBeInTheDocument();
    });
  });

  it('renders Create button', async () => {
    render(<ZeroTouchDeployment />, { initialEntries: ['/patches/zero-touch'] });

    await waitFor(() => {
      expect(screen.getByText('Create')).toBeInTheDocument();
    });
  });

  it('renders search input', async () => {
    render(<ZeroTouchDeployment />, { initialEntries: ['/patches/zero-touch'] });

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search configurations')).toBeInTheDocument();
    });
  });

  it('search input accepts text', async () => {
    const user = userEvent.setup();
    render(<ZeroTouchDeployment />, { initialEntries: ['/patches/zero-touch'] });

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search configurations')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search configurations');
    await user.type(searchInput, 'Critical');
    expect(searchInput).toHaveValue('Critical');
  });

  it('clicking Create opens modal with title "Create Zero Touch Configuration"', async () => {
    const user = userEvent.setup();
    render(<ZeroTouchDeployment />, { initialEntries: ['/patches/zero-touch'] });

    await waitFor(() => {
      expect(screen.getByText('Create')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Create'));

    await waitFor(() => {
      expect(screen.getByText('Create Zero Touch Configuration')).toBeInTheDocument();
    });
  });
});
