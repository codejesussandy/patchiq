import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../../test-utils';
import { PatchDetails } from '@/pages/patches/PatchDetails';

vi.mock('react-router-dom', async (importOriginal) => {
  const mod = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...mod,
    useParams: () => ({ id: 'patch-1' }),
  };
});

vi.mock('@/hooks/usePatches', () => ({
  usePatch: vi.fn(() => ({
    data: {
      id: 'patch-1',
      patchId: 'PATCH-001',
      software: 'Windows Security Update KB5034441',
      description: 'Critical security update for Windows',
      os: 'WINDOWS',
      platform: 'WINDOWS',
      severity: 'CRITICAL',
      category: 'Security Updates',
      endpoints: 15,
      kbNumber: 'KB5034441',
      bulletinId: 'MS24-001',
      architecture: '64 BIT',
      vendor: 'Microsoft',
      product: 'Windows',
      publishedAt: '2024-01-15',
      createdAt: '2024-01-16',
      rebootRequired: true,
      supportUninstallation: false,
      referenceUrl: 'https://support.microsoft.com',
      source: 'WSUS',
      approvalStatus: 'PENDING',
      testStatus: 'NOT_TESTED',
      tags: ['security', 'critical'],
      cveNumbers: ['CVE-2024-0001'],
      supersededBy: [],
      supersedes: [],
    },
    isLoading: false,
    refetch: vi.fn(),
  })),
  useAffectedSoftwares: vi.fn(() => ({
    data: [
      { id: 'as-1', softwareName: 'Windows 11', version: '23H2', vendor: 'Microsoft', platform: 'Windows', installedOn: 10 },
    ],
  })),
  usePatchVulnerabilities: vi.fn(() => ({
    data: [
      { id: 'v-1', cveNumber: 'CVE-2024-0001', severity: 'CRITICAL', description: 'Remote code execution', publishedDate: '2024-01-10' },
    ],
  })),
  usePatchEndpoints: vi.fn(() => ({
    data: [
      { id: 'e-1', name: 'Server-01', os: 'Windows', status: 'Online', lastSeen: '2024-01-15' },
    ],
  })),
  useUpdatePatch: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useCreateDeployment: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
}));

vi.mock('@/hooks/usePatchRecommendations', () => ({
  usePatchRecommendationsForPatch: vi.fn(() => ({
    data: { data: [] },
  })),
}));

vi.mock('@/hooks/useAgents', () => ({
  useAgents: vi.fn(() => ({ data: [] })),
}));

vi.mock('@/hooks/useAssets', () => ({
  useTags: vi.fn(() => ({ data: [] })),
}));

vi.mock('@/hooks/useVulnerabilities', () => ({
  useCveSuggestions: vi.fn(() => ({ data: [] })),
}));

vi.mock('@/services/patch.service', () => ({
  patchService: {
    getAffectedSoftwares: vi.fn(() => Promise.resolve([])),
    addSupersedence: vi.fn(),
    removeSupersedence: vi.fn(),
  },
}));

vi.mock('@/components/patches', () => ({
  SeverityBadge: ({ severity }: any) => <span data-testid="severity-badge">{severity}</span>,
  EndpointDetailsDrawer: () => null,
  OSIcon: ({ os }: any) => <span data-testid="os-icon">{os}</span>,
}));

vi.mock('@/components/PatchSearchSelect', () => ({
  PatchSearchSelect: () => null,
}));

vi.mock('@/components/shared/ActionMenu', () => ({
  ActionMenu: () => <div data-testid="action-menu">Actions</div>,
}));

vi.mock('@/components/shared/DataTable', () => ({
  DataTable: ({ columns, data }: any) => (
    <div data-testid="data-table">
      <table>
        <thead>
          <tr>
            {columns?.map((col: any) => (
              <th key={col.key}>{col.title}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data?.map((row: any, i: number) => (
            <tr key={row.id || i}>
              <td>{row.softwareName || row.name || row.cveNumber || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ),
}));

vi.mock('@/components/shared/RiskScoreDisplay', () => ({
  RiskScoreDisplay: ({ score }: any) => <span>{score ?? '-'}</span>,
}));

vi.mock('@/pages/patches/components/AffectedProductsStep', () => ({
  AffectedProductsStep: () => null,
}));

vi.mock('@/pages/patches/components/DeployModal', () => ({
  DeployModal: () => null,
}));

vi.mock('@/pages/patches/components/PatchFormFields', () => ({
  PatchFormFields: () => null,
}));

vi.mock('@shared/types', () => ({
  formatEnum: (val: string) => val,
}));

vi.mock('@/utils/error', () => ({
  getErrorMessage: vi.fn((err: unknown, fallback: string) => fallback),
}));

describe('PatchDetails', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the patch software name as heading', () => {
    render(<PatchDetails />);
    expect(screen.getAllByText('Windows Security Update KB5034441').length).toBeGreaterThan(0);
  });

  it('renders the Back button', () => {
    render(<PatchDetails />);
    expect(screen.getByText('Back')).toBeInTheDocument();
  });

  it('renders the Deploy button', () => {
    render(<PatchDetails />);
    expect(screen.getByText('Deploy')).toBeInTheDocument();
  });

  it('renders the Edit button', () => {
    render(<PatchDetails />);
    expect(screen.getByText('Edit')).toBeInTheDocument();
  });

  it('renders tabs', () => {
    render(<PatchDetails />);
    expect(screen.getByText('Details')).toBeInTheDocument();
    expect(screen.getAllByText(/Endpoints/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Affected Software/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Vulnerabilities/).length).toBeGreaterThan(0);
  });

  it('renders the severity badge', () => {
    render(<PatchDetails />);
    expect(screen.getAllByTestId('severity-badge').length).toBeGreaterThan(0);
  });

  it('renders patch details in the Details tab', () => {
    render(<PatchDetails />);
    expect(screen.getByText('PATCH-001')).toBeInTheDocument();
    expect(screen.getByText('KB5034441')).toBeInTheDocument();
  });

  it('renders the Supersedence section', () => {
    render(<PatchDetails />);
    expect(screen.getByText('Supersedence')).toBeInTheDocument();
  });

  it('navigates to Affected Software tab on click', async () => {
    const user = userEvent.setup();
    render(<PatchDetails />);
    await user.click(screen.getByText(/Affected Software/));
    await waitFor(() => {
      expect(screen.getByText('Software Name')).toBeInTheDocument();
    });
  });
});
