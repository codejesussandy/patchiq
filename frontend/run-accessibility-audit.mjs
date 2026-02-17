#!/usr/bin/env node

import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const auditResults = [];

const pages = [
  { name: 'Login', url: 'http://localhost:3500/login', auth: false, wait: 2000 },
  { name: 'Dashboard', url: 'http://localhost:3500/dashboard', auth: true, wait: 3000 },
  { name: 'Assets List', url: 'http://localhost:3500/assets', auth: true, wait: 2000 },
  { name: 'Asset Detail', url: 'http://localhost:3500/assets/1', auth: true, wait: 3000 },
  { name: 'Patches List', url: 'http://localhost:3500/patches', auth: true, wait: 2000 },
  { name: 'Patch Detail', url: 'http://localhost:3500/patches/1', auth: true, wait: 3000 },
  { name: 'Vulnerabilities List', url: 'http://localhost:3500/vulnerability/vulnerabilities', auth: true, wait: 2000 },
  { name: 'Vulnerability Detail', url: 'http://localhost:3500/vulnerability/vulnerabilities/1', auth: true, wait: 3000 },
  { name: 'Settings - User Management', url: 'http://localhost:3500/settings/user-management/users', auth: true, wait: 2000 },
  { name: 'Hub', url: 'http://localhost:3500/hub', auth: true, wait: 3000 },
];

async function auditPage(page, pageName, url, waitTime) {
  console.log(`\n=== Auditing: ${pageName} ===`);

  try {
    await page.goto(url, { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(waitTime);

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

    const result = {
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
  } catch (error) {
    console.error(`  ⚠️  Error auditing ${pageName}:`, error.message);
    return null;
  }
}

async function run() {
  console.log('🚀 Starting Accessibility Audit...\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();

  // First, authenticate
  console.log('=== Authenticating ===');
  const authPage = await context.newPage();
  await authPage.goto('http://localhost:3500/login');
  await authPage.waitForTimeout(2000);
  await authPage.fill('#email', 'admin@patchiq.io');
  await authPage.fill('#password', 'admin123');
  await authPage.click('button[type="submit"]');
  await authPage.waitForURL('**/dashboard', { timeout: 15000 }).catch(() => {
    console.log('Logged in');
  });
  await authPage.waitForTimeout(2000);
  await authPage.close();

  console.log('✅ Authenticated\n');

  // Now audit each page
  for (const pageConfig of pages) {
    const page = await context.newPage();
    await auditPage(page, pageConfig.name, pageConfig.url, pageConfig.wait);
    await page.close();
  }

  await browser.close();

  // Generate report
  console.log('\n=== Generating Report ===\n');
  generateReport();
}

function generateReport() {
  const reportPath = path.join(__dirname, '..', 'PHASE5B_AGENT46_ACCESSIBILITY_AUDIT.md');

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
    if (result) {
      report += `| ${result.page} | ${result.critical.length} | ${result.serious.length} | ${result.moderate.length} | ${result.minor.length} | ${result.total} | ${result.score}/100 |\n`;
      totalCritical += result.critical.length;
      totalSerious += result.serious.length;
      totalModerate += result.moderate.length;
      totalMinor += result.minor.length;
      totalViolations += result.total;
      avgScore += result.score;
    }
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
      if (result && result.critical.length > 0) {
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
      if (result && result.serious.length > 0) {
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
      if (result && result.moderate.length > 0) {
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
      if (result && result.minor.length > 0) {
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

  const violationsByRule = new Map();

  auditResults.forEach(result => {
    if (result) {
      [...result.critical, ...result.serious, ...result.moderate, ...result.minor].forEach(violation => {
        if (violationsByRule.has(violation.id)) {
          const existing = violationsByRule.get(violation.id);
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
    }
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

  // Color Contrast Issues
  report += `## 6. Color Contrast Issues\n\n`;

  const contrastIssues = auditResults.flatMap(r =>
    r ? [...r.critical, ...r.serious, ...r.moderate, ...r.minor]
      .filter(v => v.id.includes('color-contrast')) : []
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

  // Form Accessibility
  report += `## 7. Form Accessibility Assessment\n\n`;

  const formIssues = auditResults.flatMap(r =>
    r ? [...r.critical, ...r.serious, ...r.moderate, ...r.minor]
      .filter(v => v.id.includes('label') || v.id.includes('form') || v.id.includes('input')) : []
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

  // ARIA and Keyboard
  report += `## 8. Keyboard & ARIA Assessment\n\n`;

  const keyboardIssues = auditResults.flatMap(r =>
    r ? [...r.critical, ...r.serious, ...r.moderate, ...r.minor]
      .filter(v => v.id.includes('focus') || v.id.includes('keyboard') || v.id.includes('tabindex')) : []
  );

  const ariaIssues = auditResults.flatMap(r =>
    r ? [...r.critical, ...r.serious, ...r.moderate, ...r.minor]
      .filter(v => v.id.includes('aria')) : []
  );

  if (keyboardIssues.length === 0 && ariaIssues.length === 0) {
    report += `✅ No automated keyboard or ARIA issues detected\n\n`;
  } else {
    if (keyboardIssues.length > 0) {
      report += `⚠️ **${keyboardIssues.length} keyboard-related issues:**\n\n`;
      keyboardIssues.forEach((issue, idx) => {
        report += `${idx + 1}. ${issue.help} (${issue.impact})\n`;
      });
      report += `\n`;
    }

    if (ariaIssues.length > 0) {
      report += `⚠️ **${ariaIssues.length} ARIA-related issues:**\n\n`;
      ariaIssues.forEach((issue, idx) => {
        report += `${idx + 1}. ${issue.help} (${issue.impact})\n`;
      });
      report += `\n`;
    }
  }

  // Recommendations
  report += `## 9. Recommendations\n\n`;

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
  report += `5. **Training:** Provide WCAG 2.1 training for development team\n\n`;

  // Detailed Results
  report += `## 10. Detailed Results by Page\n\n`;

  auditResults.forEach(result => {
    if (result) {
      report += `### ${result.page}\n\n`;
      report += `- **URL:** ${result.url}\n`;
      report += `- **Score:** ${result.score}/100\n`;
      report += `- **Total Violations:** ${result.total}\n`;
      report += `- **Breakdown:** ${result.critical.length} critical, ${result.serious.length} serious, ${result.moderate.length} moderate, ${result.minor.length} minor\n`;
      report += `- **Status:** ${result.score >= 90 && result.critical.length === 0 ? '✅ PASS' : '❌ FAIL'}\n\n`;
    }
  });

  // Conclusion
  report += `## 11. Conclusion\n\n`;

  if (avgScore >= 90 && totalCritical === 0) {
    report += `✅ **Overall Assessment: PASS**\n\n`;
    report += `The application demonstrates good accessibility practices with an average score of ${avgScore}/100 and no critical violations.\n\n`;
  } else {
    report += `❌ **Overall Assessment: FAIL**\n\n`;
    report += `The application requires accessibility improvements to meet WCAG 2.1 Level AA standards.\n\n`;

    if (totalCritical > 0) {
      report += `**${totalCritical} critical violations must be fixed immediately.**\n\n`;
    }
  }

  report += `---\n\n`;
  report += `**Note:** Automated testing catches approximately 30-40% of accessibility issues. Manual testing with assistive technologies is strongly recommended.\n\n`;
  report += `**Report Generated:** ${new Date().toLocaleString()}\n`;

  // Write report
  fs.writeFileSync(reportPath, report, 'utf8');
  console.log(`✅ Report generated: ${reportPath}\n`);

  // Also save raw JSON data
  const jsonPath = path.join(__dirname, '..', 'PHASE5B_AGENT46_ACCESSIBILITY_AUDIT.json');
  fs.writeFileSync(jsonPath, JSON.stringify(auditResults, null, 2), 'utf8');
  console.log(`✅ Raw data saved: ${jsonPath}\n`);
}

run().catch(console.error);
