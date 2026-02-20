import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../test-utils';
import { IPDiscovery } from '@/pages/discovery/IPDiscovery';

vi.mock('@/hooks/useDiscovery', () => ({
  useIPRanges: vi.fn(() => ({
    data: [
      { id: '1', name: 'Corporate Network', range: '192.168.1.0/24', description: 'Main office', lastScanned: '2024-06-15T10:00:00Z', deviceCount: 25 },
      { id: '2', name: 'Lab Network', range: '10.0.0.0/16', description: 'Lab environment', lastScanned: null, deviceCount: 0 },
    ],
    isLoading: false,
    refetch: vi.fn(),
  })),
  useCreateIPRange: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useUpdateIPRange: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useDeleteIPRange: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
}));

vi.mock('@/hooks/useModal', () => ({
  useModal: vi.fn(() => ({
    open: false,
    selectedItem: null,
    onOpen: vi.fn(),
    onClose: vi.fn(),
  })),
}));

describe('IPDiscovery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the page title', () => {
    render(<IPDiscovery />);
    expect(screen.getByText('IP Discovery')).toBeInTheDocument();
  });

  it('renders search input', () => {
    render(<IPDiscovery />);
    expect(screen.getByPlaceholderText('Search')).toBeInTheDocument();
  });

  it('renders Create IP Range button', () => {
    render(<IPDiscovery />);
    expect(screen.getByRole('button', { name: /create ip range/i })).toBeInTheDocument();
  });

  it('renders IP range data in table', () => {
    render(<IPDiscovery />);
    expect(screen.getByText('Corporate Network')).toBeInTheDocument();
    expect(screen.getByText('192.168.1.0/24')).toBeInTheDocument();
  });

  it('renders column headers', () => {
    render(<IPDiscovery />);
    expect(screen.getByText('IP Range')).toBeInTheDocument();
    expect(screen.getByText('Devices Found')).toBeInTheDocument();
  });
});
