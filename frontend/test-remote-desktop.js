const { chromium } = require('playwright');

async function test() {
  const browser = await chromium.launch();
  const context = await browser.createContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  try {
    // Navigate to the Remote Desktop Settings page
    console.log('Navigating to Remote Desktop Settings page...');
    await page.goto('http://localhost:3001/settings/system-settings/remote-desktop', {
      waitUntil: 'networkidle'
    });

    // Wait for the page to load
    await page.waitForLoadState('networkidle');

    // Wait for title to appear
    await page.waitForSelector('h2', { timeout: 5000 });

    // Take screenshot
    const screenshotPath = '/Users/shandesh/src/VS code/PatchIQ/.playwright-mcp/remote-desktop-settings.png';
    await page.screenshot({ path: screenshotPath, fullPage: false });

    // Verify page elements
    const title = await page.locator('h2').textContent();
    console.log('Title:', title);

    // Check for Connection Type selector
    const segmented = await page.locator('[role="group"]').count();
    console.log('Segmented controls found:', segmented > 0 ? 'Yes' : 'No');

    // Check for switches
    const switches = await page.locator('[role="switch"]').count();
    console.log('Toggle switches found:', switches);

    // Check for buttons
    const buttons = await page.locator('button').count();
    console.log('Buttons found:', buttons);

    // Verify specific elements
    const hasTitle = title?.includes('Remote Desktop Settings');
    const hasConnectionType = await page.locator('text=Connection Type').count() > 0;
    const hasRemoteSessionIndicator = await page.locator('text=Remote Session Indicator').count() > 0;
    const hasUserConsent = await page.locator('text=User Consent').count() > 0;
    const hasSaveButton = await page.locator('button:has-text("Save")').count() > 0;
    const hasResetButton = await page.locator('button:has-text("Reset")').count() > 0;

    console.log('\n=== VERIFICATION RESULTS ===');
    console.log('Title "Remote Desktop Settings":', hasTitle ? 'PASS' : 'FAIL');
    console.log('Connection Type selector:', hasConnectionType ? 'PASS' : 'FAIL');
    console.log('Remote Session Indicator toggle:', hasRemoteSessionIndicator ? 'PASS' : 'FAIL');
    console.log('User Consent toggle:', hasUserConsent ? 'PASS' : 'FAIL');
    console.log('Save button:', hasSaveButton ? 'PASS' : 'FAIL');
    console.log('Reset button:', hasResetButton ? 'PASS' : 'FAIL');
    console.log('\nScreenshot saved to:', screenshotPath);

    await context.close();
    await browser.close();
    process.exit(0);
  } catch (error) {
    console.error('Test failed:', error);
    await context.close();
    await browser.close();
    process.exit(1);
  }
}

test();
