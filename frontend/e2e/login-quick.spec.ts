import { test, expect } from '@playwright/test';

test('login with valid credentials', async ({ page }) => {
  // Go to login page
  await page.goto('/login');
  
  // Wait for the form to be visible
  await page.waitForSelector('form', { timeout: 10000 });
  
  // Fill credentials
  await page.getByPlaceholder('sharma@mail.com').fill('admin@patchiq.io');
  await page.getByPlaceholder('Password').fill('admin123');
  
  // Click login
  await page.getByRole('button', { name: 'Log in' }).click();
  
  // Wait for result - either dashboard redirect or error message
  const result = await Promise.race([
    page.waitForURL('**/dashboard**', { timeout: 15000 }).then(() => 'dashboard'),
    page.locator('.ant-message-error').waitFor({ timeout: 15000 }).then(() => 'error'),
    page.locator('.ant-message-success').waitFor({ timeout: 15000 }).then(() => 'success')
  ]).catch(() => 'timeout');
  
  console.log('Login result:', result);
  console.log('Final URL:', page.url());
  
  // If we got error, get the error text
  if (result === 'error') {
    const errorText = await page.locator('.ant-message-error').textContent();
    console.log('Error message:', errorText);
  }
  
  expect(result).not.toBe('error');
  expect(result).not.toBe('timeout');
});
