import { test, expect, Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const PAGES_TO_AUDIT = [
  { name: 'Dashboard', url: '/dashboard' },
  { name: 'All Assets', url: '/assets/all-assets' },
  { name: 'Asset Details', url: '/assets/all-assets', scroll: true }, // Will navigate to first asset
  { name: 'Patches', url: '/patches/all-patches' },
  { name: 'Vulnerabilities', url: '/vulnerability/zero-day-vulnerabilities' },
  { name: 'Discovery - IP Discovery', url: '/discovery/ip-discovery' },
  { name: 'Discovery - Agents', url: '/discovery/agents' },
  { name: 'Discovery - Device Credentials', url: '/discovery/device-credentials' },
  { name: 'Patch Jobs', url: '/jobs/patch-jobs' },
  { name: 'Vulnerability Jobs', url: '/jobs/vulnerability-jobs' },
  { name: 'Reports', url: '/reports' },
  { name: 'Settings - Organization', url: '/settings/user-management/organization' },
  { name: 'Settings - Users', url: '/settings/user-management/users' },
  { name: 'Settings - Roles', url: '/settings/user-management/roles-and-privileges' },
  { name: 'Settings - Agent Approvals', url: '/settings/agent-management/agent-approvals' },
  { name: 'Settings - Agent Configuration', url: '/settings/agent-management/agent-configuration' },
  { name: 'Settings - Deployment Policies', url: '/settings/patch-policy/deployment-policies' },
  { name: 'Settings - Branding', url: '/settings/system-config/branding' },
  { name: 'Settings - Mail Server', url: '/settings/system-config/mail-server-configuration' },
  { name: 'Settings - Audit', url: '/settings/audit' },
  { name: 'Patch Recommendations', url: '/patches/recommendations' },
  { name: 'Software Inventory', url: '/assets/software-inventory' },
  { name: 'Hub', url: '/hub' },
];

interface SpacingValue {
  value: string;
  count: number;
  pages: string[];
  elements: string[];
}

interface PageSpacingData {
  pageName: string;
  url: string;
  pageLayout: {
    maxWidth: string;
    padding: string;
    paddingTop: string;
    paddingRight: string;
    paddingBottom: string;
    paddingLeft: string;
  } | null;
  cardSpacing: Array<{
    index: number;
    padding: string;
    margin: string;
    marginBottom: string;
    borderRadius: string;
    boxShadow: string;
  }>;
  sectionSpacing: Array<{
    index: number;
    marginTop: string;
    marginBottom: string;
    paddingTop: string;
    paddingBottom: string;
  }>;
  formSpacing: Array<{
    index: number;
    marginBottom: string;
  }>;
  buttonSpacing: Array<{
    index: number;
    gap: string;
    marginTop: string;
  }>;
  gridSpacing: Array<{
    index: number;
    columnGap: string;
    rowGap: string;
    gap: string;
  }>;
  headingSpacing: Array<{
    index: number;
    marginTop: string;
    marginBottom: string;
    padding: string;
  }>;
  tableSpacing: Array<{
    marginBottom: string;
    borderRadius: string;
  }>;
}

// Helper function to convert CSS value to numeric pixels
function cssToPixels(cssValue: string): number | null {
  if (!cssValue) return null;
  const match = cssValue.match(/(\d+(?:\.\d+)?)/);
  if (match) {
    return parseFloat(match[1]);
  }
  return null;
}

// Helper function to check if value is on 8px grid (divisible by 4)
function isOn8pxGrid(value: number): boolean {
  return value % 4 === 0;
}

// Extract spacing data from a page
async function extractSpacingData(page: Page, pageName: string, url: string): Promise<PageSpacingData> {
  try {
    await page.goto(`http://localhost:5173${url}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  } catch (e) {
    console.log(`Warning: Navigation timeout for ${pageName}, continuing anyway`);
  }
  await page.waitForTimeout(500); // Allow time for page to fully render

  const data = await page.evaluate(() => {
    // Page container styles
    const pageLayout = (() => {
      const main = document.querySelector('main, .main-content, [class*="page-container"], .ant-layout-content');
      if (!main) return null;

      const styles = window.getComputedStyle(main);
      return {
        maxWidth: styles.maxWidth,
        padding: styles.padding,
        paddingTop: styles.paddingTop,
        paddingRight: styles.paddingRight,
        paddingBottom: styles.paddingBottom,
        paddingLeft: styles.paddingLeft,
      };
    })();

    // Card/Panel spacing
    const cardSpacing = (() => {
      const cards = Array.from(document.querySelectorAll('.ant-card'));
      return cards.slice(0, 5).map((card, idx) => {
        const styles = window.getComputedStyle(card);
        return {
          index: idx,
          padding: styles.padding,
          margin: styles.margin,
          marginBottom: styles.marginBottom,
          borderRadius: styles.borderRadius,
          boxShadow: styles.boxShadow,
        };
      });
    })();

    // Section spacing
    const sectionSpacing = (() => {
      const sections = Array.from(document.querySelectorAll('section, [class*="section"], [class*="page-section"]'));
      return sections.slice(0, 5).map((section, idx) => {
        const styles = window.getComputedStyle(section);
        return {
          index: idx,
          marginTop: styles.marginTop,
          marginBottom: styles.marginBottom,
          paddingTop: styles.paddingTop,
          paddingBottom: styles.paddingBottom,
        };
      });
    })();

    // Form field spacing
    const formSpacing = (() => {
      const formItems = Array.from(document.querySelectorAll('.ant-form-item'));
      return formItems.slice(0, 5).map((item, idx) => {
        const styles = window.getComputedStyle(item);
        return {
          index: idx,
          marginBottom: styles.marginBottom,
        };
      });
    })();

    // Button group spacing
    const buttonSpacing = (() => {
      const buttonGroups = Array.from(document.querySelectorAll('.ant-space, [class*="button-group"]'));
      return buttonGroups.slice(0, 3).map((group, idx) => {
        const styles = window.getComputedStyle(group);
        return {
          index: idx,
          gap: styles.gap,
          marginTop: styles.marginTop,
        };
      });
    })();

    // Grid spacing
    const gridSpacing = (() => {
      const grids = Array.from(document.querySelectorAll('.ant-row, [class*="grid"]'));
      return grids.slice(0, 3).map((grid, idx) => {
        const styles = window.getComputedStyle(grid);
        return {
          index: idx,
          columnGap: styles.columnGap,
          rowGap: styles.rowGap,
          gap: styles.gap,
        };
      });
    })();

    // Heading spacing
    const headingSpacing = (() => {
      const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, .ant-typography-title'));
      return headings.slice(0, 3).map((heading, idx) => {
        const styles = window.getComputedStyle(heading);
        return {
          index: idx,
          marginTop: styles.marginTop,
          marginBottom: styles.marginBottom,
          padding: styles.padding,
        };
      });
    })();

    // Table spacing
    const tableSpacing = (() => {
      const tables = Array.from(document.querySelectorAll('.ant-table-wrapper'));
      return tables.slice(0, 2).map((table) => {
        const styles = window.getComputedStyle(table);
        return {
          marginBottom: styles.marginBottom,
          borderRadius: styles.borderRadius,
        };
      });
    })();

    return {
      pageLayout,
      cardSpacing,
      sectionSpacing,
      formSpacing,
      buttonSpacing,
      gridSpacing,
      headingSpacing,
      tableSpacing,
    };
  });

  return {
    pageName,
    url,
    ...data,
  };
}

// Aggregate spacing values from all pages
function aggregateSpacingData(allData: PageSpacingData[]): {
  allValues: Map<string, SpacingValue>;
  standardGridValues: Map<string, SpacingValue>;
  nonStandardValues: Map<string, SpacingValue>;
  categories: {
    pageLayout: Map<string, SpacingValue>;
    cardPadding: Map<string, SpacingValue>;
    cardMargin: Map<string, SpacingValue>;
    formSpacing: Map<string, SpacingValue>;
    buttonGap: Map<string, SpacingValue>;
    sectionMargin: Map<string, SpacingValue>;
    gridGap: Map<string, SpacingValue>;
    headingSpacing: Map<string, SpacingValue>;
  };
} {
  const allValues = new Map<string, SpacingValue>();
  const categories = {
    pageLayout: new Map<string, SpacingValue>(),
    cardPadding: new Map<string, SpacingValue>(),
    cardMargin: new Map<string, SpacingValue>(),
    formSpacing: new Map<string, SpacingValue>(),
    buttonGap: new Map<string, SpacingValue>(),
    sectionMargin: new Map<string, SpacingValue>(),
    gridGap: new Map<string, SpacingValue>(),
    headingSpacing: new Map<string, SpacingValue>(),
  };

  for (const page of allData) {
    // Page layout padding
    if (page.pageLayout?.padding && page.pageLayout.padding !== 'auto') {
      addToMap(categories.pageLayout, page.pageLayout.padding, page.pageName, 'pageLayout.padding');
      addToMap(allValues, page.pageLayout.padding, page.pageName, 'pageLayout.padding');
    }
    if (page.pageLayout?.paddingLeft && page.pageLayout.paddingLeft !== 'auto') {
      addToMap(categories.pageLayout, page.pageLayout.paddingLeft, page.pageName, 'pageLayout.paddingLeft');
      addToMap(allValues, page.pageLayout.paddingLeft, page.pageName, 'pageLayout.paddingLeft');
    }
    if (page.pageLayout?.paddingRight && page.pageLayout.paddingRight !== 'auto') {
      addToMap(categories.pageLayout, page.pageLayout.paddingRight, page.pageName, 'pageLayout.paddingRight');
      addToMap(allValues, page.pageLayout.paddingRight, page.pageName, 'pageLayout.paddingRight');
    }

    // Card spacing
    for (const card of page.cardSpacing) {
      if (card.padding && card.padding !== 'auto') {
        addToMap(categories.cardPadding, card.padding, page.pageName, 'card.padding');
        addToMap(allValues, card.padding, page.pageName, 'card.padding');
      }
      if (card.margin && card.margin !== 'auto') {
        addToMap(categories.cardMargin, card.margin, page.pageName, 'card.margin');
        addToMap(allValues, card.margin, page.pageName, 'card.margin');
      }
    }

    // Form spacing
    for (const form of page.formSpacing) {
      if (form.marginBottom && form.marginBottom !== 'auto') {
        addToMap(categories.formSpacing, form.marginBottom, page.pageName, 'form.marginBottom');
        addToMap(allValues, form.marginBottom, page.pageName, 'form.marginBottom');
      }
    }

    // Button spacing
    for (const btn of page.buttonSpacing) {
      if (btn.gap && btn.gap !== 'auto') {
        addToMap(categories.buttonGap, btn.gap, page.pageName, 'button.gap');
        addToMap(allValues, btn.gap, page.pageName, 'button.gap');
      }
    }

    // Section spacing
    for (const section of page.sectionSpacing) {
      if (section.marginBottom && section.marginBottom !== 'auto') {
        addToMap(categories.sectionMargin, section.marginBottom, page.pageName, 'section.marginBottom');
        addToMap(allValues, section.marginBottom, page.pageName, 'section.marginBottom');
      }
    }

    // Grid spacing
    for (const grid of page.gridSpacing) {
      if (grid.gap && grid.gap !== 'auto') {
        addToMap(categories.gridGap, grid.gap, page.pageName, 'grid.gap');
        addToMap(allValues, grid.gap, page.pageName, 'grid.gap');
      }
    }

    // Heading spacing
    for (const heading of page.headingSpacing) {
      if (heading.marginBottom && heading.marginBottom !== 'auto') {
        addToMap(categories.headingSpacing, heading.marginBottom, page.pageName, 'heading.marginBottom');
        addToMap(allValues, heading.marginBottom, page.pageName, 'heading.marginBottom');
      }
    }
  }

  // Separate standard from non-standard values
  const standardGridValues = new Map<string, SpacingValue>();
  const nonStandardValues = new Map<string, SpacingValue>();

  for (const [key, value] of allValues.entries()) {
    const pixelValue = cssToPixels(key);
    if (pixelValue !== null) {
      if (isOn8pxGrid(pixelValue)) {
        standardGridValues.set(key, value);
      } else {
        nonStandardValues.set(key, value);
      }
    }
  }

  return {
    allValues,
    standardGridValues,
    nonStandardValues,
    categories,
  };
}

function addToMap(
  map: Map<string, SpacingValue>,
  value: string,
  pageName: string,
  elementType: string
) {
  if (!map.has(value)) {
    map.set(value, {
      value,
      count: 1,
      pages: [pageName],
      elements: [elementType],
    });
  } else {
    const existing = map.get(value)!;
    existing.count++;
    if (!existing.pages.includes(pageName)) {
      existing.pages.push(pageName);
    }
    if (!existing.elements.includes(elementType)) {
      existing.elements.push(elementType);
    }
  }
}

test.describe('Spacing Consistency Audit', () => {
  test.setTimeout(600000); // 10 minutes timeout
  test('audit all pages for spacing consistency', async ({ browser }) => {
    const authPath = path.join(process.cwd(), 'auth.json');
    let context;

    if (fs.existsSync(authPath)) {
      context = await browser.newContext({
        storageState: authPath,
      });
    } else {
      context = await browser.newContext();
    }

    const page = await context.newPage();

    // Try to load auth if it exists, otherwise log in
    try {
      if (!fs.existsSync(authPath)) {
        // Login first
        await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
        await page.fill('input[type="email"]', 'admin@patchiq.io');
        await page.fill('input[type="password"]', 'admin123');
        await page.click('button[type="submit"]');
        await page.waitForURL('**/dashboard', { timeout: 10000 });
      }
    } catch (e) {
      console.log('Auth setup skipped or already authenticated');
    }

    const allSpacingData: PageSpacingData[] = [];

    // Audit each page
    for (const pageConfig of PAGES_TO_AUDIT) {
      try {
        console.log(`Auditing: ${pageConfig.name}`);
        const data = await extractSpacingData(page, pageConfig.name, pageConfig.url);
        allSpacingData.push(data);
      } catch (e) {
        console.log(`Failed to audit ${pageConfig.name}:`, e);
      }
    }

    // Aggregate the data
    const {
      allValues,
      standardGridValues,
      nonStandardValues,
      categories,
    } = aggregateSpacingData(allSpacingData);

    // Calculate statistics
    const totalValues = allValues.size;
    const standardCount = standardGridValues.size;
    const nonStandardCount = nonStandardValues.size;
    const consistencyScore = (standardCount / totalValues) * 100;

    // Create report
    const report = {
      summary: {
        pagesAudited: allSpacingData.length,
        totalUniqueSpacingValues: totalValues,
        standardGridValues: standardCount,
        nonStandardValues: nonStandardCount,
        consistencyScore: `${consistencyScore.toFixed(2)}%`,
      },
      standardGridValues: Array.from(standardGridValues.values()).sort((a, b) => {
        const aPixels = cssToPixels(a.value) || 0;
        const bPixels = cssToPixels(b.value) || 0;
        return aPixels - bPixels;
      }),
      nonStandardValues: Array.from(nonStandardValues.values()).sort((a, b) => {
        const aPixels = cssToPixels(a.value) || 0;
        const bPixels = cssToPixels(b.value) || 0;
        return aPixels - bPixels;
      }),
      categories: {
        pageLayout: Array.from(categories.pageLayout.values()),
        cardPadding: Array.from(categories.cardPadding.values()),
        cardMargin: Array.from(categories.cardMargin.values()),
        formSpacing: Array.from(categories.formSpacing.values()),
        buttonGap: Array.from(categories.buttonGap.values()),
        sectionMargin: Array.from(categories.sectionMargin.values()),
        gridGap: Array.from(categories.gridGap.values()),
        headingSpacing: Array.from(categories.headingSpacing.values()),
      },
    };

    // Write report to file
    const reportPath = path.join(process.cwd(), 'spacing-audit-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log('\n=== SPACING AUDIT REPORT ===');
    console.log(`Pages audited: ${report.summary.pagesAudited}`);
    console.log(`Total unique spacing values: ${report.summary.totalUniqueSpacingValues}`);
    console.log(`Standard 8px grid values: ${report.summary.standardGridValues}`);
    console.log(`Non-standard values: ${report.summary.nonStandardValues}`);
    console.log(`Consistency score: ${report.summary.consistencyScore}`);
    console.log(`\nReport saved to: ${reportPath}`);

    if (nonStandardValues.size > 0) {
      console.log('\n=== NON-STANDARD VALUES FOUND ===');
      for (const [value, data] of Array.from(nonStandardValues.entries()).slice(0, 10)) {
        console.log(`  ${value}: ${data.count} instances in ${data.pages.join(', ')}`);
      }
    }

    await context.close();

    // Test should pass for audit
    expect(report.summary.pagesAudited).toBeGreaterThan(0);
  });
});
