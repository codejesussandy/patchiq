import { test, expect } from '@playwright/test';
import { join } from 'path';

// Test configuration
const BASE_URL = 'http://localhost:5173';
const SCREENSHOT_DIR = '/Users/shandesh/src/VS-code/PatchIQ/full-dev-sandy-v2/screenshots/phase2-agent15';

// Use authenticated state
test.use({ storageState: './auth.json' });

// Helper to generate timestamp for screenshots
function getTimestamp(): string {
  return new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
}

test.describe('Phase 2 Agent 15: Manual Vulnerability Scanning Tests', () => {
  test('Manual Test 1: Verify Scan Now Button Exists', async ({ page }) => {
    console.log('\n📍 TEST: Verify Scan Now Button on Vulnerabilities Page');

    // Navigate to vulnerabilities page
    await page.goto(`${BASE_URL}/vulnerability/vulnerabilities`);
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(2000);

    // Take initial screenshot
    await page.screenshot({
      path: join(SCREENSHOT_DIR, `manual-vulnerabilities-page-${getTimestamp()}.png`),
      fullPage: true
    });

    // Check for "Scan Now" button
    const scanButton = page.locator('button:has-text("Scan Now")').first();
    const isVisible = await scanButton.isVisible({ timeout: 5000 }).catch(() => false);

    if (isVisible) {
      console.log('✅ "Scan Now" button found!');

      // Highlight and screenshot the button
      await scanButton.scrollIntoViewIfNeeded();
      await scanButton.evaluate((el) => {
        el.style.border = '3px solid red';
        el.style.backgroundColor = 'yellow';
      });

      await page.screenshot({
        path: join(SCREENSHOT_DIR, `manual-scan-button-highlighted-${getTimestamp()}.png`),
        fullPage: true
      });

      console.log('📸 Screenshot saved with highlighted button');
    } else {
      console.log('❌ "Scan Now" button NOT found');
    }

    expect(isVisible).toBeTruthy();
  });

  test('Manual Test 2: Verify NVD Sync Button on Settings', async ({ page }) => {
    console.log('\n📍 TEST: Verify NVD Sync Button on Settings Page');

    // Navigate to vulnerability preference settings
    await page.goto(`${BASE_URL}/settings/vulnerability-preference`);
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(2000);

    // Take initial screenshot
    await page.screenshot({
      path: join(SCREENSHOT_DIR, `manual-settings-page-${getTimestamp()}.png`),
      fullPage: true
    });

    // Check for "Sync Now" button
    const syncButton = page.locator('button:has-text("Sync Now")').first();
    const isVisible = await syncButton.isVisible({ timeout: 5000 }).catch(() => false);

    if (isVisible) {
      console.log('✅ "Sync Now" button found!');

      // Highlight and screenshot the button
      await syncButton.scrollIntoViewIfNeeded();
      await syncButton.evaluate((el) => {
        el.style.border = '3px solid red';
        el.style.backgroundColor = 'yellow';
      });

      await page.screenshot({
        path: join(SCREENSHOT_DIR, `manual-sync-button-highlighted-${getTimestamp()}.png`),
        fullPage: true
      });

      console.log('📸 Screenshot saved with highlighted button');
    } else {
      console.log('❌ "Sync Now" button NOT found');
    }

    expect(isVisible).toBeTruthy();
  });

  test('Manual Test 3: Verify Add Exceptions Button', async ({ page }) => {
    console.log('\n📍 TEST: Verify Add Exceptions Button on Vulnerabilities Page');

    // Navigate to vulnerabilities page
    await page.goto(`${BASE_URL}/vulnerability/vulnerabilities`);
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(2000);

    // Take initial screenshot
    await page.screenshot({
      path: join(SCREENSHOT_DIR, `manual-vulnerabilities-exception-${getTimestamp()}.png`),
      fullPage: true
    });

    // Check for "Add Exceptions" button
    const exceptionsButton = page.locator('button:has-text("Add Exceptions")').first();
    const isVisible = await exceptionsButton.isVisible({ timeout: 5000 }).catch(() => false);

    if (isVisible) {
      console.log('✅ "Add Exceptions" button found!');

      // Highlight and screenshot the button
      await exceptionsButton.scrollIntoViewIfNeeded();
      await exceptionsButton.evaluate((el) => {
        el.style.border = '3px solid red';
        el.style.backgroundColor = 'yellow';
      });

      await page.screenshot({
        path: join(SCREENSHOT_DIR, `manual-exception-button-highlighted-${getTimestamp()}.png`),
        fullPage: true
      });

      console.log('📸 Screenshot saved with highlighted button');
    } else {
      console.log('❌ "Add Exceptions" button NOT found');
    }

    expect(isVisible).toBeTruthy();
  });

  test('Manual Test 4: Count Vulnerabilities', async ({ page }) => {
    console.log('\n📍 TEST: Count Current Vulnerabilities');

    // Navigate to vulnerabilities page
    await page.goto(`${BASE_URL}/vulnerability/vulnerabilities`);
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(3000); // Wait for data to load

    // Take screenshot
    await page.screenshot({
      path: join(SCREENSHOT_DIR, `manual-vulnerabilities-count-${getTimestamp()}.png`),
      fullPage: true
    });

    // Count table rows
    const rowCount = await page.locator('tr[data-row-key], .ant-table-row').count();
    console.log(`📊 Found ${rowCount} vulnerability rows in table`);

    // Look for pagination info
    const paginationText = await page.locator('.ant-pagination-total-text, [class*="pagination"] >> text=/showing/i').first().textContent().catch(() => null);
    if (paginationText) {
      console.log(`📊 Pagination info: ${paginationText}`);
    }

    // Look for stats cards
    const statsCards = await page.locator('[class*="card"], .ant-card').count();
    console.log(`📊 Found ${statsCards} stat cards on page`);
  });

  test('Manual Test 5: Verify Dashboard Vulnerability Count', async ({ page }) => {
    console.log('\n📍 TEST: Verify Dashboard Shows Vulnerability Count');

    // Navigate to dashboard
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(2000);

    // Take screenshot
    await page.screenshot({
      path: join(SCREENSHOT_DIR, `manual-dashboard-vulns-${getTimestamp()}.png`),
      fullPage: true
    });

    // Look for vulnerability-related elements
    const vulnElements = await page.locator('text=/vulnerabilit/i').count();
    console.log(`📊 Found ${vulnElements} elements mentioning "vulnerability"`);

    // Look for numeric counts
    const numberElements = await page.locator('text=/\\d+/').all();
    console.log(`📊 Found ${numberElements.length} numeric elements on dashboard`);

    // Try to find specific vulnerability count cards
    const criticalCount = await page.locator('text=/critical/i ~ text=/\\d+/').first().textContent().catch(() => null);
    const highCount = await page.locator('text=/high/i ~ text=/\\d+/').first().textContent().catch(() => null);

    if (criticalCount) console.log(`📊 Critical vulnerabilities: ${criticalCount}`);
    if (highCount) console.log(`📊 High vulnerabilities: ${highCount}`);
  });
});
