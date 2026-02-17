import { test, expect, Page } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SCREENSHOT_DIR = path.join(__dirname, '../../screenshots');
const BASE_URL = 'http://localhost:5173';
const VALID_EMAIL = 'admin@patchiq.io';
const VALID_PASSWORD = 'admin123';
const INVALID_PASSWORD = 'wrongpassword';

test.describe('Authentication Flows', () => {
  let consoleErrors: string[] = [];
  let consoleWarnings: string[] = [];

  test.beforeEach(async ({ page }) => {
    // Track console errors and warnings
    consoleErrors = [];
    consoleWarnings = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      } else if (msg.type() === 'warning') {
        consoleWarnings.push(msg.text());
      }
    });

    // Clear any existing session
    await page.context().clearCookies();
    await page.goto('/login');
  });

  test('Scenario 1 - Valid Login', async ({ page }) => {
    console.log('\n=== Testing Valid Login ===');

    // Wait for page to load completely
    await page.waitForLoadState('networkidle');

    // Fill in the login form
    const emailInput = page.getByPlaceholder(/email|sharma@mail\.com/i);
    const passwordInput = page.getByPlaceholder(/password/i);

    await emailInput.waitFor({ state: 'visible' });
    await emailInput.fill(VALID_EMAIL);
    await passwordInput.fill(VALID_PASSWORD);

    // Take screenshot before submit
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'login-form-filled.png'),
      fullPage: true
    });

    // Click the login button
    const loginButton = page.getByRole('button', { name: /log in|login|sign in/i });
    await loginButton.click();

    // Wait for redirect to dashboard
    try {
      await page.waitForURL('**/dashboard**', { timeout: 15000 });
      console.log('✓ Successfully redirected to dashboard');
    } catch (error) {
      console.log('✗ Failed to redirect to dashboard');
      console.log('Current URL:', page.url());
      throw error;
    }

    // Take screenshot of successful login
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'login-success.png'),
      fullPage: true
    });

    // Verify user menu shows the correct email
    const userMenu = page.locator('text=' + VALID_EMAIL).or(
      page.locator('[data-testid="user-menu"]').or(
        page.locator('.user-info, .user-menu, .user-email')
      )
    );

    // Give it a moment to render
    await page.waitForTimeout(1000);

    // Check if user info is visible somewhere on the page
    const pageContent = await page.content();
    const hasUserEmail = pageContent.includes(VALID_EMAIL);

    console.log('User email visible on page:', hasUserEmail);

    // Log console errors (excluding expected ones)
    const unexpectedErrors = consoleErrors.filter(err =>
      !err.includes('401') &&
      !err.includes('Unauthorized') &&
      !err.includes('favicon')
    );

    console.log('Console errors (unexpected):', unexpectedErrors.length);
    if (unexpectedErrors.length > 0) {
      console.log('Errors:', unexpectedErrors);
    }

    // Assertions
    expect(page.url()).toContain('/dashboard');
    expect(unexpectedErrors.length).toBe(0);
  });

  test('Scenario 2 - Invalid Login', async ({ page }) => {
    console.log('\n=== Testing Invalid Login ===');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Fill in the login form with invalid password
    const emailInput = page.getByPlaceholder(/email|sharma@mail\.com/i);
    const passwordInput = page.getByPlaceholder(/password/i);

    await emailInput.waitFor({ state: 'visible' });
    await emailInput.fill(VALID_EMAIL);
    await passwordInput.fill(INVALID_PASSWORD);

    // Click the login button
    const loginButton = page.getByRole('button', { name: /log in|login|sign in/i });
    await loginButton.click();

    // Wait for error message
    const errorMessage = await Promise.race([
      page.locator('.ant-message-error').waitFor({ timeout: 5000 }).then(() => 'ant-message'),
      page.locator('.error-message, .login-error, [role="alert"]').waitFor({ timeout: 5000 }).then(() => 'generic-error'),
      page.locator('text=/invalid|incorrect|wrong/i').waitFor({ timeout: 5000 }).then(() => 'text-error'),
      new Promise(resolve => setTimeout(() => resolve('timeout'), 5000))
    ]);

    console.log('Error message type:', errorMessage);

    // Take screenshot of error
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'login-invalid.png'),
      fullPage: true
    });

    // Verify we're still on login page
    const currentUrl = page.url();
    console.log('Current URL after failed login:', currentUrl);

    // Check for API error in console
    const hasAuthError = consoleErrors.some(err =>
      err.includes('401') ||
      err.includes('Unauthorized') ||
      err.includes('Invalid credentials')
    );

    console.log('Console shows auth error:', hasAuthError);
    console.log('Total console errors:', consoleErrors.length);

    // Assertions
    expect(errorMessage).not.toBe('timeout');
    expect(currentUrl).toContain('/login');
    expect(currentUrl).not.toContain('/dashboard');
  });

  test('Scenario 3 - Session Persistence', async ({ page }) => {
    console.log('\n=== Testing Session Persistence ===');

    // First, log in
    await page.waitForLoadState('networkidle');

    const emailInput = page.getByPlaceholder(/email|sharma@mail\.com/i);
    const passwordInput = page.getByPlaceholder(/password/i);

    await emailInput.waitFor({ state: 'visible' });
    await emailInput.fill(VALID_EMAIL);
    await passwordInput.fill(VALID_PASSWORD);

    const loginButton = page.getByRole('button', { name: /log in|login|sign in/i });
    await loginButton.click();

    // Wait for dashboard
    await page.waitForURL('**/dashboard**', { timeout: 15000 });
    console.log('✓ Logged in successfully');

    // Now refresh the page
    console.log('Refreshing page...');
    await page.reload({ waitUntil: 'networkidle' });

    // Wait a moment for any redirects
    await page.waitForTimeout(2000);

    // Take screenshot after refresh
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'session-persist.png'),
      fullPage: true
    });

    // Check current URL
    const currentUrl = page.url();
    console.log('URL after refresh:', currentUrl);

    const stillOnDashboard = currentUrl.includes('/dashboard');
    const redirectedToLogin = currentUrl.includes('/login');

    console.log('Still on dashboard:', stillOnDashboard);
    console.log('Redirected to login:', redirectedToLogin);

    // Check console errors
    const unexpectedErrors = consoleErrors.filter(err =>
      !err.includes('favicon')
    );

    console.log('Console errors after refresh:', unexpectedErrors.length);
    if (unexpectedErrors.length > 0) {
      console.log('Errors:', unexpectedErrors);
    }

    // Assertions
    expect(currentUrl).toContain('/dashboard');
    expect(currentUrl).not.toContain('/login');
  });
});

test.describe('Authentication Flows - Summary Report', () => {
  test('Generate Test Report', async () => {
    // This is a placeholder test that will run after all others
    // The actual report will be generated from the test results
    console.log('\n=== Test Report ===');
    console.log('Check screenshots directory for visual evidence');
    console.log('Run: ls -la ' + SCREENSHOT_DIR);
  });
});
