import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../test-utils';
import { PolicyManagement } from '@/pages/settings/PolicyManagement';

vi.mock('@/hooks/useSettings', () => ({
  useAlertPolicies: vi.fn(() => ({
    data: [
      { id: '1', name: 'Critical Alert', type: 'Email', channel: 'SMTP', recipients: 'admin@test.com', enabled: true, createdAt: '2024-01-01T00:00:00Z', description: 'Alert on critical events' },
      { id: '2', name: 'Deployment Notify', type: 'Webhook', channel: 'Slack', recipients: '#ops', enabled: false, createdAt: '2024-02-01T00:00:00Z', description: 'Notify on deployments' },
    ],
    isLoading: false,
    refetch: vi.fn(),
  })),
  useCreateAlertPolicy: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useUpdateAlertPolicy: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useDeleteAlertPolicy: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
}));

vi.mock('@/hooks/useModal', () => ({
  useModal: vi.fn(() => ({
    open: false,
    selectedItem: null,
    onOpen: vi.fn(),
    onClose: vi.fn(),
  })),
}));

describe('PolicyManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the page title', () => {
    render(<PolicyManagement />);
    expect(screen.getByText('Alert Configurations')).toBeInTheDocument();
  });

  it('renders Create button', () => {
    render(<PolicyManagement />);
    expect(screen.getByRole('button', { name: /create/i })).toBeInTheDocument();
  });

  it('renders search input', () => {
    render(<PolicyManagement />);
    expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
  });

  it('renders alert configuration data in table', () => {
    render(<PolicyManagement />);
    expect(screen.getByText('Critical Alert')).toBeInTheDocument();
    expect(screen.getByText('Deployment Notify')).toBeInTheDocument();
  });

  it('renders enabled/disabled status', () => {
    render(<PolicyManagement />);
    expect(screen.getByText('Enabled')).toBeInTheDocument();
    expect(screen.getByText('Disabled')).toBeInTheDocument();
  });
});
