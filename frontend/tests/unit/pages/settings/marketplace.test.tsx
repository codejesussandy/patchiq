import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../test-utils';
import { MarketPlace } from '@/pages/settings/MarketPlace';

vi.mock('@/hooks/useSettings', () => ({
  useIntegrations: vi.fn(() => ({
    data: [
      { id: '1', name: 'Slack Integration', description: 'Send notifications to Slack', type: 'Webhook', status: true, createdBy: 'admin', createdAt: '2024-01-01T00:00:00Z', recipients: [] },
      { id: '2', name: 'Email Gateway', description: 'SMTP email integration', type: 'Email', status: false, createdBy: 'admin', createdAt: '2024-02-01T00:00:00Z', recipients: [] },
    ],
    isLoading: false,
  })),
  useCreateIntegration: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useUpdateIntegration: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useDeleteIntegration: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useToggleIntegrationStatus: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
}));

vi.mock('@/hooks/useModal', () => ({
  useModal: vi.fn(() => ({
    open: false,
    selectedItem: null,
    onOpen: vi.fn(),
    onClose: vi.fn(),
  })),
}));

describe('MarketPlace', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the page title', () => {
    render(<MarketPlace />);
    expect(screen.getByText('Market Place')).toBeInTheDocument();
  });

  it('renders search input', () => {
    render(<MarketPlace />);
    expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
  });

  it('renders Create button', () => {
    render(<MarketPlace />);
    expect(screen.getByRole('button', { name: /create/i })).toBeInTheDocument();
  });

  it('renders integration data in table', () => {
    render(<MarketPlace />);
    expect(screen.getByText('Slack Integration')).toBeInTheDocument();
    expect(screen.getByText('Email Gateway')).toBeInTheDocument();
  });

  it('renders column headers', () => {
    render(<MarketPlace />);
    expect(screen.getByText('Integration Name')).toBeInTheDocument();
    expect(screen.getByText('Integration Type')).toBeInTheDocument();
  });
});
