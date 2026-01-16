import { chromium } from 'playwright';

async function test() {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 }
  });

  try {
    await page.goto('http://localhost:3001/login', { waitUntil: 'load' });
    await page.waitForTimeout(2000);

    // Get all input elements
    const inputs = await page.locator('input').all();
    console.log('Number of inputs found:', inputs.length);

    for (let i = 0; i < inputs.length; i++) {
      const type = await inputs[i].getAttribute('type');
      const placeholder = await inputs[i].getAttribute('placeholder');
      const name = await inputs[i].getAttribute('name');
      console.log(`Input ${i}: type=${type}, placeholder=${placeholder}, name=${name}`);
    }

    // Get all button elements
    const buttons = await page.locator('button').all();
    console.log('\nNumber of buttons found:', buttons.length);
    
    for (let i = 0; i < buttons.length; i++) {
      const text = await buttons[i].textContent();
      console.log(`Button ${i}: ${text}`);
    }

    // Get page HTML
    const html = await page.content();
    console.log('\nPage HTML (first 2000 chars):');
    console.log(html.substring(0, 2000));

    await browser.close();
    process.exit(0);
  } catch (error) {
    console.error('Test failed:', error);
    await browser.close();
    process.exit(1);
  }
}

test();
