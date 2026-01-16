import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

async function testServerSettings() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  try {
    console.log('Navigating to Server Settings page...');
    // Directly navigate to settings page, the server should handle auth
    try {
      await page.goto('http://localhost:3002/settings/system-settings/server-settings', { waitUntil: 'domcontentloaded', timeout: 5000 });
    } catch (e) {
      console.log('Got redirect or timeout, might be at login page');

      // If we're at login, try to log in
      const loginForm = await page.locator('form, .login-form, [class*="login"]').first().count();
      if (loginForm > 0) {
        console.log('Found login form, attempting login...');
        const emailInputs = await page.locator('input[type="text"], input[name*="email" i], input[placeholder*="email" i]').all();
        const passwordInputs = await page.locator('input[type="password"]').all();

        if (emailInputs.length > 0) {
          await emailInputs[0].fill('admin@infraon.com');
          console.log('Filled email');
        }

        if (passwordInputs.length > 0) {
          await passwordInputs[0].fill('password');
          console.log('Filled password');
        }

        const buttons = await page.locator('button').all();
        if (buttons.length > 0) {
          await buttons[buttons.length - 1].click();
          console.log('Clicked login button');
          await page.waitForTimeout(2000);
        }

        // Try to navigate again
        await page.goto('http://localhost:3002/settings/system-settings/server-settings', { waitUntil: 'domcontentloaded' });
      }
    }

    console.log('Page loaded');

    // Wait for the page to load
    await page.waitForTimeout(1000);
    console.log('Server Settings page should be loaded');

    // Take screenshot
    const screenshotPath = path.join('.playwright-mcp', 'server-settings.png');
    await page.screenshot({ path: screenshotPath, fullPage: false });
    console.log(`Screenshot saved to ${screenshotPath}`);

    // Check for form elements
    const hasSessionTimeoutField = await page.locator('input[type="number"]').count() > 0;
    const hasSelectField = await page.locator('select, .ant-select').count() > 0;
    const hasSaveButton = await page.locator('button:has-text("Save")').count() > 0;
    const hasResetButton = await page.locator('button:has-text("Reset")').count() > 0;

    console.log('Form validation:');
    console.log(`  - Has timeout input fields: ${hasSessionTimeoutField}`);
    console.log(`  - Has select fields: ${hasSelectField}`);
    console.log(`  - Has Save button: ${hasSaveButton}`);
    console.log(`  - Has Reset button: ${hasResetButton}`);

    // Try to fill in and submit the form
    console.log('\nTesting form interaction...');

    const inputs = await page.locator('input[type="number"]').all();
    console.log(`Found ${inputs.length} number input fields`);

    if (inputs.length >= 2) {
      // Fill in session timeout minutes
      await inputs[0].fill('60');
      console.log('Filled session timeout field');

      // Fill in session idle timeout
      await inputs[1].fill('0');
      console.log('Filled session idle timeout field');
    }

    if (inputs.length >= 4) {
      // Fill in endpoint online status timeout
      await inputs[2].fill('1');
      console.log('Filled endpoint online status timeout field');

      // Fill in scan job timeout
      await inputs[3].fill('1');
      console.log('Filled scan job timeout field');
    }

    // Select log level
    const selectElements = await page.locator('.ant-select').all();
    if (selectElements.length > 0) {
      await selectElements[0].click();
      await page.waitForTimeout(500);
      const debugOption = page.locator('div:has-text("Debug")').first();
      if (await debugOption.count() > 0) {
        await debugOption.click();
        console.log('Selected Debug log level');
      }
    }

    // Take another screenshot after filling form
    const filledScreenshotPath = path.join('.playwright-mcp', 'server-settings-filled.png');
    await page.screenshot({ path: filledScreenshotPath, fullPage: false });
    console.log(`Filled form screenshot saved to ${filledScreenshotPath}`);

  } catch (error) {
    console.error('Test failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

testServerSettings();
