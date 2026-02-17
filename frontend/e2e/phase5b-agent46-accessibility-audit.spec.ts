import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import * as fs from 'fs';
import * as path from 'path';

interface AxeViolation {
  id: string;
  impact: 'critical' | 'serious' | 'moderate' | 'minor';
  description: string;
  help: string;
  helpUrl: string;
  nodes: Array<{
    html: string;
    target: string[];
    failureSummary: string;
  }>;
}

interface PageAuditResult {
  page: string;
  url: string;
  critical: AxeViolation[];
  serious: AxeViolation[];
  moderate: AxeViolation[];
  minor: AxeViolation[];
  total: number;
  score: number;
  timestamp: string;
}

const auditResults: PageAuditResult[] = [];

// Test with authenticated state
test.use({ storageState: 'auth.json' });

async function auditPage(
  page: any,
  pageName: string,
  url: string,
  additionalWait?: () => Promise<void>
) {
  console.log(`\n=== Auditing: ${pageName} ===`);

  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

  // Additional wait if needed (for dynamic content)
  if (additionalWait) {
    await additionalWait();
  } else {
    await page.waitForTimeout(2000);
  }

  // Run axe accessibility scan
  const accessibilityScanResults = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();

  // Categorize violations by impact
  const critical = accessibilityScanResults.violations.filter(v => v.impact === 'critical');
  const serious = accessibilityScanResults.violations.filter(v => v.impact === 'serious');
  const moderate = accessibilityScanResults.violations.filter(v => v.impact === 'moderate');
  const minor = accessibilityScanResults.violations.filter(v => v.impact === 'minor');

  const total = accessibilityScanResults.violations.length;

  // Calculate score: 100 - (Critical*10 + Serious*5 + Moderate*2 + Minor*1)
  const score = Math.max(0, 100 - (
    critical.length * 10 +
    serious.length * 5 +
    moderate.length * 2 +
    minor.length * 1
  ));

  const result: PageAuditResult = {
    page: pageName,
    url,
    critical,
    serious,
    moderate,
    minor,
    total,
    score,
    timestamp: new Date().toISOString()
  };

  auditResults.push(result);

  console.log(`  Critical: ${critical.length}`);
  console.log(`  Serious: ${serious.length}`);
  console.log(`  Moderate: ${moderate.length}`);
  console.log(`  Minor: ${minor.length}`);
  console.log(`  Total: ${total}`);
  console.log(`  Score: ${score}/100`);

  return result;
}

test.describe('Phase 5B - Agent 46: Accessibility Audit', () => {

  test('1. Login Page - /login', async ({ browser }) => {
    test.setTimeout(60000);
    const context = await browser.newContext();
    const page = await context.newPage();

    await auditPage(page, 'Login', 'http://localhost:5173/login');

    await context.close();
  });

  test('2. Dashboard - /dashboard', async ({ page }) => {
    test.setTimeout(60000);
    await auditPage(page, 'Dashboard', 'http://localhost:5173/dashboard', async () => {
      // Wait for dashboard widgets to load
      await page.waitForTimeout(3000);
    });
  });

  test('3. Assets List - /assets', async ({ page }) => {
    test.setTimeout(60000);
    await auditPage(page, 'Assets List', 'http://localhost:5173/assets', async () => {
      // Wait for table to load
      await page.waitForSelector('.ant-table', { timeout: 10000 }).catch(() => {});
      await page.waitForTimeout(2000);
    });
  });

  test('4. Asset Detail - /assets/:id', async ({ page }) => {
    test.setTimeout(60000);
    // First get an asset ID
    await page.goto('http://localhost:5173/assets', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Try to click first asset
    const firstAssetLink = page.locator('a[href*="/assets/"]').first();
    const assetUrl = await firstAssetLink.getAttribute('href').catch(() => null);

    if (assetUrl) {
      await auditPage(page, 'Asset Detail', `http://localhost:5173${assetUrl}`, async () => {
        // Wait for tabs to load
        await page.waitForTimeout(3000);
      });
    } else {
      console.log('  ⚠️  No asset found, skipping detail page');
    }
  });

  test('5. Patches List - /patches', async ({ page }) => {
    test.setTimeout(60000);
    await auditPage(page, 'Patches List', 'http://localhost:5173/patches', async () => {
      // Wait for table to load
      await page.waitForSelector('.ant-table', { timeout: 10000 }).catch(() => {});
      await page.waitForTimeout(2000);
    });
  });

  test('6. Patch Detail - /patches/:id', async ({ page }) => {
    test.setTimeout(60000);
    // First get a patch ID
    await page.goto('http://localhost:5173/patches', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Try to click first patch
    const firstPatchLink = page.locator('a[href*="/patches/"]').first();
    const patchUrl = await firstPatchLink.getAttribute('href').catch(() => null);

    if (patchUrl) {
      await auditPage(page, 'Patch Detail', `http://localhost:5173${patchUrl}`, async () => {
        await page.waitForTimeout(3000);
      });
    } else {
      console.log('  ⚠️  No patch found, skipping detail page');
    }
  });

  test('7. Vulnerabilities - /vulnerability/vulnerabilities', async ({ page }) => {
    test.setTimeout(60000);
    await auditPage(page, 'Vulnerabilities List', 'http://localhost:5173/vulnerability/vulnerabilities', async () => {
      // Wait for table to load
      await page.waitForSelector('.ant-table', { timeout: 10000 }).catch(() => {});
      await page.waitForTimeout(2000);
    });
  });

  test('8. Vulnerability Detail - /vulnerability/vulnerabilities/:id', async ({ page }) => {
    test.setTimeout(60000);
    // First get a vulnerability ID
    await page.goto('http://localhost:5173/vulnerability/vulnerabilities', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Try to click first vulnerability
    const firstVulnLink = page.locator('a[href*="/vulnerability/vulnerabilities/"]').first();
    const vulnUrl = await firstVulnLink.getAttribute('href').catch(() => null);

    if (vulnUrl) {
      await auditPage(page, 'Vulnerability Detail', `http://localhost:5173${vulnUrl}`, async () => {
        await page.waitForTimeout(3000);
      });
    } else {
      console.log('  ⚠️  No vulnerability found, skipping detail page');
    }
  });

  test('9. Settings - User Management - /settings/user-management/users', async ({ page }) => {
    test.setTimeout(60000);
    await auditPage(page, 'Settings - User Management', 'http://localhost:5173/settings/user-management/users', async () => {
      // Wait for table to load
      await page.waitForSelector('.ant-table', { timeout: 10000 }).catch(() => {});
      await page.waitForTimeout(2000);
    });
  });

  test('10. Hub - /hub', async ({ page }) => {
    test.setTimeout(60000);
    await auditPage(page, 'Hub', 'http://localhost:5173/hub', async () => {
      // Wait for hub content to load
      await page.waitForTimeout(3000);
    });
  });

});

// After all tests, generate the report
test.afterAll(async () => {
  console.log('\n=== Generating Accessibility Audit Report ===\n');

  const reportPath = path.join(process.cwd(), '..', 'PHASE5B_AGENT46_ACCESSIBILITY_AUDIT.md');

  // Generate markdown report
  let report = `# PHASE5B - Agent 46: Accessibility Audit Report

**Generated:** ${new Date().toISOString()}
**Standard:** WCAG 2.1 Level AA
**Tool:** axe-core via Playwright

## Executive Summary

`;

  // Summary Table
  report += `### Summary Table

| Page | Critical | Serious | Moderate | Minor | Total | Score |
|------|----------|---------|----------|-------|-------|-------|
`;

  let totalCritical = 0;
  let totalSerious = 0;
  let totalModerate = 0;
  let totalMinor = 0;
  let totalViolations = 0;
  let avgScore = 0;

  auditResults.forEach(result => {
    report += `| ${result.page} | ${result.critical.length} | ${result.serious.length} | ${result.moderate.length} | ${result.minor.length} | ${result.total} | ${result.score}/100 |\n`;
    totalCritical += result.critical.length;
    totalSerious += result.serious.length;
    totalModerate += result.moderate.length;
    totalMinor += result.minor.length;
    totalViolations += result.total;
    avgScore += result.score;
  });

  avgScore = Math.round(avgScore / auditResults.length);

  report += `| **TOTAL** | **${totalCritical}** | **${totalSerious}** | **${totalModerate}** | **${totalMinor}** | **${totalViolations}** | **${avgScore}/100** |\n\n`;

  // Overall Assessment
  const passStatus = avgScore >= 90 && totalCritical === 0 ? '✅ PASS' : '❌ FAIL';
  report += `### Overall Assessment: ${passStatus}\n\n`;
  report += `- **Total Violations:** ${totalViolations}\n`;
  report += `- **Average Score:** ${avgScore}/100 (Target: >= 90)\n`;
  report += `- **Critical Issues:** ${totalCritical} (Target: 0)\n`;
  report += `- **Status:** ${totalCritical === 0 ? '✅ No blocking issues' : '❌ Has blocking issues'}\n\n`;

  report += `---\n\n`;

  // Critical Violations
  report += `## 1. Critical Violations (Target: 0)\n\n`;

  if (totalCritical === 0) {
    report += `✅ **No critical violations found!**\n\n`;
  } else {
    auditResults.forEach(result => {
      if (result.critical.length > 0) {
        report += `### ${result.page}\n\n`;
        result.critical.forEach((violation, idx) => {
          report += `#### ${idx + 1}. ${violation.help}\n\n`;
          report += `- **Rule ID:** ${violation.id}\n`;
          report += `- **Impact:** Critical\n`;
          report += `- **Description:** ${violation.description}\n`;
          report += `- **WCAG Criteria:** [View Details](${violation.helpUrl})\n`;
          report += `- **Affected Elements:** ${violation.nodes.length}\n\n`;

          violation.nodes.slice(0, 3).forEach((node, nodeIdx) => {
            report += `**Element ${nodeIdx + 1}:**\n`;
            report += `- **Selector:** \`${node.target.join(' ')}\`\n`;
            report += `- **HTML:** \`${node.html.substring(0, 100)}${node.html.length > 100 ? '...' : ''}\`\n`;
            report += `- **Issue:** ${node.failureSummary}\n\n`;
          });

          if (violation.nodes.length > 3) {
            report += `_... and ${violation.nodes.length - 3} more elements_\n\n`;
          }
        });
      }
    });
  }

  // Serious Violations
  report += `## 2. Serious Violations (Target: < 5 total)\n\n`;

  if (totalSerious === 0) {
    report += `✅ **No serious violations found!**\n\n`;
  } else {
    auditResults.forEach(result => {
      if (result.serious.length > 0) {
        report += `### ${result.page}\n\n`;
        result.serious.forEach((violation, idx) => {
          report += `#### ${idx + 1}. ${violation.help}\n\n`;
          report += `- **Rule ID:** ${violation.id}\n`;
          report += `- **Impact:** Serious\n`;
          report += `- **Description:** ${violation.description}\n`;
          report += `- **WCAG Criteria:** [View Details](${violation.helpUrl})\n`;
          report += `- **Affected Elements:** ${violation.nodes.length}\n\n`;

          violation.nodes.slice(0, 2).forEach((node, nodeIdx) => {
            report += `**Element ${nodeIdx + 1}:**\n`;
            report += `- **Selector:** \`${node.target.join(' ')}\`\n`;
            report += `- **HTML:** \`${node.html.substring(0, 100)}${node.html.length > 100 ? '...' : ''}\`\n`;
            report += `- **Issue:** ${node.failureSummary}\n\n`;
          });

          if (violation.nodes.length > 2) {
            report += `_... and ${violation.nodes.length - 2} more elements_\n\n`;
          }
        });
      }
    });
  }

  // Moderate Violations
  report += `## 3. Moderate Violations\n\n`;

  if (totalModerate === 0) {
    report += `✅ **No moderate violations found!**\n\n`;
  } else {
    report += `**Total Moderate Issues:** ${totalModerate}\n\n`;

    auditResults.forEach(result => {
      if (result.moderate.length > 0) {
        report += `### ${result.page} (${result.moderate.length} issues)\n\n`;
        result.moderate.forEach((violation, idx) => {
          report += `${idx + 1}. **${violation.help}** - ${violation.nodes.length} element(s) - [Fix](${violation.helpUrl})\n`;
        });
        report += `\n`;
      }
    });
  }

  // Minor Violations
  report += `## 4. Minor Violations\n\n`;

  if (totalMinor === 0) {
    report += `✅ **No minor violations found!**\n\n`;
  } else {
    report += `**Total Minor Issues:** ${totalMinor}\n\n`;

    auditResults.forEach(result => {
      if (result.minor.length > 0) {
        report += `### ${result.page} (${result.minor.length} issues)\n\n`;
        result.minor.forEach((violation, idx) => {
          report += `${idx + 1}. **${violation.help}** - ${violation.nodes.length} element(s)\n`;
        });
        report += `\n`;
      }
    });
  }

  // Common Issues Summary
  report += `## 5. Common Issues Summary\n\n`;

  // Aggregate all violations by rule ID
  const violationsByRule = new Map<string, { count: number; impact: string; help: string; helpUrl: string }>();

  auditResults.forEach(result => {
    [...result.critical, ...result.serious, ...result.moderate, ...result.minor].forEach(violation => {
      if (violationsByRule.has(violation.id)) {
        const existing = violationsByRule.get(violation.id)!;
        existing.count += violation.nodes.length;
      } else {
        violationsByRule.set(violation.id, {
          count: violation.nodes.length,
          impact: violation.impact,
          help: violation.help,
          helpUrl: violation.helpUrl
        });
      }
    });
  });

  const sortedViolations = Array.from(violationsByRule.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10);

  if (sortedViolations.length > 0) {
    report += `### Top 10 Most Common Issues\n\n`;
    report += `| Issue | Impact | Occurrences | Fix |\n`;
    report += `|-------|--------|-------------|-----|\n`;

    sortedViolations.forEach(([ruleId, data]) => {
      report += `| ${data.help} | ${data.impact} | ${data.count} | [Link](${data.helpUrl}) |\n`;
    });
    report += `\n`;
  }

  // Keyboard Navigation Assessment
  report += `## 6. Keyboard Navigation Assessment\n\n`;
  report += `**Automated checks only** - Manual testing recommended\n\n`;

  const keyboardIssues = auditResults.flatMap(r =>
    [...r.critical, ...r.serious, ...r.moderate, ...r.minor]
      .filter(v => v.id.includes('focus') || v.id.includes('keyboard') || v.id.includes('tabindex'))
  );

  if (keyboardIssues.length === 0) {
    report += `✅ No automated keyboard navigation issues detected\n\n`;
  } else {
    report += `⚠️ **${keyboardIssues.length} keyboard-related issues detected:**\n\n`;
    keyboardIssues.forEach((issue, idx) => {
      report += `${idx + 1}. ${issue.help} (${issue.impact})\n`;
    });
    report += `\n`;
  }

  report += `**Manual Testing Needed:**\n`;
  report += `- [ ] Focus indicators visible on all interactive elements\n`;
  report += `- [ ] Tab order follows logical reading order\n`;
  report += `- [ ] No keyboard traps (can escape all components)\n`;
  report += `- [ ] Skip links present for main navigation\n`;
  report += `- [ ] Modal focus management (trap focus, return on close)\n`;
  report += `- [ ] Dropdown and menu keyboard controls\n\n`;

  // Form Accessibility
  report += `## 7. Form Accessibility Assessment\n\n`;

  const formIssues = auditResults.flatMap(r =>
    [...r.critical, ...r.serious, ...r.moderate, ...r.minor]
      .filter(v => v.id.includes('label') || v.id.includes('form') || v.id.includes('input'))
  );

  if (formIssues.length === 0) {
    report += `✅ No automated form accessibility issues detected\n\n`;
  } else {
    report += `⚠️ **${formIssues.length} form-related issues detected:**\n\n`;
    formIssues.forEach((issue, idx) => {
      report += `${idx + 1}. ${issue.help} - ${issue.nodes.length} element(s)\n`;
    });
    report += `\n`;
  }

  report += `**Checklist:**\n`;
  report += `- [${formIssues.filter(i => i.id.includes('label')).length === 0 ? 'x' : ' '}] All form inputs have associated labels\n`;
  report += `- [ ] Error messages associated with fields (needs manual test)\n`;
  report += `- [ ] Required fields indicated (needs manual test)\n`;
  report += `- [ ] Form validation accessible (needs manual test)\n\n`;

  // Color Contrast Issues
  report += `## 8. Color Contrast Issues\n\n`;

  const contrastIssues = auditResults.flatMap(r =>
    [...r.critical, ...r.serious, ...r.moderate, ...r.minor]
      .filter(v => v.id.includes('color-contrast'))
  );

  if (contrastIssues.length === 0) {
    report += `✅ **No color contrast violations detected!**\n\n`;
  } else {
    report += `⚠️ **${contrastIssues.reduce((sum, i) => sum + i.nodes.length, 0)} elements with color contrast issues:**\n\n`;

    contrastIssues.forEach((issue, idx) => {
      report += `### Issue ${idx + 1}: ${issue.help}\n\n`;
      issue.nodes.slice(0, 5).forEach((node, nodeIdx) => {
        report += `${nodeIdx + 1}. \`${node.target.join(' ')}\`\n`;
        report += `   - ${node.failureSummary}\n`;
      });
      if (issue.nodes.length > 5) {
        report += `\n_... and ${issue.nodes.length - 5} more elements_\n`;
      }
      report += `\n`;
    });

    report += `**Required Ratios:**\n`;
    report += `- Normal text: 4.5:1\n`;
    report += `- Large text (18pt+ or 14pt+ bold): 3:1\n`;
    report += `- UI components and graphics: 3:1\n\n`;
  }

  // ARIA Usage Assessment
  report += `## 9. ARIA Usage Assessment\n\n`;

  const ariaIssues = auditResults.flatMap(r =>
    [...r.critical, ...r.serious, ...r.moderate, ...r.minor]
      .filter(v => v.id.includes('aria'))
  );

  if (ariaIssues.length === 0) {
    report += `✅ No ARIA-related violations detected\n\n`;
  } else {
    report += `⚠️ **${ariaIssues.length} ARIA-related issues detected:**\n\n`;
    ariaIssues.forEach((issue, idx) => {
      report += `${idx + 1}. **${issue.help}** (${issue.impact})\n`;
      report += `   - ${issue.description}\n`;
      report += `   - Affected: ${issue.nodes.length} element(s)\n\n`;
    });
  }

  report += `**ARIA Best Practices:**\n`;
  report += `- Use semantic HTML first (prefer \`<button>\` over \`<div role="button">\`)\n`;
  report += `- ARIA attributes must have valid values\n`;
  report += `- ARIA roles must be appropriate for the element\n`;
  report += `- Required ARIA attributes must be present\n`;
  report += `- ARIA state values must be valid\n\n`;

  // Recommendations
  report += `## 10. Recommendations\n\n`;

  if (totalCritical > 0) {
    report += `### 🔴 Critical Priority\n\n`;
    report += `1. **Fix all ${totalCritical} critical violations immediately** - These are blocking issues for users with disabilities\n`;
    report += `2. Run manual testing with screen readers (NVDA, JAWS, VoiceOver)\n`;
    report += `3. Test keyboard navigation on all critical paths\n\n`;
  }

  if (totalSerious > 5) {
    report += `### 🟡 High Priority\n\n`;
    report += `1. Address ${totalSerious} serious violations (Target: < 5)\n`;
    report += `2. Focus on form labels, color contrast, and heading structure\n`;
    report += `3. Implement automated accessibility testing in CI/CD\n\n`;
  }

  report += `### General Recommendations\n\n`;
  report += `1. **Automated Testing:** Integrate \`@axe-core/playwright\` into CI/CD pipeline\n`;
  report += `2. **Manual Testing:** Conduct screen reader testing (catches ~60-70% of remaining issues)\n`;
  report += `3. **Keyboard Testing:** Test all interactive elements with keyboard only\n`;
  report += `4. **Design System:** Add accessibility guidelines to component library\n`;
  report += `5. **Training:** Provide WCAG 2.1 training for development team\n`;
  report += `6. **Documentation:** Document accessibility requirements in PRD/tickets\n`;
  report += `7. **Regular Audits:** Schedule quarterly accessibility audits\n\n`;

  // Detailed Results
  report += `## 11. Detailed Results by Page\n\n`;

  auditResults.forEach(result => {
    report += `### ${result.page}\n\n`;
    report += `- **URL:** ${result.url}\n`;
    report += `- **Score:** ${result.score}/100\n`;
    report += `- **Total Violations:** ${result.total}\n`;
    report += `- **Breakdown:** ${result.critical.length} critical, ${result.serious.length} serious, ${result.moderate.length} moderate, ${result.minor.length} minor\n`;
    report += `- **Status:** ${result.score >= 90 && result.critical.length === 0 ? '✅ PASS' : '❌ FAIL'}\n\n`;
  });

  // Conclusion
  report += `## 12. Conclusion\n\n`;

  if (avgScore >= 90 && totalCritical === 0) {
    report += `✅ **Overall Assessment: PASS**\n\n`;
    report += `The application demonstrates good accessibility practices with an average score of ${avgScore}/100 and no critical violations. `;
    report += `Continue to address moderate and minor issues to improve further.\n\n`;
  } else {
    report += `❌ **Overall Assessment: FAIL**\n\n`;
    report += `The application requires accessibility improvements to meet WCAG 2.1 Level AA standards. `;

    if (totalCritical > 0) {
      report += `**${totalCritical} critical violations must be fixed immediately.** `;
    }

    if (avgScore < 90) {
      report += `The average score of ${avgScore}/100 is below the target of 90. `;
    }

    report += `\n\nFollow the recommendations above to remediate identified issues.\n\n`;
  }

  report += `---\n\n`;
  report += `**Note:** Automated testing catches approximately 30-40% of accessibility issues. Manual testing with assistive technologies is strongly recommended to ensure full WCAG 2.1 AA compliance.\n\n`;
  report += `**Testing Tool:** axe-core v${require('axe-core/package.json').version} via @axe-core/playwright\n`;
  report += `**Report Generated:** ${new Date().toLocaleString()}\n`;

  // Write report
  fs.writeFileSync(reportPath, report, 'utf8');
  console.log(`\n✅ Report generated: ${reportPath}\n`);

  // Also save raw JSON data
  const jsonPath = path.join(process.cwd(), '..', 'PHASE5B_AGENT46_ACCESSIBILITY_AUDIT.json');
  fs.writeFileSync(jsonPath, JSON.stringify(auditResults, null, 2), 'utf8');
  console.log(`✅ Raw data saved: ${jsonPath}\n`);
});
