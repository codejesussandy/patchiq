import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { render } from '../../test-utils';
import { AssetDetails } from '@/pages/assets/components/AssetDetails';

function renderAssetDetails(assetId = 'asset-1') {
  return render(
    <Routes>
      <Route path="/assets/:id" element={<AssetDetails />} />
      <Route path="/assets" element={<div>Assets List</div>} />
    </Routes>,
    { initialEntries: [`/assets/${assetId}`] }
  );
}

describe('AssetDetails Page', () => {
  beforeEach(() => {
    localStorage.setItem('accessToken', 'mock-access-token');
  });

  it('renders Asset Details heading', async () => {
    renderAssetDetails();
    expect(await screen.findByRole('heading', { name: /asset details/i })).toBeInTheDocument();
  });

  it('renders Back button', async () => {
    renderAssetDetails();
    expect(await screen.findByRole('button', { name: /back/i })).toBeInTheDocument();
  });

  it('renders Edit Asset button', async () => {
    renderAssetDetails();
    expect(await screen.findByRole('button', { name: /edit asset/i })).toBeInTheDocument();
  });

  it('renders tab labels', async () => {
    renderAssetDetails();
    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /details/i })).toBeInTheDocument();
    });
    expect(screen.getByRole('tab', { name: /hardware/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /software/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /audit log/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /vulnerabilities/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /patches/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /alerts/i })).toBeInTheDocument();
  });

  it('shows loading spinner initially', () => {
    renderAssetDetails();
    expect(document.querySelector('.ant-spin')).toBeInTheDocument();
  });

  it('navigates away for non-existent asset ID', async () => {
    renderAssetDetails('nonexistent-id');
    // Component navigates to /assets on error
    await waitFor(() => {
      expect(screen.getByText('Assets List')).toBeInTheDocument();
    }, { timeout: 5000 });
  });
});
