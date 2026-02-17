import { test, expect } from '@playwright/test';
import * as path from 'path';

/**
 * Debug test for Patches module
 * Simpler version to diagnose issues
 */

const SCREENSHOT_DIR = '/Users/shandesh/src/VS-code/PatchIQ/full-dev-sandy-v2/screenshots';

test.describe('Patches Module - Debug Tests', () => {

  test('Can access patches page', async ({ page }) => {
    console.log('\n🧪 Debug Test: Access Patches Page');

    // Go to patches page directly
    await page.goto('http://localhost:5173/patches');
    await page.waitForTimeout(3000);

    // Take screenshot of whatever we see
    const screenshotPath = path.join(SCREENSHOT_DIR, 'patches-debug-direct.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log('📸 Screenshot saved: patches-debug-direct.png');

    // Check URL
    const url = page.url();
    console.log(`📍 Current URL: ${url}`);

    // Get page content
    const title = await page.title();
    console.log(`📄 Page title: ${title}`);

    // Check for any visible text
    const bodyText = await page.locator('body').textContent();
    const firstHundredChars = bodyText?.substring(0, 200);
    console.log(`📝 First 200 chars: ${firstHundredChars}`);

    // Check if we need to login
    const hasLoginForm = await page.locator('input[type="email"], input[type="password"]').count() > 0;
    if (hasLoginForm) {
      console.log('⚠️  Login form detected - need to login first');

      await page.fill('input[type="email"]', 'admin@patchiq.io');
      await page.fill('input[type="password"]', 'admin123');
      await page.click('button[type="submit"]');

      await page.waitForTimeout(3000);

      const afterLoginUrl = page.url();
      console.log(`📍 After login URL: ${afterLoginUrl}`);

      // Navigate to patches again
      await page.goto('http://localhost:5173/patches');
      await page.waitForTimeout(2000);

      const screenshotPath2 = path.join(SCREENSHOT_DIR, 'patches-debug-after-login.png');
      await page.screenshot({ path: screenshotPath2, fullPage: true });
      console.log('📸 Screenshot saved: patches-debug-after-login.png');
    }

    // Check for any table or list
    const hasTable = await page.locator('table, .ant-table').count() > 0;
    console.log(`📊 Has table: ${hasTable}`);

    if (hasTable) {
      const rowCount = await page.locator('tbody tr').count();
      console.log(`📊 Row count: ${rowCount}`);
    }

    // Check for headings
    const headings = await page.locator('h1, h2, h3').allTextContents();
    console.log(`📋 Headings found: ${JSON.stringify(headings)}`);

    expect(page).toBeTruthy();
  });

});
