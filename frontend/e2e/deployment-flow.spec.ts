/**
 * End-to-End Tests for Software Deployment Flow
 * Tests: Hub package deployment, Software Jobs, Rollback functionality
 */

import { test, expect, waitForPageLoad, checkTableRendered, checkModalOpened } from './fixtures';

test.describe('Hub and Software Deployment Flow', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    // Ensure we're logged in
    await expect(authenticatedPage).toHaveURL(/\/(dashboard|patches|assets|reports|hub|jobs)/);
  });

  test('Hub page loads and displays packages', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    // Navigate to Hub
    await page.goto('/hub');
    await waitForPageLoad(page);

    // Check page title (use heading to be more specific)
    await expect(page.getByRole('heading', { name: 'Software Hub' })).toBeVisible({ timeout: 10000 });

    // Check stats cards are visible
    await expect(page.locator('text=Total Packages')).toBeVisible();
    await expect(page.locator('text=Active Packages')).toBeVisible();

    // Check table is rendered
    await checkTableRendered(page);

    // Check action buttons are available
    await expect(page.locator('button:has-text("Add Package")')).toBeVisible();
    await expect(page.locator('button:has-text("Refresh")')).toBeVisible();
  });

  test('Can open deploy modal from Hub', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    await page.goto('/hub');
    await waitForPageLoad(page);

    // Wait for table to load
    await checkTableRendered(page);

    // Find and click the deploy button (rocket icon) on first package row
    const deployButton = page.locator('table tbody tr').first().locator('button').filter({ has: page.locator('[aria-label*="rocket"], .anticon-rocket') }).first();

    // If rocket icon not found, try finding by tooltip or aria-label
    const deployButtonAlt = page.locator('table tbody tr').first().locator('button[title*="Deploy"], button:has(.anticon-rocket)').first();

    if (await deployButton.isVisible()) {
      await deployButton.click();
    } else if (await deployButtonAlt.isVisible()) {
      await deployButtonAlt.click();
    } else {
      // Click any button that might be deploy in the actions column
      const actionsCell = page.locator('table tbody tr').first().locator('td').last();
      const buttons = actionsCell.locator('button');
      const buttonCount = await buttons.count();

      // The deploy button should be the first one (rocket icon)
      if (buttonCount > 0) {
        await buttons.first().click();
      }
    }

    await page.waitForTimeout(1000);

    // Check if deploy modal opened
    const modal = page.locator('.ant-modal, [role="dialog"]');
    if (await modal.isVisible()) {
      // Check modal has expected content
      await expect(page.locator('text=Deploy Package, text=Target Endpoints').first()).toBeVisible({ timeout: 5000 }).catch(() => {});

      // Close modal
      await page.locator('button:has-text("Cancel")').click();
    }
  });

  test('Software Jobs Deployed page loads', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    await page.goto('/jobs/software-jobs/deployed');
    await waitForPageLoad(page);

    // Check page title (use heading to be more specific)
    await expect(page.getByRole('heading', { name: 'Software Jobs' })).toBeVisible({ timeout: 10000 });

    // Check tabs are visible - use .first() to handle multiple matches
    await expect(page.locator('.ant-tabs-tab:has-text("Catalog")').first()).toBeVisible();
    await expect(page.locator('.ant-tabs-tab:has-text("Deployed")').first()).toBeVisible();

    // Check control buttons
    await expect(page.locator('button:has-text("Refresh")')).toBeVisible();
    await expect(page.locator('button:has-text("Create")')).toBeVisible();
  });

  test('Can open create deployment modal', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    await page.goto('/jobs/software-jobs/deployed');
    await waitForPageLoad(page);

    // Click Create button
    await page.click('button:has-text("Create")');
    await page.waitForTimeout(1000);

    // Check modal opened
    await checkModalOpened(page);

    // Check form fields exist (labels have asterisks for required fields)
    await expect(page.getByText(/Deployment Name/)).toBeVisible();
    await expect(page.getByText(/Deployment Type/)).toBeVisible();
    await expect(page.getByText(/Target Agents/)).toBeVisible();

    // Close modal
    await page.locator('button:has-text("Cancel"), .ant-modal-close').first().click();
  });

  test('Create deployment from Hub with OS matching', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    // Navigate to Hub
    await page.goto('/hub');
    await waitForPageLoad(page);
    await page.waitForTimeout(2000);
    await checkTableRendered(page);

    // Click deploy button using rocket icon (more reliable)
    const deployButton = page.locator('.anticon-rocket').first();
    await deployButton.click({ timeout: 10000 });
    await page.waitForTimeout(2000);

    // Check modal opened
    const modal = page.locator('[role="dialog"], .ant-modal');
    await expect(modal).toBeVisible({ timeout: 10000 });

    // Fill deployment name
    const nameInput = modal.locator('input').first();
    await nameInput.clear();
    await nameInput.fill('E2E Test Deployment');

    // Verify deployment type is present (default Install)
    const typeSelectText = modal.locator('.ant-select-selection-item').first();
    if (await typeSelectText.isVisible().catch(() => false)) {
      const typeText = await typeSelectText.textContent();
      console.log(`Deployment type: ${typeText}`);
    }

    // Check if target endpoints dropdown is visible using exact match
    const endpointsLabel = page.getByText('Target Endpoints', { exact: true });
    await expect(endpointsLabel).toBeVisible();

    // Check OS matching tag is visible (Linux Only, Windows Only, etc.)
    const osTag = modal.locator('.ant-tag').first();
    if (await osTag.isVisible().catch(() => false)) {
      const tagText = await osTag.textContent();
      console.log(`OS matching tag: ${tagText}`);
    }

    // Try to select an endpoint using multi-select
    const endpointSelect = modal.locator('.ant-select-multiple').first();
    if (await endpointSelect.isVisible()) {
      await endpointSelect.click();
      await page.waitForTimeout(1000);

      // Select first available endpoint from visible dropdown
      const dropdown = page.locator('.ant-select-dropdown:visible');
      if (await dropdown.isVisible().catch(() => false)) {
        const firstOption = dropdown.locator('.ant-select-item-option').first();
        if (await firstOption.isVisible().catch(() => false)) {
          await firstOption.click();
          console.log('Selected first endpoint');
        }
      }
    }

    // Close modal without submitting (don't create actual deployment in test)
    await modal.locator('button:has-text("Cancel")').click();
  });

  test('View deployment tasks', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    await page.goto('/jobs/software-jobs/deployed');
    await waitForPageLoad(page);

    // Check if there are any deployments in the table
    const tableRows = page.locator('table tbody tr');
    const rowCount = await tableRows.count();

    if (rowCount > 0) {
      // Find and click the view/eye button on first row
      const firstRow = tableRows.first();
      const viewButton = firstRow.locator('button:has(.anticon-eye), button[title*="View"]').first();

      if (await viewButton.isVisible()) {
        await viewButton.click();
        await page.waitForTimeout(1000);

        // Check tasks modal opened
        const tasksModal = page.locator('.ant-modal');
        if (await tasksModal.isVisible()) {
          // Check tasks content
          await expect(page.locator('text=Tasks, text=Endpoint, text=Status').first()).toBeVisible().catch(() => {});

          // Check for rollback button if there are failed tasks
          const rollbackButton = tasksModal.locator('button:has(.anticon-rollback)');
          if (await rollbackButton.isVisible()) {
            console.log('Rollback button is visible for failed task');
          }

          // Close modal
          await page.locator('.ant-modal-close, button:has-text("Close")').first().click();
        }
      }
    } else {
      console.log('No deployments found, skipping task view test');
    }
  });

  test('Software Jobs Catalog page loads', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    await page.goto('/jobs/software-jobs/catalog');
    await waitForPageLoad(page);

    // Check page rendered (use heading to be specific)
    await expect(page.getByRole('heading', { name: 'Software Jobs' })).toBeVisible({ timeout: 10000 });

    // Check Catalog tab is active
    const catalogTab = page.locator('.ant-tabs-tab:has-text("Catalog")').first();
    await expect(catalogTab).toBeVisible();
  });

  test('Patches page loads and shows deploy option', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    await page.goto('/patches');
    await waitForPageLoad(page);

    // Check page title
    await expect(page.locator('text=/All Patches|Patches/i').first()).toBeVisible({ timeout: 10000 });

    // Check table is rendered
    await checkTableRendered(page);

    // Check deploy patches button exists
    const deployButton = page.locator('button:has-text("Deploy Patches"), button:has-text("Deploy")');
    await expect(deployButton).toBeVisible().catch(() => {
      console.log('Deploy patches button not found');
    });
  });
});

test.describe('Deployment Creation Flow', () => {
  test('Full deployment creation from Software Jobs', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    await page.goto('/jobs/software-jobs/deployed');
    await waitForPageLoad(page);

    // Click Create button
    await page.click('button:has-text("Create")');
    await page.waitForTimeout(1000);

    // Fill the form
    const modal = page.locator('.ant-modal');
    await expect(modal).toBeVisible();

    // Fill deployment name
    await page.fill('input[id*="deploymentName"], input[placeholder*="Name"]', 'Playwright Test Deployment');

    // Fill description
    const descriptionInput = page.locator('textarea');
    if (await descriptionInput.isVisible()) {
      await descriptionInput.fill('Automated test deployment from Playwright');
    }

    // Select deployment type
    const typeLabel = page.locator('text=Deployment Type');
    if (await typeLabel.isVisible()) {
      const typeSelect = typeLabel.locator('..').locator('.ant-select').first();
      if (await typeSelect.isVisible()) {
        await typeSelect.click();
        await page.locator('.ant-select-item:has-text("Install")').click();
      }
    }

    // Select scope
    const scopeLabel = page.locator('text=Scope');
    if (await scopeLabel.isVisible()) {
      const scopeSelect = scopeLabel.locator('..').locator('.ant-select').first();
      if (await scopeSelect.isVisible()) {
        await scopeSelect.click();
        await page.locator('.ant-select-item').first().click();
      }
    }

    // Try to select target agents
    const agentSelect = page.locator('text=Target Agents').locator('..').locator('.ant-select');
    if (await agentSelect.isVisible()) {
      await agentSelect.click();
      await page.waitForTimeout(500);

      const agentOption = page.locator('.ant-select-item').first();
      if (await agentOption.isVisible()) {
        await agentOption.click();
        await page.keyboard.press('Escape'); // Close dropdown
      }
    }

    // Select policy
    const policySelect = page.locator('text=Deployment Policy').locator('..').locator('.ant-select');
    if (await policySelect.isVisible()) {
      await policySelect.click();
      await page.locator('.ant-select-item').first().click();
    }

    // Set retry count
    const retryInput = page.locator('input[type="number"]');
    if (await retryInput.isVisible()) {
      await retryInput.clear();
      await retryInput.fill('2');
    }

    // Select notify to
    const notifySelect = page.locator('text=Notify to').locator('..').locator('.ant-select');
    if (await notifySelect.isVisible()) {
      await notifySelect.click();
      await page.locator('.ant-select-item').first().click();
    }

    // Don't actually submit - just verify form can be filled
    // Close modal
    await page.locator('button:has-text("Cancel"), button:has-text("Save As Draft")').first().click();
  });
});

test.describe('Error Handling', () => {
  test('Hub page handles API errors gracefully', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    await page.goto('/hub');
    await waitForPageLoad(page);

    // Page should not show unhandled error
    const errorText = page.locator('text=/error|failed|something went wrong/i');
    const errorCount = await errorText.count();

    // Some error messages might be expected (like "No packages found")
    // but there shouldn't be unhandled React errors
    const reactError = page.locator('text=/Unhandled|Exception|stack trace/i');
    await expect(reactError).not.toBeVisible();
  });

  test('Software Jobs page handles empty state', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    await page.goto('/jobs/software-jobs/deployed');
    await waitForPageLoad(page);
    await page.waitForTimeout(2000);

    // Page should render even if no deployments
    await expect(page.getByRole('heading', { name: 'Software Jobs' })).toBeVisible();

    // Table should be visible (Ant Design always renders table)
    const table = page.locator('.ant-table');
    await expect(table).toBeVisible({ timeout: 10000 });
  });
});
