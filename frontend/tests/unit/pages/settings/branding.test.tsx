import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../test-utils';
import { Branding } from '@/pages/settings/Branding';

vi.mock('@/hooks/useSettings', () => ({
  useBrandingSettings: vi.fn(() => ({
    data: { logoUrl: '', companyName: 'SkenzerIQ' },
    isLoading: false,
  })),
  useUpdateBranding: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
}));

describe('Branding', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the page title', () => {
    render(<Branding />);
    expect(screen.getByText('Branding')).toBeInTheDocument();
  });

  it('renders the preview section', () => {
    render(<Branding />);
    expect(screen.getByText('Preview')).toBeInTheDocument();
  });

  it('renders the upload area text', () => {
    render(<Branding />);
    expect(screen.getByText(/click or drag file/i)).toBeInTheDocument();
  });

  it('renders the Update button as disabled when no logo file', () => {
    render(<Branding />);
    const updateBtn = screen.getByRole('button', { name: /update/i });
    expect(updateBtn).toBeInTheDocument();
    expect(updateBtn).toBeDisabled();
  });

  it('renders the page heading element', () => {
    render(<Branding />);
    expect(screen.getByText('Branding')).toBeInTheDocument();
  });
});
