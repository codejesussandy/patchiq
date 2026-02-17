import { chromium } from 'playwright';
import * as fs from 'fs';

// RGB to Hex conversion
function rgbToHex(rgb) {
  if (!rgb) return null;

  const match = rgb.match(/\d+/g);
  if (!match || match.length < 3) return rgb;

  const r = parseInt(match[0]);
  const g = parseInt(match[1]);
  const b = parseInt(match[2]);

  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()}`;
}

// Pages to audit
const pages = [
  '/dashboard',
  '/assets',
  '/patches',
  '/patch-recommendations',
  '/vulnerability',
  '/deployments',
  '/discovery',
  '/settings/organization',
  '/settings/users',
  '/settings/audit',
  '/reports',
];

async function extractColorsFromPage(page, pagePath) {
  try {
    await page.goto(`http://localhost:5173${pagePath}`, { waitUntil: 'networkidle', timeout: 30000 });

    // Extract all computed colors
    const colorsData = await page.evaluate(() => {
      const allElements = document.querySelectorAll('*');
      const colorInventory = {
        textColors: new Map(),
        backgroundColors: new Map(),
        borderColors: new Map(),
        semanticColors: {},
      };

      allElements.forEach(el => {
        const styles = window.getComputedStyle(el);

        // Text colors
        if (styles.color && styles.color !== 'rgba(0, 0, 0, 0)' && styles.color !== 'transparent') {
          const count = colorInventory.textColors.get(styles.color) || 0;
          colorInventory.textColors.set(styles.color, count + 1);
        }

        // Background colors
        if (styles.backgroundColor && styles.backgroundColor !== 'rgba(0, 0, 0, 0)' && styles.backgroundColor !== 'transparent') {
          const count = colorInventory.backgroundColors.get(styles.backgroundColor) || 0;
          colorInventory.backgroundColors.set(styles.backgroundColor, count + 1);
        }

        // Border colors
        if (styles.borderColor && styles.borderColor !== 'rgba(0, 0, 0, 0)' && styles.borderColor !== 'transparent') {
          const count = colorInventory.borderColors.get(styles.borderColor) || 0;
          colorInventory.borderColors.set(styles.borderColor, count + 1);
        }
      });

      // Semantic color detection
      const semanticSelectors = {
        success: ['.ant-tag-success', '.ant-badge-status-success', '.success-color'],
        error: ['.ant-tag-error', '.ant-badge-status-error', '.error-color'],
        warning: ['.ant-tag-warning', '.ant-badge-status-warning', '.warning-color'],
        info: ['.ant-tag-processing', '.ant-badge-status-processing', '.info-color'],
        primary: ['.ant-btn-primary', '.primary-color'],
      };

      for (const [key, selectors] of Object.entries(semanticSelectors)) {
        for (const selector of selectors) {
          const el = document.querySelector(selector);
          if (el) {
            const styles = window.getComputedStyle(el);
            colorInventory.semanticColors[key] = {
              color: styles.color,
              backgroundColor: styles.backgroundColor,
            };
            break;
          }
        }
      }

      return {
        textColors: Array.from(colorInventory.textColors.entries()),
        backgroundColors: Array.from(colorInventory.backgroundColors.entries()),
        borderColors: Array.from(colorInventory.borderColors.entries()),
        semanticColors: colorInventory.semanticColors,
      };
    });

    return colorsData;
  } catch (err) {
    console.error(`Error on page ${pagePath}:`, err.message);
    return null;
  }
}

async function runAudit() {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  // Login first
  console.log('Logging in...');
  await page.goto('http://localhost:5173/login');
  await page.fill('input[type="email"]', 'admin@patchiq.io');
  await page.fill('input[type="password"]', 'admin123');
  await page.click('button[type="submit"]');
  await page.waitForNavigation();

  const allColors = {
    textColors: {},
    backgroundColors: {},
    borderColors: {},
    semanticColors: {},
  };

  // Audit each page
  for (const pagePath of pages) {
    console.log(`Auditing ${pagePath}...`);
    const colors = await extractColorsFromPage(page, pagePath);

    if (colors) {
      // Merge text colors
      colors.textColors.forEach(([color, count]) => {
        const hex = rgbToHex(color);
        if (hex) {
          allColors.textColors[hex] = (allColors.textColors[hex] || 0) + count;
        }
      });

      // Merge background colors
      colors.backgroundColors.forEach(([color, count]) => {
        const hex = rgbToHex(color);
        if (hex) {
          allColors.backgroundColors[hex] = (allColors.backgroundColors[hex] || 0) + count;
        }
      });

      // Merge border colors
      colors.borderColors.forEach(([color, count]) => {
        const hex = rgbToHex(color);
        if (hex) {
          allColors.borderColors[hex] = (allColors.borderColors[hex] || 0) + count;
        }
      });

      // Merge semantic colors
      Object.assign(allColors.semanticColors, colors.semanticColors);
    }
  }

  // Generate report
  const report = {
    timestamp: new Date().toISOString(),
    totalUniqueColors: {
      text: Object.keys(allColors.textColors).length,
      background: Object.keys(allColors.backgroundColors).length,
      border: Object.keys(allColors.borderColors).length,
      total: Object.keys(allColors.textColors).length + Object.keys(allColors.backgroundColors).length + Object.keys(allColors.borderColors).length,
    },
    textColors: allColors.textColors,
    backgroundColors: allColors.backgroundColors,
    borderColors: allColors.borderColors,
    semanticColors: allColors.semanticColors,
  };

  fs.writeFileSync('color-audit-report.json', JSON.stringify(report, null, 2));
  console.log('Report saved to color-audit-report.json');

  await browser.close();
}

runAudit().catch(console.error);
