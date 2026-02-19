import { describe, it, expect, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../../test-utils';
import { ComputerGroups } from '../../../pages/settings/ComputerGroups';
import { server } from '../../msw/server';
import { http, HttpResponse } from 'msw';

describe('Computer Groups Page', () => {
  beforeEach(() => {
    localStorage.setItem('accessToken', 'mock-access-token');
  });

  it('renders computer groups table', async () => {
    render(<ComputerGroups />);
    await waitFor(() => {
      expect(screen.getByText('All Servers')).toBeInTheDocument();
    });
    expect(screen.getByText('Windows Workstations')).toBeInTheDocument();
    expect(screen.getByText('All server endpoints')).toBeInTheDocument();
  });

  it('renders page heading', async () => {
    render(<ComputerGroups />);
    expect(screen.getByText('Computer Groups')).toBeInTheDocument();
  });

  it('creates new computer group', async () => {
    const user = userEvent.setup();
    render(<ComputerGroups />);

    await waitFor(() => {
      expect(screen.getByText('All Servers')).toBeInTheDocument();
    });

    const createButton = screen.getByRole('button', { name: /create/i });
    await user.click(createButton);

    await waitFor(() => {
      expect(screen.getByText('Create Computer Group')).toBeInTheDocument();
    });
  });

  it('deletes computer group with confirmation', async () => {
    const user = userEvent.setup();
    render(<ComputerGroups />);

    await waitFor(() => {
      expect(screen.getByText('All Servers')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    await user.click(deleteButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Delete Computer Group')).toBeInTheDocument();
    });
    expect(screen.getByText(/Are you sure you want to delete/i)).toBeInTheDocument();
  });

  it('searches computer groups', async () => {
    const user = userEvent.setup();
    render(<ComputerGroups />);

    await waitFor(() => {
      expect(screen.getByText('All Servers')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search...');
    await user.type(searchInput, 'Windows');

    await waitFor(() => {
      expect(screen.queryByText('All Servers')).not.toBeInTheDocument();
    });
    expect(screen.getByText('Windows Workstations')).toBeInTheDocument();
  });

  it('shows empty state when no groups found', async () => {
    server.use(
      http.get('*/settings/computer-groups', () => {
        return HttpResponse.json({ success: true, data: { data: [], total: 0, page: 1, limit: 20, totalPages: 1 } });
      })
    );

    render(<ComputerGroups />);

    await waitFor(() => {
      expect(screen.getByText('No computer groups found')).toBeInTheDocument();
    });
  });

  it('shows error state when API fails', async () => {
    server.use(
      http.get('*/settings/computer-groups', () => {
        return HttpResponse.json({ success: false, error: { message: 'Server error' } }, { status: 500 });
      })
    );

    render(<ComputerGroups />);

    await waitFor(() => {
      expect(screen.queryByText('All Servers')).not.toBeInTheDocument();
    });
  });
});
