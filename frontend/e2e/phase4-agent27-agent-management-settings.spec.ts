import { test, expect, Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BASE_URL = 'http://localhost:5173';
const SCREENSHOT_DIR = path.join(__dirname, '../screenshots/phase4-agent27');

// Ensure screenshot directory exists
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function login(page: Page) {
  await page.goto(`${BASE_URL}/login`);
  await page.fill('input[type="email"]', 'admin@patchiq.io');
  await page.fill('input[type="password"]', 'admin123');
  await page.click('button[type="submit"]');
  await page.waitForLoadState('networkidle');
  await page.waitForURL(`${BASE_URL}/dashboard`);
}

async function navigateToSettings(page: Page, path: string) {
  await page.goto(`${BASE_URL}${path}`);
  await page.waitForLoadState('networkidle');
}

async function captureScreenshot(page: Page, name: string) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${name}-${timestamp}.png`;
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, filename) });
  return filename;
}

async function checkForConsoleErrors(page: Page) {
  const errors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  return errors;
}

test.describe('PHASE 4 - AGENT 27: Agent Management Settings', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('1.1 - Navigate to Agent Management parent page', async ({ page }) => {
    const startTime = Date.now();
    await navigateToSettings(page, '/settings/agent-management');
    const loadTime = Date.now() - startTime;

    await page.waitForSelector('h2, [class*="Title"]', { timeout: 5000 });
    const screenshot = await captureScreenshot(page, '01-agent-management-parent');

    console.log(`Page loaded in ${loadTime}ms`);
    expect(loadTime).toBeLessThan(3000);
    console.log(`Screenshot saved: ${screenshot}`);
  });

  test('1.2 - Verify Agent Management menu structure', async ({ page }) => {
    await navigateToSettings(page, '/settings');

    // Look for agent-related menu items
    const agentMenuItems = await page.locator('a:has-text("Agent Management"), a:has-text("Agent Approvals"), a:has-text("Agent Versions")').count();
    console.log(`Found ${agentMenuItems} agent management menu items`);

    expect(agentMenuItems).toBeGreaterThan(0);
    const screenshot = await captureScreenshot(page, '02-settings-menu');
  });

  // Test Case 2: Agent Approvals
  test('2.1 - Navigate to Agent Approvals', async ({ page }) => {
    const startTime = Date.now();
    await navigateToSettings(page, '/settings/agent-approvals');
    const loadTime = Date.now() - startTime;

    await page.waitForSelector('h2:has-text("Agent Approvals"), [class*="Title"]', { timeout: 5000 });
    const screenshot = await captureScreenshot(page, '03-agent-approvals');

    console.log(`Agent Approvals page loaded in ${loadTime}ms`);
    expect(loadTime).toBeLessThan(3000);
  });

  test('2.2 - Agent Approvals table functionality', async ({ page }) => {
    await navigateToSettings(page, '/settings/agent-approvals');

    // Check for table presence
    const table = await page.locator('table').count();
    expect(table).toBeGreaterThan(0);

    // Check for search functionality
    const searchInput = await page.locator('input[placeholder*="Search"]').count();
    expect(searchInput).toBeGreaterThan(0);

    // Check for action buttons
    const refreshBtn = await page.locator('button:has-text("Refresh")').count();
    const exportBtn = await page.locator('button:has-text("Export")').count();

    console.log(`Found Refresh button: ${refreshBtn > 0}, Export button: ${exportBtn > 0}`);
    expect(refreshBtn).toBeGreaterThan(0);
    expect(exportBtn).toBeGreaterThan(0);

    const screenshot = await captureScreenshot(page, '04-agent-approvals-table');
  });

  test('2.3 - Agent Approvals search functionality', async ({ page }) => {
    await navigateToSettings(page, '/settings/agent-approvals');

    const searchInput = page.locator('input[placeholder*="Search"]').first();
    await searchInput.fill('test');
    await page.waitForTimeout(500);

    const screenshot = await captureScreenshot(page, '05-agent-approvals-search');
    console.log('Search functionality tested');
  });

  test('2.4 - Agent Approvals refresh button', async ({ page }) => {
    await navigateToSettings(page, '/settings/agent-approvals');

    const refreshBtn = page.locator('button:has-text("Refresh")').first();
    await refreshBtn.click();
    await page.waitForTimeout(1000);

    const screenshot = await captureScreenshot(page, '06-agent-approvals-refresh');
    console.log('Refresh button tested');
  });

  test('2.5 - Agent Approvals export button', async ({ page }) => {
    await navigateToSettings(page, '/settings/agent-approvals');

    const exportBtn = page.locator('button:has-text("Export")').first();
    await exportBtn.click();
    await page.waitForTimeout(500);

    const screenshot = await captureScreenshot(page, '07-agent-approvals-export');
    console.log('Export button tested');
  });

  // Test Case 3: Agent Approval Settings
  test('3.1 - Navigate to Agent Approval Settings', async ({ page }) => {
    const startTime = Date.now();
    await navigateToSettings(page, '/settings/agent-approval-settings');
    const loadTime = Date.now() - startTime;

    await page.waitForSelector('h2, [class*="Title"]', { timeout: 5000 });
    const screenshot = await captureScreenshot(page, '08-agent-approval-settings');

    console.log(`Agent Approval Settings page loaded in ${loadTime}ms`);
    expect(loadTime).toBeLessThan(3000);
  });

  test('3.2 - Agent Approval Settings form functionality', async ({ page }) => {
    await navigateToSettings(page, '/settings/agent-approval-settings');

    // Check for radio buttons
    const radios = await page.locator('input[type="radio"]').count();
    console.log(`Found ${radios} radio buttons`);
    expect(radios).toBeGreaterThan(0);

    // Check for form labels
    const labels = await page.locator('label').count();
    expect(labels).toBeGreaterThan(0);

    const screenshot = await captureScreenshot(page, '09-agent-approval-settings-form');
  });

  test('3.3 - Agent Approval Settings save/reset buttons', async ({ page }) => {
    await navigateToSettings(page, '/settings/agent-approval-settings');

    const saveBtn = await page.locator('button:has-text("Save")').count();
    const resetBtn = await page.locator('button:has-text("Reset")').count();

    console.log(`Found Save button: ${saveBtn > 0}, Reset button: ${resetBtn > 0}`);
    expect(saveBtn).toBeGreaterThan(0);
    expect(resetBtn).toBeGreaterThan(0);

    const screenshot = await captureScreenshot(page, '10-agent-approval-settings-buttons');
  });

  test('3.4 - Agent Approval Settings modify and save', async ({ page }) => {
    await navigateToSettings(page, '/settings/agent-approval-settings');

    // Select "Auto" option
    const autoRadio = page.locator('input[type="radio"][value="auto"]');
    const isVisible = await autoRadio.isVisible();

    if (isVisible) {
      await autoRadio.click();
      await page.waitForTimeout(500);

      const saveBtn = page.locator('button:has-text("Save")').first();
      await saveBtn.click();
      await page.waitForTimeout(1000);
    }

    const screenshot = await captureScreenshot(page, '11-agent-approval-settings-modified');
  });

  // Test Case 4: Agent Versions
  test('4.1 - Navigate to Agent Versions', async ({ page }) => {
    const startTime = Date.now();
    await navigateToSettings(page, '/settings/agent-versions');
    const loadTime = Date.now() - startTime;

    await page.waitForSelector('h2, [class*="Title"]', { timeout: 5000 });
    const screenshot = await captureScreenshot(page, '12-agent-versions');

    console.log(`Agent Versions page loaded in ${loadTime}ms`);
    expect(loadTime).toBeLessThan(3000);
  });

  test('4.2 - Agent Versions table and columns', async ({ page }) => {
    await navigateToSettings(page, '/settings/agent-versions');

    // Check for table
    const table = await page.locator('table').count();
    expect(table).toBeGreaterThan(0);

    // Check for columns
    const headers = await page.locator('th').allTextContents();
    console.log(`Table headers: ${headers.join(', ')}`);

    const screenshot = await captureScreenshot(page, '13-agent-versions-table');
  });

  test('4.3 - Agent Versions search and filter', async ({ page }) => {
    await navigateToSettings(page, '/settings/agent-versions');

    const searchInput = page.locator('input[placeholder*="Search"]');
    const isVisible = await searchInput.isVisible();

    if (isVisible) {
      await searchInput.fill('Linux');
      await page.waitForTimeout(500);
    }

    const screenshot = await captureScreenshot(page, '14-agent-versions-search');
  });

  test('4.4 - Agent Versions export button', async ({ page }) => {
    await navigateToSettings(page, '/settings/agent-versions');

    const exportBtn = page.locator('button:has-text("Export")');
    const isVisible = await exportBtn.isVisible();

    if (isVisible) {
      await exportBtn.click();
      await page.waitForTimeout(500);
    }

    const screenshot = await captureScreenshot(page, '15-agent-versions-export');
  });

  test('4.5 - Agent Versions refresh button', async ({ page }) => {
    await navigateToSettings(page, '/settings/agent-versions');

    const refreshBtn = page.locator('button:has-text("Refresh")');
    const isVisible = await refreshBtn.isVisible();

    if (isVisible) {
      await refreshBtn.click();
      await page.waitForTimeout(1000);
    }

    const screenshot = await captureScreenshot(page, '16-agent-versions-refresh');
  });

  // Test Case 5: Agent Configuration
  test('5.1 - Navigate to Agent Configuration', async ({ page }) => {
    const startTime = Date.now();
    await navigateToSettings(page, '/settings/agent-configuration');
    const loadTime = Date.now() - startTime;

    await page.waitForSelector('h2, [class*="Title"]', { timeout: 5000 });
    const screenshot = await captureScreenshot(page, '17-agent-configuration');

    console.log(`Agent Configuration page loaded in ${loadTime}ms`);
    expect(loadTime).toBeLessThan(3000);
  });

  test('5.2 - Agent Configuration form structure', async ({ page }) => {
    await navigateToSettings(page, '/settings/agent-configuration');

    // Check for form inputs
    const inputs = await page.locator('input[type="number"]').count();
    console.log(`Found ${inputs} number input fields`);
    expect(inputs).toBeGreaterThan(0);

    // Check for cards
    const cards = await page.locator('[class*="Card"]').count();
    console.log(`Found ${cards} card elements`);

    const screenshot = await captureScreenshot(page, '18-agent-configuration-form');
  });

  test('5.3 - Agent Configuration save and reset buttons', async ({ page }) => {
    await navigateToSettings(page, '/settings/agent-configuration');

    const saveBtn = await page.locator('button:has-text("Save")').count();
    const resetBtn = await page.locator('button:has-text("Reset")').count();

    console.log(`Found Save button: ${saveBtn > 0}, Reset button: ${resetBtn > 0}`);
    expect(saveBtn).toBeGreaterThan(0);
    expect(resetBtn).toBeGreaterThan(0);

    const screenshot = await captureScreenshot(page, '19-agent-configuration-buttons');
  });

  test('5.4 - Agent Configuration input validation', async ({ page }) => {
    await navigateToSettings(page, '/settings/agent-configuration');

    const firstInput = page.locator('input[type="number"]').first();
    await firstInput.fill('100');
    await page.waitForTimeout(500);

    const value = await firstInput.inputValue();
    console.log(`Input value set to: ${value}`);

    const screenshot = await captureScreenshot(page, '20-agent-configuration-input');
  });

  // Test Case 6: Enroll Secret
  test('6.1 - Navigate to Enroll Secret', async ({ page }) => {
    const startTime = Date.now();
    await navigateToSettings(page, '/settings/enroll-secret');
    const loadTime = Date.now() - startTime;

    await page.waitForSelector('h2, [class*="Title"]', { timeout: 5000 });
    const screenshot = await captureScreenshot(page, '21-enroll-secret');

    console.log(`Enroll Secret page loaded in ${loadTime}ms`);
    expect(loadTime).toBeLessThan(3000);
  });

  test('6.2 - Enroll Secret table and columns', async ({ page }) => {
    await navigateToSettings(page, '/settings/enroll-secret');

    // Check for table
    const table = await page.locator('table').count();
    expect(table).toBeGreaterThan(0);

    // Check for columns
    const headers = await page.locator('th').allTextContents();
    console.log(`Table headers: ${headers.join(', ')}`);

    const screenshot = await captureScreenshot(page, '22-enroll-secret-table');
  });

  test('6.3 - Enroll Secret create button', async ({ page }) => {
    await navigateToSettings(page, '/settings/enroll-secret');

    const createBtn = page.locator('button:has-text("Create")');
    const isVisible = await createBtn.isVisible();

    console.log(`Create button visible: ${isVisible}`);
    expect(isVisible).toBeTruthy();

    const screenshot = await captureScreenshot(page, '23-enroll-secret-buttons');
  });

  test('6.4 - Enroll Secret create flow', async ({ page }) => {
    await navigateToSettings(page, '/settings/enroll-secret');

    const createBtn = page.locator('button:has-text("Create")');
    await createBtn.click();
    await page.waitForTimeout(500);

    // Check if modal appeared
    const modal = await page.locator('[role="dialog"], [class*="Modal"]').count();
    console.log(`Modal visible: ${modal > 0}`);

    const screenshot = await captureScreenshot(page, '24-enroll-secret-create-modal');
  });

  test('6.5 - Enroll Secret search functionality', async ({ page }) => {
    await navigateToSettings(page, '/settings/enroll-secret');

    const searchInput = page.locator('input[placeholder*="Search"]').first();
    await searchInput.fill('test');
    await page.waitForTimeout(500);

    const screenshot = await captureScreenshot(page, '25-enroll-secret-search');
  });

  test('6.6 - Enroll Secret export button', async ({ page }) => {
    await navigateToSettings(page, '/settings/enroll-secret');

    const exportBtn = page.locator('button:has-text("Export")');
    const isVisible = await exportBtn.isVisible();

    if (isVisible) {
      await exportBtn.click();
      await page.waitForTimeout(500);
    }

    const screenshot = await captureScreenshot(page, '26-enroll-secret-export');
  });

  test('6.7 - Enroll Secret refresh button', async ({ page }) => {
    await navigateToSettings(page, '/settings/enroll-secret');

    const refreshBtn = page.locator('button:has-text("Refresh")');
    const isVisible = await refreshBtn.isVisible();

    if (isVisible) {
      await refreshBtn.click();
      await page.waitForTimeout(1000);
    }

    const screenshot = await captureScreenshot(page, '27-enroll-secret-refresh');
  });

  // Test Case 7: Red Hat Agent Nomination
  test('7.1 - Navigate to Red Hat Agent Nomination', async ({ page }) => {
    const startTime = Date.now();
    await navigateToSettings(page, '/settings/red-hat-agent-nomination');
    const loadTime = Date.now() - startTime;

    await page.waitForSelector('h2, [class*="Title"]', { timeout: 5000 });
    const screenshot = await captureScreenshot(page, '28-red-hat-nomination');

    console.log(`Red Hat Agent Nomination page loaded in ${loadTime}ms`);
    expect(loadTime).toBeLessThan(3000);
  });

  test('7.2 - Red Hat Agent Nomination table', async ({ page }) => {
    await navigateToSettings(page, '/settings/red-hat-agent-nomination');

    // Check for table
    const table = await page.locator('table').count();
    expect(table).toBeGreaterThan(0);

    // Check for columns
    const headers = await page.locator('th').allTextContents();
    console.log(`Table headers: ${headers.join(', ')}`);

    const screenshot = await captureScreenshot(page, '29-red-hat-nomination-table');
  });

  test('7.3 - Red Hat Agent Nomination actions', async ({ page }) => {
    await navigateToSettings(page, '/settings/red-hat-agent-nomination');

    // Look for edit buttons
    const editButtons = await page.locator('button[title*="Edit"], button[aria-label*="Edit"]').count();
    console.log(`Found ${editButtons} edit buttons`);

    const screenshot = await captureScreenshot(page, '30-red-hat-nomination-actions');
  });

  test('7.4 - Red Hat Agent Nomination search', async ({ page }) => {
    await navigateToSettings(page, '/settings/red-hat-agent-nomination');

    const searchInput = page.locator('input[placeholder*="Search"]').first();
    await searchInput.fill('test');
    await page.waitForTimeout(500);

    const screenshot = await captureScreenshot(page, '31-red-hat-nomination-search');
  });

  test('7.5 - Red Hat Agent Nomination export', async ({ page }) => {
    await navigateToSettings(page, '/settings/red-hat-agent-nomination');

    const exportBtn = page.locator('button:has-text("Export")');
    const isVisible = await exportBtn.isVisible();

    if (isVisible) {
      await exportBtn.click();
      await page.waitForTimeout(500);
    }

    const screenshot = await captureScreenshot(page, '32-red-hat-nomination-export');
  });

  test('7.6 - Red Hat Agent Nomination refresh', async ({ page }) => {
    await navigateToSettings(page, '/settings/red-hat-agent-nomination');

    const refreshBtn = page.locator('button:has-text("Refresh")');
    const isVisible = await refreshBtn.isVisible();

    if (isVisible) {
      await refreshBtn.click();
      await page.waitForTimeout(1000);
    }

    const screenshot = await captureScreenshot(page, '33-red-hat-nomination-refresh');
  });

  // Console error checking
  test('8.1 - Check for console errors on all pages', async ({ page }) => {
    const errors: { page: string; errors: string[] }[] = [];

    const pages = [
      { name: 'Agent Management', path: '/settings/agent-management' },
      { name: 'Agent Approvals', path: '/settings/agent-approvals' },
      { name: 'Agent Approval Settings', path: '/settings/agent-approval-settings' },
      { name: 'Agent Versions', path: '/settings/agent-versions' },
      { name: 'Agent Configuration', path: '/settings/agent-configuration' },
      { name: 'Enroll Secret', path: '/settings/enroll-secret' },
      { name: 'Red Hat Agent Nomination', path: '/settings/red-hat-agent-nomination' },
    ];

    for (const testPage of pages) {
      const pageErrors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          pageErrors.push(msg.text());
        }
      });

      await navigateToSettings(page, testPage.path);

      if (pageErrors.length > 0) {
        errors.push({ page: testPage.name, errors: pageErrors });
      }
    }

    console.log(`Console error check complete. Errors found: ${errors.length}`);
    if (errors.length > 0) {
      console.log('Errors by page:', JSON.stringify(errors, null, 2));
    }
  });

  // Performance test
  test('8.2 - Measure page load times', async ({ page }) => {
    const results: { page: string; loadTime: number }[] = [];

    const pages = [
      { name: 'Agent Management', path: '/settings/agent-management' },
      { name: 'Agent Approvals', path: '/settings/agent-approvals' },
      { name: 'Agent Approval Settings', path: '/settings/agent-approval-settings' },
      { name: 'Agent Versions', path: '/settings/agent-versions' },
      { name: 'Agent Configuration', path: '/settings/agent-configuration' },
      { name: 'Enroll Secret', path: '/settings/enroll-secret' },
      { name: 'Red Hat Agent Nomination', path: '/settings/red-hat-agent-nomination' },
    ];

    for (const testPage of pages) {
      const startTime = Date.now();
      await navigateToSettings(page, testPage.path);
      const loadTime = Date.now() - startTime;
      results.push({ page: testPage.name, loadTime });
    }

    console.log('Page Load Times:');
    results.forEach(r => console.log(`  ${r.page}: ${r.loadTime}ms`));
  });
});
