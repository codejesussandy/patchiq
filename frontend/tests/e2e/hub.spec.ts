import { test, expect } from './fixtures';

// ---------------------------------------------------------------------------
// Hub — Software Hub (accessed via /assets/hub)
// ---------------------------------------------------------------------------
test.describe('Hub — Packages', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/assets/hub');
    await page.waitForURL('**/assets/hub', { timeout: 15_000 });
    await expect(page.getByRole('heading', { name: 'Software Hub' })).toBeVisible({ timeout: 10_000 });
  });

  test('hub page loads with stats and table', async ({ page }) => {
    // Verify statistic cards are visible
    await expect(page.getByText('Total Applications')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Total Size')).toBeVisible();

    // Verify the Packages tab is active by default
    const tabList = page.locator('.ant-tabs-nav');
    await expect(tabList.getByText('Packages')).toBeVisible();

    // Verify table columns are present
    await expect(page.getByRole('columnheader', { name: 'Name' })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('columnheader', { name: 'Latest Version' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Platform' })).toBeVisible();
  });

  test('hub packages list loads with data or empty state', async ({ page }) => {
    // Wait for table to finish loading — either rows or empty state
    const table = page.locator('.ant-table');
    await expect(table).toBeVisible({ timeout: 15_000 });

    const rows = page.locator('.ant-table-tbody .ant-table-row');
    const emptyState = page.locator('.ant-empty');
    const rowCount = await rows.count();
    const hasEmpty = await emptyState.isVisible().catch(() => false);

    // Table should either have data rows or show an empty state
    expect(rowCount > 0 || hasEmpty).toBeTruthy();
  });

  test('search for a package', async ({ page }) => {
    const searchInput = page.getByPlaceholder('Search packages...');
    await expect(searchInput).toBeVisible();

    // Count rows before searching
    const table = page.locator('.ant-table');
    await expect(table).toBeVisible({ timeout: 15_000 });
    const allRows = page.locator('.ant-table-tbody .ant-table-row');
    const initialCount = await allRows.count();

    // Type a non-existent package name
    await searchInput.fill('zzz_nonexistent_package_xyz');
    await page.waitForTimeout(800);

    // Either the row count should decrease or an empty state should appear
    const filteredRows = page.locator('.ant-table-tbody .ant-table-row');
    const emptyState = page.locator('.ant-empty');
    const filteredCount = await filteredRows.count();
    const hasEmpty = await emptyState.isVisible().catch(() => false);
    expect(filteredCount < initialCount || hasEmpty || initialCount === 0).toBeTruthy();

    // Clear the search
    await searchInput.clear();
    await page.waitForTimeout(800);
  });

  test('view package details via table row click', async ({ page }) => {
    const table = page.locator('.ant-table');
    await expect(table).toBeVisible({ timeout: 15_000 });

    const rows = page.locator('.ant-table-tbody .ant-table-row');
    const rowCount = await rows.count();
    if (rowCount === 0) {
      test.skip();
      return;
    }

    // Click on the package name link (first column link) to open the details drawer
    const firstNameLink = rows.first().locator('a').first();
    await firstNameLink.click();

    // The HubDetailsDrawer should open
    const drawer = page.locator('.ant-drawer');
    await expect(drawer).toBeVisible({ timeout: 5_000 });
  });

  test('add package modal opens', async ({ page }) => {
    // Click "Add Package" button
    await page.getByRole('button', { name: /Add Package/i }).click();

    // The HubPackageFormModal should open
    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible({ timeout: 5_000 });

    // Close the modal
    await modal.locator('button.ant-modal-close').click();
    await expect(modal).not.toBeVisible({ timeout: 5_000 });
  });

  test('hub tabs are accessible', async ({ page }) => {
    const tabList = page.locator('.ant-tabs-nav');
    await expect(tabList).toBeVisible({ timeout: 10_000 });

    // Verify all expected tabs exist
    const expectedTabs = ['Packages', 'Software Catalog', 'Bundles', 'Software Jobs'];
    for (const tabLabel of expectedTabs) {
      await expect(tabList.getByText(tabLabel)).toBeVisible();
    }

    // Click Software Catalog tab
    await tabList.getByText('Software Catalog').click();
    await page.waitForTimeout(500);

    // Click Bundles tab
    await tabList.getByText('Bundles').click();
    await page.waitForTimeout(500);

    // Click Software Jobs tab
    await tabList.getByText('Software Jobs').click();
    await page.waitForTimeout(500);

    // Go back to Packages tab
    await tabList.getByText('Packages').click();
    await page.waitForTimeout(500);
  });
});
