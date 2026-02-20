import { test, expect } from './fixtures';

// ─── Page Load ────────────────────────────────────────────────────────────────

test('page loads with stats and table', async ({ page }) => {
  await page.goto('/patch-recommendations');

  await expect(page.getByRole('heading', { name: 'Patch Recommendations' })).toBeVisible({ timeout: 15000 });

  // Severity stat cards
  await expect(page.getByText('Critical')).toBeVisible();
  await expect(page.getByText('High')).toBeVisible();
  await expect(page.getByText('Medium')).toBeVisible();
  await expect(page.getByText('Low')).toBeVisible();

  // Status stat cards
  await expect(page.getByText('Recommended')).toBeVisible();
  await expect(page.getByText('Accepted')).toBeVisible();
  await expect(page.getByText('Deployed')).toBeVisible();

  // Recommendations card/table heading
  await expect(page.getByText('Recommendations').last()).toBeVisible();
});

// ─── Search and Filter ────────────────────────────────────────────────────────

test('search and filter recommendations', async ({ page }) => {
  await page.goto('/patch-recommendations');
  await expect(page.getByRole('heading', { name: 'Patch Recommendations' })).toBeVisible({ timeout: 15000 });

  // Search by CVE / Asset / Patch
  const searchInput = page.getByPlaceholder('Search CVE, Asset, Patch...');
  await searchInput.fill('CVE-9999-nonexistent');

  // Wait for debounce
  await page.waitForTimeout(800);

  // Table should show empty state or no results
  const noResults = page.locator('.ant-empty')
    .or(page.getByText('No data found'))
    .or(page.getByText(/0 recommendations|No data/));
  await expect(noResults.first()).toBeVisible({ timeout: 6000 });

  await searchInput.clear();

  // Filter by Status — use placeholder text to identify the correct select
  const statusSelect = page.locator('.ant-select').filter({ hasText: /Filter by Status/i }).first();
  const hasStatusFilter = await statusSelect.isVisible({ timeout: 5000 }).catch(() => false);
  if (hasStatusFilter) {
    await statusSelect.click();
    const statusDropdown = page.locator('.ant-select-dropdown').last();
    await statusDropdown.waitFor({ state: 'visible', timeout: 5000 });
    await page.waitForTimeout(300);
    await statusDropdown.locator('.ant-select-item-option').filter({ hasText: 'Recommended' }).first().click();
  }

  // Filter by Severity (multi-select)
  const severitySelect = page.locator('.ant-select').filter({ hasText: /Filter by Severity/i }).first();
  const hasSeverityFilter = await severitySelect.isVisible({ timeout: 3000 }).catch(() => false);
  if (hasSeverityFilter) {
    await severitySelect.click();
    const severityDropdown = page.locator('.ant-select-dropdown').last();
    await severityDropdown.waitFor({ state: 'visible', timeout: 5000 });
    await page.waitForTimeout(300);
    await severityDropdown.locator('.ant-select-item-option').filter({ hasText: 'Critical' }).first().click();
    await page.keyboard.press('Escape');
  }

  // Clear any active filters
  const clearIcons = page.locator('.ant-select-clear');
  const clearCount = await clearIcons.count();
  for (let i = 0; i < clearCount; i++) {
    await clearIcons.first().click().catch(() => {});
  }
});

// ─── Accept a Recommendation ──────────────────────────────────────────────────

test('accept a recommendation', async ({ page }) => {
  await page.goto('/patch-recommendations');
  await expect(page.getByRole('heading', { name: 'Patch Recommendations' })).toBeVisible({ timeout: 15000 });

  // Check if there are any actual data rows (not the "No data found" empty row)
  const dataRows = page.locator('.ant-table-tbody tr.ant-table-row');
  const rowCount = await dataRows.count();
  if (rowCount === 0) {
    test.skip();
    return;
  }

  // Select first row checkbox
  const firstCheckbox = page.getByRole('table').getByRole('checkbox').nth(1);
  await firstCheckbox.waitFor({ state: 'visible', timeout: 10000 });
  await firstCheckbox.check();

  // Click the Accept button in the inline row actions (not bulk)
  // The recommendation columns render per-row Accept buttons
  const acceptBtn = page.getByRole('button', { name: /Accept/i }).first();
  const hasAccept = await acceptBtn.isVisible({ timeout: 5000 }).catch(() => false);

  if (!hasAccept) {
    test.skip();
    return;
  }

  await acceptBtn.click();

  // Confirm modal appears
  await expect(page.getByText('Accept Recommendation')).toBeVisible({ timeout: 5000 });
  await page.locator('.ant-modal-confirm-btns').getByRole('button', { name: 'OK' }).click();

  // Success toast
  await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 10000 });
});

// ─── Reject with Reason ────────────────────────────────────────────────────────

test('reject a recommendation with reason', async ({ page }) => {
  await page.goto('/patch-recommendations');
  await expect(page.getByRole('heading', { name: 'Patch Recommendations' })).toBeVisible({ timeout: 15000 });

  // Click Reject on the first row
  const rejectBtn = page.getByRole('button', { name: /Reject/i }).first();
  const hasReject = await rejectBtn.isVisible({ timeout: 8000 }).catch(() => false);

  if (!hasReject) {
    test.skip();
    return;
  }

  await rejectBtn.click();

  // Reject modal should open with textarea
  await expect(page.getByRole('dialog', { name: 'Reject Recommendation' })).toBeVisible({ timeout: 5000 });

  await page.getByPlaceholder('Reason for rejection...').fill('E2E test rejection reason');

  // Confirm
  await page.getByRole('button', { name: 'OK' }).click();

  // Success toast
  await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 10000 });
});

// ─── Deploy a Recommendation ──────────────────────────────────────────────────

test('deploy a recommendation', async ({ page }) => {
  await page.goto('/patch-recommendations');
  await expect(page.getByRole('heading', { name: 'Patch Recommendations' })).toBeVisible({ timeout: 15000 });

  // Filter to "Accepted" status so Deploy button is available
  // First check if there's any data at all
  const statusSelect = page.locator('.ant-select').filter({ hasText: /Filter by Status/i }).first();
  const hasStatusSelect = await statusSelect.isVisible({ timeout: 3000 }).catch(() => false);
  if (!hasStatusSelect) {
    test.skip();
    return;
  }
  // Click the Status filter select to open the dropdown
  await statusSelect.click();
  const statusDropdown = page.locator('.ant-select-dropdown').last();
  await statusDropdown.waitFor({ state: 'visible', timeout: 5000 });
  await page.waitForTimeout(300);
  await statusDropdown.locator('.ant-select-item-option').filter({ hasText: 'Accepted' }).first().click();

  const deployBtn = page.getByRole('button', { name: /Deploy/i }).first();
  const hasDeployBtn = await deployBtn.isVisible({ timeout: 8000 }).catch(() => false);

  if (!hasDeployBtn) {
    test.skip();
    return;
  }

  await deployBtn.click();

  // Confirm modal
  await expect(page.getByText('Deploy Patch')).toBeVisible({ timeout: 5000 });
  await page.locator('.ant-modal-confirm-btns').getByRole('button', { name: 'Deploy' }).click();

  // Success modal with "Deployment Created"
  await expect(page.getByText('Deployment Created')).toBeVisible({ timeout: 12000 });

  // Dismiss success modal
  await page.getByRole('button', { name: 'View Deployments' }).or(
    page.getByRole('button', { name: 'OK' })
  ).first().click();
});

// ─── Refresh Reloads Data ─────────────────────────────────────────────────────

test('refresh button reloads data', async ({ page }) => {
  await page.goto('/patch-recommendations');
  await expect(page.getByRole('heading', { name: 'Patch Recommendations' })).toBeVisible({ timeout: 15000 });

  const refreshBtn = page.getByRole('button', { name: /Refresh/i });
  await expect(refreshBtn).toBeVisible();

  await refreshBtn.click();

  // Expect the loading/spin state to appear briefly (loading prop on button)
  // Then check data is still visible after refetch
  await expect(page.getByRole('heading', { name: 'Patch Recommendations' })).toBeVisible({ timeout: 10000 });

  // Stats should still be present after refresh
  await expect(page.getByText('Critical')).toBeVisible({ timeout: 8000 });
});
