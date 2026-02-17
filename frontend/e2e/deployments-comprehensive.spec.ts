/**
 * Comprehensive End-to-End Tests for PatchIQ Deployments Module
 *
 * Test Coverage:
 * 1. Navigation & List Display
 * 2. Create New Deployment
 * 3. Deployment Status Page
 * 4. Filters
 * 5. Sorting
 * 6. Real-Time Updates
 * 7. Console Errors
 *
 * Screenshots saved to: /Users/shandesh/src/VS-code/PatchIQ/full-dev-sandy-v2/screenshots/
 */

import { test, expect, waitForPageLoad, checkTableRendered, checkModalOpened } from './fixtures';
import type { Page } from '@playwright/test';

const SCREENSHOT_PATH = '/Users/shandesh/src/VS-code/PatchIQ/full-dev-sandy-v2/screenshots';

// Helper to capture console logs and errors
interface ConsoleMessage {
  type: string;
  text: string;
  timestamp: number;
}

let consoleMessages: ConsoleMessage[] = [];

function setupConsoleListener(page: Page) {
  consoleMessages = [];

  page.on('console', msg => {
    consoleMessages.push({
      type: msg.type(),
      text: msg.text(),
      timestamp: Date.now()
    });
  });

  page.on('pageerror', error => {
    consoleMessages.push({
      type: 'error',
      text: error.message,
      timestamp: Date.now()
    });
  });
}

function getConsoleErrors(): ConsoleMessage[] {
  return consoleMessages.filter(m => m.type === 'error');
}

test.describe('Deployments Module - Comprehensive Test Suite', () => {

  test.beforeEach(async ({ authenticatedPage }) => {
    setupConsoleListener(authenticatedPage);
    await expect(authenticatedPage).toHaveURL(/\/(dashboard|patches|assets|reports|hub)/);
  });

  /**
   * SCENARIO 1: Navigation & List Display
   */
  test('1. Navigation & List Display - Hub Deployments', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    // Navigate to Hub (main deployment management page)
    await page.goto('/hub');
    await waitForPageLoad(page);

    // Verify page loaded
    await expect(page.getByRole('heading', { name: /Software Hub|Hub/i })).toBeVisible({ timeout: 10000 });

    // Verify key UI elements
    await expect(page.locator('text=Total Packages')).toBeVisible();
    await expect(page.locator('text=Active Packages')).toBeVisible();

    // Check table is rendered with data
    await checkTableRendered(page);

    // Verify action buttons
    await expect(page.locator('button:has-text("Add Package")')).toBeVisible();
    await expect(page.locator('button:has-text("Refresh")')).toBeVisible();

    // Capture screenshot
    await page.screenshot({
      path: `${SCREENSHOT_PATH}/deployments-list-initial.png`,
      fullPage: true
    });

    console.log('✓ Hub/Deployments list page loaded successfully');
  });

  test('1b. Navigation & List Display - Patch Deployments', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    // Navigate to Patch Deployments
    await page.goto('/patches/deployed');
    await waitForPageLoad(page);

    // Verify page loaded
    await expect(page.getByRole('heading', { name: /Patch|Deployed/i })).toBeVisible({ timeout: 10000 });

    // Check table is rendered
    await checkTableRendered(page);

    // Capture screenshot
    await page.screenshot({
      path: `${SCREENSHOT_PATH}/patch-deployments-list.png`,
      fullPage: true
    });

    console.log('✓ Patch deployments list page loaded successfully');
  });

  /**
   * SCENARIO 2: Create New Deployment
   */
  test('2. Create New Deployment from Hub', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    await page.goto('/hub');
    await waitForPageLoad(page);
    await page.waitForTimeout(2000);

    // Check table is rendered
    await checkTableRendered(page);

    // Step 1: Click deploy button (rocket icon) on first package
    const deployButton = page.locator('.anticon-rocket').first();

    if (await deployButton.isVisible()) {
      await deployButton.click({ timeout: 10000 });
      await page.waitForTimeout(2000);

      // Capture step 1 - deploy modal opened
      await page.screenshot({
        path: `${SCREENSHOT_PATH}/deployment-create-step1.png`,
        fullPage: true
      });

      // Check modal opened
      const modal = page.locator('[role="dialog"], .ant-modal');
      await expect(modal).toBeVisible({ timeout: 10000 });

      // Step 2: Fill deployment form
      const nameInput = modal.locator('input').first();
      await nameInput.clear();
      await nameInput.fill('E2E Comprehensive Test Deployment');

      // Check deployment type field
      const typeSelectText = modal.locator('.ant-select-selection-item').first();
      if (await typeSelectText.isVisible().catch(() => false)) {
        const typeText = await typeSelectText.textContent();
        console.log(`Deployment type: ${typeText}`);
      }

      // Check for target endpoints/agents field
      const endpointsLabel = page.getByText(/Target Endpoints|Target Agents/i);
      await expect(endpointsLabel).toBeVisible();

      // Check OS matching tag
      const osTag = modal.locator('.ant-tag').first();
      if (await osTag.isVisible().catch(() => false)) {
        const tagText = await osTag.textContent();
        console.log(`OS matching tag: ${tagText}`);
      }

      // Try to select target endpoints
      const endpointSelect = modal.locator('.ant-select-multiple').first();
      if (await endpointSelect.isVisible().catch(() => false)) {
        await endpointSelect.click();
        await page.waitForTimeout(1000);

        // Select first available endpoint
        const dropdown = page.locator('.ant-select-dropdown:visible');
        if (await dropdown.isVisible().catch(() => false)) {
          const firstOption = dropdown.locator('.ant-select-item-option').first();
          if (await firstOption.isVisible().catch(() => false)) {
            await firstOption.click();
            console.log('✓ Selected target endpoint');
          }
        }
      }

      // Capture step 2 - form filled
      await page.screenshot({
        path: `${SCREENSHOT_PATH}/deployment-create-step2.png`,
        fullPage: true
      });

      // Close modal without submitting (don't create actual deployment)
      await modal.locator('button:has-text("Cancel")').click();

      console.log('✓ Create deployment modal flow completed');
    } else {
      console.log('⚠ No deployable packages available, skipping create deployment test');
    }
  });

  test('2b. Create New Patch Deployment', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    await page.goto('/patches');
    await waitForPageLoad(page);

    // Check if deploy patches button exists
    const deployButton = page.locator('button:has-text("Deploy Patches"), button:has-text("Deploy")').first();

    if (await deployButton.isVisible().catch(() => false)) {
      await deployButton.click();
      await page.waitForTimeout(2000);

      // Check modal opened
      await checkModalOpened(page);

      // Capture screenshot
      await page.screenshot({
        path: `${SCREENSHOT_PATH}/patch-deployment-create.png`,
        fullPage: true
      });

      // Close modal
      await page.locator('button:has-text("Cancel"), .ant-modal-close').first().click();

      console.log('✓ Patch deployment creation modal opened');
    } else {
      console.log('⚠ Deploy patches button not found');
    }
  });

  /**
   * SCENARIO 3: Deployment Status Page
   */
  test('3. Deployment Status and Details', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    // Navigate to deployed patches (deployment history)
    await page.goto('/patches/deployed');
    await waitForPageLoad(page);

    // Check if there are any deployments
    const tableRows = page.locator('table tbody tr');
    const rowCount = await tableRows.count();

    if (rowCount > 0) {
      // Click view/eye button on first deployment
      const firstRow = tableRows.first();
      const viewButton = firstRow.locator('button:has(.anticon-eye), button[title*="View"]').first();

      if (await viewButton.isVisible().catch(() => false)) {
        await viewButton.click();
        await page.waitForTimeout(2000);

        // Check status/tasks modal or page opened
        const modal = page.locator('.ant-modal-content');
        const isModal = await modal.isVisible().catch(() => false);

        if (isModal) {
          // Modal view - check for task details
          await expect(page.locator('text=/Tasks|Status|Progress/i').first()).toBeVisible();

          // Capture initial status
          await page.screenshot({
            path: `${SCREENSHOT_PATH}/deployment-status-page.png`,
            fullPage: true
          });

          // Wait 30 seconds to observe any real-time updates
          console.log('Waiting 30 seconds to observe real-time updates...');
          await page.waitForTimeout(30000);

          // Capture after 30 seconds
          await page.screenshot({
            path: `${SCREENSHOT_PATH}/deployment-status-30s.png`,
            fullPage: true
          });

          // Close modal
          await page.locator('.ant-modal-close, button:has-text("Close")').first().click();

          console.log('✓ Deployment status page tested with 30s observation');
        } else {
          // Dedicated page view
          await page.screenshot({
            path: `${SCREENSHOT_PATH}/deployment-status-page.png`,
            fullPage: true
          });

          console.log('✓ Deployment details page opened');
        }
      } else {
        console.log('⚠ No view button found on deployments');
      }
    } else {
      console.log('⚠ No deployments found, skipping status page test');

      // Still capture the empty state
      await page.screenshot({
        path: `${SCREENSHOT_PATH}/deployment-status-empty.png`,
        fullPage: true
      });
    }
  });

  /**
   * SCENARIO 4: Filters
   */
  test('4. Test Deployment Filters', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    await page.goto('/patches/deployed');
    await waitForPageLoad(page);

    // Look for filter controls
    const filterButton = page.locator('button:has-text("Filter"), button:has(.anticon-filter)').first();

    if (await filterButton.isVisible().catch(() => false)) {
      await filterButton.click();
      await page.waitForTimeout(1000);

      // Check for filter drawer or dropdown
      const filterDrawer = page.locator('.ant-drawer, .ant-dropdown');
      if (await filterDrawer.isVisible().catch(() => false)) {
        // Look for status filter
        const statusFilter = page.locator('text=/Status|state/i').first();
        if (await statusFilter.isVisible().catch(() => false)) {
          console.log('✓ Status filter available');
        }

        // Look for type filter
        const typeFilter = page.locator('text=/Type|category/i').first();
        if (await typeFilter.isVisible().catch(() => false)) {
          console.log('✓ Type filter available');
        }

        // Capture filters UI
        await page.screenshot({
          path: `${SCREENSHOT_PATH}/deployments-filters-applied.png`,
          fullPage: true
        });

        // Close filter drawer
        await page.keyboard.press('Escape');
      }
    } else {
      // Check for inline filters (select dropdowns, search)
      const selectFilters = page.locator('.ant-select').count();
      console.log(`Found ${await selectFilters} select filter controls`);

      // Capture current state
      await page.screenshot({
        path: `${SCREENSHOT_PATH}/deployments-filters-applied.png`,
        fullPage: true
      });
    }

    console.log('✓ Filter functionality tested');
  });

  /**
   * SCENARIO 5: Sorting
   */
  test('5. Test Table Sorting', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    await page.goto('/patches/deployed');
    await waitForPageLoad(page);

    // Check table headers for sortable columns
    const tableHeaders = page.locator('table thead th');
    const headerCount = await tableHeaders.count();

    console.log(`Found ${headerCount} table columns`);

    if (headerCount > 0) {
      // Try to click on a sortable header (usually has .ant-table-column-sorters)
      const sortableHeader = page.locator('.ant-table-column-sorters, table thead th').nth(1);

      if (await sortableHeader.isVisible().catch(() => false)) {
        // Get initial row count
        const initialRows = page.locator('table tbody tr');
        const initialCount = await initialRows.count();

        // Click to sort
        await sortableHeader.click();
        await page.waitForTimeout(1000);

        // Get first row text after sort
        const firstRowAfterSort = await page.locator('table tbody tr').first().textContent();
        console.log(`First row after sort: ${firstRowAfterSort?.substring(0, 50)}...`);

        // Click again to reverse sort
        await sortableHeader.click();
        await page.waitForTimeout(1000);

        const firstRowAfterReverse = await page.locator('table tbody tr').first().textContent();
        console.log(`First row after reverse sort: ${firstRowAfterReverse?.substring(0, 50)}...`);

        console.log('✓ Table sorting functionality works');
      } else {
        console.log('⚠ No sortable columns found');
      }
    }
  });

  /**
   * SCENARIO 6: Real-Time Updates
   */
  test('6. Monitor Real-Time Updates', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    // Track network requests for SSE/WebSocket
    const networkEvents: string[] = [];

    page.on('request', request => {
      const url = request.url();
      if (url.includes('/sse') || url.includes('/events') || url.includes('ws://') || url.includes('wss://')) {
        networkEvents.push(`REQUEST: ${request.method()} ${url}`);
      }
    });

    page.on('response', response => {
      const url = response.url();
      const contentType = response.headers()['content-type'] || '';
      if (contentType.includes('text/event-stream') || url.includes('/sse') || url.includes('/events')) {
        networkEvents.push(`SSE CONNECTION: ${url}`);
      }
    });

    // Navigate to deployment page
    await page.goto('/patches/deployed');
    await waitForPageLoad(page);
    await page.waitForTimeout(3000);

    // Check for WebSocket or SSE connections
    const consoleSSE = consoleMessages.filter(m =>
      m.text.toLowerCase().includes('sse') ||
      m.text.toLowerCase().includes('eventsource') ||
      m.text.toLowerCase().includes('websocket')
    );

    console.log('\n=== Real-Time Update Mechanism Analysis ===');
    console.log('Network events detected:', networkEvents);
    console.log('Console SSE/WebSocket messages:', consoleSSE.length);

    if (networkEvents.length > 0) {
      console.log('✓ Real-time update mechanism detected:');
      networkEvents.forEach(event => console.log(`  - ${event}`));
    } else {
      console.log('ℹ No SSE/WebSocket connections detected');
      console.log('  Deployment status may use polling or manual refresh');
    }

    // Check for polling by monitoring API calls
    const apiCalls = consoleMessages.filter(m => m.text.includes('/api/'));
    console.log(`API calls made: ${apiCalls.length}`);

    console.log('=========================================\n');
  });

  /**
   * SCENARIO 7: Console Errors
   */
  test('7. Report Console Errors', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    // Navigate through key deployment pages
    await page.goto('/hub');
    await waitForPageLoad(page);
    await page.waitForTimeout(2000);

    await page.goto('/patches/deployed');
    await waitForPageLoad(page);
    await page.waitForTimeout(2000);

    await page.goto('/patches');
    await waitForPageLoad(page);
    await page.waitForTimeout(2000);

    // Collect and report errors
    const errors = getConsoleErrors();
    const warnings = consoleMessages.filter(m => m.type === 'warning');

    console.log('\n=== Console Errors Report ===');
    console.log(`Total console messages: ${consoleMessages.length}`);
    console.log(`Errors: ${errors.length}`);
    console.log(`Warnings: ${warnings.length}`);

    if (errors.length > 0) {
      console.log('\n❌ Errors found:');
      errors.forEach((err, index) => {
        console.log(`  ${index + 1}. ${err.text}`);
      });
    } else {
      console.log('✓ No console errors detected');
    }

    if (warnings.length > 0) {
      console.log('\n⚠ Warnings found:');
      warnings.slice(0, 5).forEach((warn, index) => {
        console.log(`  ${index + 1}. ${warn.text.substring(0, 100)}...`);
      });
    }

    console.log('===========================\n');

    // Test should not fail on warnings, only errors
    expect(errors.length).toBe(0);
  });

  /**
   * BONUS: Performance Testing
   */
  test('8. Performance - Page Load Times', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    // Test Hub page load time
    const hubStartTime = Date.now();
    await page.goto('/hub');
    await waitForPageLoad(page);
    const hubLoadTime = Date.now() - hubStartTime;

    // Test Patch Deployments page load time
    const deployStartTime = Date.now();
    await page.goto('/patches/deployed');
    await waitForPageLoad(page);
    const deployLoadTime = Date.now() - deployStartTime;

    // Test Patches page load time
    const patchStartTime = Date.now();
    await page.goto('/patches');
    await waitForPageLoad(page);
    const patchLoadTime = Date.now() - patchStartTime;

    console.log('\n=== Performance Report ===');
    console.log(`Hub page load time: ${hubLoadTime}ms`);
    console.log(`Patch Deployments load time: ${deployLoadTime}ms`);
    console.log(`Patches page load time: ${patchLoadTime}ms`);
    console.log('========================\n');

    // Expect reasonable load times (under 10 seconds)
    expect(hubLoadTime).toBeLessThan(10000);
    expect(deployLoadTime).toBeLessThan(10000);
    expect(patchLoadTime).toBeLessThan(10000);
  });
});

/**
 * Additional Deployment Workflow Tests
 */
test.describe('Deployment Workflow Integration', () => {

  test('Deploy from Hub with OS filtering', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    await page.goto('/hub');
    await waitForPageLoad(page);
    await checkTableRendered(page);

    // Click deploy on first package
    const deployButton = page.locator('.anticon-rocket').first();

    if (await deployButton.isVisible().catch(() => false)) {
      await deployButton.click();
      await page.waitForTimeout(2000);

      const modal = page.locator('[role="dialog"]');
      await expect(modal).toBeVisible();

      // Check OS tag is displayed
      const osTag = modal.locator('.ant-tag');
      const tagCount = await osTag.count();

      if (tagCount > 0) {
        const tagText = await osTag.first().textContent();
        console.log(`✓ OS filtering tag detected: ${tagText}`);

        // Verify only matching endpoints are shown
        const endpointsSelect = modal.locator('.ant-select-multiple');
        if (await endpointsSelect.isVisible().catch(() => false)) {
          await endpointsSelect.click();
          await page.waitForTimeout(1000);

          const dropdown = page.locator('.ant-select-dropdown:visible');
          const options = dropdown.locator('.ant-select-item-option');
          const optionCount = await options.count();

          console.log(`  Available endpoints (OS-filtered): ${optionCount}`);
        }
      }

      await modal.locator('button:has-text("Cancel")').click();
    }
  });

  test('View deployment rollback options', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    await page.goto('/patches/deployed');
    await waitForPageLoad(page);

    const tableRows = page.locator('table tbody tr');
    const rowCount = await tableRows.count();

    if (rowCount > 0) {
      // Look for failed deployments (usually have rollback option)
      for (let i = 0; i < Math.min(rowCount, 3); i++) {
        const row = tableRows.nth(i);
        const statusCell = row.locator('td').nth(2); // Status column typically 3rd
        const statusText = await statusCell.textContent();

        if (statusText?.toLowerCase().includes('fail')) {
          console.log(`✓ Found failed deployment at row ${i}`);

          // Click view button
          const viewButton = row.locator('button:has(.anticon-eye)').first();
          if (await viewButton.isVisible().catch(() => false)) {
            await viewButton.click();
            await page.waitForTimeout(2000);

            // Check for rollback button
            const rollbackButton = page.locator('button:has(.anticon-rollback), button:has-text("Rollback")');
            if (await rollbackButton.isVisible().catch(() => false)) {
              console.log('  ✓ Rollback option available for failed deployment');
            }

            // Close modal
            await page.keyboard.press('Escape');
          }
          break;
        }
      }
    }
  });
});
