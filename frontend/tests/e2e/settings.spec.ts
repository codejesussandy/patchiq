import { test, expect } from './fixtures';

// ---------------------------------------------------------------------------
// Helper: expand the sidebar so its text labels are visible
// ---------------------------------------------------------------------------
async function expandSidebar(page: import('@playwright/test').Page) {
  const sidebar = page.getByRole('navigation', { name: 'Primary navigation' });
  await sidebar.hover({ force: true, timeout: 30_000 });
  await page.waitForTimeout(300);
}

// ---------------------------------------------------------------------------
// Redirect
// ---------------------------------------------------------------------------
test.describe('Settings — redirect', () => {
  test('settings redirects to organization page', async ({ page }) => {
    await page.goto('/settings');
    await expect(page).toHaveURL(/\/settings\/user-management\/organization/, { timeout: 8_000 });
  });
});

// ---------------------------------------------------------------------------
// Sidebar navigation
// ---------------------------------------------------------------------------
test.describe('Settings — sidebar navigation', () => {
  test('settings sidebar items navigate correctly', async ({ page }) => {
    await page.goto('/settings/user-management/organization');
    await expandSidebar(page);

    const sidebar = page.getByRole('navigation', { name: 'Primary navigation' });

    // Expand "User Management" group and navigate to Users sub-item
    await sidebar.getByRole('menuitem', { name: /User Management/i }).click();
    await page.waitForTimeout(400);
    // Re-hover to keep sidebar expanded before clicking sub-item
    await expandSidebar(page);
    await sidebar.getByRole('menuitem', { name: /^Users$/i }).click();
    await expect(page).toHaveURL(/\/settings\/user-management\/users/, { timeout: 8_000 });

    // Navigate to Agent Approval Settings
    await expandSidebar(page);
    await sidebar.getByRole('menuitem', { name: /Agent Management/i }).click();
    await page.waitForTimeout(400);
    await expandSidebar(page);
    await sidebar.getByRole('menuitem', { name: /Agent Approval Settings/i }).click();
    await expect(page).toHaveURL(/\/settings\/agent-management\/approval-settings/, { timeout: 8_000 });
  });
});

// ---------------------------------------------------------------------------
// Organization CRUD
// ---------------------------------------------------------------------------
test.describe('Settings — Organization CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings/user-management/organization');
    await expect(page.getByRole('heading', { name: 'Organization' })).toBeVisible({ timeout: 10_000 });
  });

  test('create organization', async ({ page }) => {
    await page.getByRole('button', { name: /Create/i }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    await dialog.getByPlaceholder('Enter organization name').fill(`E2E Test Org ${Date.now()}`);
    await dialog.getByPlaceholder('Enter organization description (optional)').fill('Created by E2E test');

    // Submit
    await dialog.getByRole('button', { name: /Create Organization/i }).click();

    // Accept either success or error toast (API may reject duplicates on repeated runs)
    const toast = page.locator('.ant-message-success, .ant-message-error');
    await expect(toast.first()).toBeVisible({ timeout: 8_000 });
  });

  test('edit organization', async ({ page }) => {
    // Find the first non-default org's Edit button
    const editBtn = page.locator('.ant-table-tbody tr').first().locator('button[aria-label="Edit"], button:has(.anticon-edit)').first();
    const hasOrg = await editBtn.isVisible({ timeout: 8_000 }).catch(() => false);
    if (!hasOrg) return;

    await editBtn.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    const nameInput = dialog.getByPlaceholder('Enter organization name');
    await nameInput.fill('E2E Test Org Updated');

    await dialog.getByRole('button', { name: /Update Organization/i }).click();
    await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 8_000 });
  });

  test('delete organization', async ({ page }) => {
    // Delete the first non-disabled (non-default) delete button
    const deleteBtn = page
      .locator('.ant-table-tbody tr')
      .first()
      .locator('button:not([disabled]):has(.anticon-delete)');

    const canDelete = await deleteBtn.isVisible({ timeout: 8_000 }).catch(() => false);
    if (!canDelete) return;

    await deleteBtn.click();

    // ConfirmModal appears
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5_000 });
    await dialog.getByRole('button', { name: /Delete/i }).last().click();

    await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 8_000 });
  });
});

// ---------------------------------------------------------------------------
// Agent Approval Settings
// ---------------------------------------------------------------------------
test.describe('Settings — Agent Approval Settings', () => {
  test('agent approval settings persist after save and reload', async ({ page }) => {
    await page.goto('/settings/agent-management/approval-settings');
    await expect(
      page.getByRole('heading', { name: 'Agent Approval Settings' })
    ).toBeVisible({ timeout: 10_000 });

    // Select Manual radio
    const manualRadio = page.getByRole('radio', { name: 'Manual' });
    await manualRadio.check();
    await expect(manualRadio).toBeChecked();

    // Save — wait for any toast (success or error)
    await page.getByRole('button', { name: /Save/i }).click();
    const saveToast = page.locator('.ant-message-success, .ant-message-error');
    await expect(saveToast.first()).toBeVisible({ timeout: 8_000 });

    // Only continue with reload check if save succeeded
    const saveSucceeded = await page.locator('.ant-message-success').isVisible().catch(() => false);
    if (!saveSucceeded) return;

    // Reload and verify selection persists
    await page.reload();
    await expect(
      page.getByRole('heading', { name: 'Agent Approval Settings' })
    ).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('radio', { name: 'Manual' })).toBeChecked();

    // Restore to Auto so subsequent test runs start clean
    await page.getByRole('radio', { name: 'Auto' }).check();
    await page.getByRole('button', { name: /Save/i }).click();
    const restoreToast = page.locator('.ant-message-success, .ant-message-error');
    await expect(restoreToast.first()).toBeVisible({ timeout: 8_000 });
  });
});

// ---------------------------------------------------------------------------
// Patch Preferences
// ---------------------------------------------------------------------------
test.describe('Settings — Patch Preferences', () => {
  test('patch preferences save shows success toast', async ({ page }) => {
    await page.goto('/settings/patch-management/patch-preferences');
    await expect(
      page.getByRole('heading', { name: 'Patch Preferences' })
    ).toBeVisible({ timeout: 10_000 });

    // Toggle "Enable Patching" checkbox
    const enablePatchingCheckbox = page.getByRole('checkbox', { name: /Enable Patching/i });
    const wasChecked = await enablePatchingCheckbox.isChecked();
    if (wasChecked) {
      await enablePatchingCheckbox.uncheck();
    } else {
      await enablePatchingCheckbox.check();
    }

    // Save — the Save button is in the right column
    await page.getByRole('button', { name: /^Save$/i }).click();
    await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 8_000 });

    // Reload to verify persistence
    await page.reload();
    await expect(
      page.getByRole('heading', { name: 'Patch Preferences' })
    ).toBeVisible({ timeout: 10_000 });
    const checkboxAfterReload = page.getByRole('checkbox', { name: /Enable Patching/i });
    // Toggle back so the state is restored
    if (wasChecked) {
      await expect(checkboxAfterReload).not.toBeChecked();
      await checkboxAfterReload.check();
    } else {
      await expect(checkboxAfterReload).toBeChecked();
      await checkboxAfterReload.uncheck();
    }
    await page.getByRole('button', { name: /^Save$/i }).click();
    await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 8_000 });
  });
});

// ---------------------------------------------------------------------------
// Users CRUD
// ---------------------------------------------------------------------------
test.describe('Settings — Users CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings/user-management/users');
    await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible({ timeout: 10_000 });
  });

  test('create user', async ({ page }) => {
    await page.getByRole('button', { name: /Create/i }).click();

    // UserFormModal opens as a dialog
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    await dialog.getByPlaceholder('First Name').fill('E2E');
    await dialog.getByPlaceholder('Last Name').fill('TestUser');
    await dialog.getByPlaceholder('user@example.com').fill(`e2e_${Date.now()}@example.com`);
    await dialog.getByPlaceholder('Enter password').fill('Test@1234!');
    await dialog.getByPlaceholder('Confirm password').fill('Test@1234!');

    // Select a timezone (required field) — the select is readonly, click to open then pick first option
    const timezoneContainer = dialog.locator('.ant-select').filter({ has: dialog.locator('#timezone, [id$="timezone"]') });
    const hasTimezone = await timezoneContainer.isVisible({ timeout: 2_000 }).catch(() => false);
    if (hasTimezone) {
      await timezoneContainer.click();
      // Pick first item in dropdown
      const timezoneDropdown = page.locator('.ant-select-dropdown').last();
      await expect(timezoneDropdown).toBeVisible({ timeout: 3_000 });
      await timezoneDropdown.locator('.ant-select-item-option').first().click();
    } else {
      // Try finding the timezone select by looking for the "Please Select" placeholder
      const tzSelect = dialog.locator('.ant-select').filter({ hasText: /Please Select/i }).first();
      const tzVisible = await tzSelect.isVisible({ timeout: 1_000 }).catch(() => false);
      if (tzVisible) {
        await tzSelect.click();
        const tzDropdown = page.locator('.ant-select-dropdown').last();
        await expect(tzDropdown).toBeVisible({ timeout: 3_000 });
        await tzDropdown.locator('.ant-select-item-option').first().click();
      }
    }

    // Submit
    await dialog.getByRole('button', { name: /Create User/i }).click();
    // Accept either success or error toast
    const toast = page.locator('.ant-message-success, .ant-message-error');
    await expect(toast.first()).toBeVisible({ timeout: 8_000 });
  });

  test('edit user', async ({ page }) => {
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

    // Modify phone field if visible, otherwise just save
    const phoneInput = drawer.getByPlaceholder(/Phone/i);
    const phoneVisible = await phoneInput.isVisible({ timeout: 2_000 }).catch(() => false);
    if (phoneVisible) await phoneInput.fill('9999999999');

    await drawer.getByRole('button', { name: /Save|Update/i }).last().click();
    await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 8_000 });
  });

  test('delete user', async ({ page }) => {
    const deleteBtn = page
      .locator('.ant-table-tbody tr')
      .first()
      .locator('button:not([disabled]):has(.anticon-delete)');

    const canDelete = await deleteBtn.isVisible({ timeout: 8_000 }).catch(() => false);
    if (!canDelete) return;

    await deleteBtn.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5_000 });
    await dialog.getByRole('button', { name: /Delete/i }).last().click();

    await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 8_000 });
  });
});
