import { test } from '@playwright/test';
import * as path from 'path';

const SCREENSHOTS_DIR = '/Users/shandesh/src/VS-code/PatchIQ/full-dev-sandy-v2/screenshots';
const BASE_URL = 'http://localhost:3500';
const ADMIN_EMAIL = 'admin@patchiq.io';
const ADMIN_PASSWORD = 'admin123';

test('Debug Assets Page', async ({ page }) => {
  // Login
  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState('networkidle');

  const emailInput = page.locator('input[type="text"], input[placeholder*="mail" i]').first();
  const passwordInput = page.locator('input[type="password"]').first();

  await emailInput.fill(ADMIN_EMAIL);
  await passwordInput.fill(ADMIN_PASSWORD);
  await page.click('button[type="submit"]');

  // Wait for redirect
  await page.waitForURL(/\/(?!login)/, { timeout: 10000 });

  console.log('After login, URL is:', page.url());

  // Navigate to assets
  await page.goto(`${BASE_URL}/assets`);
  await page.waitForTimeout(5000); // Wait 5 seconds

  console.log('Assets page URL:', page.url());

  // Take screenshot
  await page.screenshot({
    path: path.join(SCREENSHOTS_DIR, 'debug-assets-page.png'),
    fullPage: true
  });

  // Log page content summary
  const h1 = await page.locator('h1, h2, h3').first().textContent().catch(() => 'No heading found');
  console.log('Page heading:', h1);

  // Check for common elements
  const hasTable = await page.locator('table').count();
  const hasEmpty = await page.locator('.ant-empty').count();
  const hasLoading = await page.locator('.ant-spin').count();
  const hasError = await page.locator('.ant-result-error, .ant-alert-error').count();

  console.log('Elements found:');
  console.log('  Tables:', hasTable);
  console.log('  Empty states:', hasEmpty);
  console.log('  Loading spinners:', hasLoading);
  console.log('  Error messages:', hasError);
});
