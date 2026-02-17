import { test, expect } from '@playwright/test';
import * as path from 'path';

const SCREENSHOTS_DIR = '/Users/shandesh/src/VS-code/PatchIQ/full-dev-sandy-v2/screenshots';
const BASE_URL = 'http://localhost:3500';

test('Debug Login Page', async ({ page }) => {
  await page.goto(`${BASE_URL}/login`);
  await page.waitForTimeout(3000);

  // Take screenshot
  await page.screenshot({
    path: path.join(SCREENSHOTS_DIR, 'debug-login-page.png'),
    fullPage: true
  });

  // Log the page content
  const content = await page.content();
  console.log('Page title:', await page.title());
  console.log('Page URL:', page.url());

  // Check for email input
  const emailInputs = await page.locator('input').all();
  console.log('Found', emailInputs.length, 'input elements');

  for (let i = 0; i < emailInputs.length; i++) {
    const input = emailInputs[i];
    const type = await input.getAttribute('type');
    const name = await input.getAttribute('name');
    const placeholder = await input.getAttribute('placeholder');
    console.log(`Input ${i}: type=${type}, name=${name}, placeholder=${placeholder}`);
  }
});
