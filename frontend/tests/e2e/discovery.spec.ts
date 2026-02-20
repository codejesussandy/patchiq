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
// Discovery > Agents
// ---------------------------------------------------------------------------
test.describe('Discovery — Agents', () => {
  test('navigate to Discovery > Agents page', async ({ page }) => {
    await page.goto('/discovery/agents');
    await page.waitForURL('**/discovery/agents', { timeout: 15_000 });

    // Page heading
    await expect(page.getByRole('heading', { name: 'Agents' })).toBeVisible({ timeout: 10_000 });
  });

  test('agent list loads with table', async ({ page }) => {
    await page.goto('/discovery/agents');
    await page.waitForURL('**/discovery/agents', { timeout: 15_000 });

    await expect(page.getByRole('heading', { name: 'Agents' })).toBeVisible({ timeout: 10_000 });

    // The Agents tab should be active by default — verify column headers
    await expect(page.getByRole('columnheader', { name: 'Agent Name' })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('columnheader', { name: 'Status' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'IP Address' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Hostname' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'OS' })).toBeVisible();

    // Verify that "Total X agent(s) found" text is present
    await expect(page.getByText(/Total \d+ agents? found/)).toBeVisible({ timeout: 10_000 });
  });

  test('search filters agents list', async ({ page }) => {
    await page.goto('/discovery/agents');
    await page.waitForURL('**/discovery/agents', { timeout: 15_000 });
    await expect(page.getByRole('heading', { name: 'Agents' })).toBeVisible({ timeout: 10_000 });

    const searchInput = page.getByPlaceholder('Search');
    await expect(searchInput).toBeVisible();

    // Type a non-existent agent name to verify filtering
    await searchInput.fill('zzz_nonexistent_agent_xyz');
    await page.waitForTimeout(800);

    // Either zero rows or an empty state should be shown
    const rows = page.locator('.ant-table-tbody .ant-table-row');
    const emptyState = page.locator('.ant-empty');
    const rowCount = await rows.count();
    const hasEmpty = await emptyState.isVisible().catch(() => false);
    expect(rowCount === 0 || hasEmpty).toBeTruthy();

    // Clear search
    await searchInput.clear();
    await page.waitForTimeout(800);
  });

  test('download agent modal opens', async ({ page }) => {
    await page.goto('/discovery/agents');
    await page.waitForURL('**/discovery/agents', { timeout: 15_000 });
    await expect(page.getByRole('heading', { name: 'Agents' })).toBeVisible({ timeout: 10_000 });

    // Click the "Download Agent" button
    await page.getByRole('button', { name: /Download Agent/i }).click();

    // Verify the download modal appears
    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible({ timeout: 5_000 });
    await expect(modal.getByText('Download Agents for Devices')).toBeVisible();

    // Close the modal
    await modal.locator('button.ant-modal-close').click();
    await expect(modal).not.toBeVisible({ timeout: 5_000 });
  });

  test('errors tab loads', async ({ page }) => {
    await page.goto('/discovery/agents');
    await page.waitForURL('**/discovery/agents', { timeout: 15_000 });
    await expect(page.getByRole('heading', { name: 'Agents' })).toBeVisible({ timeout: 10_000 });

    // Click Errors tab
    const tabList = page.locator('.ant-tabs-nav');
    await tabList.getByText('Errors').click();

    // Verify that the errors tab content loads — should show filter selects
    await expect(page.getByText('Filter by agent').or(page.locator('.ant-select').first())).toBeVisible({ timeout: 10_000 });
  });
});

// ---------------------------------------------------------------------------
// Discovery > IP Discovery
// ---------------------------------------------------------------------------
test.describe('Discovery — IP Discovery', () => {
  test('navigate to IP Discovery page', async ({ page }) => {
    await page.goto('/discovery/ip-discovery');
    await page.waitForURL('**/discovery/ip-discovery', { timeout: 15_000 });

    await expect(page.getByRole('heading', { name: 'IP Discovery' })).toBeVisible({ timeout: 10_000 });
  });

  test('IP Discovery page loads with table and controls', async ({ page }) => {
    await page.goto('/discovery/ip-discovery');
    await page.waitForURL('**/discovery/ip-discovery', { timeout: 15_000 });
    await expect(page.getByRole('heading', { name: 'IP Discovery' })).toBeVisible({ timeout: 10_000 });

    // Verify search input is present
    const searchInput = page.getByPlaceholder('Search');
    await expect(searchInput).toBeVisible();

    // Verify "Create IP Range" button is present
    await expect(page.getByRole('button', { name: /Create IP Range/i })).toBeVisible();

    // Verify table columns
    await expect(page.getByRole('columnheader', { name: 'Name' })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('columnheader', { name: 'IP Range' })).toBeVisible();
  });

  test('create IP range modal opens and can be cancelled', async ({ page }) => {
    await page.goto('/discovery/ip-discovery');
    await page.waitForURL('**/discovery/ip-discovery', { timeout: 15_000 });
    await expect(page.getByRole('heading', { name: 'IP Discovery' })).toBeVisible({ timeout: 10_000 });

    // Click "Create IP Range" button
    await page.getByRole('button', { name: /Create IP Range/i }).click();

    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible({ timeout: 5_000 });
    await expect(modal.getByText('Create IP Range')).toBeVisible();

    // Verify form fields exist
    await expect(modal.getByText('Range Name')).toBeVisible();
    await expect(modal.getByText('IP Range (CIDR)')).toBeVisible();

    // Cancel without creating
    await modal.getByRole('button', { name: 'Cancel' }).click();
    await expect(modal).not.toBeVisible({ timeout: 5_000 });
  });
});
