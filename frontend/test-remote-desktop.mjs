import { chromium } from 'playwright';

async function test() {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 }
  });

  try {
    // Listen for console messages
    page.on('console', msg => console.log('Console:', msg.text()));
    page.on('pageerror', err => console.log('Error:', err));

    // Navigate to login page
    console.log('Step 1: Navigating to login page...');
    await page.goto('http://localhost:3001/login', {
      waitUntil: 'load'
    });
    await page.waitForTimeout(1500);

    // Use the first input field (email)
    console.log('Step 2: Filling in login credentials...');
    const inputs = await page.locator('input').all();
    
    if (inputs.length >= 2) {
      await inputs[0].fill('test@example.com');
      await inputs[1].fill('password123');
      console.log('Credentials filled');
    } else {
      console.log('Could not find email and password inputs');
    }

    // Get the button and click it
    console.log('Step 3: Submitting login form...');
    const buttons = await page.locator('button').all();
    if (buttons.length > 0) {
      await buttons[0].click();
      console.log('Login button clicked');
    }

    // Wait for navigation
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    const postLoginUrl = page.url();
    console.log('URL after login:', postLoginUrl);

    // Check if we're still on login
    if (postLoginUrl.includes('/login')) {
      console.log('Still on login page - trying again');
      // Try to submit form with keyboard
      const emailInputs = await page.locator('input[placeholder="sharma@mail.com"]').all();
      if (emailInputs.length > 0) {
        await emailInputs[0].click();
        await page.keyboard.press('Control+A');
        await page.keyboard.type('test@example.com');
        await page.keyboard.press('Tab');
        await page.keyboard.type('password123');
        await page.keyboard.press('Enter');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);
        console.log('URL after keyboard submit:', page.url());
      }
    }

    // Navigate directly to Remote Desktop Settings
    console.log('Step 4: Navigating to Remote Desktop Settings...');
    await page.goto('http://localhost:3001/settings/system-settings/remote-desktop', {
      waitUntil: 'load'
    });

    await page.waitForTimeout(2000);

    const settingsUrl = page.url();
    console.log('Current URL on settings page:', settingsUrl);

    // Get page content
    const bodyText = await page.locator('body').textContent();

    // Check for h2 headers
    const h2s = await page.locator('h2').allTextContents();
    console.log('H2 headers found:', h2s);

    // Take screenshot
    const screenshotPath = '/Users/shandesh/src/VS code/PatchIQ/.playwright-mcp/remote-desktop-settings.png';
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log('Screenshot saved');

    // Check for specific elements
    const hasRemoteDesktop = bodyText.includes('Remote Desktop Settings');
    const hasConnectionType = bodyText.includes('Connection Type');
    const hasRemoteSessionIndicator = bodyText.includes('Remote Session Indicator');
    const hasUserConsent = bodyText.includes('User Consent');
    const hasSaveButton = bodyText.includes('Save');
    const hasResetButton = bodyText.includes('Reset');

    console.log('\n=== VERIFICATION RESULTS ===');
    console.log('Title "Remote Desktop Settings":', hasRemoteDesktop ? 'PASS' : 'FAIL');
    console.log('Connection Type selector:', hasConnectionType ? 'PASS' : 'FAIL');
    console.log('Remote Session Indicator toggle:', hasRemoteSessionIndicator ? 'PASS' : 'FAIL');
    console.log('User Consent toggle:', hasUserConsent ? 'PASS' : 'FAIL');
    console.log('Save button:', hasSaveButton ? 'PASS' : 'FAIL');
    console.log('Reset button:', hasResetButton ? 'PASS' : 'FAIL');
    console.log('\nScreenshot saved to: /Users/shandesh/src/VS code/PatchIQ/.playwright-mcp/remote-desktop-settings.png');

    await page.close();
    await browser.close();
    process.exit(0);
  } catch (error) {
    console.error('Test failed:', error);
    await page.close();
    await browser.close();
    process.exit(1);
  }
}

test();
