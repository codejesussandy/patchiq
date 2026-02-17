import { test, Page, expect, Browser } from '@playwright/test';
import fs from 'fs';
import path from 'path';

interface ConsoleMessage {
  type: 'error' | 'warning' | 'log' | 'info';
  text: string;
  url: string;
  timestamp: string;
}

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const ADMIN_EMAIL = 'admin@patchiq.io';
const ADMIN_PASSWORD = 'admin123';

test('Phase 4 Agent 33: Comprehensive Console Error Audit', async ({ browser }) => {
  const allConsoleMessages: ConsoleMessage[] = [];
  const errorsByPage: Map<string, ConsoleMessage[]> = new Map();
  const warningsByPage: Map<string, ConsoleMessage[]> = new Map();

  const pages = [
    // Auth pages
    { url: '/login', name: 'Login' },
    { url: '/forgot-password', name: 'Forgot Password' },

    // Main pages
    { url: '/dashboard', name: 'Dashboard' },
    { url: '/assets', name: 'Assets List' },
    { url: '/patches', name: 'Patches List' },
    { url: '/patches/deployed', name: 'Deployed Patches' },
    { url: '/patches/test-approve', name: 'Test & Approve' },
    { url: '/patches/zero-touch', name: 'Zero Touch' },
    { url: '/patches/patch-jobs', name: 'Patch Jobs' },
    { url: '/patch-recommendations', name: 'Patch Recommendations' },
    { url: '/vulnerability/vulnerabilities', name: 'Vulnerabilities' },
    { url: '/vulnerability/manage-exception', name: 'Manage Exception' },
    { url: '/discovery', name: 'Discovery Overview' },
    { url: '/discovery/scan-profiles', name: 'Scan Profiles' },
    { url: '/discovery/scan-jobs', name: 'Scan Jobs' },
    { url: '/discovery/credentials', name: 'Credentials' },
    { url: '/assets/hub', name: 'Hub Packages' },
    { url: '/notifications', name: 'Notifications' },
    { url: '/reports', name: 'Reports' },

    // Settings pages
    { url: '/settings/user-management', name: 'User Management' },
    { url: '/settings/agent-management', name: 'Agent Management' },
    { url: '/settings/patch-management', name: 'Patch Management' },
    { url: '/settings/system-settings', name: 'System Settings' },
    { url: '/settings/integration', name: 'Integration' },
    { url: '/settings/organization', name: 'Organization' },
  ];

  // Create a page for logging in
  let page = await browser.newPage();

  page.on('console', (msg) => {
    const consoleMessage: ConsoleMessage = {
      type: msg.type() as any,
      text: msg.text(),
      url: page.url(),
      timestamp: new Date().toISOString(),
    };

    allConsoleMessages.push(consoleMessage);

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

  page.on('pageerror', (error) => {
    allConsoleMessages.push({
      type: 'error',
      text: `[PageError] ${error.message}`,
      url: page.url(),
      timestamp: new Date().toISOString(),
    });

    if (!errorsByPage.has(page.url())) {
      errorsByPage.set(page.url(), []);
    }
    errorsByPage.get(page.url())!.push({
      type: 'error',
      text: `[PageError] ${error.message}`,
      url: page.url(),
      timestamp: new Date().toISOString(),
    });
  });

  // Login
  console.log('[AUDIT] Logging in...');
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
  await page.fill('input[type="email"]', ADMIN_EMAIL);
  await page.fill('input[type="password"]', ADMIN_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForNavigation({ waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Visit each page
  for (const pageConfig of pages) {
    const fullUrl = `${BASE_URL}${pageConfig.url}`;
    console.log(`[AUDIT] Visiting: ${pageConfig.name} (${pageConfig.url})`);

    try {
      await page.goto(fullUrl, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(2000);

      // Try to interact with common elements
      await page.evaluate(() => {
        // Trigger any lazy-loaded content
        window.scrollTo(0, document.body.scrollHeight);
      });
      await page.waitForTimeout(1000);

      // Click buttons if available
      const buttons = await page.$$('button[type="submit"]');
      if (buttons.length > 0) {
        await buttons[0].hover().catch(() => {});
      }
    } catch (err) {
      console.log(`[AUDIT] Error visiting ${pageConfig.name}: ${err}`);
    }
  }

  await page.close();

  // Generate comprehensive report
  generateReport(allConsoleMessages, errorsByPage, warningsByPage);
});

function generateReport(
  allConsoleMessages: ConsoleMessage[],
  errorsByPage: Map<string, ConsoleMessage[]>,
  warningsByPage: Map<string, ConsoleMessage[]>
) {
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

  // Classify severity
  const criticalErrors = sortedErrors.filter(([msg]) =>
    /error|fail|crash|undefined|null|cannot|import|module/i.test(msg)
  );
  const highErrors = sortedErrors.filter(([msg]) =>
    /deprecated|warning|issue|problem|invalid/i.test(msg)
  );

  // Build report
  let report = `# Phase 4 Agent 33: Comprehensive Console Error Audit Report

## Executive Summary

- **Total Console Messages:** ${allConsoleMessages.length}
- **Total Unique Errors:** ${errorMap.size}
- **Total Unique Warnings:** ${warningMap.size}
- **Total Error Occurrences:** ${sortedErrors.reduce((sum, [_, count]) => sum + count, 0)}
- **Total Warning Occurrences:** ${sortedWarnings.reduce((sum, [_, count]) => sum + count, 0)}
- **Pages Audited:** ${errorsByPage.size + warningsByPage.size}
- **Critical Errors Found:** ${criticalErrors.length}
- **High-Priority Errors:** ${highErrors.length}

---

## Message Type Distribution

\`\`\`
Errors:   ${sortedErrors.reduce((sum, [_, count]) => sum + count, 0)}
Warnings: ${sortedWarnings.reduce((sum, [_, count]) => sum + count, 0)}
Total:    ${allConsoleMessages.length}
\`\`\`

---

## Error Inventory

### Top Errors by Frequency

| Rank | Error Message | Count | Pages Affected | Severity |
|------|---------------|-------|-----------------|----------|
`;

  sortedErrors.slice(0, 25).forEach((entry, idx) => {
    const [errorMsg, count] = entry;
    const affectedPages = errorMap
      .get(errorMsg)
      ?.map((msg) => {
        const url = new URL(msg.url);
        return url.pathname;
      })
      .filter((v, i, a) => a.indexOf(v) === i) || [];

    const severity = criticalErrors.some(([msg]) => msg === errorMsg)
      ? 'CRITICAL'
      : highErrors.some(([msg]) => msg === errorMsg)
      ? 'HIGH'
      : 'MEDIUM';

    const truncatedMsg = errorMsg
      .substring(0, 100)
      .replace(/\|/g, '\\|')
      .replace(/\n/g, ' ');
    report += `| ${idx + 1} | ${truncatedMsg} | ${count} | ${affectedPages.slice(0, 2).join(', ') || 'N/A'} | ${severity} |\n`;
  });

  report += `\n### Top Warnings by Frequency\n\n| Rank | Warning Message | Count | Pages Affected |\n|------|-----------------|-------|------------------|\n`;

  sortedWarnings.slice(0, 15).forEach((entry, idx) => {
    const [warningMsg, count] = entry;
    const affectedPages = warningMap
      .get(warningMsg)
      ?.map((msg) => {
        const url = new URL(msg.url);
        return url.pathname;
      })
      .filter((v, i, a) => a.indexOf(v) === i) || [];

    const truncatedMsg = warningMsg
      .substring(0, 100)
      .replace(/\|/g, '\\|')
      .replace(/\n/g, ' ');
    report += `| ${idx + 1} | ${truncatedMsg} | ${count} | ${affectedPages.slice(0, 2).join(', ') || 'N/A'} |\n`;
  });

  report += `\n---

## Error Analysis by Source

### React/Framework Errors
\`\`\`\n`;

  sortedErrors
    .filter(([msg]) =>
      /react|jsx|component|hook|state|effect|render/i.test(msg)
    )
    .slice(0, 5)
    .forEach(([msg, count]) => {
      report += `- [${count}x] ${msg.substring(0, 100)}\n`;
    });

  report += `\`\`\`\n\n### API/Network Errors\n\`\`\`\n`;

  sortedErrors
    .filter(([msg]) =>
      /fetch|api|404|500|network|request|response|axios/i.test(msg)
    )
    .slice(0, 5)
    .forEach(([msg, count]) => {
      report += `- [${count}x] ${msg.substring(0, 100)}\n`;
    });

  report += `\`\`\`\n\n### Third-Party Library Errors\n\`\`\`\n`;

  sortedErrors
    .filter(([msg]) =>
      /antd|ant-design|query|router|vite|node_modules/i.test(msg)
    )
    .slice(0, 5)
    .forEach(([msg, count]) => {
      report += `- [${count}x] ${msg.substring(0, 100)}\n`;
    });

  report += `\`\`\`\n\n### Custom Code Errors\n\`\`\`\n`;

  sortedErrors
    .filter(
      ([msg]) =>
        !/react|fetch|api|antd|vite|node_modules|404|500|network/i.test(msg)
    )
    .slice(0, 5)
    .forEach(([msg, count]) => {
      report += `- [${count}x] ${msg.substring(0, 100)}\n`;
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
    .slice(0, 15);

  if (pageErrorCounts.length === 0) {
    report += 'No pages with errors found.\n';
  } else {
    pageErrorCounts.forEach(({ url, count }) => {
      report += `- ${url}: ${count} errors\n`;
    });
  }

  report += `\`\`\`\n\n### Pages with Most Warnings\n\`\`\`\n`;

  const pageWarningCounts = Array.from(warningsByPage.entries())
    .map(([url, warnings]) => ({
      url: new URL(url).pathname,
      count: warnings.length,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);

  if (pageWarningCounts.length === 0) {
    report += 'No pages with warnings found.\n';
  } else {
    pageWarningCounts.forEach(({ url, count }) => {
      report += `- ${url}: ${count} warnings\n`;
    });
  }

  report += `\`\`\`\n\n---

## Error Classification

### By Severity

**Critical Errors (Blocking Functionality):**
\`\`\`\n`;
  if (criticalErrors.length === 0) {
    report += 'None found\n';
  } else {
    criticalErrors.slice(0, 10).forEach(([msg, count]) => {
      report += `- [${count}x] ${msg.substring(0, 80)}\n`;
    });
  }

  report += `\`\`\`\n\n**High-Priority Errors (UX Degradation):**\n\`\`\`\n`;
  if (highErrors.length === 0) {
    report += 'None found\n';
  } else {
    highErrors.slice(0, 10).forEach(([msg, count]) => {
      report += `- [${count}x] ${msg.substring(0, 80)}\n`;
    });
  }

  report += `\`\`\`\n\n**Medium-Priority Errors (Cosmetic):**\n\`\`\`\n`;
  const mediumErrors = sortedErrors.filter(
    ([msg]) =>
      !criticalErrors.some(([m]) => m === msg) &&
      !highErrors.some(([m]) => m === msg)
  );
  if (mediumErrors.length === 0) {
    report += 'None found\n';
  } else {
    mediumErrors.slice(0, 10).forEach(([msg, count]) => {
      report += `- [${count}x] ${msg.substring(0, 80)}\n`;
    });
  }

  report += `\`\`\`\n\n---

## Detailed Error Messages

### All Unique Errors (${sortedErrors.length} total)\n\n`;

  sortedErrors.forEach(([msg, count], idx) => {
    const pages = errorMap
      .get(msg)
      ?.map((m) => new URL(m.url).pathname)
      .filter((v, i, a) => a.indexOf(v) === i) || [];

    report += `#### ${idx + 1}. Error (${count}x)\n\n\`\`\`\n${msg}\n\`\`\`\n\nAffected Pages:\n`;
    if (pages.length === 0) {
      report += '- N/A\n';
    } else {
      pages.forEach((p) => {
        report += `- ${p}\n`;
      });
    }
    report += `\n`;
  });

  report += `---

## Detailed Warning Messages

### All Unique Warnings (${sortedWarnings.length} total)\n\n`;

  sortedWarnings.forEach(([msg, count], idx) => {
    const pages = warningMap
      .get(msg)
      ?.map((m) => new URL(m.url).pathname)
      .filter((v, i, a) => a.indexOf(v) === i) || [];

    report += `#### ${idx + 1}. Warning (${count}x)\n\n\`\`\`\n${msg}\n\`\`\`\n\nAffected Pages:\n`;
    if (pages.length === 0) {
      report += '- N/A\n';
    } else {
      pages.forEach((p) => {
        report += `- ${p}\n`;
      });
    }
    report += `\n`;
  });

  report += `---

## Recommendations

### Priority 1: Critical Issues
\`\`\`
${
  criticalErrors.length > 0
    ? criticalErrors
        .slice(0, 5)
        .map(([msg]) => `- Fix: ${msg.substring(0, 80)}`)
        .join('\n')
    : '✓ No critical issues found'
}
\`\`\`

### Priority 2: High-Impact Issues
\`\`\`
${
  highErrors.length > 0
    ? highErrors
        .slice(0, 5)
        .map(([msg]) => `- Investigate: ${msg.substring(0, 80)}`)
        .join('\n')
    : '✓ No high-impact issues found'
}
\`\`\`

### Priority 3: Technical Debt
- Review deprecated APIs
- Update third-party dependencies
- Add error boundaries
- Implement proper error logging

---

## Health Summary

| Category | Status | Notes |
|----------|--------|-------|
| Critical Errors | ${criticalErrors.length === 0 ? '✓ PASS' : '✘ FAIL'} | ${criticalErrors.length} critical issues |
| High-Priority Errors | ${highErrors.length === 0 ? '✓ PASS' : '⚠ WARN'} | ${highErrors.length} high-priority issues |
| Overall Health | ${sortedErrors.length === 0 && sortedWarnings.length === 0 ? '✓ EXCELLENT' : sortedErrors.length < 5 ? '✓ GOOD' : sortedErrors.length < 10 ? '⚠ WARNING' : '✘ NEEDS WORK'} | ${sortedErrors.length} errors, ${sortedWarnings.length} warnings |

---

## Test Coverage

Pages visited: ${Array.from(errorsByPage.keys())
    .concat(Array.from(warningsByPage.keys()))
    .map((url) => new URL(url).pathname)
    .filter((v, i, a) => a.indexOf(v) === i).length}

Total console messages collected: ${allConsoleMessages.length}

---

Generated: ${new Date().toISOString()}
`;

  const reportPath = path.join(process.cwd(), 'PHASE4_AGENT33_CONSOLE_ERROR_AUDIT.md');
  fs.writeFileSync(reportPath, report);
  console.log(`\n📄 Report generated: ${reportPath}`);

  // Also generate JSON for detailed analysis
  const jsonReport = {
    summary: {
      totalMessages: allConsoleMessages.length,
      totalUniqueErrors: errorMap.size,
      totalUniqueWarnings: warningMap.size,
      totalErrorOccurrences: sortedErrors.reduce((sum, [_, count]) => sum + count, 0),
      totalWarningOccurrences: sortedWarnings.reduce(
        (sum, [_, count]) => sum + count,
        0
      ),
      pagesAudited: errorsByPage.size + warningsByPage.size,
      criticalErrors: criticalErrors.length,
      highPriorityErrors: highErrors.length,
    },
    topErrors: sortedErrors.slice(0, 25).map(([msg, count]) => ({
      message: msg,
      count,
      severity: criticalErrors.some(([m]) => m === msg)
        ? 'CRITICAL'
        : highErrors.some(([m]) => m === msg)
        ? 'HIGH'
        : 'MEDIUM',
      affectedPages: errorMap
        .get(msg)
        ?.map((m) => new URL(m.url).pathname)
        .filter((v, i, a) => a.indexOf(v) === i),
    })),
    topWarnings: sortedWarnings.slice(0, 15).map(([msg, count]) => ({
      message: msg,
      count,
      affectedPages: warningMap
        .get(msg)
        ?.map((m) => new URL(m.url).pathname)
        .filter((v, i, a) => a.indexOf(v) === i),
    })),
    errorsByPage: Object.fromEntries(
      Array.from(errorsByPage.entries()).map(([url, errors]) => [
        new URL(url).pathname,
        errors.length,
      ])
    ),
    warningsByPage: Object.fromEntries(
      Array.from(warningsByPage.entries()).map(([url, warnings]) => [
        new URL(url).pathname,
        warnings.length,
      ])
    ),
    allMessages: allConsoleMessages,
  };

  const jsonPath = path.join(process.cwd(), 'PHASE4_AGENT33_CONSOLE_ERROR_AUDIT.json');
  fs.writeFileSync(jsonPath, JSON.stringify(jsonReport, null, 2));
  console.log(`📊 JSON report generated: ${jsonPath}\n`);
}
