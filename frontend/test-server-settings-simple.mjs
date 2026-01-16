import { chromium } from 'playwright';
import path from 'path';

async function testServerSettings() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  try {
    // First, navigate to login and get authenticated
    console.log('Step 1: Navigating to login...');
    await page.goto('http://localhost:3002/login');

    // Wait for page to load
    await page.waitForTimeout(1000);

    // Find and fill email input
    console.log('Step 2: Filling email...');
    const emailInput = page.locator('input[type="text"], input[placeholder*="email" i]').first();
    await emailInput.fill('admin@infraon.com');

    // Fill password
    console.log('Step 3: Filling password...');
    const passwordInput = page.locator('input[type="password"]');
    await passwordInput.fill('password');

    // Click login button
    console.log('Step 4: Clicking login button...');
    const loginBtn = page.locator('button:has-text("Log in"), button:has-text("Login"), button:has-text("Sign In")').first();
    await loginBtn.click();

    // Wait for navigation
    console.log('Step 5: Waiting for authentication...');
    await page.waitForTimeout(3000);

    // Check if we're still on login page
    const currentUrl = page.url();
    console.log(`Current URL after login: ${currentUrl}`);

    // Navigate directly to ServerSettings
    console.log('Step 6: Navigating to Server Settings...');
    await page.goto('http://localhost:3002/settings/system-settings/server-settings');

    await page.waitForTimeout(2000);

    // Take screenshot
    console.log('Step 7: Taking screenshot...');
    const screenshotPath = path.join('.playwright-mcp', 'server-settings-page.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`Screenshot saved to ${screenshotPath}`);

    // Check page content
    const pageTitle = await page.locator('h2').first().textContent();
    console.log(`Page title: ${pageTitle}`);

    const html = await page.content();
    console.log(`Page contains "Server Settings": ${html.includes('Server Settings')}`);
    console.log(`Page contains form inputs: ${html.includes('input') && html.includes('number')}`);
    console.log(`Page contains Save button: ${html.includes('Save')}`);

  } catch (error) {
    console.error('Test failed:', error.message);
    // Take error screenshot
    await page.screenshot({ path: path.join('.playwright-mcp', 'error.png'), fullPage: true });
  } finally {
    await browser.close();
  }
}

testServerSettings();
