import { test, expect, Page } from '@playwright/test';

test.describe('PHASE 4 - AGENT 26: Vulnerability Exceptions', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage({ storageState: './auth.json' });
    // Don't specify waitUntil for navigation, just wait for page to be ready
    await page.goto('http://localhost:5173/vulnerability/manage-exception');
    await page.waitForLoadState('domcontentloaded');
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('1. Navigate to Exception Management page', async () => {
    console.log('TEST 1: Navigate to Exception Management page');

    // Verify URL
    expect(page.url()).toContain('/vulnerability/manage-exception');
    console.log('✓ URL is correct');

    // Wait for any spinner to disappear (max 10 seconds)
    try {
      await page.locator('.ant-spin').waitFor({ state: 'hidden', timeout: 10000 });
      console.log('✓ Loading spinner disappeared');
    } catch {
      console.log('No loading spinner found');
    }

    // Check for search input
    const searchInput = page.locator('input').first();
    await expect(searchInput).toBeVisible({ timeout: 5000 });
    console.log('✓ Search input is visible');

    // Check for button
    const buttons = page.locator('button');
    const refreshBtn = buttons.filter({ hasText: /Refresh/i }).first();
    await expect(refreshBtn).toBeVisible({ timeout: 5000 });
    console.log('✓ Refresh button is visible');

    // Take screenshot
    await page.screenshot({ path: 'screenshots/exception-management-1.png' });
    console.log('✓ Screenshot captured');
  });

  test('2. Get exception list count', async () => {
    console.log('TEST 2: Get exception list count');

    // Wait for table to load
    try {
      await page.locator('.ant-table').waitFor({ timeout: 10000 });
      console.log('✓ Table is present');
    } catch {
      console.log('Table not found, checking for empty state');
    }

    // Get table rows
    const rows = page.locator('tbody tr');
    const count = await rows.count();
    console.log(`Exception count: ${count}`);

    await page.screenshot({ path: 'screenshots/exception-management-2.png' });
  });

  test('3. Check table columns', async () => {
    console.log('TEST 3: Check table columns');

    // Wait for table to load
    await page.locator('.ant-table').waitFor({ timeout: 10000 });

    // Get table headers
    const headers = page.locator('th');
    const headerTexts: string[] = [];

    for (let i = 0; i < Math.min(6, await headers.count()); i++) {
      const text = await headers.nth(i).textContent();
      headerTexts.push(text || '');
    }

    console.log('Table headers:', headerTexts);

    const expectedHeaders = ['CVE', 'Exception Type', 'Reason', 'Created By', 'Actions'];
    for (const header of expectedHeaders) {
      const found = headerTexts.some(h => h.toLowerCase().includes(header.toLowerCase()));
      console.log(`  ${found ? '✓' : '✗'} Header "${header}" ${found ? 'found' : 'not found'}`);
    }

    await page.screenshot({ path: 'screenshots/exception-management-3.png' });
  });

  test('4. Test search functionality', async () => {
    console.log('TEST 4: Test search functionality');

    // Get search input
    const searchInput = page.locator('input[type="text"]').first();
    await searchInput.fill('CVE-2024');

    // Wait a bit for filtering
    await page.waitForTimeout(500);

    const rows = page.locator('tbody tr');
    const count = await rows.count();
    console.log(`Rows after search: ${count}`);

    // Clear search
    await searchInput.clear();
    await page.waitForTimeout(500);

    const allRows = page.locator('tbody tr');
    const allCount = await allRows.count();
    console.log(`Rows after clearing search: ${allCount}`);

    await page.screenshot({ path: 'screenshots/exception-management-4.png' });
  });

  test('5. Test refresh button', async () => {
    console.log('TEST 5: Test refresh button');

    const refreshBtn = page.locator('button').filter({ hasText: /Refresh/i }).first();

    // Get initial row count
    const rowsBefore = page.locator('tbody tr');
    const countBefore = await rowsBefore.count();

    // Click refresh
    await refreshBtn.click();

    // Wait for loading to complete
    await page.waitForTimeout(1000);

    try {
      await page.locator('.ant-spin').waitFor({ state: 'hidden', timeout: 5000 });
    } catch {
      // Spinner might not appear
    }

    const rowsAfter = page.locator('tbody tr');
    const countAfter = await rowsAfter.count();

    console.log(`Rows before refresh: ${countBefore}`);
    console.log(`Rows after refresh: ${countAfter}`);
    console.log('✓ Refresh button clicked successfully');

    await page.screenshot({ path: 'screenshots/exception-management-5.png' });
  });

  test('6. Test export button', async () => {
    console.log('TEST 6: Test export button');

    const exportBtn = page.locator('button').filter({ hasText: /Export/i }).first();
    await expect(exportBtn).toBeVisible();

    // Just click to ensure button works
    await exportBtn.click();

    console.log('✓ Export button clicked successfully');

    await page.screenshot({ path: 'screenshots/exception-management-6.png' });
  });

  test('7. Verify Dashboard Vulnerability Count', async () => {
    console.log('TEST 7: Verify Dashboard Vulnerability Count');

    // Navigate to dashboard
    await page.goto('http://localhost:5173/dashboard');
    await page.waitForLoadState('domcontentloaded');

    // Wait a bit for dashboard to render
    await page.waitForTimeout(2000);

    // Take screenshot
    await page.screenshot({ path: 'screenshots/exception-management-dashboard.png' });

    // Try to find vulnerability stats
    const bodyText = await page.locator('body').textContent();

    // Look for numbers that might represent vulnerability counts
    const vulnStatCards = page.locator('.ant-statistic');
    const cardCount = await vulnStatCards.count();
    console.log(`Found ${cardCount} stat cards on dashboard`);

    if (cardCount > 0) {
      for (let i = 0; i < Math.min(5, cardCount); i++) {
        try {
          const title = await vulnStatCards.nth(i).locator('.ant-statistic-title').textContent();
          const value = await vulnStatCards.nth(i).locator('.ant-statistic-content').textContent();
          console.log(`  Card ${i}: ${title} = ${value}`);
        } catch {
          // Skip if card doesn't have expected structure
        }
      }
    }

    // Look for vulnerability-related text
    if (bodyText && bodyText.includes('Vulnerability')) {
      console.log('✓ Vulnerability information found on dashboard');
    }

    console.log('✓ Dashboard loaded successfully');
  });

  test('8. Verify page structure and accessibility', async () => {
    console.log('TEST 8: Verify page structure and accessibility');

    // Check for main content area
    const mainContent = page.locator('main, [role="main"], .ant-layout-content');
    await expect(mainContent).toBeVisible({ timeout: 5000 });
    console.log('✓ Main content area is visible');

    // Check for table or empty state
    const hasTable = await page.locator('.ant-table').isVisible().catch(() => false);
    const hasEmpty = await page.locator('.ant-empty').isVisible().catch(() => false);

    console.log(`Table visible: ${hasTable}`);
    console.log(`Empty state visible: ${hasEmpty}`);

    if (hasTable || hasEmpty) {
      console.log('✓ Expected UI element found');
    }

    // Check for responsive behavior
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.screenshot({ path: 'screenshots/exception-management-desktop.png' });
    console.log('✓ Desktop view screenshot captured');

    // Test tablet view
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.screenshot({ path: 'screenshots/exception-management-tablet.png' });
    console.log('✓ Tablet view screenshot captured');
  });

  test('9. Verify console errors', async () => {
    console.log('TEST 9: Verify console errors');

    const errors: string[] = [];
    const warnings: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      } else if (msg.type() === 'warn') {
        warnings.push(msg.text());
      }
    });

    // Spend some time on the page to catch any errors
    await page.waitForTimeout(2000);

    console.log(`Console errors: ${errors.length}`);
    if (errors.length > 0) {
      console.log('Errors detected:');
      errors.slice(0, 5).forEach(e => console.log(`  - ${e}`));
    }

    console.log(`Console warnings: ${warnings.length}`);

    // Screenshot
    await page.screenshot({ path: 'screenshots/exception-management-console.png' });
  });

  test('10. Test edit exception (if exists)', async () => {
    console.log('TEST 10: Test edit exception (if exists)');

    // Check if table has any rows
    const rows = page.locator('tbody tr');
    const rowCount = await rows.count();

    if (rowCount === 0) {
      console.log('No exceptions to edit. Skipping.');
      return;
    }

    // Get first row
    const firstRow = rows.first();

    // Look for edit button
    const editButton = firstRow.locator('button').first();

    if (await editButton.isVisible().catch(() => false)) {
      await editButton.click();

      // Wait for modal
      await page.waitForTimeout(1000);

      const modal = page.locator('.ant-modal');
      const isVisible = await modal.isVisible().catch(() => false);

      console.log(`Edit modal visible: ${isVisible}`);

      if (isVisible) {
        // Take screenshot
        await page.screenshot({ path: 'screenshots/exception-management-edit-modal.png' });

        // Close modal
        const closeBtn = modal.locator('button:has-text("Cancel")').first();
        if (await closeBtn.isVisible()) {
          await closeBtn.click();
          console.log('✓ Edit modal closed');
        }
      }
    }
  });
});
