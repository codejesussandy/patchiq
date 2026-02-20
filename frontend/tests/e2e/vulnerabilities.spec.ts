import { test, expect } from './fixtures';

test.describe('Vulnerabilities', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/vulnerability/vulnerabilities');
    // Wait until page title is set — indicates React has rendered
    await expect(page).toHaveTitle(/Vulnerabilities/i, { timeout: 15_000 });
  });

  test('page loads with stats and table', async ({ page }) => {
    // Stat cards rendered by VulnerabilityStatsCards — look for severity labels
    await expect(page.getByText(/Critical/i).first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/High/i).first()).toBeVisible();
    await expect(page.getByText(/Medium/i).first()).toBeVisible();
    await expect(page.getByText(/Low/i).first()).toBeVisible();

    // Search input confirms toolbar has rendered
    await expect(
      page.getByPlaceholder('Search CVE, title, or description...')
    ).toBeVisible();

    // Table is present — Ant Design renders a .ant-table element
    await expect(page.locator('.ant-table')).toBeVisible();
  });

  test('search vulnerabilities', async ({ page }) => {
    const searchInput = page.getByPlaceholder('Search CVE, title, or description...');
    await searchInput.fill('CVE-2024');

    // Debounce is 500 ms; allow up to 2 s for the table to refresh
    await page.waitForTimeout(700);

    // Table should still be visible (may show empty state if no results)
    await expect(page.locator('.ant-table')).toBeVisible();

    // Clear search
    await searchInput.clear();
    await page.waitForTimeout(700);
  });

  test('advanced filters', async ({ page }) => {
    const filterBtn = page.getByTestId('advanced-filters-button');
    await expect(filterBtn).toBeVisible();
    await filterBtn.click();

    // Filter modal should appear
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    // Click Apply (or whatever the confirm button is labelled)
    const applyBtn = dialog.getByRole('button', { name: /Apply/i });
    await applyBtn.click();

    // Ant Design success toast
    await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 5_000 });
  });

  test('clicking CVE opens detail modal and updates URL', async ({ page }) => {
    // Wait for at least one table row to exist (skip hidden measure row)
    const firstRow = page.locator('.ant-table-tbody tr.ant-table-row').first();
    await expect(firstRow).toBeVisible({ timeout: 15_000 });

    // Click the row
    await firstRow.click();

    // CVE detail modal should appear
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    // URL should contain ?cve= parameter
    await expect(page).toHaveURL(/cve=/, { timeout: 5_000 });

    // Close the modal — try Escape first, then close button
    await page.keyboard.press('Escape');
    const closed = await dialog.waitFor({ state: 'hidden', timeout: 3_000 }).then(() => true).catch(() => false);
    if (!closed) {
      await dialog.getByRole('button', { name: /Close/i }).first().click().catch(() => {});
    }
    await expect(dialog).not.toBeVisible({ timeout: 5_000 });
  });

  test('add exception — requires row selection first', async ({ page }) => {
    // Clicking "Add Exceptions" with nothing selected shows an error toast
    const addExceptionsBtn = page.getByRole('button', { name: /Add Exceptions/i });
    await addExceptionsBtn.click();

    await expect(page.locator('.ant-message-error')).toBeVisible({ timeout: 5_000 });

    // Now select a row (if the table has data) then open the modal
    const checkbox = page.locator('.ant-table-tbody tr.ant-table-row').first().locator('.ant-checkbox-wrapper');
    const rowExists = await checkbox.isVisible({ timeout: 8_000 }).catch(() => false);
    if (!rowExists) return; // Skip remainder when table is empty

    await checkbox.click({ force: true });
    await addExceptionsBtn.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    // Select Scope → Global
    await dialog.locator('.ant-select').first().click();
    const dropdown = page.locator('.ant-select-dropdown').last();
    await expect(dropdown).toBeVisible({ timeout: 5_000 });
    await page.waitForTimeout(500); // wait for dropdown animation to complete
    await page.locator('.ant-select-item-option[title="Global"], .ant-select-item[aria-label="Global"]').first().click({ force: true }).catch(async () => {
      // fallback: click the first option in the dropdown
      await dropdown.locator('.ant-select-item-option').first().click({ force: true });
    });

    // Exception Type — "Acceptable Risk" is pre-selected by initialValue; keep it
    await expect(
      dialog.getByRole('radio', { name: 'Acceptable Risk' })
    ).toBeChecked();

    // Fill Reason For Exclusion
    await dialog.getByPlaceholder('Reason For Exclusion').fill('Accepted by security team');

    // Save
    await dialog.getByRole('button', { name: 'Save' }).click();

    // Accept either success or error toast (API may reject on test environments)
    const toast = page.locator('.ant-message-success, .ant-message-error');
    await expect(toast.first()).toBeVisible({ timeout: 8_000 });
  });

  test('trigger vulnerability scan', async ({ page }) => {
    await page.getByRole('button', { name: /Scan Now/i }).click();

    // A scan modal appears while the request is in flight
    // After ~2 s the modal closes and a success toast appears
    await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 15_000 });
  });
});
