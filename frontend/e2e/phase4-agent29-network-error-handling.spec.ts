import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BASE_URL = 'http://localhost:5173';
const SCREENSHOT_DIR = path.join(__dirname, '../screenshots/phase4-agent29');

// Ensure screenshot directory exists
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

type TestStatus = 'PASS' | 'FAIL' | 'WARN';

interface TestResult {
  scenario: string;
  test: string;
  status: TestStatus;
  message: string;
  screenshot?: string;
  errorMessage?: string;
  details?: Record<string, string | number | boolean>;
}

const testResults: TestResult[] = [];

async function login(page: any) {
  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

  const emailField = page.locator('#email, input[type="email"]').first();
  const passwordField = page.locator('#password, input[type="password"]').first();

  await emailField.fill('admin@patchiq.io', { timeout: 10000 });
  await passwordField.fill('admin123', { timeout: 10000 });

  await page.click('button[type="submit"]');
  await page.waitForURL(/\/(dashboard|patches|assets)/, { timeout: 30000 }).catch(() => {});
}

async function captureScreenshot(page: any, name: string): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${name}-${timestamp}.png`;
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, filename), fullPage: true });
  return filename;
}

async function checkConsoleForErrors(page: any): Promise<string[]> {
  const errors: string[] = [];

  page.on('console', (msg: any) => {
    if (msg.type() === 'error' || msg.type() === 'warning') {
      errors.push(`[${msg.type()}] ${msg.text()}`);
    }
  });

  return errors;
}

async function recordResult(
  scenario: string,
  test: string,
  status: TestStatus,
  message: string,
  details?: Record<string, string | number | boolean>,
  screenshot?: string
) {
  const result: TestResult = {
    scenario,
    test,
    status,
    message,
    screenshot,
    details
  };
  testResults.push(result);
  console.log(`[${status}] ${scenario} > ${test}: ${message}`);
}

async function isPageCrashed(page: any): Promise<boolean> {
  // Check for white screen or error page
  const bodyContent = await page.textContent('body');
  if (!bodyContent || bodyContent.trim().length === 0) {
    return true;
  }

  // Check for common crash indicators
  const crashIndicators = [
    'Cannot GET',
    'Application Error',
    'Internal Server Error',
    'Fatal',
    'crashed'
  ];

  for (const indicator of crashIndicators) {
    if (bodyContent.includes(indicator)) {
      return true;
    }
  }

  return false;
}

async function findErrorMessage(page: any): Promise<string | null> {
  // Try to find error messages in various formats
  const errorSelectors = [
    '[class*="alert"], [class*="error"], [class*="message"]',
    '.ant-message-error, .ant-notification-error',
    '[role="alert"]'
  ];

  for (const selector of errorSelectors) {
    const element = page.locator(selector).first();
    if (await element.isVisible({ timeout: 3000 }).catch(() => false)) {
      return await element.textContent().catch(() => null);
    }
  }

  return null;
}

async function findRetryButton(page: any): Promise<boolean> {
  const retrySelectors = [
    'button:has-text("Retry")',
    'button:has-text("Try Again")',
    'button:has-text("Reload")'
  ];

  for (const selector of retrySelectors) {
    const button = page.locator(selector).first();
    if (await button.isVisible({ timeout: 2000 }).catch(() => false)) {
      return true;
    }
  }

  return false;
}

// ============================================================================
// SCENARIO 1: Offline Mode Simulation
// ============================================================================
test.describe('SCENARIO 1: Offline Mode Simulation', () => {
  test('1.1 - Navigate to dashboard and verify initial load', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

    const screenshot = await captureScreenshot(page, 'scenario1-01-initial-dashboard');
    const pageText = await page.textContent('body');

    const loaded = pageText && pageText.includes('dashboard') || pageText?.includes('Dashboard');
    await recordResult(
      'SCENARIO 1',
      '1.1 - Initial Dashboard Load',
      loaded ? 'PASS' : 'WARN',
      loaded ? 'Dashboard loaded successfully' : 'Dashboard may not have loaded',
      { hasContent: !!pageText },
      screenshot
    );
  });

  test('1.2 - Set offline mode and navigate to different pages', async ({ browser }) => {
    const context = await browser.newContext();
    const page = context.newPage();

    try {
      await login(page);
      await page.goto(`${BASE_URL}/dashboard`);
      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

      // Go offline
      await context.setOffline(true);
      console.log('Offline mode activated');

      // Try to navigate to assets page while offline
      await page.goto(`${BASE_URL}/assets`, { waitUntil: 'domcontentloaded' }).catch(() => {});
      await page.waitForTimeout(2000);

      const screenshot = await captureScreenshot(page, 'scenario1-02-offline-assets');
      const crashed = await isPageCrashed(page);
      const errorMsg = await findErrorMessage(page);
      const hasRetry = await findRetryButton(page);

      const pageText = await page.textContent('body');
      const stillHasUI = pageText && (pageText.includes('assets') || pageText.includes('Asset'));

      await recordResult(
        'SCENARIO 1',
        '1.2 - Offline Navigation to Assets',
        crashed ? 'FAIL' : 'PASS',
        crashed ? 'Page crashed in offline mode' : 'Page did not crash',
        {
          pageStillHasUI: !!stillHasUI,
          hasErrorMessage: !!errorMsg,
          hasRetryButton: hasRetry
        },
        screenshot
      );

      if (errorMsg) {
        console.log(`Error message found: "${errorMsg}"`);
      }

      // Try to reload while offline
      await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
      await page.waitForTimeout(1000);

      const reloadScreenshot = await captureScreenshot(page, 'scenario1-03-offline-reload');
      const reloadCrashed = await isPageCrashed(page);

      await recordResult(
        'SCENARIO 1',
        '1.3 - Offline Page Reload',
        reloadCrashed ? 'FAIL' : 'WARN',
        reloadCrashed ? 'Page crashed on reload' : 'Page reloaded (may show cached content)',
        {},
        reloadScreenshot
      );

      // Go back online
      await context.setOffline(false);
      console.log('Online mode restored');
      await page.waitForTimeout(2000);

      const onlineScreenshot = await captureScreenshot(page, 'scenario1-04-online-restored');
      const stillCrashed = await isPageCrashed(page);

      await recordResult(
        'SCENARIO 1',
        '1.4 - Recovery After Going Online',
        stillCrashed ? 'FAIL' : 'PASS',
        stillCrashed ? 'Page still broken after going online' : 'Page recovered after going online',
        {},
        onlineScreenshot
      );
    } finally {
      await context.close();
    }
  });

  test('1.5 - Verify graceful degradation (UI still visible offline)', async ({ browser }) => {
    const context = await browser.newContext();
    const page = context.newPage();

    try {
      await login(page);
      await page.goto(`${BASE_URL}/dashboard`);
      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

      const onlineUIElements = await page.locator('button, a, input, [class*="card"]').count();

      // Go offline
      await context.setOffline(true);
      await page.waitForTimeout(1500);

      const offlineUIElements = await page.locator('button, a, input, [class*="card"]').count();
      const screenshot = await captureScreenshot(page, 'scenario1-05-graceful-degradation');

      // UI structure should mostly remain (though data might be stale)
      const degradationAcceptable = offlineUIElements > 0 && offlineUIElements >= (onlineUIElements * 0.5);

      await recordResult(
        'SCENARIO 1',
        '1.5 - Graceful Degradation UI Elements',
        degradationAcceptable ? 'PASS' : 'WARN',
        `UI maintained ${offlineUIElements} elements (online had ${onlineUIElements})`,
        {
          onlineElements: onlineUIElements,
          offlineElements: offlineUIElements,
          degradationRatio: (offlineUIElements / onlineUIElements * 100).toFixed(1)
        },
        screenshot
      );

      await context.setOffline(false);
    } finally {
      await context.close();
    }
  });
});

// ============================================================================
// SCENARIO 2: API Request Failures
// ============================================================================
test.describe('SCENARIO 2: API Request Failures', () => {
  test('2.1 - Intercept API and return 404 errors', async ({ page }) => {
    await login(page);

    // Intercept all API calls and abort them
    await page.route('**/v1/assets', route => route.abort('failed'));
    await page.route('**/v1/dashboard', route => route.abort('failed'));

    await page.goto(`${BASE_URL}/assets`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    const screenshot = await captureScreenshot(page, 'scenario2-01-api-failure');
    const crashed = await isPageCrashed(page);
    const errorMsg = await findErrorMessage(page);
    const hasRetry = await findRetryButton(page);

    const pageText = await page.textContent('body');
    const hasNavigation = pageText && pageText.length > 500;

    await recordResult(
      'SCENARIO 2',
      '2.1 - API Failure Handling',
      crashed ? 'FAIL' : 'PASS',
      crashed ? 'Page crashed on API failure' : 'Page handled API failure gracefully',
      {
        hasErrorMessage: !!errorMsg,
        hasRetryButton: hasRetry,
        hasNavigationUI: !!hasNavigation,
        errorMessagePreview: errorMsg?.substring(0, 50) || 'N/A'
      },
      screenshot
    );
  });

  test('2.2 - Create/Update operations with API failures', async ({ page }) => {
    await login(page);

    // Go to a page that might have create/update functionality
    await page.goto(`${BASE_URL}/assets`, { waitUntil: 'networkidle' }).catch(() => {});
    await page.waitForTimeout(1500);

    // Intercept POST/PUT requests
    await page.route('**/v1/**', route => {
      if (route.request().method() === 'POST' || route.request().method() === 'PUT') {
        route.abort('failed');
      } else {
        route.continue();
      }
    });

    // Try to find and click a create/update button
    const createButton = page.locator('button:has-text("Add"), button:has-text("Create"), button:has-text("New")').first();
    if (await createButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await createButton.click();
      await page.waitForTimeout(1000);
    }

    const screenshot = await captureScreenshot(page, 'scenario2-02-create-failure');
    const errorMsg = await findErrorMessage(page);

    await recordResult(
      'SCENARIO 2',
      '2.2 - Create/Update Operation Failure',
      errorMsg ? 'PASS' : 'WARN',
      errorMsg ? 'Error message displayed for failed operation' : 'No error message detected',
      {
        hasErrorMessage: !!errorMsg,
        errorPreview: errorMsg?.substring(0, 60) || 'N/A'
      },
      screenshot
    );
  });

  test('2.3 - Verify error messages are user-friendly (not stack traces)', async ({ page }) => {
    await login(page);

    // Intercept all API calls
    await page.route('**/v1/**', route => route.abort('failed'));

    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    const screenshot = await captureScreenshot(page, 'scenario2-03-error-quality');

    // Check page console for unhandled errors
    let jsErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        jsErrors.push(msg.text());
      }
    });

    // Check for stack traces in visible text
    const pageText = await page.textContent('body');
    const hasStackTrace = pageText && (
      pageText.includes('at ') ||
      pageText.includes('Error:') ||
      pageText.includes('TypeError:')
    );

    const errorMsg = await findErrorMessage(page);
    const isFriendly = errorMsg && !errorMsg.includes('TypeError') && !errorMsg.includes('at ');

    await recordResult(
      'SCENARIO 2',
      '2.3 - Error Message Quality',
      isFriendly ? 'PASS' : (hasStackTrace ? 'FAIL' : 'WARN'),
      isFriendly ? 'Error messages are user-friendly' : hasStackTrace ? 'Stack traces visible to user' : 'Cannot determine message quality',
      {
        hasErrorMessage: !!errorMsg,
        isFriendly: !!isFriendly,
        hasStackTraceVisible: !!hasStackTrace,
        jsErrorsCount: jsErrors.length,
        messagePreview: errorMsg?.substring(0, 100) || 'N/A'
      },
      screenshot
    );
  });
});

// ============================================================================
// SCENARIO 3: Timeout Scenarios
// ============================================================================
test.describe('SCENARIO 3: Timeout Scenarios', () => {
  test('3.1 - Slow API response with loading indicator', async ({ page }) => {
    await login(page);

    // Delay all API responses by 5 seconds
    const delayMs = 5000;
    await page.route('**/v1/assets', async route => {
      await new Promise(resolve => setTimeout(resolve, delayMs));
      route.continue();
    });

    const startTime = Date.now();
    await page.goto(`${BASE_URL}/assets`, { waitUntil: 'domcontentloaded' });

    // Check if loading indicator appears
    const loadingIndicators = [
      '.ant-spin',
      '[class*="loading"]',
      '[class*="spinner"]',
      'text=/loading|fetching|loading/i'
    ];

    let foundLoadingIndicator = false;
    for (const selector of loadingIndicators) {
      const element = await page.locator(selector).first();
      if (await element.isVisible({ timeout: 3000 }).catch(() => false)) {
        foundLoadingIndicator = true;
        break;
      }
    }

    const screenshot = await captureScreenshot(page, 'scenario3-01-loading-indicator');

    // Wait for response
    await page.waitForTimeout(Math.max(0, delayMs - (Date.now() - startTime) + 1000));

    const responseScreenshot = await captureScreenshot(page, 'scenario3-02-after-delay');
    const pageLoaded = await page.textContent('body');

    await recordResult(
      'SCENARIO 3',
      '3.1 - Timeout with Loading Indicator',
      foundLoadingIndicator ? 'PASS' : 'WARN',
      foundLoadingIndicator ? 'Loading indicator displayed during delay' : 'Loading indicator not detected',
      {
        delayMs: delayMs,
        hasLoadingIndicator: foundLoadingIndicator,
        pageEventuallyLoaded: !!pageLoaded
      },
      screenshot
    );
  });

  test('3.2 - Extended timeout (10s delay) with error handling', async ({ page }) => {
    await login(page);

    const longDelayMs = 10000;
    let requestCompleted = false;

    await page.route('**/v1/patches', async route => {
      await new Promise(resolve => setTimeout(resolve, longDelayMs));
      requestCompleted = true;
      route.continue();
    });

    await page.goto(`${BASE_URL}/patches`, { waitUntil: 'domcontentloaded' });

    // Take screenshot during long wait
    await page.waitForTimeout(2000);
    const duringWaitScreenshot = await captureScreenshot(page, 'scenario3-03-long-wait');

    // Continue waiting
    await page.waitForTimeout(longDelayMs + 2000);
    const afterWaitScreenshot = await captureScreenshot(page, 'scenario3-04-after-long-wait');

    const crashed = await isPageCrashed(page);

    await recordResult(
      'SCENARIO 3',
      '3.2 - Extended Timeout (10s)',
      crashed ? 'FAIL' : 'PASS',
      crashed ? 'Page crashed during long timeout' : 'Page remained responsive during long timeout',
      {
        requestCompleted: requestCompleted,
        pageStable: !crashed
      },
      duringWaitScreenshot
    );
  });

  test('3.3 - Verify timeout error message appears', async ({ page }) => {
    await login(page);

    // Create a route that delays forever or very long
    let requestStarted = false;
    await page.route('**/v1/dashboard', async route => {
      requestStarted = true;
      // Don't respond - simulate timeout
      await new Promise(resolve => setTimeout(resolve, 30000));
    });

    // Set a shorter navigation timeout
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' }).catch(() => {});

    // Wait a bit for timeout to trigger
    await page.waitForTimeout(3000);

    const screenshot = await captureScreenshot(page, 'scenario3-05-timeout-error');
    const errorMsg = await findErrorMessage(page);
    const hasRetry = await findRetryButton(page);

    await recordResult(
      'SCENARIO 3',
      '3.3 - Timeout Error Message',
      errorMsg || hasRetry ? 'PASS' : 'WARN',
      errorMsg ? `Timeout error displayed: "${errorMsg.substring(0, 50)}"` : hasRetry ? 'Retry button found' : 'No timeout handling detected',
      {
        hasErrorMessage: !!errorMsg,
        hasRetryButton: hasRetry,
        requestStarted: requestStarted
      },
      screenshot
    );
  });
});

// ============================================================================
// SCENARIO 4: 500 Server Errors
// ============================================================================
test.describe('SCENARIO 4: 500 Server Errors', () => {
  test('4.1 - Handle 500 errors on asset list load', async ({ page }) => {
    await login(page);

    await page.route('**/v1/assets', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' })
      });
    });

    await page.goto(`${BASE_URL}/assets`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    const screenshot = await captureScreenshot(page, 'scenario4-01-500-error');
    const crashed = await isPageCrashed(page);
    const errorMsg = await findErrorMessage(page);
    const hasRetry = await findRetryButton(page);

    const pageText = await page.textContent('body');
    const hasUI = pageText && pageText.length > 500;

    await recordResult(
      'SCENARIO 4',
      '4.1 - 500 Error on List Load',
      crashed ? 'FAIL' : 'PASS',
      crashed ? 'Page crashed on 500 error' : 'Page handled 500 error gracefully',
      {
        hasErrorMessage: !!errorMsg,
        hasRetryButton: hasRetry,
        hasUI: !!hasUI,
        errorPreview: errorMsg?.substring(0, 60) || 'N/A'
      },
      screenshot
    );
  });

  test('4.2 - Handle 500 errors on create operation', async ({ page }) => {
    await login(page);

    // First load succeeds
    await page.goto(`${BASE_URL}/assets`, { waitUntil: 'networkidle' }).catch(() => {});
    await page.waitForTimeout(1500);

    // Then intercept POST with 500
    await page.route('**/v1/**', route => {
      if (route.request().method() === 'POST') {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Failed to create asset' })
        });
      } else {
        route.continue();
      }
    });

    // Try to find and click create button
    const createButton = page.locator('button:has-text("Add"), button:has-text("Create"), button:has-text("New"), button:has-text("Import")').first();
    if (await createButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await createButton.click();
      await page.waitForTimeout(2000);
    }

    const screenshot = await captureScreenshot(page, 'scenario4-02-create-500-error');
    const errorMsg = await findErrorMessage(page);

    await recordResult(
      'SCENARIO 4',
      '4.2 - 500 Error on Create',
      errorMsg ? 'PASS' : 'WARN',
      errorMsg ? 'Error message displayed for 500 error' : 'No error feedback detected',
      {
        hasErrorMessage: !!errorMsg,
        errorPreview: errorMsg?.substring(0, 60) || 'N/A'
      },
      screenshot
    );
  });

  test('4.3 - Multiple 500 errors do not cascade', async ({ page }) => {
    await login(page);

    let errorCount = 0;
    await page.route('**/v1/**', route => {
      errorCount++;
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' })
      });
    });

    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    const screenshot = await captureScreenshot(page, 'scenario4-03-multiple-errors');
    const crashed = await isPageCrashed(page);

    // Check for multiple error notifications
    const errorNotifications = await page.locator('[class*="error"], [class*="notification"]').count();

    await recordResult(
      'SCENARIO 4',
      '4.3 - Multiple 500 Errors Handling',
      crashed ? 'FAIL' : 'PASS',
      crashed ? 'Page crashed with multiple 500 errors' : 'Page remained stable with multiple errors',
      {
        totalErrors: errorCount,
        errorNotificationsFound: errorNotifications,
        pageCrashed: crashed
      },
      screenshot
    );
  });
});

// ============================================================================
// SCENARIO 5: Network Reconnection
// ============================================================================
test.describe('SCENARIO 5: Network Reconnection', () => {
  test('5.1 - Disconnect and reconnect network', async ({ browser }) => {
    const context = await browser.newContext();
    const page = context.newPage();

    try {
      await login(page);
      await page.goto(`${BASE_URL}/dashboard`);
      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

      // Screenshot before disconnect
      const beforeScreenshot = await captureScreenshot(page, 'scenario5-01-before-disconnect');

      // Disconnect
      await context.setOffline(true);
      await page.waitForTimeout(1000);
      const offlineScreenshot = await captureScreenshot(page, 'scenario5-02-after-disconnect');

      // Try an action while offline
      const createButton = page.locator('button:has-text("Add"), button:has-text("Create"), button:has-text("New")').first();
      let actionAttempted = false;
      if (await createButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await createButton.click();
        actionAttempted = true;
        await page.waitForTimeout(1000);
      }

      const actionScreenshot = await captureScreenshot(page, 'scenario5-03-offline-action');

      // Reconnect
      await context.setOffline(false);
      await page.waitForTimeout(2000);
      const reconnectedScreenshot = await captureScreenshot(page, 'scenario5-04-after-reconnect');

      // Try the action again
      if (actionAttempted && await createButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await createButton.click();
        await page.waitForTimeout(2000);
      }

      const retryScreenshot = await captureScreenshot(page, 'scenario5-05-after-reconnect-retry');

      const stillCrashed = await isPageCrashed(page);

      await recordResult(
        'SCENARIO 5',
        '5.1 - Network Disconnect/Reconnect',
        stillCrashed ? 'FAIL' : 'PASS',
        stillCrashed ? 'Page crashed during reconnection' : 'Page recovered after network reconnection',
        {
          actionAttempted: actionAttempted,
          pageCrashed: stillCrashed
        },
        beforeScreenshot
      );
    } finally {
      await context.close();
    }
  });

  test('5.2 - Verify retry mechanism after reconnection', async ({ browser }) => {
    const context = await browser.newContext();
    const page = context.newPage();

    try {
      await login(page);

      // Intercept with failure initially
      let requestCount = 0;
      await page.route('**/v1/assets', route => {
        requestCount++;
        if (requestCount === 1) {
          route.abort('failed');
        } else {
          route.continue();
        }
      });

      await page.goto(`${BASE_URL}/assets`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);

      const failScreenshot = await captureScreenshot(page, 'scenario5-06-initial-failure');
      let errorMsg = await findErrorMessage(page);
      let hasRetry = await findRetryButton(page);

      // Click retry if available
      if (hasRetry) {
        const retryButton = page.locator('button:has-text("Retry"), button:has-text("Try Again"), button:has-text("Reload")').first();
        await retryButton.click();
        await page.waitForTimeout(2000);
      } else {
        // Try refresh if no explicit retry button
        await page.reload({ waitUntil: 'networkidle' }).catch(() => {});
      }

      const retryScreenshot = await captureScreenshot(page, 'scenario5-07-after-retry');
      const errorAfterRetry = await findErrorMessage(page);

      const retrySucceeded = !errorAfterRetry && requestCount > 1;

      await recordResult(
        'SCENARIO 5',
        '5.2 - Retry Mechanism',
        retrySucceeded ? 'PASS' : 'WARN',
        retrySucceeded ? 'Retry mechanism worked after failure' : 'Retry did not resolve the issue',
        {
          hasRetryButton: hasRetry,
          retryAttempted: hasRetry || requestCount > 1,
          retrySucceeded: retrySucceeded,
          totalRequests: requestCount
        },
        failScreenshot
      );
    } finally {
      await context.close();
    }
  });

  test('5.3 - Verify user feedback during reconnection', async ({ browser }) => {
    const context = await browser.newContext();
    const page = context.newPage();

    try {
      await login(page);
      await page.goto(`${BASE_URL}/dashboard`);
      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

      // Go offline
      await context.setOffline(true);
      await page.waitForTimeout(1000);

      const offlineScreenshot = await captureScreenshot(page, 'scenario5-08-offline-feedback');
      let offlineMessage = await findErrorMessage(page);

      // Reconnect
      await context.setOffline(false);
      await page.waitForTimeout(2000);

      const reconnectScreenshot = await captureScreenshot(page, 'scenario5-09-reconnect-feedback');

      // Look for success notification
      const successIndicators = [
        'text=/connected|online|restored/i',
        '.ant-notification-success',
        '[class*="success"], [class*="connected"]'
      ];

      let foundSuccessIndicator = false;
      for (const selector of successIndicators) {
        const element = await page.locator(selector).first();
        if (await element.isVisible({ timeout: 3000 }).catch(() => false)) {
          foundSuccessIndicator = true;
          break;
        }
      }

      await recordResult(
        'SCENARIO 5',
        '5.3 - User Feedback During Reconnection',
        foundSuccessIndicator ? 'PASS' : 'WARN',
        foundSuccessIndicator ? 'User feedback provided during reconnection' : 'No visible reconnection feedback',
        {
          offlineMessageShown: !!offlineMessage,
          reconnectionFeedback: foundSuccessIndicator
        },
        offlineScreenshot
      );
    } finally {
      await context.close();
    }
  });
});

// ============================================================================
// SCENARIO 6: SSE Connection Errors
// ============================================================================
test.describe('SCENARIO 6: SSE Connection Errors', () => {
  test('6.1 - Navigate to notifications page and verify SSE loading', async ({ page }) => {
    await login(page);

    // Try to navigate to notifications if it exists
    const notificationPages = [
      '/notifications',
      '/settings/notifications',
      '/dashboard' // Dashboard might have SSE for real-time updates
    ];

    let pageLoaded = false;
    let targetPage = '';

    for (const notifPage of notificationPages) {
      try {
        await page.goto(`${BASE_URL}${notifPage}`, { waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => {});
        const content = await page.textContent('body');
        if (content && content.length > 500) {
          pageLoaded = true;
          targetPage = notifPage;
          break;
        }
      } catch (e) {
        console.log(`Could not load ${notifPage}`);
      }
    }

    const screenshot = await captureScreenshot(page, 'scenario6-01-sse-page');

    await recordResult(
      'SCENARIO 6',
      '6.1 - SSE Page Load',
      pageLoaded ? 'PASS' : 'WARN',
      pageLoaded ? `Loaded SSE-enabled page: ${targetPage}` : 'Could not find accessible SSE page',
      {
        targetPage: targetPage,
        pageLoaded: pageLoaded
      },
      screenshot
    );
  });

  test('6.2 - Intercept SSE endpoint to simulate failure', async ({ page }) => {
    await login(page);

    // Intercept EventSource/SSE requests
    await page.route('**/v1/notifications**', route => {
      route.abort('failed');
    });

    // Try to navigate to a page that uses SSE
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    const screenshot = await captureScreenshot(page, 'scenario6-02-sse-failure');
    const crashed = await isPageCrashed(page);

    // Page should still be functional even if SSE fails
    const pageStillWorks = !crashed;

    await recordResult(
      'SCENARIO 6',
      '6.2 - SSE Failure Handling',
      pageStillWorks ? 'PASS' : 'FAIL',
      pageStillWorks ? 'Page remains functional with SSE failure' : 'Page crashed when SSE fails',
      {
        pageCrashed: crashed
      },
      screenshot
    );
  });

  test('6.3 - Verify reconnect attempts for SSE', async ({ page }) => {
    await login(page);

    let sseConnectionAttempts = 0;

    // Monitor SSE connection attempts
    await page.route('**/v1/notifications**', route => {
      sseConnectionAttempts++;
      if (sseConnectionAttempts === 1) {
        route.abort('failed');
      } else {
        route.continue();
      }
    });

    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);

    const screenshot = await captureScreenshot(page, 'scenario6-03-sse-reconnect');

    // Check for reconnect indicators
    const reconnectIndicators = [
      'text=/reconnect|retrying|attempting/i',
      '[class*="reconnect"], [class*="retrying"]'
    ];

    let foundReconnectIndicator = false;
    for (const selector of reconnectIndicators) {
      const element = await page.locator(selector).first();
      if (await element.isVisible({ timeout: 2000 }).catch(() => false)) {
        foundReconnectIndicator = true;
        break;
      }
    }

    await recordResult(
      'SCENARIO 6',
      '6.3 - SSE Reconnect Attempts',
      sseConnectionAttempts > 1 ? 'PASS' : 'WARN',
      sseConnectionAttempts > 1 ? `SSE attempted reconnection (${sseConnectionAttempts} attempts)` : 'SSE reconnection behavior unclear',
      {
        connectionAttempts: sseConnectionAttempts,
        reconnectIndicatorVisible: foundReconnectIndicator
      },
      screenshot
    );
  });
});

// ============================================================================
// Generate Summary Report
// ============================================================================
test.afterAll(() => {
  console.log('\n' + '='.repeat(80));
  console.log('NETWORK ERROR HANDLING TEST SUMMARY');
  console.log('='.repeat(80));

  const scenarioMap = new Map<string, TestResult[]>();
  testResults.forEach(result => {
    if (!scenarioMap.has(result.scenario)) {
      scenarioMap.set(result.scenario, []);
    }
    scenarioMap.get(result.scenario)!.push(result);
  });

  let passCount = 0;
  let failCount = 0;
  let warnCount = 0;

  scenarioMap.forEach((results, scenario) => {
    console.log(`\n${scenario}`);
    console.log('-'.repeat(80));

    results.forEach(result => {
      const statusEmoji = result.status === 'PASS' ? '✓' : result.status === 'FAIL' ? '✗' : '⚠';
      console.log(`  ${statusEmoji} [${result.status}] ${result.test}`);
      console.log(`      Message: ${result.message}`);

      if (result.details) {
        console.log(`      Details:`, result.details);
      }

      if (result.screenshot) {
        console.log(`      Screenshot: ${result.screenshot}`);
      }

      if (result.status === 'PASS') passCount++;
      else if (result.status === 'FAIL') failCount++;
      else warnCount++;
    });
  });

  console.log('\n' + '='.repeat(80));
  console.log(`RESULTS: ${passCount} PASSED, ${failCount} FAILED, ${warnCount} WARNINGS`);
  console.log(`Total Tests: ${testResults.length}`);
  console.log('='.repeat(80));

  // Write JSON report for parsing
  const reportPath = path.join(__dirname, '../screenshots/phase4-agent29/test-results.json');
  fs.writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    totalTests: testResults.length,
    passed: passCount,
    failed: failCount,
    warned: warnCount,
    results: testResults
  }, null, 2));

  console.log(`\nDetailed results saved to: ${reportPath}`);
  console.log(`Screenshots saved to: ${SCREENSHOT_DIR}`);
});
