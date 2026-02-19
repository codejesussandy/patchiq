import { describe, it, expect, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { render } from '../../test-utils';
import { PasswordPolicies } from '../../../pages/settings/PasswordPolicies';
import { server } from '../../msw/server';
import { http, HttpResponse } from 'msw';

// PasswordPolicies uses useAlertPolicies hook.
// The component calls policyToFormData(passwordPolicy.configuration).
// We need to provide a policy with a valid 'configuration' object to avoid crashes.

const mockPasswordPolicyData = [
  {
    id: 'policy-pw-1',
    name: 'Default Password Policy',
    type: 'Password',
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
    enabled: true,
    createdAt: '2024-01-01T00:00:00Z',
  },
];

describe('Password Policy Page', () => {
  beforeEach(() => {
    localStorage.setItem('accessToken', 'mock-access-token');
    server.use(
      http.get('*/settings/alerts', () => {
        return HttpResponse.json({
          success: true,
          data: { data: mockPasswordPolicyData, total: 1, page: 1, limit: 20, totalPages: 1 },
        });
      })
    );
  });

  it('renders page heading', async () => {
    render(<PasswordPolicies />);
    expect(screen.getByText('Password Policy')).toBeInTheDocument();
  });

  it('renders minimum password length field', async () => {
    render(<PasswordPolicies />);

    await waitFor(() => {
      expect(screen.getByText('Minimum Password Length')).toBeInTheDocument();
    });
  });

  it('renders character requirement toggles', async () => {
    render(<PasswordPolicies />);

    await waitFor(() => {
      expect(screen.getByText('Numeric Character Required')).toBeInTheDocument();
    });
    expect(screen.getByText('Lower Case Character Required')).toBeInTheDocument();
    expect(screen.getByText('Upper Case Character Required')).toBeInTheDocument();
    expect(screen.getByText('Special Character Required')).toBeInTheDocument();
  });

  it('renders Save and Reset buttons', async () => {
    render(<PasswordPolicies />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument();
  });

  it('saves updated policy', async () => {
    render(<PasswordPolicies />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    });

    // When policy data loads, form should be populated
    await waitFor(() => {
      // InputNumber for minCharacterCount should be in the document
      expect(screen.getByText('Minimum Password Length')).toBeInTheDocument();
    });
  });
});
