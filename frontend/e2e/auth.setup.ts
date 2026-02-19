import { test as setup, expect } from '@playwright/test';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const AUTH_FILE = path.join(__dirname, '..', 'auth.json');

setup('authenticate as admin', async ({ page }) => {
  // Navigate to the login page.
  await page.goto('/login');

  // Wait for the form to be fully rendered before interacting.
  await expect(page.getByRole('heading', { name: 'Welcome to InventIQ' })).toBeVisible();

  // Fill the Email field (Ant Design Form.Item label="Email").
  await page.getByLabel('Email').fill('admin@patchiq.io');

  // Fill the Password field (Ant Design Form.Item label="Password").
  await page.getByLabel('Password').fill('admin123');

  // Click the submit button.
  await page.getByRole('button', { name: 'Log in' }).click();

  // Wait until the browser lands on the dashboard — confirms login succeeded.
  await page.waitForURL('**/dashboard', { timeout: 30000 });

  // Verify the dashboard actually rendered (guards against a redirect loop).
  await expect(page).toHaveURL(/\/dashboard/);

  // Persist cookies and localStorage (accessToken + refreshToken) to disk.
  await page.context().storageState({ path: AUTH_FILE });
});
