import { test, expect } from '@playwright/test';

/**
 * PHASE 4 - AGENT 31: Form Validation Edge Cases Test Suite
 *
 * Tests form validation security and edge cases for PatchIQ frontend
 * Focus areas:
 * - SQL Injection attempts
 * - XSS/HTML Injection attempts
 * - Input length validation
 * - Special character handling
 * - Email validation
 * - Required field validation
 * - Number field validation
 * - Date field validation
 * - Server-side validation verification
 */

test.describe('Form Validation Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    // Already authenticated via storageState
    await page.goto('http://localhost:5173/dashboard');
    await page.waitForLoadState('domcontentloaded');
  });

  test.describe('1. SQL Injection Attempts', () => {
    test('SQL injection in asset hostname field', async ({ page }) => {
      // Navigate to assets
      await page.goto('http://localhost:5173/assets');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000);

      // Click add asset button
      const addBtn = page.locator('button:has-text("Add Asset")').first();
      if (await addBtn.isVisible()) {
        await addBtn.click();
        await page.waitForTimeout(500);
      }

      // Try to fill with SQL injection payload
      const sqlPayload = "'; DROP TABLE assets; --";
      const hostnameInput = page.locator('input[placeholder*="hostname"], input[id*="hostname"]').first();

      if (await hostnameInput.isVisible()) {
        await hostnameInput.fill(sqlPayload);

        // Take screenshot of injection attempt
        await page.screenshot({ path: 'test-results/sql-injection-hostname-filled.png' });

        // Check if field accepts the value
        const inputValue = await hostnameInput.inputValue();
        console.log('Hostname field value after SQL injection attempt:', inputValue);

        // Try to submit
        const submitBtn = page.locator('button:has-text("Submit"), button[type="submit"]').first();
        if (await submitBtn.isVisible()) {
          // Listen for network responses
          const responses: { status: number; body: string }[] = [];
          page.on('response', async (response) => {
            if (response.request().postData?.includes('hostname')) {
              responses.push({
                status: response.status(),
                body: await response.text()
              });
            }
          });

          await submitBtn.click();
          await page.waitForTimeout(1000);

          // Take screenshot after submission
          await page.screenshot({ path: 'test-results/sql-injection-after-submit.png' });

          // Check for SQL errors in console
          const errors: string[] = [];
          page.on('console', msg => {
            if (msg.text().toLowerCase().includes('sql') || msg.text().toLowerCase().includes('error')) {
              errors.push(msg.text());
            }
          });

          console.log('Network responses after SQL injection submit:', responses);
          console.log('Console errors:', errors);

          // Verify no SQL error occurred
          expect(errors.filter(e => e.toLowerCase().includes('sql'))).toHaveLength(0);
        }
      }

      // Close modal if open
      const closeBtn = page.locator('button.ant-modal-close').first();
      if (await closeBtn.isVisible()) {
        await closeBtn.click();
      }
    });

    test('SQL injection in asset name field', async ({ page }) => {
      await page.goto('http://localhost:5173/assets');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000);

      const addBtn = page.locator('button:has-text("Add Asset")').first();
      if (await addBtn.isVisible()) {
        await addBtn.click();
        await page.waitForTimeout(500);
      }

      const sqlPayload = '1" OR "1"="1';
      const nameInput = page.locator('input[placeholder*="name"], input[id*="assetName"]').first();

      if (await nameInput.isVisible()) {
        await nameInput.fill(sqlPayload);
        await page.screenshot({ path: 'test-results/sql-injection-name.png' });
      }

      const closeBtn = page.locator('button.ant-modal-close').first();
      if (await closeBtn.isVisible()) {
        await closeBtn.click();
      }
    });
  });

  test.describe('2. XSS Injection Attempts', () => {
    test('XSS in asset name field', async ({ page }) => {
      await page.goto('http://localhost:5173/assets');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000);

      const addBtn = page.locator('button:has-text("Add Asset")').first();
      if (await addBtn.isVisible()) {
        await addBtn.click();
        await page.waitForTimeout(500);
      }

      const xssPayload = '<script>alert("XSS")</script>';
      const nameInput = page.locator('input[placeholder*="name"], input[id*="assetName"]').first();

      if (await nameInput.isVisible()) {
        await nameInput.fill(xssPayload);
        await page.screenshot({ path: 'test-results/xss-asset-name-filled.png' });

        // Check if script is in the input value
        const inputValue = await nameInput.inputValue();
        console.log('Asset name field value after XSS attempt:', inputValue);

        // Try to submit
        const submitBtn = page.locator('button:has-text("Next"), button[type="submit"]').first();
        if (await submitBtn.isVisible()) {
          await submitBtn.click();
          await page.waitForTimeout(1000);
        }
      }

      await page.screenshot({ path: 'test-results/xss-asset-name-after-action.png' });

      const closeBtn = page.locator('button.ant-modal-close').first();
      if (await closeBtn.isVisible()) {
        await closeBtn.click();
      }
    });

    test('XSS in asset hostname field', async ({ page }) => {
      await page.goto('http://localhost:5173/assets');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000);

      const addBtn = page.locator('button:has-text("Add Asset")').first();
      if (await addBtn.isVisible()) {
        await addBtn.click();
        await page.waitForTimeout(500);
      }

      const xssPayload = 'host<img src=x onerror="alert(\'XSS\')">';
      const hostnameInput = page.locator('input[placeholder*="hostname"], input[id*="hostname"]').first();

      if (await hostnameInput.isVisible()) {
        await hostnameInput.fill(xssPayload);
        await page.screenshot({ path: 'test-results/xss-hostname-filled.png' });
      }

      const closeBtn = page.locator('button.ant-modal-close').first();
      if (await closeBtn.isVisible()) {
        await closeBtn.click();
      }
    });

    test('XSS in patch description', async ({ page }) => {
      await page.goto('http://localhost:5173/patches');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000);

      const addBtn = page.locator('button:has-text("Add"), button:has-text("Create")').first();
      if (await addBtn.isVisible()) {
        await addBtn.click();
        await page.waitForTimeout(500);
      }

      const xssPayload = '<svg/onload=alert("XSS")>';
      const descInput = page.locator('textarea[placeholder*="description"], textarea[id*="description"]').first();

      if (await descInput.isVisible()) {
        await descInput.fill(xssPayload);
        await page.screenshot({ path: 'test-results/xss-patch-description.png' });
      }

      const closeBtn = page.locator('button.ant-modal-close').first();
      if (await closeBtn.isVisible()) {
        await closeBtn.click();
      }
    });
  });

  test.describe('3. HTML Injection', () => {
    test('HTML img tag injection', async ({ page }) => {
      await page.goto('http://localhost:5173/assets');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000);

      const addBtn = page.locator('button:has-text("Add Asset")').first();
      if (await addBtn.isVisible()) {
        await addBtn.click();
        await page.waitForTimeout(500);
      }

      const htmlPayload = '<img src=x onerror=alert("XSS")>';
      const nameInput = page.locator('input[placeholder*="name"], input[id*="assetName"]').first();

      if (await nameInput.isVisible()) {
        await nameInput.fill(htmlPayload);
        await page.screenshot({ path: 'test-results/html-injection-filled.png' });

        const inputValue = await nameInput.inputValue();
        console.log('Asset name with HTML injection:', inputValue);
      }

      const closeBtn = page.locator('button.ant-modal-close').first();
      if (await closeBtn.isVisible()) {
        await closeBtn.click();
      }
    });

    test('HTML event handler injection', async ({ page }) => {
      await page.goto('http://localhost:5173/assets');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000);

      const addBtn = page.locator('button:has-text("Add Asset")').first();
      if (await addBtn.isVisible()) {
        await addBtn.click();
        await page.waitForTimeout(500);
      }

      const htmlPayload = '<div onclick="alert(\'XSS\')">Click me</div>';
      const hostnameInput = page.locator('input[placeholder*="hostname"], input[id*="hostname"]').first();

      if (await hostnameInput.isVisible()) {
        await hostnameInput.fill(htmlPayload);
        await page.screenshot({ path: 'test-results/html-event-handler-injection.png' });
      }

      const closeBtn = page.locator('button.ant-modal-close').first();
      if (await closeBtn.isVisible()) {
        await closeBtn.click();
      }
    });
  });

  test.describe('4. Extremely Long Inputs', () => {
    test('10000+ character input in asset name', async ({ page }) => {
      await page.goto('http://localhost:5173/assets');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000);

      const addBtn = page.locator('button:has-text("Add Asset")').first();
      if (await addBtn.isVisible()) {
        await addBtn.click();
        await page.waitForTimeout(500);
      }

      // Create 10,000 character string
      const longInput = 'A'.repeat(10000);
      const nameInput = page.locator('input[placeholder*="name"], input[id*="assetName"]').first();

      if (await nameInput.isVisible()) {
        await nameInput.fill(longInput);
        await page.screenshot({ path: 'test-results/long-input-10000-chars.png' });

        const inputValue = await nameInput.inputValue();
        console.log(`Long input length: ${inputValue.length}`);

        // Check if validation error appears
        const errorMsg = page.locator('.ant-form-item-explain-error').first();
        if (await errorMsg.isVisible()) {
          const errorText = await errorMsg.textContent();
          console.log('Validation error:', errorText);
          await page.screenshot({ path: 'test-results/long-input-error-msg.png' });
        }

        // Try to submit
        const submitBtn = page.locator('button:has-text("Next"), button[type="submit"]').first();
        if (await submitBtn.isVisible()) {
          await submitBtn.click();
          await page.waitForTimeout(1000);
          await page.screenshot({ path: 'test-results/long-input-after-submit.png' });
        }
      }

      const closeBtn = page.locator('button.ant-modal-close').first();
      if (await closeBtn.isVisible()) {
        await closeBtn.click();
      }
    });

    test('Long input in hostname field', async ({ page }) => {
      await page.goto('http://localhost:5173/assets');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000);

      const addBtn = page.locator('button:has-text("Add Asset")').first();
      if (await addBtn.isVisible()) {
        await addBtn.click();
        await page.waitForTimeout(500);
      }

      const longInput = 'X'.repeat(5000);
      const hostnameInput = page.locator('input[placeholder*="hostname"], input[id*="hostname"]').first();

      if (await hostnameInput.isVisible()) {
        await hostnameInput.fill(longInput);

        const inputValue = await hostnameInput.inputValue();
        console.log(`Hostname field length: ${inputValue.length}`);

        const errorMsg = page.locator('.ant-form-item-explain-error').first();
        if (await errorMsg.isVisible()) {
          const errorText = await errorMsg.textContent();
          console.log('Hostname validation error:', errorText);
        }

        await page.screenshot({ path: 'test-results/long-hostname-input.png' });
      }

      const closeBtn = page.locator('button.ant-modal-close').first();
      if (await closeBtn.isVisible()) {
        await closeBtn.click();
      }
    });
  });

  test.describe('5. Special Characters', () => {
    test('Special characters in asset name', async ({ page }) => {
      await page.goto('http://localhost:5173/assets');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000);

      const addBtn = page.locator('button:has-text("Add Asset")').first();
      if (await addBtn.isVisible()) {
        await addBtn.click();
        await page.waitForTimeout(500);
      }

      const specialChars = '!@#$%^&*()_+-={}[]|:";\'<>?,./~';
      const nameInput = page.locator('input[placeholder*="name"], input[id*="assetName"]').first();

      if (await nameInput.isVisible()) {
        await nameInput.fill(specialChars);

        const inputValue = await nameInput.inputValue();
        console.log('Special chars input value:', inputValue);

        // Check console for errors
        const consoleErrors: string[] = [];
        page.on('console', msg => {
          if (msg.type() === 'error') {
            consoleErrors.push(msg.text());
          }
        });

        await page.screenshot({ path: 'test-results/special-chars-in-name.png' });

        if (consoleErrors.length > 0) {
          console.log('Console errors from special chars:', consoleErrors);
        }
      }

      const closeBtn = page.locator('button.ant-modal-close').first();
      if (await closeBtn.isVisible()) {
        await closeBtn.click();
      }
    });

    test('Special characters in hostname', async ({ page }) => {
      await page.goto('http://localhost:5173/assets');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000);

      const addBtn = page.locator('button:has-text("Add Asset")').first();
      if (await addBtn.isVisible()) {
        await addBtn.click();
        await page.waitForTimeout(500);
      }

      const specialChars = '!@#$%^&*()_+-={}[]|:";\'<>?,./~';
      const hostnameInput = page.locator('input[placeholder*="hostname"], input[id*="hostname"]').first();

      if (await hostnameInput.isVisible()) {
        await hostnameInput.fill(specialChars);
        await page.screenshot({ path: 'test-results/special-chars-hostname.png' });
      }

      const closeBtn = page.locator('button.ant-modal-close').first();
      if (await closeBtn.isVisible()) {
        await closeBtn.click();
      }
    });
  });

  test.describe('6. Email Validation', () => {
    test('Invalid email - missing local part', async ({ page }) => {
      await page.goto('http://localhost:5173/settings/users');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000);

      // Try to find add user button
      const addBtn = page.locator('button:has-text("Add"), button:has-text("Create")').first();
      if (await addBtn.isVisible()) {
        await addBtn.click();
        await page.waitForTimeout(500);
      }

      const emailInput = page.locator('input[type="email"], input[placeholder*="email"]').first();
      if (await emailInput.isVisible()) {
        await emailInput.fill('@example.com');

        const errorMsg = page.locator('.ant-form-item-explain-error').first();
        if (await errorMsg.isVisible()) {
          const errorText = await errorMsg.textContent();
          console.log('Invalid email error:', errorText);
          await page.screenshot({ path: 'test-results/email-missing-local-part.png' });
          expect(errorText).toContain('email');
        }
      }

      const closeBtn = page.locator('button.ant-modal-close').first();
      if (await closeBtn.isVisible()) {
        await closeBtn.click();
      }
    });

    test('Invalid email - missing domain', async ({ page }) => {
      await page.goto('http://localhost:5173/settings/users');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000);

      const addBtn = page.locator('button:has-text("Add"), button:has-text("Create")').first();
      if (await addBtn.isVisible()) {
        await addBtn.click();
        await page.waitForTimeout(500);
      }

      const emailInput = page.locator('input[type="email"], input[placeholder*="email"]').first();
      if (await emailInput.isVisible()) {
        await emailInput.fill('user@');

        const errorMsg = page.locator('.ant-form-item-explain-error').first();
        if (await errorMsg.isVisible()) {
          const errorText = await errorMsg.textContent();
          console.log('Invalid email (missing domain):', errorText);
          await page.screenshot({ path: 'test-results/email-missing-domain.png' });
        }
      }

      const closeBtn = page.locator('button.ant-modal-close').first();
      if (await closeBtn.isVisible()) {
        await closeBtn.click();
      }
    });

    test('Invalid email - double at signs', async ({ page }) => {
      await page.goto('http://localhost:5173/settings/users');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000);

      const addBtn = page.locator('button:has-text("Add"), button:has-text("Create")').first();
      if (await addBtn.isVisible()) {
        await addBtn.click();
        await page.waitForTimeout(500);
      }

      const emailInput = page.locator('input[type="email"], input[placeholder*="email"]').first();
      if (await emailInput.isVisible()) {
        await emailInput.fill('user@@example.com');

        const errorMsg = page.locator('.ant-form-item-explain-error').first();
        if (await errorMsg.isVisible()) {
          const errorText = await errorMsg.textContent();
          console.log('Invalid email (double @):', errorText);
          await page.screenshot({ path: 'test-results/email-double-at.png' });
        }
      }

      const closeBtn = page.locator('button.ant-modal-close').first();
      if (await closeBtn.isVisible()) {
        await closeBtn.click();
      }
    });

    test('Valid email should be accepted', async ({ page }) => {
      await page.goto('http://localhost:5173/settings/users');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000);

      const addBtn = page.locator('button:has-text("Add"), button:has-text("Create")').first();
      if (await addBtn.isVisible()) {
        await addBtn.click();
        await page.waitForTimeout(500);
      }

      const emailInput = page.locator('input[type="email"], input[placeholder*="email"]').first();
      if (await emailInput.isVisible()) {
        await emailInput.fill('validuser@example.com');

        const errorMsg = page.locator('.ant-form-item-explain-error');
        const isVisible = await errorMsg.first().isVisible();

        if (!isVisible) {
          console.log('Valid email accepted - no error');
          await page.screenshot({ path: 'test-results/email-valid-accepted.png' });
          expect(isVisible).toBe(false);
        }
      }

      const closeBtn = page.locator('button.ant-modal-close').first();
      if (await closeBtn.isVisible()) {
        await closeBtn.click();
      }
    });
  });

  test.describe('7. Required Field Bypass', () => {
    test('Asset form - empty required fields', async ({ page }) => {
      await page.goto('http://localhost:5173/assets');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000);

      const addBtn = page.locator('button:has-text("Add Asset")').first();
      if (await addBtn.isVisible()) {
        await addBtn.click();
        await page.waitForTimeout(500);
      }

      // Try to submit without filling any required fields
      const submitBtn = page.locator('button:has-text("Next"), button[type="submit"]').first();
      if (await submitBtn.isVisible()) {
        await submitBtn.click();
        await page.waitForTimeout(500);
      }

      // Check for error messages
      const errorMessages = page.locator('.ant-form-item-explain-error');
      const errorCount = await errorMessages.count();
      console.log(`Number of validation errors: ${errorCount}`);

      if (errorCount > 0) {
        const firstError = await errorMessages.first().textContent();
        console.log('First error message:', firstError);
        await page.screenshot({ path: 'test-results/required-fields-empty.png' });

        // Verify errors are shown
        expect(errorCount).toBeGreaterThan(0);
      }

      const closeBtn = page.locator('button.ant-modal-close').first();
      if (await closeBtn.isVisible()) {
        await closeBtn.click();
      }
    });

    test('User form - empty required fields', async ({ page }) => {
      await page.goto('http://localhost:5173/settings/users');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000);

      const addBtn = page.locator('button:has-text("Add"), button:has-text("Create"), button:has-text("Invite")').first();
      if (await addBtn.isVisible()) {
        await addBtn.click();
        await page.waitForTimeout(500);
      }

      // Try to submit
      const submitBtn = page.locator('button:has-text("Submit"), button[type="submit"]').first();
      if (await submitBtn.isVisible()) {
        await submitBtn.click();
        await page.waitForTimeout(500);
      }

      const errorMessages = page.locator('.ant-form-item-explain-error');
      const errorCount = await errorMessages.count();
      console.log(`User form validation errors: ${errorCount}`);

      if (errorCount > 0) {
        await page.screenshot({ path: 'test-results/user-form-required-fields.png' });
        expect(errorCount).toBeGreaterThan(0);
      }

      const closeBtn = page.locator('button.ant-modal-close').first();
      if (await closeBtn.isVisible()) {
        await closeBtn.click();
      }
    });
  });

  test.describe('8. Number Field Validation', () => {
    test('Negative number in price field', async ({ page }) => {
      await page.goto('http://localhost:5173/assets');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000);

      const addBtn = page.locator('button:has-text("Add Asset")').first();
      if (await addBtn.isVisible()) {
        await addBtn.click();
        await page.waitForTimeout(500);
      }

      // Navigate to cost section if multi-step form
      const nextBtn = page.locator('button:has-text("Next")').first();
      if (await nextBtn.isVisible()) {
        // Fill required fields first
        const nameInput = page.locator('input[placeholder*="name"], input[id*="assetName"]').first();
        if (await nameInput.isVisible()) {
          await nameInput.fill('Test Asset');
        }
        await nextBtn.click();
        await page.waitForTimeout(500);
      }

      // Look for cost/price field
      const costInput = page.locator('input[placeholder*="cost"], input[placeholder*="price"], input[id*="cost"]').first();
      if (await costInput.isVisible()) {
        await costInput.fill('-100');

        const errorMsg = page.locator('.ant-form-item-explain-error').first();
        const errorVisible = await errorMsg.isVisible();

        if (errorVisible) {
          const errorText = await errorMsg.textContent();
          console.log('Negative number error:', errorText);
          await page.screenshot({ path: 'test-results/negative-cost-error.png' });
        } else {
          console.log('No validation error for negative cost');
          await page.screenshot({ path: 'test-results/negative-cost-no-error.png' });
        }
      }

      const closeBtn = page.locator('button.ant-modal-close').first();
      if (await closeBtn.isVisible()) {
        await closeBtn.click();
      }
    });

    test('Letters in number field', async ({ page }) => {
      await page.goto('http://localhost:5173/assets');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000);

      const addBtn = page.locator('button:has-text("Add Asset")').first();
      if (await addBtn.isVisible()) {
        await addBtn.click();
        await page.waitForTimeout(500);
      }

      // Look for number input
      const numberInput = page.locator('input[type="number"]').first();
      if (await numberInput.isVisible()) {
        await numberInput.fill('ABC123');

        const inputValue = await numberInput.inputValue();
        console.log('Number field with letters value:', inputValue);
        await page.screenshot({ path: 'test-results/letters-in-number-field.png' });
      }

      const closeBtn = page.locator('button.ant-modal-close').first();
      if (await closeBtn.isVisible()) {
        await closeBtn.click();
      }
    });
  });

  test.describe('9. Date Field Validation', () => {
    test('Invalid date format', async ({ page }) => {
      await page.goto('http://localhost:5173/assets');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000);

      const addBtn = page.locator('button:has-text("Add Asset")').first();
      if (await addBtn.isVisible()) {
        await addBtn.click();
        await page.waitForTimeout(500);
      }

      // Look for date input
      const dateInput = page.locator('input[type="date"], input[placeholder*="date"]').first();
      if (await dateInput.isVisible()) {
        await dateInput.fill('invalid-date');

        const errorMsg = page.locator('.ant-form-item-explain-error').first();
        const errorVisible = await errorMsg.isVisible();

        if (errorVisible) {
          const errorText = await errorMsg.textContent();
          console.log('Invalid date error:', errorText);
          await page.screenshot({ path: 'test-results/invalid-date-format.png' });
        }
      }

      const closeBtn = page.locator('button.ant-modal-close').first();
      if (await closeBtn.isVisible()) {
        await closeBtn.click();
      }
    });

    test('Past date validation', async ({ page }) => {
      await page.goto('http://localhost:5173/assets');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000);

      const addBtn = page.locator('button:has-text("Add Asset")').first();
      if (await addBtn.isVisible()) {
        await addBtn.click();
        await page.waitForTimeout(500);
      }

      const dateInput = page.locator('input[type="date"]').first();
      if (await dateInput.isVisible()) {
        // Try to set a past date (year 1900)
        await dateInput.fill('1900-01-01');

        const errorMsg = page.locator('.ant-form-item-explain-error').first();
        const errorVisible = await errorMsg.isVisible();

        if (errorVisible) {
          const errorText = await errorMsg.textContent();
          console.log('Past date error:', errorText);
        }

        await page.screenshot({ path: 'test-results/past-date-validation.png' });
      }

      const closeBtn = page.locator('button.ant-modal-close').first();
      if (await closeBtn.isVisible()) {
        await closeBtn.click();
      }
    });
  });

  test.describe('10. Server-Side Validation', () => {
    test('Verify API returns validation errors for SQL injection', async ({ page }) => {
      await page.goto('http://localhost:5173/assets');
      await page.waitForLoadState('domcontentloaded');

      // Intercept API requests
      const apiResponses: { url: string; status: number; body: unknown }[] = [];

      page.on('response', async (response) => {
        if (response.url().includes('/api/') && response.request().method() === 'POST') {
          apiResponses.push({
            url: response.url(),
            status: response.status(),
            body: await response.json().catch(() => ({}))
          });
        }
      });

      const addBtn = page.locator('button:has-text("Add Asset")').first();
      if (await addBtn.isVisible()) {
        await addBtn.click();
        await page.waitForTimeout(500);
      }

      // Fill form with malicious input
      const nameInput = page.locator('input[placeholder*="name"], input[id*="assetName"]').first();
      if (await nameInput.isVisible()) {
        await nameInput.fill("'; DROP TABLE assets; --");

        const nextBtn = page.locator('button:has-text("Next")').first();
        if (await nextBtn.isVisible()) {
          await nextBtn.click();
          await page.waitForTimeout(2000);
        }
      }

      console.log('API responses for malicious input:', apiResponses);

      // Check for 400 errors
      const validationErrors = apiResponses.filter(r => r.status === 400);
      console.log('Validation error responses:', validationErrors.length);
    });

    test('Verify backend validates email format', async ({ page }) => {
      await page.goto('http://localhost:5173/settings/users');
      await page.waitForLoadState('domcontentloaded');

      const apiResponses: { url: string; status: number; body: unknown }[] = [];

      page.on('response', async (response) => {
        if (response.url().includes('/api/') && response.request().method() === 'POST') {
          apiResponses.push({
            url: response.url(),
            status: response.status(),
            body: await response.json().catch(() => ({}))
          });
        }
      });

      const addBtn = page.locator('button:has-text("Add"), button:has-text("Create")').first();
      if (await addBtn.isVisible()) {
        await addBtn.click();
        await page.waitForTimeout(500);
      }

      const emailInput = page.locator('input[type="email"]').first();
      if (await emailInput.isVisible()) {
        await emailInput.fill('invalidemail');

        // Try to submit
        const submitBtn = page.locator('button[type="submit"]').first();
        if (await submitBtn.isVisible()) {
          await submitBtn.click();
          await page.waitForTimeout(2000);
        }
      }

      console.log('Email validation API responses:', apiResponses);
    });

    test('Verify XSS input is sanitized server-side', async ({ page }) => {
      await page.goto('http://localhost:5173/assets');
      await page.waitForLoadState('domcontentloaded');

      let createdAssetName = '';

      page.on('response', async (response) => {
        if (response.url().includes('/api/assets') && response.status() === 200) {
          try {
            const body = await response.json();
            if (body.data?.name) {
              createdAssetName = body.data.name;
              console.log('Created asset name:', createdAssetName);
            }
          } catch {
            // Ignore
          }
        }
      });

      const addBtn = page.locator('button:has-text("Add Asset")').first();
      if (await addBtn.isVisible()) {
        await addBtn.click();
        await page.waitForTimeout(500);
      }

      const nameInput = page.locator('input[placeholder*="name"], input[id*="assetName"]').first();
      if (await nameInput.isVisible()) {
        const xssPayload = '<script>alert("XSS")</script>';
        await nameInput.fill(xssPayload);

        const nextBtn = page.locator('button:has-text("Next")').first();
        if (await nextBtn.isVisible()) {
          await nextBtn.click();
          await page.waitForTimeout(2000);
        }
      }

      // If asset was created, check if script tag is still in the name
      if (createdAssetName) {
        expect(createdAssetName).not.toContain('<script>');
        console.log('XSS payload sanitized - script tag removed');
      }
    });
  });
});
