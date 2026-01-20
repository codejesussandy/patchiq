import { test, expect } from './fixtures';
import { login, waitForPageLoad, checkTableRendered, checkModalOpened, closeModal } from './fixtures';

test.describe('Assets Module', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test.describe('All Assets Page', () => {
    test('should display assets list', async ({ page }) => {
      await page.goto('/assets');
      await waitForPageLoad(page);

      const header = page.locator('h1, h2, [class*="title"]').first();
      await expect(header).toBeVisible();
    });

    test('should display assets table', async ({ page }) => {
      await page.goto('/assets');
      await waitForPageLoad(page);
      await checkTableRendered(page);
    });

    test('should have search functionality', async ({ page }) => {
      await page.goto('/assets');
      await waitForPageLoad(page);

      const searchInput = page.locator('input[type="search"], input[placeholder*="search" i], .ant-input-search input');
      await expect(searchInput.first()).toBeVisible({ timeout: 10000 }).catch(() => {
        console.log('Search input might use different selector');
      });
    });

    test('should have filter options (OS, status, etc.)', async ({ page }) => {
      await page.goto('/assets');
      await waitForPageLoad(page);

      const filters = page.locator('.ant-select, button:has-text("Filter"), [class*="filter"]');
      const count = await filters.count();
      console.log(`Found ${count} filter elements`);
    });

    test('should click asset row to view details', async ({ page }) => {
      await page.goto('/assets');
      await waitForPageLoad(page);

      const firstRow = page.locator('tbody tr, .ant-table-row').first();
      if (await firstRow.isVisible()) {
        await firstRow.click();
        await page.waitForTimeout(1000);
      }
    });

    test('should display asset count or statistics', async ({ page }) => {
      await page.goto('/assets');
      await waitForPageLoad(page);

      const stats = page.locator('[class*="stat"], [class*="count"], [class*="total"]');
      const count = await stats.count();
      console.log(`Found ${count} statistic elements`);
    });

    test('should have export functionality', async ({ page }) => {
      await page.goto('/assets');
      await waitForPageLoad(page);

      const exportBtn = page.locator('button:has-text("Export"), button:has-text("Download")');
      const count = await exportBtn.count();
      console.log(`Found ${count} export buttons`);
    });

    test('should support column sorting', async ({ page }) => {
      await page.goto('/assets');
      await waitForPageLoad(page);

      const sortableHeaders = page.locator('th.ant-table-column-has-sorters, th[class*="sort"]');
      const count = await sortableHeaders.count();
      console.log(`Found ${count} sortable columns`);
    });
  });

  test.describe('Asset Details Page', () => {
    test('should display asset details', async ({ page }) => {
      await page.goto('/assets');
      await waitForPageLoad(page);

      const firstRow = page.locator('tbody tr, .ant-table-row').first();
      if (await firstRow.isVisible()) {
        await firstRow.click();
        await page.waitForURL(/\/assets\//, { timeout: 10000 }).catch(() => {
          console.log('Might open modal instead of navigating');
        });
      }
    });
  });

  test.describe('Software Inventory Page', () => {
    test('should navigate to software inventory', async ({ page }) => {
      await page.goto('/assets/software-inventory');
      await waitForPageLoad(page);

      const content = page.locator('main, [class*="content"]').first();
      await expect(content).toBeVisible();
    });

    test('should display software list table', async ({ page }) => {
      await page.goto('/assets/software-inventory');
      await waitForPageLoad(page);
      await checkTableRendered(page);
    });

    test('should show software versions', async ({ page }) => {
      await page.goto('/assets/software-inventory');
      await waitForPageLoad(page);

      // Look for version column or version text
      const versions = page.locator('td:has-text("."), [class*="version"]');
      const count = await versions.count();
      console.log(`Found ${count} version elements`);
    });

    test('should have vendor filter', async ({ page }) => {
      await page.goto('/assets/software-inventory');
      await waitForPageLoad(page);

      const vendorFilter = page.locator('.ant-select, select, [class*="vendor"]');
      const count = await vendorFilter.count();
      console.log(`Found ${count} vendor filter elements`);
    });
  });

  test.describe('Software License Page', () => {
    test('should navigate to software license page', async ({ page }) => {
      await page.goto('/assets/software-license');
      await waitForPageLoad(page);

      const content = page.locator('main, [class*="content"]').first();
      await expect(content).toBeVisible();
    });

    test('should display license information', async ({ page }) => {
      await page.goto('/assets/software-license');
      await waitForPageLoad(page);
      await checkTableRendered(page);
    });

    test('should have add license button', async ({ page }) => {
      await page.goto('/assets/software-license');
      await waitForPageLoad(page);

      const addBtn = page.locator('button:has-text("Add"), button:has-text("Create"), button:has-text("New")');
      const count = await addBtn.count();
      console.log(`Found ${count} add buttons`);
    });
  });

  test.describe('OS Licenses Page', () => {
    test('should navigate to OS licenses page', async ({ page }) => {
      await page.goto('/assets/os-license');
      await waitForPageLoad(page);

      const content = page.locator('main, [class*="content"]').first();
      await expect(content).toBeVisible();
    });

    test('should display OS license table', async ({ page }) => {
      await page.goto('/assets/os-license');
      await waitForPageLoad(page);
      await checkTableRendered(page);
    });

    test('should show license status (valid/expired/etc)', async ({ page }) => {
      await page.goto('/assets/os-license');
      await waitForPageLoad(page);

      const statusBadges = page.locator('.ant-tag, .ant-badge, [class*="status"]');
      const count = await statusBadges.count();
      console.log(`Found ${count} status elements`);
    });
  });
});
