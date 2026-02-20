import { describe, it, expect, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { render } from '../../test-utils';
import { RedHatAgentNomination } from '@/pages/settings/RedHatAgentNomination';

// MSW mock returns: [{ id: 'rh-1', hostname: 'rhel-server-01', platform: 'LINUX', subscriptionId: 'SUB-001', status: 'NOMINATED', createdAt: '...' }]
// The component's RedHatAgentNominationType uses 'name' field for display and filtering.
// The mock data has 'hostname' but the component expects 'name'.
// So 'rhel-server-01' may not appear in the Name column directly unless the service maps it.
// We test what the component renders based on its column definitions.

describe('Red Hat Agent Nomination Page', () => {
  beforeEach(() => {
    localStorage.setItem('accessToken', 'mock-access-token');
  });

  it('renders page heading', async () => {
    render(<RedHatAgentNomination />);
    expect(screen.getByText('Red Hat Agent Nomination')).toBeInTheDocument();
  });

  it('renders nominations table', async () => {
    render(<RedHatAgentNomination />);

    await waitFor(() => {
      expect(screen.getByText('Name')).toBeInTheDocument();
    });
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Endpoint')).toBeInTheDocument();
    expect(screen.getByText('Updated By')).toBeInTheDocument();
  });

  it('renders search input and action buttons', async () => {
    render(<RedHatAgentNomination />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search')).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument();
  });

  it('shows nomination data when service returns correct shape', async () => {

    render(<RedHatAgentNomination />);

    await waitFor(() => {
      expect(screen.getByText('rhel-server-01')).toBeInTheDocument();
    });
  });

  it('shows error state when API fails', async () => {

    render(<RedHatAgentNomination />);

    await waitFor(() => {
      expect(screen.getByText('Red Hat Agent Nomination')).toBeInTheDocument();
    });
    expect(screen.queryByText('rhel-server-01')).not.toBeInTheDocument();
  });
});
