import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { render } from '../../test-utils';
import { ConfigurationJobs } from '@/pages/jobs/ConfigurationJobs';

// Mock the child route components
vi.mock('@/pages/jobs/ConfigurationJobsCatalog', () => ({
  ConfigurationJobsCatalog: () => <div data-testid="catalog-content">Catalog Content</div>,
}));

vi.mock('@/pages/jobs/ConfigurationJobsBundle', () => ({
  ConfigurationJobsBundle: () => <div data-testid="bundle-content">Bundle Content</div>,
}));

vi.mock('@/pages/jobs/ConfigurationJobsDeployed', () => ({
  ConfigurationJobsDeployed: () => <div data-testid="deployed-content">Deployed Content</div>,
}));

describe('ConfigurationJobs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the page title', () => {
    render(<ConfigurationJobs />, {
      initialEntries: ['/jobs/configuration-jobs/catalog'],
    });
    expect(screen.getByText('Configuration Jobs')).toBeInTheDocument();
  });

  it('renders the Catalog tab', () => {
    render(<ConfigurationJobs />, {
      initialEntries: ['/jobs/configuration-jobs/catalog'],
    });
    expect(screen.getByText('Catalog')).toBeInTheDocument();
  });

  it('renders the Bundle tab', () => {
    render(<ConfigurationJobs />, {
      initialEntries: ['/jobs/configuration-jobs/catalog'],
    });
    expect(screen.getByText('Bundle')).toBeInTheDocument();
  });

  it('renders the Deployed tab', () => {
    render(<ConfigurationJobs />, {
      initialEntries: ['/jobs/configuration-jobs/catalog'],
    });
    expect(screen.getByText('Deployed')).toBeInTheDocument();
  });

  it('renders all tab labels on base path', () => {
    render(<ConfigurationJobs />, {
      initialEntries: ['/jobs/configuration-jobs'],
    });
    expect(screen.getByText('Configuration Jobs')).toBeInTheDocument();
  });

  it('has correct active tab for catalog route', () => {
    render(<ConfigurationJobs />, {
      initialEntries: ['/jobs/configuration-jobs/catalog'],
    });
    // The Catalog tab should be rendered and active
    const catalogTab = screen.getByText('Catalog');
    expect(catalogTab).toBeInTheDocument();
    expect(catalogTab.closest('[role="tab"]')).toHaveAttribute('aria-selected', 'true');
  });

  it('has correct active tab for bundle route', () => {
    render(<ConfigurationJobs />, {
      initialEntries: ['/jobs/configuration-jobs/bundle'],
    });
    const bundleTab = screen.getByText('Bundle');
    expect(bundleTab).toBeInTheDocument();
    expect(bundleTab.closest('[role="tab"]')).toHaveAttribute('aria-selected', 'true');
  });

  it('has correct active tab for deployed route', () => {
    render(<ConfigurationJobs />, {
      initialEntries: ['/jobs/configuration-jobs/deployed'],
    });
    const deployedTab = screen.getByText('Deployed');
    expect(deployedTab).toBeInTheDocument();
    expect(deployedTab.closest('[role="tab"]')).toHaveAttribute('aria-selected', 'true');
  });
});
