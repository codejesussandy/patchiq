import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { render } from '../../test-utils';
import { SoftwareJobsDeployed } from '@/pages/jobs/SoftwareJobsDeployed';

vi.mock('@/hooks/useJobs', () => ({
  useSoftwareDeployments: vi.fn(() => ({ data: [], isLoading: false, refetch: vi.fn() })),
  useCreateSoftwareDeployment: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useTriggerRollback: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useSoftwarePackages: vi.fn(() => ({ data: [] })),
  useSoftwareBundles: vi.fn(() => ({ data: [] })),
  useSoftwareAgents: vi.fn(() => ({ data: [] })),
  useSoftwareDeployment: vi.fn(() => ({ data: null, refetch: vi.fn() })),
}));

vi.mock('@/hooks/useModal', () => ({
  useModal: vi.fn(() => ({ open: false, selectedItem: null, onOpen: vi.fn(), onClose: vi.fn() })),
}));

describe('SoftwareJobsDeployed (standalone page)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the deployments table columns', () => {
    render(<SoftwareJobsDeployed />, {
      initialEntries: ['/assets/software-jobs'],
    });
    expect(screen.getAllByText('ID').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Name').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Type').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Stage').length).toBeGreaterThan(0);
  });

  it('does not render catalog or bundle tabs', () => {
    render(<SoftwareJobsDeployed />, {
      initialEntries: ['/assets/software-jobs'],
    });
    expect(screen.queryByRole('tab', { name: /catalog/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: /bundle/i })).not.toBeInTheDocument();
  });

  it('renders empty state when no deployments', () => {
    render(<SoftwareJobsDeployed />, {
      initialEntries: ['/assets/software-jobs'],
    });
    expect(screen.getByText('No data found')).toBeInTheDocument();
  });
});
