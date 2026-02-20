import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../test-utils';
import { DeviceCredentials } from '@/pages/discovery/DeviceCredentials';

vi.mock('@/hooks/useDiscovery', () => ({
  useCredentials: vi.fn(() => ({
    data: [
      { id: '1', name: 'Linux SSH Key', type: 'SSH', username: 'deploy', password: 'secret', description: 'For Linux servers', lastUsed: '2024-06-15T10:00:00Z' },
      { id: '2', name: 'Windows Admin', type: 'Windows', username: 'admin', password: 'secret', description: 'Windows domain admin', lastUsed: null },
    ],
    isLoading: false,
    refetch: vi.fn(),
  })),
  useCreateCredential: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useUpdateCredential: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useDeleteCredential: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useTestCredential: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
}));

vi.mock('@/hooks/useModal', () => ({
  useModal: vi.fn(() => ({
    open: false,
    selectedItem: null,
    onOpen: vi.fn(),
    onClose: vi.fn(),
  })),
}));

describe('DeviceCredentials', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the page title', () => {
    render(<DeviceCredentials />);
    expect(screen.getByText('Device Credentials')).toBeInTheDocument();
  });

  it('renders search input', () => {
    render(<DeviceCredentials />);
    expect(screen.getByPlaceholderText('Search')).toBeInTheDocument();
  });

  it('renders Add Credential button', () => {
    render(<DeviceCredentials />);
    expect(screen.getByRole('button', { name: /add credential/i })).toBeInTheDocument();
  });

  it('renders credential data in table', () => {
    render(<DeviceCredentials />);
    expect(screen.getByText('Linux SSH Key')).toBeInTheDocument();
    expect(screen.getByText('Windows Admin')).toBeInTheDocument();
  });

  it('renders credential types', () => {
    render(<DeviceCredentials />);
    expect(screen.getByText('SSH')).toBeInTheDocument();
    expect(screen.getByText('Windows')).toBeInTheDocument();
  });
});
