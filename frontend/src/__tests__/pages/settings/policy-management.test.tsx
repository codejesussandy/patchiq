import { describe, it, expect, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../../test-utils';
import { PolicyManagement } from '../../../pages/settings/PolicyManagement';
import { server } from '../../msw/server';
import { http, HttpResponse } from 'msw';

describe('Policy Management (Alert Policies)', () => {
  beforeEach(() => {
    localStorage.setItem('accessToken', 'mock-access-token');
  });

  it('renders alert policies table', async () => {
    render(<PolicyManagement />);

    await waitFor(() => {
      expect(screen.getByText('Critical Alert')).toBeInTheDocument();
    });
  });

  it('renders page heading', async () => {
    render(<PolicyManagement />);
    expect(screen.getByText('Alert Configurations')).toBeInTheDocument();
  });

  it('creates new alert policy', async () => {
    const user = userEvent.setup();
    render(<PolicyManagement />);

    await waitFor(() => {
      expect(screen.getByText('Critical Alert')).toBeInTheDocument();
    });

    const createButton = screen.getByRole('button', { name: /create/i });
    await user.click(createButton);

    await waitFor(() => {
      expect(screen.getByText('Create Alert Configuration')).toBeInTheDocument();
    });
  });

  it('deletes alert policy with confirmation', async () => {
    const user = userEvent.setup();
    render(<PolicyManagement />);

    await waitFor(() => {
      expect(screen.getByText('Critical Alert')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    await user.click(deleteButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Delete Alert Configuration')).toBeInTheDocument();
    });
    expect(screen.getByText(/Are you sure you want to delete "Critical Alert"/i)).toBeInTheDocument();
  });

  it('renders table column headers', async () => {
    render(<PolicyManagement />);

    await waitFor(() => {
      expect(screen.getByText('Name')).toBeInTheDocument();
    });
    expect(screen.getByText('Type')).toBeInTheDocument();
    expect(screen.getByText('Channel')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
  });

  it('shows error state when API fails', async () => {
    server.use(
      http.get('*/settings/alerts', () => {
        return HttpResponse.json({ success: false, error: { message: 'Server error' } }, { status: 500 });
      })
    );

    render(<PolicyManagement />);

    await waitFor(() => {
      expect(screen.queryByText('Critical Alert')).not.toBeInTheDocument();
    });
    expect(screen.getByText('Alert Configurations')).toBeInTheDocument();
  });
});
