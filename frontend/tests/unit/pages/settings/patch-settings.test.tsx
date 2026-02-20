import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../test-utils';
import { PatchPreferences } from '@/pages/settings/PatchPreferences';

vi.mock('@/hooks/useSettings', () => ({
  usePatchPreference: vi.fn(() => ({
    data: {
      enablePatching: true,
      corridorOnlyApprovedPatch: false,
      patchSyncForOS: ['Windows'],
      patchApprovalPolicy: 'PreApproved',
      enableThirdPartyPatching: true,
      patchApprovalScheduleTime: '08:00:00',
      scheduleTime: '12:00:00',
      zeroTouchDeploymentScheduleTime: '03:00:00',
      lastSyncedAt: '2024-06-15 10:30:00',
    },
    isLoading: false,
  })),
  useUpdatePatchPreference: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
  useSyncPatchNow: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
}));

describe('PatchPreferences', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the page title', () => {
    render(<PatchPreferences />);
    expect(screen.getByText('Patch Preferences')).toBeInTheDocument();
  });

  it('renders Enable Patching checkbox', () => {
    render(<PatchPreferences />);
    expect(screen.getByText('Enable Patching')).toBeInTheDocument();
  });

  it('renders Patch Approval Policy radio group', () => {
    render(<PatchPreferences />);
    expect(screen.getByText('Pre Approved')).toBeInTheDocument();
    expect(screen.getByText('Manually Approves')).toBeInTheDocument();
    expect(screen.getByText('Test and Approve')).toBeInTheDocument();
  });

  it('renders Sync Now and Reset buttons', () => {
    render(<PatchPreferences />);
    expect(screen.getByRole('button', { name: /sync now/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument();
  });

  it('renders Save button', () => {
    render(<PatchPreferences />);
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
  });
});
