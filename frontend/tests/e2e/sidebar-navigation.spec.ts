import { test, expect } from './fixtures';

/**
 * Helper: hover over the sidebar to expand it, then wait for an item to appear.
 * The sidebar expands on mouse-enter with a 150 ms delay.
 */
async function expandSidebar(page: import('@playwright/test').Page) {
  // Use a CSS attribute selector since AntD Sider sets aria-hidden when collapsed,
  // which makes getByRole() unable to find the element. Force-hover to trigger the
  // onMouseEnter expand handler.
  const sidebar = page.locator('[aria-label="Primary navigation"]');
  await sidebar.hover({ force: true, timeout: 30_000 });
  // Allow the 150 ms hover timer + a small buffer to elapse
  await page.waitForTimeout(300);
}

test.describe('Sidebar navigation — Assets', () => {
  test('assets sidebar shows correct sub-navigation', async ({ page }) => {
    await page.goto('/assets');
    await expandSidebar(page);

    const sidebar = page.getByRole('navigation', { name: 'Primary navigation' });

    // Verify all four asset sub-nav items are visible
    await expect(sidebar.getByText('All Assets')).toBeVisible();
    await expect(sidebar.getByText('Software Inventory')).toBeVisible();
    await expect(sidebar.getByText('Software Licenses')).toBeVisible();
    await expect(sidebar.getByText('Software Hub')).toBeVisible();

    // Click each item and verify URL
    await sidebar.getByText('Software Inventory').click();
    await expect(page).toHaveURL(/\/assets\/software-inventory/);

    await expandSidebar(page);
    await sidebar.getByText('Software Licenses').click();
    await expect(page).toHaveURL(/\/assets\/software-license/);

    await expandSidebar(page);
    await sidebar.getByText('Software Hub').click();
    await expect(page).toHaveURL(/\/assets\/hub/);

    await expandSidebar(page);
    await sidebar.getByText('All Assets').click();
    await expect(page).toHaveURL(/\/assets$/);
  });
});

test.describe('Sidebar navigation — Patches', () => {
  test('patches sidebar shows correct sub-navigation', async ({ page }) => {
    await page.goto('/patches');
    await expandSidebar(page);

    const sidebar = page.getByRole('navigation', { name: 'Primary navigation' });

    await expect(sidebar.getByText('All Patches')).toBeVisible();
    await expect(sidebar.getByText('Patch Deployments')).toBeVisible();
    await expect(sidebar.getByText('Patch Test and Approve')).toBeVisible();
    await expect(sidebar.getByText('Zero Touch Deployment')).toBeVisible();
    await expect(sidebar.getByText('Patch Jobs')).toBeVisible();

    // Click each and verify URL
    await sidebar.getByText('Patch Deployments').click();
    await expect(page).toHaveURL(/\/patches\/deployed/);

    await expandSidebar(page);
    await sidebar.getByText('Patch Test and Approve').click();
    await expect(page).toHaveURL(/\/patches\/test-approve/);

    await expandSidebar(page);
    await sidebar.getByText('Zero Touch Deployment').click();
    await expect(page).toHaveURL(/\/patches\/zero-touch/);

    await expandSidebar(page);
    await sidebar.getByText('Patch Jobs').click();
    await expect(page).toHaveURL(/\/patches\/patch-jobs/);

    await expandSidebar(page);
    await sidebar.getByText('All Patches').click();
    await expect(page).toHaveURL(/\/patches$/);
  });
});

test.describe('Sidebar navigation — Vulnerability', () => {
  test('vulnerability sidebar shows sub-navigation', async ({ page }) => {
    await page.goto('/vulnerability');
    await expandSidebar(page);

    const sidebar = page.getByRole('navigation', { name: 'Primary navigation' });

    await expect(sidebar.getByText('Zero Day Vulnerabilities')).toBeVisible();
    // Use getByRole to avoid strict-mode conflict with the page heading that also contains "Vulnerabilities"
    await expect(sidebar.getByRole('menuitem', { name: 'warning Vulnerabilities' })).toBeVisible();
    await expect(sidebar.getByText('Manage Exception')).toBeVisible();
    await expect(sidebar.getByText('Vulnerability Jobs')).toBeVisible();

    // Click each and verify URL
    await sidebar.getByText('Zero Day Vulnerabilities').click();
    await expect(page).toHaveURL(/\/vulnerability\/zero-day-vulnerabilities/);

    await expandSidebar(page);
    await sidebar.getByRole('menuitem', { name: 'warning Vulnerabilities' }).click();
    await expect(page).toHaveURL(/\/vulnerability\/vulnerabilities/);

    await expandSidebar(page);
    await sidebar.getByText('Manage Exception').click();
    await expect(page).toHaveURL(/\/vulnerability\/manage-exception/);

    await expandSidebar(page);
    await sidebar.getByText('Vulnerability Jobs').click();
    await expect(page).toHaveURL(/\/vulnerability\/vulnerability-jobs/);
  });
});

test.describe('Sidebar navigation — Pin / Unpin', () => {
  test('sidebar pin and unpin works', async ({ page }) => {
    // Dashboard does not render the sidebar — go to /patches where the sidebar always renders
    await page.goto('/patches');
    await expect(page.locator('[aria-label="Primary navigation"]')).toBeAttached({ timeout: 10_000 });

    // Use attribute selector since aria-hidden is set when collapsed (getByRole ignores aria-hidden)
    const sidebarEl = page.locator('[aria-label="Primary navigation"]');

    // Hover to reveal the pin button (sidebar must be expanded)
    await expandSidebar(page);

    // Click "Pin sidebar"
    const pinBtn = sidebarEl.getByRole('button', { name: 'Pin sidebar' });
    await expect(pinBtn).toBeVisible({ timeout: 5_000 });
    await pinBtn.click();

    // After pinning, sidebar should stay expanded even without hover.
    // The pin button label flips to "Unpin sidebar".
    const unpinBtn = sidebarEl.getByRole('button', { name: 'Unpin sidebar' });
    await expect(unpinBtn).toBeVisible({ timeout: 5_000 });

    // Move mouse away — sidebar should remain expanded because it is pinned.
    await page.mouse.move(800, 400);
    await page.waitForTimeout(500);
    await expect(unpinBtn).toBeVisible({ timeout: 5_000 });

    // Unpin — sidebar will collapse after mouse leaves
    await unpinBtn.click();
    await page.mouse.move(800, 400);
    await page.waitForTimeout(500);

    // After unpinning, re-expand the sidebar by hovering it again
    await expandSidebar(page);
    const pinBtnAgain = sidebarEl.getByRole('button', { name: 'Pin sidebar' });
    await expect(pinBtnAgain).toBeVisible({ timeout: 8_000 });
  });
});
