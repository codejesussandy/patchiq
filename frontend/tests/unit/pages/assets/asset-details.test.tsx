import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../../test-utils';

// We need to mock useParams before importing the component
const mockNavigate = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => {
  const mod = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...mod,
    useParams: () => ({ id: 'asset-1' }),
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@/hooks/useAssets', () => ({
  useAsset: vi.fn(() => ({
    data: {
      id: 'asset-1',
      name: 'Test Server',
      hostname: 'test-server.local',
      ipAddress: '10.0.0.1',
      osType: 'linux',
      manufacturer: 'Dell',
      model: 'PowerEdge R740',
      status: 'IN_USE',
      operationalStatus: 'CONNECTED',
      tagIds: ['tag-1'],
      agent: { id: 'agent-1' },
    },
    isLoading: false,
    error: null,
  })),
  useDeleteAsset: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
  useAssignTagsToAsset: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
}));

vi.mock('@/components/shared/ActionMenu', () => ({
  ActionMenu: () => <div data-testid="action-menu">Actions</div>,
}));

vi.mock('@/pages/assets/components/AddAssetModal', () => ({
  AddAssetModal: () => null,
}));

vi.mock('@/pages/assets/components/tabs', () => ({
  DetailsTab: () => <div data-testid="details-tab">Details Tab Content</div>,
  LifecycleTab: () => <div data-testid="lifecycle-tab">Lifecycle Tab Content</div>,
  HardwareTab: () => <div data-testid="hardware-tab">Hardware Tab Content</div>,
  SoftwareTab: () => <div data-testid="software-tab">Software Tab Content</div>,
  AuditLogTab: () => <div data-testid="audit-tab">Audit Tab Content</div>,
  VulnerabilitiesTab: () => <div data-testid="vuln-tab">Vulnerabilities Tab Content</div>,
  AlertsTab: () => <div data-testid="alerts-tab">Alerts Tab Content</div>,
  UnifiedPatchesTab: () => <div data-testid="patches-tab">Patches Tab Content</div>,
}));

// Import after mocks are set up
import { AssetDetails } from '@/pages/assets/components/AssetDetails';

describe('AssetDetails', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the Asset Details heading', () => {
    render(<AssetDetails />);
    expect(screen.getByText('Asset Details')).toBeInTheDocument();
  });

  it('renders the Back button', () => {
    render(<AssetDetails />);
    expect(screen.getByText('Back')).toBeInTheDocument();
  });

  it('renders the Edit Asset button', () => {
    render(<AssetDetails />);
    expect(screen.getByText('Edit Asset')).toBeInTheDocument();
  });

  it('renders the Details tab', () => {
    render(<AssetDetails />);
    expect(screen.getByText('Details')).toBeInTheDocument();
  });

  it('renders tab labels', () => {
    render(<AssetDetails />);
    expect(screen.getByText('Details')).toBeInTheDocument();
    expect(screen.getByText('Asset Life cycle')).toBeInTheDocument();
    expect(screen.getByText('Hardware')).toBeInTheDocument();
    expect(screen.getByText('Software')).toBeInTheDocument();
    expect(screen.getByText('Audit Log')).toBeInTheDocument();
    expect(screen.getByText('Vulnerabilities')).toBeInTheDocument();
    expect(screen.getByText('Patches')).toBeInTheDocument();
    expect(screen.getByText('Alerts')).toBeInTheDocument();
  });

  it('shows Details tab content by default', () => {
    render(<AssetDetails />);
    expect(screen.getByTestId('details-tab')).toBeInTheDocument();
  });

  it('navigates to Hardware tab on click', async () => {
    const user = userEvent.setup();
    render(<AssetDetails />);
    await user.click(screen.getByText('Hardware'));
    await waitFor(() => {
      expect(screen.getByTestId('hardware-tab')).toBeInTheDocument();
    });
  });

  it('renders the action menu', () => {
    render(<AssetDetails />);
    expect(screen.getByTestId('action-menu')).toBeInTheDocument();
  });
});
