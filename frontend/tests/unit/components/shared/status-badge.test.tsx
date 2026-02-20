import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { render } from '../../test-utils';
import { StatusBadge, getStatusBadgeStatus } from '@/components/shared/StatusBadge';

describe('StatusBadge', () => {
  it('renders formatted status text by default', () => {
    render(<StatusBadge status="VERIFIED" />);
    expect(screen.getByText('Verified')).toBeInTheDocument();
  });

  it('renders custom text when provided', () => {
    render(<StatusBadge status="VERIFIED" text="All Good" />);
    expect(screen.getByText('All Good')).toBeInTheDocument();
  });

  it('renders success badge for VERIFIED status', () => {
    const { container } = render(<StatusBadge status="VERIFIED" />);
    expect(container.querySelector('.ant-badge-status-success')).toBeInTheDocument();
  });

  it('renders success badge for INSTALLED status', () => {
    const { container } = render(<StatusBadge status="INSTALLED" />);
    expect(container.querySelector('.ant-badge-status-success')).toBeInTheDocument();
  });

  it('renders success badge for CONNECTED status', () => {
    const { container } = render(<StatusBadge status="CONNECTED" />);
    expect(container.querySelector('.ant-badge-status-success')).toBeInTheDocument();
  });

  it('renders processing badge for PENDING status', () => {
    const { container } = render(<StatusBadge status="PENDING" />);
    expect(container.querySelector('.ant-badge-status-processing')).toBeInTheDocument();
  });

  it('renders processing badge for IN_PROGRESS status', () => {
    const { container } = render(<StatusBadge status="IN_PROGRESS" />);
    expect(container.querySelector('.ant-badge-status-processing')).toBeInTheDocument();
  });

  it('renders processing badge for DEPLOYED status', () => {
    const { container } = render(<StatusBadge status="DEPLOYED" />);
    expect(container.querySelector('.ant-badge-status-processing')).toBeInTheDocument();
  });

  it('renders error badge for FAILED status', () => {
    const { container } = render(<StatusBadge status="FAILED" />);
    expect(container.querySelector('.ant-badge-status-error')).toBeInTheDocument();
  });

  it('renders error badge for ERROR status', () => {
    const { container } = render(<StatusBadge status="ERROR" />);
    expect(container.querySelector('.ant-badge-status-error')).toBeInTheDocument();
  });

  it('renders error badge for REJECTED status', () => {
    const { container } = render(<StatusBadge status="REJECTED" />);
    expect(container.querySelector('.ant-badge-status-error')).toBeInTheDocument();
  });

  it('renders warning badge for RECOMMENDED status', () => {
    const { container } = render(<StatusBadge status="RECOMMENDED" />);
    expect(container.querySelector('.ant-badge-status-warning')).toBeInTheDocument();
  });

  it('renders default badge for DISCONNECTED status', () => {
    const { container } = render(<StatusBadge status="DISCONNECTED" />);
    expect(container.querySelector('.ant-badge-status-default')).toBeInTheDocument();
  });

  it('renders default badge for unknown status', () => {
    const { container } = render(<StatusBadge status="UNKNOWN_STATUS" />);
    expect(container.querySelector('.ant-badge-status-default')).toBeInTheDocument();
  });

  it('uses custom statusMap when provided', () => {
    const customMap = { CUSTOM: 'warning' as const };
    const { container } = render(
      <StatusBadge status="CUSTOM" statusMap={customMap} />,
    );
    expect(container.querySelector('.ant-badge-status-warning')).toBeInTheDocument();
  });
});

describe('getStatusBadgeStatus', () => {
  it('returns correct badge status for known statuses', () => {
    expect(getStatusBadgeStatus('VERIFIED')).toBe('success');
    expect(getStatusBadgeStatus('FAILED')).toBe('error');
    expect(getStatusBadgeStatus('PENDING')).toBe('processing');
    expect(getStatusBadgeStatus('RECOMMENDED')).toBe('warning');
    expect(getStatusBadgeStatus('DISCONNECTED')).toBe('default');
  });

  it('returns default for unknown status', () => {
    expect(getStatusBadgeStatus('UNKNOWN')).toBe('default');
  });

  it('uses custom statusMap when provided', () => {
    expect(getStatusBadgeStatus('MY_STATUS', { MY_STATUS: 'error' })).toBe('error');
  });
});
