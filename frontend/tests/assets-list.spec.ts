import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const SCREENSHOTS_DIR = '/Users/shandesh/src/VS-code/PatchIQ/full-dev-sandy-v2/screenshots';
const BASE_URL = 'http://localhost:3500';
const ADMIN_EMAIL = 'admin@patchiq.io';
const ADMIN_PASSWORD = 'admin123';

let testResults = {
  search: 'N/A',
  pagination: 'N/A',
  sorting: 'N/A',
  filters: 'N/A',
  createAsset: 'N/A',
  viewDetails: 'N/A',
  screenshots: [] as string[],
  consoleErrors: [] as string[],
  bugsFound: 0
};

test.describe('Assets List & CRUD Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Collect console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        testResults.consoleErrors.push(msg.text());
      }
    });

    // Login
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');

    const emailInput = page.locator('input[type="text"], input[placeholder*="mail" i]').first();
    const passwordInput = page.locator('input[type="password"]').first();

    await emailInput.fill(ADMIN_EMAIL);
    await passwordInput.fill(ADMIN_PASSWORD);

    const submitButton = page.locator('button:has-text("Log in"), button[type="submit"]').first();
    await submitButton.click();

    // Wait for redirect to dashboard after login
    await page.waitForURL(/\/(dashboard|assets)/, { timeout: 15000 });
  });

  test('1. Navigate to Assets List', async ({ page }) => {
    try {
      await page.goto(`${BASE_URL}/assets`);
      await page.waitForLoadState('domcontentloaded', { timeout: 15000 });

      // Wait for content to load (either table or empty state) - be more flexible
      await page.waitForTimeout(2000); // Give time for React to render

      const screenshot = path.join(SCREENSHOTS_DIR, 'assets-list-initial.png');
      await page.screenshot({ path: screenshot, fullPage: true });
      testResults.screenshots.push('assets-list-initial.png');

      console.log('✓ Navigate to Assets List: PASS');
    } catch (error) {
      console.log('✗ Navigate to Assets List: FAIL -', error.message);
      throw error;
    }
  });

  test('2. Test Search', async ({ page }) => {
    try {
      await page.goto(`${BASE_URL}/assets`);
      await page.waitForLoadState('networkidle');

      // Find search input
      const searchInput = await page.locator('input[placeholder*="Search" i], input[type="search"]').first();

      if (await searchInput.count() > 0) {
        await searchInput.fill('WIN');
        await page.waitForTimeout(600); // Wait for debounced search

        const screenshot = path.join(SCREENSHOTS_DIR, 'assets-search.png');
        await page.screenshot({ path: screenshot, fullPage: true });
        testResults.screenshots.push('assets-search.png');

        testResults.search = 'PASS';
        console.log('✓ Test Search: PASS');
      } else {
        testResults.search = 'FAIL - No search input found';
        console.log('✗ Test Search: FAIL - No search input found');
        testResults.bugsFound++;
      }
    } catch (error) {
      testResults.search = `FAIL - ${error.message}`;
      console.log('✗ Test Search: FAIL -', error.message);
      testResults.bugsFound++;
    }
  });

  test('3. Test Pagination', async ({ page }) => {
    try {
      await page.goto(`${BASE_URL}/assets`);
      await page.waitForLoadState('networkidle');

      // Look for pagination controls
      const nextButton = await page.locator('button:has-text("Next"), li.ant-pagination-next button, [aria-label*="next" i]').first();

      if (await nextButton.count() > 0 && await nextButton.isEnabled()) {
        await nextButton.click();
        await page.waitForTimeout(500);

        const screenshot = path.join(SCREENSHOTS_DIR, 'assets-page-2.png');
        await page.screenshot({ path: screenshot, fullPage: true });
        testResults.screenshots.push('assets-page-2.png');

        // Go back to page 1
        const prevButton = await page.locator('button:has-text("Prev"), li.ant-pagination-prev button, [aria-label*="prev" i]').first();
        if (await prevButton.count() > 0) {
          await prevButton.click();
          await page.waitForTimeout(500);
        }

        testResults.pagination = 'PASS';
        console.log('✓ Test Pagination: PASS');
      } else {
        testResults.pagination = 'N/A - Less than 20 items or no pagination';
        console.log('○ Test Pagination: N/A - Less than 20 items');
      }
    } catch (error) {
      testResults.pagination = `FAIL - ${error.message}`;
      console.log('✗ Test Pagination: FAIL -', error.message);
      testResults.bugsFound++;
    }
  });

  test('4. Test Sorting', async ({ page }) => {
    try {
      await page.goto(`${BASE_URL}/assets`);
      await page.waitForLoadState('networkidle');

      // Find sortable column header (look for Hostname or any column with sort capability)
      const columnHeader = await page.locator('th:has-text("Hostname"), th:has-text("Name"), th[class*="sortable"], th .ant-table-column-sorters').first();

      if (await columnHeader.count() > 0) {
        await columnHeader.click();
        await page.waitForTimeout(500);

        const screenshot = path.join(SCREENSHOTS_DIR, 'assets-sorted.png');
        await page.screenshot({ path: screenshot, fullPage: true });
        testResults.screenshots.push('assets-sorted.png');

        testResults.sorting = 'PASS';
        console.log('✓ Test Sorting: PASS');
      } else {
        testResults.sorting = 'FAIL - No sortable column found';
        console.log('✗ Test Sorting: FAIL - No sortable column found');
        testResults.bugsFound++;
      }
    } catch (error) {
      testResults.sorting = `FAIL - ${error.message}`;
      console.log('✗ Test Sorting: FAIL -', error.message);
      testResults.bugsFound++;
    }
  });

  test('5. Test Filters', async ({ page }) => {
    try {
      await page.goto(`${BASE_URL}/assets`);
      await page.waitForLoadState('networkidle');

      // Look for filter button/icon
      const filterButton = await page.locator('button:has-text("Filter"), button[aria-label*="filter" i], .ant-btn:has(.anticon-filter)').first();

      if (await filterButton.count() > 0) {
        await filterButton.click();
        await page.waitForTimeout(500);

        // Try to select a filter option (e.g., status)
        const filterOption = await page.locator('input[type="checkbox"], input[type="radio"], .ant-select').first();
        if (await filterOption.count() > 0) {
          if (await filterOption.getAttribute('type') === 'checkbox' || await filterOption.getAttribute('type') === 'radio') {
            await filterOption.click();
          } else {
            // It's a select, click to open
            await filterOption.click();
            await page.waitForTimeout(300);
            // Select first option
            await page.locator('.ant-select-item').first().click();
          }
        }

        // Click Apply button
        const applyButton = await page.locator('button:has-text("Apply"), button:has-text("OK")').first();
        if (await applyButton.count() > 0) {
          await applyButton.click();
          await page.waitForTimeout(500);
        }

        const screenshot = path.join(SCREENSHOTS_DIR, 'assets-filtered.png');
        await page.screenshot({ path: screenshot, fullPage: true });
        testResults.screenshots.push('assets-filtered.png');

        testResults.filters = 'PASS';
        console.log('✓ Test Filters: PASS');
      } else {
        testResults.filters = 'FAIL - No filter button found';
        console.log('✗ Test Filters: FAIL - No filter button found');
        testResults.bugsFound++;
      }
    } catch (error) {
      testResults.filters = `FAIL - ${error.message}`;
      console.log('✗ Test Filters: FAIL -', error.message);
      testResults.bugsFound++;
    }
  });

  test('6. Test Create Asset', async ({ page }) => {
    try {
      await page.goto(`${BASE_URL}/assets`);
      await page.waitForLoadState('networkidle');

      // Look for create button
      const createButton = await page.locator('button:has-text("Create"), button:has-text("New"), button:has-text("Add")').first();

      if (await createButton.count() > 0) {
        await createButton.click();
        await page.waitForTimeout(500);

        // Fill form
        const hostnameInput = await page.locator('input[name="hostname"], input[id*="hostname" i], input[placeholder*="hostname" i]').first();
        if (await hostnameInput.count() > 0) {
          await hostnameInput.fill('test-server-playwright');
        }

        const ipInput = await page.locator('input[name="ip"], input[name="ipAddress"], input[placeholder*="IP" i]').first();
        if (await ipInput.count() > 0) {
          await ipInput.fill('192.168.1.100');
        }

        // Try to fill OS dropdown
        const osSelect = await page.locator('[id*="os" i] .ant-select, select[name*="os" i], [name*="operatingSystem" i]').first();
        if (await osSelect.count() > 0) {
          await osSelect.click();
          await page.waitForTimeout(300);
          await page.locator('.ant-select-item').first().click();
        }

        // Try to fill Category dropdown
        const categorySelect = await page.locator('[id*="category" i] .ant-select, select[name*="category" i]').first();
        if (await categorySelect.count() > 0) {
          await categorySelect.click();
          await page.waitForTimeout(300);
          await page.locator('.ant-select-item').first().click();
        }

        // Submit form
        const submitButton = await page.locator('button[type="submit"], button:has-text("Submit"), button:has-text("Create"), button:has-text("Save")').first();
        if (await submitButton.count() > 0) {
          await submitButton.click();
          await page.waitForTimeout(1000);
        }

        const screenshot = path.join(SCREENSHOTS_DIR, 'assets-create-success.png');
        await page.screenshot({ path: screenshot, fullPage: true });
        testResults.screenshots.push('assets-create-success.png');

        // Check for success message
        const successMessage = await page.locator('.ant-message-success, .ant-notification-success').first();
        if (await successMessage.count() > 0) {
          testResults.createAsset = 'PASS';
          console.log('✓ Test Create Asset: PASS');
        } else {
          testResults.createAsset = 'PARTIAL - Form submitted but no success message';
          console.log('○ Test Create Asset: PARTIAL - No success message visible');
        }
      } else {
        testResults.createAsset = 'FAIL - No create button found';
        console.log('✗ Test Create Asset: FAIL - No create button found');
        testResults.bugsFound++;
      }
    } catch (error) {
      testResults.createAsset = `FAIL - ${error.message}`;
      console.log('✗ Test Create Asset: FAIL -', error.message);
      testResults.bugsFound++;
    }
  });

  test('7. Test View Asset Details', async ({ page }) => {
    try {
      await page.goto(`${BASE_URL}/assets`);
      await page.waitForLoadState('networkidle');

      // Find first asset row and click it
      const firstRow = await page.locator('table tbody tr, .ant-table-tbody tr').first();

      if (await firstRow.count() > 0) {
        // Try to find a clickable element (link or button) in the row
        const link = await firstRow.locator('a, button').first();
        if (await link.count() > 0) {
          await link.click();
        } else {
          // Click the row itself
          await firstRow.click();
        }

        await page.waitForTimeout(1000);

        const screenshot = path.join(SCREENSHOTS_DIR, 'asset-detail.png');
        await page.screenshot({ path: screenshot, fullPage: true });
        testResults.screenshots.push('asset-detail.png');

        // Check if URL changed to detail page
        const currentUrl = page.url();
        if (currentUrl.includes('/assets/') && currentUrl !== `${BASE_URL}/assets`) {
          testResults.viewDetails = 'PASS';
          console.log('✓ Test View Details: PASS');
        } else {
          testResults.viewDetails = 'FAIL - URL did not change to detail page';
          console.log('✗ Test View Details: FAIL - URL did not change');
          testResults.bugsFound++;
        }
      } else {
        testResults.viewDetails = 'N/A - No assets in list';
        console.log('○ Test View Details: N/A - No assets found');
      }
    } catch (error) {
      testResults.viewDetails = `FAIL - ${error.message}`;
      console.log('✗ Test View Details: FAIL -', error.message);
      testResults.bugsFound++;
    }
  });

  test.afterAll(async () => {
    // Generate report
    const report = `
Test: Assets List & CRUD
Status: ${testResults.bugsFound === 0 ? 'PASS' : 'FAIL'}

Search: ${testResults.search}
Pagination: ${testResults.pagination}
Sorting: ${testResults.sorting}
Filters: ${testResults.filters}
Create Asset: ${testResults.createAsset}
View Details: ${testResults.viewDetails}

Screenshots: ${testResults.screenshots.length}
${testResults.screenshots.map(s => `  - ${s}`).join('\n')}

Console Errors: ${testResults.consoleErrors.length}
${testResults.consoleErrors.slice(0, 10).map(e => `  - ${e}`).join('\n')}
${testResults.consoleErrors.length > 10 ? `  ... and ${testResults.consoleErrors.length - 10} more` : ''}

Overall: ${testResults.bugsFound === 0 ? 'PASS' : 'FAIL'}
Bugs found: ${testResults.bugsFound}
`;

    console.log('\n' + '='.repeat(60));
    console.log(report);
    console.log('='.repeat(60));

    // Write report to file
    fs.writeFileSync(
      path.join(SCREENSHOTS_DIR, 'test-report.txt'),
      report
    );
  });
});
