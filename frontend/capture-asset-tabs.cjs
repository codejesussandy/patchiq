const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const SCREENSHOTS_DIR = '/Users/shandesh/src/VS-code/PatchIQ/full-dev-sandy-v2/screenshots';
const BASE_URL = 'http://localhost:5173';

async function captureScreenshots() {
  const browser = await chromium.launch({ headless: false, slowMo: 500 });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  const testResults = [];
  const consoleErrors = [];

  // Collect console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      const text = msg.text();
      if (!text.includes('Unexpected token') && !text.includes('favicon')) {
        consoleErrors.push(text);
      }
    }
  });

  console.log('\n════════════════════════════════════════════════════════════');
  console.log('  Asset Detail Tabs Screenshot Capture');
  console.log('════════════════════════════════════════════════════════════\n');

  try {
    // Step 1: Login
    console.log('Step 1: Logging in...');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Take login page screenshot
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'step-01-login-page.png'),
      fullPage: true
    });

    // Fill login form
    await page.fill('input[type="text"]', 'admin@patchiq.io');
    await page.waitForTimeout(1000);
    await page.fill('input[type="password"]', 'admin123');
    await page.waitForTimeout(1000);

    // Click login button
    await page.click('button:has-text("Log in")');
    await page.waitForTimeout(6000);

    const currentUrl = page.url();
    console.log(`   Current URL after login: ${currentUrl}`);

    if (currentUrl.includes('/login')) {
      throw new Error('Login failed - still on login page. Possible rate limit (429).');
    }

    // Step 2: Navigate to Assets
    console.log('\nStep 2: Navigating to Assets page...');
    await page.goto(`${BASE_URL}/assets`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4000);

    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'step-02-assets-list.png'),
      fullPage: true
    });

    // Step 3: Navigate directly to first asset detail page
    console.log('\nStep 3: Navigating to asset detail page...');

    // Use a known asset ID from seed data (ASSET-MAC-01 = 4BAAC9B6 from screenshot)
    const firstAssetId = '4BAAC9B6';
    console.log(`   Using Asset ID: ${firstAssetId}`);

    // Navigate directly to the asset detail page
    const assetDetailUrl = `${BASE_URL}/assets/${firstAssetId}`;
    await page.goto(assetDetailUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4000);

    const assetUrl = page.url();
    console.log(`   Asset URL: ${assetUrl}`);

    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'step-03-asset-detail-initial.png'),
      fullPage: true
    });

    // Test each tab
    const tabs = [
      { name: 'Asset Life cycle', key: 'lifecycle', filename: 'lifecycle' },
      { name: 'Vulnerabilities', key: 'vulnerabilities', filename: 'vulnerabilities' },
      { name: 'Patches', key: 'patches', filename: 'patches' },
      { name: 'Alerts', key: 'alerts', filename: 'alerts' },
      { name: 'Audit Log', key: 'audit', filename: 'audit-log' },
      { name: 'Software', key: 'software', filename: 'software' },
    ];

    console.log('\n════════════════════════════════════════════════════════════');
    console.log('  Testing Individual Tabs');
    console.log('════════════════════════════════════════════════════════════\n');

    for (let i = 0; i < tabs.length; i++) {
      const tab = tabs[i];
      console.log(`Tab ${i + 1}: ${tab.name}`);

      const startTime = Date.now();

      try {
        // Find and click tab
        const tabSelector = `.ant-tabs-tab:has-text("${tab.name}")`;
        const tabElement = page.locator(tabSelector).first();

        const tabCount = await tabElement.count();
        console.log(`   Tab elements found: ${tabCount}`);

        if (tabCount > 0) {
          await tabElement.click();
          await page.waitForTimeout(3000);

          const loadTime = Date.now() - startTime;

          // Check for content
          const hasTable = await page.locator('.ant-table').count() > 0;
          const hasCards = await page.locator('.ant-card').count() > 0;
          const hasDescriptions = await page.locator('.ant-descriptions').count() > 0;
          const hasEmptyState = await page.locator('text=/no data|no records|empty/i').count() > 0;

          const dataPresent = hasTable || hasCards || hasDescriptions || hasEmptyState;

          // Capture screenshot
          const filename = `asset-tab-${tab.filename}.png`;
          await page.screenshot({
            path: path.join(SCREENSHOTS_DIR, filename),
            fullPage: true
          });

          const status = dataPresent ? (loadTime < 2000 ? 'PASS' : 'PARTIAL') : 'FAIL';

          testResults.push({
            tabName: tab.name,
            loadTime,
            dataPresent,
            status,
            notes: `Table:${hasTable} Cards:${hasCards} Empty:${hasEmptyState}`,
            error: null
          });

          console.log(`   ✓ Load Time: ${loadTime}ms`);
          console.log(`   ✓ Data Present: ${dataPresent ? 'Yes' : 'No'}`);
          console.log(`   ✓ Status: ${status}`);
          console.log(`   ✓ Screenshot: ${filename}\n`);

        } else {
          console.log(`   ✗ Tab not found!\n`);
          testResults.push({
            tabName: tab.name,
            loadTime: 0,
            dataPresent: false,
            status: 'FAIL',
            notes: 'Tab not found',
            error: 'Tab element not found'
          });
        }

      } catch (error) {
        const loadTime = Date.now() - startTime;
        console.log(`   ✗ Error: ${error.message}\n`);
        testResults.push({
          tabName: tab.name,
          loadTime,
          dataPresent: false,
          status: 'FAIL',
          notes: error.message,
          error: error.message
        });
      }
    }

  } catch (error) {
    console.error('\n✗ Fatal Error:', error.message);
  }

  // Generate Report
  console.log('\n════════════════════════════════════════════════════════════');
  console.log('  TEST REPORT: Asset Detail Tabs');
  console.log('════════════════════════════════════════════════════════════\n');

  console.log('Tab Name            | Load Time | Data Present | Status   | Notes');
  console.log('────────────────────┼───────────┼──────────────┼──────────┼──────────');
  testResults.forEach(result => {
    const name = result.tabName.padEnd(19);
    const time = `${result.loadTime}ms`.padEnd(9);
    const data = (result.dataPresent ? 'Yes' : 'No').padEnd(12);
    const status = result.status.padEnd(8);
    console.log(`${name} | ${time} | ${data} | ${status} | ${result.notes}`);
  });

  console.log('\n');

  // Summary
  const passCount = testResults.filter(r => r.status === 'PASS').length;
  const failCount = testResults.filter(r => r.status === 'FAIL').length;
  const partialCount = testResults.filter(r => r.status === 'PARTIAL').length;

  console.log('OVERALL SUMMARY:');
  console.log(`  Total Tabs Tested: ${testResults.length}`);
  console.log(`  ✓ Passed: ${passCount}`);
  console.log(`  ⚠ Partial: ${partialCount}`);
  console.log(`  ✗ Failed: ${failCount}`);
  console.log(`  Overall: ${failCount === 0 ? (partialCount === 0 ? '✓ ALL PASS' : '⚠ PARTIAL PASS') : '✗ FAIL'}`);

  console.log('\n');
  console.log('CONSOLE ERRORS:');
  console.log(`  Total: ${consoleErrors.length}`);
  if (consoleErrors.length > 0) {
    consoleErrors.slice(0, 5).forEach((e, i) => {
      console.log(`  ${i + 1}. ${e.substring(0, 100)}`);
    });
    if (consoleErrors.length > 5) {
      console.log(`  ... and ${consoleErrors.length - 5} more`);
    }
  } else {
    console.log('  None detected');
  }

  console.log('\n════════════════════════════════════════════════════════════\n');

  // Save report to file
  const reportContent = `
════════════════════════════════════════════════════════════
TEST REPORT: Asset Detail Tabs
════════════════════════════════════════════════════════════
Date: ${new Date().toISOString()}
Test Type: Manual Playwright Screenshot Capture

SUMMARY TABLE:
──────────────
${'Tab Name'.padEnd(20)} | ${'Load Time'.padEnd(10)} | ${'Data Present'.padEnd(13)} | ${'Status'.padEnd(8)} | Notes
${'─'.repeat(20)} | ${'─'.repeat(10)} | ${'─'.repeat(13)} | ${'─'.repeat(8)} | ${'─'.repeat(30)}
${testResults.map(r =>
  `${r.tabName.padEnd(20)} | ${`${r.loadTime}ms`.padEnd(10)} | ${(r.dataPresent ? 'Yes' : 'No').padEnd(13)} | ${r.status.padEnd(8)} | ${r.notes}`
).join('\n')}

DETAILED RESULTS:
─────────────────
${testResults.map((r, i) => `
${i + 1}. ${r.tabName} Tab
   Status: ${r.status}
   Load Time: ${r.loadTime}ms (Target: < 2000ms)
   Data Present: ${r.dataPresent ? 'Yes' : 'No'}
   Notes: ${r.notes}
   ${r.error ? `Error: ${r.error}` : ''}
   Screenshot: asset-tab-${r.tabName.toLowerCase().replace(/\s+/g, '-')}.png
`).join('\n')}

OVERALL SUMMARY:
────────────────
Total Tabs Tested: ${testResults.length}
✓ Passed: ${passCount}
⚠ Partial: ${partialCount}
✗ Failed: ${failCount}
Overall Status: ${failCount === 0 ? (partialCount === 0 ? '✓ ALL PASS' : '⚠ PARTIAL PASS') : '✗ FAIL'}

CONSOLE ERRORS:
───────────────
Total: ${consoleErrors.length}
${consoleErrors.length === 0 ? 'None detected' : consoleErrors.slice(0, 10).map((e, i) => `${i + 1}. ${e}`).join('\n')}
${consoleErrors.length > 10 ? `... and ${consoleErrors.length - 10} more errors` : ''}

SCREENSHOTS CAPTURED:
─────────────────────
1. step-01-login-page.png
2. step-02-assets-list.png
3. step-03-asset-detail-initial.png
${testResults.map((r, i) => `${i + 4}. asset-tab-${r.tabName.toLowerCase().replace(/\s+/g, '-')}.png`).join('\n')}

NOTES:
──────
- Tests executed with Playwright in non-headless mode
- All screenshots saved to: ${SCREENSHOTS_DIR}
- Target load time per tab: < 2000ms
- Data presence includes tables, cards, descriptions, or empty states

BUGS FOUND:
───────────
${testResults.filter(r => r.status === 'FAIL').length === 0
  ? 'No critical bugs detected'
  : testResults.filter(r => r.status === 'FAIL').map((r, i) =>
      `${i + 1}. ${r.tabName} Tab: ${r.error || r.notes}`
    ).join('\n')}

════════════════════════════════════════════════════════════
`;

  fs.writeFileSync(
    path.join(SCREENSHOTS_DIR, 'asset-detail-tabs-report.txt'),
    reportContent
  );

  console.log(`Report saved to: ${path.join(SCREENSHOTS_DIR, 'asset-detail-tabs-report.txt')}`);
  console.log(`All screenshots saved to: ${SCREENSHOTS_DIR}\n`);

  await browser.close();
}

captureScreenshots().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
