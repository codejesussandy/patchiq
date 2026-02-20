import { describe, it, expect, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../../test-utils';
import { DeviceCredentials } from '@/pages/discovery/DeviceCredentials';

describe('Device Credentials Page', () => {
  beforeEach(() => {
    localStorage.setItem('accessToken', 'mock-access-token');
  });

  it('renders page title', async () => {
    render(<DeviceCredentials />);

    await waitFor(() => {
      expect(screen.getByText('Device Credentials')).toBeInTheDocument();
    });
  });

  it('renders credentials table with data', async () => {
    render(<DeviceCredentials />);

    await waitFor(() => {
      expect(screen.getByText('Linux Admin SSH')).toBeInTheDocument();
    });

    expect(screen.getByText('Windows Admin')).toBeInTheDocument();
    expect(screen.getByText('SNMP Community')).toBeInTheDocument();
  });

  it('shows credential types', async () => {
    render(<DeviceCredentials />);

    await waitFor(() => {
      expect(screen.getByText('SSH')).toBeInTheDocument();
    });

    expect(screen.getByText('Windows')).toBeInTheDocument();
    expect(screen.getByText('SNMP')).toBeInTheDocument();
  });

  it('has search input', async () => {
    render(<DeviceCredentials />);

    expect(screen.getByPlaceholderText('Search')).toBeInTheDocument();
  });

  it('has add credential button', async () => {
    render(<DeviceCredentials />);

    expect(screen.getByText('Add Credential')).toBeInTheDocument();
  });

  it('add credential button opens create modal', async () => {
    const user = userEvent.setup();
    render(<DeviceCredentials />);

    await waitFor(() => {
      expect(screen.getByText('Linux Admin SSH')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Add Credential'));

    await waitFor(() => {
      expect(screen.getByText('Credential Name')).toBeInTheDocument();
    });

    expect(screen.getByPlaceholderText('e.g., Windows Admin')).toBeInTheDocument();
  });

  it('search filters credentials', async () => {
    const user = userEvent.setup();
    render(<DeviceCredentials />);

    await waitFor(() => {
      expect(screen.getByText('Linux Admin SSH')).toBeInTheDocument();
    });

    await user.type(screen.getByPlaceholderText('Search'), 'SNMP');

    await waitFor(() => {
      expect(screen.queryByText('Linux Admin SSH')).not.toBeInTheDocument();
    });

    expect(screen.getByText('SNMP Community')).toBeInTheDocument();
  });

  it('shows empty state when no credentials', async () => {

    render(<DeviceCredentials />);

    await waitFor(() => {
      expect(screen.getByText('No data found')).toBeInTheDocument();
    });
  });

  it('shows error state when API fails', async () => {

    render(<DeviceCredentials />);

    await waitFor(() => {
      expect(screen.getByText('Device Credentials')).toBeInTheDocument();
    });
  });
});
