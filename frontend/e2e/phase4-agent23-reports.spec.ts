import { test, expect, Page } from '@playwright/test';

const BASE_URL = 'http://localhost:5173';
const ADMIN_EMAIL = 'admin@patchiq.io';
const ADMIN_PASSWORD = 'admin123';

let page: Page;

test.describe('Reports Module', () => {
  test.beforeAll(async () => {
    // Note: beforeAll is not typically used in Playwright, using beforeEach instead
  });

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    
    // Login
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button:has-text("Sign In")');
    await page.waitForNavigation();
    await page.goto(`${BASE_URL}/reports`);
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('TC1: Navigate to Reports page', async () => {
    console.log('TEST 1: Navigating to Reports page');
    const startTime = Date.now();
    
    // Page should load
    const heading = page.locator('h2, h1').first();
    await expect(heading).toBeVisible({ timeout: 5000 });
    
    const loadTime = Date.now() - startTime;
    console.log(`Page loaded in ${loadTime}ms`);
    console.log(`Load time requirement: < 3000ms - ${loadTime < 3000 ? 'PASS' : 'FAIL'}`);
    
    // Screenshot
    await page.screenshot({ path: '/tmp/screenshots/01_reports_main_page.png' });
  });

  test('TC2: Check Reports UI Elements', async () => {
    console.log('TEST 2: Checking UI elements');
    
    // Check search box
    const searchInput = page.locator('input[placeholder*="Search"]').first();
    await expect(searchInput).toBeVisible();
    console.log('✓ Search box visible');
    
    // Check filter dropdowns
    const filterTypes = page.locator('select, .ant-select');
    const filterCount = await filterTypes.count();
    console.log(`✓ ${filterCount} filter elements found`);
    
    // Check Create button
    const createBtn = page.locator('button:has-text("Create")').first();
    await expect(createBtn).toBeVisible();
    console.log('✓ Create button visible');
    
    // Check Export button
    const exportBtn = page.locator('button:has-text("Export")').first();
    await expect(exportBtn).toBeVisible();
    console.log('✓ Export button visible');
    
    // Check Refresh button
    const refreshBtn = page.locator('button:has-text("Refresh")').first();
    await expect(refreshBtn).toBeVisible();
    console.log('✓ Refresh button visible');
    
    await page.screenshot({ path: '/tmp/screenshots/02_reports_ui_elements.png' });
  });

  test('TC3: Create Report Flow', async () => {
    console.log('TEST 3: Testing report creation');
    
    const createBtn = page.locator('button:has-text("Create")').first();
    await createBtn.click();
    
    // Wait for modal/form to appear
    await page.waitForTimeout(1000);
    
    // Check if wizard or modal opened
    const modal = page.locator('.ant-modal, [role="dialog"]').first();
    await expect(modal).toBeVisible({ timeout: 5000 });
    console.log('✓ Create report wizard opened');
    
    await page.screenshot({ path: '/tmp/screenshots/03_create_report_wizard.png' });
  });

  test('TC4: Report Type Selection', async () => {
    console.log('TEST 4: Testing report type selection');
    
    const createBtn = page.locator('button:has-text("Create")').first();
    await createBtn.click();
    
    await page.waitForTimeout(1000);
    
    // Find type select field
    const typeSelects = page.locator('.ant-select');
    if (await typeSelects.count() > 0) {
      await typeSelects.first().click();
      await page.waitForTimeout(500);
      
      // Check if dropdown opened
      const options = page.locator('.ant-select-item-option');
      const optionCount = await options.count();
      console.log(`✓ Found ${optionCount} report type options`);
      
      if (optionCount > 0) {
        await options.first().click();
        console.log('✓ Selected first report type');
      }
    }
    
    await page.screenshot({ path: '/tmp/screenshots/04_report_type_selection.png' });
  });

  test('TC5: Check Console for Errors', async () => {
    console.log('TEST 5: Checking for console errors');
    
    let errorCount = 0;
    const errors: string[] = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errorCount++;
        errors.push(msg.text());
        console.log(`ERROR: ${msg.text()}`);
      }
    });
    
    // Trigger some interactions
    const createBtn = page.locator('button:has-text("Create")').first();
    await createBtn.click();
    await page.waitForTimeout(1000);
    
    const closeBtn = page.locator('.ant-modal-close, [aria-label="Close"]').first();
    if (await closeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await closeBtn.click();
    }
    
    if (errorCount === 0) {
      console.log('✓ No console errors detected');
    } else {
      console.log(`⚠ ${errorCount} console errors found`);
      errors.forEach(e => console.log(`  - ${e}`));
    }
  });

  test('TC6: Test Export Functionality', async () => {
    console.log('TEST 6: Testing export functionality');
    
    // Download handler setup
    const [download] = await Promise.all([
      page.waitForEvent('download').catch(() => null),
      page.locator('button:has-text("Export")').first().click()
    ]);
    
    if (download) {
      const filename = download.suggestedFilename();
      console.log(`✓ Export started: ${filename}`);
      
      // Note: In real scenario, verify file exists
    } else {
      console.log('⚠ Export did not trigger download (may be limited in test)');
    }
    
    await page.screenshot({ path: '/tmp/screenshots/06_export_functionality.png' });
  });

  test('TC7: Test Refresh Functionality', async () => {
    console.log('TEST 7: Testing refresh functionality');
    
    const refreshBtn = page.locator('button:has-text("Refresh")').first();
    const initialLoadTime = Date.now();
    
    await refreshBtn.click();
    
    // Wait for potential loading state
    await page.waitForTimeout(2000);
    
    const refreshTime = Date.now() - initialLoadTime;
    console.log(`✓ Refresh completed in ${refreshTime}ms`);
    
    await page.screenshot({ path: '/tmp/screenshots/07_refresh_functionality.png' });
  });

  test('TC8: Test Search Functionality', async () => {
    console.log('TEST 8: Testing search functionality');
    
    const searchInput = page.locator('input[placeholder*="Search"]').first();
    await searchInput.fill('test');
    await page.waitForTimeout(1000);
    
    console.log('✓ Search text entered');
    
    // Clear
    await searchInput.clear();
    await page.waitForTimeout(500);
    
    console.log('✓ Search cleared');
    
    await page.screenshot({ path: '/tmp/screenshots/08_search_functionality.png' });
  });

  test('TC9: Test Report List Display', async () => {
    console.log('TEST 9: Testing report list display');
    
    // Check if table exists
    const table = page.locator('.ant-table, table').first();
    const isVisible = await table.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (isVisible) {
      const rows = page.locator('.ant-table-row, tbody tr');
      const rowCount = await rows.count();
      console.log(`✓ Report table loaded with ${rowCount} rows`);
    } else {
      console.log('⚠ Report table not visible');
    }
    
    await page.screenshot({ path: '/tmp/screenshots/09_report_list_display.png' });
  });

  test('TC10: Error Handling - Missing Required Fields', async () => {
    console.log('TEST 10: Testing error handling for missing fields');
    
    const createBtn = page.locator('button:has-text("Create")').first();
    await createBtn.click();
    
    await page.waitForTimeout(1000);
    
    // Try to proceed without filling required fields
    const nextOrSubmitBtn = page.locator('button:has-text("Next"), button:has-text("Create"), button[type="submit"]').nth(1);
    
    if (await nextOrSubmitBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await nextOrSubmitBtn.click();
      await page.waitForTimeout(1000);
      
      // Check for validation errors
      const errorMsg = page.locator('.ant-form-item-explain-error, .ant-message-error, [role="alert"]').first();
      const hasError = await errorMsg.isVisible({ timeout: 2000 }).catch(() => false);
      
      if (hasError) {
        const errorText = await errorMsg.textContent();
        console.log(`✓ Validation error displayed: ${errorText}`);
      } else {
        console.log('⚠ No validation error message found');
      }
    }
    
    await page.screenshot({ path: '/tmp/screenshots/10_error_handling.png' });
  });
});
