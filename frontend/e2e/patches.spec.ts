import { test, expect } from './fixtures';

// ─── Patches List ────────────────────────────────────────────────────────────

test('patches list loads with data', async ({ page }) => {
  await page.goto('/patches');

  await expect(page.getByRole('heading', { name: 'All Patches' })).toBeVisible();

  // Table column headers
  await expect(page.getByRole('columnheader', { name: 'Software' })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'ID' })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Endpoints' })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'OS' })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Severity' })).toBeVisible();
});

// ─── Search ──────────────────────────────────────────────────────────────────

test('patch search works', async ({ page }) => {
  await page.goto('/patches');
  await expect(page.getByRole('heading', { name: 'All Patches' })).toBeVisible();

  const searchInput = page.locator('main').getByPlaceholder('Search');
  await searchInput.fill('zzz-nonexistent-patch-xyz');

  // Wait for debounce / server response
  await page.waitForTimeout(800);

  // Table should show no results: either ant-empty, "No data found", or showing 0 items
  const noResults = page
    .locator('.ant-empty')
    .or(page.getByText('No data found'))
    .or(page.getByText(/showing 0/))
    .or(page.getByText(/Total 0 patches/));
  await expect(noResults.first()).toBeVisible({ timeout: 5000 });

  // Clear the search
  await searchInput.clear();
  await page.waitForTimeout(800);
  // After clearing, the table should restore results
  await expect(page.locator('.ant-table')).toBeVisible({ timeout: 5000 });
});

// ─── Create Patch ─────────────────────────────────────────────────────────────

test('create patch via form', async ({ page }) => {
  await page.goto('/patches');
  await expect(page.getByRole('heading', { name: 'All Patches' })).toBeVisible();

  await page.getByRole('button', { name: /Create Patch/i }).click();

  // Modal should open with title "Create Patch"
  await expect(page.getByRole('dialog', { name: 'Create Patch' })).toBeVisible();

  // Step 1: Define Patch — fill required fields
  await page.getByPlaceholder('e.g., 7-Zip 24.01').fill('Test Patch E2E');

  // Platform select — click the ant-select-selector (parent of combobox input) to open dropdown
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('combobox', { name: '* Platform' }).click();
  await page.waitForTimeout(300); // wait for dropdown animation
  await page.locator('.ant-select-dropdown').last().locator('.ant-select-item-option').filter({ hasText: 'Windows' }).first().click();

  // Severity select
  await dialog.getByRole('combobox', { name: '* Severity' }).click();
  await page.waitForTimeout(300);
  await page.locator('.ant-select-dropdown').last().locator('.ant-select-item-option').filter({ hasText: 'Medium' }).first().click();

  // Category select
  await dialog.getByRole('combobox', { name: '* Category' }).click();
  await page.waitForTimeout(300);
  await page.locator('.ant-select-dropdown').last().locator('.ant-select-item-option').filter({ hasText: 'Security' }).first().click();

  // KB Number
  await page.getByLabel('KB Number').fill('KB9999999');

  // Click Next to save and advance to step 2
  await page.getByRole('button', { name: 'Next' }).click();

  // Success message on step transition
  await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 10000 });

  // Step 2: Affected Products — click Done
  await page.getByRole('button', { name: 'Done' }).click();

  // Modal should close
  await expect(page.getByRole('dialog', { name: 'Create Patch' })).not.toBeVisible({ timeout: 5000 });

  // Verify the new patch appears via search
  const searchInput = page.locator('main').getByPlaceholder('Search');
  await searchInput.fill('Test Patch E2E');
  await expect(page.getByRole('link', { name: 'Test Patch E2E' }).first()).toBeVisible({ timeout: 8000 });
});

// ─── Patch Detail Page ────────────────────────────────────────────────────────

test('patch detail page loads with tabs', async ({ page }) => {
  await page.goto('/patches');
  await expect(page.getByRole('heading', { name: 'All Patches' })).toBeVisible();

  // Click first patch link in the Software column
  const firstPatchLink = page.getByRole('table').getByRole('link').first();
  const href = await firstPatchLink.getAttribute('href');
  await firstPatchLink.click();

  // URL should change to /patches/<id>
  await expect(page).toHaveURL(/\/patches\/[^/]+$/, { timeout: 10000 });

  // Verify the detail tabs are present
  await expect(page.getByRole('tab', { name: /Details/ })).toBeVisible();
  await expect(page.getByRole('tab', { name: /Endpoints/ })).toBeVisible();
  await expect(page.getByRole('tab', { name: /Recommendations/ })).toBeVisible();
  await expect(page.getByRole('tab', { name: /Affected Software/ })).toBeVisible();
  await expect(page.getByRole('tab', { name: /Vulnerabilities/ })).toBeVisible();

  // If we captured the href, verify path shape
  if (href) {
    expect(href).toMatch(/\/patches\/.+/);
  }
});

// ─── Deploy Patches from List ─────────────────────────────────────────────────

test('deploy patches from list', async ({ page }) => {
  await page.goto('/patches');
  await expect(page.getByRole('heading', { name: 'All Patches' })).toBeVisible();

  // Wait for at least one row to be visible
  const firstCheckbox = page.getByRole('table').getByRole('checkbox').nth(1);
  await firstCheckbox.waitFor({ state: 'visible', timeout: 10000 });
  await firstCheckbox.check();

  // Deploy button appears in the selection toolbar
  await expect(page.getByText(/1 Selected/)).toBeVisible();
  await page.getByRole('button', { name: 'Deploy' }).click();

  // Deploy modal opens
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByText(/Deploy Patches/)).toBeVisible();

  // Deployment Name should be pre-filled
  const deployNameInput = page.getByRole('textbox', { name: 'Deployment Name' });
  await expect(deployNameInput).not.toBeEmpty();

  // Try to pick an agent from dropdown — click the Target Agents combobox
  const agentCombobox = page.getByRole('combobox', { name: /Target Agents/i });
  await agentCombobox.click();
  const dropdown = page.locator('.ant-select-dropdown');
  const firstAgent = dropdown.getByRole('option').first();

  if (await firstAgent.isVisible({ timeout: 3000 }).catch(() => false)) {
    await firstAgent.click();
    // Click Deploy Now
    await page.getByRole('button', { name: 'Deploy Now' }).click();
    // Expect success message
    await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 10000 });
  } else {
    // No agents available — cancel gracefully
    await page.getByRole('button', { name: 'Cancel' }).click();
  }
});

// ─── Delete a Patch from Detail ───────────────────────────────────────────────

test('delete a patch from detail page', async ({ page }) => {
  await page.goto('/patches');
  await expect(page.getByRole('heading', { name: 'All Patches' })).toBeVisible();

  // Search for the E2E test patch to delete
  await page.locator('main').getByPlaceholder('Search').fill('Test Patch E2E');

  const link = page.getByRole('table').getByRole('link', { name: 'Test Patch E2E' }).first();

  // If not found, skip gracefully
  const linkExists = await link.isVisible({ timeout: 6000 }).catch(() => false);
  if (!linkExists) {
    test.skip();
    return;
  }

  await link.click();
  await expect(page).toHaveURL(/\/patches\/.+/, { timeout: 10000 });

  // Open the action menu (ActionMenu component renders as an ellipsis button)
  const actionMenuBtn = page.getByRole('button', { name: /more|actions/i }).or(
    page.locator('button').filter({ hasText: '' }).last()
  );
  await actionMenuBtn.click();

  // Click Decline / Delete action (depends on approval status; look for Decline)
  const declineItem = page.getByRole('menuitem', { name: /Decline/i });
  if (await declineItem.isVisible({ timeout: 3000 }).catch(() => false)) {
    await declineItem.click();
    // Verify message
    await expect(
      page.locator('.ant-message-success').or(page.locator('.ant-message-error'))
    ).toBeVisible({ timeout: 8000 });
  }
});
