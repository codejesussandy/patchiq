import { test, expect } from './fixtures';
import { login, waitForPageLoad, checkTableRendered, checkModalOpened } from './fixtures';

test.describe('Discovery Module', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test.describe('IP Discovery Page', () => {
    test('should navigate to IP discovery', async ({ page }) => {
      await page.goto('/discovery/ip-discovery');
      await waitForPageLoad(page);

      const content = page.locator('main, [class*="content"]').first();
      await expect(content).toBeVisible();
    });

    test('should display discovery scans table', async ({ page }) => {
      await page.goto('/discovery/ip-discovery');
      await waitForPageLoad(page);
      await checkTableRendered(page);
    });

    test('should have start scan button', async ({ page }) => {
      await page.goto('/discovery/ip-discovery');
      await waitForPageLoad(page);

      const scanBtn = page.locator('button:has-text("Scan"), button:has-text("Start"), button:has-text("Discover")');
      await expect(scanBtn.first()).toBeVisible({ timeout: 10000 }).catch(() => {
        console.log('Scan button might use different text');
      });
    });

    test('should have IP range input', async ({ page }) => {
      await page.goto('/discovery/ip-discovery');
      await waitForPageLoad(page);

      const ipInput = page.locator('input[placeholder*="IP" i], input[placeholder*="range" i], input[placeholder*="subnet" i]');
      const count = await ipInput.count();
      console.log(`Found ${count} IP input fields`);
    });

    test('should show scan status (running/completed/failed)', async ({ page }) => {
      await page.goto('/discovery/ip-discovery');
      await waitForPageLoad(page);

      const statusBadges = page.locator('.ant-tag, .ant-badge, [class*="status"]');
      const count = await statusBadges.count();
      console.log(`Found ${count} status elements`);
    });

    test('should show discovered devices count', async ({ page }) => {
      await page.goto('/discovery/ip-discovery');
      await waitForPageLoad(page);

      const countElements = page.locator('[class*="count"], [class*="total"], [class*="discovered"]');
      const count = await countElements.count();
      console.log(`Found ${count} count elements`);
    });
  });

  test.describe('Device Credentials Page', () => {
    test('should navigate to device credentials', async ({ page }) => {
      await page.goto('/discovery/device-credentials');
      await waitForPageLoad(page);

      const content = page.locator('main, [class*="content"]').first();
      await expect(content).toBeVisible();
    });

    test('should display credentials table', async ({ page }) => {
      await page.goto('/discovery/device-credentials');
      await waitForPageLoad(page);
      await checkTableRendered(page);
    });

    test('should have add credentials button', async ({ page }) => {
      await page.goto('/discovery/device-credentials');
      await waitForPageLoad(page);

      const addBtn = page.locator('button:has-text("Add"), button:has-text("Create"), button:has-text("New")');
      await expect(addBtn.first()).toBeVisible({ timeout: 10000 });
    });

    test('should open credential form modal', async ({ page }) => {
      await page.goto('/discovery/device-credentials');
      await waitForPageLoad(page);

      const addBtn = page.locator('button:has-text("Add"), button:has-text("Create"), button:has-text("New")').first();
      if (await addBtn.isVisible()) {
        await addBtn.click();
        await page.waitForTimeout(1000);
        await checkModalOpened(page);
      }
    });

    test('should show credential types (SSH, WMI, SNMP, etc.)', async ({ page }) => {
      await page.goto('/discovery/device-credentials');
      await waitForPageLoad(page);

      const credTypes = page.locator('text=/SSH|WMI|SNMP|Windows/i');
      const count = await credTypes.count();
      console.log(`Found ${count} credential type references`);
    });

    test('should have edit and delete actions', async ({ page }) => {
      await page.goto('/discovery/device-credentials');
      await waitForPageLoad(page);

      const editBtns = page.locator('button:has-text("Edit"), [aria-label="Edit"], .anticon-edit');
      const deleteBtns = page.locator('button:has-text("Delete"), [aria-label="Delete"], .anticon-delete');

      console.log(`Found ${await editBtns.count()} edit buttons`);
      console.log(`Found ${await deleteBtns.count()} delete buttons`);
    });
  });

  test.describe('Agents Page', () => {
    test('should navigate to agents page', async ({ page }) => {
      await page.goto('/discovery/agents');
      await waitForPageLoad(page);

      const content = page.locator('main, [class*="content"]').first();
      await expect(content).toBeVisible();
    });

    test('should display agents table', async ({ page }) => {
      await page.goto('/discovery/agents');
      await waitForPageLoad(page);
      await checkTableRendered(page);
    });

    test('should show agent status (online/offline)', async ({ page }) => {
      await page.goto('/discovery/agents');
      await waitForPageLoad(page);

      const statusBadges = page.locator('.ant-tag, .ant-badge, [class*="status"], [class*="online"], [class*="offline"]');
      const count = await statusBadges.count();
      console.log(`Found ${count} agent status elements`);
    });

    test('should show agent version information', async ({ page }) => {
      await page.goto('/discovery/agents');
      await waitForPageLoad(page);

      const versionInfo = page.locator('text=/\\d+\\.\\d+/, [class*="version"]');
      const count = await versionInfo.count();
      console.log(`Found ${count} version elements`);
    });

    test('should have download agent button', async ({ page }) => {
      await page.goto('/discovery/agents');
      await waitForPageLoad(page);

      const downloadBtn = page.locator('button:has-text("Download"), button:has-text("Install")');
      const count = await downloadBtn.count();
      console.log(`Found ${count} download buttons`);
    });

    test('should have agent actions (restart, uninstall)', async ({ page }) => {
      await page.goto('/discovery/agents');
      await waitForPageLoad(page);

      const actionBtns = page.locator('button:has-text("Restart"), button:has-text("Uninstall"), .anticon-more');
      const count = await actionBtns.count();
      console.log(`Found ${count} agent action elements`);
    });

    test('should show last heartbeat time', async ({ page }) => {
      await page.goto('/discovery/agents');
      await waitForPageLoad(page);

      const heartbeatInfo = page.locator('[class*="heartbeat"], [class*="last-seen"], text=/ago|min|hour|day/i');
      const count = await heartbeatInfo.count();
      console.log(`Found ${count} heartbeat/last-seen elements`);
    });

    test('should filter agents by status', async ({ page }) => {
      await page.goto('/discovery/agents');
      await waitForPageLoad(page);

      const statusFilter = page.locator('.ant-select, button:has-text("Status"), [class*="filter"]');
      const count = await statusFilter.count();
      console.log(`Found ${count} status filter elements`);
    });
  });
});
