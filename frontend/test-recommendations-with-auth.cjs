/**
 * Manual test script for Patch Recommendations with fresh authentication
 * Run with: node test-recommendations-with-auth.cjs
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const FRONTEND_URL = 'http://localhost:5173';
const SCREENSHOTS_DIR = path.join(__dirname, '..', 'screenshots', 'phase2-agent10');
const LOGIN_EMAIL = 'admin@patchiq.io';
const LOGIN_PASSWORD = 'admin123';

// Ensure screenshots directory exists
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

const timestamp = () => new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
const screenshotPath = (name) => path.join(SCREENSHOTS_DIR, `${name}-${timestamp()}.png`);

async function runTests() {
  console.log('=== Phase 2 Agent 10: Patch Recommendations Manual Testing ===\n');

  const browser = await chromium.launch({ headless: false, slowMo: 100 });
  const context = await browser.newContext();
  const page = await context.newPage();

  const consoleMessages = [];
  page.on('console', (msg) => {
    const type = msg.type();
    if (['error', 'warning'].includes(type)) {
      consoleMessages.push({
        type,
        text: msg.text(),
        timestamp: new Date().toISOString(),
      });
      if (type === 'error') {
        console.log(`[${type.toUpperCase()}] ${msg.text()}`);
      }
    }
  });

  try {
    // Login first
    console.log('Logging in...');
    await page.goto(`${FRONTEND_URL}/login`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    await page.fill('input[name="email"], input[type="email"]', LOGIN_EMAIL);
    await page.fill('input[type="password"]', LOGIN_PASSWORD);
    await page.screenshot({ path: screenshotPath('login-form-filled'), fullPage: true });

    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);

    const currentUrl = page.url();
    console.log(`✓ Logged in, current URL: ${currentUrl}\n`);

    if (currentUrl.includes('/login')) {
      console.log('❌ Login failed - still on login page');
      await page.screenshot({ path: screenshotPath('login-failed'), fullPage: true });
      return;
    }

    // Test 1: Navigate to Patch Recommendations
    console.log('Test 1: Navigate to Patch Recommendations...');
    const startTime = Date.now();
    await page.goto(`${FRONTEND_URL}/patch-recommendations`, { waitUntil: 'networkidle' });
    const loadTime = Date.now() - startTime;

    await page.waitForTimeout(2000);
    await page.screenshot({ path: screenshotPath('recommendations-list-loaded'), fullPage: true });

    const pageTitle = await page.locator('h3').first().textContent().catch(() => '');
    console.log(`✓ Page loaded in ${loadTime}ms`);
    console.log(`  - Page title: ${pageTitle}`);
    console.log(`  - URL: ${page.url()}\n`);

    // Test 2: Check stats cards
    console.log('Test 2: Check Statistics Cards...');
    const statsTexts = await page.locator('.ant-statistic-title').allTextContents();
    console.log(`  - Stats cards found: ${statsTexts.length}`);
    statsTexts.forEach((text, idx) => console.log(`    ${idx + 1}. ${text}`));
    console.log();

    // Test 3: Check for data
    console.log('Test 3: Check Data Availability...');
    const noDataVisible = await page.locator('text=No data').isVisible().catch(() => false);
    const emptyVisible = await page.locator('.ant-empty').isVisible().catch(() => false);
    const rowCount = await page.locator('tbody tr').count();

    console.log(`  - Table rows: ${rowCount}`);
    console.log(`  - No data message: ${noDataVisible || emptyVisible}\n`);

    if (rowCount === 0) {
      console.log('⚠ WARNING: No test data available. Action tests will be skipped.\n');
      await page.screenshot({ path: screenshotPath('no-test-data'), fullPage: true });
    }

    // Test 4: Search
    console.log('Test 4: Search Recommendations...');
    const searchInput = page.locator('input[placeholder*="Search"]').first();
    const hasSearch = await searchInput.isVisible().catch(() => false);

    if (hasSearch) {
      await searchInput.fill('CVE');
      await page.waitForTimeout(1500);
      const filteredRows = await page.locator('tbody tr').count();
      console.log(`  - Search for "CVE": ${filteredRows} rows`);

      await page.screenshot({ path: screenshotPath('recommendations-search-results'), fullPage: true });
      console.log('✓ Search completed\n');

      // Clear search
      await searchInput.clear();
      await page.waitForTimeout(500);
    } else {
      console.log('⚠ Search input not found\n');
    }

    // Test 5: Filter by Status
    console.log('Test 5: Filter by Status...');
    const statusFilters = await page.locator('.ant-select-selector').allTextContents();
    console.log(`  - Filter dropdowns found: ${statusFilters.length}`);

    const statusFilter = page.locator('.ant-select-selector').first();
    const hasFilter = await statusFilter.isVisible().catch(() => false);

    if (hasFilter) {
      await statusFilter.click();
      await page.waitForTimeout(500);

      const options = await page.locator('.ant-select-item-option-content').allTextContents();
      console.log(`  - Filter options: ${options.join(', ')}`);

      if (options.includes('Recommended')) {
        await page.locator('text=Recommended').first().click();
        await page.waitForTimeout(1000);

        const recommendedRows = await page.locator('tbody tr').count();
        console.log(`  - Recommended status: ${recommendedRows} rows`);
        await page.screenshot({ path: screenshotPath('recommendations-filter-recommended'), fullPage: true });
      }

      console.log('✓ Filter by status completed\n');
    } else {
      console.log('⚠ Status filter not found\n');
    }

    // Test 6: Check for action buttons (if data exists)
    if (rowCount > 0) {
      console.log('Test 6: Check Action Buttons...');
      const firstRow = page.locator('tbody tr').first();
      const rowText = await firstRow.textContent();
      console.log(`  - First row preview: ${rowText?.substring(0, 80)}...`);

      const acceptButton = await page.locator('button:has-text("Accept")').first().isVisible().catch(() => false);
      const rejectButton = await page.locator('button:has-text("Reject")').first().isVisible().catch(() => false);
      const deployButton = await page.locator('button:has-text("Deploy")').first().isVisible().catch(() => false);

      console.log(`  - Accept button visible: ${acceptButton}`);
      console.log(`  - Reject button visible: ${rejectButton}`);
      console.log(`  - Deploy button visible: ${deployButton}\n`);

      await page.screenshot({ path: screenshotPath('recommendations-action-buttons'), fullPage: true });
    }

    // Test 7: Check bulk selection
    console.log('Test 7: Check Bulk Selection...');
    const checkboxes = await page.locator('tbody tr .ant-checkbox').count();
    console.log(`  - Checkboxes found: ${checkboxes}`);

    if (checkboxes > 0) {
      const firstCheckbox = page.locator('tbody tr .ant-checkbox-input').first();
      await firstCheckbox.check();
      await page.waitForTimeout(1000);

      const bulkBar = await page.locator('text=selected').isVisible().catch(() => false);
      console.log(`  - Bulk action bar visible: ${bulkBar}`);

      await page.screenshot({ path: screenshotPath('recommendations-bulk-selected'), fullPage: true });
      console.log('✓ Bulk selection tested\n');
    }

    // Test 8: Dashboard check
    console.log('Test 8: Verify Dashboard...');
    await page.goto(`${FRONTEND_URL}/dashboard`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: screenshotPath('dashboard-view'), fullPage: true });
    console.log('✓ Dashboard screenshot captured\n');

    // Performance summary
    console.log('\n=== PERFORMANCE METRICS SUMMARY ===');
    console.log(`Page Load Time: ${loadTime}ms`);

    // Console errors summary
    console.log('\n=== CONSOLE ERRORS SUMMARY ===');
    const errors = consoleMessages.filter(m => m.type === 'error');
    const warnings = consoleMessages.filter(m => m.type === 'warning');

    console.log(`Total Errors: ${errors.length}`);
    console.log(`Total Warnings: ${warnings.length}`);

    if (errors.length > 0) {
      console.log('\nErrors:');
      errors.forEach((err, idx) => {
        console.log(`  ${idx + 1}. [${err.timestamp}] ${err.text}`);
      });
    }

    if (warnings.length > 0 && warnings.length <= 10) {
      console.log('\nWarnings:');
      warnings.forEach((warn, idx) => {
        console.log(`  ${idx + 1}. ${warn.text.substring(0, 100)}`);
      });
    } else if (warnings.length > 10) {
      console.log(`\n(${warnings.length} warnings - showing first 5)`);
      warnings.slice(0, 5).forEach((warn, idx) => {
        console.log(`  ${idx + 1}. ${warn.text.substring(0, 100)}`);
      });
    }

    console.log('\n=== Testing Complete ===');
    console.log(`Screenshots saved to: ${SCREENSHOTS_DIR}`);

    await page.waitForTimeout(2000);

  } catch (error) {
    console.error('\n❌ Error during testing:', error.message);
    console.error(error.stack);
    await page.screenshot({ path: screenshotPath('error-state'), fullPage: true });
  } finally {
    await browser.close();
  }
}

runTests().catch(console.error);
