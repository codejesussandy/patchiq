import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../test-utils';
import { Organization } from '@/pages/settings/Organization';

vi.mock('@/hooks/useSettings', () => ({
  useOrganizations: vi.fn(() => ({
    data: [
      { id: '1', name: 'Global Corp', description: 'Default org', isDefault: true, createdAt: '2024-01-01T00:00:00Z' },
      { id: '2', name: 'Branch Office', description: 'Branch org', isDefault: false, createdAt: '2024-02-01T00:00:00Z' },
    ],
    isLoading: false,
    refetch: vi.fn(),
  })),
  useCreateOrganization: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useUpdateOrganization: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useDeleteOrganization: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
}));

vi.mock('@/hooks/useModal', () => ({
  useModal: vi.fn(() => ({
    open: false,
    selectedItem: null,
    onOpen: vi.fn(),
    onClose: vi.fn(),
  })),
}));

describe('Organization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the page title', () => {
    render(<Organization />);
    expect(screen.getByText('Organization')).toBeInTheDocument();
  });

  it('renders the search input', () => {
    render(<Organization />);
    expect(screen.getByPlaceholderText(/search by name/i)).toBeInTheDocument();
  });

  it('renders the Create button', () => {
    render(<Organization />);
    expect(screen.getByRole('button', { name: /create/i })).toBeInTheDocument();
  });

  it('renders organization data in table', () => {
    render(<Organization />);
    expect(screen.getByText('Global Corp')).toBeInTheDocument();
    expect(screen.getByText('Branch Office')).toBeInTheDocument();
  });
});
