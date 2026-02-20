import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { render } from '../../test-utils';
import { PatchDetails } from '@/pages/patches/PatchDetails';

function renderPatchDetails(patchId = 'patch-1') {
  return render(
    <Routes>
      <Route path="/patches/:id" element={<PatchDetails />} />
    </Routes>,
    { initialEntries: [`/patches/${patchId}`] }
  );
}

describe('PatchDetails Page', () => {
  beforeEach(() => {
    localStorage.setItem('accessToken', 'mock-access-token');
  });

  it('renders patch software name from API', async () => {
    renderPatchDetails('patch-1');

    await waitFor(() => {
      expect(screen.getAllByText('Windows 11 Cumulative Update').length).toBeGreaterThan(0);
    });
  });

  it('renders Back button', async () => {
    renderPatchDetails('patch-1');

    await waitFor(() => {
      expect(screen.getByText('Back')).toBeInTheDocument();
    });
  });

  it('renders Deploy button', async () => {
    renderPatchDetails('patch-1');

    await waitFor(() => {
      expect(screen.getByText('Deploy')).toBeInTheDocument();
    });
  });

  it('renders Edit button', async () => {
    renderPatchDetails('patch-1');

    await waitFor(() => {
      expect(screen.getByText('Edit')).toBeInTheDocument();
    });
  });

  it('renders tab labels', async () => {
    renderPatchDetails('patch-1');

    await waitFor(() => {
      expect(screen.getByText('Details')).toBeInTheDocument();
    });

    expect(screen.getByRole('tab', { name: /Endpoints/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Recommendations/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Affected Software/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Vulnerabilities/ })).toBeInTheDocument();
  });

  it('shows Patch not found for non-existent ID', async () => {
    renderPatchDetails('nonexistent-patch');

    await waitFor(() => {
      expect(screen.getByText('Patch not found')).toBeInTheDocument();
    });
  });

  it('renders patch details info', async () => {
    renderPatchDetails('patch-1');

    await waitFor(() => {
      expect(screen.getByText('Severity')).toBeInTheDocument();
    });

    expect(screen.getByText('Category')).toBeInTheDocument();
  });

  it('renders Supersedence section', async () => {
    renderPatchDetails('patch-1');

    await waitFor(() => {
      expect(screen.getByText('Supersedence')).toBeInTheDocument();
    });
  });
});
