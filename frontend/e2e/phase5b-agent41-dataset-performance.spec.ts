/**
 * Phase 5B - Agent 41: Large Dataset Performance Testing
 *
 * Tests application performance with large datasets to identify:
 * - Rendering bottlenecks
 * - Search/filter/sort latency
 * - Memory/CPU usage issues
 * - Table virtualization effectiveness
 */

import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

// Performance thresholds
const THRESHOLDS = {
  LOAD_TIME: 3000,          // Initial page load < 3s
  TABLE_RENDER: 1000,       // Table render < 1s
  SEARCH_LATENCY: 500,      // Search response < 500ms
  SORT_TIME: 300,           // Sort operation < 300ms
  FILTER_TIME: 500,         // Filter operation < 500ms
  PAGINATION_TIME: 200,     // Pagination < 200ms
  TARGET_FPS: 55,           // Scroll FPS >= 55
};

interface PerformanceMetric {
  scenario: string;
  metric: string;
  target: number;
  actual: number;
  status: 'PASS' | 'FAIL';
  unit: string;
}

const performanceResults: PerformanceMetric[] = [];

function addResult(
  scenario: string,
  metric: string,
  target: number,
  actual: number,
  unit: string = 'ms'
) {
  const status = actual <= target ? 'PASS' : 'FAIL';
  performanceResults.push({ scenario, metric, target, actual, status, unit });
  console.log(`${scenario} - ${metric}: ${actual}${unit} (target: <${target}${unit}) [${status}]`);
}

async function measurePageLoad(page: Page, url: string): Promise<number> {
  const startTime = Date.now();
  await page.goto(url, { waitUntil: 'networkidle' });
  // Wait for main content to be visible
  await page.waitForSelector('.ant-table-tbody', { timeout: 10000 });
  const loadTime = Date.now() - startTime;
  return loadTime;
}

async function measureSearchLatency(page: Page, selector: string, query: string): Promise<number> {
  const searchInput = page.locator(selector);
  await searchInput.clear();

  const startTime = Date.now();
  await searchInput.fill(query);

  // Wait for table to update (look for loading state to disappear)
  await page.waitForTimeout(100); // Small delay for debounce
  await page.waitForSelector('.ant-spin-spinning', { state: 'hidden', timeout: 5000 });

  const latency = Date.now() - startTime;
  return latency;
}

async function measureSortTime(page: Page, columnHeader: string): Promise<number> {
  const startTime = Date.now();

  // Click column header to sort
  await page.locator(`th:has-text("${columnHeader}")`).first().click();

  // Wait for loading to finish
  await page.waitForSelector('.ant-spin-spinning', { state: 'hidden', timeout: 5000 });

  const sortTime = Date.now() - startTime;
  return sortTime;
}

async function measureFilterTime(page: Page): Promise<number> {
  const startTime = Date.now();

  // Look for filter button and click
  const filterBtn = page.getByRole('button', { name: /filter/i }).first();
  await filterBtn.click();

  // Wait for filter modal/drawer
  await page.waitForSelector('.ant-modal-content, .ant-drawer-content', { timeout: 2000 });

  // Apply a filter (assuming there's a status or severity filter)
  const firstCheckbox = page.locator('.ant-checkbox-input').first();
  await firstCheckbox.check();

  // Click apply/OK button
  await page.getByRole('button', { name: /apply|ok/i }).click();

  // Wait for table to update
  await page.waitForSelector('.ant-spin-spinning', { state: 'hidden', timeout: 5000 });

  const filterTime = Date.now() - startTime;
  return filterTime;
}

async function measurePaginationTime(page: Page): Promise<number> {
  // Wait for pagination to be visible
  await page.waitForSelector('.ant-pagination');

  const startTime = Date.now();

  // Click next page
  await page.locator('.ant-pagination-next').click();

  // Wait for loading to finish
  await page.waitForSelector('.ant-spin-spinning', { state: 'hidden', timeout: 5000 });

  const paginationTime = Date.now() - startTime;
  return paginationTime;
}

async function analyzeTableVirtualization(page: Page): Promise<{
  totalRows: number;
  renderedRows: number;
  isVirtualized: boolean;
  domNodes: number;
}> {
  // Count total rows from pagination info
  const paginationText = await page.locator('.ant-pagination-total-text').textContent();
  const totalRows = paginationText ? parseInt(paginationText.match(/\d+/)?.[0] || '0') : 0;

  // Count rendered DOM rows
  const renderedRows = await page.locator('.ant-table-tbody tr').count();

  // Count total DOM nodes in table
  const domNodes = await page.evaluate(() => {
    const table = document.querySelector('.ant-table-wrapper');
    return table ? table.querySelectorAll('*').length : 0;
  });

  // Virtualization heuristic: if rendered rows << total rows, likely virtualized
  const isVirtualized = totalRows > 100 && renderedRows < totalRows;

  return { totalRows, renderedRows, isVirtualized, domNodes };
}

async function getDataCounts(page: Page): Promise<{
  assets: number;
  patches: number;
  vulnerabilities: number;
}> {
  // Navigate to each page and get counts from pagination or headers
  let assets = 0;
  let patches = 0;
  let vulnerabilities = 0;

  try {
    await page.goto('http://localhost:5173/assets');
    await page.waitForSelector('.ant-pagination-total-text, .ant-table-tbody', { timeout: 5000 });
    const assetText = await page.locator('.ant-pagination-total-text').textContent();
    assets = assetText ? parseInt(assetText.match(/\d+/)?.[0] || '0') : 0;
  } catch (e) {
    console.log('Could not get asset count:', e);
  }

  try {
    await page.goto('http://localhost:5173/patches');
    await page.waitForSelector('.ant-table-tbody', { timeout: 5000 });
    const rows = await page.locator('.ant-table-tbody tr').count();
    patches = rows;
  } catch (e) {
    console.log('Could not get patch count:', e);
  }

  try {
    await page.goto('http://localhost:5173/vulnerability/vulnerabilities');
    await page.waitForSelector('.ant-pagination-total-text, .ant-table-tbody', { timeout: 5000 });
    const vulnText = await page.locator('.ant-pagination-total-text').textContent();
    vulnerabilities = vulnText ? parseInt(vulnText.match(/\d+/)?.[0] || '0') : 0;
  } catch (e) {
    console.log('Could not get vulnerability count:', e);
  }

  return { assets, patches, vulnerabilities };
}

test.describe('Phase 5B Agent 41 - Large Dataset Performance', () => {
  test.use({
    // Use authenticated state
    storageState: 'frontend/auth.json',
  });

  test.beforeAll(async () => {
    console.log('\n========================================');
    console.log('PHASE 5B - AGENT 41: DATASET PERFORMANCE');
    console.log('========================================\n');
  });

  test.afterAll(async () => {
    console.log('\n========================================');
    console.log('PERFORMANCE TEST RESULTS SUMMARY');
    console.log('========================================\n');

    // Generate results table
    console.log('| Scenario | Metric | Target | Actual | Status |');
    console.log('|----------|--------|--------|--------|--------|');

    performanceResults.forEach(r => {
      console.log(`| ${r.scenario} | ${r.metric} | < ${r.target}${r.unit} | ${r.actual}${r.unit} | ${r.status} |`);
    });

    const passCount = performanceResults.filter(r => r.status === 'PASS').length;
    const failCount = performanceResults.filter(r => r.status === 'FAIL').length;

    console.log(`\nOverall: ${passCount} PASS, ${failCount} FAIL`);
    console.log('========================================\n');
  });

  test('0. Environment Check - Get Data Counts', async ({ page }) => {
    const counts = await getDataCounts(page);

    console.log('\n--- Test Environment Data Counts ---');
    console.log(`Assets: ${counts.assets}`);
    console.log(`Patches: ${counts.patches}`);
    console.log(`Vulnerabilities: ${counts.vulnerabilities}`);
    console.log('-----------------------------------\n');

    // Store for report generation
    test.info().annotations.push({ type: 'data-counts', description: JSON.stringify(counts) });
  });

  test('Scenario 1: Assets Page Performance', async ({ page }) => {
    console.log('\n--- SCENARIO 1: ASSETS PAGE ---');

    // 1.1 Initial page load
    const loadTime = await measurePageLoad(page, 'http://localhost:5173/assets');
    addResult('Assets', 'Load Time', THRESHOLDS.LOAD_TIME, loadTime);

    // Wait for page to stabilize
    await page.waitForTimeout(500);

    // 1.2 Search latency
    try {
      const searchLatency = await measureSearchLatency(page, 'input[placeholder*="Search"]', 'AST');
      addResult('Assets', 'Search Latency', THRESHOLDS.SEARCH_LATENCY, searchLatency);
    } catch (e) {
      console.log('Search test skipped:', e);
    }

    // Clear search
    await page.locator('input[placeholder*="Search"]').clear();
    await page.waitForTimeout(500);

    // 1.3 Sort performance
    try {
      const sortTime = await measureSortTime(page, 'Asset ID');
      addResult('Assets', 'Sort Time', THRESHOLDS.SORT_TIME, sortTime);
    } catch (e) {
      console.log('Sort test skipped:', e);
    }

    // 1.4 Pagination time
    try {
      const paginationTime = await measurePaginationTime(page);
      addResult('Assets', 'Pagination Time', THRESHOLDS.PAGINATION_TIME, paginationTime);
    } catch (e) {
      console.log('Pagination test skipped:', e);
    }

    // 1.5 Virtualization check
    const virtInfo = await analyzeTableVirtualization(page);
    console.log(`Virtualization: ${virtInfo.isVirtualized ? 'YES' : 'NO'}`);
    console.log(`Total rows: ${virtInfo.totalRows}, Rendered: ${virtInfo.renderedRows}, DOM nodes: ${virtInfo.domNodes}`);

    test.info().annotations.push({ type: 'assets-virtualization', description: JSON.stringify(virtInfo) });
  });

  test('Scenario 2: Patches Page Performance', async ({ page }) => {
    console.log('\n--- SCENARIO 2: PATCHES PAGE ---');

    // 2.1 Initial load
    const loadTime = await measurePageLoad(page, 'http://localhost:5173/patches');
    addResult('Patches', 'Load Time', THRESHOLDS.LOAD_TIME, loadTime);

    await page.waitForTimeout(500);

    // 2.2 Search latency (search for "CVE")
    try {
      const searchLatency = await measureSearchLatency(page, 'input[placeholder*="Search"]', 'CVE');
      addResult('Patches', 'Search Latency', THRESHOLDS.SEARCH_LATENCY, searchLatency);
    } catch (e) {
      console.log('Search test skipped:', e);
    }

    // Clear search
    await page.locator('input[placeholder*="Search"]').clear();
    await page.waitForTimeout(500);

    // 2.3 Sort by severity
    try {
      const sortTime = await measureSortTime(page, 'Severity');
      addResult('Patches', 'Sort Time', THRESHOLDS.SORT_TIME, sortTime);
    } catch (e) {
      console.log('Sort test skipped:', e);
    }

    // 2.4 Virtualization check
    const virtInfo = await analyzeTableVirtualization(page);
    console.log(`Virtualization: ${virtInfo.isVirtualized ? 'YES' : 'NO'}`);
    console.log(`Total rows: ${virtInfo.totalRows}, Rendered: ${virtInfo.renderedRows}, DOM nodes: ${virtInfo.domNodes}`);

    test.info().annotations.push({ type: 'patches-virtualization', description: JSON.stringify(virtInfo) });
  });

  test('Scenario 3: Vulnerabilities Page Performance', async ({ page }) => {
    console.log('\n--- SCENARIO 3: VULNERABILITIES PAGE ---');

    // 3.1 Initial load
    const loadTime = await measurePageLoad(page, 'http://localhost:5173/vulnerability/vulnerabilities');
    addResult('Vulnerabilities', 'Load Time', THRESHOLDS.LOAD_TIME, loadTime);

    await page.waitForTimeout(500);

    // 3.2 Search latency
    try {
      const searchLatency = await measureSearchLatency(page, 'input[placeholder*="Search"]', 'CVE-2024');
      addResult('Vulnerabilities', 'Search Latency', THRESHOLDS.SEARCH_LATENCY, searchLatency);
    } catch (e) {
      console.log('Search test skipped:', e);
    }

    // Clear search
    await page.locator('input[placeholder*="Search"]').clear();
    await page.waitForTimeout(500);

    // 3.3 Sort performance
    try {
      const sortTime = await measureSortTime(page, 'Severity');
      addResult('Vulnerabilities', 'Sort Time', THRESHOLDS.SORT_TIME, sortTime);
    } catch (e) {
      console.log('Sort test skipped:', e);
    }

    // 3.4 Pagination
    try {
      const paginationTime = await measurePaginationTime(page);
      addResult('Vulnerabilities', 'Pagination Time', THRESHOLDS.PAGINATION_TIME, paginationTime);
    } catch (e) {
      console.log('Pagination test skipped:', e);
    }

    // 3.5 Virtualization check
    const virtInfo = await analyzeTableVirtualization(page);
    console.log(`Virtualization: ${virtInfo.isVirtualized ? 'YES' : 'NO'}`);
    console.log(`Total rows: ${virtInfo.totalRows}, Rendered: ${virtInfo.renderedRows}, DOM nodes: ${virtInfo.domNodes}`);

    test.info().annotations.push({ type: 'vulnerabilities-virtualization', description: JSON.stringify(virtInfo) });
  });

  test('Scenario 4: Memory and DOM Analysis', async ({ page }) => {
    console.log('\n--- SCENARIO 4: MEMORY & DOM ANALYSIS ---');

    // Navigate to assets page (likely largest dataset)
    await page.goto('http://localhost:5173/assets');
    await page.waitForSelector('.ant-table-tbody', { timeout: 10000 });

    // Get memory metrics (if available)
    const memoryUsage = await page.evaluate(() => {
      if ('memory' in performance) {
        const mem = (performance as any).memory;
        return {
          usedJSHeapSize: mem.usedJSHeapSize,
          totalJSHeapSize: mem.totalJSHeapSize,
          jsHeapSizeLimit: mem.jsHeapSizeLimit,
        };
      }
      return null;
    });

    if (memoryUsage) {
      console.log(`Memory Usage: ${(memoryUsage.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`);
      console.log(`Total JS Heap: ${(memoryUsage.totalJSHeapSize / 1024 / 1024).toFixed(2)} MB`);
      test.info().annotations.push({ type: 'memory-usage', description: JSON.stringify(memoryUsage) });
    }

    // Count DOM nodes
    const domAnalysis = await page.evaluate(() => {
      const totalNodes = document.querySelectorAll('*').length;
      const tableNodes = document.querySelector('.ant-table-wrapper')?.querySelectorAll('*').length || 0;
      const tableRows = document.querySelectorAll('.ant-table-tbody tr').length;

      return { totalNodes, tableNodes, tableRows };
    });

    console.log(`Total DOM nodes: ${domAnalysis.totalNodes}`);
    console.log(`Table DOM nodes: ${domAnalysis.tableNodes}`);
    console.log(`Table rows rendered: ${domAnalysis.tableRows}`);

    test.info().annotations.push({ type: 'dom-analysis', description: JSON.stringify(domAnalysis) });
  });
});
