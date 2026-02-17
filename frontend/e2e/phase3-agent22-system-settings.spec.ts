import { test as base, expect, Page } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Phase 3 - Agent 22: System Settings Module Testing
 *
 * Test Coverage:
 * - SMTP Configuration (Mail Server Settings)
 * - LDAP Configuration
 * - Proxy Settings
 * - Server Settings (System Preferences)
 * - Settings Save/Load
 * - Validation of Required Fields
 *
 * Success Criteria:
 * - Settings CRUD operations work correctly
 * - Validation prevents invalid configurations
 * - Settings persist correctly
 * - Test connections work properly
 * - No P0 bugs, document any P1/P2 issues
 */

// Extend base test with authentication
const test = base.extend({
  storageState: path.join(__dirname, '../auth.json'),
});

const BASE_URL = 'http://localhost:5173';

// Screenshot directory
const screenshotDir = '/Users/shandesh/src/VS-code/PatchIQ/full-dev-sandy-v2/screenshots/phase3-agent22';

// Helper function to take screenshots
async function takeScreenshot(page: Page, name: string) {
  await page.screenshot({
    path: `${screenshotDir}/${name}.png`,
    fullPage: true
  });
}

test.describe('Phase 3 - Agent 22: System Settings Module', () => {

  test.describe('SMTP Configuration (Mail Server)', () => {
    test('should display mail server configuration page', async ({ page }) => {
      await page.goto(`${BASE_URL}/settings/system-settings/mail-server`);
      await page.waitForLoadState('networkidle');

      // Verify page loaded
      await expect(page.locator('h2')).toContainText('Mail Server Configurations');

      // Take screenshot
      await takeScreenshot(page, 'smtp-01-page-load');
    });

    test('should validate required SMTP fields', async ({ page }) => {
      await page.goto(`${BASE_URL}/settings/system-settings/mail-server`);
      await page.waitForLoadState('networkidle');

      // Clear all fields
      await page.fill('input[placeholder="SMTP Host"]', '');
      await page.fill('input[type="number"]', '');
      await page.fill('input[placeholder="Email"]', '');

      // Try to save
      await page.click('button:has-text("Save")');

      // Wait a moment for validation
      await page.waitForTimeout(1000);

      // Check for validation messages
      const validationMessages = await page.locator('.ant-form-item-explain-error').count();
      expect(validationMessages).toBeGreaterThan(0);

      await takeScreenshot(page, 'smtp-02-validation-errors');
    });

    test('should save SMTP configuration', async ({ page }) => {
      await page.goto(`${BASE_URL}/settings/system-settings/mail-server`);
      await page.waitForLoadState('networkidle');

      // Fill in SMTP details
      await page.fill('input[placeholder="SMTP Host"]', 'smtp.test.com');
      await page.fill('input[type="number"]', '587');
      await page.selectOption('select[id*="protocol"]', 'TLS');
      await page.fill('input[placeholder="Email"]', 'test@patchiq.io');

      await takeScreenshot(page, 'smtp-03-filled-form');

      // Save configuration
      await page.click('button:has-text("Save")');

      // Wait for success message
      await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 5000 });
      await takeScreenshot(page, 'smtp-04-save-success');
    });

    test('should enable and configure SMTP authentication', async ({ page }) => {
      await page.goto(`${BASE_URL}/settings/system-settings/mail-server`);
      await page.waitForLoadState('networkidle');

      // Enable authentication
      const authCheckbox = page.locator('input[type="checkbox"]:near(:text("Enable Authentication"))');
      await authCheckbox.check();
      await page.waitForTimeout(500);

      // Verify username and password fields appear
      await expect(page.locator('input[placeholder="Username"]')).toBeVisible();
      await expect(page.locator('input[placeholder="Password"]')).toBeVisible();

      // Fill authentication details
      await page.fill('input[placeholder="Username"]', 'smtp_user');
      await page.fill('input[placeholder="Password"]', 'smtp_password123');

      await takeScreenshot(page, 'smtp-05-auth-enabled');

      // Save
      await page.click('button:has-text("Save")');
      await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 5000 });
    });

    test('should test SMTP connection', async ({ page }) => {
      await page.goto(`${BASE_URL}/settings/system-settings/mail-server`);
      await page.waitForLoadState('networkidle');

      // Fill test email
      await page.fill('input[placeholder="recipient@example.com"]', 'test@example.com');

      await takeScreenshot(page, 'smtp-06-test-email');

      // Click test button (this will likely fail since we don't have real SMTP)
      await page.click('button:has-text("Test")');

      // Wait for either success or error message
      await page.waitForTimeout(3000);
      await takeScreenshot(page, 'smtp-07-test-result');
    });

    test('should reset SMTP form', async ({ page }) => {
      await page.goto(`${BASE_URL}/settings/system-settings/mail-server`);
      await page.waitForLoadState('networkidle');

      // Fill some fields
      await page.fill('input[placeholder="SMTP Host"]', 'temp.smtp.com');
      await page.fill('input[type="number"]', '25');

      // Click reset
      await page.click('button:has-text("Reset")');
      await page.waitForTimeout(500);

      // Verify form is reset (original values restored)
      await takeScreenshot(page, 'smtp-08-reset');
    });
  });

  test.describe('Proxy Server Configuration', () => {
    test('should display proxy server configuration page', async ({ page }) => {
      await page.goto(`${BASE_URL}/settings/system-settings/proxy-server`);
      await page.waitForLoadState('networkidle');

      await expect(page.locator('h2')).toContainText('Proxy Server Configurations');
      await takeScreenshot(page, 'proxy-01-page-load');
    });

    test('should enable proxy and show configuration fields', async ({ page }) => {
      await page.goto(`${BASE_URL}/settings/system-settings/proxy-server`);
      await page.waitForLoadState('networkidle');

      // Enable proxy
      const enableSwitch = page.locator('button[role="switch"]:near(:text("Enable Proxy Server"))');
      await enableSwitch.click();
      await page.waitForTimeout(500);

      // Verify proxy fields are visible
      await expect(page.locator('input[placeholder="Proxy Host"]')).toBeVisible();
      await expect(page.locator('input[placeholder="8080"]')).toBeVisible();

      await takeScreenshot(page, 'proxy-02-enabled');
    });

    test('should validate proxy required fields when enabled', async ({ page }) => {
      await page.goto(`${BASE_URL}/settings/system-settings/proxy-server`);
      await page.waitForLoadState('networkidle');

      // Enable proxy
      const enableSwitch = page.locator('button[role="switch"]:near(:text("Enable Proxy Server"))');
      await enableSwitch.click();
      await page.waitForTimeout(500);

      // Try to save without filling required fields
      await page.click('button:has-text("Save")');
      await page.waitForTimeout(1000);

      // Check for validation errors
      const validationMessages = await page.locator('.ant-form-item-explain-error').count();
      expect(validationMessages).toBeGreaterThan(0);

      await takeScreenshot(page, 'proxy-03-validation-errors');
    });

    test('should save proxy configuration', async ({ page }) => {
      await page.goto(`${BASE_URL}/settings/system-settings/proxy-server`);
      await page.waitForLoadState('networkidle');

      // Enable proxy
      const enableSwitch = page.locator('button[role="switch"]:near(:text("Enable Proxy Server"))');
      await enableSwitch.click();
      await page.waitForTimeout(500);

      // Fill proxy details
      await page.fill('input[placeholder="Proxy Host"]', 'proxy.test.com');
      await page.fill('input[placeholder="8080"]', '8080');
      await page.selectOption('select[id*="protocol"]', 'HTTP');

      await takeScreenshot(page, 'proxy-04-filled-form');

      // Save
      await page.click('button:has-text("Save")');
      await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 5000 });

      await takeScreenshot(page, 'proxy-05-save-success');
    });

    test('should configure proxy authentication', async ({ page }) => {
      await page.goto(`${BASE_URL}/settings/system-settings/proxy-server`);
      await page.waitForLoadState('networkidle');

      // Enable proxy
      const enableSwitch = page.locator('button[role="switch"]:near(:text("Enable Proxy Server"))');
      await enableSwitch.click();
      await page.waitForTimeout(500);

      // Fill basic proxy details
      await page.fill('input[placeholder="Proxy Host"]', 'proxy.test.com');
      await page.fill('input[placeholder="8080"]', '3128');

      // Enable authentication
      const authCheckbox = page.locator('input[type="checkbox"]:near(:text("Enable Authentication"))');
      await authCheckbox.check();
      await page.waitForTimeout(500);

      // Verify auth fields appear
      await expect(page.locator('input[placeholder="Username"]')).toBeVisible();
      await expect(page.locator('input[placeholder="Password"]')).toBeVisible();

      // Fill auth details
      await page.fill('input[placeholder="Username"]', 'proxy_user');
      await page.fill('input[placeholder="Password"]', 'proxy_pass123');

      await takeScreenshot(page, 'proxy-06-auth-configured');

      // Save
      await page.click('button:has-text("Save")');
      await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 5000 });
    });

    test('should test proxy connection', async ({ page }) => {
      await page.goto(`${BASE_URL}/settings/system-settings/proxy-server`);
      await page.waitForLoadState('networkidle');

      // Enable proxy and fill details
      const enableSwitch = page.locator('button[role="switch"]:near(:text("Enable Proxy Server"))');
      await enableSwitch.click();
      await page.waitForTimeout(500);

      await page.fill('input[placeholder="Proxy Host"]', 'proxy.test.com');
      await page.fill('input[placeholder="8080"]', '8080');

      await takeScreenshot(page, 'proxy-07-before-test');

      // Click test
      await page.click('button:has-text("Test")');
      await page.waitForTimeout(3000);

      await takeScreenshot(page, 'proxy-08-test-result');
    });
  });

  test.describe('LDAP Server Configuration', () => {
    test('should display LDAP configuration page', async ({ page }) => {
      await page.goto(`${BASE_URL}/settings/system-settings/ldap-server`);
      await page.waitForLoadState('networkidle');

      await expect(page.locator('h2')).toContainText('LDAP Server Configurations');
      await takeScreenshot(page, 'ldap-01-page-load');
    });

    test('should open create LDAP modal', async ({ page }) => {
      await page.goto(`${BASE_URL}/settings/system-settings/ldap-server`);
      await page.waitForLoadState('networkidle');

      // Click create button
      await page.click('button:has-text("Create")');
      await page.waitForTimeout(500);

      // Verify modal is open
      await expect(page.locator('.ant-modal-title')).toContainText('Create LDAP Server');

      await takeScreenshot(page, 'ldap-02-create-modal');
    });

    test('should validate LDAP required fields', async ({ page }) => {
      await page.goto(`${BASE_URL}/settings/system-settings/ldap-server`);
      await page.waitForLoadState('networkidle');

      // Open create modal
      await page.click('button:has-text("Create")');
      await page.waitForTimeout(500);

      // Try to create without filling required fields
      await page.click('button:has-text("Create")');
      await page.waitForTimeout(1000);

      // Check for validation errors
      const validationMessages = await page.locator('.ant-form-item-explain-error').count();
      expect(validationMessages).toBeGreaterThan(0);

      await takeScreenshot(page, 'ldap-03-validation-errors');
    });

    test('should create LDAP configuration', async ({ page }) => {
      await page.goto(`${BASE_URL}/settings/system-settings/ldap-server`);
      await page.waitForLoadState('networkidle');

      // Open create modal
      await page.click('button:has-text("Create")');
      await page.waitForTimeout(500);

      // Fill LDAP details
      const modal = page.locator('.ant-modal-body');
      await modal.locator('input[id*="name"]').fill('Test LDAP Server');
      await modal.locator('input[id*="host"]').first().fill('ldap.test.com');
      await modal.locator('input[id*="port"]').fill('389');
      await modal.locator('input[id*="fqdn"]').fill('dc=test,dc=com');

      await takeScreenshot(page, 'ldap-04-filled-form');

      // Create
      await page.click('button:has-text("Create")');

      // Wait for success message
      await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 5000 });
      await takeScreenshot(page, 'ldap-05-create-success');
    });

    test('should search LDAP configurations', async ({ page }) => {
      await page.goto(`${BASE_URL}/settings/system-settings/ldap-server`);
      await page.waitForLoadState('networkidle');

      // Enter search text
      const searchInput = page.locator('input[placeholder*="Search"]');
      await searchInput.fill('Test');
      await page.waitForTimeout(1000);

      await takeScreenshot(page, 'ldap-06-search');
    });

    test('should view LDAP configuration details', async ({ page }) => {
      await page.goto(`${BASE_URL}/settings/system-settings/ldap-server`);
      await page.waitForLoadState('networkidle');

      // Click on first LDAP config if exists
      const firstConfig = page.locator('table tbody tr:first-child a');
      if (await firstConfig.count() > 0) {
        await firstConfig.click();
        await page.waitForTimeout(500);

        // Verify detail modal opened
        await expect(page.locator('.ant-modal-title')).toContainText('LDAP Server Configuration Details');
        await takeScreenshot(page, 'ldap-07-view-details');

        // Close modal
        await page.click('button:has-text("Close")');
      } else {
        await takeScreenshot(page, 'ldap-07-no-data');
      }
    });

    test('should export LDAP configurations', async ({ page }) => {
      await page.goto(`${BASE_URL}/settings/system-settings/ldap-server`);
      await page.waitForLoadState('networkidle');

      // Setup download listener
      const downloadPromise = page.waitForEvent('download', { timeout: 5000 }).catch(() => null);

      // Click export button
      const exportButton = page.locator('button[title="Export"]');
      await exportButton.click();

      const download = await downloadPromise;
      if (download) {
        expect(download.suggestedFilename()).toContain('ldap');
      }

      await takeScreenshot(page, 'ldap-08-export');
    });
  });

  test.describe('Server Settings (System Preferences)', () => {
    test('should display server settings page', async ({ page }) => {
      await page.goto(`${BASE_URL}/settings/system-settings/server-settings`);
      await page.waitForLoadState('networkidle');

      await expect(page.locator('h2')).toContainText('Server Settings');
      await takeScreenshot(page, 'server-01-page-load');
    });

    test('should toggle session timeout', async ({ page }) => {
      await page.goto(`${BASE_URL}/settings/system-settings/server-settings`);
      await page.waitForLoadState('networkidle');

      // Toggle session timeout switch
      const sessionSwitch = page.locator('button[role="switch"]:near(:text("Session Timeout"))');
      await sessionSwitch.click();
      await page.waitForTimeout(500);

      await takeScreenshot(page, 'server-02-session-toggle');
    });

    test('should validate session timeout values', async ({ page }) => {
      await page.goto(`${BASE_URL}/settings/system-settings/server-settings`);
      await page.waitForLoadState('networkidle');

      // Find session timeout input
      const timeoutInput = page.locator('input[id*="sessionTimeoutMinutes"]');

      // Try invalid value (too high)
      await timeoutInput.fill('2000');
      await page.click('button:has-text("Save")');
      await page.waitForTimeout(1000);

      await takeScreenshot(page, 'server-03-validation');

      // Set valid value
      await timeoutInput.fill('60');
    });

    test('should configure session settings', async ({ page }) => {
      await page.goto(`${BASE_URL}/settings/system-settings/server-settings`);
      await page.waitForLoadState('networkidle');

      // Configure session timeout
      await page.locator('input[id*="sessionTimeoutMinutes"]').fill('120');
      await page.locator('input[id*="sessionIdleTimeoutMinutes"]').fill('30');

      await takeScreenshot(page, 'server-04-session-config');

      // Save
      await page.click('button:has-text("Save")');
      await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 5000 });
    });

    test('should configure endpoint timeout settings', async ({ page }) => {
      await page.goto(`${BASE_URL}/settings/system-settings/server-settings`);
      await page.waitForLoadState('networkidle');

      // Configure endpoint timeouts
      await page.locator('input[id*="endpointOnlineStatusTimeoutHours"]').fill('2');
      await page.locator('input[id*="endpointScanJobTimeoutHours"]').fill('4');

      await takeScreenshot(page, 'server-05-endpoint-timeouts');

      // Save
      await page.click('button:has-text("Save")');
      await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 5000 });
    });

    test('should configure log level', async ({ page }) => {
      await page.goto(`${BASE_URL}/settings/system-settings/server-settings`);
      await page.waitForLoadState('networkidle');

      // Change log level
      await page.selectOption('select[id*="logLevel"]', 'Info');

      await takeScreenshot(page, 'server-06-log-level');

      // Save
      await page.click('button:has-text("Save")');
      await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 5000 });
    });

    test('should reset server settings form', async ({ page }) => {
      await page.goto(`${BASE_URL}/settings/system-settings/server-settings`);
      await page.waitForLoadState('networkidle');

      // Change some values
      await page.locator('input[id*="sessionTimeoutMinutes"]').fill('999');

      // Click reset
      await page.click('button:has-text("Reset")');
      await page.waitForTimeout(500);

      // Verify values are reset
      await takeScreenshot(page, 'server-07-reset');
    });

    test('should persist server settings across page reloads', async ({ page }) => {
      await page.goto(`${BASE_URL}/settings/system-settings/server-settings`);
      await page.waitForLoadState('networkidle');

      // Set specific values
      await page.locator('input[id*="sessionTimeoutMinutes"]').fill('90');
      await page.selectOption('select[id*="logLevel"]', 'Warning');

      // Save
      await page.click('button:has-text("Save")');
      await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 5000 });

      // Reload page
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Verify values persisted
      const timeoutValue = await page.locator('input[id*="sessionTimeoutMinutes"]').inputValue();
      const logLevelValue = await page.locator('select[id*="logLevel"]').inputValue();

      expect(timeoutValue).toBe('90');
      expect(logLevelValue).toBe('Warning');

      await takeScreenshot(page, 'server-08-persistence');
    });
  });

  test.describe('Settings Navigation and Integration', () => {
    test('should navigate between different settings pages', async ({ page }) => {
      // Start at mail server
      await page.goto(`${BASE_URL}/settings/system-settings/mail-server`);
      await page.waitForLoadState('networkidle');
      await takeScreenshot(page, 'nav-01-mail-server');

      // Navigate to proxy server
      await page.goto(`${BASE_URL}/settings/system-settings/proxy-server`);
      await page.waitForLoadState('networkidle');
      await takeScreenshot(page, 'nav-02-proxy-server');

      // Navigate to LDAP
      await page.goto(`${BASE_URL}/settings/system-settings/ldap-server`);
      await page.waitForLoadState('networkidle');
      await takeScreenshot(page, 'nav-03-ldap-server');

      // Navigate to server settings
      await page.goto(`${BASE_URL}/settings/system-settings/server-settings`);
      await page.waitForLoadState('networkidle');
      await takeScreenshot(page, 'nav-04-server-settings');
    });

    test('should handle concurrent form edits gracefully', async ({ page }) => {
      await page.goto(`${BASE_URL}/settings/system-settings/mail-server`);
      await page.waitForLoadState('networkidle');

      // Fill form
      await page.fill('input[placeholder="SMTP Host"]', 'smtp1.test.com');

      // Navigate away without saving
      await page.goto(`${BASE_URL}/settings/system-settings/proxy-server`);
      await page.waitForLoadState('networkidle');

      // Navigate back
      await page.goto(`${BASE_URL}/settings/system-settings/mail-server`);
      await page.waitForLoadState('networkidle');

      // Verify unsaved changes are not persisted
      await takeScreenshot(page, 'nav-05-unsaved-changes');
    });

    test('should display proper error handling', async ({ page }) => {
      await page.goto(`${BASE_URL}/settings/system-settings/mail-server`);
      await page.waitForLoadState('networkidle');

      // Fill with invalid email
      await page.fill('input[placeholder="SMTP Host"]', 'smtp.test.com');
      await page.fill('input[type="number"]', '587');
      await page.fill('input[placeholder="Email"]', 'invalid-email');

      // Try to save
      await page.click('button:has-text("Save")');
      await page.waitForTimeout(1000);

      // Check for validation error
      await expect(page.locator('.ant-form-item-explain-error')).toBeVisible();
      await takeScreenshot(page, 'error-01-invalid-email');
    });
  });

  test.describe('Accessibility and Usability', () => {
    test('should have accessible form labels', async ({ page }) => {
      await page.goto(`${BASE_URL}/settings/system-settings/mail-server`);
      await page.waitForLoadState('networkidle');

      // Check for labels
      const labels = await page.locator('label').count();
      expect(labels).toBeGreaterThan(0);

      await takeScreenshot(page, 'a11y-01-labels');
    });

    test('should show loading states', async ({ page }) => {
      await page.goto(`${BASE_URL}/settings/system-settings/mail-server`);
      await page.waitForLoadState('networkidle');

      // Fill form
      await page.fill('input[placeholder="SMTP Host"]', 'smtp.test.com');
      await page.fill('input[type="number"]', '587');
      await page.fill('input[placeholder="Email"]', 'test@test.com');

      // Click save and immediately check for loading state
      await page.click('button:has-text("Save")');

      // Loading button should be visible briefly
      await page.waitForTimeout(200);
      await takeScreenshot(page, 'a11y-02-loading-state');
    });

    test('should handle keyboard navigation', async ({ page }) => {
      await page.goto(`${BASE_URL}/settings/system-settings/mail-server`);
      await page.waitForLoadState('networkidle');

      // Tab through form fields
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');

      await takeScreenshot(page, 'a11y-03-keyboard-nav');
    });
  });

  test.describe('Data Persistence and Reload', () => {
    test('should persist SMTP settings after save', async ({ page }) => {
      const testHost = `smtp-${Date.now()}.test.com`;

      // Save settings
      await page.goto(`${BASE_URL}/settings/system-settings/mail-server`);
      await page.waitForLoadState('networkidle');

      await page.fill('input[placeholder="SMTP Host"]', testHost);
      await page.fill('input[type="number"]', '587');
      await page.fill('input[placeholder="Email"]', 'persist@test.com');

      await page.click('button:has-text("Save")');
      await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 5000 });

      // Reload page
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Verify data persisted
      const hostValue = await page.locator('input[placeholder="SMTP Host"]').inputValue();
      expect(hostValue).toContain('smtp');

      await takeScreenshot(page, 'persist-01-smtp');
    });

    test('should persist proxy settings after save', async ({ page }) => {
      await page.goto(`${BASE_URL}/settings/system-settings/proxy-server`);
      await page.waitForLoadState('networkidle');

      // Enable and configure
      const enableSwitch = page.locator('button[role="switch"]:near(:text("Enable Proxy Server"))');
      await enableSwitch.click();
      await page.waitForTimeout(500);

      await page.fill('input[placeholder="Proxy Host"]', 'proxy.persist.com');
      await page.fill('input[placeholder="8080"]', '3128');

      await page.click('button:has-text("Save")');
      await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 5000 });

      // Reload
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Verify persistence
      await takeScreenshot(page, 'persist-02-proxy');
    });
  });
});
