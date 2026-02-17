const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const SCREENSHOTS_DIR = '/Users/shandesh/src/VS-code/PatchIQ/full-dev-sandy-v2/screenshots';
const BASE_URL = 'http://localhost:5173';

const testResults = [];
const consoleErrors = [];

async function runTests() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  // Collect console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(`[${new Date().toISOString()}] ${msg.text()}`);
    }
  });

  console.log('\n=== Asset Detail Tabs Test Suite ===\n');

  try {
    // Login
    console.log('1. Logging in...');
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('domcontentloaded');

    await page.fill('input[type="text"]', 'admin@patchiq.io');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(dashboard|assets)/, { timeout: 15000 });
    console.log('   ✓ Login successful\n');

    // Navigate to Assets
    console.log('2. Navigating to Assets page...');
    await page.goto(`${BASE_URL}/assets`);
    await page.waitForTimeout(2000);

    // Click first asset
    console.log('3. Opening first asset detail...');
    const firstRow = page.locator('table tbody tr').first();
    await firstRow.waitFor({ state: 'visible', timeout: 10000 });
    await firstRow.locator('a, td').first().click();
    await page.waitForTimeout(2000);

    const assetUrl = page.url();
    console.log(`   ✓ Asset URL: ${assetUrl}\n`);

    // Initial screenshot
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'asset-detail-initial.png'),
      fullPage: true
    });

    // Test each tab
    const tabs = [
      { key: 'lifecycle', name: 'Asset Life cycle', filename: 'lifecycle' },
      { key: 'vulnerabilities', name: 'Vulnerabilities', filename: 'vulnerabilities' },
      { key: 'patches', name: 'Patches', filename: 'patches' },
      { key: 'alerts', name: 'Alerts', filename: 'alerts' },
      { key: 'audit', name: 'Audit Log', filename: 'audit-log' },
      { key: 'software', name: 'Software', filename: 'software' },
    ];

    for (const tab of tabs) {
      console.log(`\n=== Testing ${tab.name} Tab ===`);
      const startTime = Date.now();

      try {
        // Click tab
        const tabElement = page.locator(`.ant-tabs-tab:has-text("${tab.name}")`).first();
        await tabElement.click();
        await page.waitForTimeout(2500);

        const loadTime = Date.now() - startTime;

        // Check for data
        const hasContent = await page.locator('.ant-card, .ant-table, .ant-descriptions, .ant-timeline, .ant-list').count() > 0;
        const hasEmptyState = await page.locator('text=/no data|no records|empty/i').count() > 0;
        const dataPresent = hasContent || hasEmptyState;

        // Take screenshot
        await page.screenshot({
          path: path.join(SCREENSHOTS_DIR, `asset-tab-${tab.filename}.png`),
          fullPage: true
        });

        const status = loadTime < 2000 && dataPresent ? 'PASS' : (dataPresent ? 'PARTIAL' : 'FAIL');

        testResults.push({
          tabName: tab.name,
          loadTime,
          dataPresent,
          status,
          notes: loadTime >= 2000 ? 'Load time > 2s' : (hasEmptyState ? 'Empty state' : '')
        });

        console.log(`   Load Time: ${loadTime}ms`);
        console.log(`   Data Present: ${dataPresent ? 'Yes' : 'No'}`);
        console.log(`   Status: ${status}`);

      } catch (error) {
        const loadTime = Date.now() - startTime;
        testResults.push({
          tabName: tab.name,
          loadTime,
          dataPresent: false,
          status: 'FAIL',
          notes: error.message
        });
        console.log(`   ✗ FAILED: ${error.message}`);
      }
    }

  } catch (error) {
    console.error('Test suite error:', error);
  }

  // Generate report
  console.log('\n\n============================================================');
  console.log('TEST REPORT: Asset Detail Tabs');
  console.log('============================================================\n');

  console.log('Tab Name            | Load Time | Data Present | Status   | Notes');
  console.log('------------------- | --------- | ------------ | -------- | -----');
  testResults.forEach(result => {
    const name = result.tabName.padEnd(19);
    const time = `${result.loadTime}ms`.padEnd(9);
    const data = (result.dataPresent ? 'Yes' : 'No').padEnd(12);
    const status = result.status.padEnd(8);
    console.log(`${name} | ${time} | ${data} | ${status} | ${result.notes}`);
  });

  console.log('\n');

  const passCount = testResults.filter(r => r.status === 'PASS').length;
  const failCount = testResults.filter(r => r.status === 'FAIL').length;
  const partialCount = testResults.filter(r => r.status === 'PARTIAL').length;

  console.log('OVERALL SUMMARY:');
  console.log(`Total Tabs Tested: ${testResults.length}`);
  console.log(`Passed: ${passCount}`);
  console.log(`Partial: ${partialCount}`);
  console.log(`Failed: ${failCount}`);
  console.log(`Overall Status: ${failCount === 0 ? (partialCount === 0 ? 'ALL PASS' : 'PARTIAL PASS') : 'FAIL'}`);

  console.log('\n');
  console.log(`Console Errors: ${consoleErrors.length}`);
  if (consoleErrors.length > 0) {
    consoleErrors.slice(0, 5).forEach((e, i) => {
      console.log(`${i + 1}. ${e.substring(0, 150)}`);
    });
  }

  console.log('\n============================================================');

  // Save report
  const reportContent = `
============================================================
TEST REPORT: Asset Detail Tabs
============================================================
Date: ${new Date().toISOString()}

SUMMARY TABLE:
--------------
${'Tab Name'.padEnd(19)} | ${'Load Time'.padEnd(9)} | ${'Data Present'.padEnd(12)} | ${'Status'.padEnd(8)} | Notes
${'---'.repeat(19)} | ${'---'.repeat(9)} | ${'---'.repeat(12)} | ${'---'.repeat(8)} | -----
${testResults.map(r =>
  `${r.tabName.padEnd(19)} | ${`${r.loadTime}ms`.padEnd(9)} | ${(r.dataPresent ? 'Yes' : 'No').padEnd(12)} | ${r.status.padEnd(8)} | ${r.notes}`
).join('\n')}

OVERALL SUMMARY:
----------------
Total Tabs Tested: ${testResults.length}
Passed: ${passCount}
Partial: ${partialCount}
Failed: ${failCount}
Overall Status: ${failCount === 0 ? (partialCount === 0 ? 'ALL PASS' : 'PARTIAL PASS') : 'FAIL'}

CONSOLE ERRORS:
---------------
Total: ${consoleErrors.length}
${consoleErrors.slice(0, 10).map((e, i) => `${i + 1}. ${e}`).join('\n')}

SCREENSHOTS CAPTURED:
---------------------
1. asset-detail-initial.png
${testResults.map((r, i) => {
  const filename = r.tabName.toLowerCase().replace(/\s+/g, '-');
  return `${i + 2}. asset-tab-${filename}.png`;
}).join('\n')}

============================================================
`;

  fs.writeFileSync(
    path.join(SCREENSHOTS_DIR, 'asset-detail-tabs-report.txt'),
    reportContent
  );

  console.log('Report saved to: screenshots/asset-detail-tabs-report.txt');
  console.log('All screenshots saved to: screenshots/\n');

  await browser.close();
}

runTests().catch(console.error);
