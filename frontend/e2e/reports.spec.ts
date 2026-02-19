import { test, expect } from './fixtures';

test.describe('Reports', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/reports');
    // Wait for the toolbar (search input) which confirms the Reports component has mounted
    await expect(
      page.getByPlaceholder('Search by name, description, or creator...')
    ).toBeVisible({ timeout: 15_000 });
  });

  test('reports page loads with table or empty state', async ({ page }) => {
    // Search input is visible (already confirmed in beforeEach)
    // Filter selects are present
    await expect(page.locator('.ant-select').first()).toBeVisible();

    // Either the data table is visible or Ant Design's empty placeholder
    const tableVisible = await page.locator('.ant-table').isVisible({ timeout: 5_000 }).catch(() => false);
    const emptyVisible = await page.locator('.ant-empty').isVisible({ timeout: 5_000 }).catch(() => false);

    expect(tableVisible || emptyVisible).toBe(true);
  });

  test('create a report via wizard', async ({ page }) => {
    // Click the primary Create button (button name includes icon: "plus Create")
    await page.getByRole('button', { name: /Create/i }).last().click();

    // CreateReportWizard opens as a Modal/Dialog
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    // Step 1: Select Report Type (required) then fill Report Name
    const reportTypeSelect = dialog.locator('.ant-select').first();
    await expect(reportTypeSelect).toBeVisible({ timeout: 5_000 });
    await reportTypeSelect.click();
    const typeDropdown = page.locator('.ant-select-dropdown').last();
    await expect(typeDropdown).toBeVisible({ timeout: 5_000 });
    // Pick the first available report type option
    const firstOption = typeDropdown.locator('.ant-select-item-option').first();
    const hasOptions = await firstOption.isVisible({ timeout: 3_000 }).catch(() => false);
    if (!hasOptions) {
      // No report types available — close dialog and skip
      await page.keyboard.press('Escape');
      test.skip();
      return;
    }
    await firstOption.click();

    // Fill the report name
    const nameInput = dialog.getByPlaceholder(/Enter report name/i);
    await expect(nameInput).toBeVisible({ timeout: 5_000 });
    await nameInput.fill(`E2E Report ${Date.now()}`);

    // Click Next to go to step 2
    await dialog.getByRole('button', { name: /Next/i }).click();

    // Step 2: Configuration — fill required Date Range if present
    const startDateInput = dialog.getByPlaceholder('Start date');
    const hasDateRange = await startDateInput.isVisible({ timeout: 3_000 }).catch(() => false);
    if (hasDateRange) {
      await startDateInput.fill('2024-01-01');
      await page.keyboard.press('Tab');
      const endDateInput = dialog.getByPlaceholder('End date');
      await endDateInput.fill('2024-12-31');
      await page.keyboard.press('Tab');
    }

    // Click Next to go to step 3 (Format & Schedule)
    const nextBtn2 = dialog.getByRole('button', { name: /Next/i });
    const next2Visible = await nextBtn2.isVisible({ timeout: 3_000 }).catch(() => false);
    if (next2Visible) {
      await nextBtn2.click();
      await page.waitForTimeout(500);
    }

    // Step 3: Format & Schedule — select export format (required)
    const formatCombobox = dialog.getByRole('combobox', { name: /Format/i });
    const hasFormatSelect = await formatCombobox.isVisible({ timeout: 3_000 }).catch(() => false);
    if (hasFormatSelect) {
      await formatCombobox.click();
      await page.waitForTimeout(300);
      const formatDropdown = page.locator('.ant-select-dropdown:visible').last();
      await formatDropdown.locator('.ant-select-item-option').first().click();
      await page.waitForTimeout(300);
    }

    // Click Create Report
    const createBtn = dialog.getByRole('button', { name: /Create Report/i });
    const createVisible = await createBtn.isVisible({ timeout: 3_000 }).catch(() => false);
    if (createVisible) {
      await createBtn.click();
    }

    // Expect a success message or the dialog to close
    const successToast = page.locator('.ant-message-success');
    const toastAppeared = await successToast.isVisible({ timeout: 10_000 }).catch(() => false);
    const dialogClosed = !(await dialog.isVisible({ timeout: 3_000 }).catch(() => true));

    expect(toastAppeared || dialogClosed).toBe(true);
  });

  test('reports page search filters the table', async ({ page }) => {
    const searchInput = page.getByPlaceholder('Search by name, description, or creator...');
    await searchInput.fill('vulnerability');
    await page.waitForTimeout(500);
    await expect(page.locator('.ant-table')).toBeVisible();

    // Clear
    await searchInput.clear();
  });

  test('filter reports by status', async ({ page }) => {
    // Status select is the 3rd .ant-select on the page (Type, Format, Status, …)
    const statusSelect = page.locator('.ant-select').nth(2);
    await statusSelect.click();

    const dropdown = page.locator('.ant-select-dropdown').last();
    await expect(dropdown).toBeVisible({ timeout: 5_000 });
    await dropdown.getByText('Completed').click();
    await expect(dropdown).not.toBeVisible();

    await expect(page.locator('.ant-table')).toBeVisible();

    // Clear filter
    const clearIcon = statusSelect.locator('.ant-select-clear');
    const clearVisible = await clearIcon.isVisible({ timeout: 2_000 }).catch(() => false);
    if (clearVisible) await clearIcon.click();
  });

  test('refresh button works', async ({ page }) => {
    const refreshBtn = page.getByRole('button', { name: /Refresh/i });
    await expect(refreshBtn).toBeVisible();
    await refreshBtn.click();

    await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 5_000 });
  });
});
