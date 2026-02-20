import { test, expect } from './fixtures';

// ---------------------------------------------------------------------------
// Software Licenses page (/assets/software-license)
// ---------------------------------------------------------------------------

test.describe('Software Licenses page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/assets/software-license');
    await page.waitForURL('**/software-license', { timeout: 15000 });
  });

  // ── Render ────────────────────────────────────────────────────────────────

  test('page renders title and New License button', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /software licenses/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: /new license/i })).toBeVisible();
  });

  // ── Tabs ──────────────────────────────────────────────────────────────────

  test('Application Licenses and OS Licenses tabs are visible', async ({ page }) => {
    await expect(page.getByRole('tab', { name: /application licenses/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('tab', { name: /os licenses/i })).toBeVisible();
  });

  test('Application Licenses tab is active by default', async ({ page }) => {
    const tab = page.getByRole('tab', { name: /application licenses/i });
    await expect(tab).toHaveAttribute('aria-selected', 'true', { timeout: 10000 });
  });

  test('clicking OS Licenses tab switches active tab', async ({ page }) => {
    const osTab = page.getByRole('tab', { name: /os licenses/i });
    await osTab.click();
    await expect(osTab).toHaveAttribute('aria-selected', 'true', { timeout: 5000 });
    await expect(page.getByRole('tab', { name: /application licenses/i })).toHaveAttribute('aria-selected', 'false');
  });

  test('switching back to Application Licenses tab works', async ({ page }) => {
    await page.getByRole('tab', { name: /os licenses/i }).click();
    await page.getByRole('tab', { name: /application licenses/i }).click();
    await expect(page.getByRole('tab', { name: /application licenses/i })).toHaveAttribute('aria-selected', 'true', { timeout: 5000 });
  });

  // ── Application Licenses tab data ─────────────────────────────────────────

  test('Application Licenses tab shows table with data', async ({ page }) => {
    await expect(page.locator('.ant-table')).toBeVisible({ timeout: 10000 });
    // Table should have rows or an empty state — not a loader
    const rows = page.locator('.ant-table-tbody .ant-table-row');
    const empty = page.locator('.ant-empty');
    await expect(rows.first().or(empty)).toBeVisible({ timeout: 10000 });
  });

  test('Application Licenses tab has correct column headers', async ({ page }) => {
    await expect(page.locator('.ant-table')).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('columnheader', { name: 'License Name' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Software Name' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Status' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'License Count' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Vendor Name' })).toBeVisible();
  });

  // ── OS Licenses tab data ───────────────────────────────────────────────────

  test('OS Licenses tab shows table with correct columns', async ({ page }) => {
    await page.getByRole('tab', { name: /os licenses/i }).click();
    const panel = page.getByRole('tabpanel', { name: /os licenses/i });
    await expect(panel.locator('.ant-table')).toBeVisible({ timeout: 10000 });
    await expect(panel.getByRole('columnheader', { name: 'License Name' })).toBeVisible();
    await expect(panel.getByRole('columnheader', { name: 'OS Type' })).toBeVisible();
    await expect(panel.getByRole('columnheader', { name: 'Status' })).toBeVisible();
    await expect(panel.getByRole('columnheader', { name: 'License Count' })).toBeVisible();
  });

  test('OS Licenses tab shows data after switch', async ({ page }) => {
    await page.getByRole('tab', { name: /os licenses/i }).click();
    const panel = page.getByRole('tabpanel', { name: /os licenses/i });
    const rows = panel.locator('.ant-table-tbody .ant-table-row');
    const empty = panel.locator('.ant-empty');
    await expect(rows.first().or(empty)).toBeVisible({ timeout: 10000 });
  });

  // ── Search ─────────────────────────────────────────────────────────────────

  test('search input is visible on Application Licenses tab', async ({ page }) => {
    const panel = page.getByRole('tabpanel', { name: /application licenses/i });
    await expect(panel.getByPlaceholder('Search')).toBeVisible({ timeout: 10000 });
  });

  test('search filters Application Licenses results', async ({ page }) => {
    const panel = page.getByRole('tabpanel', { name: /application licenses/i });
    await expect(panel.locator('.ant-table')).toBeVisible({ timeout: 10000 });
    const rows = panel.locator('.ant-table-tbody .ant-table-row');
    const initialCount = await rows.count();
    if (initialCount === 0) return;

    await panel.getByPlaceholder('Search').fill('zzz_no_match_xyz');
    await page.waitForTimeout(500);

    const afterCount = await rows.count();
    const hasEmpty = await panel.locator('.ant-empty').isVisible();
    expect(afterCount < initialCount || hasEmpty).toBeTruthy();

    await panel.getByPlaceholder('Search').clear();
    await page.waitForTimeout(500);
    expect(await rows.count()).toBeGreaterThanOrEqual(initialCount);
  });

  test('search resets when switching tabs', async ({ page }) => {
    const swPanel = page.getByRole('tabpanel', { name: /application licenses/i });
    await swPanel.getByPlaceholder('Search').fill('some search text');
    await expect(swPanel.getByPlaceholder('Search')).toHaveValue('some search text');

    await page.getByRole('tab', { name: /os licenses/i }).click();
    await page.getByRole('tab', { name: /application licenses/i }).click();

    // After tab switch the useEffect resets searchText
    await expect(swPanel.getByPlaceholder('Search')).toHaveValue('', { timeout: 3000 });
  });

  // ── New License modal ──────────────────────────────────────────────────────

  test('New License button opens Add Software License modal on Application tab', async ({ page }) => {
    await page.getByRole('button', { name: /new license/i }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5000 });
    await expect(dialog.getByText(/add new software license/i)).toBeVisible();
    await page.keyboard.press('Escape');
  });

  test('New License button opens Add OS License modal on OS tab', async ({ page }) => {
    await page.getByRole('tab', { name: /os licenses/i }).click();
    await page.getByRole('button', { name: /new license/i }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5000 });
    await expect(dialog.getByText(/add new os license/i)).toBeVisible();
    await page.keyboard.press('Escape');
  });
});

// ---------------------------------------------------------------------------
// Software Inventory page (/assets/software-inventory)
// ---------------------------------------------------------------------------

test.describe('Software Inventory page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/assets/software-inventory');
    await page.waitForURL('**/software-inventory', { timeout: 15000 });
    await expect(page.locator('.ant-table')).toBeVisible({ timeout: 15000 });
  });

  // ── Render ────────────────────────────────────────────────────────────────

  test('page renders title and Import from CSV button', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /software inventory/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /import from csv/i })).toBeVisible();
  });

  test('table has correct column headers', async ({ page }) => {
    await expect(page.getByRole('columnheader', { name: 'Software Name' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Version' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Software Type' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Manufacturer' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Total Instances' })).toBeVisible();
  });

  // ── Filters ───────────────────────────────────────────────────────────────

  test('search input is visible and OS filter is not present', async ({ page }) => {
    await expect(page.locator('input[placeholder="Search"]')).toBeVisible();
    // OS filter was removed — no dropdown with "All OS" text should be visible
    await expect(page.locator('.ant-select-selector').filter({ hasText: 'All OS' })).toHaveCount(0);
  });

  test('category filter dropdown is visible with correct default', async ({ page }) => {
    await expect(page.getByText('All Categories')).toBeVisible();
  });

  test('search filters the table', async ({ page }) => {
    const rows = page.locator('.ant-table-tbody .ant-table-row');
    const initialCount = await rows.count();
    if (initialCount === 0) return;

    await page.locator('input[placeholder="Search"]').fill('zzz_no_match_xyz');
    await page.waitForTimeout(500);

    const afterCount = await rows.count();
    const hasEmpty = await page.locator('.ant-empty').isVisible();
    expect(afterCount < initialCount || hasEmpty).toBeTruthy();

    await page.locator('input[placeholder="Search"]').clear();
    await page.waitForTimeout(500);
    expect(await rows.count()).toBeGreaterThanOrEqual(initialCount);
  });

  test('category filter dropdown opens and shows options', async ({ page }) => {
    await page.getByText('All Categories').click();
    // Options are in the dropdown popup — use getByTitle which Ant Select renders
    await expect(page.locator('.ant-select-item-option').filter({ hasText: 'Application' })).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.ant-select-item-option').filter({ hasText: 'System' })).toBeVisible();
    await page.keyboard.press('Escape');
  });
});
