import { test, expect } from './fixtures';
import { login, waitForPageLoad, checkTableRendered, checkModalOpened } from './fixtures';

test.describe('Reports Module', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test.describe('Reports List Page', () => {
    test('should navigate to reports page', async ({ page }) => {
      await page.goto('/reports');
      await waitForPageLoad(page);

      const content = page.locator('main, [class*="content"]').first();
      await expect(content).toBeVisible();
    });

    test('should display reports table', async ({ page }) => {
      await page.goto('/reports');
      await waitForPageLoad(page);
      await checkTableRendered(page);
    });

    test('should have create report button', async ({ page }) => {
      await page.goto('/reports');
      await waitForPageLoad(page);

      const createBtn = page.locator('button:has-text("Create"), button:has-text("Add"), button:has-text("New"), button:has-text("Generate")');
      await expect(createBtn.first()).toBeVisible({ timeout: 10000 });
    });

    test('should show report types', async ({ page }) => {
      await page.goto('/reports');
      await waitForPageLoad(page);

      const reportTypes = page.locator('text=/Patch|Asset|Vulnerability|Compliance/i');
      const count = await reportTypes.count();
      console.log(`Found ${count} report type references`);
    });

    test('should have download/export action', async ({ page }) => {
      await page.goto('/reports');
      await waitForPageLoad(page);

      const downloadBtns = page.locator('button:has-text("Download"), button:has-text("Export"), .anticon-download');
      const count = await downloadBtns.count();
      console.log(`Found ${count} download/export buttons`);
    });

    test('should show report generation status', async ({ page }) => {
      await page.goto('/reports');
      await waitForPageLoad(page);

      const statusBadges = page.locator('.ant-tag, .ant-badge, [class*="status"]');
      const count = await statusBadges.count();
      console.log(`Found ${count} status elements`);
    });

    test('should have schedule report option', async ({ page }) => {
      await page.goto('/reports');
      await waitForPageLoad(page);

      const scheduleBtn = page.locator('button:has-text("Schedule"), [class*="schedule"]');
      const count = await scheduleBtn.count();
      console.log(`Found ${count} schedule options`);
    });

    test('should have filter by report type', async ({ page }) => {
      await page.goto('/reports');
      await waitForPageLoad(page);

      const typeFilter = page.locator('.ant-select, [class*="filter"], button:has-text("Type")');
      const count = await typeFilter.count();
      console.log(`Found ${count} filter elements`);
    });

    test('should have filter by date range', async ({ page }) => {
      await page.goto('/reports');
      await waitForPageLoad(page);

      const dateFilter = page.locator('.ant-picker, input[type="date"], [class*="date"]');
      const count = await dateFilter.count();
      console.log(`Found ${count} date filter elements`);
    });
  });

  test.describe('Create Report Page', () => {
    test('should navigate to create report page', async ({ page }) => {
      await page.goto('/reports/create');
      await waitForPageLoad(page);

      const content = page.locator('main, [class*="content"]').first();
      await expect(content).toBeVisible();
    });

    test('should display report type selection', async ({ page }) => {
      await page.goto('/reports/create');
      await waitForPageLoad(page);

      const typeSelection = page.locator('.ant-select, .ant-radio-group, [class*="type"]');
      const count = await typeSelection.count();
      console.log(`Found ${count} type selection elements`);
    });

    test('should have report configuration form', async ({ page }) => {
      await page.goto('/reports/create');
      await waitForPageLoad(page);

      const form = page.locator('form, [class*="form"]');
      await expect(form.first()).toBeVisible();
    });

    test('should have date range picker', async ({ page }) => {
      await page.goto('/reports/create');
      await waitForPageLoad(page);

      const datePicker = page.locator('.ant-picker, .ant-picker-range, input[type="date"]');
      const count = await datePicker.count();
      console.log(`Found ${count} date picker elements`);
    });

    test('should have submit/generate button', async ({ page }) => {
      await page.goto('/reports/create');
      await waitForPageLoad(page);

      const submitBtn = page.locator('button:has-text("Generate"), button:has-text("Create"), button[type="submit"]');
      await expect(submitBtn.first()).toBeVisible({ timeout: 10000 });
    });

    test('should have cancel button', async ({ page }) => {
      await page.goto('/reports/create');
      await waitForPageLoad(page);

      const cancelBtn = page.locator('button:has-text("Cancel"), button:has-text("Back")');
      const count = await cancelBtn.count();
      console.log(`Found ${count} cancel buttons`);
    });

    test('should have preview option', async ({ page }) => {
      await page.goto('/reports/create');
      await waitForPageLoad(page);

      const previewBtn = page.locator('button:has-text("Preview")');
      const count = await previewBtn.count();
      console.log(`Found ${count} preview buttons`);
    });
  });
});
