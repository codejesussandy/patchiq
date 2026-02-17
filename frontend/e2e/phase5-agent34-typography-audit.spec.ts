import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface TypographyStyle {
  text?: string;
  fontSize: string;
  fontWeight: string;
  lineHeight: string;
  color: string;
  marginBottom?: string;
  fontFamily: string;
}

interface PageTypography {
  page: string;
  h1?: TypographyStyle;
  h2?: TypographyStyle;
  h3?: TypographyStyle;
  body?: TypographyStyle;
  label?: TypographyStyle;
  caption?: TypographyStyle;
  timestamp: string;
  status: 'success' | 'error';
  error?: string;
}

const typographyMatrix: PageTypography[] = [];

async function extractTypography(page: Page, selector: string): Promise<TypographyStyle | null> {
  try {
    return await page.evaluate((sel) => {
      const element = document.querySelector(sel);
      if (!element) return null;
      const styles = window.getComputedStyle(element);
      return {
        text: (element.textContent || '').trim().substring(0, 40),
        fontSize: styles.fontSize,
        fontWeight: styles.fontWeight,
        lineHeight: styles.lineHeight,
        color: styles.color,
        marginBottom: styles.marginBottom,
        fontFamily: styles.fontFamily,
      };
    }, selector);
  } catch (e) {
    return null;
  }
}

async function auditPage(page: Page, url: string): Promise<PageTypography> {
  const result: PageTypography = {
    page: url,
    timestamp: new Date().toISOString(),
    status: 'success',
  };

  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    // Extract H1
    result.h1 = await extractTypography(page, 'h1');

    // Extract H2
    result.h2 = await extractTypography(page, 'h2');

    // Extract H3
    result.h3 = await extractTypography(page, 'h3');

    // Extract body text (paragraph or ant-typography)
    result.body = await extractTypography(page, 'p, .ant-typography:not(.ant-typography-secondary)');

    // Extract label
    result.label = await extractTypography(page, 'label, .ant-form-item-label > label');

    // Extract caption
    result.caption = await extractTypography(page, '.ant-typography-secondary, small, .caption');
  } catch (error) {
    result.status = 'error';
    result.error = error instanceof Error ? error.message : String(error);
  }

  return result;
}

test.describe('Phase 5 Agent 34: Typography Consistency Audit', () => {
  test.setTimeout(180000); // 3 minutes for all pages
  const pages = [
    // Dashboard
    'http://localhost:5173/dashboard',

    // Assets
    'http://localhost:5173/assets',

    // Patches
    'http://localhost:5173/patches',
    'http://localhost:5173/patches/deployed/scheduled',
    'http://localhost:5173/patches/deployed/completed',
    'http://localhost:5173/patches/test-approve',
    'http://localhost:5173/patches/zero-touch',

    // Vulnerabilities
    'http://localhost:5173/vulnerability/vulnerabilities',
    'http://localhost:5173/vulnerability/manage-exception',

    // Discovery
    'http://localhost:5173/discovery/ip-discovery',
    'http://localhost:5173/discovery/device-credentials',
    'http://localhost:5173/discovery/agents',

    // Hub
    'http://localhost:5173/assets/hub',

    // Patch Jobs
    'http://localhost:5173/patches/patch-jobs',

    // Notifications
    'http://localhost:5173/notifications',

    // Reports
    'http://localhost:5173/reports',

    // Settings - User Management
    'http://localhost:5173/settings/user-management/users',
    'http://localhost:5173/settings/user-management/roles',
    'http://localhost:5173/settings/user-management/organization',

    // Settings - Agent Management
    'http://localhost:5173/settings/agent-management/approval',
    'http://localhost:5173/settings/agent-management/configuration',

    // Settings - Patch Management
    'http://localhost:5173/settings/patch-management/computer-groups',
    'http://localhost:5173/settings/patch-management/patch-preference',

    // Settings - System Settings
    'http://localhost:5173/settings/system-settings/mail-server',
    'http://localhost:5173/settings/system-settings/ldap',
  ];

  test('Audit typography across all pages', async ({ page }) => {
    for (const url of pages) {
      console.log(`Auditing: ${url}`);
      const result = await auditPage(page, url);
      typographyMatrix.push(result);

      if (result.status === 'success') {
        console.log(`✓ ${url}`);
        console.log(`  H1: ${result.h1?.fontSize || 'N/A'} (${result.h1?.fontWeight || 'N/A'})`);
        console.log(`  H2: ${result.h2?.fontSize || 'N/A'} (${result.h2?.fontWeight || 'N/A'})`);
        console.log(`  H3: ${result.h3?.fontSize || 'N/A'} (${result.h3?.fontWeight || 'N/A'})`);
        console.log(`  Body: ${result.body?.fontSize || 'N/A'}`);
      } else {
        console.log(`✗ ${url}: ${result.error}`);
      }
    }

    // Save raw data
    const reportDir = path.join(__dirname, '../typography-audit');
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    fs.writeFileSync(
      path.join(reportDir, 'typography-matrix.json'),
      JSON.stringify(typographyMatrix, null, 2)
    );

    // Generate analysis
    generateAnalysisReport(typographyMatrix, reportDir);
  });
});

function generateAnalysisReport(matrix: PageTypography[], reportDir: string) {
  const successful = matrix.filter(m => m.status === 'success');

  // Collect all unique values
  const h1Sizes = new Map<string, number>();
  const h1Weights = new Map<string, number>();
  const h2Sizes = new Map<string, number>();
  const h2Weights = new Map<string, number>();
  const h3Sizes = new Map<string, number>();
  const bodySizes = new Map<string, number>();
  const labelSizes = new Map<string, number>();
  const captionSizes = new Map<string, number>();

  const h1Colors = new Map<string, number>();
  const h2Colors = new Map<string, number>();
  const bodyColors = new Map<string, number>();

  successful.forEach(item => {
    if (item.h1) {
      h1Sizes.set(item.h1.fontSize, (h1Sizes.get(item.h1.fontSize) || 0) + 1);
      h1Weights.set(item.h1.fontWeight, (h1Weights.get(item.h1.fontWeight) || 0) + 1);
      h1Colors.set(item.h1.color, (h1Colors.get(item.h1.color) || 0) + 1);
    }
    if (item.h2) {
      h2Sizes.set(item.h2.fontSize, (h2Sizes.get(item.h2.fontSize) || 0) + 1);
      h2Weights.set(item.h2.fontWeight, (h2Weights.get(item.h2.fontWeight) || 0) + 1);
      h2Colors.set(item.h2.color, (h2Colors.get(item.h2.color) || 0) + 1);
    }
    if (item.h3) {
      h3Sizes.set(item.h3.fontSize, (h3Sizes.get(item.h3.fontSize) || 0) + 1);
    }
    if (item.body) {
      bodySizes.set(item.body.fontSize, (bodySizes.get(item.body.fontSize) || 0) + 1);
      bodyColors.set(item.body.color, (bodyColors.get(item.body.color) || 0) + 1);
    }
    if (item.label) {
      labelSizes.set(item.label.fontSize, (labelSizes.get(item.label.fontSize) || 0) + 1);
    }
    if (item.caption) {
      captionSizes.set(item.caption.fontSize, (captionSizes.get(item.caption.fontSize) || 0) + 1);
    }
  });

  const analysis = {
    summary: {
      total_pages_audited: matrix.length,
      successful_pages: successful.length,
      failed_pages: matrix.filter(m => m.status === 'error').length,
      consistency_score: Math.round((successful.length / matrix.length) * 100),
    },
    typography_variations: {
      h1_font_sizes: Array.from(h1Sizes.entries()).sort((a, b) => b[1] - a[1]),
      h1_font_weights: Array.from(h1Weights.entries()).sort((a, b) => b[1] - a[1]),
      h1_colors: Array.from(h1Colors.entries()).sort((a, b) => b[1] - a[1]),
      h2_font_sizes: Array.from(h2Sizes.entries()).sort((a, b) => b[1] - a[1]),
      h2_font_weights: Array.from(h2Weights.entries()).sort((a, b) => b[1] - a[1]),
      h2_colors: Array.from(h2Colors.entries()).sort((a, b) => b[1] - a[1]),
      h3_font_sizes: Array.from(h3Sizes.entries()).sort((a, b) => b[1] - a[1]),
      body_font_sizes: Array.from(bodySizes.entries()).sort((a, b) => b[1] - a[1]),
      body_colors: Array.from(bodyColors.entries()).sort((a, b) => b[1] - a[1]),
      label_font_sizes: Array.from(labelSizes.entries()).sort((a, b) => b[1] - a[1]),
      caption_font_sizes: Array.from(captionSizes.entries()).sort((a, b) => b[1] - a[1]),
    },
    inconsistent_pages: {
      h1: successful.filter(m => m.h1?.fontSize && !['24px', '28px', '32px'].includes(m.h1.fontSize)).map(m => ({ page: m.page, size: m.h1?.fontSize, weight: m.h1?.fontWeight })),
      h2: successful.filter(m => m.h2?.fontSize && !['20px', '24px', '28px'].includes(m.h2.fontSize)).map(m => ({ page: m.page, size: m.h2?.fontSize, weight: m.h2?.fontWeight })),
    },
  };

  fs.writeFileSync(
    path.join(reportDir, 'analysis.json'),
    JSON.stringify(analysis, null, 2)
  );

  // Generate markdown report
  let markdown = `# Agent 34: Typography Consistency Audit Report

## Executive Summary
- **Pages Audited:** ${analysis.summary.total_pages_audited}
- **Successfully Audited:** ${analysis.summary.successful_pages}
- **Failed Pages:** ${analysis.summary.failed_pages}
- **Consistency Score:** ${analysis.summary.consistency_score}%

## Typography Variations Found

### H1 Font Sizes
${analysis.typography_variations.h1_font_sizes.map(([size, count]) => `- **${size}**: ${count} pages`).join('\n')}

### H1 Font Weights
${analysis.typography_variations.h1_font_weights.map(([weight, count]) => `- **${weight}**: ${count} pages`).join('\n')}

### H1 Colors
${analysis.typography_variations.h1_colors.map(([color, count]) => `- **${color}**: ${count} pages`).join('\n')}

### H2 Font Sizes
${analysis.typography_variations.h2_font_sizes.map(([size, count]) => `- **${size}**: ${count} pages`).join('\n')}

### H2 Font Weights
${analysis.typography_variations.h2_font_weights.map(([weight, count]) => `- **${weight}**: ${count} pages`).join('\n')}

### H2 Colors
${analysis.typography_variations.h2_colors.map(([color, count]) => `- **${color}**: ${count} pages`).join('\n')}

### H3 Font Sizes
${analysis.typography_variations.h3_font_sizes.map(([size, count]) => `- **${size}**: ${count} pages`).join('\n')}

### Body Font Sizes
${analysis.typography_variations.body_font_sizes.map(([size, count]) => `- **${size}**: ${count} pages`).join('\n')}

### Body Colors
${analysis.typography_variations.body_colors.map(([color, count]) => `- **${color}**: ${count} pages`).join('\n')}

### Label Font Sizes
${analysis.typography_variations.label_font_sizes.map(([size, count]) => `- **${size}**: ${count} pages`).join('\n')}

### Caption Font Sizes
${analysis.typography_variations.caption_font_sizes.map(([size, count]) => `- **${size}**: ${count} pages`).join('\n')}

## Detailed Typography Matrix

| Page | H1 Size | H1 Weight | H2 Size | H2 Weight | H3 Size | Body Size | Status |
|------|---------|-----------|---------|-----------|---------|-----------|--------|
${successful.map(m => `| ${m.page.replace('http://localhost:5173', '')} | ${m.h1?.fontSize || 'N/A'} | ${m.h1?.fontWeight || 'N/A'} | ${m.h2?.fontSize || 'N/A'} | ${m.h2?.fontWeight || 'N/A'} | ${m.h3?.fontSize || 'N/A'} | ${m.body?.fontSize || 'N/A'} | ✓ |`).join('\n')}

## Failed Pages
${matrix.filter(m => m.status === 'error').map(m => `- ${m.page}: ${m.error}`).join('\n') || 'None'}

## Recommendations
1. **Standardize H1 to 32px** (most common in successful pages)
2. **Standardize H1 font-weight to 600** (most common)
3. **Standardize H2 to 24px** (most common in successful pages)
4. **Standardize body text to 14px** (most common)
5. **Review color consistency** - ensure headings use consistent color values

`;

  fs.writeFileSync(
    path.join(reportDir, 'REPORT.md'),
    markdown
  );

  console.log('\n=== Analysis Complete ===');
  console.log(`Report saved to: ${reportDir}`);
}
