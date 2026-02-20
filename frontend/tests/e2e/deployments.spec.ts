import { test, expect } from './fixtures';

test.describe('Patch Deployed', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/patches/deployed');
    // The page renders PatchJobsDeployed which shows a toolbar with Refresh/Export buttons
    // Wait for the toolbar to appear (networkidle can timeout due to background polling)
    await expect(page.getByRole('button', { name: /Refresh/i })).toBeVisible({ timeout: 15_000 });
  });

  test('deployments page loads', async ({ page }) => {
    // Either a table or an empty state must be visible
    const hasTable = await page.locator('.ant-table').isVisible().catch(() => false);
    const hasEmpty = await page.locator('.ant-empty').isVisible().catch(() => false);
    // Also check for custom empty state (app renders custom "No patch deployments yet" message)
    const hasCustomEmpty = await page.getByText(/No patch deployments yet/i).isVisible().catch(() => false);
    expect(hasTable || hasEmpty || hasCustomEmpty).toBe(true);
  });

  test('deployment table shows correct columns', async ({ page }) => {
    const table = page.locator('.ant-table');
    const hasTable = await table.isVisible().catch(() => false);

    if (!hasTable) {
      test.skip(); // no data — nothing to verify
      return;
    }

    const headers = table.locator('th');
    await expect(headers.filter({ hasText: 'Name' })).toBeVisible();
    await expect(headers.filter({ hasText: 'ID' })).toBeVisible();
    await expect(headers.filter({ hasText: 'Stage' })).toBeVisible();
    await expect(headers.filter({ hasText: 'Progress' })).toBeVisible();
    await expect(headers.filter({ hasText: 'Trigger' })).toBeVisible();
    await expect(headers.filter({ hasText: 'Created' })).toBeVisible();
  });

  test('clicking MoreOutlined on deployment row opens action menu with View Details', async ({ page }) => {
    const rows = page.locator('.ant-table-tbody tr.ant-table-row');
    const rowCount = await rows.count();

    if (rowCount === 0) {
      test.skip();
      return;
    }

    const firstRow = rows.first();
    // View Details eye icon button
    await firstRow.locator('button').first().click();

    const modal = page.locator('.ant-modal');
    await expect(modal).toBeVisible({ timeout: 10000 });

    // Close modal
    await page.keyboard.press('Escape');
    await expect(modal).not.toBeVisible({ timeout: 5000 });
  });

  test('toolbar has Refresh and Export buttons', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Refresh/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Export/i })).toBeVisible();
  });

  test('search input is present and functional', async ({ page }) => {
    // Scope to main content to avoid strict mode conflict with the header global search
    const searchInput = page.getByRole('main').getByPlaceholder('Search...');
    await expect(searchInput).toBeVisible();
    await searchInput.fill('nonexistent-xyz');
    await page.waitForTimeout(600);

    // Either 0 rows or the custom empty state
    const rows = page.locator('.ant-table-tbody tr.ant-table-row');
    const rowCount = await rows.count();
    expect(rowCount).toBe(0);

    await searchInput.clear();
  });
});
