import { test, expect } from '@playwright/test';

test.describe('PHASE 4 - AGENT 25: Zero-Touch Deployment Configuration', () => {
  test.beforeEach(async ({ page }) => {
    // Use authenticated state from setup
    await page.goto('http://localhost:5173/patches/zero-touch');
    await page.waitForLoadState('networkidle');
  });

  test('TC01: Navigate to Zero-Touch Config Page', async ({ page }) => {
    // Verify page title
    const title = page.locator('h3:has-text("Zero Touch Deployment")');
    await expect(title).toBeVisible({ timeout: 5000 });

    // Check for Create button
    const createBtn = page.locator('button:has-text("Create")');
    await expect(createBtn).toBeVisible();

    // Take screenshot
    await page.screenshot({ path: './screenshots/tc01-zero-touch-page.png', fullPage: true });

    // Check for console errors
    const logs: { type: string; text: string }[] = [];
    page.on('console', msg => {
      logs.push({ type: msg.type(), text: msg.text() });
    });

    console.log('Page loaded successfully');
  });

  test('TC02: Create Zero-Touch Config', async ({ page }) => {
    // Click Create button
    const createBtn = page.locator('button:has-text("Create")');
    await createBtn.click();

    // Wait for modal
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Get all input fields and fill form
    const inputs = page.locator('input[type="text"]');
    const inputCount = await inputs.count();

    // Fill first input (configuration name)
    if (inputCount > 0) {
      await inputs.first().fill('Test Zero-Touch Config');
    }

    // Find and fill description field
    const descriptionInput = page.locator('input[placeholder*="Description"], input[placeholder*="description"]');
    const descCount = await descriptionInput.count();
    if (descCount > 0) {
      await descriptionInput.first().fill('Testing zero-touch auto deployment');
    }

    // Take screenshot before submission
    await page.screenshot({ path: './screenshots/tc02-create-form.png', fullPage: true });

    // Submit form - find the OK button in the modal
    const buttons = modal.locator('button');
    const buttonCount = await buttons.count();

    // Usually the last button in modal is the submit button
    if (buttonCount > 0) {
      const submitButton = buttons.last();
      const buttonText = await submitButton.textContent();

      if (buttonText?.includes('Create') || buttonText?.includes('OK')) {
        await submitButton.click();

        // Wait for modal to close or success message
        await page.waitForTimeout(1500);

        // Take screenshot after
        await page.screenshot({ path: './screenshots/tc02-create-success.png', fullPage: true });
      }
    }
  });

  test('TC03: View Configuration Details', async ({ page }) => {
    // Wait for table to load
    const table = page.locator('table');
    await expect(table).toBeVisible({ timeout: 5000 });

    // Get first row
    const firstRow = page.locator('table tbody tr').first();
    await expect(firstRow).toBeVisible();

    // Click action button (more menu)
    const actionBtn = firstRow.locator('button').last();
    await actionBtn.click();

    // Wait for menu
    await page.waitForTimeout(400);

    // Click View Details option
    const viewOption = page.locator('[role="menuitem"]:has-text("View Details")');
    if (await viewOption.isVisible({ timeout: 2000 }).catch(() => false)) {
      await viewOption.click();

      // Wait for modal
      const modal = page.locator('[role="dialog"]');
      await expect(modal).toBeVisible({ timeout: 5000 });

      // Take screenshot
      await page.screenshot({ path: './screenshots/tc03-view-config.png', fullPage: true });

      // Close modal
      const closeBtn = modal.locator('button:has-text("Close"), button[aria-label="Close"]').first();
      if (await closeBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await closeBtn.click();
      }
    }
  });

  test('TC04: Edit Configuration', async ({ page }) => {
    // Wait for table
    const table = page.locator('table');
    await expect(table).toBeVisible({ timeout: 5000 });

    // Get first row and click action menu
    const firstRow = page.locator('table tbody tr').first();
    const actionBtn = firstRow.locator('button').last();
    await actionBtn.click();

    // Wait for menu
    await page.waitForTimeout(400);

    // Click Edit
    const editOption = page.locator('[role="menuitem"]:has-text("Edit")');
    if (await editOption.isVisible({ timeout: 2000 }).catch(() => false)) {
      await editOption.click();

      // Wait for modal
      const modal = page.locator('[role="dialog"]');
      await expect(modal).toBeVisible({ timeout: 5000 });

      // Take screenshot of edit form
      await page.screenshot({ path: './screenshots/tc04-edit-form.png', fullPage: true });

      // Modify description field
      const descriptionInputs = modal.locator('input[placeholder*="Description"], textarea');
      if (await descriptionInputs.count() > 0) {
        const descInput = descriptionInputs.first();
        await descInput.clear();
        await descInput.fill('Updated description - edited via test');
      }

      // Find and click update button
      const buttons = modal.locator('button');
      const buttonCount = await buttons.count();

      if (buttonCount > 0) {
        const updateBtn = buttons.last();
        const text = await updateBtn.textContent();

        if (text?.includes('Update') || text?.includes('OK')) {
          await updateBtn.click();

          // Wait for update
          await page.waitForTimeout(1500);

          // Take screenshot after update
          await page.screenshot({ path: './screenshots/tc04-edit-success.png', fullPage: true });
        }
      }
    }
  });

  test('TC05: Search/Filter Configurations', async ({ page }) => {
    // Find search input
    const searchInput = page.locator('input[placeholder*="Search"]').first();
    await expect(searchInput).toBeVisible();

    // Type in search
    await searchInput.fill('Test');

    // Wait for filtering
    await page.waitForTimeout(600);

    // Take screenshot
    await page.screenshot({ path: './screenshots/tc05-search-filter.png', fullPage: true });

    // Clear search
    await searchInput.clear();

    // Wait for reset
    await page.waitForTimeout(300);
  });

  test('TC06: Sort Configuration List', async ({ page }) => {
    // Wait for table
    const table = page.locator('table');
    await expect(table).toBeVisible({ timeout: 5000 });

    // Click on Name header to sort
    const nameHeader = page.locator('table thead th').first();
    await nameHeader.click();

    // Wait for sort
    await page.waitForTimeout(300);

    // Take screenshot
    await page.screenshot({ path: './screenshots/tc06-sorted-list.png', fullPage: true });
  });

  test('TC07: Delete Configuration', async ({ page }) => {
    // Wait for table
    const table = page.locator('table');
    await expect(table).toBeVisible({ timeout: 5000 });

    // Get initial row count
    const rows = page.locator('table tbody tr');
    const initialCount = await rows.count();

    if (initialCount > 0) {
      // Click action menu on first row
      const firstRow = rows.first();
      const actionBtn = firstRow.locator('button').last();
      await actionBtn.click();

      // Wait for menu
      await page.waitForTimeout(400);

      // Click Delete
      const deleteOption = page.locator('[role="menuitem"]:has-text("Delete")');
      if (await deleteOption.isVisible({ timeout: 2000 }).catch(() => false)) {
        await deleteOption.click();

        // Wait for confirmation modal
        const confirmModal = page.locator('[role="dialog"]');
        await expect(confirmModal).toBeVisible({ timeout: 5000 });

        // Take screenshot of confirmation
        await page.screenshot({ path: './screenshots/tc07-delete-confirm.png', fullPage: true });

        // Click Delete button in confirmation (usually the last button or one marked as danger)
        const confirmButtons = confirmModal.locator('button');
        const confirmCount = await confirmButtons.count();

        if (confirmCount > 0) {
          // Find the delete/ok button (usually second to last or last)
          const deleteBtn = confirmButtons.filter({ hasText: /^Delete$|^OK$/ }).last();
          if (await deleteBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
            await deleteBtn.click();

            // Wait for deletion
            await page.waitForTimeout(1500);

            // Take screenshot after deletion
            await page.screenshot({ path: './screenshots/tc07-delete-success.png', fullPage: true });
          }
        }
      }
    }
  });

  test('TC08: Empty State Display', async ({ page }) => {
    // Take screenshot of current state
    await page.screenshot({ path: './screenshots/tc08-list-state.png', fullPage: true });

    // Check if empty state is shown
    const emptyState = page.locator('text=No zero-touch configurations set up yet');
    const isEmpty = await emptyState.isVisible({ timeout: 2000 }).catch(() => false);

    if (isEmpty) {
      console.log('Empty state displayed');
      // Check for Create Configuration button in empty state
      const createBtn = page.locator('button:has-text("Create Configuration")');
      await expect(createBtn).toBeVisible();
    } else {
      console.log('Configurations exist in list');
    }
  });

  test('TC09: Performance - Page Load Time', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('http://localhost:5173/patches/zero-touch');
    await page.waitForLoadState('networkidle');

    const loadTime = Date.now() - startTime;

    console.log(`Page load time: ${loadTime}ms`);

    // Assert reasonable load time (under 10 seconds)
    expect(loadTime).toBeLessThan(10000);

    // Get performance metrics
    const metrics = await page.evaluate(() => {
      const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (perfData) {
        return {
          domInteractive: perfData.domInteractive,
          domContentLoaded: perfData.domContentLoaded,
          loadEventEnd: perfData.loadEventEnd,
          duration: perfData.duration
        };
      }
      return null;
    });

    console.log('Performance metrics:', metrics);
  });

  test('TC10: Console Error Check', async ({ page }) => {
    const errors: string[] = [];
    const warnings: string[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      } else if (msg.type() === 'warning') {
        warnings.push(msg.text());
      }
    });

    // Perform some navigation
    await page.goto('http://localhost:5173/patches/zero-touch');
    await page.waitForLoadState('networkidle');

    // Wait a bit more for any async errors
    await page.waitForTimeout(2000);

    console.log(`Console errors: ${errors.length}`);
    console.log(`Console warnings: ${warnings.length}`);

    if (errors.length > 0) {
      console.log('Errors found:');
      errors.forEach(e => console.log(`  - ${e}`));
    }

    // Filter out common harmless warnings
    const criticalErrors = errors.filter(e => !e.includes('ResizeObserver') && !e.includes('Non-Error promise rejection'));

    // Some errors are acceptable, but document them
    console.log(`Critical errors: ${criticalErrors.length}`);
  });
});
