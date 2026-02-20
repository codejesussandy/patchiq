import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../test-utils';
import { EnrollSecret } from '@/pages/settings/EnrollSecret';

vi.mock('@/hooks/useSettings', () => ({
  useEnrollSecrets: vi.fn(() => ({
    data: [
      { id: '1', name: 'Production Secret', secret: 'abcde12345fghij', organization: 'Acme', department: 'IT', createdOn: '2024-01-01T00:00:00Z' },
      { id: '2', name: 'Staging Secret', secret: 'xyz0987654321ab', organization: 'Acme', department: 'DevOps', createdOn: '2024-02-01T00:00:00Z' },
    ],
    isLoading: false,
    refetch: vi.fn(),
  })),
  useCreateEnrollSecret: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useDeleteEnrollSecret: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useOrganizations: vi.fn(() => ({ data: [{ id: '1', name: 'Acme' }] })),
  useDepartments: vi.fn(() => ({ data: [{ id: '1', name: 'IT' }] })),
}));

vi.mock('@/hooks/useModal', () => ({
  useModal: vi.fn(() => ({
    open: false,
    selectedItem: null,
    onOpen: vi.fn(),
    onClose: vi.fn(),
  })),
}));

describe('EnrollSecret', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the page title', () => {
    render(<EnrollSecret />);
    expect(screen.getByText('Enroll Secret')).toBeInTheDocument();
  });

  it('renders search input', () => {
    render(<EnrollSecret />);
    expect(screen.getByPlaceholderText('Search')).toBeInTheDocument();
  });

  it('renders Create button', () => {
    render(<EnrollSecret />);
    expect(screen.getByRole('button', { name: /create/i })).toBeInTheDocument();
  });

  it('renders secret data in table', () => {
    render(<EnrollSecret />);
    expect(screen.getByText('Production Secret')).toBeInTheDocument();
    expect(screen.getByText('Staging Secret')).toBeInTheDocument();
  });

  it('masks secret values', () => {
    render(<EnrollSecret />);
    // The secret should be masked with asterisks in the middle
    const cells = screen.getAllByText(/\*+/);
    expect(cells.length).toBeGreaterThan(0);
  });
});
