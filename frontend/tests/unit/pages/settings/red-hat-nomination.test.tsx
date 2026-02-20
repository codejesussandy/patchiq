import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../test-utils';
import { RedHatAgentNomination } from '@/pages/settings/RedHatAgentNomination';

vi.mock('@/hooks/useSettings', () => ({
  useRedHatAgentNominations: vi.fn(() => ({
    data: [
      { id: '1', name: 'RHEL Agent 1', status: 'pending', endpoint: 5, lastSyncTime: '2024-06-15 10:30', updatedBy: 'admin', updatedAt: '2024-06-15 10:30', scheduledTime: '' },
      { id: '2', name: 'RHEL Agent 2', status: 'approved', endpoint: 10, lastSyncTime: '2024-06-14 08:00', updatedBy: 'admin', updatedAt: '2024-06-14 08:00', scheduledTime: '' },
    ],
    isLoading: false,
    refetch: vi.fn(),
  })),
  useUpdateRedHatAgentNomination: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
}));

vi.mock('@/services/settings.service', () => ({
  settingsService: {
    exportRedHatAgentNominations: vi.fn(),
  },
}));

describe('RedHatAgentNomination', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the page title', () => {
    render(<RedHatAgentNomination />);
    expect(screen.getByText('Red Hat Agent Nomination')).toBeInTheDocument();
  });

  it('renders search input', () => {
    render(<RedHatAgentNomination />);
    expect(screen.getByPlaceholderText('Search')).toBeInTheDocument();
  });

  it('renders nomination data in table', () => {
    render(<RedHatAgentNomination />);
    expect(screen.getByText('RHEL Agent 1')).toBeInTheDocument();
    expect(screen.getByText('RHEL Agent 2')).toBeInTheDocument();
  });

  it('renders status tags', () => {
    render(<RedHatAgentNomination />);
    expect(screen.getByText('pending')).toBeInTheDocument();
    expect(screen.getByText('approved')).toBeInTheDocument();
  });

  it('renders Refresh and Export buttons', () => {
    render(<RedHatAgentNomination />);
    expect(screen.getByText('Refresh')).toBeInTheDocument();
    expect(screen.getByText('Export')).toBeInTheDocument();
  });
});
