import { test, expect } from '@playwright/test';
import { TEST_USER } from './fixtures';
import * as path from 'path';

const SCREENSHOT_DIR = '/Users/shandesh/src/VS-code/PatchIQ/full-dev-sandy-v2/screenshots';

test('Quick Patches Page Test', async ({ page }) => {
  console.log('\n=== QUICK PATCHES TEST ===\n');

  // Login
  await page.goto('/login');
  await page.waitForSelector('#email', { timeout: 15000 });
  await page.fill('#email', TEST_USER.email);
  await page.fill('#password', TEST_USER.password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/(dashboard|patches|assets)/, { timeout: 30000 });
  console.log('✅ Logged in');

  // Go to patches page
  await page.goto('/patches');
  console.log('📍 Navigated to /patches');

  // Wait a bit for page to load
  await page.waitForTimeout(3000);

  // Take screenshot immediately
  const ss1 = path.join(SCREENSHOT_DIR, 'patches-list-initial.png');
  await page.screenshot({ path: ss1, fullPage: true });
  console.log('📸 Screenshot: patches-list-initial.png');

  // Check what's on the page
  const url = page.url();
  const title = await page.title();
  const body = await page.locator('body').textContent();

  console.log(`\n📊 Page Info:`);
  console.log(`  URL: ${url}`);
  console.log(`  Title: ${title}`);
  console.log(`  Body length: ${body?.length} chars`);
  console.log(`  First 200 chars: ${body?.substring(0, 200)}`);

  // Check for common elements
  const hasTable = await page.locator('table, .ant-table').count() > 0;
  const hasH1 = await page.locator('h1').count() > 0;
  const hasH2 = await page.locator('h2').count() > 0;

  console.log(`\n🔍 Elements:`);
  console.log(`  Has table: ${hasTable}`);
  console.log(`  Has h1: ${hasH1}`);
  console.log(`  Has h2: ${hasH2}`);

  if (hasTable) {
    const rowCount = await page.locator('tbody tr').count();
    console.log(`  Table rows: ${rowCount}`);
  }

  // Get all headings
  const headings = await page.locator('h1, h2, h3').allTextContents();
  console.log(`  Headings: ${JSON.stringify(headings)}`);

  console.log('\n✅ Test completed successfully');
  expect(page).toBeTruthy();
});
