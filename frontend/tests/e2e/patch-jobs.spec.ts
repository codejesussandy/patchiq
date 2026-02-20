import { test, expect } from './fixtures';

/**
 * "Patch Jobs (Deployed)" tests for the PatchJobsDeployed page at /patches/deployed.
 * This page shows a list of patch deployments with columns: ID, Name, Patches, Stage, Progress, Trigger, Created.
 * There is no Create button on this page — deployments are created from Patches > All Patches > Patch Details > Deploy.
 */

test.describe('Patch Jobs (Deployed)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/patches/deployed');
    // Wait for toolbar (networkidle can timeout due to background polling)
    await expect(page.getByRole('button', { name: /Refresh/i })).toBeVisible({ timeout: 15_000 });
  });

  test('page loads with table columns', async ({ page }) => {
    // Either the table or empty state is rendered
    const hasTable = await page.locator('.ant-table').isVisible().catch(() => false);
    const hasEmpty = await page.locator('.ant-empty').isVisible().catch(() => false);
    // Also check for custom empty state text
    const hasCustomEmpty = await page.getByText(/No patch deployments yet/i).isVisible().catch(() => false);
    expect(hasTable || hasEmpty || hasCustomEmpty).toBe(true);

    if (hasTable) {
      const headers = page.locator('.ant-table th');
      await expect(headers.filter({ hasText: 'Name' })).toBeVisible();
      await expect(headers.filter({ hasText: 'ID' })).toBeVisible();
      await expect(headers.filter({ hasText: 'Stage' })).toBeVisible();
      await expect(headers.filter({ hasText: 'Progress' })).toBeVisible();
      await expect(headers.filter({ hasText: 'Trigger' })).toBeVisible();
      await expect(headers.filter({ hasText: 'Created' })).toBeVisible();
    }
  });

  test('toolbar has Refresh and Export buttons', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Refresh/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Export/i })).toBeVisible();
  });

  test('empty state shows correct message when no deployments', async ({ page }) => {
    const hasTable = await page.locator('.ant-table-tbody tr.ant-table-row').count().then(c => c > 0).catch(() => false);

    if (hasTable) {
      test.skip(); // table has data — empty state not shown
      return;
    }

    // App uses a custom empty state (not .ant-empty)
    await expect(page.getByText(/No patch deployments yet/i)).toBeVisible({ timeout: 5_000 });
  });

  test('search filters the deployment list', async ({ page }) => {
    // Scope to main content to avoid strict mode conflict with the header global search
    const searchInput = page.getByRole('main').getByPlaceholder('Search...');
    await searchInput.fill('nonexistent-xyz-entry-12345');

    // Wait for debounce
    await page.waitForTimeout(600);

    // Either 0 rows or empty table placeholder
    const rows = page.locator('.ant-table-tbody tr.ant-table-row');
    const rowCount = await rows.count();
    // Row count should be 0 after filtering for a nonexistent term
    expect(rowCount).toBe(0);

    // Clear search
    await searchInput.clear();
  });
});
