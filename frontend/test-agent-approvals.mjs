import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:3002';
const VIEWPORT = { width: 1440, height: 900 };

async function testAgentApprovals() {
  let browser;
  try {
    browser = await chromium.launch({ headless: false });
    const context = await browser.newContext({
      viewport: VIEWPORT,
      recordVideo: { dir: './.playwright-mcp/' },
    });
    const page = await context.newPage();

    // Navigate to login
    console.log('Step 1: Navigating to login...');
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('domcontentloaded');

    // Fill email
    console.log('Step 2: Filling email...');
    await page.fill('input[placeholder="Email"]', 'admin@infraon.com');

    // Fill password
    console.log('Step 3: Filling password...');
    await page.fill('input[placeholder="Password"]', 'password');

    // Click login button
    console.log('Step 4: Clicking login button...');
    await page.click('button:has-text("Login")');

    // Wait for navigation
    console.log('Step 5: Waiting for authentication...');
    await page.waitForNavigation();

    // Navigate to Agent Approvals
    console.log('Step 6: Navigating to Agent Approvals...');
    await page.goto(`${BASE_URL}/settings/agent-management/approvals`);
    await page.waitForTimeout(2000);

    // Take screenshot
    console.log('Step 7: Taking screenshot...');
    await page.screenshot({
      path: './.playwright-mcp/agent-approvals.png',
      fullPage: false,
    });

    console.log('Screenshot saved to ./.playwright-mcp/agent-approvals.png');

    // Wait before closing
    await page.waitForTimeout(2000);
    await context.close();
    await browser.close();
  } catch (error) {
    console.error('Test failed:', error);
    if (browser) await browser.close();
    process.exit(1);
  }
}

testAgentApprovals();
