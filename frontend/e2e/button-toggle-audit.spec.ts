import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const BASE_URL = 'http://localhost:5173';

interface ButtonStyle {
  index: number;
  text: string;
  className: string;
  type: string | null;
  antType: string;
  size: string;
  disabled: boolean;
  styles: {
    backgroundColor: string;
    color: string;
    padding: string;
    borderRadius: string;
    fontSize: string;
    fontWeight: string;
    height: string;
    border: string;
  };
}

interface ToggleStyle {
  index: number;
  checked: boolean;
  size: string;
  disabled: boolean;
  styles: {
    width: string;
    height: string;
    backgroundColor: string;
  };
}

interface InputStyle {
  index: number;
  type: string | null;
  placeholder: string;
  styles: {
    height: string;
    padding: string;
    fontSize: string;
    border: string;
    borderRadius: string;
  };
}

interface PageAudit {
  page: string;
  url: string;
  buttons: ButtonStyle[];
  toggles: ToggleStyle[];
  inputs: InputStyle[];
  timestamp: string;
}

const PAGES_TO_AUDIT = [
  // Dashboard
  { name: 'Dashboard', url: '/dashboard' },

  // Assets
  { name: 'All Assets', url: '/assets' },
  { name: 'Asset Detail', url: '/assets/1' },

  // Patches
  { name: 'All Patches', url: '/patches' },
  { name: 'Patch Detail', url: '/patches/1' },
  { name: 'Patch Recommendations', url: '/patches/recommendations' },

  // Vulnerabilities
  { name: 'Vulnerabilities', url: '/vulnerabilities' },

  // Deployments
  { name: 'Patch Deployments', url: '/deployments/patches' },
  { name: 'Deployment Detail', url: '/deployments/patches/1' },

  // Discovery
  { name: 'Discovery', url: '/discovery' },

  // Jobs & Policies
  { name: 'Patch Jobs', url: '/jobs/patches' },
  { name: 'Security Policies', url: '/jobs/policies' },

  // Settings
  { name: 'Organization Settings', url: '/settings/organization' },
  { name: 'User Management', url: '/settings/users' },
  { name: 'System Settings', url: '/settings/system' },
  { name: 'Email Configuration', url: '/settings/mail' },
  { name: 'Agent Settings', url: '/settings/agents' },
  { name: 'Patch Management Settings', url: '/settings/patch-management' },

  // Agent Management
  { name: 'Agent Hub', url: '/hub/packages' },
];

async function extractButtonStyles(page: any): Promise<ButtonStyle[]> {
  return await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button, .ant-btn'));
    return (buttons as any[]).map((btn: any, idx: number) => {
      const styles = window.getComputedStyle(btn);
      return {
        index: idx,
        text: btn.textContent.trim().substring(0, 30),
        className: btn.className,
        type: btn.getAttribute('type'),
        antType: btn.classList.contains('ant-btn-primary') ? 'primary' :
                 btn.classList.contains('ant-btn-default') ? 'default' :
                 btn.classList.contains('ant-btn-dashed') ? 'dashed' :
                 btn.classList.contains('ant-btn-link') ? 'link' :
                 btn.classList.contains('ant-btn-text') ? 'text' :
                 btn.classList.contains('ant-btn-dangerous') ? 'danger' : 'unknown',
        size: btn.classList.contains('ant-btn-sm') ? 'small' :
              btn.classList.contains('ant-btn-lg') ? 'large' : 'medium',
        disabled: btn.disabled,
        styles: {
          backgroundColor: styles.backgroundColor,
          color: styles.color,
          padding: styles.padding,
          borderRadius: styles.borderRadius,
          fontSize: styles.fontSize,
          fontWeight: styles.fontWeight,
          height: styles.height,
          border: styles.border,
        },
      };
    });
  });
}

async function extractToggleStyles(page: any): Promise<ToggleStyle[]> {
  return await page.evaluate(() => {
    const toggles = Array.from(document.querySelectorAll('.ant-switch'));
    return (toggles as any[]).map((toggle: any, idx: number) => {
      const styles = window.getComputedStyle(toggle);
      return {
        index: idx,
        checked: toggle.classList.contains('ant-switch-checked'),
        size: toggle.classList.contains('ant-switch-small') ? 'small' : 'default',
        disabled: toggle.classList.contains('ant-switch-disabled'),
        styles: {
          width: styles.width,
          height: styles.height,
          backgroundColor: styles.backgroundColor,
        },
      };
    });
  });
}

async function extractInputStyles(page: any): Promise<InputStyle[]> {
  return await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]), .ant-input'));
    return (inputs as any[]).slice(0, 15).map((input: any, idx: number) => {
      const styles = window.getComputedStyle(input);
      return {
        index: idx,
        type: input.getAttribute('type') || 'text',
        placeholder: input.getAttribute('placeholder')?.substring(0, 30) || 'none',
        styles: {
          height: styles.height,
          padding: styles.padding,
          fontSize: styles.fontSize,
          border: styles.border,
          borderRadius: styles.borderRadius,
        },
      };
    });
  });
}

test.describe('Button & Toggle Consistency Audit', () => {
  test.use({ storageState: 'auth.json' });

  const auditResults: PageAudit[] = [];

  for (const pageInfo of PAGES_TO_AUDIT) {
    test(`audit ${pageInfo.name}`, async ({ page }) => {
      console.log(`\nAuditing: ${pageInfo.name} (${pageInfo.url})`);

      try {
        await page.goto(`${BASE_URL}${pageInfo.url}`, { waitUntil: 'networkidle', timeout: 10000 });
        await page.waitForLoadState('domcontentloaded');

        // Extract styles
        const buttons = await extractButtonStyles(page);
        const toggles = await extractToggleStyles(page);
        const inputs = await extractInputStyles(page);

        const audit: PageAudit = {
          page: pageInfo.name,
          url: pageInfo.url,
          buttons,
          toggles,
          inputs,
          timestamp: new Date().toISOString(),
        };

        auditResults.push(audit);

        console.log(`  - Buttons: ${buttons.length}`);
        console.log(`  - Toggles: ${toggles.length}`);
        console.log(`  - Inputs: ${inputs.length}`);

        // Take screenshot
        const screenshotPath = `/tmp/button-audit-${pageInfo.name.replace(/\s+/g, '-')}.png`;
        await page.screenshot({ path: screenshotPath, fullPage: true });
        console.log(`  - Screenshot saved: ${screenshotPath}`);
      } catch (error) {
        console.error(`  Error auditing ${pageInfo.name}:`, error);
      }
    });
  }

  test('generate audit report', async () => {
    // Save raw audit data
    const auditFile = '/tmp/button-toggle-audit.json';
    fs.writeFileSync(auditFile, JSON.stringify(auditResults, null, 2));
    console.log(`\nAudit data saved to: ${auditFile}`);

    // Generate analysis
    const analysis = analyzeAudit(auditResults);
    const reportFile = '/tmp/button-toggle-audit-report.md';
    fs.writeFileSync(reportFile, analysis);
    console.log(`Audit report saved to: ${reportFile}`);
  });
});

function analyzeAudit(auditResults: PageAudit[]): string {
  // Aggregate button data
  const allButtons: ButtonStyle[] = [];
  const allToggles: ToggleStyle[] = [];
  const allInputs: InputStyle[] = [];

  for (const audit of auditResults) {
    allButtons.push(...audit.buttons);
    allToggles.push(...audit.toggles);
    allInputs.push(...audit.inputs);
  }

  // Categorize buttons
  const buttonsByVariant: { [key: string]: ButtonStyle[] } = {
    primary: allButtons.filter(b => b.antType === 'primary'),
    default: allButtons.filter(b => b.antType === 'default'),
    danger: allButtons.filter(b => b.antType === 'danger'),
    dashed: allButtons.filter(b => b.antType === 'dashed'),
    link: allButtons.filter(b => b.antType === 'link'),
    text: allButtons.filter(b => b.antType === 'text'),
    unknown: allButtons.filter(b => b.antType === 'unknown'),
  };

  // Analyze inconsistencies
  let report = `# Button & Toggle Consistency Audit Report\n\n`;
  report += `**Generated:** ${new Date().toISOString()}\n\n`;

  report += `## Executive Summary\n`;
  report += `- Pages audited: ${auditResults.length}\n`;
  report += `- Total buttons found: ${allButtons.length}\n`;
  report += `- Total toggles found: ${allToggles.length}\n`;
  report += `- Total input fields found: ${allInputs.length}\n`;
  report += `- Custom styled buttons (unknown): ${buttonsByVariant.unknown.length}\n\n`;

  report += `## Button Inventory by Variant\n\n`;

  for (const [variant, buttons] of Object.entries(buttonsByVariant)) {
    if (buttons.length === 0) continue;

    report += `### ${variant.charAt(0).toUpperCase() + variant.slice(1)} Buttons (${buttons.length} total)\n\n`;

    // Analyze backgrounds
    const bgColors = new Map<string, number>();
    const heights = new Map<string, number>();
    const paddings = new Map<string, number>();
    const borderRadii = new Map<string, number>();
    const fontSizes = new Map<string, number>();

    for (const btn of buttons) {
      const bg = btn.styles.backgroundColor;
      const h = btn.styles.height;
      const p = btn.styles.padding;
      const br = btn.styles.borderRadius;
      const fs = btn.styles.fontSize;

      bgColors.set(bg, (bgColors.get(bg) || 0) + 1);
      heights.set(h, (heights.get(h) || 0) + 1);
      paddings.set(p, (paddings.get(p) || 0) + 1);
      borderRadii.set(br, (borderRadii.get(br) || 0) + 1);
      fontSizes.set(fs, (fontSizes.get(fs) || 0) + 1);
    }

    report += `**Background Colors (${bgColors.size} variations):**\n`;
    for (const [color, count] of Array.from(bgColors.entries()).sort((a, b) => b[1] - a[1])) {
      report += `- ${color}: ${count} buttons\n`;
    }
    report += `\n`;

    report += `**Heights (${heights.size} variations):**\n`;
    for (const [height, count] of Array.from(heights.entries()).sort((a, b) => b[1] - a[1])) {
      report += `- ${height}: ${count} buttons\n`;
    }
    report += `\n`;

    report += `**Border Radius (${borderRadii.size} variations):**\n`;
    for (const [br, count] of Array.from(borderRadii.entries()).sort((a, b) => b[1] - a[1])) {
      report += `- ${br}: ${count} buttons\n`;
    }
    report += `\n`;

    report += `**Padding (${paddings.size} variations):**\n`;
    for (const [pad, count] of Array.from(paddings.entries()).sort((a, b) => b[1] - a[1])) {
      report += `- ${pad}: ${count} buttons\n`;
    }
    report += `\n`;

    report += `**Font Size (${fontSizes.size} variations):**\n`;
    for (const [fs, count] of Array.from(fontSizes.entries()).sort((a, b) => b[1] - a[1])) {
      report += `- ${fs}: ${count} buttons\n`;
    }
    report += `\n`;

    // Example buttons
    report += `**Example buttons in this category:**\n`;
    for (const btn of buttons.slice(0, 5)) {
      report += `- "${btn.text}" (${btn.size}): #${btn.index}\n`;
    }
    report += `\n`;
  }

  report += `## Toggle/Switch Inventory\n\n`;
  report += `**Total toggles found:** ${allToggles.length}\n\n`;

  if (allToggles.length > 0) {
    const toggleSizes = new Map<string, number>();
    const toggleBgs = new Map<string, number>();

    for (const toggle of allToggles) {
      const size = toggle.size;
      const bg = toggle.styles.backgroundColor;

      toggleSizes.set(size, (toggleSizes.get(size) || 0) + 1);
      toggleBgs.set(bg, (toggleBgs.get(bg) || 0) + 1);
    }

    report += `**Sizes (${toggleSizes.size} variations):**\n`;
    for (const [size, count] of Array.from(toggleSizes.entries()).sort((a, b) => b[1] - a[1])) {
      report += `- ${size}: ${count} toggles\n`;
    }
    report += `\n`;

    report += `**Background Colors (${toggleBgs.size} variations):**\n`;
    for (const [bg, count] of Array.from(toggleBgs.entries()).sort((a, b) => b[1] - a[1])) {
      report += `- ${bg}: ${count} toggles\n`;
    }
    report += `\n`;
  }

  report += `## Input Field Inventory\n\n`;
  report += `**Total input fields found:** ${allInputs.length}\n\n`;

  if (allInputs.length > 0) {
    const inputHeights = new Map<string, number>();
    const inputBorders = new Map<string, number>();
    const inputPaddings = new Map<string, number>();

    for (const input of allInputs) {
      const h = input.styles.height;
      const b = input.styles.border;
      const p = input.styles.padding;

      inputHeights.set(h, (inputHeights.get(h) || 0) + 1);
      inputBorders.set(b, (inputBorders.get(b) || 0) + 1);
      inputPaddings.set(p, (inputPaddings.get(p) || 0) + 1);
    }

    report += `**Heights (${inputHeights.size} variations):**\n`;
    for (const [height, count] of Array.from(inputHeights.entries()).sort((a, b) => b[1] - a[1])) {
      report += `- ${height}: ${count} inputs\n`;
    }
    report += `\n`;

    report += `**Borders (${inputBorders.size} variations):**\n`;
    for (const [border, count] of Array.from(inputBorders.entries()).sort((a, b) => b[1] - a[1])) {
      const borderDisplay = border.substring(0, 40) + (border.length > 40 ? '...' : '');
      report += `- ${borderDisplay}: ${count} inputs\n`;
    }
    report += `\n`;

    report += `**Padding (${inputPaddings.size} variations):**\n`;
    for (const [pad, count] of Array.from(inputPaddings.entries()).sort((a, b) => b[1] - a[1])) {
      report += `- ${pad}: ${count} inputs\n`;
    }
    report += `\n`;
  }

  report += `## Pages Audited\n\n`;
  for (const audit of auditResults) {
    report += `- **${audit.page}** (${audit.url}): ${audit.buttons.length} buttons, ${audit.toggles.length} toggles, ${audit.inputs.length} inputs\n`;
  }

  report += `\n## Raw Data\n`;
  report += `Full audit data available in: button-toggle-audit.json\n`;

  return report;
}
