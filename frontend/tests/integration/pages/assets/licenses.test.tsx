import { describe, it, expect, beforeEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../../test-utils';
import { SoftwareLicense } from '@/pages/assets/SoftwareLicense';

describe('SoftwareLicense Page', () => {
  beforeEach(() => {
    localStorage.setItem('accessToken', 'mock-access-token');
  });

  // ── Render ──────────────────────────────────────────────────────────────────

  it('renders page title "Software Licenses"', async () => {
    render(<SoftwareLicense />, { initialEntries: ['/assets/licenses'] });
    expect(await screen.findByRole('heading', { name: /software licenses/i })).toBeInTheDocument();
  });

  it('renders New License button', async () => {
    render(<SoftwareLicense />, { initialEntries: ['/assets/licenses'] });
    expect(await screen.findByRole('button', { name: /new license/i })).toBeInTheDocument();
  });

  // ── Tabs ────────────────────────────────────────────────────────────────────

  it('renders both tab labels', async () => {
    render(<SoftwareLicense />, { initialEntries: ['/assets/licenses'] });
    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /application licenses/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /os licenses/i })).toBeInTheDocument();
    });
  });

  it('Application Licenses tab is active by default', async () => {
    render(<SoftwareLicense />, { initialEntries: ['/assets/licenses'] });
    await waitFor(() => {
      const tab = screen.getByRole('tab', { name: /application licenses/i });
      expect(tab).toHaveAttribute('aria-selected', 'true');
    });
  });

  it('OS Licenses tab is inactive by default', async () => {
    render(<SoftwareLicense />, { initialEntries: ['/assets/licenses'] });
    await waitFor(() => {
      const tab = screen.getByRole('tab', { name: /os licenses/i });
      expect(tab).toHaveAttribute('aria-selected', 'false');
    });
  });

  it('clicking OS Licenses tab activates it', async () => {
    const user = userEvent.setup();
    render(<SoftwareLicense />, { initialEntries: ['/assets/licenses'] });

    const osTab = await screen.findByRole('tab', { name: /os licenses/i });
    await user.click(osTab);

    await waitFor(() => {
      expect(osTab).toHaveAttribute('aria-selected', 'true');
    });
  });

  it('clicking OS Licenses tab deactivates Application Licenses tab', async () => {
    const user = userEvent.setup();
    render(<SoftwareLicense />, { initialEntries: ['/assets/licenses'] });

    await user.click(await screen.findByRole('tab', { name: /os licenses/i }));

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /application licenses/i })).toHaveAttribute('aria-selected', 'false');
    });
  });

  it('switching back to Application Licenses tab works', async () => {
    const user = userEvent.setup();
    render(<SoftwareLicense />, { initialEntries: ['/assets/licenses'] });

    await user.click(await screen.findByRole('tab', { name: /os licenses/i }));
    await user.click(await screen.findByRole('tab', { name: /application licenses/i }));

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /application licenses/i })).toHaveAttribute('aria-selected', 'true');
    });
  });

  // ── Application Licenses tab data ───────────────────────────────────────────

  it('shows software license data in Application Licenses tab', async () => {
    render(<SoftwareLicense />, { initialEntries: ['/assets/licenses'] });
    expect(await screen.findByText('Office 365 Enterprise')).toBeInTheDocument();
    expect(await screen.findByText('Adobe CC Team')).toBeInTheDocument();
  });

  it('shows vendor names in Application Licenses tab', async () => {
    render(<SoftwareLicense />, { initialEntries: ['/assets/licenses'] });
    expect(await screen.findByText('Microsoft')).toBeInTheDocument();
    expect(await screen.findByText('Adobe')).toBeInTheDocument();
  });

  // ── OS Licenses tab data ────────────────────────────────────────────────────

  it('shows OS license data after switching to OS Licenses tab', async () => {
    const user = userEvent.setup();
    render(<SoftwareLicense />, { initialEntries: ['/assets/licenses'] });

    await user.click(await screen.findByRole('tab', { name: /os licenses/i }));

    expect(await screen.findByText('Windows Server 2022')).toBeInTheDocument();
    expect(await screen.findByText('RHEL 9 Standard')).toBeInTheDocument();
  });

  it('shows OS type column in OS Licenses tab', async () => {
    const user = userEvent.setup();
    render(<SoftwareLicense />, { initialEntries: ['/assets/licenses'] });

    await user.click(await screen.findByRole('tab', { name: /os licenses/i }));

    await waitFor(() => {
      expect(screen.getByText('Windows')).toBeInTheDocument();
      expect(screen.getByText('Linux')).toBeInTheDocument();
    });
  });

  // ── Search ──────────────────────────────────────────────────────────────────

  it('renders search input on Application Licenses tab', async () => {
    render(<SoftwareLicense />, { initialEntries: ['/assets/licenses'] });
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search')).toBeInTheDocument();
    });
  });

  it('search input accepts text', async () => {
    const user = userEvent.setup();
    render(<SoftwareLicense />, { initialEntries: ['/assets/licenses'] });
    const searchInput = await screen.findByPlaceholderText('Search');
    await user.type(searchInput, 'Office');
    expect(searchInput).toHaveValue('Office');
  });

  it('search filters Application Licenses by name', async () => {
    const user = userEvent.setup();
    render(<SoftwareLicense />, { initialEntries: ['/assets/licenses'] });

    // Wait for data
    await screen.findByText('Office 365 Enterprise');
    await screen.findByText('Adobe CC Team');

    const searchInput = screen.getByPlaceholderText('Search');
    await user.type(searchInput, 'Office');

    await waitFor(() => {
      expect(screen.getByText('Office 365 Enterprise')).toBeInTheDocument();
      expect(screen.queryByText('Adobe CC Team')).not.toBeInTheDocument();
    });
  });

  it('search clears and shows all results when cleared', async () => {
    const user = userEvent.setup();
    render(<SoftwareLicense />, { initialEntries: ['/assets/licenses'] });

    await screen.findByText('Adobe CC Team');
    const searchInput = screen.getByPlaceholderText('Search');
    await user.type(searchInput, 'Office');
    await waitFor(() => expect(screen.queryByText('Adobe CC Team')).not.toBeInTheDocument());

    await user.clear(searchInput);
    await waitFor(() => {
      expect(screen.getByText('Office 365 Enterprise')).toBeInTheDocument();
      expect(screen.getByText('Adobe CC Team')).toBeInTheDocument();
    });
  });

  it('search resets when switching tabs', async () => {
    const user = userEvent.setup();
    render(<SoftwareLicense />, { initialEntries: ['/assets/licenses'] });

    await screen.findByText('Office 365 Enterprise');
    const [swSearch] = screen.getAllByPlaceholderText('Search');
    await user.type(swSearch, 'Office');
    expect(swSearch).toHaveValue('Office');

    // Switch tabs — useEffect resets searchText
    await user.click(screen.getByRole('tab', { name: /os licenses/i }));
    await user.click(screen.getByRole('tab', { name: /application licenses/i }));

    // After switch back, the search state is reset
    await waitFor(() => {
      const [resetSearch] = screen.getAllByPlaceholderText('Search');
      expect(resetSearch).toHaveValue('');
    });
  });

  // ── New License modal ───────────────────────────────────────────────────────

  it('clicking New License opens Add Software License modal on Application tab', async () => {
    const user = userEvent.setup();
    render(<SoftwareLicense />, { initialEntries: ['/assets/licenses'] });
    await user.click(await screen.findByRole('button', { name: /new license/i }));
    await waitFor(() => {
      expect(screen.getByText(/add new software license/i)).toBeInTheDocument();
    });
  });

  it('clicking New License on OS tab opens Add OS License modal', async () => {
    const user = userEvent.setup();
    render(<SoftwareLicense />, { initialEntries: ['/assets/licenses'] });

    await user.click(await screen.findByRole('tab', { name: /os licenses/i }));
    await user.click(await screen.findByRole('button', { name: /new license/i }));

    await waitFor(() => {
      expect(screen.getByText(/add new os license/i)).toBeInTheDocument();
    });
  });
});
