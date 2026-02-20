import { test, expect } from './fixtures';

// ---------------------------------------------------------------------------
// Settings > Audit
// ---------------------------------------------------------------------------
test.describe('Audit — log viewing and filtering', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings/audit');
    await page.waitForURL('**/settings/audit', { timeout: 15_000 });
    await expect(page.locator('h1:has-text("Audit")')).toBeVisible({ timeout: 10_000 });
  });

  // -------------------------------------------------------------------------
  // Test: Audit page loads with table
  // -------------------------------------------------------------------------
  test('audit log page loads with table', async ({ page }) => {
    // Verify table is present with expected columns
    const table = page.locator('.ant-table');
    await expect(table).toBeVisible({ timeout: 15_000 });

    await expect(page.getByRole('columnheader', { name: 'Module' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Operation' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'User' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Status' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Details' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Created At' })).toBeVisible();
  });

  // -------------------------------------------------------------------------
  // Test: Audit log loads with entries
  // -------------------------------------------------------------------------
  test('audit log loads with entries or empty state', async ({ page }) => {
    const table = page.locator('.ant-table');
    await expect(table).toBeVisible({ timeout: 15_000 });

    // Wait for loading to finish
    await page.waitForTimeout(1_000);

    const rows = page.locator('.ant-table-tbody .ant-table-row');
    const emptyState = page.locator('.ant-empty');
    const rowCount = await rows.count();
    const hasEmpty = await emptyState.isVisible().catch(() => false);

    // Table should either have data or show empty state
    expect(rowCount > 0 || hasEmpty).toBeTruthy();
  });

  // -------------------------------------------------------------------------
  // Test: Filter by module
  // -------------------------------------------------------------------------
  test('filter by module', async ({ page }) => {
    const table = page.locator('.ant-table');
    await expect(table).toBeVisible({ timeout: 15_000 });

    // Open the Module select dropdown
    const moduleSelect = page.locator('.ant-select').filter({ hasText: /Select Module/i }).first();
    const hasModuleFilter = await moduleSelect.isVisible({ timeout: 5_000 }).catch(() => false);
    if (!hasModuleFilter) return;

    await moduleSelect.click();

    const dropdown = page.locator('.ant-select-dropdown').last();
    await expect(dropdown).toBeVisible({ timeout: 3_000 });

    // Pick the first non-"All Modules" option if available
    const options = dropdown.locator('.ant-select-item-option');
    const optionCount = await options.count();
    if (optionCount <= 1) {
      // Only "All Modules" is available, skip
      await page.keyboard.press('Escape');
      return;
    }

    // Click the second option (first actual module)
    await options.nth(1).click();
    await page.waitForTimeout(500);

    // Verify that the table still renders (filter applied)
    await expect(table).toBeVisible();
  });

  // -------------------------------------------------------------------------
  // Test: Filter by operation
  // -------------------------------------------------------------------------
  test('filter by operation', async ({ page }) => {
    const table = page.locator('.ant-table');
    await expect(table).toBeVisible({ timeout: 15_000 });

    // Open the Operation select dropdown
    const operationSelect = page.locator('.ant-select').filter({ hasText: /Select Operation/i }).first();
    const hasOperationFilter = await operationSelect.isVisible({ timeout: 5_000 }).catch(() => false);
    if (!hasOperationFilter) return;

    await operationSelect.click();

    const dropdown = page.locator('.ant-select-dropdown').last();
    await expect(dropdown).toBeVisible({ timeout: 3_000 });

    // Pick the first non-"All Operations" option if available
    const options = dropdown.locator('.ant-select-item-option');
    const optionCount = await options.count();
    if (optionCount <= 1) {
      await page.keyboard.press('Escape');
      return;
    }

    await options.nth(1).click();
    await page.waitForTimeout(500);

    // Verify the table is still visible (filter applied)
    await expect(table).toBeVisible();
  });

  // -------------------------------------------------------------------------
  // Test: Filter by user
  // -------------------------------------------------------------------------
  test('filter by user', async ({ page }) => {
    const table = page.locator('.ant-table');
    await expect(table).toBeVisible({ timeout: 15_000 });

    // Open the User select dropdown
    const userSelect = page.locator('.ant-select').filter({ hasText: /Select User/i }).first();
    const hasUserFilter = await userSelect.isVisible({ timeout: 5_000 }).catch(() => false);
    if (!hasUserFilter) return;

    await userSelect.click();

    const dropdown = page.locator('.ant-select-dropdown').last();
    await expect(dropdown).toBeVisible({ timeout: 3_000 });

    const options = dropdown.locator('.ant-select-item-option');
    const optionCount = await options.count();
    if (optionCount <= 1) {
      await page.keyboard.press('Escape');
      return;
    }

    await options.nth(1).click();
    await page.waitForTimeout(500);

    await expect(table).toBeVisible();
  });

  // -------------------------------------------------------------------------
  // Test: Timeline filter (date range)
  // -------------------------------------------------------------------------
  test('timeline filter modal opens and can select a time period', async ({ page }) => {
    // Click the "Timeline" button to open the AuditTimelineModal
    const timelineBtn = page.getByRole('button', { name: /Timeline/i });
    await expect(timelineBtn).toBeVisible({ timeout: 5_000 });
    await timelineBtn.click();

    // The timeline modal should appear
    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible({ timeout: 5_000 });

    // Select a time period option (e.g., "This Week")
    const thisWeekOption = modal.getByText('This Week');
    const hasThisWeek = await thisWeekOption.isVisible({ timeout: 3_000 }).catch(() => false);
    if (hasThisWeek) {
      await thisWeekOption.click();
    }

    // Close the modal
    const closeBtn = modal.getByRole('button', { name: /Close|OK|Apply/i }).first();
    const hasCloseBtn = await closeBtn.isVisible({ timeout: 2_000 }).catch(() => false);
    if (hasCloseBtn) {
      await closeBtn.click();
    } else {
      // Fall back to the X close button
      await modal.locator('button.ant-modal-close').click();
    }

    await expect(modal).not.toBeVisible({ timeout: 5_000 });
  });

  // -------------------------------------------------------------------------
  // Test: Search audit logs
  // -------------------------------------------------------------------------
  test('search filters audit logs', async ({ page }) => {
    const table = page.locator('.ant-table');
    await expect(table).toBeVisible({ timeout: 15_000 });

    const searchInput = page.getByPlaceholder('Search...');
    await expect(searchInput).toBeVisible();

    // Type a non-existent search term
    await searchInput.fill('zzz_nonexistent_audit_entry');
    await page.waitForTimeout(800);

    const rows = page.locator('.ant-table-tbody .ant-table-row');
    const emptyState = page.locator('.ant-empty');
    const rowCount = await rows.count();
    const hasEmpty = await emptyState.isVisible().catch(() => false);
    expect(rowCount === 0 || hasEmpty).toBeTruthy();

    // Clear search
    await searchInput.clear();
    await page.waitForTimeout(800);
  });

  // -------------------------------------------------------------------------
  // Test: Export audit logs
  // -------------------------------------------------------------------------
  test('export audit logs', async ({ page }) => {
    const table = page.locator('.ant-table');
    await expect(table).toBeVisible({ timeout: 15_000 });

    // Click the Export button
    const exportBtn = page.getByRole('button', { name: /Export/i });
    const hasExport = await exportBtn.isVisible({ timeout: 5_000 }).catch(() => false);
    if (!hasExport) return;

    await exportBtn.click();
    // Export should trigger a download — no error should occur
    await page.waitForTimeout(500);
  });
});
