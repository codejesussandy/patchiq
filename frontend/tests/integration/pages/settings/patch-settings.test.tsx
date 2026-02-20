import { describe, it, expect, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../../test-utils';
import { PatchPreferences } from '@/pages/settings/PatchPreferences';
import { VulnerabilityPreference } from '@/pages/settings/VulnerabilityPreference';

describe('Patch Preferences', () => {
  beforeEach(() => {
    localStorage.setItem('accessToken', 'mock-access-token');
  });

  it('renders current patch preferences from API', async () => {
    render(<PatchPreferences />);
    await waitFor(() => {
      expect(screen.getByText('Patch Preferences')).toBeInTheDocument();
    });
    expect(screen.getByText('Enable Patching')).toBeInTheDocument();
    expect(screen.getByText('Patch Sync for OS')).toBeInTheDocument();
    expect(screen.getByText('Patch Approval Policy')).toBeInTheDocument();
  });

  it('saves updated preferences', async () => {
    const user = userEvent.setup();
    render(<PatchPreferences />);

    await waitFor(() => {
      expect(screen.getByText('Patch Preferences')).toBeInTheDocument();
    });

    const saveButton = screen.getByRole('button', { name: /save/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(screen.queryByText('Failed to update patch preferences')).not.toBeInTheDocument();
    });
  });

  it('syncs patches now', async () => {
    const user = userEvent.setup();
    render(<PatchPreferences />);

    await waitFor(() => {
      expect(screen.getByText('Patch Preferences')).toBeInTheDocument();
    });

    const syncButton = screen.getByRole('button', { name: /sync now/i });
    await user.click(syncButton);

    await waitFor(() => {
      expect(screen.queryByText('Failed to sync patches')).not.toBeInTheDocument();
    });
  });

  it('shows sync now and reset buttons', async () => {
    render(<PatchPreferences />);
    await waitFor(() => {
      expect(screen.getByText('Patch Preferences')).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /sync now/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument();
  });
});

describe('Vulnerability Preference', () => {
  beforeEach(() => {
    localStorage.setItem('accessToken', 'mock-access-token');
  });

  it('renders current vulnerability preferences', async () => {
    render(<VulnerabilityPreference />);
    await waitFor(() => {
      expect(screen.getByText('Vulnerability Preference')).toBeInTheDocument();
    });
    expect(screen.getByText('Vulnerability Scan Job Time')).toBeInTheDocument();
    expect(screen.getByText('Vulnerability Database Sync Time')).toBeInTheDocument();
    expect(screen.getByText('Total CVE Available')).toBeInTheDocument();
  });

  it('saves updated preferences', async () => {
    const user = userEvent.setup();
    render(<VulnerabilityPreference />);

    await waitFor(() => {
      expect(screen.getByText('Vulnerability Preference')).toBeInTheDocument();
    });

    const saveButton = screen.getByRole('button', { name: /save/i });
    await user.click(saveButton);

    // Verify save succeeded
    await waitFor(() => {
      expect(screen.queryByText(/failed/i)).not.toBeInTheDocument();
    });
  });

  it('syncs vulnerability database', async () => {
    const user = userEvent.setup();
    render(<VulnerabilityPreference />);

    await waitFor(() => {
      expect(screen.getByText('Vulnerability Preference')).toBeInTheDocument();
    });

    const syncButton = screen.getByRole('button', { name: /sync now/i });
    await user.click(syncButton);

    await waitFor(() => {
      expect(screen.queryByText('Failed to sync vulnerability database')).not.toBeInTheDocument();
    });
  });

  it('renders last sync time when data is loaded', async () => {
    render(<VulnerabilityPreference />);
    await waitFor(() => {
      expect(screen.getByText(/Last Vulnerability Database sync was performed at/i)).toBeInTheDocument();
    });
  });
});
