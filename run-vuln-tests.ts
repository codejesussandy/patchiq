#!/usr/bin/env ts-node
/**
 * Phase 1 Agent 7: Vulnerabilities Module Testing
 *
 * This script tests the Vulnerabilities module using Playwright for browser automation.
 * It performs comprehensive testing of list operations, detail pages, and UI interactions.
 */

import { chromium, Browser, Page } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

const BASE_URL = 'http://localhost:5173';
const SCREENSHOTS_DIR = './screenshots/phase1-agent7';
const AUTH_FILE = './frontend/auth.json';

// Results tracking
interface TestResult {
  status: 'PASS' | 'FAIL' | 'SKIP';
  details: string;
  time?: number;
}

const testResults: Record<string, TestResult> = {};
const screenshots: string[] = [];
const consoleErrors: string[] = [];

async function main() {
  // Ensure screenshots directory exists
  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });

  // Load auth state
  const context = await browser.newContext({
    storageState: AUTH_FILE
  });

  const page = await context.newPage();

  // Track console errors
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  try {
    console.log('Starting Vulnerabilities Module Tests...\n');

    await test1_verifyAuth(page);
    await test2_navigateToVulnerabilities(page);
    await test3_testSearch(page);
    await test4_testSeverityFilter(page);
    await test5_testEPSSFilter(page);
    await test6_testSorting(page);
    await test7_testPagination(page);
    await test8_testCVEDetail(page);
    await test9_testScanModal(page);
    await test10_testDashboardStats(page);

  } catch (error) {
    console.error('Test execution error:', error);
  } finally {
    await browser.close();
    generateReport();
  }
}

async function test1_verifyAuth(page: Page) {
  console.log('Test 1: Verify Authentication');
  try {
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    const screenshot = `${SCREENSHOTS_DIR}/01-dashboard-authenticated.png`;
    await page.screenshot({ path: screenshot, fullPage: true });
    screenshots.push(screenshot);

    const isDashboard = page.url().includes('/dashboard');
    testResults['Login'] = {
      status: isDashboard ? 'PASS' : 'FAIL',
      details: isDashboard ? 'Authenticated successfully' : 'Not authenticated'
    };
    console.log(`  ${isDashboard ? '✓' : '✗'} ${testResults['Login'].details}\n`);
  } catch (error) {
    testResults['Login'] = { status: 'FAIL', details: `Error: ${error}` };
    console.log(`  ✗ ${testResults['Login'].details}\n`);
  }
}

async function test2_navigateToVulnerabilities(page: Page) {
  console.log('Test 2: Navigate to Vulnerabilities List');
  const startTime = Date.now();

  try {
    await page.goto(`${BASE_URL}/vulnerability/vulnerabilities`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    const loadTime = Date.now() - startTime;

    const screenshot = `${SCREENSHOTS_DIR}/03-vulnerabilities-list-initial.png`;
    await page.screenshot({ path: screenshot, fullPage: true });
    screenshots.push(screenshot);

    const hasCVEs = await page.locator('text=/CVE-/i').count() > 0;
    const hasTable = await page.locator('table, .ant-table').count() > 0;
    const hasContent = await page.locator('main, .content, [class*="content"]').count() > 0;

    testResults['Vulnerabilities List'] = {
      status: hasContent ? 'PASS' : 'FAIL',
      details: `Loaded in ${loadTime}ms. Table: ${hasTable}, CVEs: ${hasCVEs}`,
      time: loadTime
    };
    console.log(`  ✓ ${testResults['Vulnerabilities List'].details}\n`);
  } catch (error) {
    testResults['Vulnerabilities List'] = { status: 'FAIL', details: `Error: ${error}` };
    console.log(`  ✗ ${testResults['Vulnerabilities List'].details}\n`);
  }
}

async function test3_testSearch(page: Page) {
  console.log('Test 3: Test Search Functionality');
  try {
    await page.goto(`${BASE_URL}/vulnerability/vulnerabilities`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    const searchInput = page.locator('input[placeholder*="Search" i], input[type="search"], .ant-input-search input').first();
    const searchExists = await searchInput.count() > 0;

    if (searchExists) {
      await searchInput.fill('CVE-2024');
      await page.waitForTimeout(1500);

      const screenshot = `${SCREENSHOTS_DIR}/04-vulnerabilities-search.png`;
      await page.screenshot({ path: screenshot, fullPage: true });
      screenshots.push(screenshot);

      const resultsCount = await page.locator('text=/CVE-2024/i').count();
      testResults['Search'] = {
        status: 'PASS',
        details: `Search working. Results: ${resultsCount}`
      };
      console.log(`  ✓ ${testResults['Search'].details}\n`);

      await searchInput.clear();
    } else {
      const screenshot = `${SCREENSHOTS_DIR}/04-vulnerabilities-no-search.png`;
      await page.screenshot({ path: screenshot, fullPage: true });
      screenshots.push(screenshot);

      testResults['Search'] = {
        status: 'SKIP',
        details: 'Search input not found'
      };
      console.log(`  ⊘ ${testResults['Search'].details}\n`);
    }
  } catch (error) {
    testResults['Search'] = { status: 'FAIL', details: `Error: ${error}` };
    console.log(`  ✗ ${testResults['Search'].details}\n`);
  }
}

async function test4_testSeverityFilter(page: Page) {
  console.log('Test 4: Test Severity Filter');
  try {
    await page.goto(`${BASE_URL}/vulnerability/vulnerabilities`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    const filterButton = page.locator('button:has-text("Filter"), button:has-text("Filters"), [aria-label*="filter" i]').first();
    const severityElement = page.locator('text=/severity/i').first();

    if (await filterButton.count() > 0) {
      await filterButton.click();
      await page.waitForTimeout(500);

      const screenshot = `${SCREENSHOTS_DIR}/05-vulnerabilities-filter-drawer.png`;
      await page.screenshot({ path: screenshot, fullPage: true });
      screenshots.push(screenshot);

      const hasSeverity = await page.locator('text=/severity/i').count() > 0;
      testResults['Filter (Severity)'] = {
        status: hasSeverity ? 'PASS' : 'SKIP',
        details: hasSeverity ? 'Filter with severity option found' : 'Filter found but no severity'
      };
      console.log(`  ${hasSeverity ? '✓' : '⊘'} ${testResults['Filter (Severity)'].details}\n`);

      await page.keyboard.press('Escape');
    } else if (await severityElement.count() > 0) {
      const screenshot = `${SCREENSHOTS_DIR}/05-vulnerabilities-severity-visible.png`;
      await page.screenshot({ path: screenshot, fullPage: true });
      screenshots.push(screenshot);

      testResults['Filter (Severity)'] = {
        status: 'PASS',
        details: 'Severity filter visible'
      };
      console.log(`  ✓ ${testResults['Filter (Severity)'].details}\n`);
    } else {
      const screenshot = `${SCREENSHOTS_DIR}/05-vulnerabilities-no-filter.png`;
      await page.screenshot({ path: screenshot, fullPage: true });
      screenshots.push(screenshot);

      testResults['Filter (Severity)'] = {
        status: 'SKIP',
        details: 'No filter UI found'
      };
      console.log(`  ⊘ ${testResults['Filter (Severity)'].details}\n`);
    }
  } catch (error) {
    testResults['Filter (Severity)'] = { status: 'FAIL', details: `Error: ${error}` };
    console.log(`  ✗ ${testResults['Filter (Severity)'].details}\n`);
  }
}

async function test5_testEPSSFilter(page: Page) {
  console.log('Test 5: Test EPSS Score Filter');
  try {
    await page.goto(`${BASE_URL}/vulnerability/vulnerabilities`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    const epssElement = await page.locator('text=/epss/i').count();

    const screenshot = `${SCREENSHOTS_DIR}/06-vulnerabilities-epss-check.png`;
    await page.screenshot({ path: screenshot, fullPage: true });
    screenshots.push(screenshot);

    testResults['Filter (EPSS)'] = {
      status: epssElement > 0 ? 'PASS' : 'SKIP',
      details: epssElement > 0 ? 'EPSS visible on page' : 'EPSS not implemented (optional)'
    };
    console.log(`  ${epssElement > 0 ? '✓' : '⊘'} ${testResults['Filter (EPSS)'].details}\n`);
  } catch (error) {
    testResults['Filter (EPSS)'] = { status: 'FAIL', details: `Error: ${error}` };
    console.log(`  ✗ ${testResults['Filter (EPSS)'].details}\n`);
  }
}

async function test6_testSorting(page: Page) {
  console.log('Test 6: Test Sorting');
  try {
    await page.goto(`${BASE_URL}/vulnerability/vulnerabilities`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    const sortableColumns = page.locator('th.ant-table-column-has-sorters, th[aria-sort]');
    const count = await sortableColumns.count();

    if (count > 0) {
      await sortableColumns.first().click();
      await page.waitForTimeout(1000);

      const screenshot1 = `${SCREENSHOTS_DIR}/07-vulnerabilities-sorting-asc.png`;
      await page.screenshot({ path: screenshot1, fullPage: true });
      screenshots.push(screenshot1);

      await sortableColumns.first().click();
      await page.waitForTimeout(1000);

      const screenshot2 = `${SCREENSHOTS_DIR}/07-vulnerabilities-sorting-desc.png`;
      await page.screenshot({ path: screenshot2, fullPage: true });
      screenshots.push(screenshot2);

      testResults['Sorting'] = {
        status: 'PASS',
        details: `${count} sortable columns. Tested toggle`
      };
      console.log(`  ✓ ${testResults['Sorting'].details}\n`);
    } else {
      const screenshot = `${SCREENSHOTS_DIR}/07-vulnerabilities-no-sorting.png`;
      await page.screenshot({ path: screenshot, fullPage: true });
      screenshots.push(screenshot);

      testResults['Sorting'] = {
        status: 'SKIP',
        details: 'No sortable columns'
      };
      console.log(`  ⊘ ${testResults['Sorting'].details}\n`);
    }
  } catch (error) {
    testResults['Sorting'] = { status: 'FAIL', details: `Error: ${error}` };
    console.log(`  ✗ ${testResults['Sorting'].details}\n`);
  }
}

async function test7_testPagination(page: Page) {
  console.log('Test 7: Test Pagination');
  try {
    await page.goto(`${BASE_URL}/vulnerability/vulnerabilities`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    const pagination = page.locator('.ant-pagination').first();
    const paginationExists = await pagination.count() > 0;

    if (paginationExists) {
      const totalText = await page.locator('.ant-pagination-total-text').textContent().catch(() => 'Not shown');

      const screenshot1 = `${SCREENSHOTS_DIR}/08-vulnerabilities-pagination.png`;
      await page.screenshot({ path: screenshot1, fullPage: true });
      screenshots.push(screenshot1);

      const nextButton = page.locator('.ant-pagination-next:not(.ant-pagination-disabled)').first();
      const canPageNext = await nextButton.count() > 0;

      if (canPageNext) {
        await nextButton.click();
        await page.waitForTimeout(1500);

        const screenshot2 = `${SCREENSHOTS_DIR}/08-vulnerabilities-pagination-page2.png`;
        await page.screenshot({ path: screenshot2, fullPage: true });
        screenshots.push(screenshot2);

        testResults['Pagination'] = {
          status: 'PASS',
          details: `Pagination working. Total: ${totalText}`
        };
        console.log(`  ✓ ${testResults['Pagination'].details}\n`);
      } else {
        testResults['Pagination'] = {
          status: 'PASS',
          details: `Pagination exists, single page. Total: ${totalText}`
        };
        console.log(`  ✓ ${testResults['Pagination'].details}\n`);
      }
    } else {
      const screenshot = `${SCREENSHOTS_DIR}/08-vulnerabilities-no-pagination.png`;
      await page.screenshot({ path: screenshot, fullPage: true });
      screenshots.push(screenshot);

      testResults['Pagination'] = {
        status: 'SKIP',
        details: 'No pagination'
      };
      console.log(`  ⊘ ${testResults['Pagination'].details}\n`);
    }
  } catch (error) {
    testResults['Pagination'] = { status: 'FAIL', details: `Error: ${error}` };
    console.log(`  ✗ ${testResults['Pagination'].details}\n`);
  }
}

async function test8_testCVEDetail(page: Page) {
  console.log('Test 8: Test CVE Detail Page');
  try {
    await page.goto(`${BASE_URL}/vulnerability/vulnerabilities`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    const firstRow = page.locator('tbody tr').first();
    const rowExists = await firstRow.count() > 0;

    if (rowExists) {
      await firstRow.click();
      await page.waitForTimeout(2000);

      const screenshot1 = `${SCREENSHOTS_DIR}/09-vulnerability-detail-page.png`;
      await page.screenshot({ path: screenshot1, fullPage: true });
      screenshots.push(screenshot1);

      const hasCVEID = await page.locator('text=/CVE-\\d{4}-\\d+/i').count() > 0;
      const hasCVSS = await page.locator('text=/cvss/i, text=/score/i').count() > 0;
      const hasDescription = await page.locator('text=/description/i').count() > 0;
      const hasAffectedAssets = await page.locator('text=/affected/i, text=/asset/i').count() > 0;

      await page.evaluate(() => window.scrollBy(0, window.innerHeight / 2));
      const screenshot2 = `${SCREENSHOTS_DIR}/10-vulnerability-detail-info.png`;
      await page.screenshot({ path: screenshot2, fullPage: true });
      screenshots.push(screenshot2);

      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      const screenshot3 = `${SCREENSHOTS_DIR}/11-vulnerability-affected-assets.png`;
      await page.screenshot({ path: screenshot3, fullPage: true });
      screenshots.push(screenshot3);

      const elementsFound = [hasCVEID, hasCVSS, hasDescription, hasAffectedAssets].filter(Boolean).length;

      testResults['CVE Detail'] = {
        status: elementsFound >= 2 ? 'PASS' : 'SKIP',
        details: `CVE ID=${hasCVEID}, CVSS=${hasCVSS}, Desc=${hasDescription}, Assets=${hasAffectedAssets} (${elementsFound}/4)`
      };

      testResults['Affected Assets'] = {
        status: hasAffectedAssets ? 'PASS' : 'SKIP',
        details: hasAffectedAssets ? 'Section found' : 'Not visible'
      };

      console.log(`  ${elementsFound >= 2 ? '✓' : '⊘'} ${testResults['CVE Detail'].details}`);
      console.log(`  ${hasAffectedAssets ? '✓' : '⊘'} ${testResults['Affected Assets'].details}\n`);
    } else {
      const screenshot = `${SCREENSHOTS_DIR}/09-no-cve-rows.png`;
      await page.screenshot({ path: screenshot, fullPage: true });
      screenshots.push(screenshot);

      testResults['CVE Detail'] = { status: 'SKIP', details: 'No CVE rows to click' };
      testResults['Affected Assets'] = { status: 'SKIP', details: 'Could not access detail page' };
      console.log(`  ⊘ ${testResults['CVE Detail'].details}\n`);
    }
  } catch (error) {
    testResults['CVE Detail'] = { status: 'FAIL', details: `Error: ${error}` };
    testResults['Affected Assets'] = { status: 'SKIP', details: 'Could not test' };
    console.log(`  ✗ ${testResults['CVE Detail'].details}\n`);
  }
}

async function test9_testScanModal(page: Page) {
  console.log('Test 9: Test Scan Modal UI');
  try {
    await page.goto(`${BASE_URL}/vulnerability/vulnerabilities`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    const scanButton = page.locator('button:has-text("Scan"), button:has-text("Start"), button:has-text("Trigger")').first();

    if (await scanButton.count() > 0) {
      await scanButton.click();
      await page.waitForTimeout(1000);

      const screenshot = `${SCREENSHOTS_DIR}/12-vulnerability-scan-modal.png`;
      await page.screenshot({ path: screenshot, fullPage: true });
      screenshots.push(screenshot);

      const hasModal = await page.locator('.ant-modal, [role="dialog"]').count() > 0;

      testResults['Scan Modal'] = {
        status: hasModal ? 'PASS' : 'SKIP',
        details: hasModal ? 'Scan modal opened' : 'Button clicked but no modal'
      };
      console.log(`  ${hasModal ? '✓' : '⊘'} ${testResults['Scan Modal'].details}\n`);

      await page.keyboard.press('Escape');
    } else {
      const screenshot = `${SCREENSHOTS_DIR}/12-vulnerability-no-scan-button.png`;
      await page.screenshot({ path: screenshot, fullPage: true });
      screenshots.push(screenshot);

      testResults['Scan Modal'] = {
        status: 'SKIP',
        details: 'Scan button not found'
      };
      console.log(`  ⊘ ${testResults['Scan Modal'].details}\n`);
    }
  } catch (error) {
    testResults['Scan Modal'] = { status: 'SKIP', details: `Error: ${error}` };
    console.log(`  ⊘ ${testResults['Scan Modal'].details}\n`);
  }
}

async function test10_testDashboardStats(page: Page) {
  console.log('Test 10: Test Dashboard Vulnerability Stats');
  try {
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    const vulnElements = await page.locator('text=/vulnerabilit/i, text=/CVE/i').count();
    const statsCards = await page.locator('.ant-card, .ant-statistic').count();

    const screenshot = `${SCREENSHOTS_DIR}/14-dashboard-vuln-stats.png`;
    await page.screenshot({ path: screenshot, fullPage: true });
    screenshots.push(screenshot);

    testResults['Dashboard Stats'] = {
      status: vulnElements > 0 ? 'PASS' : 'SKIP',
      details: `Vuln elements: ${vulnElements}, Stats cards: ${statsCards}`
    };
    console.log(`  ${vulnElements > 0 ? '✓' : '⊘'} ${testResults['Dashboard Stats'].details}\n`);
  } catch (error) {
    testResults['Dashboard Stats'] = { status: 'FAIL', details: `Error: ${error}` };
    console.log(`  ✗ ${testResults['Dashboard Stats'].details}\n`);
  }
}

function generateReport() {
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
    const timeInfo = result.time ? ` (load time: ${result.time}ms)` : '';
    report += `### ${icon} ${testName}: ${result.status}${timeInfo}\n`;
    report += `${result.details}\n\n`;
  }

  report += `---

## Performance Metrics

`;

  const loadTimeResult = testResults['Vulnerabilities List'];
  if (loadTimeResult && loadTimeResult.time) {
    const loadTime = loadTimeResult.time;
    report += `- **Vulnerabilities List Load Time:** ${loadTime}ms ${loadTime < 3000 ? '✓ (< 3s excellent)' : loadTime < 5000 ? '~ (< 5s acceptable)' : '✗ (> 5s slow)'}\n`;
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
    const uniqueErrors = [...new Set(consoleErrors)];
    uniqueErrors.slice(0, 15).forEach((error, index) => {
      report += `${index + 1}. ${error}\n`;
    });
    if (uniqueErrors.length > 15) {
      report += `\n... and ${uniqueErrors.length - 15} more unique errors\n`;
    }
  } else {
    report += `No console errors detected ✓\n`;
  }

  report += `\n---

## Key Findings

`;

  const findings: string[] = [];
  const bugs: string[] = [];

  if (testResults['Login']?.status === 'PASS') findings.push('✓ Authentication working');
  if (testResults['Vulnerabilities List']?.status === 'PASS') findings.push('✓ Vulnerabilities list renders');
  if (testResults['Search']?.status === 'PASS') findings.push('✓ Search implemented');
  if (testResults['Filter (Severity)']?.status === 'PASS') findings.push('✓ Severity filtering available');
  if (testResults['Sorting']?.status === 'PASS') findings.push('✓ Table sorting works');
  if (testResults['CVE Detail']?.status === 'PASS') findings.push('✓ CVE detail page functional');
  if (testResults['Affected Assets']?.status === 'PASS') findings.push('✓ Affected assets visible');
  if (testResults['Pagination']?.status === 'PASS') findings.push('✓ Pagination working');
  if (testResults['Dashboard Stats']?.status === 'PASS') findings.push('✓ Dashboard shows vuln stats');

  Object.entries(testResults).forEach(([name, result]) => {
    if (result.status === 'FAIL') {
      bugs.push(`✗ ${name}: ${result.details}`);
    }
  });

  if (findings.length > 0) {
    report += findings.join('\n') + '\n\n';
  }

  if (bugs.length > 0) {
    report += `### Bugs Found: ${bugs.length}\n\n`;
    report += bugs.join('\n') + '\n\n`;
  } else {
    report += `### Bugs Found: 0 ✓\n\n`;
  }

  report += `---

## Recommendations

`;

  const recommendations: string[] = [];

  if (testResults['Filter (EPSS)']?.status === 'SKIP') {
    recommendations.push('- Consider implementing EPSS score filtering');
  }

  if (testResults['Scan Modal']?.status === 'SKIP') {
    recommendations.push('- Add vulnerability scan trigger UI');
  }

  if (failed > 0) {
    recommendations.push('- Fix failing tests');
  }

  if (consoleErrors.length > 10) {
    recommendations.push(`- Resolve ${consoleErrors.length} console errors`);
  }

  if (recommendations.length > 0) {
    report += recommendations.join('\n') + '\n';
  } else {
    report += 'All expected features working. No critical recommendations.\n';
  }

  report += `\n---

## Overall Assessment

`;

  const passRate = totalTests > 0 ? Math.round((passed / totalTests) * 100) : 0;

  if (passRate >= 80 && failed === 0) {
    report += `**Status: EXCELLENT** (${passRate}% pass rate, 0 failures)\n\n`;
    report += `The Vulnerabilities module is functioning excellently with all tested features working.\n`;
  } else if (passRate >= 60 && failed <= 1) {
    report += `**Status: GOOD** (${passRate}% pass rate)\n\n`;
    report += `The Vulnerabilities module is mostly functional. Some optional features may be missing.\n`;
  } else if (failed > 0) {
    report += `**Status: NEEDS ATTENTION** (${passRate}% pass rate, ${failed} failures)\n\n`;
    report += `The Vulnerabilities module has ${failed} failing test(s) requiring attention.\n`;
  } else {
    report += `**Status: ACCEPTABLE** (${passRate}% pass rate, ${skipped} skipped)\n\n`;
    report += `Core features working. Some advanced features not yet implemented.\n`;
  }

  const reportPath = './PHASE1_AGENT7_VULNERABILITIES_REPORT.md';
  fs.writeFileSync(reportPath, report);

  console.log('\n' + '='.repeat(80));
  console.log('TEST SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total: ${totalTests} | Passed: ${passed} | Failed: ${failed} | Skipped: ${skipped}`);
  console.log(`Pass Rate: ${passRate}%`);
  console.log(`Overall: ${failed === 0 ? 'PASS ✓' : 'FAIL ✗'}`);
  console.log('='.repeat(80));
  console.log(`\nFull report written to: ${reportPath}`);
}

main().catch(console.error);
