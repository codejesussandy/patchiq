import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../test-utils';
import { NotificationPreferences } from '@/pages/settings/NotificationPreferences';

vi.mock('@/hooks/useNotifications', () => ({
  useNotificationPreferences: vi.fn(() => ({
    data: {
      agentInApp: true,
      agentEmail: false,
      deploymentInApp: true,
      deploymentEmail: false,
      vulnerabilityInApp: true,
      vulnerabilityEmail: true,
      alertInApp: true,
      alertEmail: true,
      systemInApp: true,
      systemEmail: false,
    },
    isLoading: false,
  })),
  useUpdateNotificationPreferences: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
}));

describe('NotificationPreferences', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the title', () => {
    render(<NotificationPreferences />);
    expect(screen.getByText('Notification Preferences')).toBeInTheDocument();
  });

  it('renders notification categories', () => {
    render(<NotificationPreferences />);
    expect(screen.getByText('Agent')).toBeInTheDocument();
    expect(screen.getByText('Deployment')).toBeInTheDocument();
    expect(screen.getByText('Vulnerability')).toBeInTheDocument();
    expect(screen.getByText('Alert')).toBeInTheDocument();
    expect(screen.getByText('System')).toBeInTheDocument();
  });

  it('renders channel columns', () => {
    render(<NotificationPreferences />);
    expect(screen.getAllByText('In-App')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Email')[0]).toBeInTheDocument();
  });

  it('renders Save Preferences button', () => {
    render(<NotificationPreferences />);
    expect(screen.getByRole('button', { name: /save preferences/i })).toBeInTheDocument();
  });

  it('renders the page title element', () => {
    render(<NotificationPreferences />);
    expect(screen.getByText('Notification Preferences')).toBeInTheDocument();
  });
});
