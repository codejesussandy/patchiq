import { test, Page, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

interface ConsoleMessage {
  type: 'error' | 'warning' | 'log' | 'info';
  text: string;
  url: string;
  timestamp: string;
  stacktrace?: string;
}

interface PageTest {
  url: string;
  name: string;
  actions?: Array<{
    name: string;
    action: (page: Page) => Promise<void>;
  }>;
}

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const ADMIN_EMAIL = 'admin@patchiq.io';
const ADMIN_PASSWORD = 'admin123';

let allConsoleMessages: ConsoleMessage[] = [];
let errorsByPage: Map<string, ConsoleMessage[]> = new Map();
let warningsByPage: Map<string, ConsoleMessage[]> = new Map();

test.describe('Phase 4 Agent 33: Comprehensive Console Error Audit', () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();

    // Setup console listener
    page.on('console', (msg) => {
      const consoleMessage: ConsoleMessage = {
        type: msg.type() as any,
        text: msg.text(),
        url: page.url(),
        timestamp: new Date().toISOString(),
        stacktrace: msg.location().url,
      };

      allConsoleMessages.push(consoleMessage);

      // Track by page
      if (msg.type() === 'error') {
        if (!errorsByPage.has(page.url())) {
          errorsByPage.set(page.url(), []);
        }
        errorsByPage.get(page.url())!.push(consoleMessage);
      } else if (msg.type() === 'warning') {
        if (!warningsByPage.has(page.url())) {
          warningsByPage.set(page.url(), []);
        }
        warningsByPage.get(page.url())!.push(consoleMessage);
      }
    });

    // Handle page errors
    page.on('pageerror', (error) => {
      allConsoleMessages.push({
        type: 'error',
        text: error.message,
        url: page.url(),
        timestamp: new Date().toISOString(),
        stacktrace: error.stack,
      });
    });

    // Login first
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForNavigation();
  });

  test.afterAll(async () => {
    if (page) {
      await page.close();
    }

    // Generate report
    generateReport();
  });

  // Authentication Pages
  test('visit /login', async () => {
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');
    await new Promise(r => setTimeout(r, 2000));
  });

  test('visit /forgot-password', async () => {
    await page.goto(`${BASE_URL}/forgot-password`);
    await page.waitForLoadState('networkidle');
    await new Promise(r => setTimeout(r, 2000));
  });

  // Main Pages
  test('visit /dashboard', async () => {
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForLoadState('networkidle');
    await new Promise(r => setTimeout(r, 3000));

    // Click some interactive elements
    await page.click('[data-testid="dashboard-cards"]').catch(() => {});
    await new Promise(r => setTimeout(r, 1000));
  });

  test('visit /assets (list)', async () => {
    await page.goto(`${BASE_URL}/assets`);
    await page.waitForLoadState('networkidle');
    await new Promise(r => setTimeout(r, 3000));

    // Try search/filter
    await page.click('input[placeholder*="search"]').catch(() => {});
    await page.fill('input[placeholder*="search"]', 'test').catch(() => {});
    await new Promise(r => setTimeout(r, 1500));
  });

  test('visit /assets/:id (detail - first asset)', async () => {
    await page.goto(`${BASE_URL}/assets`);
    await page.waitForLoadState('networkidle');
    await new Promise(r => setTimeout(r, 2000));

    // Click first asset
    const firstAsset = await page.locator('tr').first().locator('a').first();
    const href = await firstAsset.getAttribute('href').catch(() => null);

    if (href && href.includes('/assets/')) {
      await page.goto(`${BASE_URL}${href}`);
      await page.waitForLoadState('networkidle');
      await new Promise(r => setTimeout(r, 3000));

      // Test tabs
      await page.click('a[role="tab"]').catch(() => {});
      await new Promise(r => setTimeout(r, 1500));
    }
  });

  test('visit /patches (list)', async () => {
    await page.goto(`${BASE_URL}/patches`);
    await page.waitForLoadState('networkidle');
    await new Promise(r => setTimeout(r, 3000));

    // Try filter/search
    await page.click('input[placeholder*="search"]').catch(() => {});
    await page.fill('input[placeholder*="search"]', 'test').catch(() => {});
    await new Promise(r => setTimeout(r, 1500));
  });

  test('visit /patches/:id (detail - first patch)', async () => {
    await page.goto(`${BASE_URL}/patches`);
    await page.waitForLoadState('networkidle');
    await new Promise(r => setTimeout(r, 2000));

    // Click first patch
    const firstPatch = await page.locator('tr').first().locator('a').first();
    const href = await firstPatch.getAttribute('href').catch(() => null);

    if (href && href.includes('/patches/')) {
      await page.goto(`${BASE_URL}${href}`);
      await page.waitForLoadState('networkidle');
      await new Promise(r => setTimeout(r, 3000));
    }
  });

  test('visit /patches/deployed', async () => {
    await page.goto(`${BASE_URL}/patches/deployed`);
    await page.waitForLoadState('networkidle');
    await new Promise(r => setTimeout(r, 3000));
  });

  test('visit /patches/test-approve', async () => {
    await page.goto(`${BASE_URL}/patches/test-approve`);
    await page.waitForLoadState('networkidle');
    await new Promise(r => setTimeout(r, 3000));
  });

  test('visit /patches/zero-touch', async () => {
    await page.goto(`${BASE_URL}/patches/zero-touch`);
    await page.waitForLoadState('networkidle');
    await new Promise(r => setTimeout(r, 3000));
  });

  test('visit /patches/patch-jobs', async () => {
    await page.goto(`${BASE_URL}/patches/patch-jobs`);
    await page.waitForLoadState('networkidle');
    await new Promise(r => setTimeout(r, 3000));
  });

  test('visit /patch-recommendations', async () => {
    await page.goto(`${BASE_URL}/patch-recommendations`);
    await page.waitForLoadState('networkidle');
    await new Promise(r => setTimeout(r, 3000));
  });

  test('visit /vulnerability/vulnerabilities', async () => {
    await page.goto(`${BASE_URL}/vulnerability/vulnerabilities`);
    await page.waitForLoadState('networkidle');
    await new Promise(r => setTimeout(r, 3000));

    // Try filter
    await page.click('input[placeholder*="search"]').catch(() => {});
    await page.fill('input[placeholder*="search"]', 'test').catch(() => {});
    await new Promise(r => setTimeout(r, 1500));
  });

  test('visit /vulnerability/:id (detail - first vulnerability)', async () => {
    await page.goto(`${BASE_URL}/vulnerability/vulnerabilities`);
    await page.waitForLoadState('networkidle');
    await new Promise(r => setTimeout(r, 2000));

    // Click first vulnerability
    const firstVuln = await page.locator('tr').first().locator('a').first();
    const href = await firstVuln.getAttribute('href').catch(() => null);

    if (href && href.includes('/vulnerability/')) {
      await page.goto(`${BASE_URL}${href}`);
      await page.waitForLoadState('networkidle');
      await new Promise(r => setTimeout(r, 3000));
    }
  });

  test('visit /vulnerability/manage-exception', async () => {
    await page.goto(`${BASE_URL}/vulnerability/manage-exception`);
    await page.waitForLoadState('networkidle');
    await new Promise(r => setTimeout(r, 3000));
  });

  test('visit /discovery (overview)', async () => {
    await page.goto(`${BASE_URL}/discovery`);
    await page.waitForLoadState('networkidle');
    await new Promise(r => setTimeout(r, 3000));
  });

  test('visit /discovery/scan-profiles', async () => {
    await page.goto(`${BASE_URL}/discovery/scan-profiles`);
    await page.waitForLoadState('networkidle');
    await new Promise(r => setTimeout(r, 3000));
  });

  test('visit /discovery/scan-jobs', async () => {
    await page.goto(`${BASE_URL}/discovery/scan-jobs`);
    await page.waitForLoadState('networkidle');
    await new Promise(r => setTimeout(r, 3000));
  });

  test('visit /discovery/credentials', async () => {
    await page.goto(`${BASE_URL}/discovery/credentials`);
    await page.waitForLoadState('networkidle');
    await new Promise(r => setTimeout(r, 3000));
  });

  test('visit /assets/hub (packages)', async () => {
    await page.goto(`${BASE_URL}/assets/hub`);
    await page.waitForLoadState('networkidle');
    await new Promise(r => setTimeout(r, 3000));

    // Try search
    await page.click('input[placeholder*="search"]').catch(() => {});
    await page.fill('input[placeholder*="search"]', 'test').catch(() => {});
    await new Promise(r => setTimeout(r, 1500));
  });

  test('visit /notifications', async () => {
    await page.goto(`${BASE_URL}/notifications`);
    await page.waitForLoadState('networkidle');
    await new Promise(r => setTimeout(r, 3000));
  });

  test('visit /reports', async () => {
    await page.goto(`${BASE_URL}/reports`);
    await page.waitForLoadState('networkidle');
    await new Promise(r => setTimeout(r, 3000));
  });

  // Settings Pages
  test('visit /settings/user-management', async () => {
    await page.goto(`${BASE_URL}/settings/user-management`);
    await page.waitForLoadState('networkidle');
    await new Promise(r => setTimeout(r, 3000));
  });

  test('visit /settings/agent-management', async () => {
    await page.goto(`${BASE_URL}/settings/agent-management`);
    await page.waitForLoadState('networkidle');
    await new Promise(r => setTimeout(r, 3000));
  });

  test('visit /settings/patch-management', async () => {
    await page.goto(`${BASE_URL}/settings/patch-management`);
    await page.waitForLoadState('networkidle');
    await new Promise(r => setTimeout(r, 3000));
  });

  test('visit /settings/system-settings', async () => {
    await page.goto(`${BASE_URL}/settings/system-settings`);
    await page.waitForLoadState('networkidle');
    await new Promise(r => setTimeout(r, 3000));
  });

  test('visit /settings/integration', async () => {
    await page.goto(`${BASE_URL}/settings/integration`);
    await page.waitForLoadState('networkidle');
    await new Promise(r => setTimeout(r, 3000));
  });

  test('visit /settings/organization', async () => {
    await page.goto(`${BASE_URL}/settings/organization`);
    await page.waitForLoadState('networkidle');
    await new Promise(r => setTimeout(r, 3000));
  });
});

// Generate comprehensive report
function generateReport() {
  // Categorize errors
  const errorMap = new Map<string, ConsoleMessage[]>();
  const warningMap = new Map<string, ConsoleMessage[]>();
  const errorTypes = new Map<string, number>();
  const warningTypes = new Map<string, number>();

  allConsoleMessages.forEach((msg) => {
    if (msg.type === 'error') {
      if (!errorMap.has(msg.text)) {
        errorMap.set(msg.text, []);
      }
      errorMap.get(msg.text)!.push(msg);
      errorTypes.set(msg.text, (errorTypes.get(msg.text) || 0) + 1);
    } else if (msg.type === 'warning') {
      if (!warningMap.has(msg.text)) {
        warningMap.set(msg.text, []);
      }
      warningMap.get(msg.text)!.push(msg);
      warningTypes.set(msg.text, (warningTypes.get(msg.text) || 0) + 1);
    }
  });

  // Sort by frequency
  const sortedErrors = Array.from(errorTypes.entries())
    .sort((a, b) => b[1] - a[1]);
  const sortedWarnings = Array.from(warningTypes.entries())
    .sort((a, b) => b[1] - a[1]);

  // Build report
  let report = `# Phase 4 Agent 33: Comprehensive Console Error Audit Report

## Executive Summary

- **Total Console Messages:** ${allConsoleMessages.length}
- **Total Unique Errors:** ${errorMap.size}
- **Total Unique Warnings:** ${warningMap.size}
- **Total Error Occurrences:** ${sortedErrors.reduce((sum, [_, count]) => sum + count, 0)}
- **Total Warning Occurrences:** ${sortedWarnings.reduce((sum, [_, count]) => sum + count, 0)}
- **Pages Audited:** ${errorsByPage.size + warningsByPage.size}

---

## Error Inventory

### Top Errors by Frequency

| Rank | Error Message | Type | Count | Pages Affected | First Occurrence |
|------|---------------|------|-------|-----------------|------------------|
`;

  sortedErrors.slice(0, 20).forEach((entry, idx) => {
    const [errorMsg, count] = entry;
    const affectedPages = errorMap
      .get(errorMsg)
      ?.map((msg) => new URL(msg.url).pathname)
      .filter((v, i, a) => a.indexOf(v) === i) || [];

    const truncatedMsg = errorMsg.substring(0, 80).replace(/\|/g, '\\|');
    report += `| ${idx + 1} | ${truncatedMsg}... | Error | ${count} | ${affectedPages.slice(0, 3).join(', ')} | ${errorMap.get(errorMsg)?.[0].timestamp} |\n`;
  });

  report += `\n### Top Warnings by Frequency\n\n| Rank | Warning Message | Type | Count | Pages Affected | First Occurrence |\n|------|-----------------|------|-------|-----------------|------------------|\n`;

  sortedWarnings.slice(0, 10).forEach((entry, idx) => {
    const [warningMsg, count] = entry;
    const affectedPages = warningMap
      .get(warningMsg)
      ?.map((msg) => new URL(msg.url).pathname)
      .filter((v, i, a) => a.indexOf(v) === i) || [];

    const truncatedMsg = warningMsg.substring(0, 80).replace(/\|/g, '\\|');
    report += `| ${idx + 1} | ${truncatedMsg}... | Warning | ${count} | ${affectedPages.slice(0, 3).join(', ')} | ${warningMap.get(warningMsg)?.[0].timestamp} |\n`;
  });

  report += `\n---

## Error Analysis by Source

### React Errors
\`\`\`
`;

  sortedErrors
    .filter(([msg]) => msg.includes('React') || msg.includes('JSX'))
    .slice(0, 5)
    .forEach(([msg, count]) => {
      report += `- ${msg}: ${count} occurrences\n`;
    });

  report += `\`\`\`\n\n### API/Network Errors\n\`\`\`\n`;

  sortedErrors
    .filter(([msg]) => msg.includes('fetch') || msg.includes('API') || msg.includes('404') || msg.includes('500'))
    .slice(0, 5)
    .forEach(([msg, count]) => {
      report += `- ${msg}: ${count} occurrences\n`;
    });

  report += `\`\`\`\n\n### Third-Party Library Errors\n\`\`\`\n`;

  sortedErrors
    .filter(([msg]) => msg.includes('antd') || msg.includes('ant-design') || msg.includes('query'))
    .slice(0, 5)
    .forEach(([msg, count]) => {
      report += `- ${msg}: ${count} occurrences\n`;
    });

  report += `\`\`\`\n\n---

## Pages Analysis

### Pages with Most Errors

\`\`\`\n`;

  const pageErrorCounts = Array.from(errorsByPage.entries())
    .map(([url, errors]) => ({
      url: new URL(url).pathname,
      count: errors.length,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  pageErrorCounts.forEach(({ url, count }) => {
    report += `- ${url}: ${count} errors\n`;
  });

  report += `\`\`\`\n\n### Pages with Most Warnings\n\`\`\`\n`;

  const pageWarningCounts = Array.from(warningsByPage.entries())
    .map(([url, warnings]) => ({
      url: new URL(url).pathname,
      count: warnings.length,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  pageWarningCounts.forEach(({ url, count }) => {
    report += `- ${url}: ${count} warnings\n`;
  });

  report += `\`\`\`\n\n---

## Detailed Error Messages

### All Unique Errors\n\n`;

  sortedErrors.forEach(([msg, count]) => {
    const pages = errorMap
      .get(msg)
      ?.map((m) => new URL(m.url).pathname)
      .filter((v, i, a) => a.indexOf(v) === i) || [];

    report += `#### Error: ${count}x\n\n\`\`\`\n${msg}\n\`\`\`\n\nAffected Pages:\n`;
    pages.forEach((p) => {
      report += `- ${p}\n`;
    });
    report += `\n`;
  });

  report += `---

## Summary Statistics

- **Critical Errors (blocking functionality):** TBD - requires manual review
- **High-Priority Errors (UX degradation):** TBD - requires manual review
- **Medium-Priority Errors (cosmetic issues):** TBD - requires manual review
- **Low-Priority Warnings (informational):** ${warningMap.size}

---

## Recommendations

1. **Immediate Action Required:**
   - Review and fix top 5 most frequent errors
   - Address any errors preventing page loading

2. **Short-term (Sprint):**
   - Fix API integration errors
   - Resolve React warning patterns
   - Clean up third-party library conflicts

3. **Long-term (Quality):**
   - Implement stricter error handling
   - Add error boundary components
   - Improve logging for debugging
   - Add error monitoring (Sentry/similar)

---

## Full Console Log (JSON)

\`\`\`json
${JSON.stringify(allConsoleMessages, null, 2)}
\`\`\`

---

Generated: ${new Date().toISOString()}
`;

  const reportPath = path.join(process.cwd(), 'PHASE4_AGENT33_CONSOLE_ERROR_AUDIT.md');
  fs.writeFileSync(reportPath, report);
  console.log(`Report generated: ${reportPath}`);

  // Also generate JSON for detailed analysis
  const jsonReport = {
    summary: {
      totalMessages: allConsoleMessages.length,
      totalUniqueErrors: errorMap.size,
      totalUniqueWarnings: warningMap.size,
      totalErrorOccurrences: sortedErrors.reduce((sum, [_, count]) => sum + count, 0),
      totalWarningOccurrences: sortedWarnings.reduce((sum, [_, count]) => sum + count, 0),
      pagesAudited: errorsByPage.size + warningsByPage.size,
    },
    topErrors: sortedErrors.slice(0, 20).map(([msg, count]) => ({
      message: msg,
      count,
      affectedPages: errorMap
        .get(msg)
        ?.map((m) => new URL(m.url).pathname)
        .filter((v, i, a) => a.indexOf(v) === i),
    })),
    topWarnings: sortedWarnings.slice(0, 10).map(([msg, count]) => ({
      message: msg,
      count,
      affectedPages: warningMap
        .get(msg)
        ?.map((m) => new URL(m.url).pathname)
        .filter((v, i, a) => a.indexOf(v) === i),
    })),
    allMessages: allConsoleMessages,
  };

  const jsonPath = path.join(process.cwd(), 'PHASE4_AGENT33_CONSOLE_ERROR_AUDIT.json');
  fs.writeFileSync(jsonPath, JSON.stringify(jsonReport, null, 2));
  console.log(`JSON report generated: ${jsonPath}`);
}
