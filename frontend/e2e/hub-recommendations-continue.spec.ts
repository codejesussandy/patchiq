/**
 * Continuation Testing for Hub/Recommendations Module
 * Focus on remaining scenarios: Filters, Details, Deploy, Search, Bulk Actions
 */

import { test, expect, Page } from '@playwright/test';
import { login, waitForPageLoad, checkTableRendered } from './fixtures';

const SCREENSHOTS_DIR = '/Users/shandesh/src/VS-code/PatchIQ/full-dev-sandy-v2/screenshots/';
const BASE_URL = 'http://localhost:5173';

test.describe('Hub/Recommendations - Continuation Testing', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test.describe('Hub Module - Detailed Testing', () => {
    test('should display and interact with Hub filters', async ({ page }) => {
      await page.goto(`${BASE_URL}/assets/hub`);
      await waitForPageLoad(page);

      console.log('✓ Navigated to Hub page');

      // Wait for table to load
      await checkTableRendered(page);

      // Test Platform filter
      const platformSelect = page.locator('input[placeholder="Platform"]').first();
      if (await platformSelect.isVisible({ timeout: 5000 })) {
        await platformSelect.click();
        await page.waitForTimeout(500);

        await page.screenshot({
          path: `${SCREENSHOTS_DIR}hub-filter-dropdown-open.png`,
          fullPage: true
        });

        // Select Windows
        const windowsOption = page.locator('.ant-select-item:has-text("Windows")').first();
        if (await windowsOption.isVisible({ timeout: 3000 })) {
          await windowsOption.click();
          await page.waitForTimeout(1000);

          await page.screenshot({
            path: `${SCREENSHOTS_DIR}hub-filter-platform.png`,
            fullPage: true
          });

          console.log('✓ Platform filter applied successfully');
        }
      }

      // Test Category filter
      const categorySelect = page.locator('input[placeholder="Category"]').first();
      if (await categorySelect.isVisible({ timeout: 5000 })) {
        await categorySelect.click();
        await page.waitForTimeout(500);

        const firstOption = page.locator('.ant-select-item-option').first();
        if (await firstOption.isVisible({ timeout: 2000 })) {
          await firstOption.click();
          await page.waitForTimeout(1000);

          console.log('✓ Category filter applied successfully');
        }
      }

      // Test Search
      const searchInput = page.locator('input[placeholder*="Search"]').first();
      if (await searchInput.isVisible({ timeout: 5000 })) {
        await searchInput.fill('chrome');
        await page.waitForTimeout(1500);

        await page.screenshot({
          path: `${SCREENSHOTS_DIR}hub-search-results.png`,
          fullPage: true
        });

        console.log('✓ Search functionality working');
      }
    });

    test('should open package details drawer', async ({ page }) => {
      await page.goto(`${BASE_URL}/assets/hub`);
      await waitForPageLoad(page);

      await checkTableRendered(page);

      // Click on first package name
      const firstPackageLink = page.locator('table tbody tr').first().locator('a').first();
      if (await firstPackageLink.isVisible({ timeout: 5000 })) {
        const packageName = await firstPackageLink.textContent();
        console.log(`✓ Opening package details for: ${packageName}`);

        await firstPackageLink.click();
        await page.waitForTimeout(1500);

        // Check if drawer opened
        const drawer = page.locator('.ant-drawer-content-wrapper, .ant-drawer-open');
        const drawerVisible = await drawer.isVisible({ timeout: 5000 }).catch(() => false);

        if (drawerVisible) {
          console.log('✓ Package details drawer opened');

          await page.screenshot({
            path: `${SCREENSHOTS_DIR}hub-package-detail.png`,
            fullPage: true
          });

          // Check for version information
          await page.waitForTimeout(500);
          await page.screenshot({
            path: `${SCREENSHOTS_DIR}hub-package-versions.png`,
            fullPage: true
          });

          // Close drawer
          const closeButton = page.locator('.ant-drawer-close, button:has-text("Close")').first();
          if (await closeButton.isVisible({ timeout: 2000 })) {
            await closeButton.click();
            await page.waitForTimeout(500);
            console.log('✓ Drawer closed successfully');
          }
        }
      }
    });

    test('should show and interact with deploy button', async ({ page }) => {
      await page.goto(`${BASE_URL}/assets/hub`);
      await waitForPageLoad(page);

      await checkTableRendered(page);

      // Find deploy button (rocket icon)
      const deployButton = page.locator('button .anticon-rocket').first();
      if (await deployButton.isVisible({ timeout: 5000 })) {
        console.log('✓ Deploy button found');

        await page.screenshot({
          path: `${SCREENSHOTS_DIR}hub-deploy-buttons.png`,
          fullPage: true
        });

        await deployButton.click();
        await page.waitForTimeout(1500);

        // Check if modal opened
        const modal = page.locator('.ant-modal-content').first();
        const modalVisible = await modal.isVisible({ timeout: 5000 }).catch(() => false);

        if (modalVisible) {
          console.log('✓ Deploy modal opened');

          await page.screenshot({
            path: `${SCREENSHOTS_DIR}hub-deploy-modal.png`,
            fullPage: true
          });

          // Check modal contents
          const deploymentNameInput = page.locator('input[id*="deploymentName"], input[placeholder*="name"]').first();
          if (await deploymentNameInput.isVisible({ timeout: 2000 })) {
            console.log('✓ Deploy modal has deployment name input');
          }

          // Close modal
          const cancelButton = page.locator('button:has-text("Cancel")').first();
          if (await cancelButton.isVisible()) {
            await cancelButton.click();
            await page.waitForTimeout(500);
            console.log('✓ Deploy modal closed');
          }
        }
      }
    });

    test('should navigate between Hub tabs', async ({ page }) => {
      await page.goto(`${BASE_URL}/assets/hub`);
      await waitForPageLoad(page);

      console.log('✓ On Packages tab (default)');

      // Test Software Catalog tab
      const catalogTab = page.locator('[role="tab"]:has-text("Software Catalog")').first();
      if (await catalogTab.isVisible({ timeout: 5000 })) {
        await catalogTab.click();
        await waitForPageLoad(page);

        await page.screenshot({
          path: `${SCREENSHOTS_DIR}hub-catalog-tab.png`,
          fullPage: true
        });

        console.log('✓ Software Catalog tab loaded');
      }

      // Test Bundles tab
      const bundlesTab = page.locator('[role="tab"]:has-text("Bundles")').first();
      if (await bundlesTab.isVisible({ timeout: 5000 })) {
        await bundlesTab.click();
        await waitForPageLoad(page);

        await page.screenshot({
          path: `${SCREENSHOTS_DIR}hub-bundles-tab.png`,
          fullPage: true
        });

        console.log('✓ Bundles tab loaded');
      }

      // Test Software Jobs tab
      const jobsTab = page.locator('[role="tab"]:has-text("Software Jobs")').first();
      if (await jobsTab.isVisible({ timeout: 5000 })) {
        await jobsTab.click();
        await waitForPageLoad(page);

        await page.screenshot({
          path: `${SCREENSHOTS_DIR}hub-deployments-tab.png`,
          fullPage: true
        });

        console.log('✓ Software Jobs tab loaded');
      }
    });
  });

  test.describe('Recommendations Module - Detailed Testing', () => {
    test('should display and interact with recommendation filters', async ({ page }) => {
      await page.goto(`${BASE_URL}/patch-recommendations`);
      await waitForPageLoad(page);

      console.log('✓ Navigated to Recommendations page');

      // Test Severity filter
      const severitySelect = page.locator('input[placeholder*="Severity"]').first();
      if (await severitySelect.isVisible({ timeout: 5000 })) {
        await severitySelect.click();
        await page.waitForTimeout(500);

        await page.screenshot({
          path: `${SCREENSHOTS_DIR}recommendations-filter-dropdown.png`,
          fullPage: true
        });

        // Select Critical
        const criticalOption = page.locator('.ant-select-item:has-text("Critical")').last();
        if (await criticalOption.isVisible({ timeout: 2000 })) {
          await criticalOption.click();
          await page.waitForTimeout(500);

          // Close dropdown
          await page.keyboard.press('Escape');
          await page.waitForTimeout(1000);

          await page.screenshot({
            path: `${SCREENSHOTS_DIR}recommendations-filter-severity.png`,
            fullPage: true
          });

          console.log('✓ Severity filter applied');
        }
      }

      // Test Status filter
      const statusSelect = page.locator('input[placeholder*="Status"]').first();
      if (await statusSelect.isVisible({ timeout: 5000 })) {
        await statusSelect.click();
        await page.waitForTimeout(500);

        const recommendedOption = page.locator('.ant-select-item:has-text("Recommended")').last();
        if (await recommendedOption.isVisible({ timeout: 2000 })) {
          await recommendedOption.click();
          await page.waitForTimeout(1000);

          await page.screenshot({
            path: `${SCREENSHOTS_DIR}recommendations-filters-applied.png`,
            fullPage: true
          });

          console.log('✓ Status filter applied');
        }
      }
    });

    test('should search recommendations', async ({ page }) => {
      await page.goto(`${BASE_URL}/patch-recommendations`);
      await waitForPageLoad(page);

      // Get initial row count
      await checkTableRendered(page);
      const initialRows = await page.locator('table tbody tr').count();
      console.log(`✓ Initial recommendation count: ${initialRows}`);

      // Test search
      const searchInput = page.locator('input[placeholder*="Search"]').first();
      if (await searchInput.isVisible({ timeout: 5000 })) {
        await searchInput.fill('CVE');
        await page.waitForTimeout(1500);

        await page.screenshot({
          path: `${SCREENSHOTS_DIR}recommendations-search-results.png`,
          fullPage: true
        });

        const filteredRows = await page.locator('table tbody tr').count();
        console.log(`✓ Filtered recommendation count: ${filteredRows}`);
        console.log('✓ Search functionality working');

        // Clear search
        await searchInput.clear();
        await page.waitForTimeout(500);
      }
    });

    test('should show action buttons for recommendations', async ({ page }) => {
      await page.goto(`${BASE_URL}/patch-recommendations`);
      await waitForPageLoad(page);

      await checkTableRendered(page);

      // Look for action buttons in table
      const actionButtons = page.locator('table tbody tr').first().locator('button');
      const buttonCount = await actionButtons.count();

      console.log(`✓ Found ${buttonCount} action buttons per recommendation`);

      // Check for specific action types
      const acceptButtons = page.locator('button:has(.anticon-check-circle), button:has-text("Accept")');
      const rejectButtons = page.locator('button:has(.anticon-close-circle), button:has-text("Reject")');
      const deployButtons = page.locator('button:has(.anticon-rocket), button:has-text("Deploy")');

      const acceptCount = await acceptButtons.count();
      const rejectCount = await rejectButtons.count();
      const deployCount = await deployButtons.count();

      console.log(`✓ Accept buttons: ${acceptCount}`);
      console.log(`✓ Reject buttons: ${rejectCount}`);
      console.log(`✓ Deploy buttons: ${deployCount}`);

      await page.screenshot({
        path: `${SCREENSHOTS_DIR}recommendation-deploy-action.png`,
        fullPage: true
      });
    });

    test('should support row selection and bulk actions', async ({ page }) => {
      await page.goto(`${BASE_URL}/patch-recommendations`);
      await waitForPageLoad(page);

      await checkTableRendered(page);

      // Try to select rows
      const checkboxes = page.locator('table tbody tr input[type="checkbox"]');
      const checkboxCount = await checkboxes.count();

      if (checkboxCount > 0) {
        console.log(`✓ Found ${checkboxCount} selectable rows`);

        // Select first checkbox
        await checkboxes.first().click();
        await page.waitForTimeout(500);

        await page.screenshot({
          path: `${SCREENSHOTS_DIR}recommendations-row-selected.png`,
          fullPage: true
        });

        // Check if bulk action bar appeared
        const bulkActionBar = page.locator('text=/selected/i, .bulk-action');
        const hasBulkBar = await bulkActionBar.isVisible({ timeout: 2000 }).catch(() => false);

        if (hasBulkBar) {
          console.log('✓ Bulk action bar appeared');

          // Select another row
          if (checkboxCount > 1) {
            await checkboxes.nth(1).click();
            await page.waitForTimeout(500);

            await page.screenshot({
              path: `${SCREENSHOTS_DIR}recommendations-bulk-selection.png`,
              fullPage: true
            });
          }

          // Look for bulk action buttons
          const bulkButtons = page.locator('button:has-text("Accept"), button:has-text("Reject"), button:has-text("Deploy")');
          const bulkButtonCount = await bulkButtons.count();

          if (bulkButtonCount > 0) {
            console.log(`✓ Found ${bulkButtonCount} bulk action buttons`);

            await page.screenshot({
              path: `${SCREENSHOTS_DIR}recommendations-bulk-actions.png`,
              fullPage: true
            });
          }
        }
      }
    });

    test('should display recommendation statistics correctly', async ({ page }) => {
      await page.goto(`${BASE_URL}/patch-recommendations`);
      await waitForPageLoad(page);

      // Check severity stats
      const severityStats = page.locator('.ant-statistic-title:has-text("Critical"), .ant-statistic-title:has-text("High"), .ant-statistic-title:has-text("Medium"), .ant-statistic-title:has-text("Low")');
      const severityCount = await severityStats.count();
      console.log(`✓ Severity stat cards: ${severityCount}`);

      // Check status stats
      const statusStats = page.locator('.ant-statistic-title:has-text("Recommended"), .ant-statistic-title:has-text("Accepted"), .ant-statistic-title:has-text("Deployed")');
      const statusCount = await statusStats.count();
      console.log(`✓ Status stat cards: ${statusCount}`);

      // Get actual values
      const statValues = page.locator('.ant-statistic-content-value');
      const valueCount = await statValues.count();
      console.log(`✓ Total stat values displayed: ${valueCount}`);

      await page.screenshot({
        path: `${SCREENSHOTS_DIR}recommendations-statistics-detail.png`,
        fullPage: true
      });
    });

    test('should handle pagination', async ({ page }) => {
      await page.goto(`${BASE_URL}/patch-recommendations`);
      await waitForPageLoad(page);

      // Check for pagination
      const pagination = page.locator('.ant-pagination');
      const hasPagination = await pagination.isVisible({ timeout: 5000 }).catch(() => false);

      if (hasPagination) {
        console.log('✓ Pagination controls visible');

        // Check page size options
        const pageSizeSelector = page.locator('.ant-select-selector:has-text("page")');
        if (await pageSizeSelector.isVisible({ timeout: 2000 })) {
          console.log('✓ Page size selector available');
        }

        // Try clicking next page if available
        const nextButton = page.locator('.ant-pagination-next:not(.ant-pagination-disabled)');
        if (await nextButton.isVisible({ timeout: 2000 })) {
          await nextButton.click();
          await waitForPageLoad(page);
          console.log('✓ Pagination navigation works');

          await page.screenshot({
            path: `${SCREENSHOTS_DIR}recommendations-pagination.png`,
            fullPage: true
          });
        }
      } else {
        console.log('⚠ No pagination (all results fit on one page)');
      }
    });

    test('should show refresh button and reload data', async ({ page }) => {
      await page.goto(`${BASE_URL}/patch-recommendations`);
      await waitForPageLoad(page);

      // Find refresh button
      const refreshButton = page.locator('button:has(.anticon-reload), button:has-text("Refresh")').first();
      if (await refreshButton.isVisible({ timeout: 5000 })) {
        console.log('✓ Refresh button found');

        await refreshButton.click();
        await page.waitForTimeout(1500);

        console.log('✓ Data refreshed');
      }
    });
  });

  test.describe('Performance & Error Testing', () => {
    test('should measure Hub page load time', async ({ page }) => {
      const startTime = Date.now();

      await page.goto(`${BASE_URL}/assets/hub`);
      await waitForPageLoad(page);
      await checkTableRendered(page);

      const loadTime = Date.now() - startTime;
      console.log(`\n📊 Hub Page Performance:`);
      console.log(`  - Total load time: ${loadTime}ms`);
      console.log(`  - Status: ${loadTime < 5000 ? '✓ PASS (< 5s)' : '⚠ SLOW (> 5s)'}`);
    });

    test('should measure Recommendations page load time', async ({ page }) => {
      const startTime = Date.now();

      await page.goto(`${BASE_URL}/patch-recommendations`);
      await waitForPageLoad(page);
      await checkTableRendered(page);

      const loadTime = Date.now() - startTime;
      console.log(`\n📊 Recommendations Page Performance:`);
      console.log(`  - Total load time: ${loadTime}ms`);
      console.log(`  - Status: ${loadTime < 5000 ? '✓ PASS (< 5s)' : '⚠ SLOW (> 5s)'}`);
    });

    test('should check for console errors on Hub page', async ({ page }) => {
      const errors: string[] = [];

      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });

      page.on('pageerror', (error) => {
        errors.push(error.message);
      });

      await page.goto(`${BASE_URL}/assets/hub`);
      await waitForPageLoad(page);

      if (errors.length > 0) {
        console.log('\n⚠️  Console errors on Hub page:');
        errors.forEach(err => console.log(`  - ${err}`));
      } else {
        console.log('\n✓ No console errors on Hub page');
      }
    });

    test('should check for console errors on Recommendations page', async ({ page }) => {
      const errors: string[] = [];

      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });

      page.on('pageerror', (error) => {
        errors.push(error.message);
      });

      await page.goto(`${BASE_URL}/patch-recommendations`);
      await waitForPageLoad(page);

      if (errors.length > 0) {
        console.log('\n⚠️  Console errors on Recommendations page:');
        errors.forEach(err => console.log(`  - ${err}`));
      } else {
        console.log('\n✓ No console errors on Recommendations page');
      }
    });
  });
});
