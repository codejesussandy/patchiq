import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../test-utils';
import { DistributionServer } from '@/pages/settings/DistributionServer';

vi.mock('@/hooks/useSettings', () => ({
  useDistributionServers: vi.fn(() => ({
    data: [
      { id: '1', name: 'Primary Server', description: 'Main distribution server', location: 'US East', url: 'https://dist.example.com', version: '2.1.0', createdOn: '2024-01-01T00:00:00Z' },
    ],
    isLoading: false,
    refetch: vi.fn(),
  })),
}));

vi.mock('@/services/settings.service', () => ({
  settingsService: {
    exportDistributionServers: vi.fn(),
    downloadDistributionServer: vi.fn(),
    deleteDistributionServer: vi.fn(),
  },
}));

describe('DistributionServer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the page title', () => {
    render(<DistributionServer />);
    expect(screen.getByText('Distribution Server')).toBeInTheDocument();
  });

  it('renders column headers', () => {
    render(<DistributionServer />);
    expect(screen.getAllByText('Name')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Location')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Version')[0]).toBeInTheDocument();
  });

  it('renders server data in table', () => {
    render(<DistributionServer />);
    expect(screen.getByText('Primary Server')).toBeInTheDocument();
    expect(screen.getByText('US East')).toBeInTheDocument();
  });

  it('renders export and download buttons', () => {
    render(<DistributionServer />);
    expect(screen.getByText('Export')).toBeInTheDocument();
    expect(screen.getByText('Download Distribution Server')).toBeInTheDocument();
  });
});
