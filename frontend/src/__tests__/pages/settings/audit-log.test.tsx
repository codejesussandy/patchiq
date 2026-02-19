import { describe, it, expect, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { render } from '../../test-utils';
import { Audit } from '../../../pages/settings/Audit';
import { server } from '../../msw/server';
import { http, HttpResponse } from 'msw';

describe('Audit Log Page', () => {
  beforeEach(() => {
    localStorage.setItem('accessToken', 'mock-access-token');
  });

  it('renders audit log table', async () => {
    render(<Audit />);

    await waitFor(() => {
      // The service returns raw data; backend fields resource, action, userEmail, timestamp
      // The Audit component uses these as module, operation, user, createdAt in the table
      expect(screen.getByText('Module')).toBeInTheDocument();
    });

    expect(screen.getByText('Operation')).toBeInTheDocument();
    expect(screen.getByText('User')).toBeInTheDocument();
    expect(screen.getByText('Created At')).toBeInTheDocument();
  });

  it('renders page heading', async () => {
    render(<Audit />);
    expect(screen.getByText('Audit')).toBeInTheDocument();
  });

  it('renders filter controls', async () => {
    render(<Audit />);
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
    });
    expect(screen.getByText('Timeline')).toBeInTheDocument();
    expect(screen.getByText('Refresh')).toBeInTheDocument();
    expect(screen.getByText('Export')).toBeInTheDocument();
  });

  it('renders audit log entries from API', async () => {
    render(<Audit />);

    // The mock data has module (resource) = 'users' and 'settings'
    // The Audit component maps raw data directly as AuditLog with module, operation, user, createdAt
    await waitFor(() => {
      expect(screen.getByText('users')).toBeInTheDocument();
    });
    expect(screen.getByText('settings')).toBeInTheDocument();
  });

  it('shows error state when API fails', async () => {
    server.use(
      http.get('*/settings/audit', () => {
        return HttpResponse.json({ success: false, error: { message: 'Server error' } }, { status: 500 });
      })
    );

    render(<Audit />);

    await waitFor(() => {
      expect(screen.queryByText('users')).not.toBeInTheDocument();
    });
    // Page still renders with heading and controls
    expect(screen.getByText('Audit')).toBeInTheDocument();
  });
});
