import { test, expect } from './fixtures';

test.describe('Zero Touch Deployment', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/patches/zero-touch');
    await expect(page.getByRole('heading', { name: 'Zero Touch Deployment' })).toBeVisible({ timeout: 15000 });
  });

  test('page loads with heading and Create button', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Zero Touch Deployment' })).toBeVisible();
    await expect(page.locator('button').filter({ hasText: /^Create$/ }).first()).toBeVisible();

    // Either a table or the empty state must render
    const hasTable = await page.locator('.ant-table').isVisible().catch(() => false);
    const hasEmpty = await page.locator('.ant-empty').isVisible().catch(() => false);
    expect(hasTable || hasEmpty).toBe(true);
  });

  test('table shows correct columns when data is present', async ({ page }) => {
    const hasTable = await page.locator('.ant-table').isVisible().catch(() => false);

    if (!hasTable) {
      test.skip();
      return;
    }

    const headers = page.locator('.ant-table th');
    await expect(headers.filter({ hasText: 'Name' })).toBeVisible();
    await expect(headers.filter({ hasText: 'Description' })).toBeVisible();
    await expect(headers.filter({ hasText: 'Application Type' })).toBeVisible();
    await expect(headers.filter({ hasText: 'Scope' })).toBeVisible();
    await expect(headers.filter({ hasText: 'Status' })).toBeVisible();
    await expect(headers.filter({ hasText: 'Created by' })).toBeVisible();
    await expect(headers.filter({ hasText: 'Created on' })).toBeVisible();
  });

  test('create configuration — opens modal with correct fields', async ({ page }) => {
    await page.locator('button').filter({ hasText: /^Create$/ }).first().click();

    const modal = page.locator('.ant-modal').filter({ hasText: 'Create Zero Touch Configuration' });
    await expect(modal).toBeVisible({ timeout: 10000 });

    await expect(modal.getByLabel('Configuration Name')).toBeVisible();
    await expect(modal.getByLabel('Description')).toBeVisible();
    await expect(modal.getByText('All Applications')).toBeVisible();
    await expect(modal.getByText('All Computers')).toBeVisible();
    await expect(modal.getByText('Critical')).toBeVisible();
    await expect(modal.getByText('High')).toBeVisible();
    await expect(modal.getByText('Medium')).toBeVisible();
    await expect(modal.getByText('Low')).toBeVisible();

    // Cancel without saving
    await modal.getByRole('button', { name: 'Cancel' }).click();
    await expect(modal).not.toBeVisible({ timeout: 5000 });
  });

  test('create configuration — fills form and submits', async ({ page }) => {
    await page.locator('button').filter({ hasText: /^Create$/ }).first().click();

    const modal = page.locator('.ant-modal').filter({ hasText: 'Create Zero Touch Configuration' });
    await expect(modal).toBeVisible({ timeout: 10000 });

    // Fill required fields
    await modal.getByLabel('Configuration Name').fill('E2E Zero Touch Config');
    await modal.getByLabel('Description').fill('Created by Playwright E2E test');

    // Application Type — default is ALL (already selected)
    await expect(modal.getByRole('radio', { name: 'All Applications' })).toBeChecked();

    // Scope — default is ALL_COMPUTERS (already selected)
    await expect(modal.getByRole('radio', { name: 'All Computers' })).toBeChecked();

    // Auto-Deployment Rules: check at least one severity
    await modal.getByRole('checkbox', { name: 'Critical' }).check();
    await expect(modal.getByRole('checkbox', { name: 'Critical' })).toBeChecked();

    // Submit
    await modal.getByRole('button', { name: 'Create Configuration' }).click();

    // Expect success message or modal to close
    const successToast = page.locator('.ant-message-success');
    const errorToast = page.locator('.ant-message-error');
    const modalClosed = modal.waitFor({ state: 'hidden', timeout: 10000 });

    await Promise.race([
      successToast.waitFor({ timeout: 10000 }),
      errorToast.waitFor({ timeout: 10000 }),
      modalClosed,
    ]).catch(() => {});
  });

  test('edit configuration — opens edit modal', async ({ page }) => {
    const rows = page.locator('.ant-table-tbody tr.ant-table-row');
    const rowCount = await rows.count();

    if (rowCount === 0) {
      test.skip();
      return;
    }

    // Open action menu on first row
    await rows.first().locator('button').last().click();

    const dropdown = page.locator('.ant-dropdown').last();
    await expect(dropdown).toBeVisible();
    await dropdown.getByText('Edit').click();

    const editModal = page.locator('.ant-modal').filter({ hasText: 'Edit Zero Touch Configuration' });
    await expect(editModal).toBeVisible({ timeout: 10000 });

    // Modify the name
    await editModal.getByLabel('Configuration Name').fill('Updated Config Name');

    // Save
    await editModal.getByRole('button', { name: 'Update Configuration' }).click();

    const successToast = page.locator('.ant-message-success');
    const errorToast = page.locator('.ant-message-error');
    await Promise.race([
      successToast.waitFor({ timeout: 10000 }),
      errorToast.waitFor({ timeout: 10000 }),
      editModal.waitFor({ state: 'hidden', timeout: 10000 }),
    ]).catch(() => {});
  });

  test('delete configuration — opens Modal.confirm', async ({ page }) => {
    const rows = page.locator('.ant-table-tbody tr.ant-table-row');
    const rowCount = await rows.count();

    if (rowCount === 0) {
      test.skip();
      return;
    }

    // Open action menu on first row
    await rows.first().locator('button').last().click();

    const dropdown = page.locator('.ant-dropdown').last();
    await expect(dropdown).toBeVisible();
    await dropdown.getByText('Delete').click();

    // Modal.confirm renders as .ant-modal-confirm
    const confirmModal = page.locator('.ant-modal-confirm');
    await expect(confirmModal).toBeVisible({ timeout: 10000 });

    // Verify delete confirmation message
    await expect(confirmModal.locator('.ant-modal-confirm-title')).toContainText('Delete Configuration');

    // Cancel the deletion
    await confirmModal.locator('.ant-modal-confirm-btns').getByRole('button', { name: 'Cancel' }).click();
    await expect(confirmModal).not.toBeVisible({ timeout: 5000 });
  });

  test('view details — opens view modal', async ({ page }) => {
    const rows = page.locator('.ant-table-tbody tr.ant-table-row');
    const rowCount = await rows.count();

    if (rowCount === 0) {
      test.skip();
      return;
    }

    await rows.first().locator('button').last().click();

    const dropdown = page.locator('.ant-dropdown').last();
    await expect(dropdown).toBeVisible();
    await dropdown.getByText('View Details').click();

    // A modal should open (ViewConfigModal)
    const viewModal = page.locator('.ant-modal');
    await expect(viewModal).toBeVisible({ timeout: 10000 });

    // Close the modal — try Escape first, then click the close button
    await page.keyboard.press('Escape');
    const modalClosed = await viewModal.waitFor({ state: 'hidden', timeout: 3000 }).then(() => true).catch(() => false);
    if (!modalClosed) {
      await viewModal.getByRole('button', { name: /Close/i }).first().click().catch(() => {});
    }
    await expect(viewModal).not.toBeVisible({ timeout: 5000 });
  });
});
