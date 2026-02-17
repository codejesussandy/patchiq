/**
 * Manual test script for Patch Recommendations
 * Run with: node manual-test-recommendations.js
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const FRONTEND_URL = 'http://localhost:5173';
const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots', 'phase2-agent10');
const AUTH_JSON = path.join(__dirname, 'frontend', 'auth.json');

// Ensure screenshots directory exists
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

const timestamp = () => new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
const screenshotPath = (name) => path.join(SCREENSHOTS_DIR, `${name}-${timestamp()}.png`);

async function runTests() {
  console.log('=== Phase 2 Agent 10: Patch Recommendations Manual Testing ===\n');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    storageState: fs.existsSync(AUTH_JSON) ? AUTH_JSON : undefined,
  });
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
      console.log(`[${type.toUpperCase()}] ${msg.text()}`);
    }
  });

  try {
    // Test 1: Navigate to Patch Recommendations
    console.log('Test 1: Navigate to Patch Recommendations...');
    const startTime = Date.now();
    await page.goto(`${FRONTEND_URL}/patch-recommendations`, { waitUntil: 'networkidle' });
    const loadTime = Date.now() - startTime;

    await page.waitForTimeout(2000);
    await page.screenshot({ path: screenshotPath('recommendations-list-loaded'), fullPage: true });

    const pageTitle = await page.locator('h3:has-text("Patch Recommendations")').isVisible().catch(() => false);
    console.log(`✓ Page loaded in ${loadTime}ms`);
    console.log(`  - Title visible: ${pageTitle}`);
    console.log(`  - URL: ${page.url()}\n`);

    // Test 2: Search
    console.log('Test 2: Search Recommendations...');
    const searchInput = page.locator('input[placeholder*="Search"]').first();
    const hasSearch = await searchInput.isVisible().catch(() => false);

    if (hasSearch) {
      const initialRows = await page.locator('tbody tr').count();
      console.log(`  - Initial rows: ${initialRows}`);

      await searchInput.fill('CVE');
      await page.waitForTimeout(1500);
      const filteredRows = await page.locator('tbody tr').count();
      console.log(`  - Filtered rows: ${filteredRows}`);

      await page.screenshot({ path: screenshotPath('recommendations-search-results'), fullPage: true });
      console.log('✓ Search completed\n');

      // Clear search
      await searchInput.clear();
      await page.waitForTimeout(500);
    } else {
      console.log('⚠ Search input not found\n');
    }

    // Test 3: Filter by Status
    console.log('Test 3: Filter by Status...');
    const statusFilter = page.locator('.ant-select').filter({ hasText: 'Filter by Status' }).first();
    const hasFilter = await statusFilter.isVisible().catch(() => false);

    if (hasFilter) {
      await statusFilter.click();
      await page.waitForTimeout(500);
      await page.locator('text=Recommended').first().click();
      await page.waitForTimeout(1000);

      const recommendedRows = await page.locator('tbody tr').count();
      console.log(`  - Recommended status rows: ${recommendedRows}`);
      await page.screenshot({ path: screenshotPath('recommendations-filter-recommended'), fullPage: true });

      // Test Accepted
      await statusFilter.click();
      await page.waitForTimeout(500);
      await page.locator('text=Accepted').first().click();
      await page.waitForTimeout(1000);

      const acceptedRows = await page.locator('tbody tr').count();
      console.log(`  - Accepted status rows: ${acceptedRows}`);
      await page.screenshot({ path: screenshotPath('recommendations-filter-accepted'), fullPage: true });

      console.log('✓ Filter by status completed\n');
    } else {
      console.log('⚠ Status filter not found\n');
    }

    // Test 4: Check for data
    console.log('Test 4: Check Data Availability...');
    const noDataVisible = await page.locator('text=No data').isVisible().catch(() => false);
    const emptyVisible = await page.locator('.ant-empty').isVisible().catch(() => false);
    const hasRows = await page.locator('tbody tr').count() > 0;

    console.log(`  - Has data rows: ${hasRows}`);
    console.log(`  - No data message: ${noDataVisible || emptyVisible}`);

    if (!hasRows) {
      console.log('\n⚠ WARNING: No test data available. Most action tests will be skipped.\n');
    }

    await page.screenshot({ path: screenshotPath('recommendations-data-state'), fullPage: true });

    // Test 5: Check for action buttons
    console.log('Test 5: Check Action Buttons...');
    const acceptButton = await page.locator('button:has-text("Accept")').first().isVisible().catch(() => false);
    const rejectButton = await page.locator('button:has-text("Reject")').first().isVisible().catch(() => false);
    const deployButton = await page.locator('button:has-text("Deploy")').first().isVisible().catch(() => false);

    console.log(`  - Accept button visible: ${acceptButton}`);
    console.log(`  - Reject button visible: ${rejectButton}`);
    console.log(`  - Deploy button visible: ${deployButton}\n`);

    // Test 6: Check stats cards
    console.log('Test 6: Check Statistics Cards...');
    const criticalCard = await page.locator('text=Critical').first().isVisible().catch(() => false);
    const highCard = await page.locator('text=High').first().isVisible().catch(() => false);
    const recommendedCard = await page.locator('text=Recommended').first().isVisible().catch(() => false);

    console.log(`  - Critical severity card: ${criticalCard}`);
    console.log(`  - High severity card: ${highCard}`);
    console.log(`  - Recommended status card: ${recommendedCard}\n`);

    await page.screenshot({ path: screenshotPath('recommendations-stats-cards'), fullPage: true });

    // Test 7: Dashboard check
    console.log('Test 7: Verify Dashboard...');
    await page.goto(`${FRONTEND_URL}/dashboard`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: screenshotPath('dashboard-recommendations-check'), fullPage: true });
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
        console.log(`  ${idx + 1}. [${warn.timestamp}] ${warn.text}`);
      });
    } else if (warnings.length > 10) {
      console.log(`\n(${warnings.length} warnings - too many to display)`);
    }

    console.log('\n=== Testing Complete ===');
    console.log(`Screenshots saved to: ${SCREENSHOTS_DIR}`);

  } catch (error) {
    console.error('\n❌ Error during testing:', error.message);
    await page.screenshot({ path: screenshotPath('error-state'), fullPage: true });
  } finally {
    await browser.close();
  }
}

runTests().catch(console.error);
