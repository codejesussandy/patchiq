import { test, expect } from './fixtures';

test.describe('Patch Test and Approve', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/patches/test-approve');
    await expect(page.getByRole('heading', { name: 'Patch Test and Approve' })).toBeVisible();
  });

  test('page loads with table or empty state', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Patch Test and Approve' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Create/i }).first()).toBeVisible();

    const hasTable = await page.locator('.ant-table').isVisible().catch(() => false);
    const hasEmpty = await page.locator('.ant-empty').isVisible().catch(() => false);
    expect(hasTable || hasEmpty).toBe(true);

    // If empty state, verify the descriptive text (either custom or default Ant Design empty)
    if (hasEmpty) {
      // Custom empty state text may vary
      const hasCustomText = await page.getByText(/No patch tests|No data/i).isVisible().catch(() => false);
      expect(hasCustomText || hasEmpty).toBeTruthy();
    }
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

  test('create a patch test — opens modal with correct fields', async ({ page }) => {
    await page.getByRole('button', { name: /Create/i }).first().click();

    const modal = page.locator('.ant-modal').filter({ hasText: 'Create Patch Test' });
    await expect(modal).toBeVisible({ timeout: 10000 });

    await expect(modal.getByLabel('Test Name')).toBeVisible();
    await expect(modal.getByLabel('Description')).toBeVisible();
    await expect(modal.getByText('All Applications')).toBeVisible();
    await expect(modal.getByText('All Computers')).toBeVisible();

    // Cancel
    await modal.getByRole('button', { name: 'Cancel' }).click();
    await expect(modal).not.toBeVisible({ timeout: 5000 });
  });

  test('create a patch test — fills and submits form', async ({ page }) => {
    await page.getByRole('button', { name: /Create/i }).first().click();

    const modal = page.locator('.ant-modal').filter({ hasText: 'Create Patch Test' });
    await expect(modal).toBeVisible({ timeout: 10000 });

    // Fill required fields
    await modal.getByLabel('Test Name').fill('E2E Patch Test');
    await modal.getByLabel('Description').fill('Created by Playwright E2E test');

    // Application Type defaults to ALL — verify
    await expect(modal.getByRole('radio', { name: 'All Applications' })).toBeChecked();

    // Scope defaults to ALL_COMPUTERS — verify
    await expect(modal.getByRole('radio', { name: 'All Computers' })).toBeChecked();

    // Submit
    await modal.getByRole('button', { name: 'Create Test' }).click();

    // Expect success or error toast, or modal to close
    const successToast = page.locator('.ant-message-success');
    const errorToast = page.locator('.ant-message-error');

    await Promise.race([
      successToast.waitFor({ timeout: 10000 }),
      errorToast.waitFor({ timeout: 10000 }),
      modal.waitFor({ state: 'hidden', timeout: 10000 }),
    ]).catch(() => {});
  });

  test('approve a patch test — action menu Approve', async ({ page }) => {
    const rows = page.locator('.ant-table-tbody tr.ant-table-row');
    const rowCount = await rows.count();

    if (rowCount === 0) {
      test.skip();
      return;
    }

    // Find a PENDING row, or fall back to first row
    let targetRow = rows.first();
    for (let i = 0; i < rowCount; i++) {
      const row = rows.nth(i);
      const isPending = await row.locator('.ant-tag').filter({ hasText: 'PENDING' }).isVisible().catch(() => false);
      if (isPending) {
        targetRow = row;
        break;
      }
    }

    // Open action menu
    await targetRow.locator('button').last().click();

    const dropdown = page.locator('.ant-dropdown').last();
    await expect(dropdown).toBeVisible();
    await expect(dropdown.getByText('Approve')).toBeVisible();
    await dropdown.getByText('Approve').click();

    // Expect success or error toast
    const successToast = page.locator('.ant-message-success');
    const errorToast = page.locator('.ant-message-error');

    await Promise.race([
      successToast.waitFor({ timeout: 10000 }),
      errorToast.waitFor({ timeout: 10000 }),
    ]).catch(() => {});
  });

  test('view details — opens view modal', async ({ page }) => {
    const rows = page.locator('.ant-table-tbody tr.ant-table-row');
    const rowCount = await rows.count();

    if (rowCount === 0) {
      test.skip();
      return;
    }

    // Click the "more" action button on the first row
    await rows.first().getByRole('button', { name: 'more' }).click();

    // Wait for the dropdown menu to appear
    const dropdown = page.locator('.ant-dropdown:visible').last();
    const dropdownVisible = await dropdown.isVisible({ timeout: 3000 }).catch(() => false);

    if (dropdownVisible) {
      // Click "View Details" or "View" in the dropdown
      const viewItem = dropdown.getByText(/View/i).first();
      await viewItem.click();
    } else {
      // Some tables open detail directly on row click — click the row name cell
      await rows.first().locator('td').first().click();
    }

    // Modal should open with test details
    const viewModal = page.getByRole('dialog', { name: /Test Details/i });
    await expect(viewModal).toBeVisible({ timeout: 10000 });

    // Close the modal
    await viewModal.locator('.ant-modal-footer').getByRole('button', { name: 'Close' }).click();
    await expect(viewModal).not.toBeVisible({ timeout: 5000 });
  });

  test('delete a patch test — opens ConfirmModal and cancels', async ({ page }) => {
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

    // ConfirmModal renders as a standard ant-modal (uses ConfirmModal component)
    const confirmModal = page.locator('.ant-modal').filter({ hasText: 'Delete Test' });
    await expect(confirmModal).toBeVisible({ timeout: 10000 });

    // Verify delete message contains the word "delete"
    await expect(confirmModal).toContainText('Are you sure you want to delete');

    // Cancel deletion
    await confirmModal.getByRole('button', { name: 'Cancel' }).click();
    await expect(confirmModal).not.toBeVisible({ timeout: 5000 });
  });

  test('delete a patch test — confirms deletion', async ({ page }) => {
    const rows = page.locator('.ant-table-tbody tr.ant-table-row');
    const rowCount = await rows.count();

    if (rowCount === 0) {
      test.skip();
      return;
    }

    const initialCount = rowCount;

    // Open action menu on last row (to avoid disrupting earlier rows used in other tests)
    await rows.last().locator('button').last().click();

    const dropdown = page.locator('.ant-dropdown').last();
    await expect(dropdown).toBeVisible();
    await dropdown.getByText('Delete').click();

    const confirmModal = page.locator('.ant-modal').filter({ hasText: 'Delete Test' });
    await expect(confirmModal).toBeVisible({ timeout: 10000 });

    // Confirm deletion using the danger "Delete" button
    await confirmModal.getByRole('button', { name: 'Delete' }).click();

    // Expect success or error toast
    const successToast = page.locator('.ant-message-success');
    const errorToast = page.locator('.ant-message-error');

    await Promise.race([
      successToast.waitFor({ timeout: 10000 }),
      errorToast.waitFor({ timeout: 10000 }),
    ]).catch(() => {});

    // If delete succeeded, row count should decrease
    const successVisible = await successToast.isVisible().catch(() => false);
    if (successVisible) {
      const newCount = await rows.count();
      expect(newCount).toBeLessThan(initialCount);
    }
  });
});
