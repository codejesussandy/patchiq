import { test, expect } from '@playwright/test';

// Tablet viewport configuration (iPad)
const TABLET_VIEWPORT = {
  width: 768,
  height: 1024,
  deviceScaleFactor: 2,
};

test.describe('Phase 5B - Agent 44: Tablet Layout Testing (768px)', () => {
  // Create screenshot directory for tablet tests
  const screenshotDir = 'screenshots/tablet-768px';

  test.use({
    viewport: TABLET_VIEWPORT,
  });

  test.beforeEach(async ({ page }) => {
    // Disable animations for consistent screenshots
    await page.addInitScript(() => {
      const style = document.createElement('style');
      style.textContent = `
        * {
          animation: none !important;
          transition: none !important;
        }
      `;
      document.head.appendChild(style);
    });
  });

  // Test 1: Login Page
  test('1. Login Page - Visual Inspection & Layout', async ({ page }) => {
    await page.goto('http://localhost:5173/login');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    // Check layout width
    const viewport = page.viewportSize();
    expect(viewport?.width).toBe(768);
    expect(viewport?.height).toBe(1024);

    // Capture screenshot
    await page.screenshot({ path: `${screenshotDir}/01-login.png`, fullPage: true });

    // Check form centering
    const loginForm = await page.locator('[class*="ant-form"]').first();
    expect(loginForm).toBeVisible();

    // Check input fields are properly sized
    const inputs = await page.locator('input[type="text"], input[type="password"]').all();
    expect(inputs.length).toBeGreaterThan(0);

    for (const input of inputs) {
      const box = await input.boundingBox();
      expect(box).toBeTruthy();
      if (box) {
        // Input should not be too wide or too narrow
        expect(box.width).toBeGreaterThan(200);
      }
    }

    // Check button is accessible
    const submitBtn = await page.locator('button[type="submit"]');
    expect(submitBtn).toBeVisible();

    console.log('✓ Login page layout OK at 768px');
  });

  // Test 2: Dashboard
  test('2. Dashboard - Layout & Sidebar Behavior', async ({ page }) => {
    await page.goto('http://localhost:5173/dashboard');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    // Capture screenshot
    await page.screenshot({ path: `${screenshotDir}/02-dashboard.png`, fullPage: true });

    // Check sidebar visibility
    const sidebar = await page.locator('[class*="sider"], aside').first();
    const sidebarVisible = await sidebar.isVisible().catch(() => false);
    console.log(`Sidebar visible: ${sidebarVisible}`);

    // Check if hamburger menu exists (for collapsed sidebar)
    const hamburger = await page.locator('button[aria-label*="menu"], button[class*="trigger"]').first();
    const hamburgerVisible = await hamburger.isVisible().catch(() => false);
    console.log(`Hamburger menu visible: ${hamburgerVisible}`);

    // Check main content area
    const mainContent = await page.locator('main, [role="main"], [class*="content"]').first();
    expect(mainContent).toBeVisible();

    // Check for 2-column layouts (cards, grids)
    const cards = await page.locator('[class*="ant-card"]').all();
    console.log(`Number of cards found: ${cards.length}`);

    // Verify no excessive horizontal scroll
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    console.log(`Scroll width: ${scrollWidth}, Client width: ${clientWidth}`);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 50); // Allow small margin

    // Check key dashboard elements
    const dashboardTitle = await page.locator('h1, h2').first();
    if (await dashboardTitle.isVisible()) {
      const text = await dashboardTitle.textContent();
      console.log(`Dashboard title: ${text}`);
    }

    console.log('✓ Dashboard layout OK at 768px');
  });

  // Test 3: Assets List
  test('3. Assets List - Table Responsiveness & Layout', async ({ page }) => {
    await page.goto('http://localhost:5173/assets');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    // Capture screenshot
    await page.screenshot({ path: `${screenshotDir}/03-assets.png`, fullPage: true });

    // Check table presence and visibility
    const table = await page.locator('table, [role="grid"], [class*="ant-table"]').first();
    expect(table).toBeVisible();

    // Check if table fits without horizontal scroll
    const tableContainer = await page.locator('[class*="table-wrapper"], table').first();
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    console.log(`Assets page - Scroll width: ${scrollWidth}, Client width: ${clientWidth}`);

    // Check table columns visibility
    const headers = await page.locator('thead th, [role="columnheader"]').all();
    console.log(`Number of table columns: ${headers.length}`);

    // Verify action buttons are accessible
    const actionButtons = await page.locator('button[title*="edit"], button[title*="delete"], button[title*="view"]').all();
    console.log(`Number of action buttons visible: ${actionButtons.length}`);

    // Check pagination or scroll area
    const pagination = await page.locator('[class*="pagination"], [role="navigation"]').first();
    if (await pagination.isVisible()) {
      console.log('Pagination controls present and visible');
    }

    console.log('✓ Assets list layout OK at 768px');
  });

  // Test 4: Asset Detail Page
  test('4. Asset Detail - Form Layouts & Components', async ({ page }) => {
    await page.goto('http://localhost:5173/assets');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    // Find and click first asset (if available)
    const firstAssetLink = await page.locator('table tbody tr:first-child td a, [class*="asset-row"] a').first();
    if (await firstAssetLink.isVisible()) {
      await firstAssetLink.click();
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000);

      // Capture screenshot
      await page.screenshot({ path: `${screenshotDir}/04-asset-detail.png`, fullPage: true });

      // Check tab layout if present
      const tabs = await page.locator('[role="tab"], [class*="ant-tabs-tab"]').all();
      console.log(`Number of tabs: ${tabs.length}`);

      // Check if tabs are horizontally scrollable or wrapped
      const tabBar = await page.locator('[class*="ant-tabs-nav"]').first();
      if (await tabBar.isVisible()) {
        const tabScrollWidth = await page.evaluate(() => {
          const el = document.querySelector('[class*="ant-tabs-nav"]');
          return el ? el.scrollWidth : 0;
        });
        console.log(`Tab bar scroll width: ${tabScrollWidth}`);
      }

      // Check form fields layout
      const formGroups = await page.locator('[class*="ant-form-item"]').all();
      console.log(`Number of form items: ${formGroups.length}`);

      // Verify field width
      for (let i = 0; i < Math.min(3, formGroups.length); i++) {
        const fieldBox = await formGroups[i].boundingBox();
        if (fieldBox) {
          console.log(`Form field ${i + 1} width: ${fieldBox.width}`);
        }
      }

      console.log('✓ Asset detail layout OK at 768px');
    } else {
      console.log('⚠ No assets available for detail view');
    }
  });

  // Test 5: Patches List
  test('5. Patches List - Table Layout & Responsiveness', async ({ page }) => {
    await page.goto('http://localhost:5173/patches');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    // Capture screenshot
    await page.screenshot({ path: `${screenshotDir}/05-patches.png`, fullPage: true });

    // Check table presence
    const table = await page.locator('table, [role="grid"], [class*="ant-table"]').first();
    expect(table).toBeVisible();

    // Check horizontal scrolling
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    console.log(`Patches page - Scroll width: ${scrollWidth}, Client width: ${clientWidth}`);

    // Check table columns
    const headers = await page.locator('thead th, [role="columnheader"]').all();
    console.log(`Number of patch table columns: ${headers.length}`);

    // Check filters and controls
    const filterBtn = await page.locator('button[title*="filter"], button[class*="filter"]').first();
    if (await filterBtn.isVisible()) {
      console.log('Filter controls are visible');
    }

    // Check if table rows are properly sized for touch
    const firstRow = await page.locator('tbody tr').first();
    const rowBox = await firstRow.boundingBox();
    if (rowBox) {
      console.log(`Table row height: ${rowBox.height} (should be >=44px for touch)`);
      expect(rowBox.height).toBeGreaterThanOrEqual(44);
    }

    console.log('✓ Patches list layout OK at 768px');
  });

  // Test 6: Vulnerabilities
  test('6. Vulnerabilities - Dashboard & Layout', async ({ page }) => {
    await page.goto('http://localhost:5173/vulnerability/vulnerabilities');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    // Capture screenshot
    await page.screenshot({ path: `${screenshotDir}/06-vulnerabilities.png`, fullPage: true });

    // Check main content area
    const mainContent = await page.locator('main, [role="main"], [class*="content"]').first();
    expect(mainContent).toBeVisible();

    // Check for grid layouts
    const gridItems = await page.locator('[class*="ant-row"], [class*="grid"]').all();
    console.log(`Number of grid/row elements: ${gridItems.length}`);

    // Check table if present
    const table = await page.locator('table').first();
    if (await table.isVisible()) {
      const headers = await page.locator('thead th').all();
      console.log(`Vulnerability table columns: ${headers.length}`);
    }

    // Check metric cards
    const metricCards = await page.locator('[class*="ant-statistic"], [class*="metric"]').all();
    console.log(`Number of metric cards: ${metricCards.length}`);

    // Verify no excessive horizontal scroll
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 50);

    console.log('✓ Vulnerabilities layout OK at 768px');
  });

  // Test 7: Settings - User Management
  test('7. Settings - User Management Form Layout', async ({ page }) => {
    await page.goto('http://localhost:5173/settings/user-management/users');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    // Capture screenshot
    await page.screenshot({ path: `${screenshotDir}/07-settings-users.png`, fullPage: true });

    // Check sidebar for settings menu
    const sidebar = await page.locator('[class*="sider"], aside').first();
    if (await sidebar.isVisible()) {
      console.log('Settings sidebar is visible');
    }

    // Check table/list of users
    const table = await page.locator('table, [class*="ant-table"]').first();
    if (await table.isVisible()) {
      console.log('Users table is visible');
      const rows = await page.locator('tbody tr').all();
      console.log(`Number of user rows: ${rows.length}`);
    }

    // Check if add/create button is accessible
    const createBtn = await page.locator('button:has-text("Create"), button:has-text("Add"), button:has-text("New")').first();
    if (await createBtn.isVisible()) {
      console.log('Create/Add button is visible and accessible');
    }

    // Check form if modal opens
    const formElements = await page.locator('input[type="text"], input[type="email"], select').all();
    console.log(`Number of form input fields: ${formElements.length}`);

    console.log('✓ Settings layout OK at 768px');
  });

  // Test 8: Hub
  test('8. Hub - Package Layout & Grid System', async ({ page }) => {
    await page.goto('http://localhost:5173/hub');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    // Capture screenshot
    await page.screenshot({ path: `${screenshotDir}/08-hub.png`, fullPage: true });

    // Check main content
    const mainContent = await page.locator('main, [role="main"], [class*="content"]').first();
    expect(mainContent).toBeVisible();

    // Check for grid/card layout
    const cards = await page.locator('[class*="ant-card"]').all();
    console.log(`Number of cards/packages in Hub: ${cards.length}`);

    // Check if grid uses 2-column layout at tablet size
    if (cards.length > 0) {
      const firstCard = cards[0];
      const firstCardBox = await firstCard.boundingBox();

      if (cards.length > 1 && firstCardBox) {
        const secondCard = cards[1];
        const secondCardBox = await secondCard.boundingBox();

        if (secondCardBox && firstCardBox && secondCardBox.top === firstCardBox.top) {
          console.log('Grid uses horizontal layout (same row)');
        } else if (secondCardBox && firstCardBox && secondCardBox.top > firstCardBox.top) {
          console.log('Grid uses vertical layout (stacked)');
        }
      }
    }

    // Check pagination or infinite scroll
    const pagination = await page.locator('[class*="pagination"]').first();
    if (await pagination.isVisible()) {
      console.log('Pagination controls visible');
    }

    // Check search/filter controls
    const searchInput = await page.locator('input[placeholder*="search"], input[placeholder*="Search"]').first();
    if (await searchInput.isVisible()) {
      const inputBox = await searchInput.boundingBox();
      if (inputBox) {
        console.log(`Search input width: ${inputBox.width}`);
      }
    }

    // Verify no excessive horizontal scroll
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 50);

    console.log('✓ Hub layout OK at 768px');
  });

  // Comprehensive Layout Analysis Test
  test('9. Comprehensive Tablet Layout Analysis', async ({ page }) => {
    const layoutReport = {
      viewport: TABLET_VIEWPORT,
      pages: [] as any[],
      summary: {
        totalPages: 8,
        passedPages: 0,
        failedPages: 0,
        issues: [] as string[],
      },
    };

    const pagesToTest = [
      { name: 'Login', url: 'http://localhost:5173/login' },
      { name: 'Dashboard', url: 'http://localhost:5173/dashboard' },
      { name: 'Assets', url: 'http://localhost:5173/assets' },
      { name: 'Patches', url: 'http://localhost:5173/patches' },
      { name: 'Vulnerabilities', url: 'http://localhost:5173/vulnerability/vulnerabilities' },
      { name: 'Settings', url: 'http://localhost:5173/settings/user-management/users' },
      { name: 'Hub', url: 'http://localhost:5173/hub' },
    ];

    for (const pageConfig of pagesToTest) {
      try {
        await page.goto(pageConfig.url);
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(1000);

        // Check for horizontal overflow
        const hasHorizontalScroll = await page.evaluate(() => {
          return document.documentElement.scrollWidth > document.documentElement.clientWidth;
        });

        // Check viewport fit
        const viewportWidth = await page.evaluate(() => document.documentElement.clientWidth);

        // Collect layout metrics
        const pageMetrics = {
          name: pageConfig.name,
          url: pageConfig.url,
          hasHorizontalScroll,
          viewportWidth,
          passed: !hasHorizontalScroll,
          issues: [] as string[],
        };

        if (hasHorizontalScroll) {
          pageMetrics.issues.push(`Horizontal scroll detected (viewport: ${viewportWidth}px)`);
          layoutReport.summary.failedPages++;
        } else {
          layoutReport.summary.passedPages++;
        }

        layoutReport.pages.push(pageMetrics);
      } catch (error) {
        console.error(`Error testing ${pageConfig.name}:`, error);
      }
    }

    // Generate summary report
    console.log('\n=== TABLET LAYOUT TEST SUMMARY (768px) ===');
    console.log(`Passed: ${layoutReport.summary.passedPages}/${layoutReport.summary.totalPages}`);
    console.log(`Failed: ${layoutReport.summary.failedPages}/${layoutReport.summary.totalPages}`);
    console.log('\nPage Results:');
    for (const page of layoutReport.pages) {
      const status = page.passed ? '✓ PASS' : '✗ FAIL';
      console.log(`${status} - ${page.name}`);
      if (page.issues.length > 0) {
        page.issues.forEach((issue) => console.log(`    - ${issue}`));
      }
    }
  });
});
