/**
 * Phase 2 Agent 9: Patch Deployment Workflows End-to-End Test Suite
 *
 * Mission: Test complete patch deployment workflow including:
 * 1. Deployment creation from patches list
 * 2. Deployment form (asset selection, scheduling)
 * 3. Real-time deployment status monitoring (SSE/polling)
 * 4. Cancel and Retry operations
 * 5. Deployment detail view with task status
 *
 * Context: Phase 1 found issues in Patches module (missing detail navigation, API errors)
 * This test focuses on deployment workflows with workarounds for known issues
 */

import { test, expect, waitForPageLoad, checkTableRendered, checkModalOpened } from './fixtures';
import type { Page } from '@playwright/test';

const SCREENSHOT_DIR = '/Users/shandesh/src/VS-code/PatchIQ/full-dev-sandy-v2/screenshots/phase2-agent9';

// Track console messages and network events
interface ConsoleMessage {
  type: string;
  text: string;
  timestamp: number;
  location?: string;
}

interface NetworkEvent {
  type: 'request' | 'response' | 'sse' | 'polling';
  url: string;
  method?: string;
  status?: number;
  timestamp: number;
  contentType?: string;
}

interface PerformanceMetric {
  operation: string;
  duration: number;
  timestamp: number;
}

let consoleMessages: ConsoleMessage[] = [];
let networkEvents: NetworkEvent[] = [];
let performanceMetrics: PerformanceMetric[] = [];

function setupMonitoring(page: Page) {
  consoleMessages = [];
  networkEvents = [];
  performanceMetrics = [];

  // Console monitoring
  page.on('console', msg => {
    consoleMessages.push({
      type: msg.type(),
      text: msg.text(),
      timestamp: Date.now(),
      location: msg.location()?.url,
    });
  });

  page.on('pageerror', error => {
    consoleMessages.push({
      type: 'pageerror',
      text: error.message,
      timestamp: Date.now(),
    });
  });

  // Network monitoring
  page.on('request', request => {
    const url = request.url();
    networkEvents.push({
      type: 'request',
      url,
      method: request.method(),
      timestamp: Date.now(),
    });

    // Track polling requests
    if (url.includes('/deployments') && request.method() === 'GET') {
      networkEvents.push({
        type: 'polling',
        url,
        method: request.method(),
        timestamp: Date.now(),
      });
    }
  });

  page.on('response', response => {
    const url = response.url();
    const contentType = response.headers()['content-type'] || '';

    networkEvents.push({
      type: 'response',
      url,
      status: response.status(),
      timestamp: Date.now(),
      contentType,
    });

    // Detect SSE connections
    if (contentType.includes('text/event-stream')) {
      networkEvents.push({
        type: 'sse',
        url,
        timestamp: Date.now(),
        contentType,
      });
    }
  });
}

function getConsoleErrors(): ConsoleMessage[] {
  return consoleMessages.filter(m => m.type === 'error' || m.type === 'pageerror');
}

function getConsoleWarnings(): ConsoleMessage[] {
  return consoleMessages.filter(m => m.type === 'warning');
}

function getSSEConnections(): NetworkEvent[] {
  return networkEvents.filter(e => e.type === 'sse');
}

function getPollingRequests(url: string): NetworkEvent[] {
  return networkEvents.filter(e =>
    e.type === 'polling' && e.url.includes(url)
  );
}

function getAPIErrors(): NetworkEvent[] {
  return networkEvents.filter(e =>
    e.type === 'response' && e.status && e.status >= 400
  );
}

function calculatePollingInterval(url: string): number | null {
  const pollingReqs = getPollingRequests(url);
  if (pollingReqs.length < 2) return null;

  const intervals: number[] = [];
  for (let i = 1; i < pollingReqs.length; i++) {
    intervals.push(pollingReqs[i].timestamp - pollingReqs[i - 1].timestamp);
  }

  return intervals.length > 0
    ? Math.round(intervals.reduce((a, b) => a + b, 0) / intervals.length)
    : null;
}

function recordPerformance(operation: string, startTime: number) {
  performanceMetrics.push({
    operation,
    duration: Date.now() - startTime,
    timestamp: Date.now(),
  });
}

test.describe('Phase 2 Agent 9: Patch Deployment Workflows', () => {

  test.beforeEach(async ({ authenticatedPage }) => {
    setupMonitoring(authenticatedPage);
    await expect(authenticatedPage).toHaveURL(/\/(dashboard|patches|assets|reports|hub)/);
  });

  /**
   * TEST 1: Navigate to Patches and Attempt Deployment Creation
   */
  test('Test 1: Navigate to Patches and Find Deployment Creation', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    const startTime = Date.now();

    console.log('\n=== TEST 1: Navigate to Patches and Find Deployment Creation ===');

    // Navigate to patches
    await page.goto('/patches');
    await waitForPageLoad(page);

    // Capture initial patches page
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/patches-list-${Date.now()}.png`,
      fullPage: true,
    });

    // Check if patches list is visible
    await checkTableRendered(page);
    console.log('✓ Patches table rendered');

    // Look for deploy button
    const deployButton = page.locator('button:has-text("Deploy"), button:has-text("Deploy Patches")').first();
    const deployButtonExists = await deployButton.isVisible().catch(() => false);

    console.log(`Deploy button visible: ${deployButtonExists}`);

    // Try clicking on a patch row (Phase 1 known issue)
    const tableRows = page.locator('table tbody tr');
    const rowCount = await tableRows.count();
    console.log(`Patch table rows: ${rowCount}`);

    if (rowCount > 0) {
      const firstRow = tableRows.first();

      // Check if row is clickable
      const rowClickable = await firstRow.locator('a, button').count();
      console.log(`Clickable elements in first row: ${rowClickable}`);

      // Try to find detail link
      const detailLink = firstRow.locator('a[href*="/patches/"]');
      const detailLinkExists = await detailLink.isVisible().catch(() => false);
      console.log(`Detail link in row: ${detailLinkExists}`);
    }

    recordPerformance('Navigate to Patches', startTime);

    console.log('✓ Test 1 Complete: Navigation and button discovery');
    console.log('=========================================================\n');
  });

  /**
   * TEST 2: Alternative - Direct Deployment Page Access
   */
  test('Test 2: Find Deployment Pages via Direct Routes', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    console.log('\n=== TEST 2: Find Deployment Pages via Direct Routes ===');

    const routes = [
      '/patches/deployed',
      '/deployments',
      '/jobs/software-jobs/deployed',
      '/hub',
    ];

    const workingRoutes: string[] = [];

    for (const route of routes) {
      console.log(`\nTrying route: ${route}`);

      try {
        await page.goto(route);
        await waitForPageLoad(page);
        await page.waitForTimeout(2000);

        // Check if page loaded successfully
        const heading = page.locator('h1, h2, h3').first();
        const headingText = await heading.textContent().catch(() => 'No heading');

        console.log(`  Page loaded: ${headingText}`);

        // Look for deployment-related content
        const hasTable = await page.locator('table').isVisible().catch(() => false);
        const hasDeploymentText = await page.locator('text=/deploy|deployment/i').count();

        console.log(`  Has table: ${hasTable}`);
        console.log(`  Deployment references: ${hasDeploymentText}`);

        if (hasTable || hasDeploymentText > 0) {
          workingRoutes.push(route);

          // Capture screenshot
          await page.screenshot({
            path: `${SCREENSHOT_DIR}/deployments-page-${route.replace(/\//g, '-')}-${Date.now()}.png`,
            fullPage: true,
          });
        }
      } catch (error) {
        console.log(`  ✗ Route failed: ${error}`);
      }
    }

    console.log(`\n✓ Working deployment routes: ${workingRoutes.join(', ')}`);
    console.log('=========================================================\n');
  });

  /**
   * TEST 3: Deployment Creation Form
   */
  test('Test 3: Deployment Creation Form', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    const startTime = Date.now();

    console.log('\n=== TEST 3: Deployment Creation Form ===');

    // Try Hub first (most reliable for deployments)
    await page.goto('/hub');
    await waitForPageLoad(page);
    await page.waitForTimeout(2000);

    // Check if table has packages
    await checkTableRendered(page);

    // Click deploy button on first package
    const deployButton = page.locator('.anticon-rocket, button:has(.anticon-rocket)').first();
    const deployButtonVisible = await deployButton.isVisible().catch(() => false);

    if (deployButtonVisible) {
      console.log('✓ Deploy button found');

      await deployButton.click();
      await page.waitForTimeout(2000);

      // Check if modal opened
      const modal = page.locator('[role="dialog"], .ant-modal');
      const modalVisible = await modal.isVisible().catch(() => false);

      if (modalVisible) {
        console.log('✓ Deployment creation modal opened');

        // Document form fields
        const formFields: Record<string, boolean> = {};

        formFields['Deployment Name'] = await modal.locator('text=/deployment name/i').isVisible().catch(() => false);
        formFields['Deployment Type'] = await modal.locator('text=/deployment type/i').isVisible().catch(() => false);
        formFields['Target Endpoints'] = await modal.locator('text=/target endpoints|target agents/i').isVisible().catch(() => false);
        formFields['Schedule'] = await modal.locator('text=/schedule|timing/i').isVisible().catch(() => false);
        formFields['OS Tag'] = await modal.locator('.ant-tag').isVisible().catch(() => false);

        console.log('\nForm Fields:');
        Object.entries(formFields).forEach(([field, visible]) => {
          console.log(`  ${field}: ${visible ? '✓' : '✗'}`);
        });

        // Fill the form
        const nameInput = modal.locator('input').first();
        await nameInput.clear();
        await nameInput.fill('Phase2-Agent9-Test-Deployment');
        console.log('✓ Filled deployment name');

        // Capture form screenshot
        await page.screenshot({
          path: `${SCREENSHOT_DIR}/deployment-form-filled-${Date.now()}.png`,
          fullPage: true,
        });

        // Try to select target endpoints
        const endpointSelect = modal.locator('.ant-select-multiple').first();
        const selectVisible = await endpointSelect.isVisible().catch(() => false);

        if (selectVisible) {
          await endpointSelect.click();
          await page.waitForTimeout(1000);

          const dropdown = page.locator('.ant-select-dropdown:visible');
          const dropdownVisible = await dropdown.isVisible().catch(() => false);

          if (dropdownVisible) {
            const options = dropdown.locator('.ant-select-item-option');
            const optionCount = await options.count();
            console.log(`✓ Available target options: ${optionCount}`);

            if (optionCount > 0) {
              // Select up to 3 targets
              const selectCount = Math.min(3, optionCount);
              for (let i = 0; i < selectCount; i++) {
                await options.nth(i).click();
                await page.waitForTimeout(500);
              }
              console.log(`✓ Selected ${selectCount} target endpoints`);

              // Close dropdown
              await page.keyboard.press('Escape');
            }
          }
        }

        // Capture after target selection
        await page.screenshot({
          path: `${SCREENSHOT_DIR}/deployment-form-targets-selected-${Date.now()}.png`,
          fullPage: true,
        });

        // Look for schedule options
        const scheduleSection = modal.locator('text=/schedule|immediate/i');
        const hasSchedule = await scheduleSection.isVisible().catch(() => false);
        console.log(`Schedule options: ${hasSchedule}`);

        // Check for submit button
        const submitButton = modal.locator('button:has-text("Deploy"), button:has-text("Create"), button[type="submit"]');
        const canSubmit = await submitButton.isVisible().catch(() => false);
        console.log(`Submit button available: ${canSubmit}`);

        // DON'T submit - close modal
        await modal.locator('button:has-text("Cancel")').click();
        console.log('✓ Closed modal without submitting');

      } else {
        console.log('✗ Deployment modal did not open');
      }
    } else {
      console.log('✗ No deploy button found');
    }

    recordPerformance('Deployment Form Interaction', startTime);
    console.log('✓ Test 3 Complete: Deployment Form');
    console.log('=========================================================\n');
  });

  /**
   * TEST 4: Monitor Deployment Status (Real-Time Updates)
   */
  test('Test 4: Monitor Deployment Status with Real-Time Updates', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    const startTime = Date.now();

    console.log('\n=== TEST 4: Monitor Deployment Status (Real-Time Updates) ===');

    // Navigate to deployments list
    await page.goto('/patches/deployed');
    await waitForPageLoad(page);
    await page.waitForTimeout(2000);

    // Capture initial state
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/deployment-status-t0s-${Date.now()}.png`,
      fullPage: true,
    });

    // Check if deployments exist
    const tableRows = page.locator('table tbody tr');
    const rowCount = await tableRows.count();
    console.log(`Deployment rows: ${rowCount}`);

    if (rowCount > 0) {
      // Click on first deployment (view button)
      const firstRow = tableRows.first();
      const viewButton = firstRow.locator('button:has(.anticon-eye), button[title*="View"]').first();
      const viewButtonExists = await viewButton.isVisible().catch(() => false);

      if (viewButtonExists) {
        console.log('✓ View button found, opening deployment details');

        await viewButton.click();
        await page.waitForTimeout(2000);

        // Check if modal or page opened
        const modal = page.locator('.ant-modal-content');
        const isModal = await modal.isVisible().catch(() => false);

        console.log(`Deployment view type: ${isModal ? 'Modal' : 'Page'}`);

        // Monitor for 30 seconds
        console.log('\nMonitoring for real-time updates (30 seconds)...');

        const monitorStart = Date.now();
        const checkpoints = [10000, 20000, 30000]; // 10s, 20s, 30s

        for (const checkpoint of checkpoints) {
          await page.waitForTimeout(checkpoint - (Date.now() - monitorStart));

          const elapsed = Math.round((Date.now() - monitorStart) / 1000);
          console.log(`  Checkpoint at ${elapsed}s`);

          // Capture screenshot
          await page.screenshot({
            path: `${SCREENSHOT_DIR}/deployment-status-t${elapsed}s-${Date.now()}.png`,
            fullPage: true,
          });

          // Check for status changes
          const statusElements = page.locator('text=/pending|in progress|running|success|completed|failed/i');
          const statusCount = await statusElements.count();
          console.log(`    Status indicators visible: ${statusCount}`);
        }

        // Close modal if needed
        if (isModal) {
          await page.locator('.ant-modal-close, button:has-text("Close")').first().click();
        }

      } else {
        console.log('✗ No view button found on deployments');
      }
    } else {
      console.log('⚠ No deployments found to monitor');
    }

    // Analyze real-time update mechanism
    const sseConnections = getSSEConnections();
    console.log(`\n✓ SSE connections detected: ${sseConnections.length}`);

    const pollingInterval = calculatePollingInterval('/deployments');
    if (pollingInterval) {
      console.log(`✓ Polling detected with ~${pollingInterval}ms interval`);
    } else {
      console.log('  No consistent polling pattern detected');
    }

    recordPerformance('Deployment Status Monitoring', startTime);
    console.log('✓ Test 4 Complete: Real-Time Updates');
    console.log('=========================================================\n');
  });

  /**
   * TEST 5: Deployment List View
   */
  test('Test 5: Deployment List View and Operations', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    const startTime = Date.now();

    console.log('\n=== TEST 5: Deployment List View ===');

    await page.goto('/patches/deployed');
    await waitForPageLoad(page);

    // Capture list view
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/deployments-list-${Date.now()}.png`,
      fullPage: true,
    });

    // Check table structure
    const headers = page.locator('table thead th');
    const headerCount = await headers.count();
    console.log(`Table columns: ${headerCount}`);

    // Get header names
    const headerNames: string[] = [];
    for (let i = 0; i < headerCount; i++) {
      const text = await headers.nth(i).textContent();
      headerNames.push(text?.trim() || '');
    }
    console.log('Column headers:', headerNames.join(' | '));

    // Check for filter controls
    const filterButton = page.locator('button:has-text("Filter"), button:has(.anticon-filter)').first();
    const hasFilter = await filterButton.isVisible().catch(() => false);
    console.log(`Filter available: ${hasFilter}`);

    // Check for search
    const searchInput = page.locator('input[placeholder*="Search"]');
    const hasSearch = await searchInput.isVisible().catch(() => false);
    console.log(`Search available: ${hasSearch}`);

    // Test sorting
    if (headerCount > 0) {
      const sortableHeader = page.locator('.ant-table-column-sorters').first();
      const hasSorting = await sortableHeader.isVisible().catch(() => false);

      if (hasSorting) {
        console.log('✓ Sorting available');

        // Click to sort
        await sortableHeader.click();
        await page.waitForTimeout(1000);
        console.log('  Clicked sort (ascending)');

        // Click again to reverse
        await sortableHeader.click();
        await page.waitForTimeout(1000);
        console.log('  Clicked sort (descending)');
      }
    }

    recordPerformance('Deployment List Operations', startTime);
    console.log('✓ Test 5 Complete: Deployment List');
    console.log('=========================================================\n');
  });

  /**
   * TEST 6: Cancel Deployment
   */
  test('Test 6: Cancel Deployment Operation', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    console.log('\n=== TEST 6: Cancel Deployment ===');

    await page.goto('/patches/deployed');
    await waitForPageLoad(page);

    const tableRows = page.locator('table tbody tr');
    const rowCount = await tableRows.count();

    if (rowCount > 0) {
      // Look for in-progress deployment
      let foundInProgress = false;

      for (let i = 0; i < Math.min(rowCount, 5); i++) {
        const row = tableRows.nth(i);
        const statusText = await row.textContent();

        if (statusText?.toLowerCase().includes('progress') ||
            statusText?.toLowerCase().includes('pending') ||
            statusText?.toLowerCase().includes('running')) {

          console.log(`✓ Found in-progress deployment at row ${i}`);
          foundInProgress = true;

          // Look for cancel button
          const cancelButton = row.locator('button:has-text("Cancel"), button:has(.anticon-close)');
          const hasCancelButton = await cancelButton.isVisible().catch(() => false);

          console.log(`  Cancel button available: ${hasCancelButton}`);

          if (hasCancelButton) {
            console.log('  Note: Not clicking cancel to preserve test data');
          }

          break;
        }
      }

      if (!foundInProgress) {
        console.log('⚠ No in-progress deployments found');
      }
    } else {
      console.log('⚠ No deployments to cancel');
    }

    console.log('✓ Test 6 Complete: Cancel Operation Check');
    console.log('=========================================================\n');
  });

  /**
   * TEST 7: Retry Failed Deployment
   */
  test('Test 7: Retry Failed Deployment', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    console.log('\n=== TEST 7: Retry Failed Deployment ===');

    await page.goto('/patches/deployed');
    await waitForPageLoad(page);

    const tableRows = page.locator('table tbody tr');
    const rowCount = await tableRows.count();

    if (rowCount > 0) {
      let foundFailed = false;

      for (let i = 0; i < Math.min(rowCount, 5); i++) {
        const row = tableRows.nth(i);
        const statusText = await row.textContent();

        if (statusText?.toLowerCase().includes('fail')) {
          console.log(`✓ Found failed deployment at row ${i}`);
          foundFailed = true;

          // Look for retry button
          const retryButton = row.locator('button:has-text("Retry"), button:has(.anticon-reload)');
          const hasRetryButton = await retryButton.isVisible().catch(() => false);

          console.log(`  Retry button available: ${hasRetryButton}`);

          if (hasRetryButton) {
            console.log('  Note: Not clicking retry to preserve test data');
          }

          break;
        }
      }

      if (!foundFailed) {
        console.log('⚠ No failed deployments found');
      }
    } else {
      console.log('⚠ No deployments to retry');
    }

    console.log('✓ Test 7 Complete: Retry Operation Check');
    console.log('=========================================================\n');
  });

  /**
   * TEST 8: Deployment Detail - Task Breakdown
   */
  test('Test 8: Deployment Task Breakdown', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    console.log('\n=== TEST 8: Deployment Task Breakdown ===');

    await page.goto('/patches/deployed');
    await waitForPageLoad(page);

    const tableRows = page.locator('table tbody tr');
    const rowCount = await tableRows.count();

    if (rowCount > 0) {
      const firstRow = tableRows.first();
      const viewButton = firstRow.locator('button:has(.anticon-eye)').first();
      const hasViewButton = await viewButton.isVisible().catch(() => false);

      if (hasViewButton) {
        await viewButton.click();
        await page.waitForTimeout(2000);

        // Capture task view
        await page.screenshot({
          path: `${SCREENSHOT_DIR}/deployment-tasks-${Date.now()}.png`,
          fullPage: true,
        });

        // Check for task breakdown
        const taskHeaders = await page.locator('text=/task|endpoint|agent|asset/i').count();
        console.log(`Task-related elements: ${taskHeaders}`);

        // Look for task status indicators
        const statusBadges = page.locator('.ant-badge, .ant-tag, [class*="status"]');
        const statusCount = await statusBadges.count();
        console.log(`Status indicators: ${statusCount}`);

        // Check for timestamps
        const timestamps = await page.locator('text=/\\d{1,2}:\\d{2}|\\d{4}-\\d{2}-\\d{2}/').count();
        console.log(`Timestamps visible: ${timestamps}`);

        // Close modal
        const closeButton = page.locator('.ant-modal-close, button:has-text("Close")').first();
        if (await closeButton.isVisible().catch(() => false)) {
          await closeButton.click();
        }
      }
    }

    console.log('✓ Test 8 Complete: Task Breakdown');
    console.log('=========================================================\n');
  });

  /**
   * TEST 9: Network Analysis for Real-Time Updates
   */
  test('Test 9: Network Analysis and Real-Time Update Mechanism', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    console.log('\n=== TEST 9: Network Analysis for Real-Time Updates ===');

    // Clear previous network events
    networkEvents = [];

    await page.goto('/patches/deployed');
    await waitForPageLoad(page);

    // Monitor for 60 seconds
    console.log('Monitoring network activity for 60 seconds...');

    const monitorStart = Date.now();
    await page.waitForTimeout(60000);

    // Analyze network activity
    console.log('\n=== Network Analysis Results ===');

    const sseConnections = getSSEConnections();
    console.log(`\nSSE Connections: ${sseConnections.length}`);
    sseConnections.forEach(conn => {
      console.log(`  - ${conn.url}`);
    });

    const pollingRequests = getPollingRequests('/deployments');
    console.log(`\nPolling Requests: ${pollingRequests.length}`);

    const pollingInterval = calculatePollingInterval('/deployments');
    if (pollingInterval) {
      console.log(`Average polling interval: ${pollingInterval}ms (${(pollingInterval / 1000).toFixed(1)}s)`);
    }

    // Check for WebSocket
    const wsConnections = networkEvents.filter(e =>
      e.url.includes('ws://') || e.url.includes('wss://')
    );
    console.log(`\nWebSocket Connections: ${wsConnections.length}`);

    const apiErrors = getAPIErrors();
    console.log(`\nAPI Errors (4xx/5xx): ${apiErrors.length}`);
    apiErrors.slice(0, 5).forEach(err => {
      console.log(`  ${err.status} ${err.method} ${err.url}`);
    });

    // Determine update mechanism
    let updateMechanism = 'Unknown';
    if (sseConnections.length > 0) {
      updateMechanism = 'Server-Sent Events (SSE)';
    } else if (wsConnections.length > 0) {
      updateMechanism = 'WebSocket';
    } else if (pollingInterval) {
      updateMechanism = `HTTP Polling (${(pollingInterval / 1000).toFixed(1)}s interval)`;
    } else {
      updateMechanism = 'Manual Refresh Only';
    }

    console.log(`\n✓ Real-Time Update Mechanism: ${updateMechanism}`);

    // Capture network tab screenshot
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/deployment-network-analysis-${Date.now()}.png`,
      fullPage: true,
    });

    console.log('✓ Test 9 Complete: Network Analysis');
    console.log('====================================\n');
  });

  /**
   * FINAL TEST: Performance and Error Summary
   */
  test('Test 10: Performance Metrics and Error Summary', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    console.log('\n=== TEST 10: Performance and Error Summary ===');

    // Navigate through all deployment-related pages
    const pages = [
      { route: '/patches', name: 'Patches List' },
      { route: '/patches/deployed', name: 'Deployments List' },
      { route: '/hub', name: 'Hub' },
    ];

    for (const { route, name } of pages) {
      const startTime = Date.now();
      await page.goto(route);
      await waitForPageLoad(page);
      const loadTime = Date.now() - startTime;

      performanceMetrics.push({
        operation: `Load ${name}`,
        duration: loadTime,
        timestamp: Date.now(),
      });

      console.log(`${name} load time: ${loadTime}ms`);
    }

    // Console error summary
    const errors = getConsoleErrors();
    const warnings = getConsoleWarnings();

    console.log('\n=== Console Errors Report ===');
    console.log(`Total console messages: ${consoleMessages.length}`);
    console.log(`Errors: ${errors.length}`);
    console.log(`Warnings: ${warnings.length}`);

    if (errors.length > 0) {
      console.log('\n❌ Errors:');
      errors.slice(0, 10).forEach((err, i) => {
        console.log(`  ${i + 1}. ${err.text.substring(0, 100)}`);
      });
    }

    if (warnings.length > 0) {
      console.log('\n⚠ Warnings (first 5):');
      warnings.slice(0, 5).forEach((warn, i) => {
        console.log(`  ${i + 1}. ${warn.text.substring(0, 100)}`);
      });
    }

    // Performance summary
    console.log('\n=== Performance Summary ===');
    performanceMetrics.forEach(metric => {
      console.log(`${metric.operation}: ${metric.duration}ms`);
    });

    const avgLoadTime = performanceMetrics.length > 0
      ? Math.round(performanceMetrics.reduce((sum, m) => sum + m.duration, 0) / performanceMetrics.length)
      : 0;

    console.log(`\nAverage operation time: ${avgLoadTime}ms`);

    console.log('✓ Test 10 Complete: Performance and Errors');
    console.log('==========================================\n');

    // Final assessment
    console.log('\n=== FINAL ASSESSMENT ===');

    const criticalErrors = errors.filter(e =>
      e.text.includes('500') ||
      e.text.toLowerCase().includes('critical') ||
      e.text.toLowerCase().includes('fatal')
    );

    const apiErrors = getAPIErrors();
    const criticalAPIErrors = apiErrors.filter(e => e.status && e.status >= 500);

    console.log(`Critical console errors: ${criticalErrors.length}`);
    console.log(`API errors: ${apiErrors.length} (${criticalAPIErrors.length} critical)`);
    console.log(`Average page load: ${avgLoadTime}ms`);

    // Determine pass/fail
    if (criticalErrors.length === 0 && criticalAPIErrors.length === 0) {
      console.log('\n✅ ASSESSMENT: PASS');
    } else if (criticalErrors.length < 3 && criticalAPIErrors.length < 3) {
      console.log('\n⚠️  ASSESSMENT: PASS WITH ISSUES');
    } else {
      console.log('\n❌ ASSESSMENT: FAIL');
    }

    console.log('========================\n');
  });
});
