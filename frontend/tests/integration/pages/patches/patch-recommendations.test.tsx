import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../../test-utils';
import { PatchRecommendations } from '@/pages/patches/PatchRecommendations';

const mockDashboardStats = {
  total: 50,
  bySeverity: { critical: 5, high: 15, medium: 20, low: 10 },
  byStatus: { recommended: 25, accepted: 10, rejected: 5, deployed: 8, verified: 2 },
};

const mockRecommendations = [
  { id: 'rec-1', severity: 'CRITICAL', status: 'RECOMMENDED', riskScore: 9.5, affectedSoftware: 'Windows 11', vulnerability: { id: 'vuln-1', cveId: 'CVE-2024-0001' }, asset: { id: 'asset-1', name: 'Server-01', os: 'Windows' }, patch: { id: 'patch-1', patchId: 'KB5034441', software: 'Windows 11 Cumulative Update' }, createdAt: '2024-01-15T00:00:00Z' },
];

describe('PatchRecommendations Page', () => {
  beforeEach(() => {
    localStorage.setItem('accessToken', 'mock-access-token');
    // Ensure handlers are registered in the correct order with explicit URL matching
  });

  it('renders page title "Patch Recommendations"', async () => {
    render(<PatchRecommendations />, { initialEntries: ['/patches/recommendations'] });

    await waitFor(() => {
      expect(screen.getByText('Patch Recommendations')).toBeInTheDocument();
    });
  });

  it('renders Refresh button', async () => {
    render(<PatchRecommendations />, { initialEntries: ['/patches/recommendations'] });

    await waitFor(() => {
      expect(screen.getByText('Refresh')).toBeInTheDocument();
    });
  });

  it('renders stat cards with severity counts from dashboard API', async () => {
    render(<PatchRecommendations />, { initialEntries: ['/patches/recommendations'] });

    await waitFor(() => {
      expect(screen.getByText('Critical')).toBeInTheDocument();
    });

    expect(screen.getByText('High')).toBeInTheDocument();
    expect(screen.getByText('Medium')).toBeInTheDocument();
    expect(screen.getByText('Low')).toBeInTheDocument();

    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.getByText('20')).toBeInTheDocument();
    // 10 appears in both Low severity and Accepted status cards
    expect(screen.getAllByText('10').length).toBeGreaterThanOrEqual(1);
  });

  it('renders status stat cards', async () => {
    render(<PatchRecommendations />, { initialEntries: ['/patches/recommendations'] });

    await waitFor(() => {
      expect(screen.getAllByText('Recommended').length).toBeGreaterThanOrEqual(1);
    });

    expect(screen.getAllByText('Accepted').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Deployed')).toBeInTheDocument();

    expect(screen.getByText('25')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
  });

  it('renders search input with correct placeholder', async () => {
    render(<PatchRecommendations />, { initialEntries: ['/patches/recommendations'] });

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search CVE, Asset, Patch...')).toBeInTheDocument();
    });
  });

  it('renders status filter dropdown', async () => {
    render(<PatchRecommendations />, { initialEntries: ['/patches/recommendations'] });

    await waitFor(() => {
      expect(screen.getByText('Patch Recommendations')).toBeInTheDocument();
    });

    expect(screen.getByText('Filter by Status')).toBeInTheDocument();
  });

  it('search input accepts text', async () => {
    const user = userEvent.setup();
    render(<PatchRecommendations />, { initialEntries: ['/patches/recommendations'] });

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search CVE, Asset, Patch...')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search CVE, Asset, Patch...');
    await user.type(searchInput, 'CVE-2024');
    expect(searchInput).toHaveValue('CVE-2024');
  });
});
