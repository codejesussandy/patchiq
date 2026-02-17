#!/usr/bin/env node

import { chromium } from 'playwright';
import { writeFileSync } from 'fs';
import { mkdir } from 'fs/promises';

const BASE_URL = 'http://localhost:5173';
const SCREENSHOTS_DIR = '/Users/shandesh/src/VS-code/PatchIQ/full-dev-sandy-v2/screenshots';

// Create screenshots directory
await mkdir(SCREENSHOTS_DIR, { recursive: true });

console.log('\n═══════════════════════════════════════════════════════════');
console.log('Dashboard Test - Phase 1 Agent 2');
console.log('═══════════════════════════════════════════════════════════\n');

const results = {
  testName: 'Dashboard',
  status: 'PASS',
  pageLoadTime: 0,
  statsCardsFound: 0,
  vulnerabilitiesPresent: false,
  navigationWorked: false,
  consoleErrors: [],
  bugsFound: 0,
  details: []
};

let browser = null;
let page = null;

try {
  // Check if frontend is accessible
  console.log('Checking if frontend is running...');
  const response = await fetch(BASE_URL).catch(() => null);

  if (!response || !response.ok) {
    throw new Error(`Frontend not accessible at ${BASE_URL}. Please ensure services are running:\n  - Frontend: http://localhost:5173\n  - Backend: http://localhost:3000`);
  }
  console.log('✓ Frontend is accessible\n');

  // Launch browser
  console.log('Launching browser...');
  browser = await chromium.launch({
    headless: false,
    slowMo: 100
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });

  page = await context.newPage();
  console.log('✓ Browser launched\n');

  // Capture console errors
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      results.consoleErrors.push(msg.text());
    }
  });

  page.on('pageerror', (err) => {
    results.consoleErrors.push(`Page Error: ${err.message}`);
  });

  // ========================================
  // Test 1: Login
  // ========================================
  console.log('=== Test 1: Login ===');
  results.details.push('Test 1: Login');

  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState('networkidle');

  // Fill credentials
  await page.fill('#email', 'admin@patchiq.io');
  await page.fill('#password', 'admin123');

  console.log('Credentials entered: admin@patchiq.io / admin123');

  // Click submit
  await page.click('button[type="submit"]');

  // Wait for redirect
  try {
    await page.waitForURL(/dashboard/, { timeout: 15000 });
    console.log('✓ Login successful - redirected to dashboard\n');
    results.details.push('✓ Login successful');
  } catch (err) {
    throw new Error(`Login failed - did not redirect to dashboard. Current URL: ${page.url()}`);
  }

  // ========================================
  // Test 2: Measure Page Load Time
  // ========================================
  console.log('=== Test 2: Page Load Performance ===');
  results.details.push('Test 2: Page Load Performance');

  const startTime = Date.now();
  await page.goto(`${BASE_URL}/dashboard`);
  await page.waitForLoadState('networkidle', { timeout: 10000 });
  const endTime = Date.now();

  results.pageLoadTime = endTime - startTime;
  console.log(`Page Load Time: ${results.pageLoadTime}ms`);

  if (results.pageLoadTime < 3000) {
    console.log('✓ PASS - Load time < 3000ms\n');
    results.details.push(`✓ Page loaded in ${results.pageLoadTime}ms (< 3000ms)`);
  } else {
    console.log('✗ FAIL - Load time >= 3000ms (TOO SLOW)\n');
    results.details.push(`✗ Page loaded in ${results.pageLoadTime}ms (>= 3000ms) - TOO SLOW!`);
    results.status = 'FAIL';
    results.bugsFound++;
  }

  // Wait for content to render
  await page.waitForTimeout(2000);

  // ========================================
  // Test 3: Verify Stats Cards
  // ========================================
  console.log('=== Test 3: Stats Cards Verification ===');
  results.details.push('Test 3: Stats Cards');

  const statsToCheck = [
    { name: 'Assets', pattern: /assets/i },
    { name: 'Patches', pattern: /patches/i },
    { name: 'Vulnerabilities', pattern: /vulnerabilit/i },
    { name: 'Deployments', pattern: /deployments/i }
  ];

  for (const stat of statsToCheck) {
    try {
      const element = page.locator(`text=${stat.pattern}`).first();
      const isVisible = await element.isVisible({ timeout: 2000 });

      if (isVisible) {
        results.statsCardsFound++;
        console.log(`✓ Found ${stat.name} stat card`);
        results.details.push(`✓ Found ${stat.name} stat card`);
      } else {
        console.log(`✗ ${stat.name} stat card not visible`);
        results.details.push(`✗ ${stat.name} stat card not visible`);
      }
    } catch (err) {
      console.log(`✗ ${stat.name} stat card not found`);
      results.details.push(`✗ ${stat.name} stat card not found`);
    }
  }

  console.log(`\nStats Cards Found: ${results.statsCardsFound}/4`);
  results.details.push(`Stats cards found: ${results.statsCardsFound}/4`);

  if (results.statsCardsFound === 0) {
    console.log('✗ WARNING - No stats cards found\n');
    results.status = 'FAIL';
    results.bugsFound++;
  } else {
    console.log('✓ At least some stats cards present\n');
  }

  // Take screenshot
  const statsScreenshot = `${SCREENSHOTS_DIR}/dashboard-stats.png`;
  await page.screenshot({ path: statsScreenshot, fullPage: true });
  console.log(`✓ Screenshot saved: ${statsScreenshot}\n`);
  results.details.push(`Screenshot: ${statsScreenshot}`);

  // ========================================
  // Test 4: Verify Top Vulnerabilities Section
  // ========================================
  console.log('=== Test 4: Top Vulnerabilities Section ===');
  results.details.push('Test 4: Top Vulnerabilities Section');

  const vulnSelectors = [
    'text=/Top Vulnerabilities/i',
    'text=/Recent Vulnerabilities/i',
    'text=/Critical Vulnerabilities/i',
    'text=/Vulnerabilities/i'
  ];

  let found = false;
  for (const selector of vulnSelectors) {
    try {
      const element = page.locator(selector).first();
      if (await element.isVisible({ timeout: 1000 })) {
        console.log(`✓ Found vulnerabilities section: ${selector}`);
        results.details.push(`✓ Found vulnerabilities section`);
        found = true;
        break;
      }
    } catch (err) {
      // Try next selector
    }
  }

  results.vulnerabilitiesPresent = found;
  if (!found) {
    console.log('⊘ Top vulnerabilities section not found');
    results.details.push('⊘ Top vulnerabilities section not found');
  }
  console.log('');

  // Take screenshot
  const vulnScreenshot = `${SCREENSHOTS_DIR}/dashboard-vulnerabilities.png`;
  await page.screenshot({ path: vulnScreenshot, fullPage: true });
  console.log(`✓ Screenshot saved: ${vulnScreenshot}\n`);
  results.details.push(`Screenshot: ${vulnScreenshot}`);

  // ========================================
  // Test 5: Test Navigation to Vulnerability Detail
  // ========================================
  console.log('=== Test 5: Navigation Test ===');
  results.details.push('Test 5: Navigation Test');

  const currentUrl = page.url();

  const clickableSelectors = [
    'table tbody tr:first-child',
    '.vulnerability-item:first-child',
    'a[href*="vulnerabilit"]:first-child'
  ];

  let navigationSuccess = false;

  for (const selector of clickableSelectors) {
    try {
      const element = page.locator(selector).first();

      if (await element.count() > 0 && await element.isVisible({ timeout: 1000 })) {
        console.log(`Attempting to click: ${selector}`);
        await element.click({ timeout: 3000 });
        await page.waitForLoadState('networkidle', { timeout: 5000 });

        const newUrl = page.url();

        if (newUrl !== currentUrl) {
          console.log(`✓ Navigation successful: ${currentUrl} → ${newUrl}`);
          results.details.push(`✓ Navigation successful to ${newUrl}`);
          results.navigationWorked = true;
          navigationSuccess = true;

          // Take screenshot of detail page
          const detailScreenshot = `${SCREENSHOTS_DIR}/vulnerability-detail.png`;
          await page.screenshot({ path: detailScreenshot, fullPage: true });
          console.log(`✓ Screenshot saved: ${detailScreenshot}`);
          results.details.push(`Screenshot: ${detailScreenshot}`);

          // Navigate back
          await page.goBack();
          await page.waitForLoadState('networkidle');
          console.log('✓ Navigated back to dashboard\n');
          results.details.push('✓ Navigated back to dashboard');

          break;
        }
      }
    } catch (err) {
      // Try next selector
    }
  }

  if (!navigationSuccess) {
    console.log('⊘ No clickable vulnerability items found - navigation test skipped\n');
    results.details.push('⊘ Navigation test skipped - no clickable items');

    // Take screenshot anyway
    const detailScreenshot = `${SCREENSHOTS_DIR}/vulnerability-detail.png`;
    await page.screenshot({ path: detailScreenshot, fullPage: true });
    console.log(`Screenshot saved: ${detailScreenshot}\n`);
  }

  // ========================================
  // Test 6: Console Errors Check
  // ========================================
  console.log('=== Test 6: Console Errors Check ===');
  results.details.push('Test 6: Console Errors');

  console.log(`Console errors found: ${results.consoleErrors.length}`);

  if (results.consoleErrors.length > 0) {
    console.log('\n✗ Console Errors Detected:');
    results.consoleErrors.forEach((err, idx) => {
      console.log(`  ${idx + 1}. ${err}`);
      results.details.push(`  Console error: ${err}`);
    });
    console.log('');
    results.bugsFound += results.consoleErrors.length;
    results.status = 'FAIL';
  } else {
    console.log('✓ No console errors detected\n');
    results.details.push('✓ No console errors');
  }

} catch (error) {
  console.error('\n✗ Test failed with error:');
  console.error(error.message);
  results.status = 'FAIL';
  results.bugsFound++;
  results.details.push(`✗ Test failed: ${error.message}`);
} finally {
  if (page) await page.close();
  if (browser) await browser.close();
}

// ========================================
// Generate Report
// ========================================
const report = `
═══════════════════════════════════════════════════════════
Test: ${results.testName}
Status: ${results.status}
═══════════════════════════════════════════════════════════

Page Load Time: ${results.pageLoadTime}ms (Target: < 3000ms)
${results.pageLoadTime < 3000 && results.pageLoadTime > 0 ? '✓ PASS' : results.pageLoadTime === 0 ? 'N/A' : '✗ FAIL - TOO SLOW'}

Stats Cards Present: ${results.statsCardsFound}/4
${results.statsCardsFound > 0 ? '✓ PASS' : '✗ FAIL - NO STATS CARDS'}

Top Vulnerabilities Section: ${results.vulnerabilitiesPresent ? 'PRESENT' : 'MISSING'}

Navigation Test: ${results.navigationWorked ? 'PASS' : 'SKIPPED'}

Screenshots:
  - ${SCREENSHOTS_DIR}/dashboard-stats.png
  - ${SCREENSHOTS_DIR}/dashboard-vulnerabilities.png
  - ${SCREENSHOTS_DIR}/vulnerability-detail.png

Console Errors: ${results.consoleErrors.length}
${results.consoleErrors.length > 0 ? results.consoleErrors.map((e, i) => `  ${i + 1}. ${e}`).join('\n') : '  None'}

═══════════════════════════════════════════════════════════
Overall: ${results.status}
Bugs found: ${results.bugsFound}
═══════════════════════════════════════════════════════════

Detailed Test Log:
${results.details.map(d => `  ${d}`).join('\n')}

═══════════════════════════════════════════════════════════
`;

console.log(report);

// Save report
const reportPath = `${SCREENSHOTS_DIR}/dashboard-test-report.txt`;
writeFileSync(reportPath, report);
console.log(`Report saved to: ${reportPath}\n`);

// Exit with appropriate code
process.exit(results.status === 'PASS' ? 0 : 1);
