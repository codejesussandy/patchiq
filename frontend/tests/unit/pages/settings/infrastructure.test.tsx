import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../test-utils';
import { ServerSettings } from '@/pages/settings/ServerSettings';

vi.mock('@/hooks/useSettings', () => ({
  useServerSettings: vi.fn(() => ({
    data: {
      sessionTimeout: true,
      sessionTimeoutMinutes: 60,
      sessionIdleTimeoutMinutes: 15,
      endpointOnlineStatusTimeoutHours: 1,
      endpointScanJobTimeoutHours: 2,
      logLevel: 'Debug',
    },
    isLoading: false,
  })),
  useUpdateServerSettings: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
}));

describe('ServerSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the page title', () => {
    render(<ServerSettings />);
    expect(screen.getByText('Server Settings')).toBeInTheDocument();
  });

  it('renders Session Timeout toggle', () => {
    render(<ServerSettings />);
    expect(screen.getByText('Session Timeout')).toBeInTheDocument();
  });

  it('renders session timeout fields', () => {
    render(<ServerSettings />);
    expect(screen.getByText('* Session Timeout')).toBeInTheDocument();
    expect(screen.getByText('* Session Idle Timeout')).toBeInTheDocument();
  });

  it('renders endpoint timeout fields', () => {
    render(<ServerSettings />);
    expect(screen.getByText('* Endpoint Online Status Timeout')).toBeInTheDocument();
    expect(screen.getByText('* EDCA, Scan Job Time')).toBeInTheDocument();
  });

  it('renders Save and Reset buttons', () => {
    render(<ServerSettings />);
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument();
  });
});
