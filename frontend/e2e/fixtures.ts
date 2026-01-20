import { test as base, expect, Page } from '@playwright/test';

// Test credentials
export const TEST_USER = {
  email: 'admin@patchiq.io',
  password: 'admin123',
};

// Extended test with authentication
export const test = base.extend<{ authenticatedPage: Page }>({
  authenticatedPage: async ({ page }, use) => {
    await login(page);
    await use(page);
  },
});

export { expect };

// Helper functions
export async function login(page: Page) {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');

  // Wait for form to be ready - Ant Design renders inputs with id matching name
  await page.waitForSelector('#email', { timeout: 15000 });

  // Fill login form using Ant Design input IDs
  await page.fill('#email', TEST_USER.email);
  await page.fill('#password', TEST_USER.password);

  // Click login button
  await page.click('button[type="submit"]');

  // Wait for navigation to dashboard or authenticated area
  await page.waitForURL(/\/(dashboard|patches|assets|reports)/, { timeout: 30000 });
}

export async function waitForPageLoad(page: Page) {
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(500); // Extra time for React rendering
}

export async function checkPageRendered(page: Page, expectedText?: string) {
  // Check no error boundaries
  const errorBoundary = page.locator('text=/something went wrong/i, text=/error/i').first();
  await expect(errorBoundary).not.toBeVisible({ timeout: 5000 }).catch(() => {});

  if (expectedText) {
    await expect(page.locator(`text=${expectedText}`).first()).toBeVisible({ timeout: 10000 });
  }
}

export async function clickAndWait(page: Page, selector: string) {
  await page.click(selector);
  await waitForPageLoad(page);
}

export async function fillForm(page: Page, fields: Record<string, string>) {
  for (const [selector, value] of Object.entries(fields)) {
    await page.fill(selector, value);
  }
}

export async function checkTableRendered(page: Page) {
  const table = page.locator('table, .ant-table, [class*="table"]').first();
  await expect(table).toBeVisible({ timeout: 10000 });
}

export async function checkModalOpened(page: Page) {
  const modal = page.locator('.ant-modal, [role="dialog"], [class*="modal"]').first();
  await expect(modal).toBeVisible({ timeout: 10000 });
}

export async function closeModal(page: Page) {
  const closeButton = page.locator('.ant-modal-close, [aria-label="Close"], button:has-text("Cancel")').first();
  if (await closeButton.isVisible()) {
    await closeButton.click();
    await page.waitForTimeout(500);
  }
}
