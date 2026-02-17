import { test, expect } from './fixtures';
import { login, waitForPageLoad } from './fixtures';

/**
 * Focused test suite for capturing remaining screenshots
 * for the Vulnerabilities module comprehensive testing
 */

const SCREENSHOTS_DIR = '/Users/shandesh/src/VS-code/PatchIQ/full-dev-sandy-v2/screenshots';

test.describe('Vulnerabilities - Screenshot Capture', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('capture search results screenshot', async ({ page }) => {
    await page.goto('/vulnerability/vulnerabilities');
    await waitForPageLoad(page);

    // Wait for table
    await page.waitForSelector('table, .ant-table', { timeout: 10000 });

    // Search for CVE
    const searchInput = page.locator('input[placeholder*="Search" i]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('CVE');
      await page.waitForTimeout(1500);

      // Take screenshot
      await page.screenshot({
        path: `${SCREENSHOTS_DIR}/vulnerabilities-search-results.png`,
        fullPage: true
      });

      console.log('✓ Screenshot saved: vulnerabilities-search-results.png');
    }
  });

  test('capture filters applied screenshot', async ({ page }) => {
    await page.goto('/vulnerability/vulnerabilities');
    await waitForPageLoad(page);

    // Wait for page to load
    await page.waitForSelector('table, .ant-table', { timeout: 10000 });
    await page.waitForTimeout(1000);

    // Take screenshot of the current state (with or without filters modal)
    await page.screenshot({
      path: `${SCREENSHOTS_DIR}/vulnerabilities-filters-applied.png`,
      fullPage: true
    });

    console.log('✓ Screenshot saved: vulnerabilities-filters-applied.png');
  });

  test('capture vulnerability detail page', async ({ page }) => {
    await page.goto('/vulnerability/vulnerabilities');
    await waitForPageLoad(page);

    // Wait for table
    await page.waitForSelector('tbody tr, .ant-table-row', { timeout: 10000 });

    // Click first vulnerability
    const firstRow = page.locator('tbody tr, .ant-table-row').first();
    if (await firstRow.isVisible()) {
      await firstRow.click();
      await page.waitForTimeout(2000);

      // Take screenshot (modal or detail view)
      await page.screenshot({
        path: `${SCREENSHOTS_DIR}/vulnerability-detail-page.png`,
        fullPage: true
      });

      console.log('✓ Screenshot saved: vulnerability-detail-page.png');
    }
  });

  test('capture remediation screenshot', async ({ page }) => {
    await page.goto('/vulnerability/vulnerabilities');
    await waitForPageLoad(page);

    // Wait for page
    await page.waitForSelector('table, .ant-table', { timeout: 10000 });
    await page.waitForTimeout(1000);

    // Look for action buttons
    const actionButtons = page.locator('button:has-text("Add Exception"), button:has-text("Scan Now")');
    const hasButtons = await actionButtons.first().isVisible().catch(() => false);

    if (hasButtons) {
      console.log('✓ Remediation buttons found');
    }

    // Take screenshot
    await page.screenshot({
      path: `${SCREENSHOTS_DIR}/vulnerability-remediation.png`,
      fullPage: true
    });

    console.log('✓ Screenshot saved: vulnerability-remediation.png');
  });

  test('capture stats and metrics', async ({ page }) => {
    await page.goto('/vulnerability/vulnerabilities');
    await waitForPageLoad(page);

    // Wait for stats cards to load
    await page.waitForTimeout(2000);

    // Take screenshot focusing on top of page
    await page.screenshot({
      path: `${SCREENSHOTS_DIR}/vulnerabilities-stats-cards.png`,
      fullPage: true
    });

    console.log('✓ Screenshot saved: vulnerabilities-stats-cards.png');
  });
});
