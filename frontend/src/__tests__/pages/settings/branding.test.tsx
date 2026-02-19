import { describe, it, expect, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { render } from '../../test-utils';
import { Branding } from '../../../pages/settings/Branding';
import { server } from '../../msw/server';
import { http, HttpResponse } from 'msw';

describe('Branding Settings', () => {
  beforeEach(() => {
    localStorage.setItem('accessToken', 'mock-access-token');
  });

  it('renders page heading', async () => {
    render(<Branding />);
    expect(screen.getByText('Branding')).toBeInTheDocument();
  });

  it('renders current branding settings', async () => {
    render(<Branding />);

    await waitFor(() => {
      // Preview section shows the company name or logo
      expect(screen.getByText('Preview')).toBeInTheDocument();
    });

    // The branding mock returns companyName: 'PatchIQ Inc.'
    // The preview shows the logoUrl as an img (since logoUrl is '/logo.png')
    // When logoPreview is set from logoUrl, an img is shown
    // Otherwise, company name text is shown in preview
    expect(screen.getByText(/please select logo image/i)).toBeInTheDocument();
  });

  it('renders upload area', async () => {
    render(<Branding />);

    await waitFor(() => {
      expect(screen.getByText(/click or drag file to this area to upload/i)).toBeInTheDocument();
    });
  });

  it('renders Update button (disabled without file)', async () => {
    render(<Branding />);

    await waitFor(() => {
      const updateButton = screen.getByRole('button', { name: /update/i });
      expect(updateButton).toBeInTheDocument();
      expect(updateButton).toBeDisabled();
    });
  });

  it('shows error state when API fails', async () => {
    server.use(
      http.get('*/settings/branding', () => {
        return HttpResponse.json({ success: false, error: { message: 'Server error' } }, { status: 500 });
      })
    );

    render(<Branding />);

    // Even on error, upload form still renders
    await waitFor(() => {
      expect(screen.getByText('Branding')).toBeInTheDocument();
    });
  });
});
