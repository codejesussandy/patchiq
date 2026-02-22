import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../test-utils';
import { BranchLocation } from '@/pages/settings/BranchLocation';

describe('BranchLocation', () => {
  it('renders the page title', () => {
    render(<BranchLocation />);
    expect(screen.getByText('Branch Location Settings')).toBeInTheDocument();
  });

  it('renders coming soon message', () => {
    render(<BranchLocation />);
    expect(screen.getByText(/configure branch office locations/i)).toBeInTheDocument();
  });
});
