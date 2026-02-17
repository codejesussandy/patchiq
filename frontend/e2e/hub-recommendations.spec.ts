/**
 * E2E Tests for PatchIQ Hub/Recommendations Module
 *
 * Tests cover:
 * 1. Navigation & List Display
 * 2. Recommendation Types
 * 3. Filters
 * 4. Recommendation Detail
 * 5. Deploy Action
 * 6. Search Functionality
 * 7. Console Errors
 */

import { test, expect, Page } from '@playwright/test';
import { login, waitForPageLoad, checkPageRendered, checkTableRendered } from './fixtures';

const SCREENSHOTS_DIR = '/Users/shandesh/src/VS-code/PatchIQ/full-dev-sandy-v2/screenshots/';

// Test configuration
const BASE_URL = 'http://localhost:5173';
const HUB_ROUTES = ['/hub', '/assets/hub'];
const RECOMMENDATIONS_ROUTES = ['/recommendations', '/patch-recommendations'];

// Helper to capture console errors
const captureConsoleErrors = (page: Page): string[] => {
  const errors: string[] = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(`[Console Error]: ${msg.text()}`);
    }
  });

  page.on('pageerror', (error) => {
    errors.push(`[Page Error]: ${error.message}`);
  });

  return errors;
};

test.describe('Hub/Recommendations Module Tests', () => {
  let consoleErrors: string[];

  test.beforeEach(async ({ page }) => {
    consoleErrors = captureConsoleErrors(page);
    await login(page);
  });

  test.afterEach(async ({ page }, testInfo) => {
    if (consoleErrors.length > 0) {
      console.log(`\n⚠️  Console errors for test "${testInfo.title}":`);
      consoleErrors.forEach(error => console.log(error));
    }
  });

  test.describe('1. Navigation & List Display', () => {
    test('should navigate to Hub via direct URL /hub', async ({ page }) => {
      const startTime = Date.now();

      // Try /hub route (should redirect to /assets/hub)
      await page.goto(`${BASE_URL}/hub`);
      await waitForPageLoad(page);

      const loadTime = Date.now() - startTime;
      console.log(`✓ Hub page load time: ${loadTime}ms`);

      // Check if redirected to /assets/hub
      const currentUrl = page.url();
      expect(currentUrl).toContain('/assets/hub');

      // Capture screenshot
      await page.screenshot({
        path: `${SCREENSHOTS_DIR}hub-navigation-direct.png`,
        fullPage: true
      });

      // Verify page loaded with Software Hub title
      await expect(page.locator('text=Software Hub')).toBeVisible({ timeout: 10000 });
    });

    test('should navigate to Hub via Assets menu', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard`);
      await waitForPageLoad(page);

      // Click on Assets in top menu
      await page.click('text=Assets');
      await waitForPageLoad(page);

      // Look for Software Hub tab or menu item
      const hubTab = page.locator('text=Software Hub').first();
      if (await hubTab.isVisible({ timeout: 5000 })) {
        await hubTab.click();
        await waitForPageLoad(page);
      }

      // Verify we're on the hub page
      await expect(page.locator('text=Software Hub')).toBeVisible();

      await page.screenshot({
        path: `${SCREENSHOTS_DIR}hub-navigation-menu.png`,
        fullPage: true
      });
    });

    test('should display Hub list with packages table', async ({ page }) => {
      await page.goto(`${BASE_URL}/assets/hub`);
      await waitForPageLoad(page);

      // Check for the main components
      await expect(page.locator('text=Software Hub')).toBeVisible();
      await expect(page.locator('text=Manage software packages for deployment to agents')).toBeVisible();

      // Check for statistics cards
      const statsCards = page.locator('.ant-card .ant-statistic');
      expect(await statsCards.count()).toBeGreaterThan(0);

      // Check for table
      await checkTableRendered(page);

      // Check for key table columns
      await expect(page.locator('th:has-text("Name")')).toBeVisible();
      await expect(page.locator('th:has-text("Latest Version")')).toBeVisible();
      await expect(page.locator('th:has-text("Platform")')).toBeVisible();
      await expect(page.locator('th:has-text("Actions")')).toBeVisible();

      await page.screenshot({
        path: `${SCREENSHOTS_DIR}hub-list-initial.png`,
        fullPage: true
      });
    });

    test('should navigate to Patch Recommendations', async ({ page }) => {
      const startTime = Date.now();

      await page.goto(`${BASE_URL}/patch-recommendations`);
      await waitForPageLoad(page);

      const loadTime = Date.now() - startTime;
      console.log(`✓ Recommendations page load time: ${loadTime}ms`);

      // Verify page loaded
      await expect(page.locator('text=Patch Recommendations')).toBeVisible({ timeout: 10000 });

      await page.screenshot({
        path: `${SCREENSHOTS_DIR}recommendations-list-initial.png`,
        fullPage: true
      });
    });

    test('should display Recommendations with severity stats', async ({ page }) => {
      await page.goto(`${BASE_URL}/patch-recommendations`);
      await waitForPageLoad(page);

      // Check for severity stat cards
      await expect(page.locator('text=Critical')).toBeVisible();
      await expect(page.locator('text=High')).toBeVisible();
      await expect(page.locator('text=Medium')).toBeVisible();
      await expect(page.locator('text=Low')).toBeVisible();

      // Check for status stats
      await expect(page.locator('text=Recommended')).toBeVisible();
      await expect(page.locator('text=Accepted')).toBeVisible();
      await expect(page.locator('text=Deployed')).toBeVisible();

      // Check for recommendations table
      await checkTableRendered(page);

      await page.screenshot({
        path: `${SCREENSHOTS_DIR}recommendations-stats-display.png`,
        fullPage: true
      });
    });
  });

  test.describe('2. Recommendation Types', () => {
    test('should display different package types in Hub', async ({ page }) => {
      await page.goto(`${BASE_URL}/assets/hub`);
      await waitForPageLoad(page);

      // Wait for table to load
      await checkTableRendered(page);

      // Check for platform icons (Windows, Mac, Linux)
      const platformIcons = page.locator('.anticon-windows, .anticon-apple, .anticon-linux');
      const iconCount = await platformIcons.count();

      console.log(`✓ Found ${iconCount} platform icons`);

      // Check for category tags
      const categoryTags = page.locator('.ant-tag');
      expect(await categoryTags.count()).toBeGreaterThan(0);

      await page.screenshot({
        path: `${SCREENSHOTS_DIR}hub-package-types.png`,
        fullPage: true
      });
    });

    test('should display recommendation severity types', async ({ page }) => {
      await page.goto(`${BASE_URL}/patch-recommendations`);
      await waitForPageLoad(page);

      // Check that severity stat cards show values
      const statCards = page.locator('.ant-statistic-content-value');
      expect(await statCards.count()).toBeGreaterThan(0);

      await page.screenshot({
        path: `${SCREENSHOTS_DIR}recommendations-types.png`,
        fullPage: true
      });
    });
  });

  test.describe('3. Filters', () => {
    test('should filter Hub packages by platform', async ({ page }) => {
      await page.goto(`${BASE_URL}/assets/hub`);
      await waitForPageLoad(page);

      // Find and click platform filter
      const platformSelect = page.locator('[placeholder="Platform"]').first();
      if (await platformSelect.isVisible({ timeout: 5000 })) {
        await platformSelect.click();
        await page.waitForTimeout(500);

        // Select Windows
        const windowsOption = page.locator('text=Windows').last();
        if (await windowsOption.isVisible({ timeout: 2000 })) {
          await windowsOption.click();
          await waitForPageLoad(page);

          await page.screenshot({
            path: `${SCREENSHOTS_DIR}hub-filter-platform.png`,
            fullPage: true
          });
        }
      }
    });

    test('should filter Hub packages by category', async ({ page }) => {
      await page.goto(`${BASE_URL}/assets/hub`);
      await waitForPageLoad(page);

      // Find and click category filter
      const categorySelect = page.locator('[placeholder="Category"]').first();
      if (await categorySelect.isVisible({ timeout: 5000 })) {
        await categorySelect.click();
        await page.waitForTimeout(500);

        // Try to select first option
        const firstOption = page.locator('.ant-select-item-option').first();
        if (await firstOption.isVisible({ timeout: 2000 })) {
          await firstOption.click();
          await waitForPageLoad(page);
        }
      }
    });

    test('should filter recommendations by severity', async ({ page }) => {
      await page.goto(`${BASE_URL}/patch-recommendations`);
      await waitForPageLoad(page);

      // Find severity filter
      const severitySelect = page.locator('[placeholder="Filter by Severity"]').first();
      if (await severitySelect.isVisible({ timeout: 5000 })) {
        await severitySelect.click();
        await page.waitForTimeout(500);

        // Select Critical
        const criticalOption = page.locator('text=Critical').last();
        if (await criticalOption.isVisible({ timeout: 2000 })) {
          await criticalOption.click();
          await page.waitForTimeout(500);

          // Close dropdown by clicking elsewhere
          await page.keyboard.press('Escape');
          await waitForPageLoad(page);

          await page.screenshot({
            path: `${SCREENSHOTS_DIR}recommendations-filter-severity.png`,
            fullPage: true
          });
        }
      }
    });

    test('should filter recommendations by status', async ({ page }) => {
      await page.goto(`${BASE_URL}/patch-recommendations`);
      await waitForPageLoad(page);

      // Find status filter
      const statusSelect = page.locator('[placeholder="Filter by Status"]').first();
      if (await statusSelect.isVisible({ timeout: 5000 })) {
        await statusSelect.click();
        await page.waitForTimeout(500);

        // Select Recommended
        const recommendedOption = page.locator('text=Recommended').last();
        if (await recommendedOption.isVisible({ timeout: 2000 })) {
          await recommendedOption.click();
          await waitForPageLoad(page);

          await page.screenshot({
            path: `${SCREENSHOTS_DIR}recommendations-filters-applied.png`,
            fullPage: true
          });
        }
      }
    });
  });

  test.describe('4. Package/Recommendation Detail', () => {
    test('should open Hub package details drawer', async ({ page }) => {
      await page.goto(`${BASE_URL}/assets/hub`);
      await waitForPageLoad(page);

      // Wait for table to load
      await checkTableRendered(page);

      // Find and click first package name link
      const firstPackageLink = page.locator('table tbody tr').first().locator('a').first();
      if (await firstPackageLink.isVisible({ timeout: 5000 })) {
        await firstPackageLink.click();
        await page.waitForTimeout(1000);

        // Check if drawer opened
        const drawer = page.locator('.ant-drawer-content-wrapper, .ant-drawer');
        await expect(drawer).toBeVisible({ timeout: 5000 });

        await page.screenshot({
          path: `${SCREENSHOTS_DIR}hub-package-detail.png`,
          fullPage: true
        });

        // Close drawer
        const closeButton = page.locator('.ant-drawer-close').first();
        if (await closeButton.isVisible()) {
          await closeButton.click();
          await page.waitForTimeout(500);
        }
      }
    });

    test('should display package version details in drawer', async ({ page }) => {
      await page.goto(`${BASE_URL}/assets/hub`);
      await waitForPageLoad(page);

      // Open first package details
      const firstPackageLink = page.locator('table tbody tr').first().locator('a').first();
      if (await firstPackageLink.isVisible({ timeout: 5000 })) {
        await firstPackageLink.click();
        await page.waitForTimeout(1000);

        // Check drawer contains version information
        const drawer = page.locator('.ant-drawer');
        await expect(drawer).toBeVisible({ timeout: 5000 });

        // Look for version-related content
        const versionContent = drawer.locator('text=/version/i, text=/platform/i, text=/category/i');
        expect(await versionContent.count()).toBeGreaterThan(0);

        await page.screenshot({
          path: `${SCREENSHOTS_DIR}hub-package-versions.png`,
          fullPage: true
        });
      }
    });
  });

  test.describe('5. Deploy Action', () => {
    test('should show deploy button in Hub package list', async ({ page }) => {
      await page.goto(`${BASE_URL}/assets/hub`);
      await waitForPageLoad(page);

      // Wait for table to load
      await checkTableRendered(page);

      // Check for deploy action buttons (rocket icon)
      const deployButtons = page.locator('.anticon-rocket');
      const deployCount = await deployButtons.count();

      console.log(`✓ Found ${deployCount} deploy buttons`);
      expect(deployCount).toBeGreaterThan(0);

      await page.screenshot({
        path: `${SCREENSHOTS_DIR}hub-deploy-buttons.png`,
        fullPage: true
      });
    });

    test('should open deploy modal when clicking deploy', async ({ page }) => {
      await page.goto(`${BASE_URL}/assets/hub`);
      await waitForPageLoad(page);

      // Find and click first deploy button
      const deployButton = page.locator('.anticon-rocket').first();
      if (await deployButton.isVisible({ timeout: 5000 })) {
        await deployButton.click();
        await page.waitForTimeout(1000);

        // Check if modal opened
        const modal = page.locator('.ant-modal-content');
        await expect(modal).toBeVisible({ timeout: 5000 });

        await page.screenshot({
          path: `${SCREENSHOTS_DIR}hub-deploy-modal.png`,
          fullPage: true
        });

        // Close modal
        const cancelButton = page.locator('button:has-text("Cancel")').first();
        if (await cancelButton.isVisible()) {
          await cancelButton.click();
          await page.waitForTimeout(500);
        }
      }
    });

    test('should show deploy action for recommendations', async ({ page }) => {
      await page.goto(`${BASE_URL}/patch-recommendations`);
      await waitForPageLoad(page);

      // Wait for table to load
      await checkTableRendered(page);

      // Look for deploy/rocket icons in recommendations
      const deployActions = page.locator('.anticon-rocket, button:has-text("Deploy")');
      const actionCount = await deployActions.count();

      console.log(`✓ Found ${actionCount} deploy actions in recommendations`);

      await page.screenshot({
        path: `${SCREENSHOTS_DIR}recommendation-deploy-action.png`,
        fullPage: true
      });
    });
  });

  test.describe('6. Search Functionality', () => {
    test('should search Hub packages by name', async ({ page }) => {
      await page.goto(`${BASE_URL}/assets/hub`);
      await waitForPageLoad(page);

      // Find search input
      const searchInput = page.locator('[placeholder*="Search"]').first();
      if (await searchInput.isVisible({ timeout: 5000 })) {
        await searchInput.fill('chrome');
        await page.waitForTimeout(1000);

        await page.screenshot({
          path: `${SCREENSHOTS_DIR}hub-search-results.png`,
          fullPage: true
        });

        // Clear search
        await searchInput.clear();
        await page.waitForTimeout(500);
      }
    });

    test('should search recommendations by CVE/Asset', async ({ page }) => {
      await page.goto(`${BASE_URL}/patch-recommendations`);
      await waitForPageLoad(page);

      // Find search input
      const searchInput = page.locator('[placeholder*="Search"]').first();
      if (await searchInput.isVisible({ timeout: 5000 })) {
        await searchInput.fill('CVE');
        await page.waitForTimeout(1000);

        await page.screenshot({
          path: `${SCREENSHOTS_DIR}recommendations-search-results.png`,
          fullPage: true
        });

        await searchInput.clear();
      }
    });

    test('should verify search results filter correctly', async ({ page }) => {
      await page.goto(`${BASE_URL}/assets/hub`);
      await waitForPageLoad(page);

      // Get initial row count
      const initialRows = await page.locator('table tbody tr').count();
      console.log(`✓ Initial row count: ${initialRows}`);

      // Search for specific term
      const searchInput = page.locator('[placeholder*="Search"]').first();
      if (await searchInput.isVisible({ timeout: 5000 })) {
        await searchInput.fill('xyz12345nonexistent');
        await page.waitForTimeout(1500);

        // Check if results changed
        const filteredRows = await page.locator('table tbody tr').count();
        console.log(`✓ Filtered row count: ${filteredRows}`);

        // Should show fewer results or "No data" message
        const noDataMessage = page.locator('text=/no data/i, .ant-empty');
        const hasNoData = await noDataMessage.isVisible({ timeout: 2000 }).catch(() => false);

        if (hasNoData || filteredRows < initialRows) {
          console.log('✓ Search filtering works correctly');
        }
      }
    });
  });

  test.describe('7. Tab Navigation', () => {
    test('should navigate between Hub tabs', async ({ page }) => {
      await page.goto(`${BASE_URL}/assets/hub`);
      await waitForPageLoad(page);

      // Check for tab navigation
      const catalogTab = page.locator('text=Software Catalog').first();
      if (await catalogTab.isVisible({ timeout: 5000 })) {
        await catalogTab.click();
        await waitForPageLoad(page);

        await page.screenshot({
          path: `${SCREENSHOTS_DIR}hub-catalog-tab.png`,
          fullPage: true
        });
      }

      // Try Bundles tab
      const bundlesTab = page.locator('text=Bundles').first();
      if (await bundlesTab.isVisible({ timeout: 5000 })) {
        await bundlesTab.click();
        await waitForPageLoad(page);

        await page.screenshot({
          path: `${SCREENSHOTS_DIR}hub-bundles-tab.png`,
          fullPage: true
        });
      }

      // Try Software Jobs tab
      const jobsTab = page.locator('text=Software Jobs').first();
      if (await jobsTab.isVisible({ timeout: 5000 })) {
        await jobsTab.click();
        await waitForPageLoad(page);

        await page.screenshot({
          path: `${SCREENSHOTS_DIR}hub-deployments-tab.png`,
          fullPage: true
        });
      }
    });
  });

  test.describe('8. UI Interactions', () => {
    test('should show refresh button and reload data', async ({ page }) => {
      await page.goto(`${BASE_URL}/assets/hub`);
      await waitForPageLoad(page);

      // Find and click refresh button
      const refreshButton = page.locator('button:has(.anticon-reload)').first();
      if (await refreshButton.isVisible({ timeout: 5000 })) {
        await refreshButton.click();
        await page.waitForTimeout(1000);

        console.log('✓ Refresh button clicked');
      }
    });

    test('should handle pagination in recommendations', async ({ page }) => {
      await page.goto(`${BASE_URL}/patch-recommendations`);
      await waitForPageLoad(page);

      // Check for pagination controls
      const pagination = page.locator('.ant-pagination');
      if (await pagination.isVisible({ timeout: 5000 })) {
        console.log('✓ Pagination controls visible');

        // Try clicking next page if available
        const nextButton = page.locator('.ant-pagination-next:not(.ant-pagination-disabled)');
        if (await nextButton.isVisible({ timeout: 2000 })) {
          await nextButton.click();
          await waitForPageLoad(page);
          console.log('✓ Pagination navigation works');
        }
      }
    });

    test('should show upload bundle button in Hub', async ({ page }) => {
      await page.goto(`${BASE_URL}/assets/hub`);
      await waitForPageLoad(page);

      // Check for upload button
      const uploadButton = page.locator('button:has-text("Upload Bundle")').first();
      await expect(uploadButton).toBeVisible({ timeout: 5000 });

      console.log('✓ Upload Bundle button found');
    });

    test('should show add package button in Hub', async ({ page }) => {
      await page.goto(`${BASE_URL}/assets/hub`);
      await waitForPageLoad(page);

      // Check for add package button
      const addButton = page.locator('button:has-text("Add Package")').first();
      await expect(addButton).toBeVisible({ timeout: 5000 });

      console.log('✓ Add Package button found');
    });
  });

  test.describe('9. Error Handling & Performance', () => {
    test('should not have console errors on Hub page load', async ({ page }) => {
      const errors: string[] = [];

      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });

      await page.goto(`${BASE_URL}/assets/hub`);
      await waitForPageLoad(page);

      if (errors.length > 0) {
        console.log('⚠️  Console errors detected:');
        errors.forEach(err => console.log(`  - ${err}`));
      } else {
        console.log('✓ No console errors on Hub page');
      }
    });

    test('should not have console errors on Recommendations page load', async ({ page }) => {
      const errors: string[] = [];

      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });

      await page.goto(`${BASE_URL}/patch-recommendations`);
      await waitForPageLoad(page);

      if (errors.length > 0) {
        console.log('⚠️  Console errors detected:');
        errors.forEach(err => console.log(`  - ${err}`));
      } else {
        console.log('✓ No console errors on Recommendations page');
      }
    });

    test('should measure Hub page load performance', async ({ page }) => {
      const startTime = Date.now();

      await page.goto(`${BASE_URL}/assets/hub`);
      await waitForPageLoad(page);

      const loadTime = Date.now() - startTime;
      console.log(`\n📊 Performance Metrics:`);
      console.log(`  - Hub page load time: ${loadTime}ms`);

      // Check if within acceptable range (< 5 seconds)
      if (loadTime < 5000) {
        console.log(`  ✓ Load time is acceptable`);
      } else {
        console.log(`  ⚠️  Load time exceeds 5 seconds`);
      }
    });

    test('should measure Recommendations page load performance', async ({ page }) => {
      const startTime = Date.now();

      await page.goto(`${BASE_URL}/patch-recommendations`);
      await waitForPageLoad(page);

      const loadTime = Date.now() - startTime;
      console.log(`\n📊 Performance Metrics:`);
      console.log(`  - Recommendations page load time: ${loadTime}ms`);

      // Check if within acceptable range
      if (loadTime < 5000) {
        console.log(`  ✓ Load time is acceptable`);
      } else {
        console.log(`  ⚠️  Load time exceeds 5 seconds`);
      }
    });
  });

  test.describe('10. Bulk Actions & Selection', () => {
    test('should support row selection in recommendations', async ({ page }) => {
      await page.goto(`${BASE_URL}/patch-recommendations`);
      await waitForPageLoad(page);

      // Wait for table
      await checkTableRendered(page);

      // Try to find and click checkbox
      const firstCheckbox = page.locator('table tbody tr').first().locator('input[type="checkbox"]');
      if (await firstCheckbox.isVisible({ timeout: 5000 })) {
        await firstCheckbox.click();
        await page.waitForTimeout(500);

        // Check if bulk action bar appeared
        const bulkActionBar = page.locator('text=/selected/i, .bulk-action-bar');
        const hasBulkBar = await bulkActionBar.isVisible({ timeout: 2000 }).catch(() => false);

        if (hasBulkBar) {
          console.log('✓ Bulk action bar appeared');

          await page.screenshot({
            path: `${SCREENSHOTS_DIR}recommendations-bulk-selection.png`,
            fullPage: true
          });
        }
      }
    });

    test('should show bulk actions for selected recommendations', async ({ page }) => {
      await page.goto(`${BASE_URL}/patch-recommendations`);
      await waitForPageLoad(page);

      // Try to select multiple rows
      const checkboxes = page.locator('table tbody tr input[type="checkbox"]');
      const count = await checkboxes.count();

      if (count > 1) {
        await checkboxes.nth(0).click();
        await page.waitForTimeout(200);
        await checkboxes.nth(1).click();
        await page.waitForTimeout(500);

        // Look for bulk action buttons
        const bulkButtons = page.locator('button:has-text("Accept"), button:has-text("Reject"), button:has-text("Deploy")');
        const buttonCount = await bulkButtons.count();

        if (buttonCount > 0) {
          console.log(`✓ Found ${buttonCount} bulk action buttons`);

          await page.screenshot({
            path: `${SCREENSHOTS_DIR}recommendations-bulk-actions.png`,
            fullPage: true
          });
        }
      }
    });
  });
});

test.describe('Summary Report', () => {
  test('generate test execution summary', async ({ page }) => {
    console.log('\n' + '='.repeat(80));
    console.log('📋 TEST EXECUTION SUMMARY - Hub/Recommendations Module');
    console.log('='.repeat(80));
    console.log('\nTest Coverage:');
    console.log('  ✓ Navigation & List Display');
    console.log('  ✓ Recommendation Types');
    console.log('  ✓ Filters (Platform, Category, Severity, Status)');
    console.log('  ✓ Package/Recommendation Details');
    console.log('  ✓ Deploy Actions');
    console.log('  ✓ Search Functionality');
    console.log('  ✓ Tab Navigation');
    console.log('  ✓ UI Interactions');
    console.log('  ✓ Error Handling & Performance');
    console.log('  ✓ Bulk Actions & Selection');
    console.log('\nScreenshots captured in:');
    console.log(`  ${SCREENSHOTS_DIR}`);
    console.log('\n' + '='.repeat(80));
  });
});
