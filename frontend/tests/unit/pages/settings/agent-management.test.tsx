import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../test-utils';
import { AgentManagement } from '@/pages/settings/AgentManagement';

const mockMutateAsync = vi.fn();

vi.mock('@/hooks/useSettings', () => ({
  useAgentConfiguration: vi.fn(() => ({
    data: {
      agentRefreshCycle: 60,
      systemResourcesRefreshCycle: 120,
      endpointVlanRefreshCycle: 3600,
      patchScanningRefreshCycle: 7200,
      softwareMeterRefreshCycle: 60,
      networkRefreshCycle: 30,
      allowedBandwidth: 100,
    },
    isLoading: false,
  })),
  useUpdateAgentConfiguration: vi.fn(() => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  })),
}));

describe('AgentManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the page title', () => {
    render(<AgentManagement />);
    expect(screen.getByText('Agent Management')).toBeInTheDocument();
  });

  it('renders communication intervals section', () => {
    render(<AgentManagement />);
    expect(screen.getByText('Communication Intervals')).toBeInTheDocument();
    expect(screen.getByText('Heartbeat Interval')).toBeInTheDocument();
    expect(screen.getByText('Telemetry Interval')).toBeInTheDocument();
    expect(screen.getByText('Inventory Schedule')).toBeInTheDocument();
    expect(screen.getByText('Patch Scan Schedule')).toBeInTheDocument();
  });

  it('renders agent behavior section', () => {
    render(<AgentManagement />);
    expect(screen.getByText('Agent Behavior')).toBeInTheDocument();
    expect(screen.getByText('Telemetry Collection')).toBeInTheDocument();
    expect(screen.getByText('Log Level')).toBeInTheDocument();
    expect(screen.getByText('Allowed Bandwidth')).toBeInTheDocument();
  });

  it('renders Save and Reset buttons', () => {
    render(<AgentManagement />);
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument();
  });

  it('renders the page title', () => {
    render(<AgentManagement />);
    expect(screen.getByText('Agent Management')).toBeInTheDocument();
  });
});
