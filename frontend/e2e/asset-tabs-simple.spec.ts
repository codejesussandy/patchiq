import { test, expect } from './fixtures';
import { login, waitForPageLoad } from './fixtures';
import * as path from 'path';

/**
 * Simple Asset Detail Tabs Test
 * Tests the 6 main tabs as requested:
 * 1. Hardware Tab
 * 2. Software Tab
 * 3. Patches Tab
 * 4. Vulnerabilities Tab
 * 5. Security Tab (if available)
 * 6. Network Tab (if available)
 */

const SCREENSHOT_DIR = '/Users/shandesh/src/VS-code/PatchIQ/full-dev-sandy-v2/screenshots';

interface TabResult {
  tabName: string;
  loadTime: number;
  dataPresent: boolean;
  errors: string[];
  screenshot: string;
  notes: string;
}

const results: TabResult[] = [];

test.describe('Asset Detail Tabs - Simple Test', () => {
  test('Navigate to asset detail page and test all tabs', async ({ page }) => {
    const consoleErrors: string[] = [];

    // Setup console error listener
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(`Console Error: ${msg.text()}`);
      }
    });

    page.on('pageerror', (err) => {
      consoleErrors.push(`Page Error: ${err.message}`);
    });

    // Login
    console.log('Logging in...');
    await login(page);
    await waitForPageLoad(page);

    // Navigate to Assets page
    console.log('Navigating to Assets page...');
    await page.goto('/assets');
    await waitForPageLoad(page);

    // Wait for table to be visible
    const table = page.locator('table, .ant-table').first();
    await expect(table).toBeVisible({ timeout: 15000 });

    // Find and click the asset name link (not the row, which may trigger other actions)
    console.log('Finding asset name link...');

    // Try to find a clickable asset name or view button
    const assetNameLink = page.locator('tbody tr:not([aria-hidden="true"]) a').first();
    const viewButton = page.locator('button:has-text("View"), a:has-text("View")').first();
    const eyeIcon = page.locator('tbody tr:not([aria-hidden="true"]) [data-icon="eye"]').first();

    let navigated = false;

    // Try asset name link first
    if (await assetNameLink.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log('Clicking asset name link...');
      await assetNameLink.click();
      navigated = true;
    } else if (await eyeIcon.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log('Clicking eye icon...');
      await eyeIcon.click();
      navigated = true;
    } else if (await viewButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log('Clicking view button...');
      await viewButton.click();
      navigated = true;
    } else {
      // Fall back to clicking the first cell content
      console.log('Trying to click first cell...');
      const firstCell = page.locator('tbody tr:not([aria-hidden="true"]) td').nth(1);
      await firstCell.click();
      navigated = true;
    }

    if (!navigated) {
      throw new Error('Could not find a way to navigate to asset details');
    }

    // Wait for navigation
    await Promise.race([
      page.waitForURL(/\/assets\/[^/]+$/, { timeout: 10000 }),
      page.waitForTimeout(3000)
    ]);

    console.log('Current URL:', page.url());

    // Take initial screenshot
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'asset-detail-page-initial.png'),
      fullPage: true
    });

    // Find all tabs
    const tabsContainer = page.locator('.ant-tabs-nav, [role="tablist"]').first();
    await expect(tabsContainer).toBeVisible({ timeout: 5000 });

    // Get all tab labels
    const tabs = page.locator('.ant-tabs-tab, [role="tab"]');
    const tabCount = await tabs.count();
    console.log(`Found ${tabCount} tabs`);

    const tabLabels: string[] = [];
    for (let i = 0; i < tabCount; i++) {
      const label = await tabs.nth(i).textContent();
      if (label) {
        tabLabels.push(label.trim());
      }
    }
    console.log('Available tabs:', tabLabels);

    // Test each requested tab
    const tabsToTest = [
      { name: 'Hardware', key: 'hardware' },
      { name: 'Software', key: 'software' },
      { name: 'Patches', key: 'patches' },
      { name: 'Vulnerabilities', key: 'vulnerabilities' },
      { name: 'Security', key: 'security' },
      { name: 'Network', key: 'network' }
    ];

    for (const tabInfo of tabsToTest) {
      console.log(`\n=== Testing ${tabInfo.name} Tab ===`);

      // Find the tab
      const tab = page.locator(`[role="tab"]:has-text("${tabInfo.name}")`).first();
      const tabExists = await tab.isVisible({ timeout: 2000 }).catch(() => false);

      if (!tabExists) {
        console.log(`⚠️  ${tabInfo.name} tab not found`);
        results.push({
          tabName: tabInfo.name,
          loadTime: 0,
          dataPresent: false,
          errors: [`Tab not found in the UI`],
          screenshot: '',
          notes: 'Tab does not exist in the current UI'
        });
        continue;
      }

      // Click the tab and measure load time
      const startTime = Date.now();
      await tab.click();
      await page.waitForTimeout(1000);
      const loadTime = Date.now() - startTime;

      console.log(`Load time: ${loadTime}ms`);

      // Wait for content to load
      await page.waitForTimeout(1500);

      // Take screenshot
      const screenshotPath = path.join(SCREENSHOT_DIR, `asset-tab-${tabInfo.key}.png`);
      await page.screenshot({
        path: screenshotPath,
        fullPage: true
      });
      console.log(`Screenshot saved: ${screenshotPath}`);

      // Check for data presence based on tab type
      let dataPresent = false;
      let notes = '';

      if (tabInfo.name === 'Hardware') {
        // Look for hardware-related content
        const hardwareIndicators = [
          page.locator('text=/CPU|Processor/i').first(),
          page.locator('text=/RAM|Memory/i').first(),
          page.locator('text=/Storage|Disk/i').first(),
          page.locator('text=/Model|Manufacturer/i').first()
        ];

        let foundCount = 0;
        for (const indicator of hardwareIndicators) {
          if (await indicator.isVisible({ timeout: 2000 }).catch(() => false)) {
            foundCount++;
          }
        }

        dataPresent = foundCount >= 2;
        notes = `Found ${foundCount}/4 hardware indicators`;
      } else if (tabInfo.name === 'Software') {
        // Look for software table
        const softwareTable = page.locator('table, .ant-table').first();
        const tableVisible = await softwareTable.isVisible({ timeout: 3000 }).catch(() => false);

        if (tableVisible) {
          const rows = page.locator('tbody tr, .ant-table-row');
          const rowCount = await rows.count();
          dataPresent = rowCount > 0;
          notes = `Found ${rowCount} software entries`;
        } else {
          notes = 'No table found';
        }
      } else if (tabInfo.name === 'Patches') {
        // Look for patches content
        const patchIndicators = [
          page.locator('text=/Installed|Applied/i').first(),
          page.locator('text=/Missing|Pending/i').first(),
          page.locator('text=/KB[0-9]+/i').first(),
          page.locator('table, .ant-table').first()
        ];

        let foundCount = 0;
        for (const indicator of patchIndicators) {
          if (await indicator.isVisible({ timeout: 2000 }).catch(() => false)) {
            foundCount++;
          }
        }

        dataPresent = foundCount >= 1;
        notes = `Found ${foundCount}/4 patch indicators`;
      } else if (tabInfo.name === 'Vulnerabilities') {
        // Look for vulnerability content
        const vulnIndicators = [
          page.locator('text=/CVE-[0-9]{4}-[0-9]+/i').first(),
          page.locator('text=/CVSS|Score/i').first(),
          page.locator('text=/Critical|High|Medium|Low/i').first(),
          page.locator('table, .ant-table').first()
        ];

        let foundCount = 0;
        for (const indicator of vulnIndicators) {
          if (await indicator.isVisible({ timeout: 2000 }).catch(() => false)) {
            foundCount++;
          }
        }

        dataPresent = foundCount >= 1;
        notes = `Found ${foundCount}/4 vulnerability indicators`;
      } else if (tabInfo.name === 'Security') {
        // Look for security content
        const securityIndicators = [
          page.locator('text=/Antivirus|Anti-virus/i').first(),
          page.locator('text=/Firewall/i').first(),
          page.locator('text=/Encryption/i').first(),
          page.locator('text=/Enabled|Disabled/i').first()
        ];

        let foundCount = 0;
        for (const indicator of securityIndicators) {
          if (await indicator.isVisible({ timeout: 2000 }).catch(() => false)) {
            foundCount++;
          }
        }

        dataPresent = foundCount >= 1;
        notes = `Found ${foundCount}/4 security indicators`;
      } else if (tabInfo.name === 'Network') {
        // Look for network content
        const networkIndicators = [
          page.locator('text=/IP Address|IPv4/i').first(),
          page.locator('text=/MAC Address/i').first(),
          page.locator('text=/DNS/i').first(),
          page.locator('text=/Gateway/i').first()
        ];

        let foundCount = 0;
        for (const indicator of networkIndicators) {
          if (await indicator.isVisible({ timeout: 2000 }).catch(() => false)) {
            foundCount++;
          }
        }

        dataPresent = foundCount >= 1;
        notes = `Found ${foundCount}/4 network indicators`;
      }

      console.log(`Data present: ${dataPresent ? 'Yes' : 'No'}`);
      console.log(`Notes: ${notes}`);

      results.push({
        tabName: tabInfo.name,
        loadTime,
        dataPresent,
        errors: [...consoleErrors],
        screenshot: `asset-tab-${tabInfo.key}.png`,
        notes
      });

      // Clear console errors for next tab
      consoleErrors.length = 0;
    }

    // Print summary
    console.log('\n' + '='.repeat(100));
    console.log('ASSET DETAIL TABS TEST SUMMARY');
    console.log('='.repeat(100));
    console.log('| Tab Name          | Load Time | Data Present | Errors | Notes                              |');
    console.log('|-------------------|-----------|--------------|--------|-------------------------------------|');

    results.forEach(result => {
      const loadTimeStr = result.loadTime > 0 ? `${result.loadTime}ms` : 'N/A';
      const dataStr = result.dataPresent ? 'Yes' : 'No';
      const errorsStr = result.errors.length > 0 ? `${result.errors.length}` : '0';
      const notesStr = result.notes.substring(0, 35);

      console.log(
        `| ${result.tabName.padEnd(17)} | ${loadTimeStr.padEnd(9)} | ${dataStr.padEnd(12)} | ${errorsStr.padEnd(6)} | ${notesStr.padEnd(35)} |`
      );
    });

    console.log('='.repeat(100));

    // Save detailed report
    const reportContent = {
      testDate: new Date().toISOString(),
      results,
      summary: {
        totalTabs: results.length,
        tabsWithData: results.filter(r => r.dataPresent).length,
        tabsWithErrors: results.filter(r => r.errors.length > 0).length,
        averageLoadTime: results.reduce((sum, r) => sum + r.loadTime, 0) / results.filter(r => r.loadTime > 0).length
      }
    };

    const fs = require('fs');
    fs.writeFileSync(
      path.join(SCREENSHOT_DIR, 'asset-tabs-test-report.json'),
      JSON.stringify(reportContent, null, 2)
    );

    console.log(`\nDetailed report saved to: ${path.join(SCREENSHOT_DIR, 'asset-tabs-test-report.json')}`);
    console.log(`Screenshots saved to: ${SCREENSHOT_DIR}`);
  });
});
