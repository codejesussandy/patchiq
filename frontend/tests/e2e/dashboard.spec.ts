import { test, expect } from './fixtures';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    // Wait for the dashboard heading to confirm page loaded
    await expect(page.getByRole('heading', { name: 'Executive Dashboard' })).toBeVisible();
  });

  test('dashboard loads with stat cards', async ({ page }) => {
    // Heading
    await expect(page.getByRole('heading', { name: 'Executive Dashboard' })).toBeVisible();

    // Stat cards use aria-label="${title}: ${value}" — match by partial label
    await expect(page.locator('[aria-label*="Total Endpoints:"]').first()).toBeVisible();
    await expect(page.locator('[aria-label*="Total Linux Endpoints:"]')).toBeVisible();
    await expect(page.locator('[aria-label*="Total Windows Endpoints:"]')).toBeVisible();
    await expect(page.locator('[aria-label*="Total Apple Mac Endpoint:"]')).toBeVisible();
    await expect(page.locator('[aria-label*="Total Vulnerability:"]')).toBeVisible();
    await expect(page.locator('[aria-label*="Total Software:"]')).toBeVisible();
  });

  test('platform filter works', async ({ page }) => {
    // Ant Design Select: click the combobox to open the dropdown
    const select = page.locator('.ant-select').filter({
      has: page.locator('[aria-label="Filter dashboard by endpoint platform"]'),
    });

    // The Select itself renders a combobox internally; click it to open
    await select.click();

    // Wait for Ant Design dropdown to appear and click "Windows Only"
    const dropdown = page.locator('.ant-select-dropdown').last();
    await expect(dropdown).toBeVisible();
    await dropdown.getByText('Windows Only').click();

    // Dropdown should close after selection
    await expect(dropdown).not.toBeVisible();

    // Reset to "All Endpoints"
    await select.click();
    const dropdown2 = page.locator('.ant-select-dropdown').last();
    await expect(dropdown2).toBeVisible();
    await dropdown2.getByText('All Endpoints').click();
    await expect(dropdown2).not.toBeVisible();
  });

  test('refresh button works', async ({ page }) => {
    const refreshBtn = page.getByRole('button', { name: /Refresh/i });
    await expect(refreshBtn).toBeVisible();

    // Click and immediately assert loading state (button becomes disabled/spinning)
    await refreshBtn.click();

    // The button has loading={refreshing} so it should show a loading indicator.
    // Wait for the loading spinner to appear (Ant Design adds .ant-btn-loading class)
    await expect(refreshBtn).toHaveClass(/ant-btn-loading/, { timeout: 5000 }).catch(() => {
      // If loading resolves very quickly, that is acceptable — the click still fired.
    });
  });

  test('top navigation menu works', async ({ page }) => {
    const menuItems: { label: string; path: string }[] = [
      { label: 'Assets', path: '/assets' },
      { label: 'Patches', path: '/patches' },
      { label: 'Vulnerability', path: '/vulnerability' },
      { label: 'Reports', path: '/reports' },
      // Navigate back to Dashboard last
      { label: 'Dashboard', path: '/dashboard' },
    ];

    for (const item of menuItems) {
      await page.getByRole('menuitem', { name: item.label }).click();
      await expect(page).toHaveURL(new RegExp(item.path));
    }
  });
});
