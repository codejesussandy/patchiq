import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../test-utils';
import { Hub } from '@/pages/hub/Hub';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useLocation: vi.fn(() => ({ pathname: '/hub', state: null })),
  };
});

vi.mock('@/hooks/useHub', () => ({
  useHubStats: vi.fn(() => ({
    data: { totalApplications: 42, totalSize: 1073741824 },
  })),
  useHubPackagesGrouped: vi.fn(() => ({
    data: {
      data: [
        { name: 'firefox', displayName: 'Mozilla Firefox', platform: 'windows', latestVersion: '120.0', totalVersions: 3, latestPackageId: 'pkg-1', category: 'Browser', hasFile: true, isActive: true, versions: [{ packageId: 'pkg-1', version: '120.0', installSource: 'bundle' }] },
      ],
      total: 1,
    },
    isLoading: false,
    refetch: vi.fn(),
  })),
  useCreatePackage: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useUpdatePackage: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useDeletePackage: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useUploadPackageBundle: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
}));

vi.mock('@/hooks/useJobs', () => ({
  useSoftwareAgents: vi.fn(() => ({ data: [] })),
  useCreateSoftwareDeployment: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
}));

vi.mock('@/services/hub.service', () => ({
  hubService: {
    getDownloadUrl: vi.fn(),
  },
}));

vi.mock('@/types/hub.types', () => ({
  PLATFORM_OPTIONS: [
    { value: 'windows', label: 'Windows' },
    { value: 'linux', label: 'Linux' },
    { value: 'macos', label: 'macOS' },
  ],
  CATEGORY_OPTIONS: [
    { value: 'Browser', label: 'Browser' },
  ],
}));

// Mock child components to avoid deep renders
vi.mock('@/pages/jobs/SoftwareJobsBundle', () => ({ SoftwareJobsBundle: () => <div>Bundle Tab</div> }));
vi.mock('@/pages/jobs/SoftwareJobsCatalog', () => ({ SoftwareJobsCatalog: () => <div>Catalog Tab</div> }));
vi.mock('@/pages/jobs/SoftwareJobsDeployed', () => ({ SoftwareJobsDeployed: () => <div>Deployed Tab</div> }));
vi.mock('@/pages/hub/components/HubBundleUploadModal', () => ({ HubBundleUploadModal: () => null }));
vi.mock('@/pages/hub/components/HubDeployModal', () => ({ HubDeployModal: () => null }));
vi.mock('@/pages/hub/components/HubDetailsDrawer', () => ({ HubDetailsDrawer: () => null }));
vi.mock('@/pages/hub/components/HubPackageFormModal', () => ({ HubPackageFormModal: () => null }));

describe('Hub', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the page title', () => {
    render(<Hub />);
    expect(screen.getByText('Software Hub')).toBeInTheDocument();
  });

  it('renders description text', () => {
    render(<Hub />);
    expect(screen.getByText(/manage software packages/i)).toBeInTheDocument();
  });

  it('renders stats cards', () => {
    render(<Hub />);
    expect(screen.getByText('Total Applications')).toBeInTheDocument();
    expect(screen.getByText('Total Size')).toBeInTheDocument();
  });

  it('renders search input', () => {
    render(<Hub />);
    expect(screen.getByPlaceholderText(/search packages/i)).toBeInTheDocument();
  });

  it('renders tab navigation', () => {
    render(<Hub />);
    expect(screen.getByText('Packages')).toBeInTheDocument();
    expect(screen.getByText('Software Catalog')).toBeInTheDocument();
    expect(screen.getByText('Bundles')).toBeInTheDocument();
    expect(screen.getByText('Software Jobs')).toBeInTheDocument();
  });
});
