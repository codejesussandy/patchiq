import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../test-utils';
import { DeploymentPolicies } from '@/pages/settings/DeploymentPolicies';

vi.mock('@/hooks/useSettings', () => ({
  useSettingsDeploymentPolicies: vi.fn(() => ({
    data: [
      { id: '1', name: 'Daily Patch Policy', description: 'Deploy daily', type: 'SCHEDULE', supportedModule: 'Patch', relatedType: 'Critical', createdBy: 'admin', createdAt: '2024-01-01T00:00:00Z' },
      { id: '2', name: 'Instant Update', description: 'Instant deploy', type: 'INSTANT', supportedModule: 'Update', relatedType: 'Important', createdBy: 'admin', createdAt: '2024-02-01T00:00:00Z' },
    ],
    isLoading: false,
    refetch: vi.fn(),
  })),
  useCreateSettingsDeploymentPolicy: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useUpdateSettingsDeploymentPolicy: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useDeleteSettingsDeploymentPolicy: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
}));

vi.mock('@/hooks/useModal', () => ({
  useModal: vi.fn(() => ({
    open: false,
    selectedItem: null,
    onOpen: vi.fn(),
    onClose: vi.fn(),
  })),
}));

describe('DeploymentPolicies', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the page title', () => {
    render(<DeploymentPolicies />);
    expect(screen.getByText('Deployment Policies')).toBeInTheDocument();
  });

  it('renders Create button', () => {
    render(<DeploymentPolicies />);
    expect(screen.getByRole('button', { name: /create/i })).toBeInTheDocument();
  });

  it('renders search input', () => {
    render(<DeploymentPolicies />);
    expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
  });

  it('renders policy data in table', () => {
    render(<DeploymentPolicies />);
    expect(screen.getByText('Daily Patch Policy')).toBeInTheDocument();
    expect(screen.getByText('Instant Update')).toBeInTheDocument();
  });

  it('renders policy type badges', () => {
    render(<DeploymentPolicies />);
    expect(screen.getByText('SCHEDULE')).toBeInTheDocument();
    expect(screen.getByText('INSTANT')).toBeInTheDocument();
  });
});
