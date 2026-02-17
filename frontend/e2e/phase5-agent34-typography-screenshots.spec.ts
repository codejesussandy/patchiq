import { test, expect, Page } from '@playwright/test';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('Phase 5 Agent 34: Typography Screenshots', () => {
  test.setTimeout(120000);

  const screenshotDir = path.join(__dirname, '../typography-audit/screenshots');

  test.beforeAll(async () => {
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }
  });

  test('Capture dashboard typography', async ({ page }) => {
    await page.goto('http://localhost:5173/dashboard', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await page.screenshot({
      path: path.join(screenshotDir, '01-dashboard.png'),
      fullPage: true,
    });
  });

  test('Capture assets page typography', async ({ page }) => {
    await page.goto('http://localhost:5173/assets', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await page.screenshot({
      path: path.join(screenshotDir, '02-assets.png'),
      fullPage: true,
    });
  });

  test('Capture patches page typography', async ({ page }) => {
    await page.goto('http://localhost:5173/patches', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await page.screenshot({
      path: path.join(screenshotDir, '03-patches.png'),
      fullPage: true,
    });
  });

  test('Capture vulnerabilities page typography', async ({ page }) => {
    await page.goto('http://localhost:5173/vulnerability/vulnerabilities', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await page.screenshot({
      path: path.join(screenshotDir, '04-vulnerabilities.png'),
      fullPage: true,
    });
  });

  test('Capture settings page typography', async ({ page }) => {
    await page.goto('http://localhost:5173/settings/user-management/users', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await page.screenshot({
      path: path.join(screenshotDir, '05-settings-users.png'),
      fullPage: true,
    });
  });

  test('Capture discovery page typography', async ({ page }) => {
    await page.goto('http://localhost:5173/discovery/ip-discovery', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await page.screenshot({
      path: path.join(screenshotDir, '06-discovery.png'),
      fullPage: true,
    });
  });

  test('Capture reports page typography', async ({ page }) => {
    await page.goto('http://localhost:5173/reports', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await page.screenshot({
      path: path.join(screenshotDir, '07-reports.png'),
      fullPage: true,
    });
  });
});
