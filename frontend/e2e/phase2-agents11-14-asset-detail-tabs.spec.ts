import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

// Test configuration
const BASE_URL = 'http://localhost:5173';
const CREDENTIALS = {
  email: 'admin@patchiq.io',
  password: 'admin123'
};
const SCREENSHOT_DIR = '/Users/shandesh/src/VS-code/PatchIQ/full-dev-sandy-v2/screenshots/phase2-agents11-14';
const MAX_ASSET_LIST_WAIT = 30000; // 30s to handle Phase 1 slow loading bug
const MAX_TAB_LOAD_TIME = 5000; // 5s acceptable per instructions

// Tab definitions
const TABS = [
  { number: 1, name: 'Hardware', selector: 'text=Hardware' },
  { number: 2, name: 'Software', selector: 'text=Software' },
  { number: 3, name: 'Patches', selector: 'text=Patches' },
  { number: 4, name: 'Vulnerabilities', selector: 'text=Vulnerabilities' },
  { number: 5, name: 'Alerts', selector: 'text=Alerts' },
  { number: 6, name: 'Security', selector: 'text=Security' },
  { number: 7, name: 'Network', selector: 'text=Network' },
  { number: 8, name: 'Peripherals', selector: 'text=Peripherals' },
  { number: 9, name: 'Telemetry', selector: 'text=Telemetry' },
  { number: 10, name: 'Audit Log', selector: 'text=Audit Log' },
  { number: 11, name: 'Deployments', selector: 'text=Deployments' },
  { number: 12, name: 'System Errors', selector: 'text=System Errors' }
];

interface TabTestResult {
  tabNumber: number;
  tabName: string;
  loadTime: number;
  dataVisible: boolean;
  interactionsWork: boolean;
  consoleErrors: string[];
  status: 'PASS' | 'PASS_WITH_ISSUES' | 'FAIL';
  notes: string;
}

interface ConsoleError {
  message: string;
  type: 'error' | 'warning';
  tab: string;
}

// Global test results storage
const testResults: TabTestResult[] = [];
const consoleErrors: ConsoleError[] = [];
let currentTab = 'Setup';

// Helper functions
function getTimestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function getScreenshotPath(filename: string): string {
  return path.join(SCREENSHOT_DIR, filename);
}

async function captureConsoleErrors(page: Page) {
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push({
        message: msg.text(),
        type: 'error',
        tab: currentTab
      });
    } else if (msg.type() === 'warning' && msg.text().includes('Failed') || msg.text().includes('Error')) {
      consoleErrors.push({
        message: msg.text(),
        type: 'warning',
        tab: currentTab
      });
    }
  });

  page.on('pageerror', error => {
    consoleErrors.push({
      message: error.message,
      type: 'error',
      tab: currentTab
    });
  });
}

async function measureLoadTime(page: Page, action: () => Promise<void>): Promise<number> {
  const startTime = Date.now();
  await action();
  return Date.now() - startTime;
}

async function waitForNoSpinner(page: Page, timeout = 10000) {
  try {
    await page.waitForSelector('.ant-spin', { state: 'hidden', timeout });
  } catch {
    // Spinner might not exist, that's okay
  }
}

// Test Suite
test.describe('Phase 2 Agents 11-14: Asset Detail - All 12 Tabs', () => {
  test.use({ storageState: '/Users/shandesh/src/VS-code/PatchIQ/full-dev-sandy-v2/frontend/auth.json' });

  let assetId: string;

  test.beforeAll(async () => {
    // Ensure screenshots directory exists
    if (!fs.existsSync(SCREENSHOT_DIR)) {
      fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    }
  });

  test('Setup: Find or Create Test Asset', async ({ page }) => {
    currentTab = 'Setup';
    captureConsoleErrors(page);

    // Navigate to assets page
    await page.goto(`${BASE_URL}/assets`, { waitUntil: 'networkidle' });

    // Wait for assets list to load (handle Phase 1 slow loading bug)
    await page.waitForSelector('.ant-table-tbody tr', { timeout: MAX_ASSET_LIST_WAIT });

    // Try to get first asset ID from table
    try {
      const firstRow = page.locator('.ant-table-tbody tr').first();
      await firstRow.waitFor({ timeout: 5000 });

      // Try clicking the row
      const startUrl = page.url();
      await firstRow.click({ timeout: 5000 });
      await page.waitForTimeout(2000);

      const currentUrl = page.url();

      if (currentUrl === startUrl) {
        // Row click didn't work - Phase 1 bug confirmed
        console.log('Row click failed, attempting direct navigation...');

        // Try to extract asset ID from the table
        const assetLink = await page.locator('.ant-table-tbody tr a').first().getAttribute('href');
        if (assetLink) {
          assetId = assetLink.split('/').pop() || '1';
        } else {
          assetId = '1'; // Fallback
        }

        await page.goto(`${BASE_URL}/assets/${assetId}`, { waitUntil: 'networkidle' });
      } else {
        // Row click worked, extract ID from URL
        const match = currentUrl.match(/\/assets\/(\d+)/);
        assetId = match ? match[1] : '1';
      }
    } catch (error) {
      console.log('Error finding asset, using fallback ID 1:', error);
      assetId = '1';
      await page.goto(`${BASE_URL}/assets/1`, { waitUntil: 'networkidle' });
    }

    // Capture overview screenshot
    await waitForNoSpinner(page);
    await page.screenshot({
      path: getScreenshotPath(`asset-detail-overview-${getTimestamp()}.png`),
      fullPage: true
    });

    console.log(`Testing asset ID: ${assetId}`);

    // Verify we're on the asset detail page
    await expect(page).toHaveURL(new RegExp(`/assets/${assetId}`));
  });

  test('Tab 01: Hardware', async ({ page }) => {
    currentTab = 'Hardware';
    const result: TabTestResult = {
      tabNumber: 1,
      tabName: 'Hardware',
      loadTime: 0,
      dataVisible: false,
      interactionsWork: true,
      consoleErrors: [],
      status: 'FAIL',
      notes: ''
    };

    try {
      await page.goto(`${BASE_URL}/assets/${assetId}`, { waitUntil: 'networkidle' });

      // Click Hardware tab and measure load time
      result.loadTime = await measureLoadTime(page, async () => {
        await page.click('text=Hardware');
        await waitForNoSpinner(page);
      });

      // Check for hardware data
      const cpuVisible = await page.locator('text=/CPU|Processor/i').isVisible().catch(() => false);
      const ramVisible = await page.locator('text=/RAM|Memory/i').isVisible().catch(() => false);
      const storageVisible = await page.locator('text=/Storage|Disk/i').isVisible().catch(() => false);

      result.dataVisible = cpuVisible || ramVisible || storageVisible;

      // Capture screenshot
      await page.screenshot({
        path: getScreenshotPath(`asset-tab-01-hardware-${getTimestamp()}.png`),
        fullPage: true
      });

      // Determine status
      if (result.dataVisible && result.loadTime < MAX_TAB_LOAD_TIME) {
        result.status = 'PASS';
      } else if (result.dataVisible) {
        result.status = 'PASS_WITH_ISSUES';
        result.notes = `Slow load time: ${result.loadTime}ms`;
      } else {
        result.status = 'FAIL';
        result.notes = 'No hardware data visible';
      }
    } catch (error) {
      result.status = 'FAIL';
      result.notes = `Error: ${error}`;
    }

    result.consoleErrors = consoleErrors.filter(e => e.tab === currentTab).map(e => e.message);
    testResults.push(result);
  });

  test('Tab 02: Software', async ({ page }) => {
    currentTab = 'Software';
    const result: TabTestResult = {
      tabNumber: 2,
      tabName: 'Software',
      loadTime: 0,
      dataVisible: false,
      interactionsWork: true,
      consoleErrors: [],
      status: 'FAIL',
      notes: ''
    };

    try {
      await page.goto(`${BASE_URL}/assets/${assetId}`, { waitUntil: 'networkidle' });

      result.loadTime = await measureLoadTime(page, async () => {
        await page.click('text=Software');
        await waitForNoSpinner(page);
      });

      // Check for software list
      const tableVisible = await page.locator('.ant-table').isVisible().catch(() => false);
      const emptyStateVisible = await page.locator('text=/No software|No data|Empty/i').isVisible().catch(() => false);

      result.dataVisible = tableVisible || emptyStateVisible;

      // Test search if data exists
      if (tableVisible) {
        try {
          const searchInput = page.locator('input[placeholder*="Search"]').first();
          if (await searchInput.isVisible()) {
            await searchInput.fill('test');
            await page.waitForTimeout(1000);
            result.interactionsWork = true;
          }
        } catch {
          result.interactionsWork = false;
        }
      }

      await page.screenshot({
        path: getScreenshotPath(`asset-tab-02-software-${getTimestamp()}.png`),
        fullPage: true
      });

      if (result.dataVisible && result.loadTime < MAX_TAB_LOAD_TIME) {
        result.status = 'PASS';
      } else if (result.dataVisible) {
        result.status = 'PASS_WITH_ISSUES';
        result.notes = `Slow load time: ${result.loadTime}ms`;
      }
    } catch (error) {
      result.notes = `Error: ${error}`;
    }

    result.consoleErrors = consoleErrors.filter(e => e.tab === currentTab).map(e => e.message);
    testResults.push(result);
  });

  test('Tab 03: Patches', async ({ page }) => {
    currentTab = 'Patches';
    const result: TabTestResult = {
      tabNumber: 3,
      tabName: 'Patches',
      loadTime: 0,
      dataVisible: false,
      interactionsWork: true,
      consoleErrors: [],
      status: 'FAIL',
      notes: ''
    };

    try {
      await page.goto(`${BASE_URL}/assets/${assetId}`, { waitUntil: 'networkidle' });

      result.loadTime = await measureLoadTime(page, async () => {
        await page.click('text=Patches');
        await waitForNoSpinner(page);
      });

      const appliedPatchesVisible = await page.locator('text=/Applied Patches|Installed Patches/i').isVisible().catch(() => false);
      const missingPatchesVisible = await page.locator('text=/Missing Patches|Available Patches/i').isVisible().catch(() => false);

      result.dataVisible = appliedPatchesVisible || missingPatchesVisible;

      await page.screenshot({
        path: getScreenshotPath(`asset-tab-03-patches-${getTimestamp()}.png`),
        fullPage: true
      });

      if (result.dataVisible && result.loadTime < MAX_TAB_LOAD_TIME) {
        result.status = 'PASS';
      } else if (result.dataVisible) {
        result.status = 'PASS_WITH_ISSUES';
        result.notes = `Slow load time: ${result.loadTime}ms`;
      }
    } catch (error) {
      result.notes = `Error: ${error}`;
    }

    result.consoleErrors = consoleErrors.filter(e => e.tab === currentTab).map(e => e.message);
    testResults.push(result);
  });

  test('Tab 04: Vulnerabilities', async ({ page }) => {
    currentTab = 'Vulnerabilities';
    const result: TabTestResult = {
      tabNumber: 4,
      tabName: 'Vulnerabilities',
      loadTime: 0,
      dataVisible: false,
      interactionsWork: true,
      consoleErrors: [],
      status: 'FAIL',
      notes: ''
    };

    try {
      await page.goto(`${BASE_URL}/assets/${assetId}`, { waitUntil: 'networkidle' });

      result.loadTime = await measureLoadTime(page, async () => {
        await page.click('text=Vulnerabilities');
        await waitForNoSpinner(page);
      });

      const cveVisible = await page.locator('text=/CVE-|Critical|High|Medium|Low/i').isVisible().catch(() => false);
      const tableVisible = await page.locator('.ant-table').isVisible().catch(() => false);
      const emptyStateVisible = await page.locator('text=/No vulnerabilities|No data/i').isVisible().catch(() => false);

      result.dataVisible = cveVisible || tableVisible || emptyStateVisible;

      // Test severity filter
      if (tableVisible) {
        try {
          const filterDropdown = page.locator('.ant-select').first();
          if (await filterDropdown.isVisible()) {
            await filterDropdown.click();
            await page.waitForTimeout(500);
            result.interactionsWork = true;
          }
        } catch {
          result.interactionsWork = false;
        }
      }

      await page.screenshot({
        path: getScreenshotPath(`asset-tab-04-vulnerabilities-${getTimestamp()}.png`),
        fullPage: true
      });

      if (result.dataVisible && result.loadTime < MAX_TAB_LOAD_TIME) {
        result.status = 'PASS';
      } else if (result.dataVisible) {
        result.status = 'PASS_WITH_ISSUES';
        result.notes = `Slow load time: ${result.loadTime}ms`;
      }
    } catch (error) {
      result.notes = `Error: ${error}`;
    }

    result.consoleErrors = consoleErrors.filter(e => e.tab === currentTab).map(e => e.message);
    testResults.push(result);
  });

  test('Tab 05: Alerts', async ({ page }) => {
    currentTab = 'Alerts';
    const result: TabTestResult = {
      tabNumber: 5,
      tabName: 'Alerts',
      loadTime: 0,
      dataVisible: false,
      interactionsWork: true,
      consoleErrors: [],
      status: 'FAIL',
      notes: ''
    };

    try {
      await page.goto(`${BASE_URL}/assets/${assetId}`, { waitUntil: 'networkidle' });

      result.loadTime = await measureLoadTime(page, async () => {
        await page.click('text=Alerts');
        await waitForNoSpinner(page);
      });

      const alertsVisible = await page.locator('text=/Alert|Severity/i').isVisible().catch(() => false);
      const tableVisible = await page.locator('.ant-table').isVisible().catch(() => false);
      const emptyStateVisible = await page.locator('text=/No alerts|No data/i').isVisible().catch(() => false);

      result.dataVisible = alertsVisible || tableVisible || emptyStateVisible;

      await page.screenshot({
        path: getScreenshotPath(`asset-tab-05-alerts-${getTimestamp()}.png`),
        fullPage: true
      });

      if (result.dataVisible && result.loadTime < MAX_TAB_LOAD_TIME) {
        result.status = 'PASS';
      } else if (result.dataVisible) {
        result.status = 'PASS_WITH_ISSUES';
        result.notes = `Slow load time: ${result.loadTime}ms`;
      }
    } catch (error) {
      result.notes = `Error: ${error}`;
    }

    result.consoleErrors = consoleErrors.filter(e => e.tab === currentTab).map(e => e.message);
    testResults.push(result);
  });

  test('Tab 06: Security', async ({ page }) => {
    currentTab = 'Security';
    const result: TabTestResult = {
      tabNumber: 6,
      tabName: 'Security',
      loadTime: 0,
      dataVisible: false,
      interactionsWork: true,
      consoleErrors: [],
      status: 'FAIL',
      notes: ''
    };

    try {
      await page.goto(`${BASE_URL}/assets/${assetId}`, { waitUntil: 'networkidle' });

      result.loadTime = await measureLoadTime(page, async () => {
        await page.click('text=Security');
        await waitForNoSpinner(page);
      });

      const antivirusVisible = await page.locator('text=/Antivirus|Anti-virus/i').isVisible().catch(() => false);
      const firewallVisible = await page.locator('text=/Firewall/i').isVisible().catch(() => false);
      const complianceVisible = await page.locator('text=/Compliance|Score/i').isVisible().catch(() => false);

      result.dataVisible = antivirusVisible || firewallVisible || complianceVisible;

      await page.screenshot({
        path: getScreenshotPath(`asset-tab-06-security-${getTimestamp()}.png`),
        fullPage: true
      });

      if (result.dataVisible && result.loadTime < MAX_TAB_LOAD_TIME) {
        result.status = 'PASS';
      } else if (result.dataVisible) {
        result.status = 'PASS_WITH_ISSUES';
        result.notes = `Slow load time: ${result.loadTime}ms`;
      }
    } catch (error) {
      result.notes = `Error: ${error}`;
    }

    result.consoleErrors = consoleErrors.filter(e => e.tab === currentTab).map(e => e.message);
    testResults.push(result);
  });

  test('Tab 07: Network', async ({ page }) => {
    currentTab = 'Network';
    const result: TabTestResult = {
      tabNumber: 7,
      tabName: 'Network',
      loadTime: 0,
      dataVisible: false,
      interactionsWork: true,
      consoleErrors: [],
      status: 'FAIL',
      notes: ''
    };

    try {
      await page.goto(`${BASE_URL}/assets/${assetId}`, { waitUntil: 'networkidle' });

      result.loadTime = await measureLoadTime(page, async () => {
        await page.click('text=Network');
        await waitForNoSpinner(page);
      });

      const ipVisible = await page.locator('text=/IP Address|IPv4/i').isVisible().catch(() => false);
      const macVisible = await page.locator('text=/MAC Address/i').isVisible().catch(() => false);
      const dnsVisible = await page.locator('text=/DNS|Gateway/i').isVisible().catch(() => false);

      result.dataVisible = ipVisible || macVisible || dnsVisible;

      await page.screenshot({
        path: getScreenshotPath(`asset-tab-07-network-${getTimestamp()}.png`),
        fullPage: true
      });

      if (result.dataVisible && result.loadTime < MAX_TAB_LOAD_TIME) {
        result.status = 'PASS';
      } else if (result.dataVisible) {
        result.status = 'PASS_WITH_ISSUES';
        result.notes = `Slow load time: ${result.loadTime}ms`;
      }
    } catch (error) {
      result.notes = `Error: ${error}`;
    }

    result.consoleErrors = consoleErrors.filter(e => e.tab === currentTab).map(e => e.message);
    testResults.push(result);
  });

  test('Tab 08: Peripherals', async ({ page }) => {
    currentTab = 'Peripherals';
    const result: TabTestResult = {
      tabNumber: 8,
      tabName: 'Peripherals',
      loadTime: 0,
      dataVisible: false,
      interactionsWork: true,
      consoleErrors: [],
      status: 'FAIL',
      notes: ''
    };

    try {
      await page.goto(`${BASE_URL}/assets/${assetId}`, { waitUntil: 'networkidle' });

      result.loadTime = await measureLoadTime(page, async () => {
        await page.click('text=Peripherals');
        await waitForNoSpinner(page);
      });

      const usbVisible = await page.locator('text=/USB|Device/i').isVisible().catch(() => false);
      const monitorVisible = await page.locator('text=/Monitor|Display/i').isVisible().catch(() => false);
      const printerVisible = await page.locator('text=/Printer/i').isVisible().catch(() => false);
      const emptyStateVisible = await page.locator('text=/No peripherals|No data/i').isVisible().catch(() => false);

      result.dataVisible = usbVisible || monitorVisible || printerVisible || emptyStateVisible;

      await page.screenshot({
        path: getScreenshotPath(`asset-tab-08-peripherals-${getTimestamp()}.png`),
        fullPage: true
      });

      if (result.dataVisible && result.loadTime < MAX_TAB_LOAD_TIME) {
        result.status = 'PASS';
      } else if (result.dataVisible) {
        result.status = 'PASS_WITH_ISSUES';
        result.notes = `Slow load time: ${result.loadTime}ms`;
      }
    } catch (error) {
      result.notes = `Error: ${error}`;
    }

    result.consoleErrors = consoleErrors.filter(e => e.tab === currentTab).map(e => e.message);
    testResults.push(result);
  });

  test('Tab 09: Telemetry (CRITICAL - Real-Time Updates)', async ({ page }) => {
    currentTab = 'Telemetry';
    const result: TabTestResult = {
      tabNumber: 9,
      tabName: 'Telemetry',
      loadTime: 0,
      dataVisible: false,
      interactionsWork: true,
      consoleErrors: [],
      status: 'FAIL',
      notes: ''
    };

    try {
      await page.goto(`${BASE_URL}/assets/${assetId}`, { waitUntil: 'networkidle' });

      result.loadTime = await measureLoadTime(page, async () => {
        await page.click('text=Telemetry');
        await waitForNoSpinner(page);
      });

      // Check for gauge elements
      const cpuGaugeVisible = await page.locator('text=/CPU|Processor/i').isVisible().catch(() => false);
      const ramGaugeVisible = await page.locator('text=/RAM|Memory/i').isVisible().catch(() => false);
      const diskGaugeVisible = await page.locator('text=/Disk|Storage/i').isVisible().catch(() => false);

      result.dataVisible = cpuGaugeVisible || ramGaugeVisible || diskGaugeVisible;

      // Capture T=0s screenshot
      await page.screenshot({
        path: getScreenshotPath(`asset-tab-09-telemetry-t0s-${getTimestamp()}.png`),
        fullPage: true
      });

      // Monitor network activity for 10 seconds
      const networkRequests: string[] = [];
      page.on('request', request => {
        const url = request.url();
        if (url.includes('telemetry') || url.includes('stream') || url.includes('notifications')) {
          networkRequests.push(`${request.method()} ${url}`);
        }
      });

      // Wait 10 seconds and observe
      await page.waitForTimeout(10000);

      // Capture T=10s screenshot
      await page.screenshot({
        path: getScreenshotPath(`asset-tab-09-telemetry-t10s-${getTimestamp()}.png`),
        fullPage: true
      });

      // Capture network tab screenshot (DevTools)
      // Note: Can't directly capture DevTools, but we have request logs

      // Analyze network requests
      const hasSSE = networkRequests.some(r => r.includes('stream'));
      const hasPolling = networkRequests.filter(r => r.includes('telemetry')).length > 1;

      let realTimeNotes = 'Real-time analysis: ';
      if (hasSSE) {
        realTimeNotes += 'SSE connection detected. ';
      } else if (hasPolling) {
        realTimeNotes += `Polling detected (${networkRequests.filter(r => r.includes('telemetry')).length} requests in 10s). `;
      } else {
        realTimeNotes += 'No real-time updates detected (static data). ';
      }

      result.notes = realTimeNotes + `Network requests: ${networkRequests.length}`;

      if (result.dataVisible && result.loadTime < MAX_TAB_LOAD_TIME && (hasSSE || hasPolling)) {
        result.status = 'PASS';
      } else if (result.dataVisible && (hasSSE || hasPolling)) {
        result.status = 'PASS_WITH_ISSUES';
        result.notes += ` | Slow load time: ${result.loadTime}ms`;
      } else if (result.dataVisible) {
        result.status = 'PASS_WITH_ISSUES';
        result.notes += ' | No real-time updates';
      }
    } catch (error) {
      result.notes = `Error: ${error}`;
    }

    result.consoleErrors = consoleErrors.filter(e => e.tab === currentTab).map(e => e.message);
    testResults.push(result);
  });

  test('Tab 10: Audit Log', async ({ page }) => {
    currentTab = 'Audit Log';
    const result: TabTestResult = {
      tabNumber: 10,
      tabName: 'Audit Log',
      loadTime: 0,
      dataVisible: false,
      interactionsWork: true,
      consoleErrors: [],
      status: 'FAIL',
      notes: ''
    };

    try {
      await page.goto(`${BASE_URL}/assets/${assetId}`, { waitUntil: 'networkidle' });

      result.loadTime = await measureLoadTime(page, async () => {
        await page.click('text=Audit Log');
        await waitForNoSpinner(page);
      });

      const tableVisible = await page.locator('.ant-table').isVisible().catch(() => false);
      const timestampVisible = await page.locator('text=/Timestamp|Date/i').isVisible().catch(() => false);
      const operationVisible = await page.locator('text=/Operation|Action/i').isVisible().catch(() => false);

      result.dataVisible = tableVisible || timestampVisible || operationVisible;

      // Test filter by operation type
      if (tableVisible) {
        try {
          const filterSelect = page.locator('.ant-select').first();
          if (await filterSelect.isVisible()) {
            await filterSelect.click();
            await page.waitForTimeout(500);
            result.interactionsWork = true;
          }
        } catch {
          result.interactionsWork = false;
        }
      }

      await page.screenshot({
        path: getScreenshotPath(`asset-tab-10-audit-log-${getTimestamp()}.png`),
        fullPage: true
      });

      if (result.dataVisible && result.loadTime < MAX_TAB_LOAD_TIME) {
        result.status = 'PASS';
      } else if (result.dataVisible) {
        result.status = 'PASS_WITH_ISSUES';
        result.notes = `Slow load time: ${result.loadTime}ms`;
      }
    } catch (error) {
      result.notes = `Error: ${error}`;
    }

    result.consoleErrors = consoleErrors.filter(e => e.tab === currentTab).map(e => e.message);
    testResults.push(result);
  });

  test('Tab 11: Deployments', async ({ page }) => {
    currentTab = 'Deployments';
    const result: TabTestResult = {
      tabNumber: 11,
      tabName: 'Deployments',
      loadTime: 0,
      dataVisible: false,
      interactionsWork: true,
      consoleErrors: [],
      status: 'FAIL',
      notes: ''
    };

    try {
      await page.goto(`${BASE_URL}/assets/${assetId}`, { waitUntil: 'networkidle' });

      result.loadTime = await measureLoadTime(page, async () => {
        await page.click('text=Deployments');
        await waitForNoSpinner(page);
      });

      const tableVisible = await page.locator('.ant-table').isVisible().catch(() => false);
      const deploymentVisible = await page.locator('text=/Deployment|Status|Patch/i').isVisible().catch(() => false);
      const emptyStateVisible = await page.locator('text=/No deployments|No data/i').isVisible().catch(() => false);

      result.dataVisible = tableVisible || deploymentVisible || emptyStateVisible;

      await page.screenshot({
        path: getScreenshotPath(`asset-tab-11-deployments-${getTimestamp()}.png`),
        fullPage: true
      });

      if (result.dataVisible && result.loadTime < MAX_TAB_LOAD_TIME) {
        result.status = 'PASS';
      } else if (result.dataVisible) {
        result.status = 'PASS_WITH_ISSUES';
        result.notes = `Slow load time: ${result.loadTime}ms`;
      }
    } catch (error) {
      result.notes = `Error: ${error}`;
    }

    result.consoleErrors = consoleErrors.filter(e => e.tab === currentTab).map(e => e.message);
    testResults.push(result);
  });

  test('Tab 12: System Errors', async ({ page }) => {
    currentTab = 'System Errors';
    const result: TabTestResult = {
      tabNumber: 12,
      tabName: 'System Errors',
      loadTime: 0,
      dataVisible: false,
      interactionsWork: true,
      consoleErrors: [],
      status: 'FAIL',
      notes: ''
    };

    try {
      await page.goto(`${BASE_URL}/assets/${assetId}`, { waitUntil: 'networkidle' });

      result.loadTime = await measureLoadTime(page, async () => {
        await page.click('text=System Errors');
        await waitForNoSpinner(page);
      });

      const tableVisible = await page.locator('.ant-table').isVisible().catch(() => false);
      const errorVisible = await page.locator('text=/Error|Severity|Message/i').isVisible().catch(() => false);
      const emptyStateVisible = await page.locator('text=/No errors|No data/i').isVisible().catch(() => false);

      result.dataVisible = tableVisible || errorVisible || emptyStateVisible;

      // Test filter by severity
      if (tableVisible) {
        try {
          const filterSelect = page.locator('.ant-select').first();
          if (await filterSelect.isVisible()) {
            await filterSelect.click();
            await page.waitForTimeout(500);
            result.interactionsWork = true;
          }
        } catch {
          result.interactionsWork = false;
        }
      }

      await page.screenshot({
        path: getScreenshotPath(`asset-tab-12-system-errors-${getTimestamp()}.png`),
        fullPage: true
      });

      if (result.dataVisible && result.loadTime < MAX_TAB_LOAD_TIME) {
        result.status = 'PASS';
      } else if (result.dataVisible) {
        result.status = 'PASS_WITH_ISSUES';
        result.notes = `Slow load time: ${result.loadTime}ms`;
      }
    } catch (error) {
      result.notes = `Error: ${error}`;
    }

    result.consoleErrors = consoleErrors.filter(e => e.tab === currentTab).map(e => e.message);
    testResults.push(result);
  });

  test.afterAll(async () => {
    // Generate report
    const reportPath = '/Users/shandesh/src/VS-code/PatchIQ/full-dev-sandy-v2/PHASE2_AGENTS11-14_ASSET_DETAIL_TABS_REPORT.md';

    const passCount = testResults.filter(r => r.status === 'PASS').length;
    const passWithIssuesCount = testResults.filter(r => r.status === 'PASS_WITH_ISSUES').length;
    const failCount = testResults.filter(r => r.status === 'FAIL').length;

    const avgLoadTime = testResults.length > 0
      ? testResults.reduce((sum, r) => sum + r.loadTime, 0) / testResults.length
      : 0;
    const slowestTab = testResults.length > 0
      ? testResults.reduce((slowest, r) => r.loadTime > slowest.loadTime ? r : slowest)
      : { tabName: 'N/A', loadTime: 0 };

    let report = `# Phase 2 Agents 11-14: Asset Detail - All 12 Tabs Test Report\n\n`;
    report += `**Date**: ${new Date().toISOString()}\n`;
    report += `**Asset ID Tested**: ${assetId}\n`;
    report += `**Frontend URL**: ${BASE_URL}\n\n`;

    report += `## Executive Summary\n\n`;
    report += `**Overall Status**: ${failCount === 0 ? (passWithIssuesCount > 0 ? '⚠️ PASS WITH ISSUES' : '✅ PASS') : '❌ FAIL'}\n\n`;
    report += `- ✅ Passed: ${passCount}/12 tabs\n`;
    report += `- ⚠️ Passed with Issues: ${passWithIssuesCount}/12 tabs\n`;
    report += `- ❌ Failed: ${failCount}/12 tabs\n\n`;

    report += `## Tab-by-Tab Results\n\n`;
    report += `| Tab # | Name | Load Time | Data? | Interactions | Console Errors | Status |\n`;
    report += `|-------|------|-----------|-------|--------------|----------------|--------|\n`;

    testResults.forEach(r => {
      const statusEmoji = r.status === 'PASS' ? '✅' : r.status === 'PASS_WITH_ISSUES' ? '⚠️' : '❌';
      report += `| ${r.tabNumber} | ${r.tabName} | ${r.loadTime}ms | ${r.dataVisible ? 'Yes' : 'No'} | ${r.interactionsWork ? 'Yes' : 'No'} | ${r.consoleErrors.length} | ${statusEmoji} ${r.status} |\n`;
    });

    report += `\n## Performance Metrics\n\n`;
    report += `- **Average Load Time**: ${avgLoadTime.toFixed(0)}ms\n`;
    report += `- **Target Load Time**: <2000ms (per instructions)\n`;
    report += `- **Acceptable Load Time**: <5000ms\n`;
    report += `- **Slowest Tab**: ${slowestTab.tabName} (${slowestTab.loadTime}ms)\n\n`;

    report += `## Real-Time Update Analysis (Telemetry Tab)\n\n`;
    const telemetryResult = testResults.find(r => r.tabNumber === 9);
    if (telemetryResult) {
      report += `**Status**: ${telemetryResult.status}\n\n`;
      report += `**Findings**: ${telemetryResult.notes}\n\n`;
      report += `**Screenshots**:\n`;
      report += `- T=0s: \`asset-tab-09-telemetry-t0s-*.png\`\n`;
      report += `- T=10s: \`asset-tab-09-telemetry-t10s-*.png\`\n\n`;
    }

    report += `## Console Error Summary\n\n`;
    const errorsByTab: { [key: string]: ConsoleError[] } = {};
    consoleErrors.forEach(e => {
      if (!errorsByTab[e.tab]) errorsByTab[e.tab] = [];
      errorsByTab[e.tab].push(e);
    });

    if (Object.keys(errorsByTab).length > 0) {
      report += `| Tab | Error Count | Sample Errors |\n`;
      report += `|-----|-------------|---------------|\n`;
      Object.entries(errorsByTab).forEach(([tab, errors]) => {
        const sample = errors.slice(0, 2).map(e => e.message.substring(0, 50)).join('; ');
        report += `| ${tab} | ${errors.length} | ${sample}... |\n`;
      });
    } else {
      report += `No console errors detected during testing.\n`;
    }

    report += `\n## Screenshots Captured\n\n`;
    const screenshots = fs.readdirSync(SCREENSHOT_DIR).filter(f => f.endsWith('.png'));
    report += `Total screenshots: ${screenshots.length}\n\n`;
    screenshots.forEach(s => {
      report += `- \`${s}\`\n`;
    });

    report += `\n## Bugs Found\n\n`;
    const bugs: string[] = [];
    testResults.forEach(r => {
      if (r.status === 'FAIL') {
        bugs.push(`**P1**: ${r.tabName} tab failed to load - ${r.notes}`);
      } else if (r.loadTime > 10000) {
        bugs.push(`**P2**: ${r.tabName} tab extremely slow (${r.loadTime}ms)`);
      } else if (r.loadTime > MAX_TAB_LOAD_TIME) {
        bugs.push(`**P3**: ${r.tabName} tab slower than acceptable (${r.loadTime}ms)`);
      }
      if (!r.interactionsWork) {
        bugs.push(`**P2**: ${r.tabName} tab interactions not working`);
      }
    });

    if (bugs.length > 0) {
      bugs.forEach(bug => report += `${bug}\n\n`);
    } else {
      report += `No critical bugs found.\n\n`;
    }

    report += `## Phase 1 Bug Impact Assessment\n\n`;
    report += `**Phase 1 Known Issues**:\n`;
    report += `- P1: Assets list takes 17.2 seconds to load\n`;
    report += `- P1: Table rows have aria-hidden="true" preventing clicks\n`;
    report += `- P1: Search input inaccessible/invisible\n\n`;
    report += `**Impact on Phase 2 Testing**:\n`;
    report += `- Asset list slow loading: ${testResults[0]?.notes?.includes('Error finding asset') ? 'Blocked initial navigation' : 'Handled with extended timeout'}\n`;
    report += `- Table row clicking: ${testResults[0]?.notes?.includes('direct navigation') ? 'Used direct URL navigation workaround' : 'Row clicks worked'}\n\n`;

    report += `## Overall Assessment\n\n`;
    if (failCount === 0 && passWithIssuesCount === 0) {
      report += `All 12 asset detail tabs are functioning correctly. Load times are acceptable, data displays properly, and interactions work as expected. Real-time telemetry updates are working.\n\n`;
    } else if (failCount === 0) {
      report += `All 12 tabs load successfully, but some have performance issues or minor interaction problems. No blocking bugs detected. Recommend optimizing slow-loading tabs.\n\n`;
    } else {
      report += `${failCount} tab(s) failed to load or had critical issues. These should be investigated and fixed before production deployment.\n\n`;
    }

    report += `## Recommendations\n\n`;
    report += `1. **Performance**: Optimize tabs with load times >2s\n`;
    report += `2. **Real-Time**: Ensure telemetry tab updates consistently\n`;
    report += `3. **Empty States**: Improve messaging for tabs with no data\n`;
    report += `4. **Console Errors**: Fix console errors to reduce noise\n`;
    report += `5. **Phase 1 Bugs**: Resolve assets list performance issues to improve overall UX\n\n`;

    report += `---\n`;
    report += `*Report generated by Phase 2 Agents 11-14 automated test suite*\n`;

    fs.writeFileSync(reportPath, report);
    console.log(`\n✅ Report generated: ${reportPath}`);
    console.log(`📊 Results: ${passCount} PASS, ${passWithIssuesCount} PASS WITH ISSUES, ${failCount} FAIL`);
  });
});
