import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../test-utils';
import { VendorLogo } from '@/pages/settings/VendorLogo';

vi.mock('@/hooks/useSettings', () => ({
  useVendorLogos: vi.fn(() => ({
    data: [
      { id: '1', name: 'Microsoft', type: 'vendor', logoUrl: 'https://example.com/ms.png', fileName: 'ms.png', createdAt: '2024-01-01T00:00:00Z' },
      { id: '2', name: 'Ubuntu', type: 'os', logoUrl: 'https://example.com/ubuntu.png', fileName: 'ubuntu.png', createdAt: '2024-02-01T00:00:00Z' },
    ],
    isLoading: false,
    refetch: vi.fn(),
  })),
  useCreateVendorLogo: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useUpdateVendorLogo: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useDeleteVendorLogo: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
}));

vi.mock('@/hooks/useModal', () => ({
  useModal: vi.fn(() => ({
    open: false,
    selectedItem: null,
    onOpen: vi.fn(),
    onClose: vi.fn(),
  })),
}));

describe('VendorLogo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the page title', () => {
    render(<VendorLogo />);
    expect(screen.getByText('Vendor Logo')).toBeInTheDocument();
  });

  it('renders Add Logo button', () => {
    render(<VendorLogo />);
    expect(screen.getByRole('button', { name: /add logo/i })).toBeInTheDocument();
  });

  it('renders vendor logo data in table', () => {
    render(<VendorLogo />);
    expect(screen.getByText('Microsoft')).toBeInTheDocument();
    expect(screen.getByText('Ubuntu')).toBeInTheDocument();
  });

  it('renders logo type column', () => {
    render(<VendorLogo />);
    expect(screen.getByText('vendor')).toBeInTheDocument();
    expect(screen.getByText('os')).toBeInTheDocument();
  });
});
