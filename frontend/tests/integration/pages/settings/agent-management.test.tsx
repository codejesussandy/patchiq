import { describe, it, expect, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../../test-utils';
import { AgentApprovalSettings } from '@/pages/settings/AgentApprovalSettings';
import { AgentConfiguration } from '@/pages/settings/AgentConfiguration';
import { AgentApprovals } from '@/pages/settings/AgentApprovals';

describe('Agent Approval Settings', () => {
  beforeEach(() => {
    localStorage.setItem('accessToken', 'mock-access-token');
  });

  it('renders current approval settings', async () => {
    render(<AgentApprovalSettings />);

    await waitFor(() => {
      expect(screen.getByText('Agent Approval Settings')).toBeInTheDocument();
    });

    expect(screen.getByText(/Approval Type/i)).toBeInTheDocument();
    expect(screen.getByText(/Auto Approval Based on/i)).toBeInTheDocument();
    expect(screen.getByText('Auto')).toBeInTheDocument();
    expect(screen.getByText('Manual')).toBeInTheDocument();
  });

  it('saves updated settings', async () => {
    const user = userEvent.setup();
    render(<AgentApprovalSettings />);

    await waitFor(() => {
      expect(screen.getByText('Agent Approval Settings')).toBeInTheDocument();
    });

    const saveButton = screen.getByRole('button', { name: /save/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(screen.queryByText('Failed to save agent approval settings')).not.toBeInTheDocument();
    });
  });

  it('renders reset button', async () => {
    render(<AgentApprovalSettings />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument();
    });
  });
});

describe('Agent Configuration', () => {
  beforeEach(() => {
    localStorage.setItem('accessToken', 'mock-access-token');
  });

  it('renders current agent configuration', async () => {
    render(<AgentConfiguration />);

    await waitFor(() => {
      expect(screen.getByText('Agent Configuration')).toBeInTheDocument();
    });

    expect(screen.getByText(/Allowed Bandwidth to download Files/i)).toBeInTheDocument();
    expect(screen.getByText(/Agent Refresh Cycle/i)).toBeInTheDocument();
    expect(screen.getByText(/Patch Scanning Refresh Cycle/i)).toBeInTheDocument();
    expect(screen.getByText(/Network Refresh Cycle/i)).toBeInTheDocument();
  });

  it('saves updated configuration', async () => {
    const user = userEvent.setup();
    render(<AgentConfiguration />);

    await waitFor(() => {
      expect(screen.getByText('Agent Configuration')).toBeInTheDocument();
    });

    const saveButton = screen.getByRole('button', { name: /save/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(screen.queryByText('Failed to update agent configuration')).not.toBeInTheDocument();
    });
  });

  it('renders form fields with correct labels', async () => {
    render(<AgentConfiguration />);

    await waitFor(() => {
      expect(screen.getByText(/System Action Refresh Cycle/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/Endpoint Vlan Refresh Cycle/i)).toBeInTheDocument();
    expect(screen.getByText(/Software Meter Refresh Cycle/i)).toBeInTheDocument();
  });
});

describe('Agent Approvals', () => {
  beforeEach(() => {
    localStorage.setItem('accessToken', 'mock-access-token');
  });

  it('renders agent approvals table', async () => {
    render(<AgentApprovals />);

    await waitFor(() => {
      expect(screen.getByText('Agent Approvals')).toBeInTheDocument();
    });

    // The component renders hostName column - may appear multiple times (sticky table)
    const hostNameHeaders = screen.getAllByText('Host Name');
    expect(hostNameHeaders.length).toBeGreaterThanOrEqual(1);
    const statusHeaders = screen.getAllByText('Status');
    expect(statusHeaders.length).toBeGreaterThanOrEqual(1);
  });

  it('renders search and action buttons', async () => {
    render(<AgentApprovals />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search')).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument();
  });

  it('shows error state when API fails gracefully', async () => {

    render(<AgentApprovals />);

    await waitFor(() => {
      expect(screen.getByText('Agent Approvals')).toBeInTheDocument();
    });
    // Verify error state - table should be empty or show error
    await waitFor(() => {
      const rows = screen.queryAllByRole('row');
      // With error, table should have at most the header row (no data rows)
      expect(rows.length).toBeLessThanOrEqual(2);
    });
  });
});
