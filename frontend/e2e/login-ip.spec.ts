import { test, expect } from '@playwright/test';

test('login via IP address', async ({ page }) => {
  // Go to login page via IP
  await page.goto('http://192.168.1.11:5173/login');
  
  // Wait for the form
  await page.waitForSelector('form', { timeout: 10000 });
  
  // Fill credentials
  await page.getByPlaceholder('sharma@mail.com').fill('admin@patchiq.io');
  await page.getByPlaceholder('Password').fill('admin123');
  
  // Click login
  await page.getByRole('button', { name: 'Log in' }).click();
  
  // Wait for dashboard redirect
  const result = await Promise.race([
    page.waitForURL('**/dashboard**', { timeout: 15000 }).then(() => 'dashboard'),
    page.locator('.ant-message-error').waitFor({ timeout: 15000 }).then(() => 'error'),
  ]).catch(() => 'timeout');
  
  console.log('Result:', result, '| URL:', page.url());
  expect(result).toBe('dashboard');
});
