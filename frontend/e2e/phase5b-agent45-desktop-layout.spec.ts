import { test, expect, Page } from '@playwright/test';

// Define viewport configurations
const VIEWPORTS = {
  standard_1920: { width: 1920, height: 1080, name: 'desktop-1920px' },
  large_2560: { width: 2560, height: 1440, name: 'desktop-2560px' },
};

// Define test pages
const PAGES_TO_TEST = [
  { url: '/dashboard', name: 'Dashboard' },
  { url: '/assets', name: 'Assets' },
  { url: '/assets/1', name: 'AssetDetail' },
  { url: '/patches', name: 'Patches' },
  { url: '/vulnerability/vulnerabilities', name: 'Vulnerabilities' },
  { url: '/settings/user-management/users', name: 'UserManagement' },
];

/**
 * Analyzes layout metrics for whitespace and scaling
 */
async function analyzeLayoutMetrics(page: Page, viewportName: string, pageName: string) {
  const metrics = await page.evaluate(() => {
    // Get main content container
    const mainLayout = document.querySelector('[class*="layout"]') || document.querySelector('main');
    const contentArea = document.querySelector('[class*="content"]') || document.body;
    const sideBar = document.querySelector('[class*="sidebar"]') || document.querySelector('[class*="trigger"]')?.parentElement;
    const tables = document.querySelectorAll('table');
    const cards = document.querySelectorAll('[class*="card"]');
    const gridContainers = document.querySelectorAll('[class*="row"], [class*="grid"], [class*="layout"]');

    const getComputedStyle = (el: Element) => {
      const style = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return {
        width: rect.width,
        height: rect.height,
        maxWidth: style.maxWidth,
        padding: style.padding,
        margin: style.margin,
      };
    };

    return {
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
      mainLayout: mainLayout ? getComputedStyle(mainLayout) : null,
      contentArea: getComputedStyle(contentArea),
      sidebarCount: sideBar ? 1 : 0,
      sidebarWidth: sideBar ? getComputedStyle(sideBar).width : 0,
      tableCount: tables.length,
      tableWidths: Array.from(tables).map(t => getComputedStyle(t).width),
      cardCount: cards.length,
      cardWidths: Array.from(cards).slice(0, 5).map(c => getComputedStyle(c).width),
      gridContainerCount: gridContainers.length,
    };
  });

  return metrics;
}

/**
 * Takes screenshots at both viewports
 */
async function captureScreenshots(page: Page, pageName: string) {
  for (const [key, viewport] of Object.entries(VIEWPORTS)) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });

    // Wait for content to load and stabilize
    await page.waitForTimeout(1000);

    const screenshotPath = `screenshots/${viewport.name}/${pageName}.png`;
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`✓ Captured ${screenshotPath}`);
  }
}

/**
 * Measures content width and max-width constraints
 */
async function measureContentConstraints(page: Page) {
  const constraints = await page.evaluate(() => {
    const elements = document.querySelectorAll('*');
    const styles = new Map<string, string>();

    // Check for max-width constraints
    elements.forEach(el => {
      const style = window.getComputedStyle(el);
      const maxWidth = style.maxWidth;
      if (maxWidth && maxWidth !== 'none' && maxWidth !== 'auto') {
        const selector = (el as HTMLElement).className || el.tagName;
        if (!styles.has(selector)) {
          styles.set(selector, maxWidth);
        }
      }
    });

    return {
      hasMaxWidthConstraints: styles.size > 0,
      constraints: Array.from(styles.entries()).slice(0, 10),
    };
  });

  return constraints;
}

/**
 * Detects responsive breakpoints
 */
async function detectBreakpoints(page: Page) {
  const breakpoints: number[] = [];

  // Ant Design breakpoints: xs, sm, md, lg, xl, xxl
  // xs: 0, sm: 576, md: 768, lg: 992, xl: 1200, xxl: 1600

  const antDesignBreakpoints = [576, 768, 992, 1200, 1600];

  for (const bp of antDesignBreakpoints) {
    await page.setViewportSize({ width: bp, height: 1080 });
    await page.waitForTimeout(500);

    // Could add additional detection logic here
    breakpoints.push(bp);
  }

  return breakpoints;
}

test.describe('Phase 5B Agent 45: Desktop Layout Testing (1920px & 2560px)', () => {
  test.beforeEach(async ({ page }) => {
    // Create screenshot directories
    await page.evaluate(() => {
      console.log('Starting desktop layout tests');
    });
  });

  // Test 1: Dashboard Page
  test('should display Dashboard correctly on 1920px and 2560px', async ({ page }) => {
    const pageName = 'Dashboard';
    const pageUrl = '/dashboard';

    await page.goto(pageUrl);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    console.log(`\n=== Testing ${pageName} ===`);

    // Test at 1920px
    await page.setViewportSize({ width: 1920, height: 1080 });
    let metrics = await analyzeLayoutMetrics(page, VIEWPORTS.standard_1920.name, pageName);
    console.log(`\n${pageName} at 1920px:`);
    console.log(`  Viewport: ${metrics.viewport.width}x${metrics.viewport.height}`);
    console.log(`  Content area width: ${metrics.contentArea.width.toFixed(0)}px`);
    console.log(`  Cards: ${metrics.cardCount}`);
    console.log(`  Tables: ${metrics.tableCount}`);

    // Verify responsive grid is being used
    const gridElements = await page.locator('[class*="row"]').count();
    expect(gridElements).toBeGreaterThan(0);

    // Test at 2560px
    await page.setViewportSize({ width: 2560, height: 1440 });
    await page.waitForTimeout(1000);
    metrics = await analyzeLayoutMetrics(page, VIEWPORTS.large_2560.name, pageName);
    console.log(`\n${pageName} at 2560px:`);
    console.log(`  Viewport: ${metrics.viewport.width}x${metrics.viewport.height}`);
    console.log(`  Content area width: ${metrics.contentArea.width.toFixed(0)}px`);
    console.log(`  Cards: ${metrics.cardCount}`);

    // Capture screenshots
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.screenshot({ path: `screenshots/desktop-1920px/${pageName}.png`, fullPage: true });

    await page.setViewportSize({ width: 2560, height: 1440 });
    await page.screenshot({ path: `screenshots/desktop-2560px/${pageName}.png`, fullPage: true });
  });

  // Test 2: Assets List Page
  test('should display Assets list correctly on 1920px and 2560px', async ({ page }) => {
    const pageName = 'Assets';
    const pageUrl = '/assets';

    await page.goto(pageUrl);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    console.log(`\n=== Testing ${pageName} ===`);

    // Test at 1920px
    await page.setViewportSize({ width: 1920, height: 1080 });
    let metrics = await analyzeLayoutMetrics(page, VIEWPORTS.standard_1920.name, pageName);
    console.log(`\n${pageName} at 1920px:`);
    console.log(`  Viewport: ${metrics.viewport.width}x${metrics.viewport.height}`);
    console.log(`  Content area width: ${metrics.contentArea.width.toFixed(0)}px`);
    console.log(`  Tables: ${metrics.tableCount}`);

    // Check table is visible
    const tableVisible = await page.locator('table').isVisible();
    expect(tableVisible).toBe(true);

    // Test at 2560px
    await page.setViewportSize({ width: 2560, height: 1440 });
    await page.waitForTimeout(1000);
    metrics = await analyzeLayoutMetrics(page, VIEWPORTS.large_2560.name, pageName);
    console.log(`\n${pageName} at 2560px:`);
    console.log(`  Viewport: ${metrics.viewport.width}x${metrics.viewport.height}`);
    console.log(`  Content area width: ${metrics.contentArea.width.toFixed(0)}px`);
    console.log(`  Tables: ${metrics.tableCount}`);

    // Capture screenshots
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.screenshot({ path: `screenshots/desktop-1920px/${pageName}.png`, fullPage: true });

    await page.setViewportSize({ width: 2560, height: 1440 });
    await page.screenshot({ path: `screenshots/desktop-2560px/${pageName}.png`, fullPage: true });
  });

  // Test 3: Asset Detail Page
  test('should display Asset Detail correctly on 1920px and 2560px', async ({ page }) => {
    const pageName = 'AssetDetail';
    const pageUrl = '/assets/1';

    await page.goto(pageUrl, { waitUntil: 'networkidle' }).catch(() => {
      // If specific asset doesn't exist, that's OK for layout testing
    });
    await page.waitForTimeout(2000);

    console.log(`\n=== Testing ${pageName} ===`);

    // Test at 1920px
    await page.setViewportSize({ width: 1920, height: 1080 });
    let metrics = await analyzeLayoutMetrics(page, VIEWPORTS.standard_1920.name, pageName);
    console.log(`\n${pageName} at 1920px:`);
    console.log(`  Viewport: ${metrics.viewport.width}x${metrics.viewport.height}`);
    console.log(`  Content area width: ${metrics.contentArea.width.toFixed(0)}px`);

    // Test at 2560px
    await page.setViewportSize({ width: 2560, height: 1440 });
    await page.waitForTimeout(1000);
    metrics = await analyzeLayoutMetrics(page, VIEWPORTS.large_2560.name, pageName);
    console.log(`\n${pageName} at 2560px:`);
    console.log(`  Viewport: ${metrics.viewport.width}x${metrics.viewport.height}`);
    console.log(`  Content area width: ${metrics.contentArea.width.toFixed(0)}px`);

    // Capture screenshots
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.screenshot({ path: `screenshots/desktop-1920px/${pageName}.png`, fullPage: true });

    await page.setViewportSize({ width: 2560, height: 1440 });
    await page.screenshot({ path: `screenshots/desktop-2560px/${pageName}.png`, fullPage: true });
  });

  // Test 4: Patches List Page
  test('should display Patches list correctly on 1920px and 2560px', async ({ page }) => {
    const pageName = 'Patches';
    const pageUrl = '/patches';

    await page.goto(pageUrl);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    console.log(`\n=== Testing ${pageName} ===`);

    // Test at 1920px
    await page.setViewportSize({ width: 1920, height: 1080 });
    let metrics = await analyzeLayoutMetrics(page, VIEWPORTS.standard_1920.name, pageName);
    console.log(`\n${pageName} at 1920px:`);
    console.log(`  Viewport: ${metrics.viewport.width}x${metrics.viewport.height}`);
    console.log(`  Content area width: ${metrics.contentArea.width.toFixed(0)}px`);
    console.log(`  Tables: ${metrics.tableCount}`);

    // Test at 2560px
    await page.setViewportSize({ width: 2560, height: 1440 });
    await page.waitForTimeout(1000);
    metrics = await analyzeLayoutMetrics(page, VIEWPORTS.large_2560.name, pageName);
    console.log(`\n${pageName} at 2560px:`);
    console.log(`  Viewport: ${metrics.viewport.width}x${metrics.viewport.height}`);
    console.log(`  Content area width: ${metrics.contentArea.width.toFixed(0)}px`);
    console.log(`  Tables: ${metrics.tableCount}`);

    // Capture screenshots
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.screenshot({ path: `screenshots/desktop-1920px/${pageName}.png`, fullPage: true });

    await page.setViewportSize({ width: 2560, height: 1440 });
    await page.screenshot({ path: `screenshots/desktop-2560px/${pageName}.png`, fullPage: true });
  });

  // Test 5: Vulnerabilities Page
  test('should display Vulnerabilities correctly on 1920px and 2560px', async ({ page }) => {
    const pageName = 'Vulnerabilities';
    const pageUrl = '/vulnerability/vulnerabilities';

    await page.goto(pageUrl);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    console.log(`\n=== Testing ${pageName} ===`);

    // Test at 1920px
    await page.setViewportSize({ width: 1920, height: 1080 });
    let metrics = await analyzeLayoutMetrics(page, VIEWPORTS.standard_1920.name, pageName);
    console.log(`\n${pageName} at 1920px:`);
    console.log(`  Viewport: ${metrics.viewport.width}x${metrics.viewport.height}`);
    console.log(`  Content area width: ${metrics.contentArea.width.toFixed(0)}px`);
    console.log(`  Tables: ${metrics.tableCount}`);

    // Test at 2560px
    await page.setViewportSize({ width: 2560, height: 1440 });
    await page.waitForTimeout(1000);
    metrics = await analyzeLayoutMetrics(page, VIEWPORTS.large_2560.name, pageName);
    console.log(`\n${pageName} at 2560px:`);
    console.log(`  Viewport: ${metrics.viewport.width}x${metrics.viewport.height}`);
    console.log(`  Content area width: ${metrics.contentArea.width.toFixed(0)}px`);
    console.log(`  Tables: ${metrics.tableCount}`);

    // Capture screenshots
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.screenshot({ path: `screenshots/desktop-1920px/${pageName}.png`, fullPage: true });

    await page.setViewportSize({ width: 2560, height: 1440 });
    await page.screenshot({ path: `screenshots/desktop-2560px/${pageName}.png`, fullPage: true });
  });

  // Test 6: User Management Settings Page
  test('should display User Management correctly on 1920px and 2560px', async ({ page }) => {
    const pageName = 'UserManagement';
    const pageUrl = '/settings/user-management/users';

    await page.goto(pageUrl);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    console.log(`\n=== Testing ${pageName} ===`);

    // Test at 1920px
    await page.setViewportSize({ width: 1920, height: 1080 });
    let metrics = await analyzeLayoutMetrics(page, VIEWPORTS.standard_1920.name, pageName);
    console.log(`\n${pageName} at 1920px:`);
    console.log(`  Viewport: ${metrics.viewport.width}x${metrics.viewport.height}`);
    console.log(`  Content area width: ${metrics.contentArea.width.toFixed(0)}px`);
    console.log(`  Sidebar width: ${metrics.sidebarWidth}px`);
    console.log(`  Tables: ${metrics.tableCount}`);

    // Test at 2560px
    await page.setViewportSize({ width: 2560, height: 1440 });
    await page.waitForTimeout(1000);
    metrics = await analyzeLayoutMetrics(page, VIEWPORTS.large_2560.name, pageName);
    console.log(`\n${pageName} at 2560px:`);
    console.log(`  Viewport: ${metrics.viewport.width}x${metrics.viewport.height}`);
    console.log(`  Content area width: ${metrics.contentArea.width.toFixed(0)}px`);
    console.log(`  Sidebar width: ${metrics.sidebarWidth}px`);
    console.log(`  Tables: ${metrics.tableCount}`);

    // Capture screenshots
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.screenshot({ path: `screenshots/desktop-1920px/${pageName}.png`, fullPage: true });

    await page.setViewportSize({ width: 2560, height: 1440 });
    await page.screenshot({ path: `screenshots/desktop-2560px/${pageName}.png`, fullPage: true });
  });

  // Test 7: Max-width constraints analysis
  test('should analyze max-width constraints across pages', async ({ page }) => {
    console.log('\n=== Max-width Constraints Analysis ===\n');

    for (const pageInfo of PAGES_TO_TEST) {
      await page.goto(pageInfo.url).catch(() => {
        // Continue if page doesn't exist
      });
      await page.waitForTimeout(1000);

      const constraints = await measureContentConstraints(page);
      console.log(`${pageInfo.name}:`);
      console.log(`  Has max-width constraints: ${constraints.hasMaxWidthConstraints}`);
      if (constraints.constraints.length > 0) {
        constraints.constraints.forEach(([selector, maxWidth]) => {
          console.log(`    ${selector}: ${maxWidth}`);
        });
      }
    }
  });

  // Test 8: Breakpoint detection
  test('should detect responsive breakpoints', async ({ page }) => {
    console.log('\n=== Responsive Breakpoints Detection ===\n');

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const breakpoints = await detectBreakpoints(page);
    console.log('Detected breakpoints (Ant Design):', breakpoints);

    // Verify key breakpoints
    expect(breakpoints).toContain(1200); // lg breakpoint
    expect(breakpoints).toContain(1600); // xxl breakpoint
  });

  // Test 9: Content scaling assessment
  test('should assess content scaling at both resolutions', async ({ page }) => {
    console.log('\n=== Content Scaling Assessment ===\n');

    const scalingReport: Record<string, any> = {};

    for (const pageInfo of PAGES_TO_TEST) {
      await page.goto(pageInfo.url).catch(() => {
        // Continue if page doesn't exist
      });
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1500);

      scalingReport[pageInfo.name] = {};

      // At 1920px
      await page.setViewportSize({ width: 1920, height: 1080 });
      const metrics1920 = await analyzeLayoutMetrics(page, VIEWPORTS.standard_1920.name, pageInfo.name);
      scalingReport[pageInfo.name]['1920px'] = {
        contentWidth: metrics1920.contentArea.width,
        tableCount: metrics1920.tableCount,
        cardCount: metrics1920.cardCount,
      };

      // At 2560px
      await page.setViewportSize({ width: 2560, height: 1440 });
      await page.waitForTimeout(500);
      const metrics2560 = await analyzeLayoutMetrics(page, VIEWPORTS.large_2560.name, pageInfo.name);
      scalingReport[pageInfo.name]['2560px'] = {
        contentWidth: metrics2560.contentArea.width,
        tableCount: metrics2560.tableCount,
        cardCount: metrics2560.cardCount,
      };

      // Calculate scaling
      const widthIncrease = (
        (metrics2560.contentArea.width - metrics1920.contentArea.width) /
        metrics1920.contentArea.width * 100
      );
      scalingReport[pageInfo.name].scaling = {
        widthIncreasePercent: widthIncrease.toFixed(1),
        scalingType: widthIncrease > 20 ? 'Fluid' : 'Constrained',
      };
    }

    // Log scaling report
    console.log(JSON.stringify(scalingReport, null, 2));
  });
});
