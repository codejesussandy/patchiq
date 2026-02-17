import { describe, it, expect, vi, beforeEach } from 'vitest';
import { waitFor, screen } from '@testing-library/react';
import { renderWithProviders } from '../utils/test-utils';
import { FormModal } from '../../components/shared/FormModal';
import { Form, Input, Select } from 'antd';

/**
 * Integration test: Form validation flow
 *
 * Tests the complete form validation workflow:
 * - Empty form submission validation
 * - Field-level validation
 * - Custom validation rules
 * - Success submission
 * - Error display
 *
 * Verifies integration between:
 * - FormModal component
 * - Ant Design Form
 * - User interactions
 * - Validation rules
 */

// Test form component with validation rules
function TestAddAssetForm() {
  return (
    <>
      <Form.Item
        name="name"
        label="Asset Name"
        rules={[
          { required: true, message: 'Asset name is required' },
          { min: 3, message: 'Name must be at least 3 characters' },
        ]}
      >
        <Input placeholder="Enter asset name" data-testid="asset-name-input" />
      </Form.Item>

      <Form.Item
        name="assetType"
        label="Asset Type"
        rules={[{ required: true, message: 'Asset type is required' }]}
      >
        <Select placeholder="Select asset type" data-testid="asset-type-select">
          <Select.Option value="DESKTOP">Desktop</Select.Option>
          <Select.Option value="LAPTOP">Laptop</Select.Option>
          <Select.Option value="SERVER">Server</Select.Option>
        </Select>
      </Form.Item>

      <Form.Item
        name="ipAddress"
        label="IP Address"
        rules={[
          { required: false },
          {
            pattern:
              /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
            message: 'Invalid IP address format',
          },
        ]}
      >
        <Input placeholder="192.168.1.100" data-testid="ip-address-input" />
      </Form.Item>

      <Form.Item
        name="email"
        label="Contact Email"
        rules={[
          { type: 'email', message: 'Invalid email format' },
          { required: false },
        ]}
      >
        <Input placeholder="user@example.com" data-testid="email-input" />
      </Form.Item>
    </>
  );
}

describe('Form Validation Integration Tests', () => {
  let handleSubmit: ReturnType<typeof vi.fn>;
  let handleClose: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    handleSubmit = vi.fn();
    handleClose = vi.fn();
  });

  describe('Empty form submission', () => {
    it('should prevent submission and show validation errors', async () => {
      const { getByTestId, user } = renderWithProviders(
        <FormModal
          title="Add Asset"
          open={true}
          onClose={handleClose}
          onSubmit={handleSubmit}
        >
          <TestAddAssetForm />
        </FormModal>
      );

      // Click submit without filling form
      const submitButton = getByTestId('form-modal-submit');
      await user.click(submitButton);

      // Wait for validation errors to appear
      await waitFor(() => {
        expect(screen.getByText('Asset name is required')).toBeInTheDocument();
        expect(screen.getByText('Asset type is required')).toBeInTheDocument();
      });

      // Should not call submit handler
      expect(handleSubmit).not.toHaveBeenCalled();
    });
  });

  describe('Field-level validation', () => {
    it('should show error for name too short', async () => {
      const { getByTestId, user } = renderWithProviders(
        <FormModal
          title="Add Asset"
          open={true}
          onClose={handleClose}
          onSubmit={handleSubmit}
        >
          <TestAddAssetForm />
        </FormModal>
      );

      // Type short name
      const nameInput = getByTestId('asset-name-input');
      await user.type(nameInput, 'AB');
      await user.click(getByTestId('form-modal-submit'));

      await waitFor(() => {
        expect(screen.getByText('Name must be at least 3 characters')).toBeInTheDocument();
      });
    });

    it('should show error for invalid IP address', async () => {
      const { getByTestId, user } = renderWithProviders(
        <FormModal
          title="Add Asset"
          open={true}
          onClose={handleClose}
          onSubmit={handleSubmit}
        >
          <TestAddAssetForm />
        </FormModal>
      );

      // Fill required fields
      await user.type(getByTestId('asset-name-input'), 'Test Asset');
      await user.click(getByTestId('asset-type-select'));
      await user.click(screen.getByText('Desktop'));

      // Type invalid IP
      await user.type(getByTestId('ip-address-input'), '999.999.999.999');
      await user.click(getByTestId('form-modal-submit'));

      await waitFor(() => {
        expect(screen.getByText('Invalid IP address format')).toBeInTheDocument();
      });
    });

    it('should show error for invalid email', async () => {
      const { getByTestId, user } = renderWithProviders(
        <FormModal
          title="Add Asset"
          open={true}
          onClose={handleClose}
          onSubmit={handleSubmit}
        >
          <TestAddAssetForm />
        </FormModal>
      );

      // Fill required fields
      await user.type(getByTestId('asset-name-input'), 'Test Asset');
      await user.click(getByTestId('asset-type-select'));
      await user.click(screen.getByText('Desktop'));

      // Type invalid email
      await user.type(getByTestId('email-input'), 'invalid-email');
      await user.click(getByTestId('form-modal-submit'));

      await waitFor(() => {
        expect(screen.getByText('Invalid email format')).toBeInTheDocument();
      });
    });
  });

  describe('Valid form submission', () => {
    it('should submit successfully with valid data', async () => {
      const { getByTestId, user } = renderWithProviders(
        <FormModal
          title="Add Asset"
          open={true}
          onClose={handleClose}
          onSubmit={handleSubmit}
        >
          <TestAddAssetForm />
        </FormModal>
      );

      // Fill all fields with valid data
      await user.type(getByTestId('asset-name-input'), 'Test Asset');

      // Select asset type
      await user.click(getByTestId('asset-type-select'));
      await user.click(screen.getByText('Desktop'));

      // Small delay to ensure Select dropdown closes before next interaction
      await new Promise(resolve => setTimeout(resolve, 100));

      await user.type(getByTestId('ip-address-input'), '192.168.1.100');
      await user.type(getByTestId('email-input'), 'test@example.com');

      await user.click(getByTestId('form-modal-submit'));

      await waitFor(() => {
        expect(handleSubmit).toHaveBeenCalledWith({
          name: 'Test Asset',
          assetType: 'DESKTOP',
          ipAddress: '192.168.1.100',
          email: 'test@example.com',
        });
      });
    });

    it('should submit with only required fields', async () => {
      const { getByTestId, user } = renderWithProviders(
        <FormModal
          title="Add Asset"
          open={true}
          onClose={handleClose}
          onSubmit={handleSubmit}
        >
          <TestAddAssetForm />
        </FormModal>
      );

      // Fill only required fields
      await user.type(getByTestId('asset-name-input'), 'Test Asset');
      await user.click(getByTestId('asset-type-select'));
      await user.click(screen.getByText('Desktop'));

      await user.click(getByTestId('form-modal-submit'));

      await waitFor(() => {
        expect(handleSubmit).toHaveBeenCalledWith({
          name: 'Test Asset',
          assetType: 'DESKTOP',
        });
      });
    });
  });

  describe('Form reset on close', () => {
    it('should reset form when modal closes', async () => {
      const { getByTestId, user, rerender } = renderWithProviders(
        <FormModal
          title="Add Asset"
          open={true}
          onClose={handleClose}
          onSubmit={handleSubmit}
        >
          <TestAddAssetForm />
        </FormModal>
      );

      // Fill form
      await user.type(getByTestId('asset-name-input'), 'Test Asset');

      // Close modal
      rerender(
        <FormModal
          title="Add Asset"
          open={false}
          onClose={handleClose}
          onSubmit={handleSubmit}
        >
          <TestAddAssetForm />
        </FormModal>
      );

      // Reopen modal
      rerender(
        <FormModal
          title="Add Asset"
          open={true}
          onClose={handleClose}
          onSubmit={handleSubmit}
        >
          <TestAddAssetForm />
        </FormModal>
      );

      // Form should be reset
      const nameInput = getByTestId('asset-name-input') as HTMLInputElement;
      expect(nameInput.value).toBe('');
    });
  });

  describe('Initial values', () => {
    it('should populate form with initial values', async () => {
      const initialValues = {
        name: 'Existing Asset',
        assetType: 'LAPTOP',
        ipAddress: '192.168.1.50',
      };

      const { getByTestId } = renderWithProviders(
        <FormModal
          title="Edit Asset"
          open={true}
          onClose={handleClose}
          onSubmit={handleSubmit}
          initialValues={initialValues}
        >
          <TestAddAssetForm />
        </FormModal>
      );

      await waitFor(() => {
        const nameInput = getByTestId('asset-name-input') as HTMLInputElement;
        expect(nameInput.value).toBe('Existing Asset');
      });
    });

    it('should update form when initial values change', async () => {
      const initialValues1 = { name: 'Asset 1' };
      const { getByTestId, rerender } = renderWithProviders(
        <FormModal
          title="Edit Asset"
          open={true}
          onClose={handleClose}
          onSubmit={handleSubmit}
          initialValues={initialValues1}
        >
          <TestAddAssetForm />
        </FormModal>
      );

      await waitFor(() => {
        const nameInput = getByTestId('asset-name-input') as HTMLInputElement;
        expect(nameInput.value).toBe('Asset 1');
      });

      // Update initial values
      const initialValues2 = { name: 'Asset 2' };
      rerender(
        <FormModal
          title="Edit Asset"
          open={true}
          onClose={handleClose}
          onSubmit={handleSubmit}
          initialValues={initialValues2}
        >
          <TestAddAssetForm />
        </FormModal>
      );

      await waitFor(() => {
        const nameInput = getByTestId('asset-name-input') as HTMLInputElement;
        expect(nameInput.value).toBe('Asset 2');
      });
    });
  });

  describe('Loading state', () => {
    it('should disable submit button while loading', async () => {
      const { getByTestId } = renderWithProviders(
        <FormModal
          title="Add Asset"
          open={true}
          onClose={handleClose}
          onSubmit={handleSubmit}
          loading={true}
        >
          <TestAddAssetForm />
        </FormModal>
      );

      const submitButton = getByTestId('form-modal-submit') as HTMLButtonElement;
      expect(submitButton.disabled).toBe(true);
    });

    it('should show loading indicator on submit button', async () => {
      const { getByTestId } = renderWithProviders(
        <FormModal
          title="Add Asset"
          open={true}
          onClose={handleClose}
          onSubmit={handleSubmit}
          loading={true}
        >
          <TestAddAssetForm />
        </FormModal>
      );

      const submitButton = getByTestId('form-modal-submit');
      expect(submitButton.querySelector('.anticon-loading')).toBeInTheDocument();
    });
  });

  describe('Async submission', () => {
    it('should handle async submission', async () => {
      const asyncSubmit = vi.fn().mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      const { getByTestId, user } = renderWithProviders(
        <FormModal
          title="Add Asset"
          open={true}
          onClose={handleClose}
          onSubmit={asyncSubmit}
        >
          <TestAddAssetForm />
        </FormModal>
      );

      // Fill required fields
      await user.type(getByTestId('asset-name-input'), 'Test Asset');
      await user.click(getByTestId('asset-type-select'));
      await user.click(screen.getByText('Desktop'));

      await user.click(getByTestId('form-modal-submit'));

      await waitFor(() => {
        expect(asyncSubmit).toHaveBeenCalled();
      });
    });
  });
});
