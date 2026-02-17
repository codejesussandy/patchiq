import { test, Page, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

interface ConsoleMessage {
  type: 'error' | 'warning' | 'log' | 'info';
  text: string;
  url: string;
  timestamp: string;
}

const BASE_URL = 'http://localhost:5173';

test('Phase 4 Agent 33: Console Audit with Existing Auth', async ({
  page,
  context,
}) => {
  const allConsoleMessages: ConsoleMessage[] = [];
  const errorsByPage: Map<string, ConsoleMessage[]> = new Map();
  const warningsByPage: Map<string, ConsoleMessage[]> = new Map();

  // Setup console listener
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

  const pagesToVisit = [
    { url: '/dashboard', name: 'Dashboard', wait: 2000 },
    { url: '/assets', name: 'Assets List', wait: 2000 },
    { url: '/patches', name: 'Patches List', wait: 2000 },
    { url: '/patches/deployed', name: 'Deployed Patches', wait: 2000 },
    { url: '/patches/test-approve', name: 'Test & Approve', wait: 2000 },
    { url: '/patches/zero-touch', name: 'Zero Touch', wait: 2000 },
    { url: '/patches/patch-jobs', name: 'Patch Jobs', wait: 2000 },
    { url: '/patch-recommendations', name: 'Patch Recommendations', wait: 2000 },
    { url: '/vulnerability/vulnerabilities', name: 'Vulnerabilities', wait: 2000 },
    { url: '/vulnerability/manage-exception', name: 'Manage Exception', wait: 2000 },
    { url: '/discovery', name: 'Discovery Overview', wait: 2000 },
    { url: '/discovery/scan-profiles', name: 'Scan Profiles', wait: 2000 },
    { url: '/discovery/scan-jobs', name: 'Scan Jobs', wait: 2000 },
    { url: '/discovery/credentials', name: 'Credentials', wait: 2000 },
    { url: '/assets/hub', name: 'Hub Packages', wait: 2000 },
    { url: '/notifications', name: 'Notifications', wait: 2000 },
    { url: '/reports', name: 'Reports', wait: 2000 },
    { url: '/settings/user-management', name: 'User Management', wait: 2000 },
    { url: '/settings/agent-management', name: 'Agent Management', wait: 2000 },
    { url: '/settings/patch-management', name: 'Patch Management', wait: 2000 },
    { url: '/settings/system-settings', name: 'System Settings', wait: 2000 },
    { url: '/settings/integration', name: 'Integration', wait: 2000 },
    { url: '/settings/organization', name: 'Organization', wait: 2000 },
  ];

  for (const pageConfig of pagesToVisit) {
    const fullUrl = `${BASE_URL}${pageConfig.url}`;
    console.log(`[AUDIT] Visiting: ${pageConfig.name} (${pageConfig.url})`);

    try {
      await page.goto(fullUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });
      await page.waitForTimeout(pageConfig.wait);

      // Scroll to trigger lazy-loaded content
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      await page.waitForTimeout(500);
    } catch (err: any) {
      console.log(`[AUDIT] Error visiting ${pageConfig.name}: ${err.message}`);
    }
  }

  // Generate report
  generateReport(allConsoleMessages, errorsByPage, warningsByPage);
});

function generateReport(
  allConsoleMessages: ConsoleMessage[],
  errorsByPage: Map<string, ConsoleMessage[]>,
  warningsByPage: Map<string, ConsoleMessage[]>
) {
  // Filter out Vite and React DevTools messages
  const filteredMessages = allConsoleMessages.filter(
    (msg) =>
      !msg.text.includes('[vite]') &&
      !msg.text.includes('React DevTools') &&
      !msg.text.includes('Download the React DevTools')
  );

  // Categorize errors
  const errorMap = new Map<string, ConsoleMessage[]>();
  const warningMap = new Map<string, ConsoleMessage[]>();
  const errorTypes = new Map<string, number>();
  const warningTypes = new Map<string, number>();

  filteredMessages.forEach((msg) => {
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
    /error|fail|crash|undefined|cannot read|null|import|module|uncaught/i.test(msg)
  );
  const highErrors = sortedErrors.filter(([msg]) =>
    /deprecated|warning|issue|invalid|500|404|failed|rejected/i.test(msg)
  );

  // Build report
  let report = `# Phase 4 Agent 33: Comprehensive Console Error Audit Report

## Executive Summary

- **Total Console Messages Collected:** ${filteredMessages.length}
- **Total Unique Errors:** ${errorMap.size}
- **Total Unique Warnings:** ${warningMap.size}
- **Total Error Occurrences:** ${sortedErrors.reduce((sum, [_, count]) => sum + count, 0)}
- **Total Warning Occurrences:** ${sortedWarnings.reduce((sum, [_, count]) => sum + count, 0)}
- **Pages Audited:** ${errorsByPage.size + warningsByPage.size}
- **Critical Errors:** ${criticalErrors.length}
- **High-Priority Errors:** ${highErrors.length}

**Status:** ${sortedErrors.length === 0 ? '✓ No errors found' : '⚠ Errors detected'}

---

## Error Inventory

### Top Errors by Frequency

| Rank | Error Message | Count | Pages | Severity |
|------|---------------|-------|-------|----------|
`;

  if (sortedErrors.length === 0) {
    report += '| - | No errors detected | - | - | - |\n';
  } else {
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
        .substring(0, 90)
        .replace(/\|/g, '\\|')
        .replace(/\n/g, ' ');
      report += `| ${idx + 1} | \`${truncatedMsg}\` | ${count} | ${affectedPages.slice(0, 1).join(', ') || 'N/A'} | ${severity} |\n`;
    });
  }

  report += `\n### Top Warnings by Frequency\n\n| Rank | Warning Message | Count | Pages |\n|------|-----------------|-------|-------|\n`;

  if (sortedWarnings.length === 0) {
    report += '| - | No warnings detected | - | - |\n';
  } else {
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
        .substring(0, 90)
        .replace(/\|/g, '\\|')
        .replace(/\n/g, ' ');
      report += `| ${idx + 1} | \`${truncatedMsg}\` | ${count} | ${affectedPages.slice(0, 1).join(', ') || 'N/A'} |\n`;
    });
  }

  report += `\n---

## Error Analysis

### Errors by Source\n\n`;

  const reactErrors = sortedErrors.filter(([msg]) =>
    /react|jsx|component|hook|state|effect|render/i.test(msg)
  );
  const apiErrors = sortedErrors.filter(([msg]) =>
    /fetch|api|404|500|network|request|response|axios|timeout/i.test(msg)
  );
  const thirdPartyErrors = sortedErrors.filter(([msg]) =>
    /antd|ant-design|query|router|vite|node_modules/i.test(msg)
  );
  const customErrors = sortedErrors.filter(
    ([msg]) =>
      !reactErrors.some(([m]) => m === msg) &&
      !apiErrors.some(([m]) => m === msg) &&
      !thirdPartyErrors.some(([m]) => m === msg)
  );

  report += `- **React/Framework Errors:** ${reactErrors.length}\n`;
  report += `- **API/Network Errors:** ${apiErrors.length}\n`;
  report += `- **Third-Party Library Errors:** ${thirdPartyErrors.length}\n`;
  report += `- **Custom Code Errors:** ${customErrors.length}\n`;

  report += `\n### React Errors\n\`\`\`\n`;
  if (reactErrors.length === 0) {
    report += 'None\n';
  } else {
    reactErrors.slice(0, 5).forEach(([msg, count]) => {
      report += `- [${count}x] ${msg.substring(0, 90)}\n`;
    });
  }

  report += `\`\`\`\n\n### API/Network Errors\n\`\`\`\n`;
  if (apiErrors.length === 0) {
    report += 'None\n';
  } else {
    apiErrors.slice(0, 5).forEach(([msg, count]) => {
      report += `- [${count}x] ${msg.substring(0, 90)}\n`;
    });
  }

  report += `\`\`\`\n\n### Third-Party Library Errors\n\`\`\`\n`;
  if (thirdPartyErrors.length === 0) {
    report += 'None\n';
  } else {
    thirdPartyErrors.slice(0, 5).forEach(([msg, count]) => {
      report += `- [${count}x] ${msg.substring(0, 90)}\n`;
    });
  }

  report += `\`\`\`\n\n### Custom Code Errors\n\`\`\`\n`;
  if (customErrors.length === 0) {
    report += 'None\n';
  } else {
    customErrors.slice(0, 5).forEach(([msg, count]) => {
      report += `- [${count}x] ${msg.substring(0, 90)}\n`;
    });
  }

  report += `\`\`\`\n\n---

## Pages Analysis

### Pages with Most Errors\n\n`;

  const pageErrorCounts = Array.from(errorsByPage.entries())
    .map(([url, errors]) => ({
      url: new URL(url).pathname,
      count: errors.length,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);

  if (pageErrorCounts.length === 0) {
    report += 'No pages with errors.\n\n';
  } else {
    report += '| Page | Error Count |\n|------|-------------|\n';
    pageErrorCounts.forEach(({ url, count }) => {
      report += `| \`${url}\` | ${count} |\n`;
    });
    report += '\n';
  }

  report += `### Pages with Most Warnings\n\n`;

  const pageWarningCounts = Array.from(warningsByPage.entries())
    .map(([url, warnings]) => ({
      url: new URL(url).pathname,
      count: warnings.length,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);

  if (pageWarningCounts.length === 0) {
    report += 'No pages with warnings.\n\n';
  } else {
    report += '| Page | Warning Count |\n|------|---------------|\n';
    pageWarningCounts.forEach(({ url, count }) => {
      report += `| \`${url}\` | ${count} |\n`;
    });
    report += '\n';
  }

  report += `---

## Error Classification

### By Severity

**Critical Errors (Blocking Functionality):** ${criticalErrors.length}
\`\`\`\n`;
  if (criticalErrors.length === 0) {
    report += '✓ None found\n';
  } else {
    criticalErrors.slice(0, 10).forEach(([msg, count]) => {
      report += `- [${count}x] ${msg.substring(0, 85)}\n`;
    });
  }

  report += `\`\`\`\n\n**High-Priority Errors (UX Degradation):** ${highErrors.length}\n\`\`\`\n`;
  if (highErrors.length === 0) {
    report += '✓ None found\n';
  } else {
    highErrors.slice(0, 10).forEach(([msg, count]) => {
      report += `- [${count}x] ${msg.substring(0, 85)}\n`;
    });
  }

  const mediumErrors = sortedErrors.filter(
    ([msg]) =>
      !criticalErrors.some(([m]) => m === msg) &&
      !highErrors.some(([m]) => m === msg)
  );
  report += `\`\`\`\n\n**Medium-Priority Errors (Cosmetic):** ${mediumErrors.length}\n\`\`\`\n`;
  if (mediumErrors.length === 0) {
    report += '✓ None found\n';
  } else {
    mediumErrors.slice(0, 10).forEach(([msg, count]) => {
      report += `- [${count}x] ${msg.substring(0, 85)}\n`;
    });
  }

  report += `\`\`\`\n\n---

## Detailed Error Messages

All unique errors found (${sortedErrors.length} total):

\n`;

  sortedErrors.forEach(([msg, count], idx) => {
    const pages = errorMap
      .get(msg)
      ?.map((m) => new URL(m.url).pathname)
      .filter((v, i, a) => a.indexOf(v) === i) || [];

    report += `### ${idx + 1}. ${msg} *(${count} occurrences)*\n\n`;
    report += `**Affected Pages:**\n`;
    if (pages.length === 0) {
      report += `- Unknown\n`;
    } else {
      pages.forEach((p) => {
        report += `- \`${p}\`\n`;
      });
    }
    report += `\n`;
  });

  report += `---

## Detailed Warning Messages

All unique warnings found (${sortedWarnings.length} total):

\n`;

  sortedWarnings.forEach(([msg, count], idx) => {
    const pages = warningMap
      .get(msg)
      ?.map((m) => new URL(m.url).pathname)
      .filter((v, i, a) => a.indexOf(v) === i) || [];

    report += `### ${idx + 1}. ${msg} *(${count} occurrences)*\n\n`;
    report += `**Affected Pages:**\n`;
    if (pages.length === 0) {
      report += `- Unknown\n`;
    } else {
      pages.forEach((p) => {
        report += `- \`${p}\`\n`;
      });
    }
    report += `\n`;
  });

  report += `---

## Recommendations

### Priority 1: Critical Issues
${
  criticalErrors.length > 0
    ? criticalErrors
        .slice(0, 5)
        .map(([msg]) => `- **Fix:** ${msg.substring(0, 85)}`)
        .join('\n')
    : '✓ No critical issues found'
}

### Priority 2: High-Impact Issues
${
  highErrors.length > 0
    ? highErrors
        .slice(0, 5)
        .map(([msg]) => `- **Investigate:** ${msg.substring(0, 85)}`)
        .join('\n')
    : '✓ No high-impact issues found'
}

### Priority 3: Technical Debt
- Review deprecated APIs
- Update third-party dependencies
- Add error boundaries for better error handling
- Implement comprehensive error logging with Sentry or similar

---

## Health Summary

| Category | Status | Details |
|----------|--------|---------|
| Critical Errors | ${criticalErrors.length === 0 ? '✅ PASS' : '❌ FAIL'} | ${criticalErrors.length} critical issues |
| High-Priority Errors | ${highErrors.length === 0 ? '✅ PASS' : '⚠️ WARN'} | ${highErrors.length} high-priority issues |
| Overall Health | ${sortedErrors.length === 0 && sortedWarnings.length === 0 ? '✅ EXCELLENT' : sortedErrors.length < 5 ? '✅ GOOD' : sortedErrors.length < 10 ? '⚠️ WARNING' : '❌ NEEDS WORK'} | ${sortedErrors.length} errors, ${sortedWarnings.length} warnings |

---

## Test Coverage Summary

- **Pages Audited:** 23
- **Console Messages Collected:** ${filteredMessages.length}
- **Unique Errors:** ${errorMap.size}
- **Unique Warnings:** ${warningMap.size}

---

Generated: ${new Date().toISOString()}
`;

  const reportPath = path.join(process.cwd(), 'PHASE4_AGENT33_CONSOLE_ERROR_AUDIT.md');
  fs.writeFileSync(reportPath, report);
  console.log(`\n📄 Report saved: ${reportPath}`);

  // Generate JSON report
  const jsonReport = {
    summary: {
      totalMessages: filteredMessages.length,
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
      mediumErrors: mediumErrors.length,
    },
    topErrors: sortedErrors.slice(0, 25),
    topWarnings: sortedWarnings.slice(0, 15),
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
    reactErrors: reactErrors.map(([msg, count]) => ({ message: msg, count })),
    apiErrors: apiErrors.map(([msg, count]) => ({ message: msg, count })),
    thirdPartyErrors: thirdPartyErrors.map(([msg, count]) => ({
      message: msg,
      count,
    })),
    customErrors: customErrors.map(([msg, count]) => ({ message: msg, count })),
  };

  const jsonPath = path.join(process.cwd(), 'PHASE4_AGENT33_CONSOLE_ERROR_AUDIT.json');
  fs.writeFileSync(jsonPath, JSON.stringify(jsonReport, null, 2));
  console.log(`📊 JSON report saved: ${jsonPath}\n`);
}
