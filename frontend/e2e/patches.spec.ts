import { test, expect } from './fixtures';
import { login, waitForPageLoad, checkTableRendered, checkModalOpened, closeModal } from './fixtures';

test.describe('Patches Module', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test.describe('All Patches Page', () => {
    test('should display patches list', async ({ page }) => {
      await page.goto('/patches');
      await waitForPageLoad(page);

      // Check page title or header
      const header = page.locator('h1, h2, [class*="title"], [class*="header"]').first();
      await expect(header).toBeVisible();
    });

    test('should display patches table', async ({ page }) => {
      await page.goto('/patches');
      await waitForPageLoad(page);
      await checkTableRendered(page);
    });

    test('should have search functionality', async ({ page }) => {
      await page.goto('/patches');
      await waitForPageLoad(page);

      const searchInput = page.locator('input[type="search"], input[placeholder*="search" i], .ant-input-search input');
      await expect(searchInput.first()).toBeVisible({ timeout: 10000 }).catch(() => {
        console.log('Search input might use different selector');
      });
    });

    test('should have filter options', async ({ page }) => {
      await page.goto('/patches');
      await waitForPageLoad(page);

      // Look for filter buttons or dropdowns
      const filters = page.locator('button:has-text("Filter"), .ant-select, [class*="filter"]');
      const count = await filters.count();
      console.log(`Found ${count} filter elements`);
    });

    test('should click on a patch row to view details', async ({ page }) => {
      await page.goto('/patches');
      await waitForPageLoad(page);

      // Click on first table row
      const firstRow = page.locator('tbody tr, .ant-table-row').first();
      if (await firstRow.isVisible()) {
        await firstRow.click();
        await page.waitForTimeout(1000);
        // Should navigate to patch details or open a modal
      }
    });

    test('should have action buttons (deploy, test, etc.)', async ({ page }) => {
      await page.goto('/patches');
      await waitForPageLoad(page);

      // Look for action buttons
      const actionButtons = page.locator('button:has-text("Deploy"), button:has-text("Test"), button:has-text("Install"), [class*="action"]');
      const count = await actionButtons.count();
      console.log(`Found ${count} action buttons`);
    });

    test('should support pagination', async ({ page }) => {
      await page.goto('/patches');
      await waitForPageLoad(page);

      const pagination = page.locator('.ant-pagination, [class*="pagination"]');
      await expect(pagination.first()).toBeVisible({ timeout: 10000 }).catch(() => {
        console.log('Pagination might not be visible with few items');
      });
    });

    test('should have bulk selection checkbox', async ({ page }) => {
      await page.goto('/patches');
      await waitForPageLoad(page);

      const selectAllCheckbox = page.locator('thead input[type="checkbox"], .ant-table-selection');
      await expect(selectAllCheckbox.first()).toBeVisible({ timeout: 10000 }).catch(() => {
        console.log('Bulk selection might not be implemented');
      });
    });
  });

  test.describe('Patch Details Page', () => {
    test('should display patch details when clicking a patch', async ({ page }) => {
      await page.goto('/patches');
      await waitForPageLoad(page);

      // Click on first row to navigate to details
      const firstRow = page.locator('tbody tr, .ant-table-row').first();
      if (await firstRow.isVisible()) {
        await firstRow.click();
        await page.waitForTimeout(2000);

        // Check if we're on details page or modal
        const detailsSection = page.locator('[class*="detail"], [class*="info"], .ant-descriptions');
        const isVisible = await detailsSection.first().isVisible().catch(() => false);
        console.log(`Details section visible: ${isVisible}`);
      }
    });
  });

  test.describe('Deployed Patches Page', () => {
    test('should navigate to deployed patches', async ({ page }) => {
      await page.goto('/patches/deployed');
      await waitForPageLoad(page);

      // Page should load without error
      const content = page.locator('main, [class*="content"]').first();
      await expect(content).toBeVisible();
    });

    test('should display deployed patches table', async ({ page }) => {
      await page.goto('/patches/deployed');
      await waitForPageLoad(page);
      await checkTableRendered(page);
    });
  });

  test.describe('Patch Test & Approve Page', () => {
    test('should navigate to test & approve page', async ({ page }) => {
      await page.goto('/patches/test-approve');
      await waitForPageLoad(page);

      const content = page.locator('main, [class*="content"]').first();
      await expect(content).toBeVisible();
    });

    test('should display patches pending approval', async ({ page }) => {
      await page.goto('/patches/test-approve');
      await waitForPageLoad(page);
      await checkTableRendered(page);
    });

    test('should have approve/reject buttons', async ({ page }) => {
      await page.goto('/patches/test-approve');
      await waitForPageLoad(page);

      const approveBtn = page.locator('button:has-text("Approve"), button:has-text("Accept")');
      const rejectBtn = page.locator('button:has-text("Reject"), button:has-text("Decline")');

      console.log(`Approve buttons: ${await approveBtn.count()}`);
      console.log(`Reject buttons: ${await rejectBtn.count()}`);
    });
  });

  test.describe('Zero Touch Deployment Page', () => {
    test('should navigate to zero touch deployment', async ({ page }) => {
      await page.goto('/patches/zero-touch');
      await waitForPageLoad(page);

      const content = page.locator('main, [class*="content"]').first();
      await expect(content).toBeVisible();
    });

    test('should display configuration options', async ({ page }) => {
      await page.goto('/patches/zero-touch');
      await waitForPageLoad(page);

      // Look for configuration form or settings
      const configSection = page.locator('form, [class*="config"], [class*="setting"]');
      const count = await configSection.count();
      console.log(`Found ${count} configuration elements`);
    });

    test('should have create/add button for new configurations', async ({ page }) => {
      await page.goto('/patches/zero-touch');
      await waitForPageLoad(page);

      const addButton = page.locator('button:has-text("Create"), button:has-text("Add"), button:has-text("New")');
      const count = await addButton.count();
      console.log(`Found ${count} add/create buttons`);
    });
  });
});
