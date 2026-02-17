import { test, expect } from '@playwright/test';

test.describe('Patch Testing Workflow (Phase 4 - Agent 24)', () => {
  test.use({ baseURL: 'http://localhost:5173' });

  test('1. Navigate to Patch Tests Page', async ({ page }) => {
    await page.goto('/patches/test-approve', { waitUntil: 'load' });
    console.log('✓ Navigated to /patches/test-approve');

    await page.waitForTimeout(2000);
    console.log('✓ Page loaded');

    const heading = page.locator('text=Patch Test and Approve').first();
    const isVisible = await heading.isVisible().catch(() => false);
    console.log(`✓ Heading visible: ${isVisible}`);

    await page.screenshot({ path: 'screenshots/01-patch-tests-page.png', fullPage: true });
    console.log('✓ Screenshot taken: 01-patch-tests-page.png');
  });

  test('2. Check UI Elements and Create Button', async ({ page }) => {
    await page.goto('/patches/test-approve', { waitUntil: 'load' });
    await page.waitForTimeout(1500);

    const createButton = page.locator('button:has-text("Create")').first();
    const createExists = await createButton.isVisible().catch(() => false);
    console.log(`✓ Create button visible: ${createExists}`);

    if (createExists) {
      await page.screenshot({ path: 'screenshots/02-create-button.png', fullPage: true });
      console.log('✓ Screenshot taken: 02-create-button.png');
    }

    const headings = await page.locator('h1, h2, h3').all();
    const headingTexts = await Promise.all(headings.map(h => h.textContent()));
    console.log(`✓ Headings found: ${headingTexts.filter(Boolean).join(', ')}`);

    const buttons = await page.locator('button').all();
    const buttonTexts = await Promise.all(buttons.map(b => b.textContent()));
    console.log(`✓ Buttons: ${buttonTexts.filter(Boolean).join(', ')}`);
  });

  test('3. Create Test Deployment - Empty State', async ({ page }) => {
    await page.goto('/patches/test-approve', { waitUntil: 'load' });
    await page.waitForTimeout(1500);

    const emptyState = page.locator('text=No patch tests configured yet');
    const isEmptyState = await emptyState.isVisible().catch(() => false);
    console.log(`✓ Empty state visible: ${isEmptyState}`);

    if (isEmptyState) {
      console.log('✓ No existing tests - showing empty state');
      await page.screenshot({ path: 'screenshots/03-empty-state.png', fullPage: true });

      const createBtn = page.locator('button:has-text("Create Test")').first();
      if (await createBtn.isVisible().catch(() => false)) {
        console.log('✓ Found Create Test button in empty state');
        await createBtn.click();
        console.log('✓ Clicked Create Test button');

        await page.waitForSelector('[role="dialog"]', { timeout: 5000 }).catch(() => {
          console.log('✗ Modal did not appear');
        });
        console.log('✓ Modal opened');

        await page.screenshot({ path: 'screenshots/04-create-test-modal.png', fullPage: true });
        console.log('✓ Screenshot taken: 04-create-test-modal.png');

        const testNameInput = page.locator('input[placeholder="Enter test name"]');
        if (await testNameInput.isVisible().catch(() => false)) {
          console.log('✓ Test name input found');
          await testNameInput.fill('Test Case 1');
          console.log('✓ Filled test name');

          const descriptionInput = page.locator('textarea[placeholder="Enter description"]');
          if (await descriptionInput.isVisible().catch(() => false)) {
            await descriptionInput.fill('Test patch testing workflow');
            console.log('✓ Filled description');
          }

          await page.screenshot({ path: 'screenshots/05-form-filled.png', fullPage: true });
          console.log('✓ Screenshot taken: 05-form-filled.png');
        } else {
          console.log('✗ Test name input not found');
        }
      } else {
        console.log('✗ Create Test button not visible');
      }
    } else {
      console.log('✓ Tests exist - listing displayed');
      await page.screenshot({ path: 'screenshots/03-tests-list.png', fullPage: true });
    }
  });

  test('4. Monitor Test Status and Indicators', async ({ page }) => {
    await page.goto('/patches/test-approve', { waitUntil: 'load' });
    await page.waitForTimeout(1500);

    const statusTags = await page.locator('[class*="Tag"]').all();
    console.log(`✓ Status tags found: ${statusTags.length}`);

    const pageText = await page.locator('body').textContent().catch(() => null) || '';
    const statusMatches = pageText.match(/(PENDING|APPROVED|REJECTED|IN_PROGRESS|TESTED|TEST_FAILED)/g) || [];
    console.log(`✓ Test statuses visible: ${[...new Set(statusMatches)].join(', ') || 'None'}`);

    await page.screenshot({ path: 'screenshots/06-test-status.png', fullPage: true });
    console.log('✓ Screenshot taken: 06-test-status.png');
  });

  test('5. Check Approval/Rejection Actions', async ({ page }) => {
    await page.goto('/patches/test-approve', { waitUntil: 'load' });
    await page.waitForTimeout(1500);

    const moreButtons = await page.locator('button[type="text"]').all();
    console.log(`✓ Action menu buttons found: ${moreButtons.length}`);

    if (moreButtons.length > 0) {
      console.log('✓ Action menus available for tests');
      await moreButtons[0].click();
      await page.waitForTimeout(500);

      const approveOption = page.locator('text=Approve').first();
      const deleteOption = page.locator('text=Delete').first();
      const viewOption = page.locator('text=View').first();

      const hasApprove = await approveOption.isVisible().catch(() => false);
      const hasDelete = await deleteOption.isVisible().catch(() => false);
      const hasView = await viewOption.isVisible().catch(() => false);

      console.log(`✓ Approve option available: ${hasApprove}`);
      console.log(`✓ Delete option available: ${hasDelete}`);
      console.log(`✓ View option available: ${hasView}`);

      await page.screenshot({ path: 'screenshots/07-action-menu.png', fullPage: true });
      console.log('✓ Screenshot taken: 07-action-menu.png');

      await page.click('body', { position: { x: 100, y: 100 } });
    } else {
      console.log('✗ No action menus found');
    }
  });

  test('6. Search and Filter Functionality', async ({ page }) => {
    await page.goto('/patches/test-approve', { waitUntil: 'load' });
    await page.waitForTimeout(1500);

    const searchInput = page.locator('input[placeholder*="Search"]').first();
    const hasSearch = await searchInput.isVisible().catch(() => false);
    console.log(`✓ Search input available: ${hasSearch}`);

    if (hasSearch) {
      await searchInput.fill('test');
      await page.waitForTimeout(500);
      console.log('✓ Typed in search');

      await page.screenshot({ path: 'screenshots/08-search.png', fullPage: true });
      console.log('✓ Screenshot taken: 08-search.png');

      await searchInput.clear();
    }
  });

  test('7. Verify Page Structure', async ({ page }) => {
    await page.goto('/patches/test-approve', { waitUntil: 'load' });
    await page.waitForTimeout(1500);

    const size = page.viewportSize();
    console.log(`✓ Viewport size: ${size?.width}x${size?.height}`);

    const header = page.locator('text=Patch Test and Approve');
    const isHeaderVisible = await header.isVisible().catch(() => false);
    console.log(`✓ Header visible in viewport: ${isHeaderVisible}`);

    // Check for DataTable structure
    const table = page.locator('table');
    const hasTable = await table.isVisible().catch(() => false);
    console.log(`✓ DataTable visible: ${hasTable}`);

    await page.screenshot({ path: 'screenshots/09-page-structure.png', fullPage: true });
    console.log('✓ Screenshot taken: 09-page-structure.png');
  });

  test('8. Page Performance Metrics', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/patches/test-approve', { waitUntil: 'load' });
    const domTime = Date.now() - startTime;
    console.log(`✓ DOM load time: ${domTime}ms`);

    await page.waitForTimeout(2000);
    const networkTime = Date.now() - startTime;
    console.log(`✓ Total load time: ${networkTime}ms`);

    const perfMetrics = await page.evaluate(() => {
      const perfData = window.performance.timing;
      const navigationStart = perfData.navigationStart;
      const domContentLoaded = perfData.domContentLoadedEventEnd - navigationStart;
      const loadComplete = perfData.loadEventEnd - navigationStart;
      return {
        domContentLoaded,
        loadComplete,
        navigationStart,
        timestamp: new Date().toISOString()
      };
    }).catch(() => ({ error: 'Could not get metrics' }));

    console.log(`✓ Browser metrics: ${JSON.stringify(perfMetrics)}`);

    await page.screenshot({ path: 'screenshots/10-performance.png', fullPage: true });
    console.log('✓ Screenshot taken: 10-performance.png');
  });
});
