import { test } from './fixtures';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Manual Asset Detail Tabs Test
 * Run with: npx playwright test manual-asset-tabs.spec.ts --headed --timeout=0
 *
 * This test will pause at key points to allow manual navigation and screenshot capture
 */

const SCREENSHOT_DIR = '/Users/shandesh/src/VS-code/PatchIQ/full-dev-sandy-v2/screenshots';

test('Manual Asset Detail Tabs Test', async ({ page }) => {
  // Navigate to login
  await page.goto('/login');
  await page.waitForLoadState('networkidle');

  // Fill login
  await page.fill('#email', 'admin@patchiq.io');
  await page.fill('#password', 'admin123');

  // Screenshot before login
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, 'manual-01-login-page.png'),
    fullPage: true
  });

  // Click login
  await page.click('button[type="submit"]');

  // Wait for navigation
  await page.waitForTimeout(3000);

  // Screenshot after login
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, 'manual-02-after-login.png'),
    fullPage: true
  });

  // Navigate to assets
  await page.goto('/assets');
  await page.waitForTimeout(2000);

  // Screenshot assets list
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, 'manual-03-assets-list.png'),
    fullPage: true
  });

  // Get the first asset ID from the table
  const firstAssetName = await page.locator('tbody tr:not([aria-hidden="true"]) td').nth(1).textContent();
  console.log('First asset:', firstAssetName);

  // Click on the first row (which has onRow handler to navigate to detail page)
  // Avoid clicking on the category column (3rd column) which opens a modal
  const firstRow = page.locator('tbody tr:not([aria-hidden="true"])').first();
  const firstCell = firstRow.locator('td').first(); // Click on first cell

  console.log('Clicking on first asset row...');
  await firstCell.click();
  await page.waitForTimeout(2000);

  // Check if we navigated or if a modal opened
  const currentUrl = page.url();
  console.log('Current URL after click:', currentUrl);

  if (currentUrl.includes('/assets/') && currentUrl !== 'http://localhost:5173/assets') {
    console.log('✅ Successfully navigated to asset detail page');

    // Screenshot asset detail page
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'manual-04-asset-detail-initial.png'),
      fullPage: true
    });

    // Find tabs
    const tabs = page.locator('[role="tab"]');
    const tabCount = await tabs.count();
    console.log(`\nFound ${tabCount} tabs`);

    const tabNames: string[] = [];
    for (let i = 0; i < tabCount; i++) {
      const label = await tabs.nth(i).textContent();
      if (label) {
        tabNames.push(label.trim());
      }
    }
    console.log('Available tabs:', tabNames);

    // Test each tab mentioned in requirements
    const tabsToTest = ['Hardware', 'Software', 'Patches', 'Vulnerabilities'];

    for (const tabName of tabsToTest) {
      console.log(`\n=== Testing ${tabName} Tab ===`);

      const tab = page.locator(`[role="tab"]:has-text("${tabName}")`).first();
      const exists = await tab.isVisible().catch(() => false);

      if (!exists) {
        console.log(`❌ ${tabName} tab not found`);
        continue;
      }

      // Click tab
      await tab.click();
      await page.waitForTimeout(1500);

      // Take screenshot
      const screenshotFile = `asset-tab-${tabName.toLowerCase()}.png`;
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, screenshotFile),
        fullPage: true
      });
      console.log(`✅ Screenshot saved: ${screenshotFile}`);
    }

    // Generate summary
    const summary = {
      testDate: new Date().toISOString(),
      asset: firstAssetName,
      availableTabs: tabNames,
      testedTabs: tabsToTest,
      screenshotsLocation: SCREENSHOT_DIR
    };

    fs.writeFileSync(
      path.join(SCREENSHOT_DIR, 'manual-test-summary.json'),
      JSON.stringify(summary, null, 2)
    );

    console.log('\n✅ Manual test completed!');
    console.log(`Screenshots saved to: ${SCREENSHOT_DIR}`);
  } else {
    console.log('❌ Did not navigate to asset detail page');
    console.log('Current URL:', currentUrl);
  }
});
