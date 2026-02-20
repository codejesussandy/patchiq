import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../test-utils';
import { PlatformLicense } from '@/pages/settings/PlatformLicense';

vi.mock('@/hooks/useSettings', () => ({
  usePlatformLicense: vi.fn(() => ({
    data: {
      licenseTo: 'Acme Corp',
      productCode: 'PIQ-ENT-001',
      licenseType: 'enterprise',
      productVersion: '2.0',
      poNumber: 'PO-12345',
      invoiceNumber: 'INV-6789',
      email: 'admin@acme.com',
      partner: 'TechPartner Inc',
      issueDate: '2024-01-01T00:00:00Z',
      expiresOn: '2025-01-01T00:00:00Z',
      numberOfEndpoints: 1000,
      usedEndpoints: 350,
      activationCode: 'ACT-ABCD-EFGH-IJKL',
      remainingDays: 180,
      remainingEndpoints: 650,
    },
    isLoading: false,
    refetch: vi.fn(),
  })),
  useUpdatePlatformLicense: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
}));

describe('PlatformLicense', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the page title', () => {
    render(<PlatformLicense />);
    expect(screen.getByText('Platform License')).toBeInTheDocument();
  });

  it('renders license holder info', () => {
    render(<PlatformLicense />);
    expect(screen.getByText(/Acme Corp/)).toBeInTheDocument();
  });

  it('renders remaining days metric', () => {
    render(<PlatformLicense />);
    expect(screen.getByText('180')).toBeInTheDocument();
    expect(screen.getByText('Remaining Days')).toBeInTheDocument();
  });

  it('renders remaining endpoints metric', () => {
    render(<PlatformLicense />);
    expect(screen.getByText('650')).toBeInTheDocument();
    expect(screen.getByText('Remaining Endpoints')).toBeInTheDocument();
  });

  it('renders Update License section', () => {
    render(<PlatformLicense />);
    expect(screen.getAllByText(/Update License/i).length).toBeGreaterThan(0);
  });
});
