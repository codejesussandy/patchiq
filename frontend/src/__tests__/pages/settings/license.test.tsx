import { describe, it, expect, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { render } from '../../test-utils';
import { PlatformLicense } from '../../../pages/settings/PlatformLicense';
import { server } from '../../msw/server';
import { http, HttpResponse } from 'msw';

// The PlatformLicense component expects a License interface with licenseType, licenseTo, productCode, etc.
// The MSW mock returns { id, licenseKey, status, type, maxEndpoints, usedEndpoints, expiresAt, features }
// This causes getLicenseTypeColor(undefined) to crash. We override with proper shape.

const mockLicenseData = {
  licenseTo: 'PatchIQ Inc.',
  productCode: 'PATCHIQ-ENT',
  licenseType: 'enterprise',
  productVersion: '1.0.0',
  poNumber: 'PO-001',
  invoiceNumber: 'INV-001',
  email: 'admin@patchiq.io',
  partner: 'Direct',
  issueDate: '2024-01-01T00:00:00Z',
  expiresOn: '2025-12-31T00:00:00Z',
  numberOfEndpoints: 1000,
  usedEndpoints: 150,
  activationCode: 'ACT-XXXX-XXXX-XXXX',
  remainingDays: 365,
  remainingEndpoints: 850,
};

describe('Platform License Page', () => {
  beforeEach(() => {
    localStorage.setItem('accessToken', 'mock-access-token');
    server.use(
      http.get('*/settings/platform-license', () => {
        return HttpResponse.json({ success: true, data: mockLicenseData });
      })
    );
  });

  it('renders page heading', async () => {
    render(<PlatformLicense />);
    expect(screen.getByText('Platform License')).toBeInTheDocument();
  });

  it('renders refresh button', async () => {
    render(<PlatformLicense />);
    expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
  });

  it('renders current license info', async () => {
    render(<PlatformLicense />);

    await waitFor(() => {
      expect(screen.getByText('ENTERPRISE')).toBeInTheDocument();
    });

    expect(screen.getByText(/License To: PatchIQ Inc\./)).toBeInTheDocument();
    expect(screen.getByText(/Product Code: PATCHIQ-ENT/)).toBeInTheDocument();
  });

  it('renders endpoint counts', async () => {
    render(<PlatformLicense />);

    await waitFor(() => {
      expect(screen.getByText('1000')).toBeInTheDocument();
    });
    expect(screen.getByText('150')).toBeInTheDocument();
    expect(screen.getByText('Remaining Days')).toBeInTheDocument();
    expect(screen.getByText('Remaining Endpoints')).toBeInTheDocument();
  });

  it('renders activation code section', async () => {
    render(<PlatformLicense />);

    await waitFor(() => {
      expect(screen.getByText('Activation Code')).toBeInTheDocument();
    });
  });

  it('renders update license form', async () => {
    render(<PlatformLicense />);

    // The Update License card title uses Typography Title which renders as h4
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Paste your license code here')).toBeInTheDocument();
    });
  });

  it('shows error state when API fails', async () => {
    server.use(
      http.get('*/settings/platform-license', () => {
        return HttpResponse.json({ success: false, error: { message: 'Server error' } }, { status: 500 });
      })
    );

    render(<PlatformLicense />);

    await waitFor(() => {
      expect(screen.queryByText('Update License')).not.toBeInTheDocument();
    });
    expect(screen.getByText('Platform License')).toBeInTheDocument();
  });
});
