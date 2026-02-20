import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../test-utils';
import { PasswordPolicies } from '@/pages/settings/PasswordPolicies';

vi.mock('@/hooks/useSettings', () => ({
  useAlertPolicies: vi.fn(() => ({
    data: [
      {
        id: '1',
        name: 'Default Password Policy',
        type: 'Password',
        orgUnit: 'HQ',
        affectedRoles: ['Admin'],
        description: 'Default policy',
        configuration: {
          minCharacterCount: 8,
          minNumbers: 1,
          minLowerCaseCharacters: 1,
          minUpperCaseCharacters: 1,
          minSpecialCharacters: 1,
          maxCharacterCount: 128,
          changeEveryDays: 90,
          lastNPasswordHistory: 5,
          resetDuration: 'Days',
        },
      },
    ],
    isLoading: false,
  })),
  useUpdateAlertPolicy: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
}));

describe('PasswordPolicies', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the page title', () => {
    render(<PasswordPolicies />);
    expect(screen.getByText('Password Policy')).toBeInTheDocument();
  });

  it('renders minimum password length field', () => {
    render(<PasswordPolicies />);
    expect(screen.getByText('Minimum Password Length')).toBeInTheDocument();
  });

  it('renders character requirement toggles', () => {
    render(<PasswordPolicies />);
    expect(screen.getByText('Numeric Character Required')).toBeInTheDocument();
    expect(screen.getByText('Lower Case Character Required')).toBeInTheDocument();
    expect(screen.getByText('Upper Case Character Required')).toBeInTheDocument();
    expect(screen.getByText('Special Character Required')).toBeInTheDocument();
  });

  it('renders Save and Reset buttons', () => {
    render(<PasswordPolicies />);
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument();
  });
});
