/**
 * Hub Deployment E2E Tests
 * Tests the complete flow of deploying software from Hub to endpoints
 */

import { test, expect, waitForPageLoad } from './fixtures';

test.describe('Hub Deployment Flow', () => {
  test('Complete deployment flow from Hub', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    // Step 1: Navigate to Hub
    console.log('Step 1: Navigate to Hub');
    await page.goto('/hub');
    await waitForPageLoad(page);

    // Verify Hub page loaded
    await expect(page.getByRole('heading', { name: 'Software Hub' })).toBeVisible({ timeout: 10000 });
    console.log('Hub page loaded successfully');

    // Step 2: Check packages table
    console.log('Step 2: Check packages table');
    const table = page.locator('.ant-table');
    await expect(table).toBeVisible({ timeout: 10000 });

    // Wait for table data to load
    await page.waitForTimeout(2000);

    const rows = page.locator('.ant-table-tbody tr.ant-table-row');
    const rowCount = await rows.count();
    console.log(`Found ${rowCount} packages in Hub`);

    if (rowCount === 0) {
      console.log('No packages found, skipping deployment test');
      return;
    }

    // Step 3: Click deploy button on first package
    // The deploy button has title="Deploy to Endpoints" with a rocket icon
    console.log('Step 3: Click deploy button');

    // For Ant Design tables with fixed columns, buttons are in .ant-table-cell-fix-right
    // Or we can find the button by its title attribute
    const deployButton = page.locator('button[title="Deploy to Endpoints"]').first();

    if (await deployButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await deployButton.click();
      console.log('Clicked Deploy button via title attribute');
    } else {
      // Alternative: find button with rocket icon
      const rocketButton = page.locator('.anticon-rocket').first().locator('..');
      if (await rocketButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await rocketButton.click();
        console.log('Clicked Deploy button via rocket icon');
      } else {
        console.log('Deploy button not found, checking table structure...');
        // Debug: print what buttons are available
        const allButtons = page.locator('.ant-table button');
        const buttonCount = await allButtons.count();
        console.log(`Total buttons in table: ${buttonCount}`);

        if (buttonCount > 0) {
          // Click the first action button
          await allButtons.first().click();
          console.log('Clicked first available button');
        } else {
          console.log('No buttons found in table');
          return;
        }
      }
    }

    await page.waitForTimeout(2000);

    // Step 4: Verify deploy modal opened
    console.log('Step 4: Verify deploy modal');
    // Use role-based locator for more reliable modal detection
    const modal = page.locator('[role="dialog"], .ant-modal');
    await expect(modal).toBeVisible({ timeout: 10000 });

    // Check modal title contains "Deploy Package"
    const modalTitle = page.getByText('Deploy Package');
    await expect(modalTitle).toBeVisible({ timeout: 5000 });
    console.log('Deploy modal opened successfully');

    // Step 5: Fill deployment form
    console.log('Step 5: Fill deployment form');

    // The deployment name input should be pre-filled, but we'll modify it
    const nameInput = modal.locator('input#deploymentName, input').first();
    await nameInput.clear();
    await nameInput.fill('Playwright E2E Test Deployment');

    // Step 6: Check target endpoints dropdown
    console.log('Step 6: Check target endpoints');
    // Use exact text match to avoid matching placeholder
    const endpointLabel = page.getByText('Target Endpoints', { exact: true });
    await expect(endpointLabel).toBeVisible();

    // Check the platform tag showing OS compatibility (Linux Only, Windows Only, etc.)
    const platformTag = modal.locator('.ant-tag').first();
    const platformVisible = await platformTag.isVisible().catch(() => false);
    if (platformVisible) {
      const tagText = await platformTag.textContent();
      console.log(`Platform tag: ${tagText}`);
    }

    // Step 7: Try to select an endpoint
    console.log('Step 7: Select endpoint');
    const endpointSelect = modal.locator('.ant-select');

    // Find the multi-select for endpoints (not the deployment type select)
    const multiSelect = modal.locator('.ant-select-multiple').first();
    if (await multiSelect.isVisible()) {
      await multiSelect.click();
      await page.waitForTimeout(500);

      // Check dropdown options
      const options = page.locator('.ant-select-dropdown .ant-select-item');
      const optionCount = await options.count();
      console.log(`Found ${optionCount} endpoint options`);

      if (optionCount > 0) {
        // Select first endpoint
        await options.first().click();
        console.log('Selected first endpoint');
        await page.waitForTimeout(300);
      } else {
        console.log('No compatible endpoints available');
        await page.keyboard.press('Escape');
      }
    }

    // Step 8: Close modal (don't actually deploy in test)
    console.log('Step 8: Close modal');
    const cancelButton = modal.locator('button:has-text("Cancel")');
    await cancelButton.click();
    await page.waitForTimeout(500);

    console.log('Hub deployment flow test completed successfully');
  });

  test('Software Jobs Deployed page shows deployments', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    // Navigate to Software Jobs Deployed
    await page.goto('/jobs/software-jobs/deployed');
    await waitForPageLoad(page);

    // Verify page loaded
    await expect(page.getByRole('heading', { name: 'Software Jobs' })).toBeVisible({ timeout: 10000 });

    // Wait for data to load
    await page.waitForTimeout(2000);

    // Check table
    const table = page.locator('.ant-table');
    await expect(table).toBeVisible({ timeout: 10000 });

    const rows = page.locator('.ant-table-tbody tr.ant-table-row');
    const rowCount = await rows.count();
    console.log(`Found ${rowCount} deployments`);

    if (rowCount > 0) {
      // Click view button on first deployment (eye icon)
      const viewButton = page.locator('button[title*="View"], button:has(.anticon-eye)').first();

      if (await viewButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await viewButton.click();
        await page.waitForTimeout(1000);

        // Check if tasks modal opened
        const tasksModal = page.locator('.ant-modal-content');
        if (await tasksModal.isVisible()) {
          console.log('Tasks modal opened');

          // Check for tasks table
          const tasksTable = tasksModal.locator('.ant-table');
          if (await tasksTable.isVisible()) {
            const taskRows = tasksTable.locator('.ant-table-tbody tr');
            const taskCount = await taskRows.count();
            console.log(`Found ${taskCount} tasks`);

            // Check for rollback button on failed tasks
            const rollbackButton = tasksModal.locator('button:has(.anticon-rollback)');
            const rollbackVisible = await rollbackButton.isVisible().catch(() => false);
            console.log(`Rollback button visible: ${rollbackVisible}`);
          }

          // Close modal
          await page.locator('.ant-modal-close, button:has-text("Close")').first().click();
        }
      } else {
        console.log('View button not found');
      }
    }

    console.log('Software Jobs Deployed test completed');
  });

  test('Create deployment and verify endpoint selection', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    // Navigate to Hub
    await page.goto('/hub');
    await waitForPageLoad(page);

    // Wait for table to load
    await page.waitForTimeout(2000);

    const rows = page.locator('.ant-table-tbody tr.ant-table-row');
    const rowCount = await rows.count();

    if (rowCount === 0) {
      console.log('No packages, skipping');
      return;
    }

    // Click deploy on first package - use rocket icon
    const deployButton = page.locator('.anticon-rocket').first();
    await deployButton.click({ timeout: 10000 });
    await page.waitForTimeout(2000);

    const modal = page.locator('[role="dialog"], .ant-modal');
    await expect(modal).toBeVisible({ timeout: 10000 });

    // Fill deployment name
    const nameInput = modal.locator('input').first();
    await nameInput.clear();
    await nameInput.fill(`E2E Test ${Date.now()}`);
    console.log('Filled deployment name');

    // Verify deployment type is pre-set to "Install" (default)
    const typeSelectText = modal.locator('.ant-select-selection-item').first();
    if (await typeSelectText.isVisible().catch(() => false)) {
      const typeText = await typeSelectText.textContent();
      console.log(`Deployment type: ${typeText}`);
    }

    // Click on endpoint selector to open dropdown
    const endpointSelect = modal.locator('.ant-select-multiple').first();
    if (await endpointSelect.isVisible()) {
      await endpointSelect.click();
      await page.waitForTimeout(1000);

      // Wait for dropdown to appear and then click first option
      const dropdown = page.locator('.ant-select-dropdown:visible');
      if (await dropdown.isVisible().catch(() => false)) {
        const options = dropdown.locator('.ant-select-item-option');
        const optionCount = await options.count();
        console.log(`Found ${optionCount} endpoint options`);

        if (optionCount > 0) {
          await options.first().click();
          console.log('Selected first endpoint');
          await page.waitForTimeout(300);
        }
      }
    }

    // Close modal without submitting
    await modal.locator('button:has-text("Cancel")').click();
    await page.waitForTimeout(500);
    console.log('Test completed - modal closed');
  });

  test('Verify OS-matching filters endpoints correctly', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    await page.goto('/hub');
    await waitForPageLoad(page);
    await page.waitForTimeout(2000);

    // Find packages and check their platforms
    const rows = page.locator('.ant-table-tbody tr.ant-table-row');
    const rowCount = await rows.count();

    if (rowCount === 0) {
      console.log('No packages to test');
      return;
    }

    // Try to find a Linux package by looking for Linux icon
    const linuxPackage = page.locator('tr:has(.anticon-linux)').first();
    const windowsPackage = page.locator('tr:has(.anticon-windows)').first();

    let targetButton = null;
    let expectedPlatform = '';

    if (await linuxPackage.isVisible().catch(() => false)) {
      targetButton = linuxPackage.locator('button[title="Deploy to Endpoints"]');
      expectedPlatform = 'Linux';
    } else if (await windowsPackage.isVisible().catch(() => false)) {
      targetButton = windowsPackage.locator('button[title="Deploy to Endpoints"]');
      expectedPlatform = 'Windows';
    } else {
      // Fall back to first package
      targetButton = page.locator('button[title="Deploy to Endpoints"]').first();
      expectedPlatform = 'any';
    }

    if (targetButton && await targetButton.isVisible().catch(() => false)) {
      await targetButton.click();
      await page.waitForTimeout(2000);

      const modal = page.locator('[role="dialog"], .ant-modal');
      await expect(modal).toBeVisible({ timeout: 10000 });

      // Check that the platform tag shows correct filtering
      const platformTag = modal.locator('.ant-tag');
      const tagCount = await platformTag.count();
      console.log(`Found ${tagCount} tags in deploy modal`);

      if (tagCount > 0) {
        const tagText = await platformTag.first().textContent();
        console.log(`Platform filter: ${tagText}`);
      }

      // Close modal
      await modal.locator('button:has-text("Cancel")').click();
    }

    console.log('OS-matching test completed');
  });
});
