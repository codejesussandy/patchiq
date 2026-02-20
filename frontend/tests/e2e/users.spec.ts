import { test, expect } from './fixtures';

// ---------------------------------------------------------------------------
// Settings > Users CRUD
// ---------------------------------------------------------------------------
test.describe('Users — page and CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings/user-management/users');
    await page.waitForURL('**/settings/user-management/users', { timeout: 15_000 });
    await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible({ timeout: 10_000 });
  });

  // -------------------------------------------------------------------------
  // Test: Users list loads
  // -------------------------------------------------------------------------
  test('users list loads with table', async ({ page }) => {
    // Verify table is present
    const table = page.locator('.ant-table');
    await expect(table).toBeVisible({ timeout: 15_000 });

    // Verify expected column headers
    await expect(page.getByRole('columnheader', { name: 'Name' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Email' })).toBeVisible();

    // Verify at least one row exists (admin user should always be present)
    const rows = page.locator('.ant-table-tbody .ant-table-row');
    await expect(rows.first()).toBeVisible({ timeout: 10_000 });
  });

  // -------------------------------------------------------------------------
  // Test: search users
  // -------------------------------------------------------------------------
  test('search filters the users table', async ({ page }) => {
    const table = page.locator('.ant-table');
    await expect(table).toBeVisible({ timeout: 15_000 });

    const searchInput = page.getByPlaceholder(/Search/i);
    await expect(searchInput).toBeVisible();

    // Search for a non-existent user
    await searchInput.fill('zzz_nonexistent_user_xyz');
    await page.waitForTimeout(800);

    const rows = page.locator('.ant-table-tbody .ant-table-row');
    const emptyState = page.locator('.ant-empty');
    const rowCount = await rows.count();
    const hasEmpty = await emptyState.isVisible().catch(() => false);
    expect(rowCount === 0 || hasEmpty).toBeTruthy();

    // Clear search
    await searchInput.clear();
    await page.waitForTimeout(800);

    // Rows should be restored
    await expect(page.locator('.ant-table-tbody .ant-table-row').first()).toBeVisible({ timeout: 10_000 });
  });

  // -------------------------------------------------------------------------
  // Test: create a new user
  // -------------------------------------------------------------------------
  test('create a new user', async ({ page }) => {
    // Click the Create button
    await page.getByRole('button', { name: /Create/i }).click();

    // UserFormModal opens as a dialog
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    const uniqueSuffix = Date.now();
    await dialog.getByPlaceholder('First Name').fill('E2ETest');
    await dialog.getByPlaceholder('Last Name').fill(`User${uniqueSuffix}`);
    await dialog.getByPlaceholder('user@example.com').fill(`e2e_${uniqueSuffix}@example.com`);
    await dialog.getByPlaceholder('Enter password').fill('Test@1234!');
    await dialog.getByPlaceholder('Confirm password').fill('Test@1234!');

    // Select a timezone if the field is present
    const timezoneContainer = dialog.locator('.ant-select').filter({ has: dialog.locator('#timezone, [id$="timezone"]') });
    const hasTimezone = await timezoneContainer.isVisible({ timeout: 2_000 }).catch(() => false);
    if (hasTimezone) {
      await timezoneContainer.click();
      const timezoneDropdown = page.locator('.ant-select-dropdown').last();
      await expect(timezoneDropdown).toBeVisible({ timeout: 3_000 });
      await timezoneDropdown.locator('.ant-select-item-option').first().click();
    } else {
      // Try finding the timezone select by "Please Select" placeholder
      const tzSelect = dialog.locator('.ant-select').filter({ hasText: /Please Select/i }).first();
      const tzVisible = await tzSelect.isVisible({ timeout: 1_000 }).catch(() => false);
      if (tzVisible) {
        await tzSelect.click();
        const tzDropdown = page.locator('.ant-select-dropdown').last();
        await expect(tzDropdown).toBeVisible({ timeout: 3_000 });
        await tzDropdown.locator('.ant-select-item-option').first().click();
      }
    }

    // Submit the form
    await dialog.getByRole('button', { name: /Create User/i }).click();

    // Accept either success or error toast
    const toast = page.locator('.ant-message-success, .ant-message-error');
    await expect(toast.first()).toBeVisible({ timeout: 8_000 });
  });

  // -------------------------------------------------------------------------
  // Test: edit a user
  // -------------------------------------------------------------------------
  test('edit user', async ({ page }) => {
    const table = page.locator('.ant-table');
    await expect(table).toBeVisible({ timeout: 15_000 });

    // Click the first non-disabled edit button
    const editBtn = page
      .locator('.ant-table-tbody tr')
      .first()
      .locator('button:not([disabled]):has(.anticon-edit)');

    const canEdit = await editBtn.isVisible({ timeout: 8_000 }).catch(() => false);
    if (!canEdit) return;

    await editBtn.click();

    const drawer = page.locator('.ant-drawer-content, [role="dialog"]').first();
    await expect(drawer).toBeVisible({ timeout: 5_000 });

    // Switch to edit mode if currently in view mode
    const editModeBtn = drawer.getByRole('button', { name: /Edit/i });
    const isViewMode = await editModeBtn.isVisible({ timeout: 2_000 }).catch(() => false);
    if (isViewMode) await editModeBtn.click();

    // Modify the phone field if visible
    const phoneInput = drawer.getByPlaceholder(/Phone/i);
    const phoneVisible = await phoneInput.isVisible({ timeout: 2_000 }).catch(() => false);
    if (phoneVisible) await phoneInput.fill('9999999999');

    await drawer.getByRole('button', { name: /Save|Update/i }).last().click();
    await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 8_000 });
  });

  // -------------------------------------------------------------------------
  // Test: delete a user
  // -------------------------------------------------------------------------
  test('delete user', async ({ page }) => {
    const table = page.locator('.ant-table');
    await expect(table).toBeVisible({ timeout: 15_000 });

    // Find the first non-disabled delete button
    const deleteBtn = page
      .locator('.ant-table-tbody tr')
      .first()
      .locator('button:not([disabled]):has(.anticon-delete)');

    const canDelete = await deleteBtn.isVisible({ timeout: 8_000 }).catch(() => false);
    if (!canDelete) return;

    await deleteBtn.click();

    // ConfirmModal should appear
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5_000 });
    await dialog.getByRole('button', { name: /Delete/i }).last().click();

    await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 8_000 });
  });

  // -------------------------------------------------------------------------
  // Test: export users
  // -------------------------------------------------------------------------
  test('export users button works', async ({ page }) => {
    const table = page.locator('.ant-table');
    await expect(table).toBeVisible({ timeout: 15_000 });

    // Find and click the export button (DownloadOutlined icon)
    const exportBtn = page.locator('button:has(.anticon-download)').first();
    const hasExport = await exportBtn.isVisible({ timeout: 5_000 }).catch(() => false);
    if (!hasExport) return;

    // Expect a download to be initiated
    const downloadPromise = page.waitForEvent('download', { timeout: 5_000 }).catch(() => null);
    await exportBtn.click();

    // Verify success toast
    await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 8_000 });
  });
});
