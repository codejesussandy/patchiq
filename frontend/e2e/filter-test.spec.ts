import { test, expect } from '@playwright/test';

test.use({ storageState: './auth.json' });

test.describe('Filter functionality', () => {
  test('Assets page - OS sidebar filter works', async ({ page }) => {
    await page.goto('/assets');
    await page.waitForSelector('table', { timeout: 10000 });

    const initialRows = await page.locator('table tbody tr').count();
    console.log(`Initial asset rows: ${initialRows}`);

    await page.locator('span:text-is("Windows")').first().click();
    await page.waitForTimeout(1500);

    expect(page.url()).toContain('os=Windows');
    await expect(page.locator('h3')).toContainText('Windows Assets');

    const filteredRows = await page.locator('table tbody tr').count();
    console.log(`Windows filtered rows: ${filteredRows}`);
    expect(filteredRows).toBeLessThanOrEqual(initialRows);
    console.log('Assets OS sidebar filter: PASS');
  });

  test('Assets page - Filter modal apply and clear works', async ({ page }) => {
    await page.goto('/assets');
    await page.waitForSelector('table', { timeout: 10000 });

    // Open filter modal
    await page.locator('button:has-text("Filter")').first().click();
    await page.waitForSelector('.ant-modal-body', { timeout: 5000 });

    // Click the 2nd .ant-select in the modal (Status field)
    const statusSelect = page.locator('.ant-modal-body .ant-select').nth(1);
    await statusSelect.click();
    await page.waitForTimeout(500);

    // Select "In Use"
    await page.locator('.ant-select-item-option[title="In Use"]').click({ force: true });
    await page.waitForTimeout(300);

    // Close dropdown by clicking modal title
    await page.locator('.ant-modal-header').click();
    await page.waitForTimeout(500);

    // Apply
    await page.locator('button:has-text("Apply Filters")').click();
    await page.waitForTimeout(1500);

    // Modal should close
    await expect(page.locator('.ant-modal-body')).not.toBeVisible({ timeout: 5000 });

    // Filter button should show count
    const filterBtn = page.locator('button:has-text("Filter")').first();
    await expect(filterBtn).toContainText('Filter (1)');

    // Clear filters
    await page.locator('button:has-text("Clear filters")').click();
    await page.waitForTimeout(1000);
    await expect(filterBtn).not.toContainText('(1)');
    console.log('Assets filter modal apply/clear: PASS');
  });

  test('Patches page - OS sidebar filter works', async ({ page }) => {
    await page.goto('/patches');
    await page.waitForSelector('table', { timeout: 10000 });

    const initialRows = await page.locator('table tbody tr').count();
    console.log(`Initial patch rows: ${initialRows}`);

    await page.locator('span:text-is("Windows")').first().click();
    await page.waitForTimeout(1500);

    expect(page.url()).toContain('os=Windows');
    await expect(page.locator('h3')).toContainText('Windows Patches');

    const filteredRows = await page.locator('table tbody tr').count();
    console.log(`Windows filtered rows: ${filteredRows}`);
    expect(filteredRows).toBeLessThanOrEqual(initialRows);
    console.log('Patches OS sidebar filter: PASS');
  });

  test('Patches page - Filter modal apply and clear works', async ({ page }) => {
    await page.goto('/patches');
    await page.waitForSelector('table', { timeout: 10000 });

    const initialRows = await page.locator('table tbody tr').count();
    console.log(`Initial patch rows: ${initialRows}`);

    // Open filter modal
    await page.locator('button:has-text("Filter")').first().click();
    await page.waitForSelector('.ant-modal-body', { timeout: 5000 });

    // Click the 1st select (Severity - multi mode)
    await page.locator('.ant-modal-body .ant-select').nth(0).click();
    await page.waitForTimeout(500);

    // Select Critical
    await page.locator('.ant-select-item-option[title="Critical"]').click({ force: true });
    await page.waitForTimeout(300);

    // Close dropdown
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    // Apply
    await page.locator('button:has-text("Apply Filters")').click();
    await page.waitForTimeout(1500);

    await expect(page.locator('.ant-modal-body')).not.toBeVisible({ timeout: 5000 });

    const filterBtn = page.locator('button:has-text("Filter")').first();
    await expect(filterBtn).toContainText('Filter (1)');

    const filteredRows = await page.locator('table tbody tr').count();
    console.log(`Filtered patch rows (Critical): ${filteredRows}`);
    expect(filteredRows).toBeLessThanOrEqual(initialRows);

    // Clear
    await page.locator('button:has-text("Clear filters")').click();
    await page.waitForTimeout(1000);
    await expect(filterBtn).not.toContainText('(1)');
    console.log('Patches filter modal apply/clear: PASS');
  });
});
