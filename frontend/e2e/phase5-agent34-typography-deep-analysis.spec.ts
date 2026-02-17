import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface DetailedTypography {
  page: string;
  elements: Array<{
    selector: string;
    tag: string;
    classes: string[];
    text: string;
    styles: {
      fontSize: string;
      fontWeight: string;
      lineHeight: string;
      color: string;
      fontFamily: string;
      letterSpacing: string;
      fontStyle: string;
    };
  }>;
}

async function getDetailedTypography(page: Page, url: string): Promise<DetailedTypography> {
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1000);

  const result = await page.evaluate(() => {
    const elements = [];

    // Get H1 elements
    document.querySelectorAll('h1').forEach((el) => {
      const styles = window.getComputedStyle(el);
      elements.push({
        selector: 'h1',
        tag: 'H1',
        classes: Array.from(el.classList),
        text: el.textContent?.trim().substring(0, 50) || '',
        styles: {
          fontSize: styles.fontSize,
          fontWeight: styles.fontWeight,
          lineHeight: styles.lineHeight,
          color: styles.color,
          fontFamily: styles.fontFamily,
          letterSpacing: styles.letterSpacing,
          fontStyle: styles.fontStyle,
        },
      });
    });

    // Get H2 elements
    document.querySelectorAll('h2').forEach((el) => {
      const styles = window.getComputedStyle(el);
      elements.push({
        selector: 'h2',
        tag: 'H2',
        classes: Array.from(el.classList),
        text: el.textContent?.trim().substring(0, 50) || '',
        styles: {
          fontSize: styles.fontSize,
          fontWeight: styles.fontWeight,
          lineHeight: styles.lineHeight,
          color: styles.color,
          fontFamily: styles.fontFamily,
          letterSpacing: styles.letterSpacing,
          fontStyle: styles.fontStyle,
        },
      });
    });

    // Get H3 elements
    document.querySelectorAll('h3').forEach((el) => {
      const styles = window.getComputedStyle(el);
      elements.push({
        selector: 'h3',
        tag: 'H3',
        classes: Array.from(el.classList),
        text: el.textContent?.trim().substring(0, 50) || '',
        styles: {
          fontSize: styles.fontSize,
          fontWeight: styles.fontWeight,
          lineHeight: styles.lineHeight,
          color: styles.color,
          fontFamily: styles.fontFamily,
          letterSpacing: styles.letterSpacing,
          fontStyle: styles.fontStyle,
        },
      });
    });

    // Get paragraph/body text (first 3)
    let pCount = 0;
    document.querySelectorAll('p, .ant-typography:not(.ant-typography-secondary)').forEach((el) => {
      if (pCount >= 3) return;
      const styles = window.getComputedStyle(el);
      elements.push({
        selector: 'p',
        tag: 'P',
        classes: Array.from(el.classList),
        text: el.textContent?.trim().substring(0, 50) || '',
        styles: {
          fontSize: styles.fontSize,
          fontWeight: styles.fontWeight,
          lineHeight: styles.lineHeight,
          color: styles.color,
          fontFamily: styles.fontFamily,
          letterSpacing: styles.letterSpacing,
          fontStyle: styles.fontStyle,
        },
      });
      pCount++;
    });

    // Get labels (first 3)
    let labelCount = 0;
    document.querySelectorAll('label, .ant-form-item-label > label').forEach((el) => {
      if (labelCount >= 3) return;
      const styles = window.getComputedStyle(el);
      elements.push({
        selector: 'label',
        tag: 'LABEL',
        classes: Array.from(el.classList),
        text: el.textContent?.trim().substring(0, 50) || '',
        styles: {
          fontSize: styles.fontSize,
          fontWeight: styles.fontWeight,
          lineHeight: styles.lineHeight,
          color: styles.color,
          fontFamily: styles.fontFamily,
          letterSpacing: styles.letterSpacing,
          fontStyle: styles.fontStyle,
        },
      });
      labelCount++;
    });

    // Get secondary text (captions/small text)
    let captionCount = 0;
    document.querySelectorAll('.ant-typography-secondary, small, .caption, .ant-empty-description').forEach((el) => {
      if (captionCount >= 2) return;
      const styles = window.getComputedStyle(el);
      elements.push({
        selector: '.ant-typography-secondary',
        tag: 'CAPTION',
        classes: Array.from(el.classList),
        text: el.textContent?.trim().substring(0, 50) || '',
        styles: {
          fontSize: styles.fontSize,
          fontWeight: styles.fontWeight,
          lineHeight: styles.lineHeight,
          color: styles.color,
          fontFamily: styles.fontFamily,
          letterSpacing: styles.letterSpacing,
          fontStyle: styles.fontStyle,
        },
      });
      captionCount++;
    });

    return elements;
  });

  return {
    page: url,
    elements: result,
  };
}

test.describe('Phase 5 Agent 34: Deep Typography Analysis', () => {
  test.setTimeout(120000);

  const testPages = [
    'http://localhost:5173/dashboard',
    'http://localhost:5173/assets',
    'http://localhost:5173/patches',
    'http://localhost:5173/vulnerability/vulnerabilities',
    'http://localhost:5173/settings/user-management/users',
  ];

  test('Analyze deep typography details', async ({ page }) => {
    const allDetails: DetailedTypography[] = [];

    for (const url of testPages) {
      console.log(`Deep analyzing: ${url}`);
      const details = await getDetailedTypography(page, url);
      allDetails.push(details);
    }

    const reportDir = path.join(__dirname, '../typography-audit');
    fs.writeFileSync(
      path.join(reportDir, 'detailed-typography.json'),
      JSON.stringify(allDetails, null, 2)
    );

    // Generate HTML report for visualization
    generateHtmlReport(allDetails, reportDir);
  });
});

function generateHtmlReport(details: DetailedTypography[], reportDir: string) {
  let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Typography Analysis Report</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      margin: 0;
      padding: 20px;
      background: #f5f5f5;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    h1 {
      color: #333;
      border-bottom: 3px solid #1890ff;
      padding-bottom: 10px;
    }
    h2 {
      color: #555;
      margin-top: 30px;
      border-left: 4px solid #1890ff;
      padding-left: 10px;
    }
    h3 {
      color: #777;
      margin-top: 20px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
    }
    th, td {
      border: 1px solid #ddd;
      padding: 12px;
      text-align: left;
    }
    th {
      background: #f0f2f5;
      font-weight: 600;
    }
    tr:nth-child(even) {
      background: #fafafa;
    }
    .tag {
      display: inline-block;
      padding: 4px 8px;
      background: #e6f7ff;
      color: #0050b3;
      border-radius: 3px;
      font-weight: 500;
      font-size: 12px;
      margin-right: 5px;
      margin-bottom: 5px;
    }
    .size-large { color: #cf1322; font-weight: 600; }
    .size-medium { color: #1890ff; }
    .size-small { color: #52c41a; }
    .preview {
      padding: 10px;
      margin: 5px 0;
      border-left: 3px solid #1890ff;
      background: #f9f9f9;
      word-break: break-word;
    }
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
      margin: 20px 0;
    }
    .stat-box {
      padding: 15px;
      background: #f0f2f5;
      border-radius: 4px;
      border-left: 4px solid #1890ff;
    }
    .stat-box strong {
      color: #1890ff;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>PatchIQ Typography Consistency Analysis</h1>
    <p><strong>Report Date:</strong> ${new Date().toLocaleString()}</p>
    <p><strong>Pages Analyzed:</strong> ${details.length}</p>
`;

  // Generate statistics
  const allFontSizes = new Map<string, number>();
  const allFontWeights = new Map<string, number>();
  const allColors = new Map<string, number>();

  details.forEach((page) => {
    page.elements.forEach((elem) => {
      const fs = elem.styles.fontSize;
      const fw = elem.styles.fontWeight;
      const color = elem.styles.color;

      allFontSizes.set(fs, (allFontSizes.get(fs) || 0) + 1);
      allFontWeights.set(fw, (allFontWeights.get(fw) || 0) + 1);
      allColors.set(color, (allColors.get(color) || 0) + 1);
    });
  });

  html += `
    <div class="stats">
      <div class="stat-box">
        <strong>Unique Font Sizes:</strong> ${allFontSizes.size}
      </div>
      <div class="stat-box">
        <strong>Unique Font Weights:</strong> ${allFontWeights.size}
      </div>
      <div class="stat-box">
        <strong>Unique Colors:</strong> ${allColors.size}
      </div>
      <div class="stat-box">
        <strong>Total Elements Analyzed:</strong> ${details.reduce((sum, p) => sum + p.elements.length, 0)}
      </div>
    </div>

    <h2>Font Sizes Distribution</h2>
    <table>
      <tr><th>Font Size</th><th>Count</th><th>Percentage</th></tr>
`;

  const totalElements = details.reduce((sum, p) => sum + p.elements.length, 0);
  const sortedSizes = Array.from(allFontSizes.entries()).sort((a, b) => {
    const aNum = parseInt(a[0]);
    const bNum = parseInt(b[0]);
    return bNum - aNum;
  });

  sortedSizes.forEach(([size, count]) => {
    const percent = ((count / totalElements) * 100).toFixed(1);
    let sizeClass = 'size-medium';
    if (parseInt(size) > 24) sizeClass = 'size-large';
    else if (parseInt(size) < 14) sizeClass = 'size-small';
    html += `<tr><td class="${sizeClass}">${size}</td><td>${count}</td><td>${percent}%</td></tr>`;
  });

  html += `
    </table>

    <h2>Font Weights Distribution</h2>
    <table>
      <tr><th>Font Weight</th><th>Count</th><th>Percentage</th></tr>
`;

  const sortedWeights = Array.from(allFontWeights.entries()).sort((a, b) => parseInt(b[0]) - parseInt(a[0]));
  sortedWeights.forEach(([weight, count]) => {
    const percent = ((count / totalElements) * 100).toFixed(1);
    html += `<tr><td>${weight}</td><td>${count}</td><td>${percent}%</td></tr>`;
  });

  html += `
    </table>

    <h2>Color Distribution</h2>
    <table>
      <tr><th>Color</th><th>Count</th><th>Percentage</th></tr>
`;

  const sortedColors = Array.from(allColors.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  sortedColors.forEach(([color, count]) => {
    const percent = ((count / totalElements) * 100).toFixed(1);
    const colorPreview = color.startsWith('rgba') || color.startsWith('rgb')
      ? color
      : 'currentColor';
    html += `<tr><td><span style="background: ${colorPreview}; display: inline-block; width: 20px; height: 20px; border-radius: 3px; vertical-align: middle; margin-right: 10px; border: 1px solid #ccc;"></span>${color}</td><td>${count}</td><td>${percent}%</td></tr>`;
  });

  html += `
    </table>

    <h2>Detailed Page Analysis</h2>
`;

  details.forEach((page) => {
    const pageName = page.page.replace('http://localhost:5173', '');
    html += `<h3>${pageName}</h3>`;

    const byTag = new Map<string, typeof page.elements>();
    page.elements.forEach((elem) => {
      if (!byTag.has(elem.tag)) byTag.set(elem.tag, []);
      byTag.get(elem.tag)!.push(elem);
    });

    byTag.forEach((elements, tag) => {
      html += `<h4>${tag} Elements (${elements.length})</h4><table>`;
      html += `<tr><th>Text</th><th>Size</th><th>Weight</th><th>Color</th></tr>`;
      elements.forEach((elem) => {
        html += `<tr>
          <td><div class="preview">${elem.text || '(empty)'}</div></td>
          <td>${elem.styles.fontSize}</td>
          <td>${elem.styles.fontWeight}</td>
          <td>${elem.styles.color}</td>
        </tr>`;
      });
      html += `</table>`;
    });
  });

  html += `
  </div>
</body>
</html>
`;

  fs.writeFileSync(path.join(reportDir, 'typography-report.html'), html);
  console.log('HTML report generated');
}
