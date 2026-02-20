import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { render } from '../../test-utils';
import { SeverityBadge } from '@/components/patches/SeverityBadge';

describe('SeverityBadge', () => {
  it('renders the severity text', () => {
    render(<SeverityBadge severity="CRITICAL" />);
    expect(screen.getByText('CRITICAL')).toBeInTheDocument();
  });

  it('renders with role status', () => {
    render(<SeverityBadge severity="HIGH" />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders correct aria-label for CRITICAL', () => {
    render(<SeverityBadge severity="CRITICAL" />);
    expect(screen.getByLabelText('Critical severity')).toBeInTheDocument();
  });

  it('renders correct aria-label for HIGH', () => {
    render(<SeverityBadge severity="HIGH" />);
    expect(screen.getByLabelText('High severity')).toBeInTheDocument();
  });

  it('renders correct aria-label for MEDIUM', () => {
    render(<SeverityBadge severity="MEDIUM" />);
    expect(screen.getByLabelText('Medium severity')).toBeInTheDocument();
  });

  it('renders correct aria-label for LOW', () => {
    render(<SeverityBadge severity="LOW" />);
    expect(screen.getByLabelText('Low severity')).toBeInTheDocument();
  });

  it('renders correct aria-label for UNSPECIFIED', () => {
    render(<SeverityBadge severity="UNSPECIFIED" />);
    expect(screen.getByLabelText('Unspecified severity')).toBeInTheDocument();
  });

  it('renders icon when showIcon is true', () => {
    const { container } = render(<SeverityBadge severity="CRITICAL" showIcon />);
    const iconSpan = container.querySelector('[aria-hidden="true"]');
    expect(iconSpan).toBeInTheDocument();
  });

  it('does not render icon when showIcon is false', () => {
    const { container } = render(<SeverityBadge severity="CRITICAL" showIcon={false} />);
    const iconSpan = container.querySelector('[aria-hidden="true"]');
    expect(iconSpan).not.toBeInTheDocument();
  });

  it('handles case-insensitive severity input', () => {
    render(<SeverityBadge severity="critical" />);
    expect(screen.getByLabelText('Critical severity')).toBeInTheDocument();
  });

  it('renders unknown severity with fallback styling', () => {
    render(<SeverityBadge severity="UNKNOWN" />);
    expect(screen.getByText('UNKNOWN')).toBeInTheDocument();
    expect(screen.getByLabelText('UNKNOWN severity')).toBeInTheDocument();
  });

  it('renders as an Ant Tag component', () => {
    const { container } = render(<SeverityBadge severity="HIGH" />);
    expect(container.querySelector('.ant-tag')).toBeInTheDocument();
  });
});
