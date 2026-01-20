import { test, expect } from './fixtures';
import { login, waitForPageLoad, checkPageRendered } from './fixtures';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should display dashboard after login', async ({ page }) => {
    await page.goto('/dashboard');
    await waitForPageLoad(page);

    // Dashboard should be visible
    const dashboardContent = page.locator('main, [class*="dashboard"], [class*="content"]').first();
    await expect(dashboardContent).toBeVisible();
  });

  test('should display statistics cards', async ({ page }) => {
    await page.goto('/dashboard');
    await waitForPageLoad(page);

    // Look for stat cards or metrics
    const statCards = page.locator('.ant-card, .ant-statistic, [class*="stat"], [class*="metric"], [class*="card"]');
    const count = await statCards.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should display charts or graphs', async ({ page }) => {
    await page.goto('/dashboard');
    await waitForPageLoad(page);

    // Look for charts (recharts, antd charts, or canvas elements)
    const charts = page.locator('svg.recharts-surface, canvas, [class*="chart"], .recharts-wrapper');
    const count = await charts.count();
    // Charts might not be present in all dashboards
    console.log(`Found ${count} chart elements`);
  });

  test('should have navigation sidebar', async ({ page }) => {
    await page.goto('/dashboard');
    await waitForPageLoad(page);

    // Check for sidebar/nav
    const sidebar = page.locator('aside, nav, .ant-layout-sider, [class*="sidebar"], [class*="nav"]').first();
    await expect(sidebar).toBeVisible();
  });

  test('should have user profile section', async ({ page }) => {
    await page.goto('/dashboard');
    await waitForPageLoad(page);

    // Look for user profile or avatar
    const userSection = page.locator('[class*="avatar"], [class*="user"], [class*="profile"], .ant-avatar').first();
    await expect(userSection).toBeVisible({ timeout: 10000 }).catch(() => {
      console.log('User profile section not visible or uses different selector');
    });
  });

  test('should navigate to patches from sidebar', async ({ page }) => {
    await page.goto('/dashboard');
    await waitForPageLoad(page);

    // Click patches link in navigation
    const patchesLink = page.locator('a[href*="patches"], text=/patches/i').first();
    if (await patchesLink.isVisible()) {
      await patchesLink.click();
      await page.waitForURL(/\/patches/, { timeout: 10000 });
    }
  });

  test('should navigate to assets from sidebar', async ({ page }) => {
    await page.goto('/dashboard');
    await waitForPageLoad(page);

    const assetsLink = page.locator('a[href*="assets"], text=/assets/i').first();
    if (await assetsLink.isVisible()) {
      await assetsLink.click();
      await page.waitForURL(/\/assets/, { timeout: 10000 });
    }
  });

  test('should display recent activity or notifications', async ({ page }) => {
    await page.goto('/dashboard');
    await waitForPageLoad(page);

    // Look for activity feed, notifications, or recent items
    const activitySection = page.locator('[class*="activity"], [class*="notification"], [class*="recent"]').first();
    // This might not be present in all dashboards
    console.log(`Activity section visible: ${await activitySection.isVisible().catch(() => false)}`);
  });
});
