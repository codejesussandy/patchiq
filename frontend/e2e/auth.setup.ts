import { test as setup } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const authFile = path.join(__dirname, '../auth.json');

setup('authenticate', async ({ page }) => {
  // Perform authentication steps
  await page.goto('http://localhost:5173/login');
  await page.waitForLoadState('domcontentloaded');

  // Wait for form to be ready
  await page.waitForTimeout(2000);

  // Ant Design forms use ID-based selectors
  // Fill email field
  await page.fill('#email', 'admin@patchiq.io');

  // Fill password field
  await page.fill('#password', 'admin123');

  // Submit the form
  await page.click('button[type="submit"]');

  // Wait for navigation to dashboard or any authenticated page
  await page.waitForURL('**/dashboard', { timeout: 15000 }).catch(() => {
    console.log('Did not redirect to dashboard, checking if on authenticated page...');
  });

  // Wait a bit to ensure cookies are set
  await page.waitForTimeout(2000);

  // Save signed-in state
  await page.context().storageState({ path: authFile });

  console.log('Authentication complete. Storage state saved to:', authFile);
});
