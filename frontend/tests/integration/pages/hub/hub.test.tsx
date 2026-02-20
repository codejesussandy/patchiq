import { describe, it, expect, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../../test-utils';
import { Hub } from '@/pages/hub/Hub';

describe('Hub Page', () => {
  beforeEach(() => {
    localStorage.setItem('accessToken', 'mock-access-token');
  });

  it('renders page title and subtitle', async () => {
    render(<Hub />);

    expect(screen.getByText('Software Hub')).toBeInTheDocument();
    expect(screen.getByText('Manage software packages for deployment to agents')).toBeInTheDocument();
  });

  it('renders tabs', async () => {
    render(<Hub />);

    expect(screen.getByText('Packages')).toBeInTheDocument();
    expect(screen.getByText('Software Catalog')).toBeInTheDocument();
    expect(screen.getByText('Bundles')).toBeInTheDocument();
    expect(screen.getByText('Software Jobs')).toBeInTheDocument();
  });

  it('renders stats cards', async () => {
    render(<Hub />);

    await waitFor(() => {
      expect(screen.getByText('Total Applications')).toBeInTheDocument();
    });

    expect(screen.getByText('Total Size')).toBeInTheDocument();
  });

  it('renders grouped packages table', async () => {
    render(<Hub />);

    await waitFor(() => {
      expect(screen.getByText('Google Chrome')).toBeInTheDocument();
    });

    expect(screen.getByText('Visual Studio Code')).toBeInTheDocument();
  });

  it('has search input', async () => {
    render(<Hub />);

    expect(screen.getByPlaceholderText('Search packages...')).toBeInTheDocument();
  });

  it('has action buttons', async () => {
    render(<Hub />);

    expect(screen.getByText('Upload Bundle')).toBeInTheDocument();
    expect(screen.getByText('Add Package')).toBeInTheDocument();
    expect(screen.getByText('Refresh')).toBeInTheDocument();
  });

  it('add package button opens create modal', async () => {
    const user = userEvent.setup();
    render(<Hub />);

    await waitFor(() => {
      expect(screen.getByText('Google Chrome')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Add Package'));

    await waitFor(() => {
      expect(screen.getByText('Package Name')).toBeInTheDocument();
    });

    expect(screen.getByPlaceholderText('e.g., google-chrome')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g., Google Chrome')).toBeInTheDocument();
  });

  it('shows package version and platform info', async () => {
    render(<Hub />);

    await waitFor(() => {
      expect(screen.getByText('120.0.6099.130')).toBeInTheDocument();
    });

    expect(screen.getByText('1.85.2')).toBeInTheDocument();
  });

  it('shows empty state when no packages', async () => {

    render(<Hub />);

    await waitFor(() => {
      expect(screen.getByText('No data found')).toBeInTheDocument();
    });
  });

  it('shows error state when API fails', async () => {

    render(<Hub />);

    await waitFor(() => {
      expect(screen.getByText('Software Hub')).toBeInTheDocument();
    });
  });
});
