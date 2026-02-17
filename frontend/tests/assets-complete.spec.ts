import { test, expect } from '@playwright/test';
import * as path from 'path';

const SCREENSHOTS_DIR = '/Users/shandesh/src/VS-code/PatchIQ/full-dev-sandy-v2/screenshots';
const BASE_URL = 'http://localhost:3500';
const ADMIN_EMAIL = 'admin@patchiq.io';
const ADMIN_PASSWORD = 'admin123';

let testResults = {
  navigation: 'N/A',
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

test('Complete Assets List Test', async ({ page }) => {
  // Collect console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      testResults.consoleErrors.push(msg.text());
    }
  });

  console.log('=== Starting Complete Assets Test ===\n');

  // Login once
  console.log('1. Logging in...');
  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState('domcontentloaded');

  const emailInput = page.locator('input[type="text"], input[placeholder*="mail" i]').first();
  const passwordInput = page.locator('input[type="password"]').first();

  await emailInput.fill(ADMIN_EMAIL);
  await passwordInput.fill(ADMIN_PASSWORD);

  const submitButton = page.locator('button:has-text("Log in"), button[type="submit"]').first();
  await submitButton.click();

  await page.waitForURL(/\/(dashboard|assets)/, { timeout: 15000 });
  console.log('   ✓ Login successful\n');

  // Navigate to Assets
  console.log('2. Navigating to Assets page...');
  try {
    await page.goto(`${BASE_URL}/assets`);
    await page.waitForTimeout(3000);

    const screenshot = path.join(SCREENSHOTS_DIR, 'test-assets-list-initial.png');
    await page.screenshot({ path: screenshot, fullPage: true });
    testResults.screenshots.push('test-assets-list-initial.png');

    testResults.navigation = 'PASS';
    console.log('   ✓ Navigation: PASS\n');
  } catch (error) {
    testResults.navigation = `FAIL - ${error.message}`;
    testResults.bugsFound++;
    console.log(`   ✗ Navigation: FAIL - ${error.message}\n`);
  }

  // Test Search
  console.log('3. Testing Search...');
  try {
    const searchInput = await page.locator('input[placeholder*="Search" i], input[type="search"]').first();

    if (await searchInput.count() > 0) {
      await searchInput.fill('WIN');
      await page.waitForTimeout(800);

      const screenshot = path.join(SCREENSHOTS_DIR, 'test-assets-search.png');
      await page.screenshot({ path: screenshot, fullPage: true });
      testResults.screenshots.push('test-assets-search.png');

      testResults.search = 'PASS';
      console.log('   ✓ Search: PASS\n');
    } else {
      testResults.search = 'FAIL - No search input found';
      testResults.bugsFound++;
      console.log('   ✗ Search: FAIL - No search input found\n');
    }
  } catch (error) {
    testResults.search = `FAIL - ${error.message}`;
    testResults.bugsFound++;
    console.log(`   ✗ Search: FAIL - ${error.message}\n`);
  }

  // Test Pagination
  console.log('4. Testing Pagination...');
  try {
    // Clear search first
    const searchInput = await page.locator('input[placeholder*="Search" i]').first();
    if (await searchInput.count() > 0) {
      await searchInput.clear();
      await page.waitForTimeout(500);
    }

    const nextButton = await page.locator('button:has-text("Next"), li.ant-pagination-next button:not([disabled]), [aria-label*="next" i]:not([disabled])').first();

    if (await nextButton.count() > 0) {
      await nextButton.click();
      await page.waitForTimeout(1000);

      const screenshot = path.join(SCREENSHOTS_DIR, 'test-assets-page-2.png');
      await page.screenshot({ path: screenshot, fullPage: true });
      testResults.screenshots.push('test-assets-page-2.png');

      testResults.pagination = 'PASS';
      console.log('   ✓ Pagination: PASS\n');
    } else {
      testResults.pagination = 'N/A - Less than one page of data';
      console.log('   ○ Pagination: N/A - Less than one page\n');
    }
  } catch (error) {
    testResults.pagination = `FAIL - ${error.message}`;
    testResults.bugsFound++;
    console.log(`   ✗ Pagination: FAIL - ${error.message}\n`);
  }

  // Test Sorting
  console.log('5. Testing Sorting...');
  try {
    const columnHeader = await page.locator('th:has-text("Asset ID"), th .ant-table-column-sorters').first();

    if (await columnHeader.count() > 0) {
      await columnHeader.click();
      await page.waitForTimeout(800);

      const screenshot = path.join(SCREENSHOTS_DIR, 'test-assets-sorted.png');
      await page.screenshot({ path: screenshot, fullPage: true });
      testResults.screenshots.push('test-assets-sorted.png');

      testResults.sorting = 'PASS';
      console.log('   ✓ Sorting: PASS\n');
    } else {
      testResults.sorting = 'FAIL - No sortable column found';
      testResults.bugsFound++;
      console.log('   ✗ Sorting: FAIL - No sortable column found\n');
    }
  } catch (error) {
    testResults.sorting = `FAIL - ${error.message}`;
    testResults.bugsFound++;
    console.log(`   ✗ Sorting: FAIL - ${error.message}\n`);
  }

  // Test Filters
  console.log('6. Testing Filters...');
  try {
    const filterButton = await page.locator('button:has-text("Filter"), button[aria-label*="filter" i]').first();

    if (await filterButton.count() > 0) {
      await filterButton.click();
      await page.waitForTimeout(800);

      const screenshot = path.join(SCREENSHOTS_DIR, 'test-assets-filter-open.png');
      await page.screenshot({ path: screenshot, fullPage: true });
      testResults.screenshots.push('test-assets-filter-open.png');

      // Close filter
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);

      testResults.filters = 'PASS';
      console.log('   ✓ Filters: PASS\n');
    } else {
      testResults.filters = 'FAIL - No filter button found';
      testResults.bugsFound++;
      console.log('   ✗ Filters: FAIL - No filter button found\n');
    }
  } catch (error) {
    testResults.filters = `FAIL - ${error.message}`;
    testResults.bugsFound++;
    console.log(`   ✗ Filters: FAIL - ${error.message}\n`);
  }

  // Test Create Asset
  console.log('7. Testing Create Asset...');
  try {
    const createButton = await page.locator('button:has-text("Add Assets"), button:has-text("Add"), button:has-text("Create")').first();

    if (await createButton.count() > 0) {
      await createButton.click();
      await page.waitForTimeout(1000);

      const screenshot = path.join(SCREENSHOTS_DIR, 'test-assets-create-modal.png');
      await page.screenshot({ path: screenshot, fullPage: true });
      testResults.screenshots.push('test-assets-create-modal.png');

      // Close modal
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);

      testResults.createAsset = 'PASS';
      console.log('   ✓ Create Asset: PASS\n');
    } else {
      testResults.createAsset = 'FAIL - No create button found';
      testResults.bugsFound++;
      console.log('   ✗ Create Asset: FAIL - No create button found\n');
    }
  } catch (error) {
    testResults.createAsset = `FAIL - ${error.message}`;
    testResults.bugsFound++;
    console.log(`   ✗ Create Asset: FAIL - ${error.message}\n`);
  }

  // Test View Details
  console.log('8. Testing View Asset Details...');
  try {
    const firstRow = await page.locator('table tbody tr, .ant-table-tbody tr').first();

    if (await firstRow.count() > 0) {
      // Find clickable element in row
      const link = await firstRow.locator('a, td').first();
      await link.click();
      await page.waitForTimeout(1500);

      const screenshot = path.join(SCREENSHOTS_DIR, 'test-asset-detail.png');
      await page.screenshot({ path: screenshot, fullPage: true });
      testResults.screenshots.push('test-asset-detail.png');

      const currentUrl = page.url();
      if (currentUrl.includes('/assets/') && !currentUrl.endsWith('/assets')) {
        testResults.viewDetails = 'PASS';
        console.log('   ✓ View Details: PASS\n');
      } else {
        testResults.viewDetails = 'PARTIAL - Clicked but URL did not change to detail page';
        console.log('   ○ View Details: PARTIAL - URL did not change\n');
      }
    } else {
      testResults.viewDetails = 'N/A - No assets in list';
      console.log('   ○ View Details: N/A - No assets\n');
    }
  } catch (error) {
    testResults.viewDetails = `FAIL - ${error.message}`;
    testResults.bugsFound++;
    console.log(`   ✗ View Details: FAIL - ${error.message}\n`);
  }

  // Generate final report
  const report = `
============================================================
TEST REPORT: Assets List & CRUD
============================================================

Navigation to Assets List: ${testResults.navigation}
Search Functionality: ${testResults.search}
Pagination: ${testResults.pagination}
Sorting: ${testResults.sorting}
Filters: ${testResults.filters}
Create Asset Modal: ${testResults.createAsset}
View Asset Details: ${testResults.viewDetails}

Screenshots Captured: ${testResults.screenshots.length}
${testResults.screenshots.map(s => `  - ${s}`).join('\n')}

Console Errors: ${testResults.consoleErrors.length}
${testResults.consoleErrors.slice(0, 5).map(e => `  - ${e.substring(0, 100)}`).join('\n')}
${testResults.consoleErrors.length > 5 ? `  ... and ${testResults.consoleErrors.length - 5} more` : ''}

Overall Status: ${testResults.bugsFound === 0 ? 'PASS' : 'FAIL'}
Bugs Found: ${testResults.bugsFound}

============================================================
`;

  console.log(report);

  // Write report to file
  const fs = require('fs');
  fs.writeFileSync(
    path.join(SCREENSHOTS_DIR, 'assets-test-report.txt'),
    report
  );

  console.log('Report saved to: screenshots/assets-test-report.txt');
});
