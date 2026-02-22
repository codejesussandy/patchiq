import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../test-utils';
import { LDAPServerConfiguration } from '@/pages/settings/LDAPServerConfiguration';

vi.mock('@/hooks/useSettings', () => ({
  useLDAPServerConfigs: vi.fn(() => ({
    data: [
      { id: '1', name: 'Primary LDAP', host: '10.0.0.1', port: 389, fqdn: 'ldap.example.com', baseDN: 'dc=example,dc=com', username: 'admin', password: 'secret', groupBase: '', protocol: 'LDAP', timeout: 30, description: 'Primary', enabled: true, enableAutoSync: false, autoSyncInterval: 0, createdAt: '2024-01-01T00:00:00Z' },
    ],
    isLoading: false,
    refetch: vi.fn(),
  })),
  useCreateLDAPServerConfig: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useUpdateLDAPServerConfig: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useDeleteLDAPServerConfig: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useTestLDAPServerConfig: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
}));

vi.mock('@/hooks/useModal', () => ({
  useModal: vi.fn(() => ({
    open: false,
    selectedItem: null,
    onOpen: vi.fn(),
    onClose: vi.fn(),
  })),
}));

describe('LDAPServerConfiguration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the page title', () => {
    render(<LDAPServerConfiguration />);
    expect(screen.getByText('LDAP Server Configurations')).toBeInTheDocument();
  });

  it('renders search input', () => {
    render(<LDAPServerConfiguration />);
    expect(screen.getByPlaceholderText(/search by name/i)).toBeInTheDocument();
  });

  it('renders Create button', () => {
    render(<LDAPServerConfiguration />);
    expect(screen.getByRole('button', { name: /create/i })).toBeInTheDocument();
  });

  it('renders LDAP config data in table', () => {
    render(<LDAPServerConfiguration />);
    expect(screen.getByText('Primary LDAP')).toBeInTheDocument();
    expect(screen.getByText('10.0.0.1')).toBeInTheDocument();
  });

  it('renders column headers', () => {
    render(<LDAPServerConfiguration />);
    expect(screen.getAllByText('Host')[0]).toBeInTheDocument();
    expect(screen.getAllByText('FQDN')[0]).toBeInTheDocument();
  });
});
