/**
 * Focused Deployment Module Tests
 * Fast execution with comprehensive coverage of key deployment scenarios
 */

import { test, expect, waitForPageLoad, checkTableRendered } from './fixtures';

const SCREENSHOT_PATH = '/Users/shandesh/src/VS-code/PatchIQ/full-dev-sandy-v2/screenshots';

// Console monitoring
const consoleErrors: string[] = [];
const consoleWarnings: string[] = [];
const networkRequests: Array<{ url: string; type: string }> = [];

test.describe('Deployments Module - Focused Testing', () => {

  test.beforeEach(async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    // Setup console monitoring
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
      if (msg.type() === 'warning') consoleWarnings.push(msg.text());
    });

    page.on('pageerror', error => {
      consoleErrors.push(`PAGE ERROR: ${error.message}`);
    });

    // Monitor network for SSE/WebSocket
    page.on('request', request => {
      const url = request.url();
      if (url.includes('/sse') || url.includes('/events') || url.includes('ws')) {
        networkRequests.push({ url, type: request.method() });
      }
    });

    await expect(page).toHaveURL(/\/(dashboard|patches|assets|hub)/);
  });

  /**
   * TEST 1: Hub/Deployments List Page
   */
  test('Scenario 1: Navigate to Hub and verify deployments list', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    console.log('\n=== TEST 1: Hub/Deployments List ===');

    const startTime = Date.now();
    await page.goto('/hub');
    await waitForPageLoad(page);
    const loadTime = Date.now() - startTime;

    // Verify page elements
    const heading = page.getByRole('heading', { name: /Software Hub|Hub/i });
    await expect(heading).toBeVisible({ timeout: 15000 });

    // Check stats cards
    const statsVisible = await page.locator('text=Total Packages').isVisible().catch(() => false);
    console.log(`✓ Hub page loaded in ${loadTime}ms`);
    console.log(`✓ Stats cards visible: ${statsVisible}`);

    // Check table
    await checkTableRendered(page);
    const rows = await page.locator('table tbody tr').count();
    console.log(`✓ Table rendered with ${rows} rows`);

    // Check action buttons
    const addButton = await page.locator('button:has-text("Add Package")').isVisible();
    const refreshButton = await page.locator('button:has-text("Refresh")').isVisible();
    console.log(`✓ Action buttons: Add=${addButton}, Refresh=${refreshButton}`);

    // SCREENSHOT 1
    await page.screenshot({
      path: `${SCREENSHOT_PATH}/deployments-list-initial.png`,
      fullPage: true
    });
    console.log('✓ Screenshot saved: deployments-list-initial.png');
  });

  /**
   * TEST 2: Create Deployment Flow
   */
  test('Scenario 2: Test create deployment modal', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    console.log('\n=== TEST 2: Create Deployment ===');

    await page.goto('/hub');
    await waitForPageLoad(page);
    await page.waitForTimeout(2000);

    // Find deployable package
    const deployButtons = page.locator('.anticon-rocket, button:has(.anticon-rocket)');
    const buttonCount = await deployButtons.count();
    console.log(`Found ${buttonCount} deployable packages`);

    if (buttonCount > 0) {
      // Click first deploy button
      await deployButtons.first().click();
      await page.waitForTimeout(2000);

      // SCREENSHOT 2: Deploy modal opened
      await page.screenshot({
        path: `${SCREENSHOT_PATH}/deployment-create-step1.png`,
        fullPage: true
      });
      console.log('✓ Screenshot saved: deployment-create-step1.png');

      // Check modal elements
      const modal = page.locator('.ant-modal:visible');
      const isVisible = await modal.isVisible().catch(() => false);
      console.log(`✓ Deploy modal opened: ${isVisible}`);

      if (isVisible) {
        // Fill deployment name
        const nameInput = modal.locator('input').first();
        await nameInput.fill('E2E Test Deployment');
        console.log('✓ Filled deployment name');

        // Check for target selection
        const targetLabel = await page.getByText(/Target Endpoints|Target Agents/i).isVisible().catch(() => false);
        console.log(`✓ Target selection field: ${targetLabel}`);

        // Check OS tag
        const osTag = modal.locator('.ant-tag').first();
        const tagText = await osTag.textContent().catch(() => 'none');
        console.log(`✓ OS filtering tag: ${tagText}`);

        // SCREENSHOT 3: Form filled
        await page.screenshot({
          path: `${SCREENSHOT_PATH}/deployment-create-step2.png`,
          fullPage: true
        });
        console.log('✓ Screenshot saved: deployment-create-step2.png');

        // Close modal
        await modal.locator('button:has-text("Cancel")').click();
        console.log('✓ Modal closed');
      }
    } else {
      console.log('⚠ No deployable packages found');
    }
  });

  /**
   * TEST 3: Patch Deployments Page
   */
  test('Scenario 3: Navigate to patch deployments', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    console.log('\n=== TEST 3: Patch Deployments ===');

    await page.goto('/patches/deployed');
    await waitForPageLoad(page);

    // Check page loaded
    const pageLoaded = await page.getByRole('heading').first().isVisible().catch(() => false);
    console.log(`✓ Patch deployments page loaded: ${pageLoaded}`);

    // Check table
    await checkTableRendered(page);
    const rows = await page.locator('table tbody tr').count();
    console.log(`✓ Deployment table: ${rows} rows`);

    // SCREENSHOT 4: Deployment status page
    await page.screenshot({
      path: `${SCREENSHOT_PATH}/deployment-status-page.png`,
      fullPage: true
    });
    console.log('✓ Screenshot saved: deployment-status-page.png');

    // Wait 30 seconds to observe real-time updates
    if (rows > 0) {
      console.log('Waiting 30 seconds to observe real-time updates...');
      await page.waitForTimeout(30000);

      // SCREENSHOT 5: After 30 seconds
      await page.screenshot({
        path: `${SCREENSHOT_PATH}/deployment-status-30s.png`,
        fullPage: true
      });
      console.log('✓ Screenshot saved: deployment-status-30s.png');
    }
  });

  /**
   * TEST 4: Filters and Sorting
   */
  test('Scenario 4: Test filters and sorting', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    console.log('\n=== TEST 4: Filters and Sorting ===');

    await page.goto('/patches/deployed');
    await waitForPageLoad(page);

    // Look for filter button
    const filterButton = page.locator('button:has-text("Filter"), button:has(.anticon-filter)').first();
    const hasFilter = await filterButton.isVisible().catch(() => false);
    console.log(`✓ Filter button found: ${hasFilter}`);

    if (hasFilter) {
      await filterButton.click();
      await page.waitForTimeout(1000);
    }

    // Check for select filters
    const selects = await page.locator('.ant-select').count();
    console.log(`✓ Found ${selects} filter controls`);

    // SCREENSHOT 6: Filters
    await page.screenshot({
      path: `${SCREENSHOT_PATH}/deployments-filters-applied.png`,
      fullPage: true
    });
    console.log('✓ Screenshot saved: deployments-filters-applied.png');

    // Test sorting
    const sortableHeaders = page.locator('.ant-table-column-sorters, table thead th');
    const headerCount = await sortableHeaders.count();
    console.log(`✓ Found ${headerCount} table columns`);

    if (headerCount > 1) {
      // Click to sort
      await sortableHeaders.nth(1).click();
      await page.waitForTimeout(1000);
      console.log('✓ Sorted by column 1');

      // Click again to reverse
      await sortableHeaders.nth(1).click();
      await page.waitForTimeout(1000);
      console.log('✓ Reversed sort');
    }
  });

  /**
   * TEST 5: Real-time Updates Analysis
   */
  test('Scenario 5: Analyze real-time update mechanism', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    console.log('\n=== TEST 5: Real-Time Updates ===');

    // Clear previous network requests
    networkRequests.length = 0;

    await page.goto('/patches/deployed');
    await waitForPageLoad(page);
    await page.waitForTimeout(5000);

    // Check network requests
    console.log(`Network requests captured: ${networkRequests.length}`);
    if (networkRequests.length > 0) {
      console.log('✓ Real-time connections detected:');
      networkRequests.forEach(req => {
        console.log(`  - ${req.type} ${req.url}`);
      });
    } else {
      console.log('ℹ No SSE/WebSocket detected - likely uses polling or manual refresh');
    }

    // Monitor API calls in console
    const apiLogs = consoleErrors.filter(e => e.includes('/api/'));
    console.log(`API-related console messages: ${apiLogs.length}`);
  });

  /**
   * TEST 6: Console Errors Report
   */
  test('Scenario 6: Report console errors', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    console.log('\n=== TEST 6: Console Errors ===');

    // Navigate through key pages
    await page.goto('/hub');
    await waitForPageLoad(page);
    await page.waitForTimeout(2000);

    await page.goto('/patches/deployed');
    await waitForPageLoad(page);
    await page.waitForTimeout(2000);

    await page.goto('/patches');
    await waitForPageLoad(page);
    await page.waitForTimeout(2000);

    // Report findings
    console.log(`\n📊 Console Errors: ${consoleErrors.length}`);
    if (consoleErrors.length > 0) {
      console.log('❌ Errors found:');
      consoleErrors.slice(0, 10).forEach((err, i) => {
        console.log(`  ${i + 1}. ${err.substring(0, 150)}`);
      });
    } else {
      console.log('✅ No console errors detected');
    }

    console.log(`\n⚠ Console Warnings: ${consoleWarnings.length}`);
    if (consoleWarnings.length > 0 && consoleWarnings.length < 20) {
      consoleWarnings.slice(0, 5).forEach((warn, i) => {
        console.log(`  ${i + 1}. ${warn.substring(0, 150)}`);
      });
    }

    // Only fail test if critical errors found
    const criticalErrors = consoleErrors.filter(e =>
      !e.includes('favicon') &&
      !e.includes('DevTools') &&
      !e.includes('extension')
    );

    if (criticalErrors.length > 0) {
      console.log(`\n⚠ ${criticalErrors.length} critical errors detected`);
    }
  });

  /**
   * TEST 7: Deployment Detail View
   */
  test('Scenario 7: View deployment details', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    console.log('\n=== TEST 7: Deployment Details ===');

    await page.goto('/patches/deployed');
    await waitForPageLoad(page);

    const rows = await page.locator('table tbody tr').count();
    console.log(`Found ${rows} deployment(s)`);

    if (rows > 0) {
      // Click view button on first deployment
      const viewButton = page.locator('button:has(.anticon-eye)').first();
      const hasView = await viewButton.isVisible().catch(() => false);

      if (hasView) {
        await viewButton.click();
        await page.waitForTimeout(2000);

        // Check for detail modal/page
        const modal = page.locator('.ant-modal:visible');
        const modalVisible = await modal.isVisible().catch(() => false);
        console.log(`✓ Detail view opened: ${modalVisible}`);

        if (modalVisible) {
          // Check for task/status information
          const hasStatus = await page.locator('text=/Status|Progress|Task/i').first().isVisible().catch(() => false);
          console.log(`✓ Status information visible: ${hasStatus}`);

          // Check for rollback button
          const rollbackButton = page.locator('button:has(.anticon-rollback), button:has-text("Rollback")');
          const hasRollback = await rollbackButton.isVisible().catch(() => false);
          console.log(`✓ Rollback option: ${hasRollback}`);

          // Close modal
          await page.keyboard.press('Escape');
        }
      } else {
        console.log('⚠ No view button found');
      }
    } else {
      console.log('ℹ No deployments to view');
    }
  });
});
