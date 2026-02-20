import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../test-utils';
import { Audit } from '@/pages/settings/Audit';

vi.mock('@/hooks/useSettings', () => ({
  useAuditLogs: vi.fn(() => ({
    data: [
      { id: '1', module: 'Auth', operation: 'LOGIN', user: 'admin@test.com', status: 'SUCCESS', message: 'User logged in', createdAt: '2024-01-01T10:00:00Z' },
      { id: '2', module: 'Asset', operation: 'CREATE', user: 'admin@test.com', status: 'SUCCESS', message: 'Asset created', createdAt: '2024-01-02T10:00:00Z' },
    ],
    isLoading: false,
    refetch: vi.fn(),
  })),
  useAuditFilterOptions: vi.fn(() => ({
    data: {
      modules: ['Auth', 'Asset'],
      users: ['admin@test.com'],
      operations: ['LOGIN', 'CREATE'],
    },
  })),
}));

describe('Audit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the page title', () => {
    render(<Audit />);
    expect(screen.getByText('Audit')).toBeInTheDocument();
  });

  it('renders search input', () => {
    render(<Audit />);
    expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
  });

  it('renders audit log data in table', () => {
    render(<Audit />);
    expect(screen.getAllByText('admin@test.com').length).toBeGreaterThan(0);
  });

  it('renders column headers', () => {
    render(<Audit />);
    expect(screen.getByText('Module')).toBeInTheDocument();
    expect(screen.getByText('Operation')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
  });

  it('renders filter dropdowns', () => {
    render(<Audit />);
    expect(screen.getByText('Refresh')).toBeInTheDocument();
    expect(screen.getByText('Export')).toBeInTheDocument();
  });
});
