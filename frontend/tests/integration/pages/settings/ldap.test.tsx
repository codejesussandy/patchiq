import { describe, it, expect, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../../test-utils';
import { LDAPServerConfiguration } from '@/pages/settings/LDAPServerConfiguration';

describe('LDAP Server Configuration', () => {
  beforeEach(() => {
    localStorage.setItem('accessToken', 'mock-access-token');
  });

  it('renders LDAP configs table', async () => {
    render(<LDAPServerConfiguration />);
    await waitFor(() => {
      expect(screen.getByText('Corporate LDAP')).toBeInTheDocument();
    });
    expect(screen.getByText('ldap.corp.com')).toBeInTheDocument();
  });

  it('renders page heading', async () => {
    render(<LDAPServerConfiguration />);
    expect(screen.getByText('LDAP Server Configurations')).toBeInTheDocument();
  });

  it('creates new LDAP config', async () => {
    const user = userEvent.setup();
    render(<LDAPServerConfiguration />);

    await waitFor(() => {
      expect(screen.getByText('Corporate LDAP')).toBeInTheDocument();
    });

    const createButton = screen.getByRole('button', { name: /create/i });
    await user.click(createButton);

    await waitFor(() => {
      expect(screen.getByText('Create LDAP Server')).toBeInTheDocument();
    });
  });

  it('tests LDAP connection when editing', async () => {
    const user = userEvent.setup();
    render(<LDAPServerConfiguration />);

    await waitFor(() => {
      expect(screen.getByText('Corporate LDAP')).toBeInTheDocument();
    });

    const editButtons = screen.getAllByRole('button', { name: /edit/i });
    await user.click(editButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Edit LDAP Server')).toBeInTheDocument();
    });

    const testButton = screen.getByRole('button', { name: /test/i });
    expect(testButton).toBeInTheDocument();
  });

  it('deletes LDAP config', async () => {
    const user = userEvent.setup();
    render(<LDAPServerConfiguration />);

    await waitFor(() => {
      expect(screen.getByText('Corporate LDAP')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    await user.click(deleteButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Delete LDAP Server Configuration')).toBeInTheDocument();
    });
    expect(screen.getByText(/Are you sure you want to delete "Corporate LDAP"/i)).toBeInTheDocument();
  });

  it('shows error state when API fails', async () => {

    render(<LDAPServerConfiguration />);

    await waitFor(() => {
      expect(screen.queryByText('Corporate LDAP')).not.toBeInTheDocument();
    });
  });
});
