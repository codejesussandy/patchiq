import { test } from '@playwright/test';
import * as path from 'path';

const SCREENSHOTS_DIR = '/Users/shandesh/src/VS-code/PatchIQ/full-dev-sandy-v2/screenshots';
const BASE_URL = 'http://localhost:3500';
const ADMIN_EMAIL = 'admin@patchiq.io';
const ADMIN_PASSWORD = 'admin123';

test('Debug Login Submit', async ({ page }) => {
  page.on('console', msg => console.log('Browser console:', msg.text()));
  page.on('response', response => {
    if (response.url().includes('/auth/login')) {
      console.log('Login response:', response.status(), response.statusText());
      response.json().then(data => console.log('Response data:', JSON.stringify(data))).catch(() => {});
    }
  });

  // Login
  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState('networkidle');

  console.log('On login page');

  const emailInput = page.locator('input[type="text"], input[placeholder*="mail" i]').first();
  const passwordInput = page.locator('input[type="password"]').first();

  await emailInput.fill(ADMIN_EMAIL);
  console.log('Filled email');

  await passwordInput.fill(ADMIN_PASSWORD);
  console.log('Filled password');

  // Take screenshot before submit
  await page.screenshot({
    path: path.join(SCREENSHOTS_DIR, 'before-login-submit.png'),
    fullPage: true
  });

  // Find and click the submit button
  const submitButton = page.locator('button:has-text("Log in"), button[type="submit"]').first();
  await submitButton.click();
  console.log('Clicked submit button');

  // Wait a bit
  await page.waitForTimeout(3000);

  // Take screenshot after submit
  await page.screenshot({
    path: path.join(SCREENSHOTS_DIR, 'after-login-submit.png'),
    fullPage: true
  });

  console.log('Current URL after submit:', page.url());

  // Check for error messages
  const errorMessages = await page.locator('.ant-message-error, .ant-notification-error, .ant-alert-error').all();
  console.log('Error messages found:', errorMessages.length);

  for (let i = 0; i < errorMessages.length; i++) {
    const text = await errorMessages[i].textContent();
    console.log(`Error ${i}:`, text);
  }
});
