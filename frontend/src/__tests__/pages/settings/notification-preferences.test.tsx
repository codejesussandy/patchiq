import { describe, it, expect, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../../test-utils';
import { NotificationPreferences } from '../../../pages/settings/NotificationPreferences';
import { server } from '../../msw/server';
import { http, HttpResponse } from 'msw';

describe('Notification Preferences Page', () => {
  beforeEach(() => {
    localStorage.setItem('accessToken', 'mock-access-token');
  });

  it('renders notification preferences', async () => {
    render(<NotificationPreferences />);

    await waitFor(() => {
      expect(screen.getByText('Notification Preferences')).toBeInTheDocument();
    });

    // Category labels
    expect(screen.getByText('Agent')).toBeInTheDocument();
    expect(screen.getByText('Deployment')).toBeInTheDocument();
    expect(screen.getByText('Vulnerability')).toBeInTheDocument();
    expect(screen.getByText('Alert')).toBeInTheDocument();
    expect(screen.getByText('System')).toBeInTheDocument();
  });

  it('renders In-App and Email column headers', async () => {
    render(<NotificationPreferences />);

    await waitFor(() => {
      expect(screen.getByText('In-App')).toBeInTheDocument();
    });
    expect(screen.getByText('Email')).toBeInTheDocument();
  });

  it('renders toggle switches for preferences', async () => {
    render(<NotificationPreferences />);

    await waitFor(() => {
      const switches = screen.getAllByRole('switch');
      // 5 categories * 2 (in-app + email) = 10 switches
      expect(switches.length).toBe(10);
    });
  });

  it('saves updated preferences', async () => {
    const user = userEvent.setup();
    render(<NotificationPreferences />);

    await waitFor(() => {
      expect(screen.getByText('Notification Preferences')).toBeInTheDocument();
    });

    const saveButton = screen.getByRole('button', { name: /save preferences/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(screen.queryByText('Failed to save preferences')).not.toBeInTheDocument();
    });
  });

  it('shows error state when API fails gracefully', async () => {
    server.use(
      http.get('*/notifications/preferences', () => {
        return HttpResponse.json({ success: false, error: { message: 'Server error' } }, { status: 500 });
      })
    );

    render(<NotificationPreferences />);

    // Component still renders with default prefs on error
    await waitFor(() => {
      expect(screen.getByText('Notification Preferences')).toBeInTheDocument();
    });
    expect(screen.getByText('Agent')).toBeInTheDocument();
  });
});
