import { test, expect } from '@playwright/test';
import * as fs from 'fs';

const BASE_URL = 'http://localhost:5173';

interface ButtonRecord {
  pageUrl: string;
  pageName: string;
  buttonCount: number;
  buttonsByVariant: {
    [key: string]: Array<{
      text: string;
      classes: string[];
      styles: {
        backgroundColor: string;
        color: string;
        height: string;
        padding: string;
        borderRadius: string;
        fontSize: string;
        fontWeight: string;
      };
    }>;
  };
  totalVariations: {
    backgroundColors: Set<string>;
    heights: Set<string>;
    borderRadii: Set<string>;
    fontSizes: Set<string>;
    paddings: Set<string>;
  };
}

test.describe('Enhanced Button & Toggle Audit', () => {
  test.use({ storageState: 'auth.json' });

  test('audit buttons across all pages and generate report', async ({ page }) => {
    const results: ButtonRecord[] = [];

    const pages = [
      { name: 'Dashboard', url: '/dashboard' },
      { name: 'All Assets', url: '/assets' },
      { name: 'All Patches', url: '/patches' },
      { name: 'Vulnerabilities', url: '/vulnerabilities' },
      { name: 'Patch Deployments', url: '/deployments/patches' },
      { name: 'Discovery', url: '/discovery' },
      { name: 'Patch Jobs', url: '/jobs/patches' },
      { name: 'Security Policies', url: '/jobs/policies' },
      { name: 'Organization Settings', url: '/settings/organization' },
      { name: 'User Management', url: '/settings/users' },
      { name: 'System Settings', url: '/settings/system' },
      { name: 'Email Configuration', url: '/settings/mail' },
      { name: 'Agent Settings', url: '/settings/agents' },
      { name: 'Patch Management Settings', url: '/settings/patch-management' },
      { name: 'Agent Hub', url: '/hub/packages' },
    ];

    for (const pageInfo of pages) {
      try {
        await page.goto(`${BASE_URL}${pageInfo.url}`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(500);

        const buttonData = await page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button'));

          const variants: { [key: string]: any[] } = {
            'ant-btn-primary': [],
            'ant-btn-default': [],
            'ant-btn-danger': [],
            'ant-btn-dashed': [],
            'ant-btn-link': [],
            'ant-btn-text': [],
            'custom': [],
          };

          const allBackgrounds = new Set<string>();
          const allHeights = new Set<string>();
          const allBorderRadii = new Set<string>();
          const allFontSizes = new Set<string>();
          const allPaddings = new Set<string>();

          buttons.forEach((btn) => {
            const styles = window.getComputedStyle(btn);
            const btnData = {
              text: btn.textContent?.trim().substring(0, 40) || '(empty)',
              classes: Array.from(btn.classList),
              styles: {
                backgroundColor: styles.backgroundColor,
                color: styles.color,
                height: styles.height,
                padding: styles.padding,
                borderRadius: styles.borderRadius,
                fontSize: styles.fontSize,
                fontWeight: styles.fontWeight,
              },
            };

            allBackgrounds.add(btnData.styles.backgroundColor);
            allHeights.add(btnData.styles.height);
            allBorderRadii.add(btnData.styles.borderRadius);
            allFontSizes.add(btnData.styles.fontSize);
            allPaddings.add(btnData.styles.padding);

            // Categorize
            if (btn.classList.contains('ant-btn-primary')) {
              variants['ant-btn-primary'].push(btnData);
            } else if (btn.classList.contains('ant-btn-danger')) {
              variants['ant-btn-danger'].push(btnData);
            } else if (btn.classList.contains('ant-btn-dashed')) {
              variants['ant-btn-dashed'].push(btnData);
            } else if (btn.classList.contains('ant-btn-link')) {
              variants['ant-btn-link'].push(btnData);
            } else if (btn.classList.contains('ant-btn-text')) {
              variants['ant-btn-text'].push(btnData);
            } else if (btn.classList.contains('ant-btn-default')) {
              variants['ant-btn-default'].push(btnData);
            } else if (btn.classList.contains('ant-btn')) {
              variants['ant-btn-default'].push(btnData);
            } else {
              variants['custom'].push(btnData);
            }
          });

          return {
            buttonsByVariant: variants,
            totalButtons: buttons.length,
            totalVariations: {
              backgroundColors: Array.from(allBackgrounds),
              heights: Array.from(allHeights),
              borderRadii: Array.from(allBorderRadii),
              fontSizes: Array.from(allFontSizes),
              paddings: Array.from(allPaddings),
            },
          };
        });

        const record: ButtonRecord = {
          pageUrl: pageInfo.url,
          pageName: pageInfo.name,
          buttonCount: buttonData.totalButtons,
          buttonsByVariant: buttonData.buttonsByVariant,
          totalVariations: {
            backgroundColors: new Set(buttonData.totalVariations.backgroundColors),
            heights: new Set(buttonData.totalVariations.heights),
            borderRadii: new Set(buttonData.totalVariations.borderRadii),
            fontSizes: new Set(buttonData.totalVariations.fontSizes),
            paddings: new Set(buttonData.totalVariations.paddings),
          },
        };

        results.push(record);
        console.log(`✓ ${pageInfo.name}: ${buttonData.totalButtons} buttons found`);
      } catch (error) {
        console.error(`✗ Error on ${pageInfo.name}:`, error);
      }
    }

    // Generate comprehensive report
    const report = generateReport(results);
    const reportPath = '/tmp/button-audit-enhanced-report.md';
    fs.writeFileSync(reportPath, report);

    // Save JSON data
    const jsonPath = '/tmp/button-audit-enhanced.json';
    fs.writeFileSync(jsonPath, JSON.stringify(results, (key, value) => {
      if (value instanceof Set) {
        return Array.from(value);
      }
      return value;
    }, 2));

    console.log(`\n✓ Report saved to: ${reportPath}`);
    console.log(`✓ Data saved to: ${jsonPath}`);
  });
});

function generateReport(results: ButtonRecord[]): string {
  let report = `# Button & Toggle Consistency Audit - Enhanced Report\n\n`;
  report += `**Generated:** ${new Date().toISOString()}\n`;
  report += `**Pages Audited:** ${results.length}\n\n`;

  // Aggregate all buttons
  const allButtons: any[] = [];
  let totalButtons = 0;

  for (const result of results) {
    totalButtons += result.buttonCount;
    for (const variant in result.buttonsByVariant) {
      allButtons.push(...result.buttonsByVariant[variant]);
    }
  }

  report += `## Executive Summary\n\n`;
  report += `- Total pages audited: ${results.length}\n`;
  report += `- Total buttons found: ${totalButtons}\n`;
  report += `- Average buttons per page: ${(totalButtons / results.length).toFixed(1)}\n`;

  report += `\n## Pages with Most Buttons\n\n`;
  const sortedByButtons = [...results].sort((a, b) => b.buttonCount - a.buttonCount);
  for (const result of sortedByButtons.slice(0, 5)) {
    report += `- **${result.pageName}** (${result.url}): ${result.buttonCount} buttons\n`;
  }

  report += `\n## Button Variant Distribution\n\n`;

  const variantTotals: { [key: string]: number } = {};
  for (const result of results) {
    for (const variant in result.buttonsByVariant) {
      variantTotals[variant] = (variantTotals[variant] || 0) + result.buttonsByVariant[variant].length;
    }
  }

  for (const [variant, count] of Object.entries(variantTotals).sort((a, b) => b[1] - a[1])) {
    if (count > 0) {
      report += `- **${variant}**: ${count} buttons\n`;
    }
  }

  report += `\n## Button Styling Consistency Analysis\n\n`;

  const allBackgrounds = new Map<string, number>();
  const allHeights = new Map<string, number>();
  const allBorderRadii = new Map<string, number>();
  const allFontSizes = new Map<string, number>();
  const allPaddings = new Map<string, number>();

  for (const button of allButtons) {
    const bg = button.styles.backgroundColor;
    const h = button.styles.height;
    const br = button.styles.borderRadius;
    const fs = button.styles.fontSize;
    const p = button.styles.padding;

    allBackgrounds.set(bg, (allBackgrounds.get(bg) || 0) + 1);
    allHeights.set(h, (allHeights.get(h) || 0) + 1);
    allBorderRadii.set(br, (allBorderRadii.get(br) || 0) + 1);
    allFontSizes.set(fs, (allFontSizes.get(fs) || 0) + 1);
    allPaddings.set(p, (allPaddings.get(p) || 0) + 1);
  }

  report += `### Background Colors (${allBackgrounds.size} variations)\n`;
  const sortedBgs = Array.from(allBackgrounds.entries()).sort((a, b) => b[1] - a[1]);
  for (const [bg, count] of sortedBgs.slice(0, 10)) {
    const percentage = ((count / totalButtons) * 100).toFixed(1);
    report += `- ${bg}: ${count} buttons (${percentage}%)\n`;
  }
  if (sortedBgs.length > 10) {
    report += `- ... and ${sortedBgs.length - 10} more\n`;
  }

  report += `\n### Heights (${allHeights.size} variations)\n`;
  const sortedHeights = Array.from(allHeights.entries()).sort((a, b) => b[1] - a[1]);
  for (const [height, count] of sortedHeights) {
    const percentage = ((count / totalButtons) * 100).toFixed(1);
    report += `- ${height}: ${count} buttons (${percentage}%)\n`;
  }

  report += `\n### Border Radius (${allBorderRadii.size} variations)\n`;
  const sortedBr = Array.from(allBorderRadii.entries()).sort((a, b) => b[1] - a[1]);
  for (const [br, count] of sortedBr) {
    const percentage = ((count / totalButtons) * 100).toFixed(1);
    report += `- ${br}: ${count} buttons (${percentage}%)\n`;
  }

  report += `\n### Font Sizes (${allFontSizes.size} variations)\n`;
  const sortedFs = Array.from(allFontSizes.entries()).sort((a, b) => b[1] - a[1]);
  for (const [fs, count] of sortedFs) {
    const percentage = ((count / totalButtons) * 100).toFixed(1);
    report += `- ${fs}: ${count} buttons (${percentage}%)\n`;
  }

  report += `\n### Padding (${allPaddings.size} variations)\n`;
  const sortedPaddings = Array.from(allPaddings.entries()).sort((a, b) => b[1] - a[1]);
  for (const [p, count] of sortedPaddings.slice(0, 10)) {
    const percentage = ((count / totalButtons) * 100).toFixed(1);
    report += `- ${p}: ${count} buttons (${percentage}%)\n`;
  }
  if (sortedPaddings.length > 10) {
    report += `- ... and ${sortedPaddings.length - 10} more\n`;
  }

  report += `\n## Page-by-Page Breakdown\n\n`;
  for (const result of results) {
    report += `### ${result.pageName}\n`;
    report += `**URL:** ${result.url}\n`;
    report += `**Total Buttons:** ${result.buttonCount}\n\n`;

    for (const [variant, buttons] of Object.entries(result.buttonsByVariant)) {
      if (buttons.length > 0) {
        report += `**${variant}:** ${buttons.length} buttons\n`;
      }
    }
    report += `\n`;
  }

  report += `## Consistency Recommendations\n\n`;

  const issues: string[] = [];

  if (allHeights.size > 3) {
    issues.push(`Multiple button heights found (${allHeights.size} variations). Recommend standardizing to 32px (medium), 40px (large), 24px (small).`);
  }

  if (allBorderRadii.size > 2) {
    issues.push(`Multiple border-radius values found (${allBorderRadii.size} variations). Recommend standardizing to 6px or 8px.`);
  }

  if (allBackgrounds.size > 5) {
    issues.push(`Many background colors found (${allBackgrounds.size} variations). Review for color scheme consistency.`);
  }

  if (variantTotals['custom'] && variantTotals['custom'] > 0) {
    issues.push(`Custom styled buttons found (${variantTotals['custom']}). Consider migrating to Ant Design Button component.`);
  }

  if (issues.length === 0) {
    report += `✓ Button styling appears to be consistent across the application.\n`;
  } else {
    for (const issue of issues) {
      report += `- ${issue}\n`;
    }
  }

  return report;
}
