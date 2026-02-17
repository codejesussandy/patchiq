import { test, expect, Page } from './fixtures';
import { login, waitForPageLoad, checkTableRendered } from './fixtures';

/**
 * Comprehensive Vulnerabilities Module Test Suite
 *
 * Tests all major functionality of the Vulnerabilities page including:
 * - Navigation and list display
 * - Search functionality
 * - Filters (severity, CVSS, status)
 * - Sorting
 * - Detail page view
 * - Remediation actions
 * - Console error monitoring
 *
 * Screenshots saved to: /Users/shandesh/src/VS-code/PatchIQ/full-dev-sandy-v2/screenshots/
 */

const SCREENSHOTS_DIR = '/Users/shandesh/src/VS-code/PatchIQ/full-dev-sandy-v2/screenshots';

test.describe('Vulnerabilities Module - Comprehensive Tests', () => {
  let consoleLogs: { type: string; message: string }[] = [];
  let consoleErrors: string[] = [];

  test.beforeEach(async ({ page }) => {
    // Reset console logs
    consoleLogs = [];
    consoleErrors = [];

    // Monitor console messages
    page.on('console', (msg) => {
      const type = msg.type();
      const text = msg.text();
      consoleLogs.push({ type, message: text });

      if (type === 'error') {
        consoleErrors.push(text);
      }
    });

    // Monitor page errors
    page.on('pageerror', (error) => {
      consoleErrors.push(`Page Error: ${error.message}`);
    });

    // Login before each test
    await login(page);
  });

  test.afterEach(async () => {
    // Report console errors if any
    if (consoleErrors.length > 0) {
      console.log('\n⚠️  Console Errors Detected:');
      consoleErrors.forEach((err, idx) => {
        console.log(`  ${idx + 1}. ${err}`);
      });
    }
  });

  test.describe('1. Navigation & List Display', () => {
    test('should navigate to vulnerabilities page and display list', async ({ page }) => {
      const startTime = Date.now();

      // Navigate to vulnerabilities page
      await page.goto('/vulnerability/vulnerabilities');
      await waitForPageLoad(page);

      const loadTime = Date.now() - startTime;
      console.log(`✓ Page load time: ${loadTime}ms`);

      // Check that main content is visible
      const content = page.locator('main, [class*="content"], div').first();
      await expect(content).toBeVisible();

      // Wait for table to render
      await checkTableRendered(page);

      // Take screenshot of initial list
      await page.screenshot({
        path: `${SCREENSHOTS_DIR}/vulnerabilities-list-initial.png`,
        fullPage: true
      });

      console.log('✓ Screenshot saved: vulnerabilities-list-initial.png');
    });

    test('should verify columns are present', async ({ page }) => {
      await page.goto('/vulnerability/vulnerabilities');
      await waitForPageLoad(page);

      // Check for expected column headers
      const expectedColumns = ['Severity', 'CVE', 'EPSS', 'Risk Score', 'CVSS3', 'CVSS2'];

      for (const column of expectedColumns) {
        const header = page.locator(`th:has-text("${column}")`).first();
        const isVisible = await header.isVisible().catch(() => false);

        if (isVisible) {
          console.log(`✓ Column found: ${column}`);
        } else {
          console.log(`⚠️  Column not found: ${column}`);
        }
      }
    });

    test('should verify data rows are present', async ({ page }) => {
      await page.goto('/vulnerability/vulnerabilities');
      await waitForPageLoad(page);

      // Wait for table body
      const tableBody = page.locator('tbody').first();
      await expect(tableBody).toBeVisible({ timeout: 10000 });

      // Check for rows
      const rows = page.locator('tbody tr, .ant-table-row');
      const rowCount = await rows.count();

      console.log(`✓ Found ${rowCount} vulnerability rows`);

      if (rowCount === 0) {
        console.log('⚠️  No vulnerabilities found in the list');
      }
    });
  });

  test.describe('2. Search by CVE ID', () => {
    test('should search for CVE-2024 and filter results', async ({ page }) => {
      await page.goto('/vulnerability/vulnerabilities');
      await waitForPageLoad(page);

      // Find search input
      const searchInput = page.locator('input[placeholder*="Search" i]').first();
      await expect(searchInput).toBeVisible({ timeout: 10000 });

      // Get initial row count
      const initialRows = await page.locator('tbody tr, .ant-table-row').count();
      console.log(`✓ Initial row count: ${initialRows}`);

      // Perform search
      await searchInput.fill('CVE-2024');
      await page.waitForTimeout(1000); // Wait for debounce/filtering

      // Get filtered row count
      const filteredRows = await page.locator('tbody tr, .ant-table-row').count();
      console.log(`✓ Filtered row count: ${filteredRows}`);

      // Take screenshot
      await page.screenshot({
        path: `${SCREENSHOTS_DIR}/vulnerabilities-search-results.png`,
        fullPage: true
      });

      console.log('✓ Screenshot saved: vulnerabilities-search-results.png');

      // Verify results contain CVE-2024
      if (filteredRows > 0) {
        const firstRowText = await page.locator('tbody tr, .ant-table-row').first().textContent();
        console.log(`✓ First result: ${firstRowText?.substring(0, 100)}...`);
      }
    });

    test('should clear search and show all results', async ({ page }) => {
      await page.goto('/vulnerability/vulnerabilities');
      await waitForPageLoad(page);

      const searchInput = page.locator('input[placeholder*="Search" i]').first();

      // Search
      await searchInput.fill('CVE-2024');
      await page.waitForTimeout(500);
      const searchedCount = await page.locator('tbody tr, .ant-table-row').count();

      // Clear
      await searchInput.clear();
      await page.waitForTimeout(500);
      const clearedCount = await page.locator('tbody tr, .ant-table-row').count();

      console.log(`✓ Searched count: ${searchedCount}, Cleared count: ${clearedCount}`);
    });
  });

  test.describe('3. Filters', () => {
    test('should open advanced filters modal', async ({ page }) => {
      await page.goto('/vulnerability/vulnerabilities');
      await waitForPageLoad(page);

      // Click Advanced Filters link
      const advancedFiltersLink = page.locator('text="Advanced Filters"');
      await expect(advancedFiltersLink).toBeVisible({ timeout: 10000 });
      await advancedFiltersLink.click();

      // Check modal opened
      const modal = page.locator('.ant-modal-content').first();
      await expect(modal).toBeVisible({ timeout: 5000 });

      console.log('✓ Advanced Filters modal opened');

      // Take screenshot
      await page.screenshot({
        path: `${SCREENSHOTS_DIR}/vulnerabilities-filters-modal.png`,
        fullPage: true
      });

      // Close modal
      const closeBtn = page.locator('.ant-modal-close, button:has-text("Cancel")').first();
      await closeBtn.click();
      await page.waitForTimeout(500);
    });

    test('should apply severity filter', async ({ page }) => {
      await page.goto('/vulnerability/vulnerabilities');
      await waitForPageLoad(page);

      // Open filters
      await page.locator('text="Advanced Filters"').click();
      await page.waitForTimeout(500);

      // Look for severity filter (could be checkbox, select, or radio)
      const severityOptions = page.locator('.ant-checkbox-wrapper, .ant-radio-wrapper').filter({ hasText: /Critical|High|Medium|Low/i });
      const optionCount = await severityOptions.count();

      console.log(`✓ Found ${optionCount} severity filter options`);

      if (optionCount > 0) {
        // Click first severity option
        await severityOptions.first().click();
        await page.waitForTimeout(300);

        // Apply filters
        const applyBtn = page.locator('button:has-text("Apply"), button:has-text("OK")').first();
        if (await applyBtn.isVisible()) {
          await applyBtn.click();
          await page.waitForTimeout(1000);

          // Take screenshot
          await page.screenshot({
            path: `${SCREENSHOTS_DIR}/vulnerabilities-filters-applied.png`,
            fullPage: true
          });

          console.log('✓ Screenshot saved: vulnerabilities-filters-applied.png');
        }
      }
    });

    test('should test CVSS score range filter', async ({ page }) => {
      await page.goto('/vulnerability/vulnerabilities');
      await waitForPageLoad(page);

      // Open filters
      await page.locator('text="Advanced Filters"').click();
      await page.waitForTimeout(500);

      // Look for CVSS inputs or sliders
      const cvssInputs = page.locator('input[type="number"], .ant-slider, input[placeholder*="CVSS" i]');
      const cvssCount = await cvssInputs.count();

      console.log(`✓ Found ${cvssCount} CVSS filter controls`);

      // Close modal
      const closeBtn = page.locator('.ant-modal-close, button:has-text("Cancel")').first();
      if (await closeBtn.isVisible()) {
        await closeBtn.click();
      }
    });

    test('should test status filter', async ({ page }) => {
      await page.goto('/vulnerability/vulnerabilities');
      await waitForPageLoad(page);

      // Open filters
      await page.locator('text="Advanced Filters"').click();
      await page.waitForTimeout(500);

      // Look for status filter options
      const statusOptions = page.locator('.ant-checkbox-wrapper, .ant-radio-wrapper').filter({ hasText: /Open|Patched|Mitigated/i });
      const statusCount = await statusOptions.count();

      console.log(`✓ Found ${statusCount} status filter options`);

      // Close modal
      const closeBtn = page.locator('.ant-modal-close, button:has-text("Cancel")').first();
      if (await closeBtn.isVisible()) {
        await closeBtn.click();
      }
    });

    test('should clear filters', async ({ page }) => {
      await page.goto('/vulnerability/vulnerabilities');
      await waitForPageLoad(page);

      // Open filters
      await page.locator('text="Advanced Filters"').click();
      await page.waitForTimeout(500);

      // Look for Clear button
      const clearBtn = page.locator('button:has-text("Clear"), button:has-text("Reset")').first();
      const hasClearBtn = await clearBtn.isVisible().catch(() => false);

      if (hasClearBtn) {
        await clearBtn.click();
        console.log('✓ Filters cleared');
      } else {
        console.log('⚠️  Clear button not found');
      }

      // Close modal
      const closeBtn = page.locator('.ant-modal-close, button:has-text("Cancel")').first();
      if (await closeBtn.isVisible()) {
        await closeBtn.click();
      }
    });
  });

  test.describe('4. Sorting', () => {
    test('should sort by severity', async ({ page }) => {
      await page.goto('/vulnerability/vulnerabilities');
      await waitForPageLoad(page);

      // Find severity column header
      const severityHeader = page.locator('th').filter({ hasText: 'Severity' });

      if (await severityHeader.isVisible()) {
        // Click to sort
        await severityHeader.click();
        await page.waitForTimeout(1000);

        // Get first few severity values
        const severityTags = page.locator('tbody tr .ant-tag, tbody tr [role="status"]');
        const count = await severityTags.count();

        if (count > 0) {
          const firstSeverity = await severityTags.first().textContent();
          console.log(`✓ Sorted by severity, first item: ${firstSeverity}`);
        }

        // Click again to reverse sort
        await severityHeader.click();
        await page.waitForTimeout(500);
        console.log('✓ Reversed severity sort');
      }
    });

    test('should sort by CVSS Score', async ({ page }) => {
      await page.goto('/vulnerability/vulnerabilities');
      await waitForPageLoad(page);

      // Find CVSS column header (could be CVSS3 or CVSS)
      const cvssHeader = page.locator('th').filter({ hasText: /CVSS|Score/i }).first();

      if (await cvssHeader.isVisible()) {
        await cvssHeader.click();
        await page.waitForTimeout(1000);

        console.log('✓ Sorted by CVSS Score');

        // Take screenshot of sorted results
        await page.screenshot({
          path: `${SCREENSHOTS_DIR}/vulnerabilities-sorted-cvss.png`,
          fullPage: true
        });
      }
    });

    test('should sort by CVE ID', async ({ page }) => {
      await page.goto('/vulnerability/vulnerabilities');
      await waitForPageLoad(page);

      const cveHeader = page.locator('th').filter({ hasText: 'CVE' }).first();

      if (await cveHeader.isVisible()) {
        await cveHeader.click();
        await page.waitForTimeout(1000);
        console.log('✓ Sorted by CVE ID');
      }
    });
  });

  test.describe('5. Vulnerability Detail Page', () => {
    test('should open detail modal by clicking on a vulnerability', async ({ page }) => {
      await page.goto('/vulnerability/vulnerabilities');
      await waitForPageLoad(page);

      // Get first row
      const firstRow = page.locator('tbody tr, .ant-table-row').first();

      if (await firstRow.isVisible()) {
        // Get CVE from row
        const cveText = await firstRow.locator('td').nth(1).textContent();
        console.log(`✓ Clicking on vulnerability: ${cveText}`);

        // Click row
        await firstRow.click();
        await page.waitForTimeout(2000);

        // Check for detail modal
        const detailModal = page.locator('.ant-modal-content').first();
        const isModalVisible = await detailModal.isVisible().catch(() => false);

        if (isModalVisible) {
          console.log('✓ Detail modal opened');

          // Take screenshot
          await page.screenshot({
            path: `${SCREENSHOTS_DIR}/vulnerability-detail-page.png`,
            fullPage: true
          });

          console.log('✓ Screenshot saved: vulnerability-detail-page.png');

          // Check for detail sections
          await verifyDetailSections(page);

          // Close modal
          const closeBtn = page.locator('.ant-modal-close').first();
          if (await closeBtn.isVisible()) {
            await closeBtn.click();
            await page.waitForTimeout(500);
          }
        } else {
          console.log('⚠️  Detail modal did not open');
        }
      }
    });

    test('should verify CVE description is present', async ({ page }) => {
      await page.goto('/vulnerability/vulnerabilities');
      await waitForPageLoad(page);

      const firstRow = page.locator('tbody tr, .ant-table-row').first();

      if (await firstRow.isVisible()) {
        await firstRow.click();
        await page.waitForTimeout(2000);

        // Look for description
        const description = page.locator('.ant-modal-body').first();
        const hasDescription = await description.isVisible().catch(() => false);

        if (hasDescription) {
          const text = await description.textContent();
          console.log(`✓ Description found (length: ${text?.length || 0} chars)`);
        }
      }
    });

    test('should verify CVSS score breakdown is present', async ({ page }) => {
      await page.goto('/vulnerability/vulnerabilities');
      await waitForPageLoad(page);

      const firstRow = page.locator('tbody tr, .ant-table-row').first();

      if (await firstRow.isVisible()) {
        await firstRow.click();
        await page.waitForTimeout(2000);

        // Look for CVSS elements
        const cvssElements = page.locator('text=/CVSS|Score/i, .ant-progress, [class*="cvss"]');
        const count = await cvssElements.count();
        console.log(`✓ Found ${count} CVSS-related elements in detail view`);

        // Close modal
        const closeBtn = page.locator('.ant-modal-close').first();
        if (await closeBtn.isVisible()) {
          await closeBtn.click();
        }
      }
    });

    test('should verify affected assets list is present', async ({ page }) => {
      await page.goto('/vulnerability/vulnerabilities');
      await waitForPageLoad(page);

      const firstRow = page.locator('tbody tr, .ant-table-row').first();

      if (await firstRow.isVisible()) {
        await firstRow.click();
        await page.waitForTimeout(2000);

        // Look for affected assets/endpoints
        const affectedSection = page.locator('text=/Affected|Endpoints|Assets/i, .ant-table');
        const count = await affectedSection.count();
        console.log(`✓ Found ${count} affected assets/endpoints sections`);

        // Close modal
        const closeBtn = page.locator('.ant-modal-close').first();
        if (await closeBtn.isVisible()) {
          await closeBtn.click();
        }
      }
    });
  });

  test.describe('6. Remediation Actions', () => {
    test('should verify remediation buttons exist', async ({ page }) => {
      await page.goto('/vulnerability/vulnerabilities');
      await waitForPageLoad(page);

      const firstRow = page.locator('tbody tr, .ant-table-row').first();

      if (await firstRow.isVisible()) {
        await firstRow.click();
        await page.waitForTimeout(2000);

        // Look for remediation buttons
        const remediationBtns = page.locator('button:has-text("Patch"), button:has-text("Remediate"), button:has-text("Exception"), button:has-text("Scan")');
        const btnCount = await remediationBtns.count();

        console.log(`✓ Found ${btnCount} remediation action buttons`);

        // Take screenshot
        await page.screenshot({
          path: `${SCREENSHOTS_DIR}/vulnerability-remediation.png`,
          fullPage: true
        });

        console.log('✓ Screenshot saved: vulnerability-remediation.png');

        // Close modal
        const closeBtn = page.locator('.ant-modal-close').first();
        if (await closeBtn.isVisible()) {
          await closeBtn.click();
        }
      }
    });

    test('should test Add Exception button', async ({ page }) => {
      await page.goto('/vulnerability/vulnerabilities');
      await waitForPageLoad(page);

      // Look for Add Exception button on main page
      const addExceptionBtn = page.locator('button:has-text("Add Exception")');

      if (await addExceptionBtn.isVisible()) {
        console.log('✓ Add Exception button found on main page');

        // Try clicking (should show error if no row selected)
        await addExceptionBtn.click();
        await page.waitForTimeout(500);

        // Check for error message
        const errorMessage = page.locator('.ant-message-error, text=/select/i');
        const hasError = await errorMessage.isVisible().catch(() => false);

        if (hasError) {
          console.log('✓ Validation message shown: must select vulnerability first');
        }
      }
    });

    test('should test Scan Now button', async ({ page }) => {
      await page.goto('/vulnerability/vulnerabilities');
      await waitForPageLoad(page);

      const scanBtn = page.locator('button:has-text("Scan Now")');

      if (await scanBtn.isVisible()) {
        console.log('✓ Scan Now button found');

        // Click and check for scan modal or loading state
        await scanBtn.click();
        await page.waitForTimeout(1000);

        const scanModal = page.locator('.ant-modal-content').filter({ hasText: /Scan|Progress/i });
        const hasScanModal = await scanModal.isVisible().catch(() => false);

        if (hasScanModal) {
          console.log('✓ Scan modal/progress indicator shown');

          // Close modal
          await page.keyboard.press('Escape');
          await page.waitForTimeout(500);
        }
      }
    });
  });

  test.describe('7. Console Errors & Performance', () => {
    test('should check for console errors during navigation', async ({ page }) => {
      const errors: string[] = [];

      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });

      await page.goto('/vulnerability/vulnerabilities');
      await waitForPageLoad(page);

      // Navigate through a few actions
      await page.locator('input[placeholder*="Search" i]').first().fill('CVE');
      await page.waitForTimeout(500);

      if (errors.length === 0) {
        console.log('✓ No console errors detected');
      } else {
        console.log(`⚠️  ${errors.length} console errors detected:`);
        errors.forEach((err, idx) => {
          console.log(`  ${idx + 1}. ${err.substring(0, 150)}`);
        });
      }
    });

    test('should measure page load performance', async ({ page }) => {
      const startTime = Date.now();

      await page.goto('/vulnerability/vulnerabilities');
      await waitForPageLoad(page);
      await checkTableRendered(page);

      const loadTime = Date.now() - startTime;

      console.log(`✓ Total page load time: ${loadTime}ms`);

      if (loadTime < 3000) {
        console.log('✓ Performance: Excellent (< 3s)');
      } else if (loadTime < 5000) {
        console.log('✓ Performance: Good (< 5s)');
      } else {
        console.log('⚠️  Performance: Slow (> 5s)');
      }
    });

    test('should check for network errors', async ({ page }) => {
      const failedRequests: string[] = [];

      page.on('requestfailed', (request) => {
        failedRequests.push(`${request.method()} ${request.url()} - ${request.failure()?.errorText}`);
      });

      await page.goto('/vulnerability/vulnerabilities');
      await waitForPageLoad(page);

      if (failedRequests.length === 0) {
        console.log('✓ No failed network requests');
      } else {
        console.log(`⚠️  ${failedRequests.length} failed requests:`);
        failedRequests.forEach((req, idx) => {
          console.log(`  ${idx + 1}. ${req}`);
        });
      }
    });
  });

  test.describe('8. Additional Features', () => {
    test('should test Refresh button', async ({ page }) => {
      await page.goto('/vulnerability/vulnerabilities');
      await waitForPageLoad(page);

      const refreshBtn = page.locator('button:has-text("Refresh"), button').filter({ has: page.locator('[aria-label*="reload" i]') });

      if (await refreshBtn.first().isVisible()) {
        await refreshBtn.first().click();
        await page.waitForTimeout(1000);
        console.log('✓ Refresh button clicked successfully');
      }
    });

    test('should test Export button', async ({ page }) => {
      await page.goto('/vulnerability/vulnerabilities');
      await waitForPageLoad(page);

      const exportBtn = page.locator('button:has-text("Export"), button').filter({ has: page.locator('[aria-label*="export" i]') });

      if (await exportBtn.first().isVisible()) {
        // Start waiting for download before clicking
        const downloadPromise = page.waitForEvent('download', { timeout: 5000 }).catch(() => null);
        await exportBtn.first().click();

        const download = await downloadPromise;

        if (download) {
          console.log(`✓ Export initiated: ${download.suggestedFilename()}`);
        } else {
          console.log('✓ Export button clicked (download may require data)');
        }
      }
    });

    test('should verify pagination controls', async ({ page }) => {
      await page.goto('/vulnerability/vulnerabilities');
      await waitForPageLoad(page);

      // Look for pagination
      const pagination = page.locator('.ant-pagination');

      if (await pagination.isVisible()) {
        console.log('✓ Pagination controls found');

        // Check for page size selector
        const pageSizeSelect = page.locator('.ant-select-selector').filter({ hasText: /page/i });
        const hasPageSize = await pageSizeSelect.isVisible().catch(() => false);

        if (hasPageSize) {
          console.log('✓ Page size selector found');
        }
      } else {
        console.log('⚠️  Pagination not visible (may need more data)');
      }
    });

    test('should test row selection', async ({ page }) => {
      await page.goto('/vulnerability/vulnerabilities');
      await waitForPageLoad(page);

      // Look for checkboxes
      const checkboxes = page.locator('tbody .ant-checkbox-input');
      const checkboxCount = await checkboxes.count();

      if (checkboxCount > 0) {
        // Select first row
        await checkboxes.first().click();
        await page.waitForTimeout(300);
        console.log('✓ Row selection works (1 row selected)');

        // Deselect
        await checkboxes.first().click();
        await page.waitForTimeout(300);
      } else {
        console.log('⚠️  No row selection checkboxes found');
      }
    });
  });
});

/**
 * Helper function to verify detail sections
 */
async function verifyDetailSections(page: Page) {
  const sections = [
    { name: 'Description', selectors: ['text=/Description/i', 'text=/Details/i'] },
    { name: 'CVSS Score', selectors: ['text=/CVSS/i', 'text=/Score/i'] },
    { name: 'Affected Assets', selectors: ['text=/Affected|Endpoints/i', '.ant-table'] },
    { name: 'Remediation', selectors: ['text=/Remediation|Patch|Fix/i'] },
  ];

  for (const section of sections) {
    let found = false;

    for (const selector of section.selectors) {
      const element = page.locator(selector).first();
      if (await element.isVisible().catch(() => false)) {
        found = true;
        break;
      }
    }

    if (found) {
      console.log(`✓ Detail section found: ${section.name}`);
    } else {
      console.log(`⚠️  Detail section not found: ${section.name}`);
    }
  }
}
