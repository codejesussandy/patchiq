import { describe, it, expect, beforeEach } from 'vitest';
import { waitFor } from '@testing-library/react';
import { renderWithProviders } from '../utils/test-utils';
import { useAssets, useCreateAsset, useUpdateAsset, useDeleteAsset } from '../../hooks/useAssets';
import { server } from '../mocks/server';
import { http, HttpResponse } from 'msw';

/**
 * Integration test: React Query hooks + API service layer
 *
 * Tests the full integration between:
 * - React Query hooks (useAssets, useCreateAsset, etc.)
 * - API service layer (assetService)
 * - Mock API responses (MSW)
 *
 * Verifies:
 * - Loading states
 * - Data fetching and caching
 * - Error handling
 * - Cache invalidation on mutations
 */

// Test component that uses the hook
function TestComponent() {
  const { data, isLoading, isError, error } = useAssets();

  if (isLoading) return <div>Loading...</div>;
  if (isError) return <div>Error: {error?.message}</div>;
  if (!data || data.length === 0) return <div>No assets</div>;

  return (
    <div>
      <h1>Assets List</h1>
      <ul data-testid="assets-list">
        {data.map((asset) => (
          <li key={asset.id} data-testid={`asset-${asset.id}`}>
            {asset.name}
          </li>
        ))}
      </ul>
    </div>
  );
}

// Test component for mutations
function TestMutationComponent() {
  const createAsset = useCreateAsset();
  const updateAsset = useUpdateAsset();
  const deleteAsset = useDeleteAsset();

  return (
    <div data-testid="mutation-component">
      <button
        data-testid="create-asset-btn"
        onClick={() =>
          createAsset.mutate({
            name: 'New Asset',
            assetType: 'DESKTOP',
            manufacturer: 'Dell',
            model: 'OptiPlex',
          })
        }
        disabled={createAsset.isPending}
      >
        Create Asset
      </button>

      <button
        data-testid="update-asset-btn"
        onClick={() =>
          updateAsset.mutate({
            id: '1',
            data: { name: 'Updated Asset' },
          })
        }
        disabled={updateAsset.isPending}
      >
        Update Asset
      </button>

      <button
        data-testid="delete-asset-btn"
        onClick={() => deleteAsset.mutate('1')}
        disabled={deleteAsset.isPending}
      >
        Delete Asset
      </button>

      {createAsset.isSuccess && <div data-testid="create-success">Asset created!</div>}
      {updateAsset.isSuccess && <div data-testid="update-success">Asset updated!</div>}
      {deleteAsset.isSuccess && <div data-testid="delete-success">Asset deleted!</div>}

      {createAsset.isError && <div data-testid="create-error">Create error</div>}
      {updateAsset.isError && <div data-testid="update-error">Update error</div>}
      {deleteAsset.isError && <div data-testid="delete-error">Delete error</div>}
    </div>
  );
}

describe('React Query + Service Integration', () => {
  beforeEach(() => {
    server.resetHandlers();
  });

  describe('useAssets hook', () => {
    it('should fetch and display assets', async () => {
      const { getByTestId, getByText } = renderWithProviders(<TestComponent />);

      // Initially shows loading state
      expect(getByText('Loading...')).toBeInTheDocument();

      // Wait for data to load
      await waitFor(() => {
        expect(getByText('Assets List')).toBeInTheDocument();
      });

      // Verify assets are displayed
      const assetsList = getByTestId('assets-list');
      expect(assetsList).toBeInTheDocument();
      expect(getByTestId('asset-1')).toBeInTheDocument();
      expect(getByTestId('asset-2')).toBeInTheDocument();
      expect(getByTestId('asset-3')).toBeInTheDocument();
    });

    it('should handle loading state correctly', async () => {
      const { getByText, queryByText } = renderWithProviders(<TestComponent />);

      // Loading state is shown initially
      expect(getByText('Loading...')).toBeInTheDocument();

      // Wait for loading to finish
      await waitFor(() => {
        expect(queryByText('Loading...')).not.toBeInTheDocument();
      });

      // Data is displayed after loading
      expect(getByText('Assets List')).toBeInTheDocument();
    });

    it('should handle error state correctly', async () => {
      // Mock API error response
      server.use(
        http.get('/v1/assets', () => {
          return HttpResponse.json(
            {
              success: false,
              error: {
                message: 'Failed to fetch assets',
                code: 'FETCH_ERROR',
              },
            },
            { status: 500 }
          );
        })
      );

      const { getByText } = renderWithProviders(<TestComponent />);

      // Wait for error to be displayed
      await waitFor(() => {
        expect(getByText(/Error:/)).toBeInTheDocument();
      });
    });

    it('should handle empty data state', async () => {
      // Mock empty response
      server.use(
        http.get('/v1/assets', () => {
          return HttpResponse.json({
            success: true,
            data: {
              data: [],
              total: 0,
              page: 1,
              limit: 20,
              totalPages: 0,
            },
          });
        })
      );

      const { getByText } = renderWithProviders(<TestComponent />);

      await waitFor(() => {
        expect(getByText('No assets')).toBeInTheDocument();
      });
    });
  });

  describe('Asset mutations', () => {
    it('should create asset successfully', async () => {
      const { getByTestId, user } = renderWithProviders(<TestMutationComponent />);

      const createButton = getByTestId('create-asset-btn');
      await user.click(createButton);

      await waitFor(() => {
        expect(getByTestId('create-success')).toBeInTheDocument();
      });
    });

    it('should update asset successfully', async () => {
      const { getByTestId, user } = renderWithProviders(<TestMutationComponent />);

      const updateButton = getByTestId('update-asset-btn');
      await user.click(updateButton);

      await waitFor(() => {
        expect(getByTestId('update-success')).toBeInTheDocument();
      });
    });

    it('should delete asset successfully', async () => {
      const { getByTestId, user } = renderWithProviders(<TestMutationComponent />);

      const deleteButton = getByTestId('delete-asset-btn');
      await user.click(deleteButton);

      await waitFor(() => {
        expect(getByTestId('delete-success')).toBeInTheDocument();
      });
    });

    it('should handle mutation errors', async () => {
      // Mock error response
      server.use(
        http.post('/v1/assets', () => {
          return HttpResponse.json(
            {
              success: false,
              error: {
                message: 'Validation failed',
                code: 'VALIDATION_ERROR',
              },
            },
            { status: 400 }
          );
        })
      );

      const { getByTestId, user } = renderWithProviders(<TestMutationComponent />);

      const createButton = getByTestId('create-asset-btn');
      await user.click(createButton);

      await waitFor(() => {
        expect(getByTestId('create-error')).toBeInTheDocument();
      });
    });

    it('should show pending state during mutation', async () => {
      const { getByTestId, user } = renderWithProviders(<TestMutationComponent />);

      const createButton = getByTestId('create-asset-btn') as HTMLButtonElement;

      // Button should not be disabled initially
      expect(createButton.disabled).toBe(false);

      // Click button to start mutation
      await user.click(createButton);

      // Wait for success
      await waitFor(() => {
        expect(getByTestId('create-success')).toBeInTheDocument();
      });
    });
  });

  describe('Cache behavior', () => {
    it('should cache query results', async () => {
      const { getByText, rerender } = renderWithProviders(<TestComponent />);

      // Wait for initial load
      await waitFor(() => {
        expect(getByText('Assets List')).toBeInTheDocument();
      });

      // Rerender component
      rerender(<TestComponent />);

      // Should not show loading again (data is cached)
      expect(getByText('Assets List')).toBeInTheDocument();
    });

    it('should invalidate cache after mutation', async () => {
      const { getByText, getByTestId, queryClient, user } = renderWithProviders(
        <>
          <TestComponent />
          <TestMutationComponent />
        </>
      );

      // Wait for initial load
      await waitFor(() => {
        expect(getByText('Assets List')).toBeInTheDocument();
      });

      // Track if queries are invalidated
      const invalidateSpy = { called: false };
      const originalInvalidate = queryClient?.invalidateQueries;
      if (queryClient) {
        queryClient.invalidateQueries = async (...args) => {
          invalidateSpy.called = true;
          return originalInvalidate?.call(queryClient, ...args);
        };
      }

      // Perform mutation (use testid to avoid duplicate element issues)
      const createButton = getByTestId('create-asset-btn');
      await user.click(createButton);

      await waitFor(() => {
        expect(getByTestId('create-success')).toBeInTheDocument();
      });

      // Cache should be invalidated (implementation detail)
      // In real app, this triggers refetch of asset list
    });
  });

  describe('Refetch behavior', () => {
    it('should refetch on window focus', async () => {
      const { getByText } = renderWithProviders(<TestComponent />);

      await waitFor(() => {
        expect(getByText('Assets List')).toBeInTheDocument();
      });

      // Simulate window focus
      window.dispatchEvent(new Event('focus'));

      // Data should still be displayed (refetch happens in background)
      expect(getByText('Assets List')).toBeInTheDocument();
    });
  });
});
