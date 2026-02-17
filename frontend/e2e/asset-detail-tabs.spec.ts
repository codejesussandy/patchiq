import { test, expect } from '@playwright/test';
import * as path from 'path';

const SCREENSHOTS_DIR = '/Users/shandesh/src/VS-code/PatchIQ/full-dev-sandy-v2/screenshots';
const BASE_URL = 'http://localhost:5173';
const ADMIN_EMAIL = 'admin@patchiq.io';
const ADMIN_PASSWORD = 'admin123';

interface TabTestResult {
  tabName: string;
  loadTime: number;
  dataPresent: boolean;
  errors: string[];
  status: 'PASS' | 'FAIL' | 'PARTIAL';
  notes: string;
}

const testResults: TabTestResult[] = [];
const consoleErrors: string[] = [];

test.describe('Asset Detail Tabs Testing', () => {
  let assetDetailUrl: string;

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();

    console.log('\n=== Asset Detail Tabs Test Suite ===\n');
    console.log('Setting up test environment...\n');

    // Collect console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(`[${new Date().toISOString()}] ${msg.text()}`);
      }
    });

    // Login
    console.log('1. Logging in...');
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('domcontentloaded');

    const emailInput = page.locator('input[type="text"], input[placeholder*="mail" i]').first();
    const passwordInput = page.locator('input[type="password"]').first();

    await emailInput.fill(ADMIN_EMAIL);
    await passwordInput.fill(ADMIN_PASSWORD);

    const submitButton = page.locator('button:has-text("Log in"), button[type="submit"]').first();
    await submitButton.click();

    await page.waitForURL(/\/(dashboard|assets)/, { timeout: 15000 });
    console.log('   ✓ Login successful\n');

    // Navigate to Assets page
    console.log('2. Navigating to Assets page...');
    await page.goto(`${BASE_URL}/assets`);
    await page.waitForTimeout(2000);

    // Click first asset to get to detail page
    console.log('3. Opening first asset detail page...');
    const firstRow = page.locator('table tbody tr, .ant-table-tbody tr').first();
    await firstRow.waitFor({ state: 'visible', timeout: 10000 });

    const link = firstRow.locator('a, td').first();
    await link.click();
    await page.waitForTimeout(2000);

    assetDetailUrl = page.url();
    console.log(`   ✓ Asset detail page: ${assetDetailUrl}\n`);

    // Take initial screenshot
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'asset-detail-initial.png'),
      fullPage: true
    });

    await page.close();
  });

  test('Tab 1: Lifecycle Tab', async ({ page }) => {
    const tabName = 'Lifecycle';
    console.log(`\n=== Testing ${tabName} Tab ===`);

    const startTime = Date.now();
    const errors: string[] = [];
    let dataPresent = false;
    let status: 'PASS' | 'FAIL' | 'PARTIAL' = 'PASS';
    let notes = '';

    try {
      // Navigate to asset detail page
      await page.goto(assetDetailUrl);
      await page.waitForTimeout(1000);

      // Click Lifecycle tab
      const lifecycleTab = page.locator('.ant-tabs-tab:has-text("Asset Life cycle"), .ant-tabs-tab:has-text("Lifecycle")').first();
      await lifecycleTab.click();
      await page.waitForTimeout(2000);

      const loadTime = Date.now() - startTime;

      // Check for data presence
      const hasCards = await page.locator('.ant-card, .ant-descriptions, .ant-form').count() > 0;
      const hasText = await page.locator('text=/purchase|warranty|depreciation|cost|value/i').count() > 0;
      dataPresent = hasCards || hasText;

      // Check for empty state
      const emptyStateVisible = await page.locator('text=/no data|no records|empty/i').count() > 0;
      if (emptyStateVisible) {
        notes = 'Empty state displayed properly';
        dataPresent = true; // Empty state counts as proper display
      }

      // Take screenshot
      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, 'asset-tab-lifecycle.png'),
        fullPage: true
      });

      console.log(`   Load Time: ${loadTime}ms`);
      console.log(`   Data Present: ${dataPresent ? 'Yes' : 'No'}`);
      console.log(`   Status: ${loadTime < 2000 && dataPresent ? 'PASS' : 'PARTIAL'}`);

      if (loadTime >= 2000) {
        status = 'PARTIAL';
        notes += ' (Load time > 2s)';
      }

      testResults.push({ tabName, loadTime, dataPresent, errors, status, notes });

    } catch (error) {
      const loadTime = Date.now() - startTime;
      errors.push(error.message);
      status = 'FAIL';
      console.log(`   ✗ FAILED: ${error.message}`);
      testResults.push({ tabName, loadTime, dataPresent, errors, status, notes: error.message });
    }
  });

  test('Tab 2: Vulnerabilities Tab', async ({ page }) => {
    const tabName = 'Vulnerabilities';
    console.log(`\n=== Testing ${tabName} Tab ===`);

    const startTime = Date.now();
    const errors: string[] = [];
    let dataPresent = false;
    let status: 'PASS' | 'FAIL' | 'PARTIAL' = 'PASS';
    let notes = '';

    try {
      await page.goto(assetDetailUrl);
      await page.waitForTimeout(1000);

      // Click Vulnerabilities tab
      const vulnTab = page.locator('.ant-tabs-tab:has-text("Vulnerabilities")').first();
      await vulnTab.click();
      await page.waitForTimeout(2000);

      const loadTime = Date.now() - startTime;

      // Check for data presence - table, cards, CVE mentions
      const hasTable = await page.locator('.ant-table, table').count() > 0;
      const hasCVE = await page.locator('text=/CVE-|vulnerability/i').count() > 0;
      const hasCards = await page.locator('.ant-card, .ant-statistic').count() > 0;
      dataPresent = hasTable || hasCVE || hasCards;

      // Check for empty state
      const emptyStateVisible = await page.locator('text=/no vulnerabilities|no data|no records/i').count() > 0;
      if (emptyStateVisible) {
        notes = 'Empty state displayed properly';
        dataPresent = true;
      }

      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, 'asset-tab-vulnerabilities.png'),
        fullPage: true
      });

      console.log(`   Load Time: ${loadTime}ms`);
      console.log(`   Data Present: ${dataPresent ? 'Yes' : 'No'}`);
      console.log(`   Status: ${loadTime < 2000 && dataPresent ? 'PASS' : 'PARTIAL'}`);

      if (loadTime >= 2000) {
        status = 'PARTIAL';
        notes += ' (Load time > 2s)';
      }

      testResults.push({ tabName, loadTime, dataPresent, errors, status, notes });

    } catch (error) {
      const loadTime = Date.now() - startTime;
      errors.push(error.message);
      status = 'FAIL';
      console.log(`   ✗ FAILED: ${error.message}`);
      testResults.push({ tabName, loadTime, dataPresent, errors, status, notes: error.message });
    }
  });

  test('Tab 3: Patches Tab', async ({ page }) => {
    const tabName = 'Patches';
    console.log(`\n=== Testing ${tabName} Tab ===`);

    const startTime = Date.now();
    const errors: string[] = [];
    let dataPresent = false;
    let status: 'PASS' | 'FAIL' | 'PARTIAL' = 'PASS';
    let notes = '';

    try {
      await page.goto(assetDetailUrl);
      await page.waitForTimeout(1000);

      // Click Patches tab
      const patchesTab = page.locator('.ant-tabs-tab:has-text("Patches")').first();
      await patchesTab.click();
      await page.waitForTimeout(2000);

      const loadTime = Date.now() - startTime;

      // Check for data presence
      const hasTable = await page.locator('.ant-table, table').count() > 0;
      const hasPatchInfo = await page.locator('text=/patch|update|KB|installed|pending/i').count() > 0;
      const hasCards = await page.locator('.ant-card, .ant-statistic').count() > 0;
      dataPresent = hasTable || hasPatchInfo || hasCards;

      // Check for empty state
      const emptyStateVisible = await page.locator('text=/no patches|no data|no records/i').count() > 0;
      if (emptyStateVisible) {
        notes = 'Empty state displayed properly';
        dataPresent = true;
      }

      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, 'asset-tab-patches.png'),
        fullPage: true
      });

      console.log(`   Load Time: ${loadTime}ms`);
      console.log(`   Data Present: ${dataPresent ? 'Yes' : 'No'}`);
      console.log(`   Status: ${loadTime < 2000 && dataPresent ? 'PASS' : 'PARTIAL'}`);

      if (loadTime >= 2000) {
        status = 'PARTIAL';
        notes += ' (Load time > 2s)';
      }

      testResults.push({ tabName, loadTime, dataPresent, errors, status, notes });

    } catch (error) {
      const loadTime = Date.now() - startTime;
      errors.push(error.message);
      status = 'FAIL';
      console.log(`   ✗ FAILED: ${error.message}`);
      testResults.push({ tabName, loadTime, dataPresent, errors, status, notes: error.message });
    }
  });

  test('Tab 4: Alerts Tab', async ({ page }) => {
    const tabName = 'Alerts';
    console.log(`\n=== Testing ${tabName} Tab ===`);

    const startTime = Date.now();
    const errors: string[] = [];
    let dataPresent = false;
    let status: 'PASS' | 'FAIL' | 'PARTIAL' = 'PASS';
    let notes = '';

    try {
      await page.goto(assetDetailUrl);
      await page.waitForTimeout(1000);

      // Click Alerts tab
      const alertsTab = page.locator('.ant-tabs-tab:has-text("Alerts")').first();
      await alertsTab.click();
      await page.waitForTimeout(2000);

      const loadTime = Date.now() - startTime;

      // Check for data presence
      const hasTable = await page.locator('.ant-table, table').count() > 0;
      const hasAlerts = await page.locator('text=/alert|severity|warning|critical|timestamp/i').count() > 0;
      const hasCards = await page.locator('.ant-card, .ant-alert, .ant-badge').count() > 0;
      dataPresent = hasTable || hasAlerts || hasCards;

      // Check for empty state
      const emptyStateVisible = await page.locator('text=/no alerts|no data|no records/i').count() > 0;
      if (emptyStateVisible) {
        notes = 'Empty state displayed properly';
        dataPresent = true;
      }

      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, 'asset-tab-alerts.png'),
        fullPage: true
      });

      console.log(`   Load Time: ${loadTime}ms`);
      console.log(`   Data Present: ${dataPresent ? 'Yes' : 'No'}`);
      console.log(`   Status: ${loadTime < 2000 && dataPresent ? 'PASS' : 'PARTIAL'}`);

      if (loadTime >= 2000) {
        status = 'PARTIAL';
        notes += ' (Load time > 2s)';
      }

      testResults.push({ tabName, loadTime, dataPresent, errors, status, notes });

    } catch (error) {
      const loadTime = Date.now() - startTime;
      errors.push(error.message);
      status = 'FAIL';
      console.log(`   ✗ FAILED: ${error.message}`);
      testResults.push({ tabName, loadTime, dataPresent, errors, status, notes: error.message });
    }
  });

  test('Tab 5: Audit Log Tab', async ({ page }) => {
    const tabName = 'Audit Log';
    console.log(`\n=== Testing ${tabName} Tab ===`);

    const startTime = Date.now();
    const errors: string[] = [];
    let dataPresent = false;
    let status: 'PASS' | 'FAIL' | 'PARTIAL' = 'PASS';
    let notes = '';

    try {
      await page.goto(assetDetailUrl);
      await page.waitForTimeout(1000);

      // Click Audit Log tab
      const auditTab = page.locator('.ant-tabs-tab:has-text("Audit Log"), .ant-tabs-tab:has-text("Activity")').first();
      await auditTab.click();
      await page.waitForTimeout(2000);

      const loadTime = Date.now() - startTime;

      // Check for data presence
      const hasTable = await page.locator('.ant-table, table').count() > 0;
      const hasTimeline = await page.locator('.ant-timeline, .ant-list').count() > 0;
      const hasAuditInfo = await page.locator('text=/action|user|timestamp|change|created|updated|deleted/i').count() > 0;
      dataPresent = hasTable || hasTimeline || hasAuditInfo;

      // Check for pagination
      const hasPagination = await page.locator('.ant-pagination').count() > 0;
      if (hasPagination) {
        notes += 'Pagination present';
      }

      // Check for empty state
      const emptyStateVisible = await page.locator('text=/no activity|no audit|no data|no records/i').count() > 0;
      if (emptyStateVisible) {
        notes = 'Empty state displayed properly';
        dataPresent = true;
      }

      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, 'asset-tab-audit-log.png'),
        fullPage: true
      });

      console.log(`   Load Time: ${loadTime}ms`);
      console.log(`   Data Present: ${dataPresent ? 'Yes' : 'No'}`);
      console.log(`   Status: ${loadTime < 2000 && dataPresent ? 'PASS' : 'PARTIAL'}`);

      if (loadTime >= 2000) {
        status = 'PARTIAL';
        notes += ' (Load time > 2s)';
      }

      testResults.push({ tabName, loadTime, dataPresent, errors, status, notes });

    } catch (error) {
      const loadTime = Date.now() - startTime;
      errors.push(error.message);
      status = 'FAIL';
      console.log(`   ✗ FAILED: ${error.message}`);
      testResults.push({ tabName, loadTime, dataPresent, errors, status, notes: error.message });
    }
  });

  test('Tab 6: Software Tab', async ({ page }) => {
    const tabName = 'Software';
    console.log(`\n=== Testing ${tabName} Tab ===`);

    const startTime = Date.now();
    const errors: string[] = [];
    let dataPresent = false;
    let status: 'PASS' | 'FAIL' | 'PARTIAL' = 'PASS';
    let notes = '';

    try {
      await page.goto(assetDetailUrl);
      await page.waitForTimeout(1000);

      // Click Software tab
      const softwareTab = page.locator('.ant-tabs-tab:has-text("Software")').first();
      await softwareTab.click();
      await page.waitForTimeout(2000);

      const loadTime = Date.now() - startTime;

      // Check for data presence
      const hasTable = await page.locator('.ant-table, table').count() > 0;
      const hasSoftwareInfo = await page.locator('text=/software|application|version|installed|publisher/i').count() > 0;
      const hasCards = await page.locator('.ant-card').count() > 0;
      dataPresent = hasTable || hasSoftwareInfo || hasCards;

      // Check for empty state
      const emptyStateVisible = await page.locator('text=/no software|no data|no records/i').count() > 0;
      if (emptyStateVisible) {
        notes = 'Empty state displayed properly';
        dataPresent = true;
      }

      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, 'asset-tab-software.png'),
        fullPage: true
      });

      console.log(`   Load Time: ${loadTime}ms`);
      console.log(`   Data Present: ${dataPresent ? 'Yes' : 'No'}`);
      console.log(`   Status: ${loadTime < 2000 && dataPresent ? 'PASS' : 'PARTIAL'}`);

      if (loadTime >= 2000) {
        status = 'PARTIAL';
        notes += ' (Load time > 2s)';
      }

      testResults.push({ tabName, loadTime, dataPresent, errors, status, notes });

    } catch (error) {
      const loadTime = Date.now() - startTime;
      errors.push(error.message);
      status = 'FAIL';
      console.log(`   ✗ FAILED: ${error.message}`);
      testResults.push({ tabName, loadTime, dataPresent, errors, status, notes: error.message });
    }
  });

  test.afterAll(async () => {
    console.log('\n\n============================================================');
    console.log('TEST REPORT: Asset Detail Tabs');
    console.log('============================================================\n');

    // Summary table
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

    // Detailed results
    console.log('DETAILED RESULTS:');
    console.log('-----------------\n');
    testResults.forEach((result, index) => {
      console.log(`${index + 1}. ${result.tabName} Tab:`);
      console.log(`   Status: ${result.status}`);
      console.log(`   Load Time: ${result.loadTime}ms (Target: < 2000ms)`);
      console.log(`   Data Present: ${result.dataPresent ? 'Yes' : 'No'}`);
      if (result.errors.length > 0) {
        console.log(`   Errors: ${result.errors.join(', ')}`);
      }
      if (result.notes) {
        console.log(`   Notes: ${result.notes}`);
      }
      console.log('');
    });

    // Console errors
    console.log('CONSOLE ERRORS:');
    console.log('---------------');
    if (consoleErrors.length === 0) {
      console.log('No console errors detected');
    } else {
      console.log(`Total console errors: ${consoleErrors.length}`);
      consoleErrors.slice(0, 10).forEach((error, index) => {
        console.log(`${index + 1}. ${error.substring(0, 150)}`);
      });
      if (consoleErrors.length > 10) {
        console.log(`... and ${consoleErrors.length - 10} more errors`);
      }
    }

    console.log('\n');

    // Screenshots
    console.log('SCREENSHOTS CAPTURED:');
    console.log('---------------------');
    console.log('1. asset-detail-initial.png');
    testResults.forEach((result, index) => {
      const filename = `asset-tab-${result.tabName.toLowerCase().replace(/\s+/g, '-')}.png`;
      console.log(`${index + 2}. ${filename}`);
    });

    console.log('\n');

    // Overall summary
    const passCount = testResults.filter(r => r.status === 'PASS').length;
    const failCount = testResults.filter(r => r.status === 'FAIL').length;
    const partialCount = testResults.filter(r => r.status === 'PARTIAL').length;

    console.log('OVERALL SUMMARY:');
    console.log('----------------');
    console.log(`Total Tabs Tested: ${testResults.length}`);
    console.log(`Passed: ${passCount}`);
    console.log(`Partial: ${partialCount}`);
    console.log(`Failed: ${failCount}`);
    console.log(`Overall Status: ${failCount === 0 ? (partialCount === 0 ? 'ALL PASS' : 'PARTIAL PASS') : 'FAIL'}`);

    console.log('\n');

    // Bugs found
    console.log('BUGS FOUND:');
    console.log('-----------');
    const bugs = testResults.filter(r => r.status === 'FAIL' || r.errors.length > 0);
    if (bugs.length === 0) {
      console.log('No critical bugs found');
    } else {
      bugs.forEach((bug, index) => {
        console.log(`${index + 1}. ${bug.tabName} Tab: ${bug.errors.join(', ') || bug.notes}`);
      });
    }

    console.log('\n');

    // Missing tabs note
    console.log('NOTES:');
    console.log('------');
    console.log('The following tabs mentioned in requirements were not found in AssetDetails component:');
    console.log('- Peripherals Tab (exists in codebase but not added to AssetDetails)');
    console.log('- Power Tab (not found in codebase)');
    console.log('- Files/Attachments Tab (not found in codebase)');
    console.log('- Notes Tab (not found in codebase)');
    console.log('\nTabs that exist but are not currently visible:');
    console.log('- SecurityTab, NetworkTab, PeripheralsTab, TelemetryTab');

    console.log('\n============================================================');

    // Write report to file
    const fs = require('fs');
    const reportContent = `
============================================================
TEST REPORT: Asset Detail Tabs
============================================================
Date: ${new Date().toISOString()}
Asset URL: ${assetDetailUrl}

SUMMARY TABLE:
--------------
${'Tab Name'.padEnd(19)} | ${'Load Time'.padEnd(9)} | ${'Data Present'.padEnd(12)} | ${'Status'.padEnd(8)} | Notes
${'---'.repeat(19)} | ${'---'.repeat(9)} | ${'---'.repeat(12)} | ${'---'.repeat(8)} | -----
${testResults.map(r =>
  `${r.tabName.padEnd(19)} | ${`${r.loadTime}ms`.padEnd(9)} | ${(r.dataPresent ? 'Yes' : 'No').padEnd(12)} | ${r.status.padEnd(8)} | ${r.notes}`
).join('\n')}

DETAILED RESULTS:
-----------------
${testResults.map((r, i) => `
${i + 1}. ${r.tabName} Tab:
   Status: ${r.status}
   Load Time: ${r.loadTime}ms (Target: < 2000ms)
   Data Present: ${r.dataPresent ? 'Yes' : 'No'}
   ${r.errors.length > 0 ? `Errors: ${r.errors.join(', ')}` : ''}
   ${r.notes ? `Notes: ${r.notes}` : ''}
`).join('\n')}

CONSOLE ERRORS:
---------------
${consoleErrors.length === 0 ? 'No console errors detected' : `
Total console errors: ${consoleErrors.length}
${consoleErrors.slice(0, 10).map((e, i) => `${i + 1}. ${e}`).join('\n')}
${consoleErrors.length > 10 ? `... and ${consoleErrors.length - 10} more errors` : ''}
`}

SCREENSHOTS CAPTURED:
---------------------
1. asset-detail-initial.png
${testResults.map((r, i) => `${i + 2}. asset-tab-${r.tabName.toLowerCase().replace(/\s+/g, '-')}.png`).join('\n')}

OVERALL SUMMARY:
----------------
Total Tabs Tested: ${testResults.length}
Passed: ${passCount}
Partial: ${partialCount}
Failed: ${failCount}
Overall Status: ${failCount === 0 ? (partialCount === 0 ? 'ALL PASS' : 'PARTIAL PASS') : 'FAIL'}

BUGS FOUND:
-----------
${bugs.length === 0 ? 'No critical bugs found' : bugs.map((b, i) => `${i + 1}. ${b.tabName} Tab: ${b.errors.join(', ') || b.notes}`).join('\n')}

NOTES:
------
The following tabs mentioned in requirements were not found in AssetDetails component:
- Peripherals Tab (exists in codebase but not added to AssetDetails)
- Power Tab (not found in codebase)
- Files/Attachments Tab (not found in codebase)
- Notes Tab (not found in codebase)

Tabs that exist but are not currently visible:
- SecurityTab, NetworkTab, PeripheralsTab, TelemetryTab

These tabs are defined in the codebase but not imported/used in AssetDetails.tsx component.

============================================================
`;

    fs.writeFileSync(
      path.join(SCREENSHOTS_DIR, 'asset-detail-tabs-report.txt'),
      reportContent
    );

    console.log('Report saved to: screenshots/asset-detail-tabs-report.txt');
    console.log('All screenshots saved to: screenshots/\n');
  });
});
