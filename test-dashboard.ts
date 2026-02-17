import { chromium, Browser, Page, ConsoleMessage } from 'playwright';
import { writeFileSync } from 'fs';
import { join } from 'path';

interface TestResults {
  testName: string;
  status: 'PASS' | 'FAIL';
  pageLoadTime: number;
  statsCardsPresent: number;
  topVulnerabilitiesPresent: boolean;
  navigationTest: 'PASS' | 'FAIL' | 'SKIPPED';
  screenshots: string[];
  consoleErrors: string[];
  bugsFound: number;
  details: string[];
}

const SCREENSHOTS_DIR = '/Users/shandesh/src/VS-code/PatchIQ/full-dev-sandy-v2/screenshots';
const BASE_URL = 'http://localhost:5173';
const LOGIN_URL = `${BASE_URL}/login`;
const DASHBOARD_URL = `${BASE_URL}/dashboard`;

async function runDashboardTest(): Promise<TestResults> {
  const results: TestResults = {
    testName: 'Dashboard',
    status: 'PASS',
    pageLoadTime: 0,
    statsCardsPresent: 0,
    topVulnerabilitiesPresent: false,
    navigationTest: 'SKIPPED',
    screenshots: [],
    consoleErrors: [],
    bugsFound: 0,
    details: []
  };

  let browser: Browser | null = null;
  let page: Page | null = null;

  try {
    // Launch browser
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 }
    });
    page = await context.newPage();

    // Collect console errors
    page.on('console', (msg: ConsoleMessage) => {
      if (msg.type() === 'error') {
        results.consoleErrors.push(msg.text());
      }
    });

    // Listen for page errors
    page.on('pageerror', (err: Error) => {
      results.consoleErrors.push(`Page Error: ${err.message}`);
    });

    // Step 1: Login
    results.details.push('Step 1: Logging in...');
    await page.goto(LOGIN_URL, { waitUntil: 'networkidle' });

    // Fill login form
    await page.fill('input[type="email"], input[name="email"]', 'admin@patchiq.io');
    await page.fill('input[type="password"], input[name="password"]', 'admin123');

    // Click submit button
    await page.click('button[type="submit"]');

    // Wait for navigation to complete
    await page.waitForURL(/.*dashboard.*/, { timeout: 10000 });
    results.details.push('✓ Login successful');

    // Step 2: Test Dashboard Load
    results.details.push('Step 2: Testing dashboard load...');
    const startTime = Date.now();

    await page.goto(DASHBOARD_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 10000 });

    const endTime = Date.now();
    results.pageLoadTime = endTime - startTime;

    if (results.pageLoadTime < 3000) {
      results.details.push(`✓ Page load time: ${results.pageLoadTime}ms (< 3000ms)`);
    } else {
      results.details.push(`✗ Page load time: ${results.pageLoadTime}ms (>= 3000ms) - SLOW!`);
      results.status = 'FAIL';
      results.bugsFound++;
    }

    // Wait a bit for content to render
    await page.waitForTimeout(2000);

    // Step 3: Verify Stats Cards
    results.details.push('Step 3: Verifying stats cards...');

    const statsCardSelectors = [
      'text=/Assets/i',
      'text=/Patches/i',
      'text=/Vulnerabilities/i',
      'text=/Deployments/i'
    ];

    for (const selector of statsCardSelectors) {
      try {
        const element = await page.locator(selector).first();
        if (await element.isVisible({ timeout: 2000 })) {
          results.statsCardsPresent++;
          results.details.push(`✓ Found stats card: ${selector}`);
        }
      } catch (err) {
        results.details.push(`✗ Missing stats card: ${selector}`);
      }
    }

    if (results.statsCardsPresent === 0) {
      results.details.push('✗ No stats cards found - possible rendering issue');
      results.status = 'FAIL';
      results.bugsFound++;
    } else {
      results.details.push(`✓ Found ${results.statsCardsPresent}/4 stats cards`);
    }

    // Take screenshot of dashboard stats
    const statsScreenshot = join(SCREENSHOTS_DIR, 'dashboard-stats.png');
    await page.screenshot({ path: statsScreenshot, fullPage: true });
    results.screenshots.push(statsScreenshot);
    results.details.push(`✓ Screenshot saved: ${statsScreenshot}`);

    // Step 4: Verify Top Vulnerabilities
    results.details.push('Step 4: Verifying top vulnerabilities section...');

    try {
      const topVulnSection = page.locator('text=/Top Vulnerabilities/i, text=/Recent Vulnerabilities/i, text=/Critical Vulnerabilities/i').first();
      if (await topVulnSection.isVisible({ timeout: 2000 })) {
        results.topVulnerabilitiesPresent = true;
        results.details.push('✓ Top vulnerabilities section found');
      }
    } catch (err) {
      results.details.push('✗ Top vulnerabilities section not found');
    }

    // Take screenshot of vulnerabilities section
    const vulnScreenshot = join(SCREENSHOTS_DIR, 'dashboard-vulnerabilities.png');
    await page.screenshot({ path: vulnScreenshot, fullPage: true });
    results.screenshots.push(vulnScreenshot);
    results.details.push(`✓ Screenshot saved: ${vulnScreenshot}`);

    // Step 5: Test Interaction (navigate to vulnerability detail)
    results.details.push('Step 5: Testing navigation to vulnerability detail...');

    if (results.topVulnerabilitiesPresent) {
      try {
        // Look for clickable vulnerability items
        const vulnItems = page.locator('table tbody tr, .vulnerability-item, [class*="vuln"], a[href*="vulnerabilit"]');
        const count = await vulnItems.count();

        if (count > 0) {
          results.details.push(`Found ${count} vulnerability items`);

          // Click first vulnerability
          await vulnItems.first().click({ timeout: 5000 });
          await page.waitForLoadState('networkidle', { timeout: 5000 });

          // Check if we navigated away from dashboard
          const currentUrl = page.url();
          if (currentUrl !== DASHBOARD_URL && !currentUrl.endsWith('/dashboard')) {
            results.navigationTest = 'PASS';
            results.details.push(`✓ Navigation successful to: ${currentUrl}`);

            // Take screenshot of detail page
            const detailScreenshot = join(SCREENSHOTS_DIR, 'vulnerability-detail.png');
            await page.screenshot({ path: detailScreenshot, fullPage: true });
            results.screenshots.push(detailScreenshot);
            results.details.push(`✓ Screenshot saved: ${detailScreenshot}`);

            // Navigate back
            await page.goBack();
            await page.waitForLoadState('networkidle');
            results.details.push('✓ Navigated back to dashboard');
          } else {
            results.navigationTest = 'FAIL';
            results.details.push('✗ Navigation did not occur - still on dashboard');
            results.bugsFound++;
          }
        } else {
          results.navigationTest = 'SKIPPED';
          results.details.push('⊘ No vulnerability items found to click');
        }
      } catch (err) {
        results.navigationTest = 'FAIL';
        results.details.push(`✗ Navigation test failed: ${err}`);
        results.bugsFound++;
      }
    } else {
      results.navigationTest = 'SKIPPED';
      results.details.push('⊘ Navigation test skipped - no vulnerabilities section');
    }

    // Step 6: Console Errors Check
    results.details.push(`Step 6: Console errors check - found ${results.consoleErrors.length} errors`);
    if (results.consoleErrors.length > 0) {
      results.details.push('✗ Console errors detected:');
      results.consoleErrors.forEach((err, idx) => {
        results.details.push(`  ${idx + 1}. ${err}`);
      });
      results.bugsFound += results.consoleErrors.length;
      results.status = 'FAIL';
    } else {
      results.details.push('✓ No console errors detected');
    }

  } catch (error) {
    results.status = 'FAIL';
    results.details.push(`✗ Test failed with error: ${error}`);
    results.bugsFound++;
  } finally {
    if (page) await page.close();
    if (browser) await browser.close();
  }

  return results;
}

function formatReport(results: TestResults): string {
  const report = `
═══════════════════════════════════════════════════════════
Test: ${results.testName}
Status: ${results.status}
═══════════════════════════════════════════════════════════

Performance:
  Page Load Time: ${results.pageLoadTime}ms (Target: < 3000ms)
  ${results.pageLoadTime < 3000 ? '✓ PASS' : '✗ FAIL - TOO SLOW'}

UI Elements:
  Stats Cards Present: ${results.statsCardsPresent}/4
  Top Vulnerabilities Section: ${results.topVulnerabilitiesPresent ? 'PRESENT' : 'MISSING'}
  Navigation Test: ${results.navigationTest}

Screenshots:
${results.screenshots.map(s => `  - ${s}`).join('\n')}

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
  return report;
}

// Run the test
(async () => {
  console.log('Starting Dashboard Test...\n');
  const results = await runDashboardTest();
  const report = formatReport(results);

  console.log(report);

  // Save report to file
  const reportPath = join(SCREENSHOTS_DIR, 'dashboard-test-report.txt');
  writeFileSync(reportPath, report);
  console.log(`\nReport saved to: ${reportPath}`);

  // Exit with appropriate code
  process.exit(results.status === 'PASS' ? 0 : 1);
})();
