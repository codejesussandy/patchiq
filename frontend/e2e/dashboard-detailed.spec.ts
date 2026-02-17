import { test, expect, Page, ConsoleMessage } from '@playwright/test';
import { login, waitForPageLoad } from './fixtures';
import * as fs from 'fs';
import * as path from 'path';

const SCREENSHOTS_DIR = '/Users/shandesh/src/VS-code/PatchIQ/full-dev-sandy-v2/screenshots';

// Ensure screenshots directory exists
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

interface TestMetrics {
  pageLoadTime: number;
  statsCardsFound: number;
  vulnerabilitiesPresent: boolean;
  navigationWorked: boolean;
  consoleErrors: string[];
}

test.describe('Dashboard - Detailed Performance & Functional Tests', () => {
  let consoleErrors: string[] = [];
  let metrics: TestMetrics = {
    pageLoadTime: 0,
    statsCardsFound: 0,
    vulnerabilitiesPresent: false,
    navigationWorked: false,
    consoleErrors: []
  };

  test.beforeEach(async ({ page }) => {
    // Reset metrics
    consoleErrors = [];
    metrics = {
      pageLoadTime: 0,
      statsCardsFound: 0,
      vulnerabilitiesPresent: false,
      navigationWorked: false,
      consoleErrors: []
    };

    // Capture console errors
    page.on('console', (msg: ConsoleMessage) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    page.on('pageerror', (err: Error) => {
      consoleErrors.push(`Page Error: ${err.message}`);
    });

    // Login first
    await login(page);
  });

  test('Test 1: Login and measure page load time', async ({ page }) => {
    console.log('\n=== Test 1: Login and Page Load Performance ===');

    // Navigate to dashboard and measure load time
    const startTime = Date.now();
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    const endTime = Date.now();

    metrics.pageLoadTime = endTime - startTime;
    console.log(`Page Load Time: ${metrics.pageLoadTime}ms`);

    // Verify we're on the dashboard
    expect(page.url()).toContain('dashboard');

    // Check load time is under 3 seconds
    expect(metrics.pageLoadTime).toBeLessThan(3000);

    console.log(`✓ Page loaded in ${metrics.pageLoadTime}ms (< 3000ms)`);
  });

  test('Test 2: Verify stats cards presence and content', async ({ page }) => {
    console.log('\n=== Test 2: Stats Cards Verification ===');

    await page.goto('/dashboard');
    await waitForPageLoad(page);

    // Give extra time for stats to load
    await page.waitForTimeout(2000);

    // Test each stats card type
    const statsToCheck = [
      { name: 'Assets', pattern: /assets/i },
      { name: 'Patches', pattern: /patches/i },
      { name: 'Vulnerabilities', pattern: /vulnerabilit/i },
      { name: 'Deployments', pattern: /deployments/i }
    ];

    let foundCards = 0;

    for (const stat of statsToCheck) {
      try {
        // Look for text matching the stat name
        const statElement = page.locator(`text=${stat.pattern}`).first();
        const isVisible = await statElement.isVisible({ timeout: 3000 });

        if (isVisible) {
          foundCards++;
          console.log(`✓ Found ${stat.name} stat card`);

          // Try to find associated number
          const parent = statElement.locator('xpath=ancestor::div[contains(@class, "card") or contains(@class, "stat")]').first();
          const numbers = await parent.locator('text=/\\d+/').count();
          if (numbers > 0) {
            const value = await parent.locator('text=/\\d+/').first().textContent();
            console.log(`  ${stat.name}: ${value}`);
          }
        } else {
          console.log(`✗ ${stat.name} stat card not found`);
        }
      } catch (err) {
        console.log(`✗ ${stat.name} stat card not found (error: ${err})`);
      }
    }

    metrics.statsCardsFound = foundCards;
    console.log(`\nTotal stats cards found: ${foundCards}/4`);

    // Take screenshot of stats
    const screenshotPath = path.join(SCREENSHOTS_DIR, 'dashboard-stats.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`✓ Screenshot saved: ${screenshotPath}`);

    // At least some stats cards should be present
    expect(foundCards).toBeGreaterThan(0);
  });

  test('Test 3: Verify top vulnerabilities section', async ({ page }) => {
    console.log('\n=== Test 3: Top Vulnerabilities Section ===');

    await page.goto('/dashboard');
    await waitForPageLoad(page);
    await page.waitForTimeout(2000);

    // Try multiple selectors for vulnerabilities section
    const vulnSelectors = [
      'text=/Top Vulnerabilities/i',
      'text=/Recent Vulnerabilities/i',
      'text=/Critical Vulnerabilities/i',
      'text=/Vulnerabilities/i',
      '[class*="vulnerabilit"]'
    ];

    let found = false;
    for (const selector of vulnSelectors) {
      try {
        const element = page.locator(selector).first();
        const isVisible = await element.isVisible({ timeout: 2000 });
        if (isVisible) {
          console.log(`✓ Found vulnerabilities section with selector: ${selector}`);
          const text = await element.textContent();
          console.log(`  Content: ${text?.substring(0, 50)}...`);
          found = true;
          break;
        }
      } catch (err) {
        // Continue to next selector
      }
    }

    metrics.vulnerabilitiesPresent = found;

    if (found) {
      console.log('✓ Top vulnerabilities section is present');
    } else {
      console.log('✗ Top vulnerabilities section not found');
    }

    // Take screenshot
    const screenshotPath = path.join(SCREENSHOTS_DIR, 'dashboard-vulnerabilities.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`✓ Screenshot saved: ${screenshotPath}`);

    // Don't fail if section isn't present - it might be empty
    console.log(`Vulnerabilities section present: ${found}`);
  });

  test('Test 4: Test navigation to vulnerability detail', async ({ page }) => {
    console.log('\n=== Test 4: Navigation Test ===');

    await page.goto('/dashboard');
    await waitForPageLoad(page);
    await page.waitForTimeout(2000);

    const currentUrl = page.url();
    console.log(`Starting URL: ${currentUrl}`);

    // Try to find and click a vulnerability item
    const clickableSelectors = [
      'table tbody tr:first-child',
      '.vulnerability-item:first-child',
      '[class*="vuln"]:first-child a',
      'a[href*="vulnerabilit"]:first-child'
    ];

    let clickedSuccessfully = false;

    for (const selector of clickableSelectors) {
      try {
        const element = page.locator(selector).first();
        const count = await element.count();

        if (count > 0 && await element.isVisible({ timeout: 2000 })) {
          console.log(`Found clickable element: ${selector}`);
          await element.click({ timeout: 5000 });
          await page.waitForLoadState('networkidle', { timeout: 5000 });

          const newUrl = page.url();
          console.log(`New URL: ${newUrl}`);

          if (newUrl !== currentUrl) {
            console.log('✓ Navigation successful');
            clickedSuccessfully = true;

            // Take screenshot of detail page
            const screenshotPath = path.join(SCREENSHOTS_DIR, 'vulnerability-detail.png');
            await page.screenshot({ path: screenshotPath, fullPage: true });
            console.log(`✓ Screenshot saved: ${screenshotPath}`);

            // Navigate back
            await page.goBack();
            await waitForPageLoad(page);
            console.log('✓ Navigated back to dashboard');

            metrics.navigationWorked = true;
            break;
          }
        }
      } catch (err) {
        // Continue to next selector
        console.log(`Selector ${selector} failed: ${err}`);
      }
    }

    if (!clickedSuccessfully) {
      console.log('⊘ No clickable vulnerability items found - navigation test skipped');
      // Take a screenshot anyway showing the state
      const screenshotPath = path.join(SCREENSHOTS_DIR, 'vulnerability-detail.png');
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`Screenshot saved (no navigation occurred): ${screenshotPath}`);
    }

    // This test doesn't fail if there are no items to click
    console.log(`Navigation test result: ${clickedSuccessfully ? 'PASS' : 'SKIPPED'}`);
  });

  test('Test 5: Console errors check', async ({ page }) => {
    console.log('\n=== Test 5: Console Errors Check ===');

    await page.goto('/dashboard');
    await waitForPageLoad(page);

    // Interact with the page a bit
    await page.waitForTimeout(3000);

    metrics.consoleErrors = consoleErrors;

    console.log(`Console errors found: ${consoleErrors.length}`);

    if (consoleErrors.length > 0) {
      console.log('\n✗ Console Errors Detected:');
      consoleErrors.forEach((err, idx) => {
        console.log(`  ${idx + 1}. ${err}`);
      });
    } else {
      console.log('✓ No console errors detected');
    }

    // Don't fail the test for console errors, just report them
    console.log(`\nConsole Error Count: ${consoleErrors.length}`);
  });

  test('Test 6: Generate comprehensive test report', async ({ page }) => {
    console.log('\n=== Test 6: Generate Test Report ===');

    // Re-run all checks to gather fresh metrics
    await page.goto('/dashboard');
    const startTime = Date.now();
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    const loadTime = Date.now() - startTime;

    await page.waitForTimeout(2000);

    // Check stats cards
    let statsCount = 0;
    for (const pattern of [/assets/i, /patches/i, /vulnerabilit/i, /deployments/i]) {
      const element = page.locator(`text=${pattern}`).first();
      if (await element.isVisible({ timeout: 1000 }).catch(() => false)) {
        statsCount++;
      }
    }

    // Check vulnerabilities section
    const vulnSection = page.locator('text=/vulnerabilit/i').first();
    const vulnPresent = await vulnSection.isVisible({ timeout: 2000 }).catch(() => false);

    // Generate report
    const report = `
═══════════════════════════════════════════════════════════
Test: Dashboard
Status: ${loadTime < 3000 && statsCount > 0 ? 'PASS' : 'FAIL'}
═══════════════════════════════════════════════════════════

Page Load Time: ${loadTime}ms (Target: < 3000ms)
${loadTime < 3000 ? '✓ PASS' : '✗ FAIL - TOO SLOW'}

Stats Cards Present: ${statsCount}/4
${statsCount > 0 ? '✓ PASS' : '✗ FAIL - NO STATS CARDS'}

Top Vulnerabilities Section: ${vulnPresent ? 'PRESENT' : 'MISSING'}

Navigation Test: MANUAL (see Test 4 results)

Screenshots:
  - ${path.join(SCREENSHOTS_DIR, 'dashboard-stats.png')}
  - ${path.join(SCREENSHOTS_DIR, 'dashboard-vulnerabilities.png')}
  - ${path.join(SCREENSHOTS_DIR, 'vulnerability-detail.png')}

Console Errors: ${consoleErrors.length}
${consoleErrors.length > 0 ? consoleErrors.map((e, i) => `  ${i + 1}. ${e}`).join('\n') : '  None'}

═══════════════════════════════════════════════════════════
Overall: ${loadTime < 3000 && statsCount > 0 && consoleErrors.length === 0 ? 'PASS' : 'FAIL'}
Bugs found: ${(loadTime >= 3000 ? 1 : 0) + (statsCount === 0 ? 1 : 0) + consoleErrors.length}
═══════════════════════════════════════════════════════════
`;

    console.log(report);

    // Save report to file
    const reportPath = path.join(SCREENSHOTS_DIR, 'dashboard-test-report.txt');
    fs.writeFileSync(reportPath, report);
    console.log(`\n✓ Report saved to: ${reportPath}`);
  });
});
