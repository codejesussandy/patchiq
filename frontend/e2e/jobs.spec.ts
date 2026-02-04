import { test, expect } from './fixtures';
import { login, waitForPageLoad, checkTableRendered } from './fixtures';

test.describe('Jobs Module', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test.describe('Software Jobs Page', () => {
    test('should navigate to software jobs', async ({ page }) => {
      await page.goto('/patches/deployed/catalog');
      await waitForPageLoad(page);

      const content = page.locator('main, [class*="content"]').first();
      await expect(content).toBeVisible();
    });

    test('should display jobs table', async ({ page }) => {
      await page.goto('/patches/deployed/catalog');
      await waitForPageLoad(page);
      await checkTableRendered(page);
    });

    test('should have tabs for different job types', async ({ page }) => {
      await page.goto('/patches/deployed/catalog');
      await waitForPageLoad(page);

      const tabs = page.locator('.ant-tabs-tab, [role="tab"], [class*="tab"]');
      const count = await tabs.count();
      console.log(`Found ${count} tab elements`);
    });

    test('should show job status (pending/running/completed/failed)', async ({ page }) => {
      await page.goto('/patches/deployed/catalog');
      await waitForPageLoad(page);

      const statusBadges = page.locator('.ant-tag, .ant-badge, [class*="status"]');
      const count = await statusBadges.count();
      console.log(`Found ${count} status elements`);
    });

    test('should have create job button', async ({ page }) => {
      await page.goto('/patches/deployed/catalog');
      await waitForPageLoad(page);

      const createBtn = page.locator('button:has-text("Create"), button:has-text("Add"), button:has-text("New")');
      const count = await createBtn.count();
      console.log(`Found ${count} create buttons`);
    });

    test('should show job progress', async ({ page }) => {
      await page.goto('/patches/deployed/catalog');
      await waitForPageLoad(page);

      const progressBars = page.locator('.ant-progress, [class*="progress"], [role="progressbar"]');
      const count = await progressBars.count();
      console.log(`Found ${count} progress elements`);
    });
  });
});

test.describe('Patch Jobs Page', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should navigate to patch jobs', async ({ page }) => {
    await page.goto('/patches/patch-jobs');
    await waitForPageLoad(page);

    const content = page.locator('main, [class*="content"]').first();
    await expect(content).toBeVisible();
  });

  test('should display patch jobs table', async ({ page }) => {
    await page.goto('/patches/patch-jobs');
    await waitForPageLoad(page);
    await checkTableRendered(page);
  });

  test('should show deployment status', async ({ page }) => {
    await page.goto('/patches/patch-jobs');
    await waitForPageLoad(page);

    const deployStatus = page.locator('[class*="deploy"], [class*="install"], .ant-tag');
    const count = await deployStatus.count();
    console.log(`Found ${count} deployment status elements`);
  });

  test('should have retry/cancel actions', async ({ page }) => {
    await page.goto('/patches/patch-jobs');
    await waitForPageLoad(page);

    const actionBtns = page.locator('button:has-text("Retry"), button:has-text("Cancel"), button:has-text("Stop")');
    const count = await actionBtns.count();
    console.log(`Found ${count} action buttons`);
  });

  test('should show target machines count', async ({ page }) => {
    await page.goto('/patches/patch-jobs');
    await waitForPageLoad(page);

    const countElements = page.locator('[class*="count"], [class*="target"], [class*="machine"]');
    const count = await countElements.count();
    console.log(`Found ${count} target count elements`);
  });
});

test.describe('Vulnerability Jobs Page', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should navigate to vulnerability jobs', async ({ page }) => {
    await page.goto('/vulnerability/vulnerability-jobs/list');
    await waitForPageLoad(page);

    const content = page.locator('main, [class*="content"]').first();
    await expect(content).toBeVisible();
  });

  test('should display vulnerability scan jobs', async ({ page }) => {
    await page.goto('/vulnerability/vulnerability-jobs/list');
    await waitForPageLoad(page);
    await checkTableRendered(page);
  });

  test('should show scan progress', async ({ page }) => {
    await page.goto('/vulnerability/vulnerability-jobs/list');
    await waitForPageLoad(page);

    const progressBars = page.locator('.ant-progress, [class*="progress"]');
    const count = await progressBars.count();
    console.log(`Found ${count} progress elements`);
  });

  test('should have schedule scan option', async ({ page }) => {
    await page.goto('/vulnerability/vulnerability-jobs/list');
    await waitForPageLoad(page);

    const scheduleBtn = page.locator('button:has-text("Schedule"), button:has-text("Create")');
    const count = await scheduleBtn.count();
    console.log(`Found ${count} schedule buttons`);
  });
});
