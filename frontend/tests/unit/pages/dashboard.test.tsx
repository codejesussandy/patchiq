import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../test-utils';
import { Dashboard } from '@/pages/Dashboard';

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  BarChart: ({ children }: { children: React.ReactNode }) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
  PieChart: ({ children }: { children: React.ReactNode }) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => null,
  Cell: () => null,
}));

vi.mock('@/hooks/useDashboard', () => ({
  useDashboardData: vi.fn(() => ({
    data: {
      stats: {
        totalEndpoints: 150,
        linuxEndpoints: 50,
        windowsEndpoints: 80,
        macEndpoints: 20,
        totalVulnerabilities: 200,
        unmitigatedVulnerabilities: 50,
        criticalVulnerabilities: 25,
        highVulnerabilities: 50,
        mediumVulnerabilities: 75,
        lowVulnerabilities: 50,
        exploitableVulnerabilities: { critical: 10, high: 20, medium: 30, low: 10 },
        nonExploitableVulnerabilities: { critical: 15, high: 30, medium: 45, low: 40 },
      },
      topVulnerabilities: {
        byCVSS: [
          { cve: 'CVE-2024-0001', score: 9.8, affectedEndpoints: 15 },
        ],
      },
      endpointDistribution: [{ name: 'Windows', value: 80 }, { name: 'Linux', value: 50 }],
      totalSoftwareByPlatform: [{ name: 'Windows', value: 500 }, { name: 'Linux', value: 200 }],
      vulnerabilityByPublishedDateTable: [{ dateRange: '< 30 days', critical: 5, high: 10, medium: 15, low: 5 }],
      expiredCertificates: [{ name: 'Expired', value: 10 }],
      maliciousProcessesByPlatform: [{ name: 'Windows', value: 5 }],
      riskScoreByEndpoints: [{ name: 'Low', value: 2 }],
      alertCountBySeverity: [{ severity: 'Critical', count: 5 }],
      alertSeverityCountByPlatform: [{ platform: 'Windows', critical: 3, high: 5, medium: 10, low: 2 }],
      alertSeverityCountByModule: [{ module: 'Patch', critical: 2, high: 4, medium: 8 }],
      dayWiseVulnerabilityDetection: [{ day: 'Mon', count: 12 }],
    },
    isLoading: false,
    refetch: vi.fn(),
  })),
  useRefreshDashboard: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
  })),
}));

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the page title', () => {
    render(<Dashboard />);
    expect(screen.getByText('Executive Dashboard')).toBeInTheDocument();
  });

  it('renders stat cards with endpoint counts', () => {
    render(<Dashboard />);
    expect(screen.getByText('Total Endpoints')).toBeInTheDocument();
    expect(screen.getByText('Total Linux Endpoints')).toBeInTheDocument();
    expect(screen.getByText('Total Windows Endpoints')).toBeInTheDocument();
  });

  it('renders Refresh button', () => {
    render(<Dashboard />);
    expect(screen.getByText('Refresh')).toBeInTheDocument();
  });

  it('renders chart sections', () => {
    render(<Dashboard />);
    expect(screen.getByText('Vulnerability Classification')).toBeInTheDocument();
    expect(screen.getByText('Top 10 Vulnerability by CVSS')).toBeInTheDocument();
  });

  it('renders vulnerability classification section', () => {
    render(<Dashboard />);
    expect(screen.getByText('Vulnerability Classification')).toBeInTheDocument();
  });
});
