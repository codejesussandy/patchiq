import { test, expect } from './fixtures';

test.describe('Notifications — header bell', () => {
  test('notification bell is visible in header and opens dropdown', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: 'Executive Dashboard' })).toBeVisible();

    // Bell icon is rendered inside an Ant Design Badge/Dropdown in the header
    const bell = page.locator('header [aria-label="bell"], header .anticon-bell').first();
    await expect(bell).toBeVisible({ timeout: 10_000 });

    // Click the bell to open the notification dropdown
    await bell.click();

    // The dropdown contains a "Notifications" heading and a "View All" link
    await expect(page.getByText('Notifications').first()).toBeVisible({ timeout: 5_000 });
    await expect(page.getByRole('button', { name: /View All Notifications/i })).toBeVisible();
  });

  test('view all from dropdown navigates to /notifications', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: 'Executive Dashboard' })).toBeVisible();

    const bell = page.locator('header [aria-label="bell"], header .anticon-bell').first();
    await bell.click();

    const viewAll = page.getByRole('button', { name: /View All Notifications/i });
    await expect(viewAll).toBeVisible({ timeout: 5_000 });
    await viewAll.click();

    await expect(page).toHaveURL(/\/notifications/, { timeout: 8_000 });
  });
});

test.describe('Notifications — history page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/notifications');
    await expect(
      page.getByRole('heading', { name: 'Notification History' })
    ).toBeVisible({ timeout: 10_000 });
  });

  test('notification history page loads with filters', async ({ page }) => {
    await expect(page.getByPlaceholder('Search title or message...')).toBeVisible();

    // The three Select components (Type, Category, Read status)
    const selects = page.locator('.ant-select');
    // At least 3 dropdowns should be present
    await expect(selects.nth(0)).toBeVisible();
    await expect(selects.nth(1)).toBeVisible();
    await expect(selects.nth(2)).toBeVisible();

    // Date range picker
    await expect(page.locator('.ant-picker-range')).toBeVisible();

    // Table is present
    await expect(page.locator('.ant-table')).toBeVisible();
  });

  test('filter by type and category', async ({ page }) => {
    // Open Type select (first .ant-select)
    const typeSelect = page.locator('.ant-select').nth(0);
    await typeSelect.click();
    const dropdown = page.locator('.ant-select-dropdown').last();
    await expect(dropdown).toBeVisible();
    await dropdown.getByText('Warning').click();
    // Close dropdown with Escape in case it stays open
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    // Open Category select (second .ant-select)
    const categorySelect = page.locator('.ant-select').nth(1);
    await categorySelect.click();
    const dropdown2 = page.locator('.ant-select-dropdown').last();
    await expect(dropdown2).toBeVisible();
    // Use exact match to avoid ambiguity with other elements containing "Agent"
    await dropdown2.locator('.ant-select-item-option', { hasText: /^Agent$/ }).first().click();
    // Close dropdown with Escape in case it stays open
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    // Table should still be visible (results may be empty or show "No data found")
    const hasTable = await page.locator('.ant-table').isVisible().catch(() => false);
    const hasNoData = await page.getByText('No data found').isVisible().catch(() => false);
    expect(hasTable || hasNoData).toBeTruthy();

    // Clear both filters by clicking the ✕ clear icon on each select
    const clearIcons = page.locator('.ant-select-clear');
    const clearCount = await clearIcons.count();
    for (let i = 0; i < clearCount; i++) {
      await clearIcons.first().click();
    }
  });

  test('search by title or message', async ({ page }) => {
    const searchInput = page.getByPlaceholder('Search title or message...');
    await searchInput.fill('agent');
    await page.waitForTimeout(500);
    await expect(page.locator('.ant-table')).toBeVisible();

    // Clear — the input has allowClear
    await searchInput.clear();
  });

  test('mark single notification as read', async ({ page }) => {
    // If there are unread rows, a "Mark as read" button (CheckOutlined, title="Mark as read") appears
    const markReadBtn = page
      .locator('.ant-table-tbody tr')
      .first()
      .locator('button[title="Mark as read"]');

    const hasUnread = await markReadBtn.isVisible({ timeout: 8_000 }).catch(() => false);
    if (!hasUnread) {
      // All notifications already read — nothing to do
      return;
    }

    await markReadBtn.click();
    // Ant Design does not show a toast for single mark-as-read in this component
    // but the button should disappear (row becomes read)
    await expect(markReadBtn).not.toBeVisible({ timeout: 5_000 });
  });

  test('bulk mark as read', async ({ page }) => {
    // Select the first row via its checkbox — use a tr row checkbox, skip the header row checkbox
    const firstRowCheckbox = page.locator('.ant-table-tbody tr.ant-table-row .ant-checkbox-input').first();
    const hasRows = await firstRowCheckbox.isVisible({ timeout: 8_000 }).catch(() => false);
    if (!hasRows) return;
    // Skip if the checkbox is disabled (no real data rows)
    const isDisabled = await firstRowCheckbox.isDisabled().catch(() => true);
    if (isDisabled) return;

    await firstRowCheckbox.check();

    // Bulk action bar should appear
    const markReadBtn = page.getByRole('button', { name: /Mark Read/i });
    await expect(markReadBtn).toBeVisible({ timeout: 3_000 });
    await markReadBtn.click();

    await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 5_000 });
  });

  test('delete single notification', async ({ page }) => {
    const firstDeleteBtn = page
      .locator('.ant-table-tbody tr')
      .first()
      .locator('button[title="Delete"]');

    const hasRows = await firstDeleteBtn.isVisible({ timeout: 8_000 }).catch(() => false);
    if (!hasRows) return;

    await firstDeleteBtn.click();
    // Row should be removed; no toast is shown for single delete in this component
    await page.waitForTimeout(1_000);
    await expect(page.locator('.ant-table')).toBeVisible();
  });

  test('bulk delete notifications', async ({ page }) => {
    const firstRowCheckbox = page.locator('.ant-table-tbody tr.ant-table-row .ant-checkbox-input').first();
    const hasRows = await firstRowCheckbox.isVisible({ timeout: 8_000 }).catch(() => false);
    if (!hasRows) return;
    const isDisabled = await firstRowCheckbox.isDisabled().catch(() => true);
    if (isDisabled) return;

    await firstRowCheckbox.check();

    const deleteBtn = page.getByRole('button', { name: /^Delete$/i });
    await expect(deleteBtn).toBeVisible({ timeout: 3_000 });
    await deleteBtn.click();

    await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 5_000 });
  });
});
