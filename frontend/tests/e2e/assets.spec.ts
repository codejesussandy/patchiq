import { test, expect } from './fixtures';

// ---------------------------------------------------------------------------
// Helper: navigate to /assets and wait for the table to be visible
// ---------------------------------------------------------------------------
async function goToAssets(page: ReturnType<typeof test['info']> extends never ? never : Parameters<Parameters<typeof test>[1]>[0]['page']) {
  await page.goto('/assets');
  await page.waitForURL('**/assets', { timeout: 15000 });
  await expect(page.locator('.ant-table')).toBeVisible({ timeout: 15000 });
}

// ---------------------------------------------------------------------------
// Test: assets list page loads with table
// ---------------------------------------------------------------------------
test('assets list page loads with table', async ({ page }) => {
  await page.goto('/assets');
  await page.waitForURL('**/assets', { timeout: 15000 });

  // Page heading
  await expect(page.getByRole('heading', { name: 'Assets' })).toBeVisible();

  // Main table
  const table = page.locator('.ant-table');
  await expect(table).toBeVisible({ timeout: 15000 });

  // Verify expected column headers are present
  await expect(page.getByRole('columnheader', { name: 'Asset ID' })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Network Identity' })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Category' })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Operational Status' })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Status', exact: true })).toBeVisible();
});

// ---------------------------------------------------------------------------
// Test: search filters the table
// ---------------------------------------------------------------------------
test('search filters the table', async ({ page }) => {
  await page.goto('/assets');
  await expect(page.locator('.ant-table')).toBeVisible({ timeout: 15000 });

  const searchInput = page.getByPlaceholder('Search assets...');
  await expect(searchInput).toBeVisible();

  // Count rows before searching
  const allRows = page.locator('.ant-table-tbody .ant-table-row');
  const initialCount = await allRows.count();

  // Type a highly unlikely string to get zero (or fewer) results
  await searchInput.fill('zzz_nonexistent_asset_xyz');
  // Wait for debounce / server response
  await page.waitForTimeout(800);

  // Either the row count changed or an empty-state element appears
  const filteredRows = page.locator('.ant-table-tbody .ant-table-row');
  const noData = page.locator('.ant-empty');
  const filteredCount = await filteredRows.count();
  const hasEmpty = await noData.isVisible();
  expect(filteredCount < initialCount || hasEmpty).toBeTruthy();

  // Clear the search and verify full results are restored
  await searchInput.clear();
  await page.waitForTimeout(800);
  const restoredCount = await page.locator('.ant-table-tbody .ant-table-row').count();
  expect(restoredCount).toBeGreaterThanOrEqual(initialCount);
});

// ---------------------------------------------------------------------------
// Test: filter modal works
// ---------------------------------------------------------------------------
test('filter modal works', async ({ page }) => {
  await page.goto('/assets');
  await expect(page.locator('.ant-table')).toBeVisible({ timeout: 15000 });

  // Open Filter modal — button text is "filter Filter" (icon prefix + label)
  await page.getByRole('button', { name: 'filter Filter' }).click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText('Filter Assets')).toBeVisible();

  // Select a status option from "Filter by Status" select
  const statusSelect = dialog.locator('.ant-select').nth(1);
  await statusSelect.click();
  const dropdown = page.locator('.ant-select-dropdown').last();
  await dropdown.getByText('In Use').click();

  // Click "Apply Filters"
  await dialog.getByRole('button', { name: 'Apply Filters' }).click();

  // Verify success toast
  await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 5000 });

  // Reopen filter modal and clear all filters
  await page.getByRole('button', { name: 'filter Filter' }).click();
  const dialog2 = page.getByRole('dialog');
  await expect(dialog2).toBeVisible();

  await dialog2.getByRole('button', { name: 'Clear All Filters' }).click();

  // Verify info toast for cleared filters
  await expect(page.locator('.ant-message-info')).toBeVisible({ timeout: 5000 });

  // Close the modal — use the footer Close button (not the X icon button)
  await dialog2.locator('.ant-modal-footer').getByRole('button', { name: 'Close' }).click();
});

// ---------------------------------------------------------------------------
// Test: clicking an asset row opens asset details
// ---------------------------------------------------------------------------
test('clicking asset row opens details', async ({ page }) => {
  await page.goto('/assets');
  await expect(page.locator('.ant-table')).toBeVisible({ timeout: 15000 });

  const rows = page.locator('.ant-table-tbody .ant-table-row');
  await expect(rows.first()).toBeVisible({ timeout: 10000 });

  // Click on the Asset ID cell (second td, index 1) to navigate to details without triggering
  // the Category assignment dialog that fires when clicking the Category cell.
  await rows.first().locator('td').nth(1).click();

  // URL should change to /assets/<id>
  await page.waitForURL(/\/assets\/.+/, { timeout: 10000 });
  expect(page.url()).toMatch(/\/assets\/[^/]+$/);

  // Asset Details heading
  await expect(page.getByRole('heading', { name: 'Asset Details' })).toBeVisible({ timeout: 10000 });
});

// ---------------------------------------------------------------------------
// Test: asset details shows all tabs and tab navigation works
// ---------------------------------------------------------------------------
test('asset details shows all tabs', async ({ page }) => {
  await page.goto('/assets');
  await expect(page.locator('.ant-table-tbody .ant-table-row').first()).toBeVisible({ timeout: 15000 });

  // Click on the Asset ID cell (first data cell) to navigate to details without triggering
  // the Category assignment dialog that fires when clicking the Category cell.
  const firstRow = page.locator('.ant-table-tbody .ant-table-row').first();
  await firstRow.locator('td').nth(1).click();
  await page.waitForURL(/\/assets\/.+/, { timeout: 10000 });

  // Verify all expected tabs are present
  const tabList = page.locator('.ant-tabs-nav');
  await expect(tabList).toBeVisible({ timeout: 10000 });

  const expectedTabs = [
    'Details',
    'Asset Life cycle',
    'Hardware',
    'Software',
    'Audit Log',
    'Vulnerabilities',
    'Patches',
    'Alerts',
  ];

  for (const tabLabel of expectedTabs) {
    await expect(tabList.getByText(tabLabel)).toBeVisible();
  }

  // Click Hardware tab and verify it loads
  await tabList.getByText('Hardware').click();
  await expect(page.getByRole('tabpanel', { name: 'Hardware' })).toBeVisible();

  // Click Software tab
  await tabList.getByText('Software').click();
  await expect(page.getByRole('tabpanel', { name: 'Software' })).toBeVisible();

  // Click Patches tab
  await tabList.getByText('Patches').click();
  await expect(page.getByRole('tabpanel', { name: 'Patches' })).toBeVisible();
});

// ---------------------------------------------------------------------------
// Test: create and delete asset lifecycle
// ---------------------------------------------------------------------------
test('create and delete asset lifecycle', async ({ page }) => {
  await page.goto('/assets');
  await expect(page.locator('.ant-table')).toBeVisible({ timeout: 15000 });

  // Open "Add Assets" modal
  await page.getByRole('button', { name: /Add Assets/i }).click();

  const modal = page.getByRole('dialog');
  await expect(modal).toBeVisible({ timeout: 5000 });
  await expect(modal.getByText('Add New Asset')).toBeVisible();

  // --- Step 1: Define Assets ---
  const assetName = `E2E-Asset-${Date.now()}`;
  await modal.getByPlaceholder('Enter asset name').fill(assetName);

  // Select Category (required)
  const categorySelect = modal.locator('.ant-select').filter({ hasText: /Select category/i }).first();
  await categorySelect.click();
  const categoryDropdown = page.locator('.ant-select-dropdown').last();
  await categoryDropdown.waitFor({ state: 'visible', timeout: 5000 });
  // Pick the first available category option; skip test if no categories exist
  const firstCategory = categoryDropdown.locator('.ant-select-item-option').first();
  const hasCategory = await firstCategory.isVisible({ timeout: 3000 }).catch(() => false);
  if (!hasCategory) {
    test.skip();
    return;
  }
  await firstCategory.click();

  // Select OS (required)
  const osSelect = modal.locator('label:has-text("OS")').locator('..').locator('.ant-select').first();
  await osSelect.click();
  const osDropdown = page.locator('.ant-select-dropdown').last();
  await osDropdown.getByText('Windows').first().click();

  // Advance to Step 2
  await modal.getByRole('button', { name: 'Next' }).click();

  // Step 2: OS Properties — just advance
  await modal.getByRole('button', { name: 'Next' }).click();

  // Step 3: Additional Properties — submit
  await modal.getByRole('button', { name: 'Submit Asset' }).click();

  // Verify success toast
  await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 10000 });

  // Wait for modal to close
  await expect(modal).not.toBeVisible({ timeout: 5000 });

  // Search for the newly created asset
  const searchInput = page.getByPlaceholder('Search assets...');
  await searchInput.fill(assetName);
  await page.waitForTimeout(800);

  const rows = page.locator('.ant-table-tbody .ant-table-row');
  await expect(rows.first()).toBeVisible({ timeout: 10000 });

  // Open asset details — click Asset ID cell to avoid triggering Category dialog
  await rows.first().locator('td').nth(1).click();
  await page.waitForURL(/\/assets\/.+/, { timeout: 10000 });
  await expect(page.getByRole('heading', { name: 'Asset Details' })).toBeVisible();

  // Use ActionMenu → "Delete Asset"
  // ActionMenu renders a button that opens a dropdown with MoreOutlined icon
  const actionMenuButton = page.locator('.ant-btn').filter({ has: page.locator('.anticon-more') }).last();
  await actionMenuButton.click();

  const antDropdown = page.locator('.ant-dropdown:visible');
  await expect(antDropdown).toBeVisible({ timeout: 5000 });
  await antDropdown.getByText('Delete Asset').click();

  // Confirm deletion in Ant Design Modal.confirm dialog
  const confirmDialog = page.getByRole('dialog');
  await expect(confirmDialog).toBeVisible();
  await confirmDialog.getByRole('button', { name: 'Delete' }).click();

  // Verify success toast and redirect back to /assets
  await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 10000 });
  await page.waitForURL('**/assets', { timeout: 10000 });
  expect(page.url()).toMatch(/\/assets$/);
});

// ---------------------------------------------------------------------------
// Test: bulk delete assets
// ---------------------------------------------------------------------------
test('bulk delete assets', async ({ page }) => {
  await page.goto('/assets');
  await expect(page.locator('.ant-table')).toBeVisible({ timeout: 15000 });

  const rows = page.locator('.ant-table-tbody .ant-table-row');
  await expect(rows.first()).toBeVisible({ timeout: 10000 });

  const rowCount = await rows.count();
  if (rowCount < 2) {
    // Not enough rows to bulk-delete; skip gracefully
    test.skip();
    return;
  }

  // Select the first two rows via their row checkboxes
  const checkboxes = page.locator('.ant-table-tbody .ant-table-row .ant-checkbox-input');
  await checkboxes.nth(0).click();
  await checkboxes.nth(1).click();

  // Verify the "{n} Selected" label appears
  await expect(page.getByText(/\d+ Selected/)).toBeVisible({ timeout: 5000 });
  const selectedText = await page.getByText(/\d+ Selected/).innerText();
  const selectedCount = parseInt(selectedText, 10);
  expect(selectedCount).toBeGreaterThanOrEqual(2);

  // Click "More actions" dropdown (the bulk-action MoreOutlined button)
  const moreActionsButton = page.locator('button').filter({ has: page.locator('.anticon-more') }).first();
  await moreActionsButton.click();

  // Click "Delete Selected" in the dropdown
  const bulkDropdown = page.locator('.ant-dropdown:visible');
  await expect(bulkDropdown).toBeVisible({ timeout: 5000 });
  await bulkDropdown.getByText('Delete Selected').click();

  // Confirm in the ConfirmModal dialog
  const confirmDialog = page.getByRole('dialog');
  await expect(confirmDialog).toBeVisible();
  await confirmDialog.getByRole('button', { name: 'Yes' }).click();

  // Verify success toast
  await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 10000 });
});
