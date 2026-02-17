/**
 * Simple Patch Recommendations Test - Just capture screenshots and data
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const FRONTEND_URL = 'http://localhost:5173';
const SCREENSHOTS_DIR = path.join(__dirname, '..', 'screenshots', 'phase2-agent10');

// Ensure screenshots directory exists
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

const timestamp = () => new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
const screenshotPath = (name) => path.join(SCREENSHOTS_DIR, `${name}-${timestamp()}.png`);

async function runTests() {
  console.log('=== Phase 2 Agent 10: Simple Patch Recommendations Test ===\n');

  const browser = await chromium.launch({ headless: false });
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
    }
  });

  try {
    // Step 1: Go to homepage and login
    console.log('Step 1: Navigate to homepage...');
    await page.goto(`${FRONTEND_URL}`, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: screenshotPath('01-homepage'), fullPage: true });
    console.log(`  - Current URL: ${page.url()}`);

    // Check if we're on login page
    if (page.url().includes('/login')) {
      console.log('\nStep 2: Login page detected, logging in...');

      // Wait for form to be ready
      await page.waitForSelector('input[placeholder*="mail"]', { timeout: 10000 });

      // Fill email and password fields
      await page.fill('input[placeholder*="mail"]', 'admin@patchiq.io');
      await page.fill('input[placeholder*="Password"]', 'admin123');
      await page.screenshot({ path: screenshotPath('02-login-filled'), fullPage: true });

      // Click Log in button
      await page.click('button:has-text("Log in")');
      await page.waitForTimeout(3000);
      console.log(`  - After login URL: ${page.url()}`);
    }

    // Step 3: Navigate to patch recommendations
    console.log('\nStep 3: Navigate to patch recommendations...');
    const startTime = Date.now();
    await page.goto(`${FRONTEND_URL}/patch-recommendations`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(5000); // Give page time to load data
    const loadTime = Date.now() - startTime;

    console.log(`  - Load time: ${loadTime}ms`);
    console.log(`  - Final URL: ${page.url()}`);

    await page.screenshot({ path: screenshotPath('03-recommendations-page'), fullPage: true });

    // Step 4: Analyze page content
    console.log('\nStep 4: Analyze page content...');

    const pageTitle = await page.title();
    console.log(`  - Page title: ${pageTitle}`);

    const h1Text = await page.locator('h1').first().textContent().catch(() => '(not found)');
    const h2Text = await page.locator('h2').first().textContent().catch(() => '(not found)');
    const h3Text = await page.locator('h3').first().textContent().catch(() => '(not found)');

    console.log(`  - H1: ${h1Text}`);
    console.log(`  - H2: ${h2Text}`);
    console.log(`  - H3: ${h3Text}`);

    // Check for common page elements
    const hasTable = await page.locator('table').count() > 0;
    const hasCards = await page.locator('.ant-card').count() > 0;
    const hasStats = await page.locator('.ant-statistic').count() > 0;
    const hasButtons = await page.locator('button').count();

    console.log(`  - Has table: ${hasTable}`);
    console.log(`  - Has cards: ${hasCards}`);
    console.log(`  - Has stats: ${hasStats}`);
    console.log(`  - Button count: ${hasButtons}`);

    const rowCount = await page.locator('tbody tr').count();
    console.log(`  - Table rows: ${rowCount}`);

    // Step 5: Try to interact with page elements
    if (hasTable && rowCount > 0) {
      console.log('\nStep 5: Interact with table...');

      // Try to get first row content
      const firstRowText = await page.locator('tbody tr').first().textContent();
      console.log(`  - First row: ${firstRowText?.substring(0, 100)}...`);

      // Look for buttons in the table
      const tableButtons = await page.locator('tbody button').allTextContents();
      console.log(`  - Action buttons found: ${tableButtons.slice(0, 10).join(', ')}`);

      await page.screenshot({ path: screenshotPath('04-table-with-data'), fullPage: true });
    } else {
      console.log('\nStep 5: No table data found');
      const emptyMessage = await page.locator('.ant-empty-description').textContent().catch(() => 'No empty message');
      console.log(`  - Empty state message: ${emptyMessage}`);
    }

    // Step 6: Check for search and filters
    console.log('\nStep 6: Check for search and filters...');
    const searchInputs = await page.locator('input[placeholder*="Search" i]').count();
    const selectDropdowns = await page.locator('.ant-select').count();

    console.log(`  - Search inputs: ${searchInputs}`);
    console.log(`  - Dropdown filters: ${selectDropdowns}`);

    if (searchInputs > 0) {
      const searchInput = page.locator('input[placeholder*="Search" i]').first();
      await searchInput.fill('test');
      await page.waitForTimeout(1000);
      await page.screenshot({ path: screenshotPath('05-search-test'), fullPage: true });
      await searchInput.clear();
    }

    // Step 7: Check dashboard
    console.log('\nStep 7: Check dashboard...');
    await page.goto(`${FRONTEND_URL}/dashboard`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: screenshotPath('06-dashboard'), fullPage: true });
    console.log(`  - Dashboard URL: ${page.url()}`);

    // Console errors summary
    console.log('\n=== CONSOLE MESSAGES SUMMARY ===');
    const errors = consoleMessages.filter(m => m.type === 'error');
    const warnings = consoleMessages.filter(m => m.type === 'warning');

    console.log(`Total Errors: ${errors.length}`);
    console.log(`Total Warnings: ${warnings.length}`);

    if (errors.length > 0) {
      console.log('\nErrors:');
      errors.forEach((err, idx) => {
        console.log(`  ${idx + 1}. ${err.text.substring(0, 120)}`);
      });
    }

    console.log('\n=== Test Complete ===');
    console.log(`Screenshots saved to: ${SCREENSHOTS_DIR}`);

    await page.waitForTimeout(2000);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    await page.screenshot({ path: screenshotPath('error-state'), fullPage: true }).catch(() => {});
  } finally {
    await browser.close();
  }
}

runTests().catch(console.error);
