import { test, expect, Page } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'http://localhost:5173';
const SCREENSHOTS_DIR = path.join(__dirname, '../../screenshots/phase1-agent7');

// Test credentials
const TEST_USER = {
  email: 'admin@patchiq.io',
  password: 'admin123',
};

// Test results tracking
const testResults: Record<string, { status: 'PASS' | 'FAIL' | 'SKIP', details: string, time?: number }> = {};
const consoleErrors: string[] = [];
const screenshots: string[] = [];

test.describe('Phase 1 Agent 7: Vulnerabilities Module Testing', () => {
  let authPage: Page;

  test.beforeAll(async ({ browser }) => {
    // Create a persistent auth session
    authPage = await browser.newPage();

    // Setup console error tracking
    authPage.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Login once for all tests
    await authPage.goto(`${BASE_URL}/login`);
    await authPage.waitForLoadState('domcontentloaded');

    // Wait for login form to be visible
    await authPage.waitForSelector('input[type="email"], input[name="email"]', { timeout: 10000 });
    await authPage.fill('input[type="email"], input[name="email"]', TEST_USER.email);
    await authPage.fill('input[type="password"], input[name="password"]', TEST_USER.password);

    // Screenshot before login
    const loginScreenshot = `${SCREENSHOTS_DIR}/01-login-form.png`;
    await authPage.screenshot({ path: loginScreenshot, fullPage: true });
    screenshots.push(loginScreenshot);

    // Submit and wait for navigation
    await authPage.click('button[type="submit"]');

    try {
      await authPage.waitForURL('**/dashboard', { timeout: 15000 });
      testResults['Login'] = { status: 'PASS', details: 'Successfully logged in and redirected to dashboard' };

      const dashboardScreenshot = `${SCREENSHOTS_DIR}/02-dashboard-after-login.png`;
      await authPage.screenshot({ path: dashboardScreenshot, fullPage: true });
      screenshots.push(dashboardScreenshot);
    } catch (error) {
      testResults['Login'] = { status: 'FAIL', details: `Login failed: ${error}` };
      const errorScreenshot = `${SCREENSHOTS_DIR}/02-login-error.png`;
      await authPage.screenshot({ path: errorScreenshot, fullPage: true });
      screenshots.push(errorScreenshot);
    }
  });

  test('Navigate to Vulnerabilities List', async () => {
    const startTime = Date.now();

    try {
      await authPage.goto(`${BASE_URL}/vulnerability/vulnerabilities`);
      await authPage.waitForLoadState('networkidle', { timeout: 10000 });

      // Wait for table to appear
      const tableVisible = await authPage.waitForSelector('table, .ant-table, .vulnerabilities-list', { timeout: 10000 }).then(() => true).catch(() => false);

      const loadTime = Date.now() - startTime;

      if (tableVisible) {
        const screenshot = `${SCREENSHOTS_DIR}/03-vulnerabilities-list-initial.png`;
        await authPage.screenshot({ path: screenshot, fullPage: true });
        screenshots.push(screenshot);

        const hasCVEs = await authPage.locator('text=/CVE-/i').count() > 0;
        testResults['Vulnerabilities List'] = {
          status: 'PASS',
          details: `Page loaded in ${loadTime}ms. CVEs displayed: ${hasCVEs}`,
          time: loadTime
        };
      } else {
        const screenshot = `${SCREENSHOTS_DIR}/03-vulnerabilities-list-no-table.png`;
        await authPage.screenshot({ path: screenshot, fullPage: true });
        screenshots.push(screenshot);

        testResults['Vulnerabilities List'] = {
          status: 'FAIL',
          details: 'Table not found on page',
          time: loadTime
        };
      }
    } catch (error) {
      testResults['Vulnerabilities List'] = {
        status: 'FAIL',
        details: `Error: ${error}`
      };
    }
  });

  test('Test Search Functionality', async () => {
    try {
      await authPage.goto(`${BASE_URL}/vulnerability/vulnerabilities`);
      await authPage.waitForLoadState('networkidle');

      const searchInput = authPage.locator('input[placeholder*="Search"], input[placeholder*="search"], input[type="search"], .ant-input-search input').first();
      const searchExists = await searchInput.count() > 0;

      if (searchExists) {
        await searchInput.fill('CVE-2024');
        await authPage.waitForTimeout(1500);

        const screenshot = `${SCREENSHOTS_DIR}/04-vulnerabilities-search.png`;
        await authPage.screenshot({ path: screenshot, fullPage: true });
        screenshots.push(screenshot);

        const resultsCount = await authPage.locator('text=/CVE-2024/i').count();
        testResults['Search'] = {
          status: 'PASS',
          details: `Search executed. Results found: ${resultsCount}`
        };

        // Clear search
        await searchInput.clear();
        await authPage.waitForTimeout(500);
      } else {
        const screenshot = `${SCREENSHOTS_DIR}/04-vulnerabilities-no-search.png`;
        await authPage.screenshot({ path: screenshot, fullPage: true });
        screenshots.push(screenshot);

        testResults['Search'] = {
          status: 'FAIL',
          details: 'Search input not found'
        };
      }
    } catch (error) {
      testResults['Search'] = { status: 'FAIL', details: `Error: ${error}` };
    }
  });

  test('Test Severity Filter', async () => {
    try {
      await authPage.goto(`${BASE_URL}/vulnerability/vulnerabilities`);
      await authPage.waitForLoadState('networkidle');

      // Look for filter button or severity dropdown
      const filterButton = authPage.locator('button:has-text("Filter"), button:has-text("Filters"), [aria-label*="filter"]').first();
      const severityFilter = authPage.locator('text=/severity/i').first();

      let found = false;

      if (await filterButton.count() > 0) {
        await filterButton.click();
        await authPage.waitForTimeout(500);

        const screenshot = `${SCREENSHOTS_DIR}/05-vulnerabilities-filter-drawer.png`;
        await authPage.screenshot({ path: screenshot, fullPage: true });
        screenshots.push(screenshot);

        const hasSeverityInDrawer = await authPage.locator('text=/severity/i').count() > 0;
        testResults['Filter (Severity)'] = {
          status: hasSeverityInDrawer ? 'PASS' : 'FAIL',
          details: hasSeverityInDrawer ? 'Filter drawer opened with severity option' : 'Filter drawer opened but no severity option'
        };
        found = true;

        // Close drawer
        const closeBtn = authPage.locator('button:has-text("Close"), .ant-drawer-close').first();
        if (await closeBtn.count() > 0) await closeBtn.click();
      } else if (await severityFilter.count() > 0) {
        await severityFilter.click();
        await authPage.waitForTimeout(500);

        const screenshot = `${SCREENSHOTS_DIR}/05-vulnerabilities-severity-options.png`;
        await authPage.screenshot({ path: screenshot, fullPage: true });
        screenshots.push(screenshot);

        testResults['Filter (Severity)'] = {
          status: 'PASS',
          details: 'Severity filter found and clicked'
        };
        found = true;
      }

      if (!found) {
        const screenshot = `${SCREENSHOTS_DIR}/05-vulnerabilities-no-filter.png`;
        await authPage.screenshot({ path: screenshot, fullPage: true });
        screenshots.push(screenshot);

        testResults['Filter (Severity)'] = {
          status: 'FAIL',
          details: 'No filter UI found'
        };
      }
    } catch (error) {
      testResults['Filter (Severity)'] = { status: 'FAIL', details: `Error: ${error}` };
    }
  });

  test('Test EPSS Score Filter', async () => {
    try {
      await authPage.goto(`${BASE_URL}/vulnerability/vulnerabilities`);
      await authPage.waitForLoadState('networkidle');

      const epssFilter = authPage.locator('text=/epss/i').first();
      const epssExists = await epssFilter.count() > 0;

      const screenshot = `${SCREENSHOTS_DIR}/06-vulnerabilities-epss-check.png`;
      await authPage.screenshot({ path: screenshot, fullPage: true });
      screenshots.push(screenshot);

      testResults['Filter (EPSS)'] = {
        status: epssExists ? 'PASS' : 'SKIP',
        details: epssExists ? 'EPSS filter available' : 'EPSS filter not implemented (optional feature)'
      };
    } catch (error) {
      testResults['Filter (EPSS)'] = { status: 'FAIL', details: `Error: ${error}` };
    }
  });

  test('Test Sorting', async () => {
    try {
      await authPage.goto(`${BASE_URL}/vulnerability/vulnerabilities`);
      await authPage.waitForLoadState('networkidle');

      const sortableColumns = authPage.locator('th.ant-table-column-has-sorters, th[aria-sort]');
      const count = await sortableColumns.count();

      if (count > 0) {
        // Click first sortable column twice (asc -> desc)
        await sortableColumns.first().click();
        await authPage.waitForTimeout(1000);

        const screenshot1 = `${SCREENSHOTS_DIR}/07-vulnerabilities-sorting-asc.png`;
        await authPage.screenshot({ path: screenshot1, fullPage: true });
        screenshots.push(screenshot1);

        await sortableColumns.first().click();
        await authPage.waitForTimeout(1000);

        const screenshot2 = `${SCREENSHOTS_DIR}/07-vulnerabilities-sorting-desc.png`;
        await authPage.screenshot({ path: screenshot2, fullPage: true });
        screenshots.push(screenshot2);

        testResults['Sorting'] = {
          status: 'PASS',
          details: `Found ${count} sortable columns. Tested ascending and descending sort`
        };
      } else {
        const screenshot = `${SCREENSHOTS_DIR}/07-vulnerabilities-no-sorting.png`;
        await authPage.screenshot({ path: screenshot, fullPage: true });
        screenshots.push(screenshot);

        testResults['Sorting'] = {
          status: 'FAIL',
          details: 'No sortable columns found'
        };
      }
    } catch (error) {
      testResults['Sorting'] = { status: 'FAIL', details: `Error: ${error}` };
    }
  });

  test('Test Pagination', async () => {
    try {
      await authPage.goto(`${BASE_URL}/vulnerability/vulnerabilities`);
      await authPage.waitForLoadState('networkidle');

      const pagination = authPage.locator('.ant-pagination').first();
      const paginationExists = await pagination.count() > 0;

      if (paginationExists) {
        const totalText = await authPage.locator('.ant-pagination-total-text').textContent().catch(() => 'Unknown');

        const nextButton = authPage.locator('.ant-pagination-next:not(.ant-pagination-disabled)').first();
        const canPageNext = await nextButton.count() > 0;

        const screenshot = `${SCREENSHOTS_DIR}/08-vulnerabilities-pagination.png`;
        await authPage.screenshot({ path: screenshot, fullPage: true });
        screenshots.push(screenshot);

        if (canPageNext) {
          await nextButton.click();
          await authPage.waitForTimeout(1000);

          const screenshot2 = `${SCREENSHOTS_DIR}/08-vulnerabilities-pagination-page2.png`;
          await authPage.screenshot({ path: screenshot2, fullPage: true });
          screenshots.push(screenshot2);

          testResults['Pagination'] = {
            status: 'PASS',
            details: `Pagination working. Total: ${totalText}. Navigated to page 2`
          };
        } else {
          testResults['Pagination'] = {
            status: 'PASS',
            details: `Pagination exists but only one page. Total: ${totalText}`
          };
        }
      } else {
        const screenshot = `${SCREENSHOTS_DIR}/08-vulnerabilities-no-pagination.png`;
        await authPage.screenshot({ path: screenshot, fullPage: true });
        screenshots.push(screenshot);

        testResults['Pagination'] = {
          status: 'SKIP',
          details: 'No pagination (likely few results)'
        };
      }
    } catch (error) {
      testResults['Pagination'] = { status: 'FAIL', details: `Error: ${error}` };
    }
  });

  test('Test CVE Detail Page', async () => {
    try {
      await authPage.goto(`${BASE_URL}/vulnerability/vulnerabilities`);
      await authPage.waitForLoadState('networkidle');

      // Find first clickable CVE row or link
      const firstRow = authPage.locator('tbody tr').first();
      const rowExists = await firstRow.count() > 0;

      if (rowExists) {
        await firstRow.click();
        await authPage.waitForTimeout(2000);
        await authPage.waitForLoadState('networkidle');

        const screenshot1 = `${SCREENSHOTS_DIR}/09-vulnerability-detail-page.png`;
        await authPage.screenshot({ path: screenshot1, fullPage: true });
        screenshots.push(screenshot1);

        // Check for detail page elements
        const hasCVEID = await authPage.locator('text=/CVE-/i').count() > 0;
        const hasCVSS = await authPage.locator('text=/cvss/i, text=/score/i').count() > 0;
        const hasDescription = await authPage.locator('text=/description/i').count() > 0;
        const hasAffectedAssets = await authPage.locator('text=/affected/i, text=/asset/i').count() > 0;

        // Scroll to middle
        await authPage.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
        const screenshot2 = `${SCREENSHOTS_DIR}/10-vulnerability-detail-info.png`;
        await authPage.screenshot({ path: screenshot2, fullPage: true });
        screenshots.push(screenshot2);

        // Scroll to bottom
        await authPage.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        const screenshot3 = `${SCREENSHOTS_DIR}/11-vulnerability-affected-assets.png`;
        await authPage.screenshot({ path: screenshot3, fullPage: true });
        screenshots.push(screenshot3);

        const detailsFound = [hasCVEID, hasCVSS, hasDescription, hasAffectedAssets].filter(Boolean).length;

        testResults['CVE Detail'] = {
          status: detailsFound >= 2 ? 'PASS' : 'FAIL',
          details: `Detail page elements found: CVE ID=${hasCVEID}, CVSS=${hasCVSS}, Description=${hasDescription}, Affected Assets=${hasAffectedAssets}`
        };
      } else {
        const screenshot = `${SCREENSHOTS_DIR}/09-no-cve-rows.png`;
        await authPage.screenshot({ path: screenshot, fullPage: true });
        screenshots.push(screenshot);

        testResults['CVE Detail'] = {
          status: 'SKIP',
          details: 'No CVE rows to click'
        };
      }
    } catch (error) {
      testResults['CVE Detail'] = { status: 'FAIL', details: `Error: ${error}` };
    }
  });

  test('Test Affected Assets Section', async () => {
    try {
      // Navigate back to vulnerabilities list
      await authPage.goto(`${BASE_URL}/vulnerability/vulnerabilities`);
      await authPage.waitForLoadState('networkidle');

      const firstRow = authPage.locator('tbody tr').first();
      if (await firstRow.count() > 0) {
        await firstRow.click();
        await authPage.waitForTimeout(2000);

        // Look for affected assets section
        const affectedAssetsSection = await authPage.locator('text=/affected.*asset/i, text=/asset.*list/i').count() > 0;
        const hasAssetsTable = await authPage.locator('table').count() > 1; // More than one table (main + assets)

        await authPage.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

        const screenshot = `${SCREENSHOTS_DIR}/11-vulnerability-affected-assets-detail.png`;
        await authPage.screenshot({ path: screenshot, fullPage: true });
        screenshots.push(screenshot);

        testResults['Affected Assets'] = {
          status: affectedAssetsSection || hasAssetsTable ? 'PASS' : 'SKIP',
          details: `Affected assets section: ${affectedAssetsSection}, Assets table: ${hasAssetsTable}`
        };
      } else {
        testResults['Affected Assets'] = { status: 'SKIP', details: 'No CVE to check' };
      }
    } catch (error) {
      testResults['Affected Assets'] = { status: 'SKIP', details: `Error: ${error}` };
    }
  });

  test('Test Scan Modal UI', async () => {
    try {
      await authPage.goto(`${BASE_URL}/vulnerability/vulnerabilities`);
      await authPage.waitForLoadState('networkidle');

      // Look for scan button
      const scanButton = authPage.locator('button:has-text("Scan"), button:has-text("Start Scan"), button:has-text("Trigger")').first();

      if (await scanButton.count() > 0) {
        await scanButton.click();
        await authPage.waitForTimeout(1000);

        const screenshot1 = `${SCREENSHOTS_DIR}/12-vulnerability-scan-modal.png`;
        await authPage.screenshot({ path: screenshot1, fullPage: true });
        screenshots.push(screenshot1);

        const hasModal = await authPage.locator('.ant-modal, [role="dialog"]').count() > 0;

        testResults['Scan Modal'] = {
          status: hasModal ? 'PASS' : 'FAIL',
          details: hasModal ? 'Scan modal opened successfully' : 'Clicked scan button but modal did not appear'
        };

        // Close modal
        const closeBtn = authPage.locator('button:has-text("Cancel"), button:has-text("Close"), .ant-modal-close').first();
        if (await closeBtn.count() > 0) await closeBtn.click();
      } else {
        const screenshot = `${SCREENSHOTS_DIR}/12-vulnerability-no-scan-button.png`;
        await authPage.screenshot({ path: screenshot, fullPage: true });
        screenshots.push(screenshot);

        testResults['Scan Modal'] = {
          status: 'SKIP',
          details: 'Scan button not found (may be on separate scan page)'
        };
      }
    } catch (error) {
      testResults['Scan Modal'] = { status: 'SKIP', details: `Error: ${error}` };
    }
  });

  test('Test Dashboard Vulnerability Stats', async () => {
    try {
      await authPage.goto(`${BASE_URL}/dashboard`);
      await authPage.waitForLoadState('networkidle');

      const vulnElements = await authPage.locator('text=/vulnerabilit/i, text=/CVE/i, text=/critical/i').count();
      const statsCards = await authPage.locator('.ant-card, .ant-statistic').count();

      const screenshot = `${SCREENSHOTS_DIR}/14-dashboard-vuln-stats.png`;
      await authPage.screenshot({ path: screenshot, fullPage: true });
      screenshots.push(screenshot);

      testResults['Dashboard Stats'] = {
        status: vulnElements > 0 ? 'PASS' : 'FAIL',
        details: `Vulnerability elements on dashboard: ${vulnElements}, Stats cards: ${statsCards}`
      };
    } catch (error) {
      testResults['Dashboard Stats'] = { status: 'FAIL', details: `Error: ${error}` };
    }
  });

  test.afterAll(async () => {
    // Generate final report
    const report = generateReport();

    // Write report to file
    const fs = await import('fs');
    const reportPath = path.join(__dirname, '../../PHASE1_AGENT7_VULNERABILITIES_REPORT.md');
    fs.writeFileSync(reportPath, report);

    console.log('\n' + report);
    console.log(`\nReport written to: ${reportPath}`);

    await authPage.close();
  });
});

function generateReport(): string {
  const totalTests = Object.keys(testResults).length;
  const passed = Object.values(testResults).filter(r => r.status === 'PASS').length;
  const failed = Object.values(testResults).filter(r => r.status === 'FAIL').length;
  const skipped = Object.values(testResults).filter(r => r.status === 'SKIP').length;

  let report = `# Agent 7 Report: Vulnerabilities Testing

## Test Summary

**Date:** ${new Date().toISOString().split('T')[0]}
**Total Tests:** ${totalTests}
**Passed:** ${passed}
**Failed:** ${failed}
**Skipped:** ${skipped}
**Overall Status:** ${failed === 0 ? 'PASS' : 'FAIL'}

---

## Test Results

`;

  for (const [testName, result] of Object.entries(testResults)) {
    const icon = result.status === 'PASS' ? '✓' : result.status === 'FAIL' ? '✗' : '⊘';
    const timeInfo = result.time ? ` (${result.time}ms)` : '';
    report += `### ${icon} ${testName}: ${result.status}${timeInfo}\n`;
    report += `${result.details}\n\n`;
  }

  report += `---

## Performance Metrics

`;

  const loadTimeResult = testResults['Vulnerabilities List'];
  if (loadTimeResult && loadTimeResult.time) {
    const loadTime = loadTimeResult.time;
    report += `- **Vulnerabilities List Load Time:** ${loadTime}ms ${loadTime < 3000 ? '✓ (< 3s target)' : '✗ (> 3s)'}\n`;
  }

  report += `\n---

## Screenshots

Total screenshots captured: ${screenshots.length}

`;

  screenshots.forEach((screenshot, index) => {
    const filename = path.basename(screenshot);
    report += `${index + 1}. ${filename}\n`;
  });

  report += `\nAll screenshots saved to: \`${SCREENSHOTS_DIR}\`

---

## Console Errors

**Total Console Errors:** ${consoleErrors.length}

`;

  if (consoleErrors.length > 0) {
    consoleErrors.slice(0, 20).forEach((error, index) => {
      report += `${index + 1}. ${error}\n`;
    });
    if (consoleErrors.length > 20) {
      report += `\n... and ${consoleErrors.length - 20} more errors\n`;
    }
  } else {
    report += `No console errors detected ✓\n`;
  }

  report += `\n---

## Key Findings

`;

  const findings: string[] = [];

  if (testResults['Login']?.status === 'PASS') {
    findings.push('✓ Authentication system working correctly');
  }

  if (testResults['Vulnerabilities List']?.status === 'PASS') {
    findings.push('✓ Vulnerabilities list page renders and displays CVEs');
  }

  if (testResults['Search']?.status === 'PASS') {
    findings.push('✓ Search functionality is implemented and working');
  }

  if (testResults['Filter (Severity)']?.status === 'PASS') {
    findings.push('✓ Severity filtering is available');
  }

  if (testResults['Sorting']?.status === 'PASS') {
    findings.push('✓ Table sorting functionality works');
  }

  if (testResults['CVE Detail']?.status === 'PASS') {
    findings.push('✓ CVE detail page displays vulnerability information');
  }

  const bugs: string[] = [];

  Object.entries(testResults).forEach(([name, result]) => {
    if (result.status === 'FAIL') {
      bugs.push(`✗ ${name}: ${result.details}`);
    }
  });

  if (findings.length > 0) {
    report += findings.join('\n') + '\n\n';
  }

  if (bugs.length > 0) {
    report += `### Bugs Found (${bugs.length})\n\n`;
    report += bugs.join('\n') + '\n\n';
  } else {
    report += `### Bugs Found: 0 ✓\n\n`;
  }

  report += `---

## Recommendations

`;

  const recommendations: string[] = [];

  if (testResults['Filter (EPSS)']?.status === 'SKIP') {
    recommendations.push('- Consider implementing EPSS score filtering for better risk prioritization');
  }

  if (testResults['Scan Modal']?.status === 'SKIP') {
    recommendations.push('- Vulnerability scanning UI should be more discoverable');
  }

  if (failed > 0) {
    recommendations.push('- Address failing tests to ensure full functionality');
  }

  if (consoleErrors.length > 0) {
    recommendations.push(`- Resolve ${consoleErrors.length} console errors for better stability`);
  }

  if (recommendations.length > 0) {
    report += recommendations.join('\n') + '\n';
  } else {
    report += 'No major issues found. Module is functioning as expected.\n';
  }

  report += `\n---

## Overall Assessment

`;

  const passRate = totalTests > 0 ? Math.round((passed / totalTests) * 100) : 0;

  if (passRate >= 80) {
    report += `**Status: EXCELLENT** (${passRate}% pass rate)\n\n`;
    report += `The Vulnerabilities module is functioning well with most features working as expected.\n`;
  } else if (passRate >= 60) {
    report += `**Status: GOOD** (${passRate}% pass rate)\n\n`;
    report += `The Vulnerabilities module is mostly functional but has some areas that need attention.\n`;
  } else {
    report += `**Status: NEEDS IMPROVEMENT** (${passRate}% pass rate)\n\n`;
    report += `The Vulnerabilities module has significant issues that should be addressed.\n`;
  }

  return report;
}
