import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:5173';
const VIEWPORT = { width: 1440, height: 900 };

async function testAgentVersions() {
  let browser;
  try {
    browser = await chromium.launch({ headless: false });
    const context = await browser.createContext({
      viewport: VIEWPORT,
      recordVideo: { dir: './.playwright-mcp/' },
    });
    const page = await context.newPage();

    // Navigate to login
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[placeholder="Email"]', 'admin@infraon.com');
    await page.fill('input[placeholder="Password"]', 'password');
    await page.click('button:has-text("Login")');
    await page.waitForNavigation();

    // Navigate to Agent Versions
    await page.goto(`${BASE_URL}/settings/agent-management/versions`);
    await page.waitForLoadState('networkidle');

    // Take screenshot
    await page.screenshot({
      path: './.playwright-mcp/agent-versions.png',
      fullPage: false,
    });

    console.log('Screenshot saved to ./.playwright-mcp/agent-versions.png');

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

testAgentVersions();
