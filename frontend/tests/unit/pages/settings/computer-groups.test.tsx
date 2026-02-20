import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../test-utils';
import { ComputerGroups } from '@/pages/settings/ComputerGroups';

vi.mock('@/hooks/useSettings', () => ({
  useComputerGroups: vi.fn(() => ({
    data: [
      { id: '1', name: 'Server Group', description: 'All servers', endpointCount: 15, endpoints: [], createdBy: 'admin', createdAt: '2024-01-01T00:00:00Z' },
      { id: '2', name: 'Desktop Group', description: 'All desktops', endpointCount: 50, endpoints: [], createdBy: 'admin', createdAt: '2024-02-01T00:00:00Z' },
    ],
    isLoading: false,
    refetch: vi.fn(),
  })),
  useAvailableEndpoints: vi.fn(() => ({
    data: [{ id: 'ep1', hostname: 'server-01' }],
    isLoading: false,
  })),
  useCreateComputerGroup: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useUpdateComputerGroup: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useDeleteComputerGroup: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
}));

vi.mock('@/hooks/useModal', () => ({
  useModal: vi.fn(() => ({
    open: false,
    selectedItem: null,
    onOpen: vi.fn(),
    onClose: vi.fn(),
  })),
}));

describe('ComputerGroups', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the page title', () => {
    render(<ComputerGroups />);
    expect(screen.getByText('Computer Groups')).toBeInTheDocument();
  });

  it('renders the Create button', () => {
    render(<ComputerGroups />);
    expect(screen.getByRole('button', { name: /create/i })).toBeInTheDocument();
  });

  it('renders search input', () => {
    render(<ComputerGroups />);
    expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
  });

  it('renders group data in table', () => {
    render(<ComputerGroups />);
    expect(screen.getByText('Server Group')).toBeInTheDocument();
    expect(screen.getByText('Desktop Group')).toBeInTheDocument();
  });

  it('renders the page title text', () => {
    render(<ComputerGroups />);
    expect(screen.getByText('Computer Groups')).toBeInTheDocument();
  });
});
