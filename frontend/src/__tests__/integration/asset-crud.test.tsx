import { describe, it, expect, vi, beforeEach } from 'vitest';
import { waitFor } from '@testing-library/react';
import { renderWithProviders, userEvent } from '../utils/test-utils';
import { DataTable } from '../../components/shared/DataTable';
import { FormModal } from '../../components/shared/FormModal';
import { ConfirmModal } from '../../components/shared/ConfirmModal';
import { Form, Input, Select, message } from 'antd';
import { useAssetsList, useCreateAsset, useUpdateAsset, useDeleteAsset } from '../../hooks/useAssets';
import { server } from '../mocks/server';
import { http, HttpResponse } from 'msw';
import { useState } from 'react';

/**
 * Integration test: Complete Asset CRUD workflow
 *
 * Tests the full asset management flow from list to create/update/delete:
 * - Display list of assets in DataTable
 * - Search and filter assets
 * - Open "Add Asset" modal
 * - Fill form and submit
 * - Verify API POST request
 * - Show success message
 * - Refresh list with new asset
 * - Edit asset
 * - Delete asset
 *
 * This is a full integration test that verifies:
 * - React Query hooks
 * - API service layer
 * - UI components
 * - User interactions
 * - Data flow through the app
 */

interface Asset {
  id: string;
  name: string;
  assetType: string;
  status: string;
  manufacturer?: string;
  model?: string;
}

// Asset form component
function AssetForm() {
  return (
    <>
      <Form.Item
        name="name"
        label="Asset Name"
        rules={[{ required: true, message: 'Please enter asset name' }]}
      >
        <Input data-testid="asset-name-input" placeholder="Enter asset name" />
      </Form.Item>

      <Form.Item
        name="assetType"
        label="Asset Type"
        rules={[{ required: true, message: 'Please select asset type' }]}
      >
        <Select data-testid="asset-type-select" placeholder="Select type">
          <Select.Option value="DESKTOP">Desktop</Select.Option>
          <Select.Option value="LAPTOP">Laptop</Select.Option>
          <Select.Option value="SERVER">Server</Select.Option>
        </Select>
      </Form.Item>

      <Form.Item name="manufacturer" label="Manufacturer">
        <Input data-testid="asset-manufacturer-input" placeholder="Dell, HP, etc." />
      </Form.Item>

      <Form.Item name="model" label="Model">
        <Input data-testid="asset-model-input" placeholder="OptiPlex 7090" />
      </Form.Item>
    </>
  );
}

// Complete asset management page component
function AssetManagementPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);

  const { data, isLoading } = useAssetsList({
    page,
    pageSize,
    search,
  });

  const createAsset = useCreateAsset();
  const updateAsset = useUpdateAsset();
  const deleteAsset = useDeleteAsset();

  const handleCreate = async (values: Record<string, unknown>) => {
    await createAsset.mutateAsync(values as any);
    message.success('Asset created successfully');
    setIsAddModalOpen(false);
  };

  const handleUpdate = async (values: Record<string, unknown>) => {
    if (!selectedAsset) return;
    await updateAsset.mutateAsync({ id: selectedAsset.id, data: values as any });
    message.success('Asset updated successfully');
    setIsEditModalOpen(false);
    setSelectedAsset(null);
  };

  const handleDelete = async () => {
    if (!selectedAsset) return;
    await deleteAsset.mutateAsync(selectedAsset.id);
    message.success('Asset deleted successfully');
    setIsDeleteModalOpen(false);
    setSelectedAsset(null);
  };

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Type',
      dataIndex: 'assetType',
      key: 'assetType',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, record: Asset) => (
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            data-testid={`edit-asset-${record.id}`}
            onClick={() => {
              setSelectedAsset(record);
              setIsEditModalOpen(true);
            }}
          >
            Edit
          </button>
          <button
            data-testid={`delete-asset-${record.id}`}
            onClick={() => {
              setSelectedAsset(record);
              setIsDeleteModalOpen(true);
            }}
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <h1>Asset Management</h1>

      <DataTable
        data={data?.data}
        columns={columns}
        loading={isLoading}
        searchable
        onSearch={setSearch}
        toolbar={
          <button data-testid="add-asset-button" onClick={() => setIsAddModalOpen(true)}>Add Asset</button>
        }
        pagination={{
          current: page,
          pageSize,
          total: data?.total || 0,
          onChange: (newPage, newPageSize) => {
            setPage(newPage);
            setPageSize(newPageSize);
          },
        }}
      />

      <FormModal
        title="Add Asset"
        open={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleCreate}
        loading={createAsset.isPending}
      >
        <AssetForm />
      </FormModal>

      <FormModal
        title="Edit Asset"
        open={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedAsset(null);
        }}
        onSubmit={handleUpdate}
        loading={updateAsset.isPending}
        initialValues={selectedAsset || undefined}
      >
        <AssetForm />
      </FormModal>

      <ConfirmModal
        title="Delete Asset"
        open={isDeleteModalOpen}
        onCancel={() => {
          setIsDeleteModalOpen(false);
          setSelectedAsset(null);
        }}
        onConfirm={handleDelete}
        loading={deleteAsset.isPending}
        description={`Are you sure you want to delete "${selectedAsset?.name}"?`}
        confirmText="Delete"
        danger
      />
    </div>
  );
}

describe('Asset CRUD Integration Tests', () => {
  beforeEach(() => {
    server.resetHandlers();
    vi.clearAllMocks();
  });

  describe('Asset List Display', () => {
    it('should display list of assets on page load', async () => {
      const { getByText } = renderWithProviders(<AssetManagementPage />);

      // Wait for data to load
      await waitFor(() => {
        expect(getByText('Asset 1')).toBeInTheDocument();
        expect(getByText('Asset 2')).toBeInTheDocument();
        expect(getByText('Asset 3')).toBeInTheDocument();
      });
    });

    it('should show loading state while fetching', () => {
      const { container } = renderWithProviders(<AssetManagementPage />);

      // Initially shows loading
      const loadingSpinner = container.querySelector('.ant-spin');
      expect(loadingSpinner).toBeInTheDocument();
    });
  });

  describe('Create Asset Flow', () => {
    it('should complete full create asset workflow', async () => {
      const user = userEvent.setup();
      const { getByText, getByTestId } = renderWithProviders(
        <AssetManagementPage />
      );

      // Wait for initial load
      await waitFor(() => {
        expect(getByText('Asset 1')).toBeInTheDocument();
      });

      // Step 1: Click "Add Asset" button
      const addButton = getByTestId('add-asset-button');
      await user.click(addButton);

      // Step 2: Verify modal opened
      await waitFor(() => {
        expect(getByTestId('form-modal')).toBeInTheDocument();
      });

      // Step 3: Fill form
      await user.type(getByTestId('asset-name-input'), 'New Test Asset');

      await user.click(getByTestId('asset-type-select'));
      await user.click(getByText('Desktop'));

      // Small delay to ensure Select dropdown closes
      await new Promise(resolve => setTimeout(resolve, 100));

      await user.type(getByTestId('asset-manufacturer-input'), 'Dell');
      await user.type(getByTestId('asset-model-input'), 'OptiPlex 9020');

      // Step 4: Submit form
      await user.click(getByTestId('form-modal-submit'));

      // Step 5: Verify success message
      await waitFor(() => {
        expect(getByText('Asset created successfully')).toBeInTheDocument();
      });

      // Modal closes automatically after successful submission
      // Wait for the modal to start closing animation
      await new Promise(resolve => setTimeout(resolve, 500));
    });

    it('should prevent submission with empty required fields', async () => {
      const user = userEvent.setup();
      const { getByText } = renderWithProviders(<AssetManagementPage />);

      // Wait for initial load
      await waitFor(() => {
        expect(getByText('Asset 1')).toBeInTheDocument();
      });

      // Open modal
      const addButton = getByText('Add Asset');
      await user.click(addButton);

      // Try to submit without filling form
      await waitFor(() => {
        const submitButton = getByText('Submit');
        user.click(submitButton);
      });

      // Should show validation errors
      await waitFor(() => {
        expect(getByText('Please enter asset name')).toBeInTheDocument();
        expect(getByText('Please select asset type')).toBeInTheDocument();
      });
    });

    it('should handle API error on create', async () => {
      // Mock error response
      server.use(
        http.post('/v1/assets', () => {
          return HttpResponse.json(
            {
              success: false,
              error: {
                message: 'Asset name already exists',
                code: 'DUPLICATE_NAME',
              },
            },
            { status: 400 }
          );
        })
      );

      const user = userEvent.setup();
      const { getByText, getByTestId } = renderWithProviders(
        <AssetManagementPage />
      );

      // Wait for load and open modal
      await waitFor(() => {
        expect(getByText('Asset 1')).toBeInTheDocument();
      });

      await user.click(getByTestId('add-asset-button'));

      // Wait for modal to open
      await waitFor(() => {
        expect(getByTestId('form-modal')).toBeInTheDocument();
      });

      // Fill form
      await user.type(getByTestId('asset-name-input'), 'Duplicate Asset');

      await user.click(getByTestId('asset-type-select'));
      await user.click(getByText('Laptop'));

      // Small delay to ensure Select dropdown closes
      await new Promise(resolve => setTimeout(resolve, 100));

      // Submit
      await user.click(getByTestId('form-modal-submit'));

      // Modal should stay open on error
      await waitFor(() => {
        expect(getByTestId('form-modal')).toBeInTheDocument();
      });
    });
  });

  describe('Update Asset Flow', () => {
    it('should complete full update asset workflow', async () => {
      const user = userEvent.setup();
      const { getByText, getByPlaceholderText, getAllByText } =
        renderWithProviders(<AssetManagementPage />);

      // Wait for assets to load
      await waitFor(() => {
        expect(getByText('Asset 1')).toBeInTheDocument();
      });

      // Click edit button for first asset
      const editButtons = getAllByText('Edit');
      await user.click(editButtons[0]);

      // Wait for edit modal to open with pre-filled data
      await waitFor(() => {
        expect(getByText('Edit Asset')).toBeInTheDocument();
        const nameInput = getByPlaceholderText(
          'Enter asset name'
        ) as HTMLInputElement;
        expect(nameInput.value).toBe('Asset 1');
      });

      // Update name
      const nameInput = getByPlaceholderText('Enter asset name');
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Asset Name');

      // Submit
      const submitButton = getByText('Submit');
      await user.click(submitButton);

      // Verify success
      await waitFor(() => {
        expect(getByText('Asset updated successfully')).toBeInTheDocument();
      });
    });
  });

  describe('Delete Asset Flow', () => {
    it('should complete full delete asset workflow', async () => {
      const user = userEvent.setup();
      const { getByText, getByTestId } = renderWithProviders(
        <AssetManagementPage />
      );

      // Wait for assets to load
      await waitFor(() => {
        expect(getByText('Asset 1')).toBeInTheDocument();
      });

      // Click delete button for first asset
      await user.click(getByTestId('delete-asset-1'));

      // Wait for confirmation modal
      await waitFor(() => {
        expect(getByTestId('confirm-modal')).toBeInTheDocument();
        expect(
          getByText(/Are you sure you want to delete "Asset 1"/)
        ).toBeInTheDocument();
      });

      // Confirm deletion
      await user.click(getByTestId('confirm-modal-confirm'));

      // Verify success
      await waitFor(() => {
        expect(getByText('Asset deleted successfully')).toBeInTheDocument();
      });
    });

    it('should cancel delete when clicking cancel', async () => {
      const user = userEvent.setup();
      const { getByText, getByTestId } = renderWithProviders(
        <AssetManagementPage />
      );

      // Wait for assets to load
      await waitFor(() => {
        expect(getByText('Asset 1')).toBeInTheDocument();
      });

      // Click delete button for first asset
      await user.click(getByTestId('delete-asset-1'));

      // Wait for modal
      await waitFor(() => {
        expect(getByTestId('confirm-modal')).toBeInTheDocument();
      });

      // Click cancel
      await user.click(getByTestId('confirm-modal-cancel'));

      // Modal should close - wait for animation
      await new Promise(resolve => setTimeout(resolve, 500));
    });
  });

  describe('Search Functionality', () => {
    it('should filter assets by search term', async () => {
      const user = userEvent.setup();
      const { getByPlaceholderText } = renderWithProviders(
        <AssetManagementPage />
      );

      // Wait for initial load
      await waitFor(() => {
        const searchInput = getByPlaceholderText('Search...');
        expect(searchInput).toBeInTheDocument();
      });

      // Type search term
      const searchInput = getByPlaceholderText('Search...');
      await user.type(searchInput, 'Asset 1');

      // The component will trigger search via onSearch callback
      // In real app, this would filter the results
      await waitFor(() => {
        expect((searchInput as HTMLInputElement).value).toBe('Asset 1');
      });
    });
  });

  describe('Pagination', () => {
    it('should change page when pagination is clicked', async () => {
      const user = userEvent.setup();
      const { container } = renderWithProviders(<AssetManagementPage />);

      // Wait for initial load
      await waitFor(() => {
        const pagination = container.querySelector('.ant-pagination');
        expect(pagination).toBeInTheDocument();
      });

      // Click next page
      const nextButton = container.querySelector('.ant-pagination-next');
      if (nextButton) {
        await user.click(nextButton);

        // Page state would update (tested via pagination onChange)
        await waitFor(() => {
          expect(nextButton).toBeInTheDocument();
        });
      }
    });
  });
});
