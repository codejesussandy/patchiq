import { chromium } from 'playwright';
import path from 'path';

async function testPatchesPage() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  try {
    console.log('Navigating to patches page...');
    await page.goto('http://localhost:3002/patches');

    // Wait for page to load
    await page.waitForTimeout(2000);

    // Check page content
    const html = await page.content();
    const hasPatches = html.includes('All Patches') || html.includes('Patches') || html.includes('patch');
    const hasTable = html.includes('table') || html.includes('Table');

    console.log(`Page contains "Patches": ${hasPatches}`);
    console.log(`Page contains table: ${hasTable}`);

    // Take screenshot
    const screenshotPath = path.join('.playwright-mcp', 'patches-page.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`Screenshot saved to ${screenshotPath}`);

    // Check for error messages
    const errorElements = await page.locator('[role="alert"], .ant-alert-error, .error').count();
    console.log(`Error elements found: ${errorElements}`);

    if (errorElements > 0) {
      const errorText = await page.locator('[role="alert"], .ant-alert-error, .error').first().textContent();
      console.log(`Error text: ${errorText}`);
    }

  } catch (error) {
    console.error('Test failed:', error.message);
    await page.screenshot({ path: path.join('.playwright-mcp', 'patches-error.png'), fullPage: true });
  } finally {
    await browser.close();
  }
}

testPatchesPage();
