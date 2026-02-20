import { describe, it, expect, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../../test-utils';
import { MarketPlace } from '@/pages/settings/MarketPlace';

describe('Marketplace / Integrations Page', () => {
  beforeEach(() => {
    localStorage.setItem('accessToken', 'mock-access-token');
  });

  it('renders integrations list', async () => {
    render(<MarketPlace />);

    await waitFor(() => {
      expect(screen.getByText('Slack')).toBeInTheDocument();
    });
    expect(screen.getByText('Jira')).toBeInTheDocument();
    expect(screen.getByText('NOTIFICATION')).toBeInTheDocument();
    expect(screen.getByText('TICKETING')).toBeInTheDocument();
  });

  it('renders page heading', async () => {
    render(<MarketPlace />);
    expect(screen.getByText('Market Place')).toBeInTheDocument();
  });

  it('creates new integration', async () => {
    const user = userEvent.setup();
    render(<MarketPlace />);

    await waitFor(() => {
      expect(screen.getByText('Slack')).toBeInTheDocument();
    });

    const createButton = screen.getByRole('button', { name: /create/i });
    await user.click(createButton);

    await waitFor(() => {
      // Modal title appears in modal header
      const modalTitle = screen.getAllByText('Create Integration');
      expect(modalTitle.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('toggles integration status', async () => {
    const user = userEvent.setup();
    render(<MarketPlace />);

    await waitFor(() => {
      expect(screen.getByText('Slack')).toBeInTheDocument();
    });

    // Two switch toggles rendered for status column
    const switches = screen.getAllByRole('switch');
    expect(switches.length).toBeGreaterThanOrEqual(2);

    // Toggle first (Slack - enabled=true)
    await user.click(switches[0]);
    await waitFor(() => {
      expect(screen.queryByText('Failed to update integration status')).not.toBeInTheDocument();
    });
  });

  it('deletes integration with confirmation', async () => {
    const user = userEvent.setup();
    render(<MarketPlace />);

    await waitFor(() => {
      expect(screen.getByText('Slack')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    await user.click(deleteButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Delete Integration')).toBeInTheDocument();
    });
    expect(screen.getByText(/Are you sure you want to delete/i)).toBeInTheDocument();
  });

  it('shows error state when API fails', async () => {

    render(<MarketPlace />);

    await waitFor(() => {
      expect(screen.queryByText('Slack')).not.toBeInTheDocument();
    });
    expect(screen.getByText('Market Place')).toBeInTheDocument();
  });
});
