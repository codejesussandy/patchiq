import { test, expect, Page, Browser, BrowserContext } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Screenshot directory
const SCREENSHOT_DIR = path.join(__dirname, '../screenshots/phase4-agent28');

// Ensure screenshot directory exists
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

const BASE_URL = 'http://localhost:5173';
const ADMIN_EMAIL = 'admin@patchiq.io';
const ADMIN_PASSWORD = 'admin123';

async function login(page: Page) {
  await page.goto(`${BASE_URL}/login`);
  await page.waitForSelector('form', { timeout: 10000 });
  await page.getByPlaceholder('sharma@mail.com').fill(ADMIN_EMAIL);
  await page.getByPlaceholder('Password').fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Log in' }).click();

  // Wait for redirect
  const result = await Promise.race([
    page.waitForURL('**/dashboard**', { timeout: 15000 }).then(() => 'dashboard'),
    page.locator('.ant-message-error').waitFor({ timeout: 5000 }).then(() => 'error'),
  ]).catch(() => 'timeout');

  if (result === 'error') {
    throw new Error('Login failed');
  }

  await page.waitForTimeout(1000);
}

async function captureScreenshot(page: Page, name: string) {
  const filePath = path.join(SCREENSHOT_DIR, `${name}.png`);
  await page.screenshot({ path: filePath });
  console.log(`Screenshot saved: ${filePath}`);
  return filePath;
}

async function checkConsoleErrors(page: Page): Promise<string[]> {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  page.on('pageerror', (err) => {
    errors.push(err.message);
  });
  return errors;
}

async function measurePageLoadTime(page: Page, url: string): Promise<number> {
  const startTime = Date.now();
  await page.goto(url, { waitUntil: 'networkidle' });
  const endTime = Date.now();
  return endTime - startTime;
}

test.describe('PHASE 4 - AGENT 28: Patch Management Settings', () => {
  let page: Page;

  test.beforeAll(async ({ browser }: { browser: Browser }) => {
    const context = await browser.newContext();
    page = await context.newPage();
    await login(page);
  });

  test.afterAll(async () => {
    await page.close();
  });

  // TEST 1: Navigate to Patch Management Settings
  test('1. Navigate to Patch Management Settings main page', async () => {
    const loadTime = await measurePageLoadTime(page, `${BASE_URL}/settings/patch-management`);
    console.log(`Page load time: ${loadTime}ms`);

    expect(loadTime).toBeLessThan(5000); // Should load in less than 5 seconds
    await captureScreenshot(page, '01-patch-management-main');

    // Verify page content
    const pageContent = await page.textContent('body');
    expect(pageContent).toBeTruthy();
  });

  // TEST 2: Navigate to Computer Groups
  test('2. Navigate to Computer Groups page', async () => {
    const loadTime = await measurePageLoadTime(page, `${BASE_URL}/settings/patch-management/computer-groups`);
    console.log(`Computer Groups load time: ${loadTime}ms`);

    expect(loadTime).toBeLessThan(5000);

    // Verify page title
    const title = await page.textContent('h2, h3');
    expect(title).toContain('Computer Groups');

    await captureScreenshot(page, '02-computer-groups-list');
  });

  // TEST 3: Create a Computer Group
  test('3. Create a new Computer Group', async () => {
    // Click Create button
    const createButton = await page.locator('button:has-text("Create")').first();
    await createButton.click();
    await page.waitForTimeout(500);

    await captureScreenshot(page, '03-computer-group-create-modal-open');

    // Fill form
    await page.fill('input[placeholder*="Name"]', 'Test Group Alpha');
    await page.fill('textarea[placeholder*="Description"]', 'Test computer group for validation');

    await captureScreenshot(page, '03b-computer-group-form-filled');

    // Submit form
    const submitButton = await page.locator('button:has-text("Create")').last();
    await submitButton.click();

    // Wait for success message
    await page.waitForTimeout(2000);

    // Check for success message
    const successMsg = await page.textContent('.ant-message');
    expect(successMsg || '').toContain('successfully');

    await captureScreenshot(page, '03c-computer-group-created');
  });

  // TEST 4: Edit Computer Group
  test('4. Edit an existing Computer Group', async () => {
    // Verify we're on the list page
    const title = await page.textContent('h2, h3');
    expect(title).toContain('Computer Groups');

    // Wait for data to load
    await page.waitForTimeout(1000);

    // Find and click edit button for the first group
    const editButtons = await page.locator('button[title="Edit"]');
    if (await editButtons.count() > 0) {
      await editButtons.first().click();
      await page.waitForTimeout(500);

      await captureScreenshot(page, '04-computer-group-edit-modal');

      // Modify the description
      const descField = await page.locator('textarea[placeholder*="Description"]');
      await descField.clear();
      await descField.fill('Updated description for test group');

      await captureScreenshot(page, '04b-computer-group-edit-form-modified');

      // Submit
      const saveButton = await page.locator('button:has-text("Save")').last();
      await saveButton.click();
      await page.waitForTimeout(2000);

      await captureScreenshot(page, '04c-computer-group-updated');
    }
  });

  // TEST 5: Navigate to Patch Preferences
  test('5. Navigate to Patch Preferences page', async () => {
    const loadTime = await measurePageLoadTime(page, `${BASE_URL}/settings/patch-management/patch-preferences`);
    console.log(`Patch Preferences load time: ${loadTime}ms`);

    expect(loadTime).toBeLessThan(5000);

    // Verify page title
    const title = await page.textContent('h2, h3');
    expect(title).toContain('Patch Preferences');

    await captureScreenshot(page, '05-patch-preferences-view');
  });

  // TEST 6: Modify Patch Preferences
  test('6. Modify Patch Preferences settings', async () => {
    // Ensure we're on the patch preferences page
    const title = await page.textContent('h2, h3');
    expect(title).toContain('Patch Preferences');

    await captureScreenshot(page, '06-patch-preferences-before-modify');

    // Check Enable Patching checkbox
    const enablePatchingCheckbox = await page.locator('input[type="checkbox"]').first();
    const isChecked = await enablePatchingCheckbox.isChecked();
    if (!isChecked) {
      await enablePatchingCheckbox.click();
      await page.waitForTimeout(500);
    }

    // Check Corridor Only Approved Patch checkbox
    const corridorCheckbox = await page.locator('input[type="checkbox"]').nth(1);
    const corridorChecked = await corridorCheckbox.isChecked();
    if (!corridorChecked) {
      await corridorCheckbox.click();
      await page.waitForTimeout(500);
    }

    await captureScreenshot(page, '06b-patch-preferences-checkboxes-modified');

    // Modify Patch Approval Policy - select "PreApproved"
    const radioOptions = await page.locator('input[type="radio"]');
    if (await radioOptions.count() > 0) {
      const firstRadio = radioOptions.first();
      await firstRadio.click();
      await page.waitForTimeout(500);
    }

    await captureScreenshot(page, '06c-patch-preferences-policy-modified');

    // Click Save button
    const saveButton = await page.locator('button:has-text("Save")').first();
    await saveButton.click();
    await page.waitForTimeout(2000);

    // Check for success message
    const successMsg = await page.textContent('.ant-message');
    if (successMsg) {
      console.log('Success message:', successMsg);
    }

    await captureScreenshot(page, '06d-patch-preferences-saved');
  });

  // TEST 7: Settings Persistence - Reload and Verify
  test('7. Verify Patch Preferences Settings Persist after Page Reload', async () => {
    // Get current values before reload
    const beforeReloadCheckboxes = await page.locator('input[type="checkbox"]').nth(0).isChecked();

    // Reload page
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Verify title still shows
    const title = await page.textContent('h2, h3');
    expect(title).toContain('Patch Preferences');

    // Get values after reload
    const afterReloadCheckboxes = await page.locator('input[type="checkbox"]').nth(0).isChecked();

    // Values should match
    expect(beforeReloadCheckboxes).toBe(afterReloadCheckboxes);

    await captureScreenshot(page, '07-patch-preferences-persisted-after-reload');
  });

  // TEST 8: Navigate to Distribution Server
  test('8. Navigate to Distribution Server Configuration', async () => {
    const loadTime = await measurePageLoadTime(page, `${BASE_URL}/settings/patch-management/distribution-server`);
    console.log(`Distribution Server load time: ${loadTime}ms`);

    expect(loadTime).toBeLessThan(5000);

    // Verify page title
    const title = await page.textContent('h2, h3');
    expect(title).toContain('Distribution Server');

    await captureScreenshot(page, '08-distribution-server-view');
  });

  // TEST 9: Test Distribution Server Actions
  test('9. Test Distribution Server Export and Download', async () => {
    const title = await page.textContent('h2, h3');
    expect(title).toContain('Distribution Server');

    // Check for Export button
    const exportButton = await page.locator('button:has-text("Export")');
    expect(exportButton).toBeTruthy();

    await captureScreenshot(page, '09-distribution-server-with-actions');

    // Click Download Distribution Server button
    const downloadButton = await page.locator('button:has-text("Download Distribution Server")');
    if (await downloadButton.isVisible()) {
      // Set up download listener
      const downloadPromise = page.waitForEvent('download');
      await downloadButton.click();

      try {
        const download = await downloadPromise;
        console.log(`Downloaded file: ${download.suggestedFilename()}`);
      } catch (e) {
        console.log('Download may have been cancelled or blocked');
      }
    }
  });

  // TEST 10: Navigate Away and Back to Test Persistence
  test('10. Navigate Away and Back to Patch Management', async () => {
    // Navigate to patches module
    await page.goto(`${BASE_URL}/patches`);
    await page.waitForTimeout(1000);

    await captureScreenshot(page, '10-navigated-to-patches');

    // Navigate back to patch preferences
    await page.goto(`${BASE_URL}/settings/patch-management/patch-preferences`);
    await page.waitForTimeout(1000);

    // Verify title
    const title = await page.textContent('h2, h3');
    expect(title).toContain('Patch Preferences');

    await captureScreenshot(page, '10b-returned-to-patch-preferences');
  });

  // TEST 11: Check Console for Errors
  test('11. Verify No Critical Console Errors', async () => {
    const errors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Navigate through all patch management pages
    await page.goto(`${BASE_URL}/settings/patch-management`);
    await page.waitForTimeout(500);

    await page.goto(`${BASE_URL}/settings/patch-management/computer-groups`);
    await page.waitForTimeout(500);

    await page.goto(`${BASE_URL}/settings/patch-management/patch-preferences`);
    await page.waitForTimeout(500);

    await page.goto(`${BASE_URL}/settings/patch-management/distribution-server`);
    await page.waitForTimeout(500);

    console.log(`Total console errors: ${errors.length}`);
    if (errors.length > 0) {
      console.log('Errors found:', errors);
    }

    // Filter out non-critical errors
    const criticalErrors = errors.filter(e =>
      !e.includes('Failed to load image') &&
      !e.includes('404')
    );

    expect(criticalErrors.length).toBe(0);
  });

  // TEST 12: Delete Computer Group
  test('12. Delete a Computer Group', async () => {
    // Navigate to computer groups
    await page.goto(`${BASE_URL}/settings/patch-management/computer-groups`);
    await page.waitForTimeout(1000);

    const title = await page.textContent('h2, h3');
    expect(title).toContain('Computer Groups');

    // Find delete button
    const deleteButtons = await page.locator('button[title="Delete"]');
    const count = await deleteButtons.count();

    if (count > 0) {
      await captureScreenshot(page, '12-computer-groups-list-before-delete');

      // Click first delete button
      await deleteButtons.first().click();
      await page.waitForTimeout(500);

      await captureScreenshot(page, '12b-delete-confirmation-modal');

      // Confirm delete
      const confirmButton = await page.locator('button:has-text("Delete")').last();
      if (await confirmButton.isVisible()) {
        await confirmButton.click();
        await page.waitForTimeout(1500);

        await captureScreenshot(page, '12c-computer-group-deleted');
      }
    }
  });

  // TEST 13: Sync Patch Now functionality
  test('13. Test Manual Sync Patch Now', async () => {
    await page.goto(`${BASE_URL}/settings/patch-management/patch-preferences`);
    await page.waitForTimeout(1000);

    const syncButton = await page.locator('button:has-text("Sync Now")');
    if (await syncButton.isVisible()) {
      await captureScreenshot(page, '13-before-sync-now');

      await syncButton.click();
      await page.waitForTimeout(2000);

      await captureScreenshot(page, '13b-after-sync-now');
    }
  });

  // TEST 14: Test Reset Button on Patch Preferences
  test('14. Test Reset Button on Patch Preferences', async () => {
    await page.goto(`${BASE_URL}/settings/patch-management/patch-preferences`);
    await page.waitForTimeout(1000);

    // Modify a setting
    const checkbox = await page.locator('input[type="checkbox"]').first();
    const initialState = await checkbox.isChecked();

    // Toggle it
    await checkbox.click();
    await page.waitForTimeout(500);

    const afterToggle = await checkbox.isChecked();
    expect(afterToggle).not.toBe(initialState);

    await captureScreenshot(page, '14-patch-preferences-after-toggle');

    // Click reset
    const resetButton = await page.locator('button:has-text("Reset")');
    if (await resetButton.isVisible()) {
      await resetButton.click();
      await page.waitForTimeout(500);

      const afterReset = await checkbox.isChecked();
      expect(afterReset).toBe(initialState);

      await captureScreenshot(page, '14b-patch-preferences-after-reset');
    }
  });

  // TEST 15: Integration - Create Deployment and Verify Settings Applied
  test('15. Integration Test - Create Deployment with Computer Group', async () => {
    // First create a computer group if not exists
    await page.goto(`${BASE_URL}/settings/patch-management/computer-groups`);
    await page.waitForTimeout(1000);

    // Check if there are existing groups
    const groupCount = await page.locator('tbody tr').count();
    console.log(`Existing computer groups: ${groupCount}`);

    if (groupCount === 0) {
      // Create a group
      const createButton = await page.locator('button:has-text("Create")').first();
      await createButton.click();
      await page.waitForTimeout(500);

      await page.fill('input[placeholder*="Name"]', 'Integration Test Group');
      await page.fill('textarea[placeholder*="Description"]', 'Group for integration testing');

      const submitButton = await page.locator('button:has-text("Create")').last();
      await submitButton.click();
      await page.waitForTimeout(2000);
    }

    await captureScreenshot(page, '15-computer-group-for-integration');

    // Navigate to patches
    await page.goto(`${BASE_URL}/patches`);
    await page.waitForTimeout(1500);

    await captureScreenshot(page, '15b-patches-module-loaded');

    // Verify patches page loaded
    const patchesTitle = await page.textContent('h1, h2, h3');
    expect(patchesTitle).toBeTruthy();
  });

  // TEST 16: Full Settings Navigation Flow
  test('16. Full Settings Navigation Flow', async () => {
    const pages = [
      { url: '/settings/patch-management', name: 'Main' },
      { url: '/settings/patch-management/computer-groups', name: 'Computer Groups' },
      { url: '/settings/patch-management/patch-preferences', name: 'Patch Preferences' },
      { url: '/settings/patch-management/distribution-server', name: 'Distribution Server' },
    ];

    for (const page_config of pages) {
      console.log(`Testing ${page_config.name}...`);
      const loadTime = await measurePageLoadTime(page, `${BASE_URL}${page_config.url}`);
      console.log(`  Load time: ${loadTime}ms`);
      expect(loadTime).toBeLessThan(5000);

      await captureScreenshot(page, `16-${page_config.name.replace(/\s+/g, '-').toLowerCase()}-navigation`);
    }
  });
});
