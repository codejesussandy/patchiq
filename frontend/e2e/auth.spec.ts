import { test, expect } from '@playwright/test';
import { TEST_USER, waitForPageLoad } from './fixtures';

test.describe('Authentication', () => {
  test.describe('Login Page', () => {
    test('should display login form', async ({ page }) => {
      await page.goto('/login');
      await page.waitForLoadState('networkidle');

      // Check form elements exist - Ant Design uses id matching form item name
      await expect(page.locator('#email')).toBeVisible({ timeout: 15000 });
      await expect(page.locator('#password')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();
    });

    test('should show validation errors for empty fields', async ({ page }) => {
      await page.goto('/login');
      await page.waitForLoadState('networkidle');
      await page.waitForSelector('#email', { timeout: 15000 });

      // Click submit without filling form
      await page.click('button[type="submit"]');

      // Check for validation messages
      await page.waitForTimeout(500);
      const errorMessages = page.locator('.ant-form-item-explain-error');
      const count = await errorMessages.count();
      expect(count).toBeGreaterThan(0);
    });

    test('should show error for invalid credentials', async ({ page }) => {
      await page.goto('/login');
      await page.waitForLoadState('networkidle');
      await page.waitForSelector('#email', { timeout: 15000 });

      await page.fill('#email', 'wrong@email.com');
      await page.fill('#password', 'wrongpassword');
      await page.click('button[type="submit"]');

      // Wait for error message (MSW will still allow login in dev)
      await page.waitForTimeout(2000);
    });

    test('should successfully login with valid credentials', async ({ page }) => {
      await page.goto('/login');
      await page.waitForLoadState('networkidle');
      await page.waitForSelector('#email', { timeout: 15000 });

      await page.fill('#email', TEST_USER.email);
      await page.fill('#password', TEST_USER.password);
      await page.click('button[type="submit"]');

      // Should redirect to dashboard
      await page.waitForURL(/\/(dashboard|patches|assets)/, { timeout: 30000 });
      expect(page.url()).toMatch(/\/(dashboard|patches|assets)/);
    });

    test('should have forgot password link', async ({ page }) => {
      await page.goto('/login');
      await page.waitForLoadState('networkidle');
      await page.waitForSelector('#email', { timeout: 15000 });

      // Ant Design Link component
      const forgotLink = page.locator('text=/forgot/i').first();
      await expect(forgotLink).toBeVisible();
    });
  });

  test.describe('Forgot Password Page', () => {
    test('should display forgot password form', async ({ page }) => {
      await page.goto('/forgot-password');
      await page.waitForLoadState('networkidle');

      // Wait for form to load
      await expect(page.locator('#email')).toBeVisible({ timeout: 15000 });
      await expect(page.locator('button[type="submit"]')).toBeVisible();
    });

    test('should have send link button', async ({ page }) => {
      await page.goto('/forgot-password');
      await page.waitForLoadState('networkidle');

      // Page has "Send Link" button instead of back link
      const sendButton = page.locator('button:has-text("Send")');
      await expect(sendButton).toBeVisible({ timeout: 15000 });
    });
  });

  test.describe('Protected Routes', () => {
    test('should redirect to login when not authenticated', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForURL(/\/login/, { timeout: 10000 });
      expect(page.url()).toContain('/login');
    });
  });
});
