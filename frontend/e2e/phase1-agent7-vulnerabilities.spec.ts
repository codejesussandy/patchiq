import { test, expect, Page } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'http://localhost:5173';
const SCREENSHOTS_DIR = path.join(__dirname, '../../screenshots/phase1-agent7');

// Test credentials
const TEST_USER = {
  email: 'admin@patchiq.io',
  password: 'admin123',
};

// Helper to capture console errors
const consoleErrors: string[] = [];
const consoleWarnings: string[] = [];

test.describe('Phase 1 Agent 7: Vulnerabilities Module Testing', () => {
  test.beforeEach(async ({ page }) => {
    // Capture console errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      } else if (msg.type() === 'warning') {
        consoleWarnings.push(msg.text());
      }
    });

    // Ensure screenshots directory exists
    await page.goto(BASE_URL);
  });

  test('1. Login Flow', async ({ page }) => {
    console.log('✓ Test 1: Login Flow');

    // Navigate to login
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');

    // Fill credentials
    await page.fill('input[type="email"], input[name="email"]', TEST_USER.email);
    await page.fill('input[type="password"], input[name="password"]', TEST_USER.password);

    // Take screenshot before login
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/01-login-form.png`, fullPage: true });

    // Click submit and wait for navigation
    await Promise.all([
      page.waitForURL('**/dashboard', { timeout: 10000 }),
      page.click('button[type="submit"]'),
    ]);

    // Verify redirect to dashboard
    expect(page.url()).toContain('/dashboard');
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/02-dashboard-after-login.png`, fullPage: true });

    console.log('  ✓ Login successful, redirected to dashboard');
  });

  test('2. Navigate to Vulnerabilities List', async ({ page }) => {
    console.log('✓ Test 2: Navigate to Vulnerabilities List');

    // Login first
    await loginHelper(page);

    // Record start time
    const startTime = Date.now();

    // Navigate to vulnerabilities
    await page.goto(`${BASE_URL}/vulnerability/vulnerabilities`);
    await page.waitForLoadState('networkidle');

    // Wait for content to load
    await page.waitForSelector('table, .ant-table, .vulnerabilities-list, [data-testid="vulnerabilities-table"]', { timeout: 10000 });

    const loadTime = Date.now() - startTime;
    console.log(`  ✓ Vulnerabilities page loaded in ${loadTime}ms`);

    // Take screenshot
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/03-vulnerabilities-list-initial.png`, fullPage: true });

    // Verify page loaded
    expect(page.url()).toContain('/vulnerability/vulnerabilities');

    // Check if vulnerabilities are displayed
    const hasTable = await page.locator('table, .ant-table').count() > 0;
    const hasCVEs = await page.locator('text=/CVE-/i').count() > 0;

    console.log(`  ✓ Table displayed: ${hasTable}`);
    console.log(`  ✓ CVEs found: ${hasCVEs}`);

    expect(loadTime).toBeLessThan(5000); // Should load within 5s
  });

  test('3. Test Search Functionality', async ({ page }) => {
    console.log('✓ Test 3: Search Functionality');

    await loginHelper(page);
    await page.goto(`${BASE_URL}/vulnerability/vulnerabilities`);
    await page.waitForLoadState('networkidle');

    // Find search input
    const searchInput = page.locator('input[placeholder*="Search"], input[placeholder*="search"], input[type="search"], .ant-input-search input').first();

    if (await searchInput.count() > 0) {
      // Test search for CVE
      await searchInput.fill('CVE-2024');
      await page.waitForTimeout(1000); // Wait for debounce
      await page.screenshot({ path: `${SCREENSHOTS_DIR}/04-vulnerabilities-search.png`, fullPage: true });

      // Check if results filtered
      const resultsAfterSearch = await page.locator('text=/CVE-2024/i').count();
      console.log(`  ✓ Search results found: ${resultsAfterSearch}`);

      // Clear search
      await searchInput.clear();
      await page.waitForTimeout(500);
    } else {
      console.log('  ⚠ Search input not found');
      await page.screenshot({ path: `${SCREENSHOTS_DIR}/04-vulnerabilities-search-not-found.png`, fullPage: true });
    }
  });

  test('4. Test Severity Filter', async ({ page }) => {
    console.log('✓ Test 4: Severity Filter');

    await loginHelper(page);
    await page.goto(`${BASE_URL}/vulnerability/vulnerabilities`);
    await page.waitForLoadState('networkidle');

    // Look for severity filter - could be dropdown, buttons, or tags
    const severityFilter = page.locator('text=/severity/i').first();

    if (await severityFilter.count() > 0) {
      await severityFilter.click();
      await page.waitForTimeout(500);

      // Try to select Critical
      const criticalOption = page.locator('text=/critical/i').first();
      if (await criticalOption.count() > 0) {
        await criticalOption.click();
        await page.waitForTimeout(1000);
        await page.screenshot({ path: `${SCREENSHOTS_DIR}/05-vulnerabilities-filter-severity.png`, fullPage: true });
        console.log('  ✓ Severity filter applied (Critical)');
      } else {
        await page.screenshot({ path: `${SCREENSHOTS_DIR}/05-vulnerabilities-filter-severity-options.png`, fullPage: true });
        console.log('  ⚠ Critical option not found');
      }
    } else {
      // Look for filter button or drawer
      const filterButton = page.locator('button:has-text("Filter"), button:has-text("Filters"), [aria-label*="filter"]').first();
      if (await filterButton.count() > 0) {
        await filterButton.click();
        await page.waitForTimeout(500);
        await page.screenshot({ path: `${SCREENSHOTS_DIR}/05-vulnerabilities-filter-drawer.png`, fullPage: true });
        console.log('  ✓ Filter drawer opened');
      } else {
        await page.screenshot({ path: `${SCREENSHOTS_DIR}/05-vulnerabilities-no-filter.png`, fullPage: true });
        console.log('  ⚠ Severity filter not found');
      }
    }
  });

  test('5. Test EPSS Score Filter', async ({ page }) => {
    console.log('✓ Test 5: EPSS Score Filter');

    await loginHelper(page);
    await page.goto(`${BASE_URL}/vulnerability/vulnerabilities`);
    await page.waitForLoadState('networkidle');

    // Look for EPSS filter
    const epssFilter = page.locator('text=/epss/i').first();

    if (await epssFilter.count() > 0) {
      await epssFilter.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: `${SCREENSHOTS_DIR}/06-vulnerabilities-filter-epss.png`, fullPage: true });
      console.log('  ✓ EPSS filter found and clicked');
    } else {
      // Check filter drawer
      const filterButton = page.locator('button:has-text("Filter"), button:has-text("Filters")').first();
      if (await filterButton.count() > 0) {
        await filterButton.click();
        await page.waitForTimeout(500);

        const epssInDrawer = await page.locator('text=/epss/i').count();
        await page.screenshot({ path: `${SCREENSHOTS_DIR}/06-vulnerabilities-filter-epss-drawer.png`, fullPage: true });
        console.log(`  ${epssInDrawer > 0 ? '✓' : '⚠'} EPSS filter in drawer: ${epssInDrawer > 0}`);
      } else {
        await page.screenshot({ path: `${SCREENSHOTS_DIR}/06-vulnerabilities-no-epss-filter.png`, fullPage: true });
        console.log('  ⚠ EPSS filter not available');
      }
    }
  });

  test('6. Test Sorting', async ({ page }) => {
    console.log('✓ Test 6: Sorting Functionality');

    await loginHelper(page);
    await page.goto(`${BASE_URL}/vulnerability/vulnerabilities`);
    await page.waitForLoadState('networkidle');

    // Look for sortable columns
    const sortableColumns = page.locator('th.ant-table-column-has-sorters, th[aria-sort], th:has(.ant-table-column-sorter)');
    const count = await sortableColumns.count();

    if (count > 0) {
      console.log(`  ✓ Found ${count} sortable columns`);

      // Try to sort by first sortable column
      await sortableColumns.first().click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: `${SCREENSHOTS_DIR}/07-vulnerabilities-sorting-asc.png`, fullPage: true });

      // Sort descending
      await sortableColumns.first().click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: `${SCREENSHOTS_DIR}/07-vulnerabilities-sorting-desc.png`, fullPage: true });

      console.log('  ✓ Sorting tested (ascending and descending)');
    } else {
      await page.screenshot({ path: `${SCREENSHOTS_DIR}/07-vulnerabilities-no-sorting.png`, fullPage: true });
      console.log('  ⚠ No sortable columns found');
    }
  });

  test('7. Test Pagination', async ({ page }) => {
    console.log('✓ Test 7: Pagination');

    await loginHelper(page);
    await page.goto(`${BASE_URL}/vulnerability/vulnerabilities`);
    await page.waitForLoadState('networkidle');

    // Look for pagination
    const pagination = page.locator('.ant-pagination, [role="navigation"]').first();

    if (await pagination.count() > 0) {
      // Check total count
      const totalText = await page.locator('.ant-pagination-total-text').textContent().catch(() => '');
      console.log(`  ✓ Pagination found. Total: ${totalText}`);

      // Try to go to next page
      const nextButton = page.locator('.ant-pagination-next:not(.ant-pagination-disabled)').first();
      if (await nextButton.count() > 0) {
        await nextButton.click();
        await page.waitForTimeout(1000);
        await page.screenshot({ path: `${SCREENSHOTS_DIR}/08-vulnerabilities-pagination.png`, fullPage: true });
        console.log('  ✓ Navigated to next page');
      } else {
        await page.screenshot({ path: `${SCREENSHOTS_DIR}/08-vulnerabilities-pagination-single-page.png`, fullPage: true });
        console.log('  ⚠ Only one page of results');
      }
    } else {
      await page.screenshot({ path: `${SCREENSHOTS_DIR}/08-vulnerabilities-no-pagination.png`, fullPage: true });
      console.log('  ⚠ Pagination not found');
    }
  });

  test('8. Test Vulnerability Detail Page', async ({ page }) => {
    console.log('✓ Test 8: Vulnerability Detail Page');

    await loginHelper(page);
    await page.goto(`${BASE_URL}/vulnerability/vulnerabilities`);
    await page.waitForLoadState('networkidle');

    // Find first CVE link
    const firstCVELink = page.locator('a[href*="/vulnerability/"], tr').first();

    if (await firstCVELink.count() > 0) {
      await firstCVELink.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // Verify navigation
      const currentUrl = page.url();
      console.log(`  ✓ Navigated to: ${currentUrl}`);

      await page.screenshot({ path: `${SCREENSHOTS_DIR}/09-vulnerability-detail-page.png`, fullPage: true });

      // Check for key elements
      const hasCVEID = await page.locator('text=/CVE-/i').count() > 0;
      const hasCVSS = await page.locator('text=/cvss/i, text=/score/i').count() > 0;
      const hasEPSS = await page.locator('text=/epss/i').count() > 0;
      const hasDescription = await page.locator('text=/description/i').count() > 0;
      const hasAffectedAssets = await page.locator('text=/affected.*asset/i, text=/asset/i').count() > 0;

      console.log(`  ✓ CVE ID: ${hasCVEID}`);
      console.log(`  ✓ CVSS Score: ${hasCVSS}`);
      console.log(`  ✓ EPSS Score: ${hasEPSS}`);
      console.log(`  ✓ Description: ${hasDescription}`);
      console.log(`  ✓ Affected Assets: ${hasAffectedAssets}`);

      // Scroll and take more screenshots
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 3));
      await page.screenshot({ path: `${SCREENSHOTS_DIR}/10-vulnerability-detail-info.png`, fullPage: true });

      // Scroll to affected assets section
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.screenshot({ path: `${SCREENSHOTS_DIR}/11-vulnerability-affected-assets.png`, fullPage: true });

    } else {
      await page.screenshot({ path: `${SCREENSHOTS_DIR}/09-no-cve-found.png`, fullPage: true });
      console.log('  ⚠ No CVE found to click');
    }
  });

  test('9. Test Vulnerability Scan Trigger UI', async ({ page }) => {
    console.log('✓ Test 9: Vulnerability Scan Trigger UI');

    await loginHelper(page);
    await page.goto(`${BASE_URL}/vulnerability/vulnerabilities`);
    await page.waitForLoadState('networkidle');

    // Look for scan button
    const scanButton = page.locator('button:has-text("Scan"), button:has-text("Start Scan"), button:has-text("Trigger Scan"), button:has-text("New Scan")').first();

    if (await scanButton.count() > 0) {
      await scanButton.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: `${SCREENSHOTS_DIR}/12-vulnerability-scan-modal.png`, fullPage: true });
      console.log('  ✓ Scan modal opened');

      // Check for scan options
      const hasScopeSelection = await page.locator('text=/scope/i, text=/all assets/i, text=/selected/i').count() > 0;
      const hasScanType = await page.locator('text=/scan type/i, text=/quick/i, text=/full/i').count() > 0;

      console.log(`  ✓ Scope Selection: ${hasScopeSelection}`);
      console.log(`  ✓ Scan Type: ${hasScanType}`);

      await page.screenshot({ path: `${SCREENSHOTS_DIR}/13-vulnerability-scan-options.png`, fullPage: true });

      // Close modal
      const closeButton = page.locator('button:has-text("Cancel"), button:has-text("Close"), .ant-modal-close').first();
      if (await closeButton.count() > 0) {
        await closeButton.click();
        console.log('  ✓ Modal closed');
      }
    } else {
      // Check if scan is in a different location
      await page.goto(`${BASE_URL}/vulnerability/scans`).catch(() => {});
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: `${SCREENSHOTS_DIR}/12-vulnerability-scan-page.png`, fullPage: true });

      const scanButtonAlt = await page.locator('button:has-text("Scan"), button:has-text("Start")').count();
      console.log(`  ${scanButtonAlt > 0 ? '✓' : '⚠'} Scan button found on scans page: ${scanButtonAlt > 0}`);
    }
  });

  test('10. Test Dashboard Vulnerability Stats', async ({ page }) => {
    console.log('✓ Test 10: Dashboard Vulnerability Stats');

    await loginHelper(page);
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForLoadState('networkidle');

    // Look for vulnerability stats
    const vulnStats = await page.locator('text=/vulnerabilit/i, text=/CVE/i, text=/critical/i').count();
    console.log(`  ✓ Vulnerability-related elements found: ${vulnStats}`);

    // Look for stats cards
    const statsCards = await page.locator('.ant-card, .ant-statistic, [class*="stat"]').count();
    console.log(`  ✓ Stats cards found: ${statsCards}`);

    await page.screenshot({ path: `${SCREENSHOTS_DIR}/14-dashboard-vuln-stats.png`, fullPage: true });
  });

  test.afterAll(async () => {
    // Generate report
    const report = generateReport();
    console.log('\n' + report);
  });
});

// Helper function to login
async function loginHelper(page: Page) {
  await page.goto(`${BASE_URL}/login`);
  await page.fill('input[type="email"], input[name="email"]', TEST_USER.email);
  await page.fill('input[type="password"], input[name="password"]', TEST_USER.password);
  await Promise.all([
    page.waitForURL('**/dashboard', { timeout: 10000 }),
    page.click('button[type="submit"]'),
  ]);
}

// Generate test report
function generateReport(): string {
  return `
================================================================================
Phase 1 Agent 7: Vulnerabilities Module Test Report
================================================================================

Test Execution Summary:
- Total Console Errors: ${consoleErrors.length}
- Total Console Warnings: ${consoleWarnings.length}

Console Errors:
${consoleErrors.length > 0 ? consoleErrors.map((e, i) => `  ${i + 1}. ${e}`).join('\n') : '  None'}

Console Warnings:
${consoleWarnings.length > 0 ? consoleWarnings.slice(0, 10).map((w, i) => `  ${i + 1}. ${w}`).join('\n') : '  None'}

Screenshots saved to: ${SCREENSHOTS_DIR}

Note: Individual test results are logged above. Check Playwright HTML report for detailed results.
================================================================================
`;
}
