import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { render } from '../../test-utils';
import { SoftwareJobs } from '@/pages/jobs/SoftwareJobs';

// Mock the child route components
vi.mock('@/pages/jobs/SoftwareJobsCatalog', () => ({
  SoftwareJobsCatalog: () => <div data-testid="sw-catalog-content">Software Catalog Content</div>,
}));

vi.mock('@/pages/jobs/SoftwareJobsBundle', () => ({
  SoftwareJobsBundle: () => <div data-testid="sw-bundle-content">Software Bundle Content</div>,
}));

vi.mock('@/pages/jobs/SoftwareJobsDeployed', () => ({
  SoftwareJobsDeployed: () => <div data-testid="sw-deployed-content">Software Deployed Content</div>,
}));

vi.mock('@/pages/jobs/PatchJobsDeployed', () => ({
  PatchJobsDeployed: () => <div data-testid="patch-deployments-content">Patch Deployments Content</div>,
}));

describe('SoftwareJobs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the page title', () => {
    render(<SoftwareJobs />, {
      initialEntries: ['/patches/deployed/catalog'],
    });
    expect(screen.getByText('Patches Deployed')).toBeInTheDocument();
  });

  it('renders the Catalog tab', () => {
    render(<SoftwareJobs />, {
      initialEntries: ['/patches/deployed/catalog'],
    });
    expect(screen.getByText('Catalog')).toBeInTheDocument();
  });

  it('renders the Bundle tab', () => {
    render(<SoftwareJobs />, {
      initialEntries: ['/patches/deployed/catalog'],
    });
    expect(screen.getByText('Bundle')).toBeInTheDocument();
  });

  it('renders the Software Deployed tab', () => {
    render(<SoftwareJobs />, {
      initialEntries: ['/patches/deployed/catalog'],
    });
    expect(screen.getByText('Software Deployed')).toBeInTheDocument();
  });

  it('renders the Patch Deployments tab', () => {
    render(<SoftwareJobs />, {
      initialEntries: ['/patches/deployed/catalog'],
    });
    expect(screen.getByText('Patch Deployments')).toBeInTheDocument();
  });

  it('renders all tab labels on base path', () => {
    render(<SoftwareJobs />, {
      initialEntries: ['/patches/deployed'],
    });
    expect(screen.getByText('Patches Deployed')).toBeInTheDocument();
  });

  it('has correct active tab for catalog route', () => {
    render(<SoftwareJobs />, {
      initialEntries: ['/patches/deployed/catalog'],
    });
    const catalogTab = screen.getByText('Catalog');
    expect(catalogTab.closest('[role="tab"]')).toHaveAttribute('aria-selected', 'true');
  });

  it('has correct active tab for bundle route', () => {
    render(<SoftwareJobs />, {
      initialEntries: ['/patches/deployed/bundle'],
    });
    const bundleTab = screen.getByText('Bundle');
    expect(bundleTab.closest('[role="tab"]')).toHaveAttribute('aria-selected', 'true');
  });

  it('has correct active tab for deployed route', () => {
    render(<SoftwareJobs />, {
      initialEntries: ['/patches/deployed/deployed'],
    });
    const deployedTab = screen.getByText('Software Deployed');
    expect(deployedTab.closest('[role="tab"]')).toHaveAttribute('aria-selected', 'true');
  });

  it('has correct active tab for patch-deployments route', () => {
    render(<SoftwareJobs />, {
      initialEntries: ['/patches/deployed/patch-deployments'],
    });
    const patchDeployTab = screen.getByText('Patch Deployments');
    expect(patchDeployTab.closest('[role="tab"]')).toHaveAttribute('aria-selected', 'true');
  });
});
