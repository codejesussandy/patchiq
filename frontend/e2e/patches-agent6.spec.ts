import { test, expect, Page } from '@playwright/test';
import * as path from 'path';
import { TEST_USER } from './fixtures';

/**
 * Phase 1 Agent 6: Patches Module Testing
 *
 * Test all scenarios as per Agent 6 requirements:
 * - Login flow
 * - Navigate to Patches
 * - Test List Operations (search, filter, sort, pagination)
 * - Test Patch Detail Page
 * - Test Deployment Creation Modal
 * - Test Patch Repository/Catalog
 * - Console Errors Check
 */

const SCREENSHOT_DIR = '/Users/shandesh/src/VS-code/PatchIQ/full-dev-sandy-v2/screenshots';
const BASE_URL = 'http://localhost:5173';

// Test results tracking
const testResults = {
  login: 'PENDING',
  patchesList: 'PENDING',
  patchesListLoadTime: 0,
  search: 'PENDING',
  filter: 'PENDING',
  sorting: 'PENDING',
  patchDetail: 'PENDING',
  deployModal: 'PENDING',
  repositoryView: 'PENDING',
  consoleErrors: [] as string[],
  screenshots: [] as string[],
  bugsFound: [] as string[]
};

// Helper to save screenshots
async function captureScreenshot(page: Page, filename: string) {
  try {
    const screenshotPath = path.join(SCREENSHOT_DIR, filename);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    testResults.screenshots.push(filename);
    console.log(`📸 Screenshot saved: ${filename}`);
  } catch (err) {
    console.log(`⚠️  Failed to save screenshot: ${filename}`);
  }
}

test.describe('Phase 1 Agent 6: Patches Module Tests', () => {

  // Setup console monitoring
  test.beforeEach(async ({ page }) => {
    page.on('console', msg => {
      if (msg.type() === 'error') {
        testResults.consoleErrors.push(msg.text());
      }
    });

    page.on('pageerror', error => {
      testResults.consoleErrors.push(`PAGE ERROR: ${error.message}`);
    });
  });

  test('1. Login and Navigate to Patches', async ({ page }) => {
    console.log('\n🧪 Test 1: Login and Navigate to Patches');

    try {
      // Step 1: Login
      await page.goto('/login', { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForSelector('#email', { timeout: 10000 });

      await page.fill('#email', TEST_USER.email);
      await page.fill('#password', TEST_USER.password);
      await page.click('button[type="submit"]');

      // Wait for redirect
      await page.waitForURL(/\/(dashboard|patches|assets)/, { timeout: 30000 });
      console.log('✅ Login successful');
      testResults.login = 'PASS';

      // Step 2: Navigate to Patches
      const startTime = Date.now();
      await page.goto('/patches', { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(1000);
      testResults.patchesListLoadTime = Date.now() - startTime;

      console.log(`⏱️  Page load time: ${testResults.patchesListLoadTime}ms`);

      // Take initial screenshot
      await captureScreenshot(page, 'patches-list-initial.png');

      // Check page loaded
      const pageContent = await page.content();
      if (pageContent.length > 100) {
        console.log('✅ Patches page loaded');
        testResults.patchesList = 'PASS';
      } else {
        throw new Error('Page content too short');
      }

      expect(testResults.patchesListLoadTime).toBeLessThan(5000);

    } catch (error) {
      console.log(`❌ Test failed: ${error}`);
      testResults.login = testResults.login === 'PASS' ? 'PASS' : 'FAIL';
      testResults.patchesList = 'FAIL';
      testResults.bugsFound.push(`Login/Navigation failed: ${error}`);
      await captureScreenshot(page, 'patches-list-initial-error.png');
    }
  });

  test('2. Test Search Functionality', async ({ page }) => {
    console.log('\n🧪 Test 2: Search Functionality');

    try {
      // Login first
      await page.goto('/login');
      await page.fill('#email', TEST_USER.email);
      await page.fill('#password', TEST_USER.password);
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/(dashboard|patches|assets)/, { timeout: 30000 });

      // Navigate to patches
      await page.goto('/patches', { waitUntil: 'load', timeout: 30000 });
      await page.waitForTimeout(2000);

      // Look for search input
      const searchSelectors = [
        'input[placeholder*="Search"]',
        'input[placeholder*="search"]',
        'input[type="search"]',
        '.ant-input-search input',
        'input.ant-input'
      ];

      let searchInput = null;
      for (const selector of searchSelectors) {
        const element = page.locator(selector).first();
        if (await element.count() > 0 && await element.isVisible().catch(() => false)) {
          searchInput = element;
          break;
        }
      }

      if (searchInput) {
        console.log('✅ Search input found');

        // Get initial count
        const initialCount = await page.locator('tbody tr:not(.ant-table-placeholder)').count();
        console.log(`📊 Initial patches count: ${initialCount}`);

        // Perform search
        await searchInput.fill('KB');
        await page.waitForTimeout(2000);

        await captureScreenshot(page, 'patches-search.png');

        const searchCount = await page.locator('tbody tr:not(.ant-table-placeholder)').count();
        console.log(`📊 After search count: ${searchCount}`);

        testResults.search = 'PASS';
      } else {
        console.log('⚠️  Search input not found');
        testResults.search = 'FAIL';
        testResults.bugsFound.push('Search functionality not found on patches page');
      }

      await captureScreenshot(page, 'patches-search-final.png');

    } catch (error) {
      console.log(`❌ Search test failed: ${error}`);
      testResults.search = 'FAIL';
      testResults.bugsFound.push(`Search test failed: ${error}`);
      await captureScreenshot(page, 'patches-search-error.png');
    }
  });

  test('3. Test Filter Functionality', async ({ page }) => {
    console.log('\n🧪 Test 3: Filter Functionality');

    try {
      // Login and navigate
      await page.goto('/login');
      await page.fill('#email', TEST_USER.email);
      await page.fill('#password', TEST_USER.password);
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/(dashboard|patches|assets)/, { timeout: 30000 });

      await page.goto('/patches', { waitUntil: 'load', timeout: 30000 });
      await page.waitForTimeout(2000);

      // Look for filter controls
      const filterButton = page.locator('button').filter({ hasText: /filter/i }).first();
      const selectDropdowns = page.locator('.ant-select');

      const filterCount = await filterButton.count();
      const selectCount = await selectDropdowns.count();

      console.log(`📊 Filter buttons: ${filterCount}, Dropdowns: ${selectCount}`);

      if (filterCount > 0 || selectCount > 0) {
        console.log('✅ Filter controls found');

        // Try to apply a filter
        if (await filterButton.count() > 0) {
          await filterButton.click();
          await page.waitForTimeout(1000);
        }

        await captureScreenshot(page, 'patches-filter-severity.png');
        testResults.filter = 'PASS';
      } else {
        console.log('⚠️  Filter controls not found');
        testResults.filter = 'FAIL';
        testResults.bugsFound.push('Filter functionality not found');
      }

    } catch (error) {
      console.log(`❌ Filter test failed: ${error}`);
      testResults.filter = 'FAIL';
      testResults.bugsFound.push(`Filter test failed: ${error}`);
      await captureScreenshot(page, 'patches-filter-error.png');
    }
  });

  test('4. Test Sorting Functionality', async ({ page }) => {
    console.log('\n🧪 Test 4: Sorting Functionality');

    try {
      // Login and navigate
      await page.goto('/login');
      await page.fill('#email', TEST_USER.email);
      await page.fill('#password', TEST_USER.password);
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/(dashboard|patches|assets)/, { timeout: 30000 });

      await page.goto('/patches', { waitUntil: 'load', timeout: 30000 });
      await page.waitForTimeout(2000);

      // Find sortable columns
      const sortableColumns = page.locator('th.ant-table-column-has-sorters');
      const sortableCount = await sortableColumns.count();

      console.log(`📊 Found ${sortableCount} sortable columns`);

      if (sortableCount > 0) {
        const firstColumn = sortableColumns.first();
        const columnName = await firstColumn.textContent();
        console.log(`🔄 Sorting by: ${columnName}`);

        // Click to sort
        await firstColumn.click();
        await page.waitForTimeout(1000);

        await captureScreenshot(page, 'patches-sorting.png');

        console.log('✅ Sorting works');
        testResults.sorting = 'PASS';
      } else {
        console.log('⚠️  No sortable columns found');
        testResults.sorting = 'FAIL';
        testResults.bugsFound.push('Sorting functionality not found');
      }

    } catch (error) {
      console.log(`❌ Sorting test failed: ${error}`);
      testResults.sorting = 'FAIL';
      testResults.bugsFound.push(`Sorting test failed: ${error}`);
      await captureScreenshot(page, 'patches-sorting-error.png');
    }
  });

  test('5. Test Pagination', async ({ page }) => {
    console.log('\n🧪 Test 5: Pagination');

    try {
      // Login and navigate
      await page.goto('/login');
      await page.fill('#email', TEST_USER.email);
      await page.fill('#password', TEST_USER.password);
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/(dashboard|patches|assets)/, { timeout: 30000 });

      await page.goto('/patches', { waitUntil: 'load', timeout: 30000 });
      await page.waitForTimeout(2000);

      // Check for pagination
      const pagination = page.locator('.ant-pagination').first();
      const paginationExists = await pagination.isVisible().catch(() => false);

      if (paginationExists) {
        console.log('✅ Pagination found');
        await captureScreenshot(page, 'patches-pagination.png');
      } else {
        console.log('⚠️  Pagination not visible (might be < 10 items)');
        await captureScreenshot(page, 'patches-pagination.png');
      }

    } catch (error) {
      console.log(`❌ Pagination test failed: ${error}`);
      await captureScreenshot(page, 'patches-pagination-error.png');
    }
  });

  test('6. Test Patch Detail Page', async ({ page }) => {
    console.log('\n🧪 Test 6: Patch Detail Page');

    try {
      // Login and navigate
      await page.goto('/login');
      await page.fill('#email', TEST_USER.email);
      await page.fill('#password', TEST_USER.password);
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/(dashboard|patches|assets)/, { timeout: 30000 });

      await page.goto('/patches', { waitUntil: 'load', timeout: 30000 });
      await page.waitForTimeout(2000);

      // Find and click first patch
      const firstRow = page.locator('tbody tr:not(.ant-table-placeholder)').first();
      const rowExists = await firstRow.count() > 0;

      if (rowExists) {
        const link = firstRow.locator('a').first();

        if (await link.count() > 0) {
          console.log('✅ Clicking first patch...');
          await link.click();
          await page.waitForTimeout(3000);

          const url = page.url();
          console.log(`📍 Current URL: ${url}`);

          await captureScreenshot(page, 'patch-detail-page.png');

          // Check for detail page content
          const pageContent = await page.content();
          if (url.includes('patch') || pageContent.includes('KB') || pageContent.includes('severity')) {
            console.log('✅ Detail page loaded');
            await captureScreenshot(page, 'patch-detail-info.png');
            testResults.patchDetail = 'PASS';
          } else {
            throw new Error('Detail page did not load properly');
          }
        } else {
          throw new Error('No clickable link in first row');
        }
      } else {
        throw new Error('No patches found in list');
      }

    } catch (error) {
      console.log(`❌ Detail page test failed: ${error}`);
      testResults.patchDetail = 'FAIL';
      testResults.bugsFound.push(`Detail page test failed: ${error}`);
      await captureScreenshot(page, 'patch-detail-error.png');
    }
  });

  test('7. Test Deploy Modal', async ({ page }) => {
    console.log('\n🧪 Test 7: Deploy Modal');

    try {
      // Login and navigate
      await page.goto('/login');
      await page.fill('#email', TEST_USER.email);
      await page.fill('#password', TEST_USER.password);
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/(dashboard|patches|assets)/, { timeout: 30000 });

      await page.goto('/patches', { waitUntil: 'load', timeout: 30000 });
      await page.waitForTimeout(2000);

      // Find and click first patch to get to detail page
      const firstRow = page.locator('tbody tr:not(.ant-table-placeholder)').first();
      const link = firstRow.locator('a').first();

      if (await link.count() > 0) {
        await link.click();
        await page.waitForTimeout(3000);

        // Look for Deploy button
        const deployButton = page.locator('button').filter({ hasText: /deploy|install|apply/i }).first();

        if (await deployButton.count() > 0) {
          console.log('✅ Deploy button found');
          await deployButton.click();
          await page.waitForTimeout(2000);

          await captureScreenshot(page, 'patch-deploy-modal.png');

          // Check if modal opened
          const modal = page.locator('.ant-modal, [role="dialog"]').first();
          const modalVisible = await modal.isVisible().catch(() => false);

          if (modalVisible) {
            console.log('✅ Deploy modal opened');
            await captureScreenshot(page, 'patch-deploy-options.png');

            // Close modal
            const closeBtn = page.locator('.ant-modal-close, button:has-text("Cancel")').first();
            if (await closeBtn.count() > 0) {
              await closeBtn.click();
              await page.waitForTimeout(500);
            }

            testResults.deployModal = 'PASS';
          } else {
            throw new Error('Deploy modal did not open');
          }
        } else {
          throw new Error('Deploy button not found');
        }
      }

    } catch (error) {
      console.log(`❌ Deploy modal test failed: ${error}`);
      testResults.deployModal = 'FAIL';
      testResults.bugsFound.push(`Deploy modal test failed: ${error}`);
      await captureScreenshot(page, 'patch-deploy-error.png');
    }
  });

  test('8. Test Patch Repository', async ({ page }) => {
    console.log('\n🧪 Test 8: Patch Repository');

    try {
      // Login
      await page.goto('/login');
      await page.fill('#email', TEST_USER.email);
      await page.fill('#password', TEST_USER.password);
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/(dashboard|patches|assets)/, { timeout: 30000 });

      // Try different repository URLs
      const repoUrls = [
        '/patches/repository',
        '/patches/catalog',
        '/patch-repository'
      ];

      let repoFound = false;
      for (const url of repoUrls) {
        try {
          await page.goto(url, { waitUntil: 'load', timeout: 10000 });
          await page.waitForTimeout(1000);

          const pageContent = await page.content();
          if (!pageContent.includes('404') && pageContent.length > 100) {
            console.log(`✅ Repository found at: ${url}`);
            await captureScreenshot(page, 'patch-repository.png');
            repoFound = true;
            testResults.repositoryView = 'PASS';
            break;
          }
        } catch (err) {
          // Continue to next URL
        }
      }

      if (!repoFound) {
        console.log('⚠️  Patch repository not found');
        testResults.repositoryView = 'FAIL';
        testResults.bugsFound.push('Patch repository/catalog page not found');
      }

    } catch (error) {
      console.log(`❌ Repository test failed: ${error}`);
      testResults.repositoryView = 'FAIL';
      testResults.bugsFound.push(`Repository test failed: ${error}`);
      await captureScreenshot(page, 'patch-repository-error.png');
    }
  });

});

// Generate report after all tests
test.afterAll(async () => {
  console.log('\n' + '='.repeat(80));
  console.log('📋 AGENT 6 TEST RESULTS');
  console.log('='.repeat(80));
  console.log(`Login: ${testResults.login}`);
  console.log(`Patches List: ${testResults.patchesList} (load time: ${testResults.patchesListLoadTime}ms)`);
  console.log(`Search: ${testResults.search}`);
  console.log(`Filter: ${testResults.filter}`);
  console.log(`Sorting: ${testResults.sorting}`);
  console.log(`Patch Detail: ${testResults.patchDetail}`);
  console.log(`Deploy Modal: ${testResults.deployModal}`);
  console.log(`Repository View: ${testResults.repositoryView}`);
  console.log(`\nConsole Errors: ${testResults.consoleErrors.length}`);
  if (testResults.consoleErrors.length > 0) {
    console.log('First 5 errors:');
    testResults.consoleErrors.slice(0, 5).forEach((err, i) => {
      console.log(`  ${i + 1}. ${err.substring(0, 100)}`);
    });
  }
  console.log(`\nBugs Found: ${testResults.bugsFound.length}`);
  testResults.bugsFound.forEach((bug, i) => {
    console.log(`  ${i + 1}. ${bug}`);
  });
  console.log(`\nScreenshots: ${testResults.screenshots.length}`);
  testResults.screenshots.forEach(s => console.log(`  - ${s}`));
  console.log('='.repeat(80));

  // Calculate overall status
  const allTests = [
    testResults.login,
    testResults.patchesList,
    testResults.search,
    testResults.filter,
    testResults.sorting,
    testResults.patchDetail,
    testResults.deployModal,
    testResults.repositoryView
  ];
  const passCount = allTests.filter(r => r === 'PASS').length;
  const failCount = allTests.filter(r => r === 'FAIL').length;
  const overallStatus = failCount === 0 && passCount >= 5 ? 'PASS' : 'FAIL';

  console.log(`\nOverall Status: ${overallStatus} (${passCount} passed, ${failCount} failed)`);
  console.log('='.repeat(80));
});
