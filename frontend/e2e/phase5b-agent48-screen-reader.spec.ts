/**
 * Phase 5B - Agent 48: Screen Reader Accessibility Testing
 *
 * This test suite evaluates screen reader accessibility across critical user flows.
 * It tests semantic HTML, ARIA attributes, form labels, and keyboard navigation.
 */

import { test, expect } from '@playwright/test';

const TEST_CREDENTIALS = {
  admin: { email: 'admin@patchiq.io', password: 'admin123' },
};

interface AriaIssue {
  element: string;
  issue: string;
  location: string;
}

interface AccessibilityReport {
  flow: string;
  contentAnnounced: boolean;
  labelsPresent: boolean;
  navigationOK: boolean;
  issues: AriaIssue[];
  semanticHTML: {
    headingsCorrect: boolean;
    listsUsed: boolean;
    buttonsUsed: boolean;
    linksUsed: boolean;
    formsCorrect: boolean;
  };
  ariaUsage: {
    liveRegions: boolean;
    ariaLabels: boolean;
    ariaRoles: boolean;
  };
}

const reports: AccessibilityReport[] = [];

test.describe('Phase 5B - Screen Reader Accessibility Testing', () => {

  test.beforeEach(async ({ page }) => {
    // Enable detailed logging
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`Console error: ${msg.text()}`);
      }
    });
  });

  test('Flow 1: Login Page Accessibility', async ({ page }) => {
    const report: AccessibilityReport = {
      flow: 'Login',
      contentAnnounced: true,
      labelsPresent: true,
      navigationOK: true,
      issues: [],
      semanticHTML: {
        headingsCorrect: false,
        listsUsed: false,
        buttonsUsed: false,
        linksUsed: false,
        formsCorrect: false,
      },
      ariaUsage: {
        liveRegions: false,
        ariaLabels: false,
        ariaRoles: false,
      },
    };

    await page.goto('http://localhost:5173/login');
    await page.waitForLoadState('networkidle');

    // Check page title
    const pageTitle = await page.title();
    console.log(`Page title: ${pageTitle}`);
    if (!pageTitle || pageTitle === 'frontend') {
      report.issues.push({
        element: 'document',
        issue: 'Generic page title - should be descriptive like "Login - PatchIQ"',
        location: '/login',
      });
      report.contentAnnounced = false;
    }

    // Check for main heading
    const h1 = await page.locator('h1, h2').first();
    if (await h1.count() > 0) {
      const h1Text = await h1.textContent();
      console.log(`Main heading: ${h1Text}`);
      report.semanticHTML.headingsCorrect = true;
    } else {
      report.issues.push({
        element: 'heading',
        issue: 'No main heading (h1/h2) found on login page',
        location: '/login',
      });
      report.semanticHTML.headingsCorrect = false;
    }

    // Check form element
    const form = await page.locator('form');
    if (await form.count() > 0) {
      report.semanticHTML.formsCorrect = true;
      console.log('Form element found');
    } else {
      report.issues.push({
        element: 'form',
        issue: 'No <form> element found',
        location: '/login',
      });
      report.semanticHTML.formsCorrect = false;
    }

    // Check email input
    const emailInput = await page.locator('input[type="email"], input[name="email"]');
    if (await emailInput.count() > 0) {
      const emailId = await emailInput.getAttribute('id');
      const emailLabel = await page.locator(`label[for="${emailId}"]`);

      if (await emailLabel.count() === 0) {
        // Check for ARIA label
        const ariaLabel = await emailInput.getAttribute('aria-label');
        const ariaLabelledBy = await emailInput.getAttribute('aria-labelledby');

        if (!ariaLabel && !ariaLabelledBy) {
          report.issues.push({
            element: 'email input',
            issue: 'Email input has no associated label or aria-label',
            location: '/login form',
          });
          report.labelsPresent = false;
        }
      } else {
        console.log('Email input has proper label association');
      }

      // Check for required indicator
      const required = await emailInput.getAttribute('required');
      const ariaRequired = await emailInput.getAttribute('aria-required');
      if (!required && !ariaRequired) {
        report.issues.push({
          element: 'email input',
          issue: 'Required field not marked with required or aria-required',
          location: '/login form',
        });
      }
    }

    // Check password input
    const passwordInput = await page.locator('input[type="password"], input[name="password"]');
    if (await passwordInput.count() > 0) {
      const passwordId = await passwordInput.getAttribute('id');
      const passwordLabel = await page.locator(`label[for="${passwordId}"]`);

      if (await passwordLabel.count() === 0) {
        const ariaLabel = await passwordInput.getAttribute('aria-label');
        const ariaLabelledBy = await passwordInput.getAttribute('aria-labelledby');

        if (!ariaLabel && !ariaLabelledBy) {
          report.issues.push({
            element: 'password input',
            issue: 'Password input has no associated label or aria-label',
            location: '/login form',
          });
          report.labelsPresent = false;
        }
      }
    }

    // Check submit button
    const submitButton = await page.locator('button[type="submit"]');
    if (await submitButton.count() > 0) {
      report.semanticHTML.buttonsUsed = true;
      const buttonText = await submitButton.textContent();
      const ariaLabel = await submitButton.getAttribute('aria-label');

      if (!buttonText?.trim() && !ariaLabel) {
        report.issues.push({
          element: 'submit button',
          issue: 'Submit button has no accessible name (text or aria-label)',
          location: '/login form',
        });
      } else {
        console.log(`Submit button text: ${buttonText || ariaLabel}`);
      }
    } else {
      report.issues.push({
        element: 'submit button',
        issue: 'No submit button with type="submit" found',
        location: '/login form',
      });
      report.semanticHTML.buttonsUsed = false;
    }

    // Check for links (Forgot Password)
    const links = await page.locator('a');
    if (await links.count() > 0) {
      report.semanticHTML.linksUsed = true;

      // Check each link for accessible name
      const linkCount = await links.count();
      for (let i = 0; i < linkCount; i++) {
        const link = links.nth(i);
        const linkText = await link.textContent();
        const ariaLabel = await link.getAttribute('aria-label');

        if (!linkText?.trim() && !ariaLabel) {
          report.issues.push({
            element: 'link',
            issue: 'Link without accessible text or aria-label',
            location: '/login',
          });
        }
      }
    }

    // Test login with error message announcement
    await page.fill('input[type="email"], input[name="email"]', 'test@invalid.com');
    await page.fill('input[type="password"], input[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    await page.waitForTimeout(2000);

    // Check for error message with ARIA live region
    const errorMessage = await page.locator('.ant-message, [role="alert"], [aria-live]');
    if (await errorMessage.count() > 0) {
      const ariaLive = await errorMessage.first().getAttribute('aria-live');
      const role = await errorMessage.first().getAttribute('role');

      if (ariaLive || role === 'alert') {
        report.ariaUsage.liveRegions = true;
        console.log('Error message has proper ARIA live region');
      } else {
        report.issues.push({
          element: 'error message',
          issue: 'Error message not announced via aria-live or role="alert"',
          location: '/login',
        });
      }
    }

    reports.push(report);
    console.log('Login Flow Report:', JSON.stringify(report, null, 2));
  });

  test('Flow 2: Dashboard Accessibility', async ({ page }) => {
    const report: AccessibilityReport = {
      flow: 'Dashboard',
      contentAnnounced: true,
      labelsPresent: true,
      navigationOK: true,
      issues: [],
      semanticHTML: {
        headingsCorrect: false,
        listsUsed: false,
        buttonsUsed: false,
        linksUsed: false,
        formsCorrect: false,
      },
      ariaUsage: {
        liveRegions: false,
        ariaLabels: false,
        ariaRoles: false,
      },
    };

    // Login first
    await page.goto('http://localhost:5173/login');
    await page.fill('input[type="email"], input[name="email"]', TEST_CREDENTIALS.admin.email);
    await page.fill('input[type="password"], input[name="password"]', TEST_CREDENTIALS.admin.password);
    await page.click('button[type="submit"]');

    await page.waitForURL('**/dashboard', { timeout: 10000 });
    await page.waitForLoadState('networkidle');

    // Check for main landmark
    const main = await page.locator('main, [role="main"]');
    if (await main.count() > 0) {
      console.log('Main landmark found');
      report.navigationOK = true;
    } else {
      report.issues.push({
        element: 'main',
        issue: 'No <main> or role="main" landmark found',
        location: '/dashboard',
      });
      report.navigationOK = false;
    }

    // Check for navigation landmark
    const nav = await page.locator('nav, [role="navigation"]');
    if (await nav.count() > 0) {
      console.log('Navigation landmark found');
    } else {
      report.issues.push({
        element: 'nav',
        issue: 'No <nav> or role="navigation" landmark found',
        location: '/dashboard',
      });
    }

    // Check page heading
    const heading = await page.locator('h1, h2, h3').first();
    if (await heading.count() > 0) {
      const headingText = await heading.textContent();
      console.log(`Dashboard heading: ${headingText}`);
      report.semanticHTML.headingsCorrect = true;

      if (headingText?.includes('Dashboard') || headingText?.includes('Executive')) {
        report.contentAnnounced = true;
      }
    } else {
      report.issues.push({
        element: 'heading',
        issue: 'No heading found on dashboard',
        location: '/dashboard',
      });
    }

    // Check stat cards for accessibility
    const statCards = await page.locator('[style*="textAlign: center"]').filter({ has: page.locator('div[style*="fontSize: 32"]') });
    const statCount = await statCards.count();

    if (statCount > 0) {
      console.log(`Found ${statCount} stat cards`);

      // Check if stat values are announced properly
      for (let i = 0; i < Math.min(statCount, 3); i++) {
        const card = statCards.nth(i);
        const ariaLabel = await card.getAttribute('aria-label');
        const role = await card.getAttribute('role');

        if (!ariaLabel && role !== 'region') {
          report.issues.push({
            element: 'stat card',
            issue: `Stat card ${i + 1} has no aria-label to announce value and context together`,
            location: '/dashboard',
          });
        }
      }
    }

    // Check charts for accessible alternatives
    const charts = await page.locator('svg').filter({ has: page.locator('text') });
    const chartCount = await charts.count();

    if (chartCount > 0) {
      console.log(`Found ${chartCount} charts`);

      for (let i = 0; i < Math.min(chartCount, 2); i++) {
        const chart = charts.nth(i);
        const ariaLabel = await chart.getAttribute('aria-label');
        const role = await chart.getAttribute('role');

        if (!ariaLabel && role !== 'img') {
          report.issues.push({
            element: 'chart',
            issue: `Chart ${i + 1} has no aria-label or role="img" for screen reader users`,
            location: '/dashboard',
          });
        }
      }

      // Check for data table alternatives
      const tables = await page.locator('table');
      if (await tables.count() > 0) {
        console.log('Data tables found as chart alternatives');
        report.ariaUsage.ariaLabels = true;
      } else {
        report.issues.push({
          element: 'charts',
          issue: 'Charts without accessible table alternatives for screen readers',
          location: '/dashboard',
        });
      }
    }

    // Check buttons
    const buttons = await page.locator('button');
    if (await buttons.count() > 0) {
      report.semanticHTML.buttonsUsed = true;
    }

    reports.push(report);
    console.log('Dashboard Flow Report:', JSON.stringify(report, null, 2));
  });

  test('Flow 3: Assets List Accessibility', async ({ page }) => {
    const report: AccessibilityReport = {
      flow: 'Assets List',
      contentAnnounced: true,
      labelsPresent: true,
      navigationOK: true,
      issues: [],
      semanticHTML: {
        headingsCorrect: false,
        listsUsed: false,
        buttonsUsed: false,
        linksUsed: false,
        formsCorrect: false,
      },
      ariaUsage: {
        liveRegions: false,
        ariaLabels: false,
        ariaRoles: false,
      },
    };

    // Login
    await page.goto('http://localhost:5173/login');
    await page.fill('input[type="email"], input[name="email"]', TEST_CREDENTIALS.admin.email);
    await page.fill('input[type="password"], input[name="password"]', TEST_CREDENTIALS.admin.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');

    // Navigate to assets
    await page.goto('http://localhost:5173/assets');
    await page.waitForLoadState('networkidle');

    // Check heading
    const heading = await page.locator('h3').filter({ hasText: 'Assets' });
    if (await heading.count() > 0) {
      report.semanticHTML.headingsCorrect = true;
      console.log('Assets heading found');
    } else {
      report.issues.push({
        element: 'heading',
        issue: 'No heading found for Assets page',
        location: '/assets',
      });
    }

    // Check search input
    const searchInput = await page.locator('input[placeholder*="Search"]');
    if (await searchInput.count() > 0) {
      const ariaLabel = await searchInput.getAttribute('aria-label');
      const label = await page.locator('label').filter({ has: searchInput });

      if (!ariaLabel && (await label.count() === 0)) {
        report.issues.push({
          element: 'search input',
          issue: 'Search input has no aria-label or associated label',
          location: '/assets',
        });
        report.labelsPresent = false;
      } else {
        console.log('Search input properly labeled');
      }
    }

    // Check data table
    const table = await page.locator('table');
    if (await table.count() > 0) {
      console.log('Table found');

      // Check table role and aria-label
      const role = await table.getAttribute('role');
      const ariaLabel = await table.getAttribute('aria-label');

      if (!ariaLabel && role !== 'table') {
        report.issues.push({
          element: 'table',
          issue: 'Table has no aria-label to describe its purpose',
          location: '/assets table',
        });
      }

      // Check column headers
      const headers = await page.locator('th');
      const headerCount = await headers.count();

      if (headerCount > 0) {
        console.log(`Found ${headerCount} column headers`);
        report.contentAnnounced = true;

        // Check if headers have proper scope
        for (let i = 0; i < Math.min(headerCount, 3); i++) {
          const header = headers.nth(i);
          const scope = await header.getAttribute('scope');

          if (!scope) {
            report.issues.push({
              element: 'table header',
              issue: `Header ${i + 1} missing scope="col" attribute`,
              location: '/assets table',
            });
          }
        }
      } else {
        report.issues.push({
          element: 'table',
          issue: 'Table has no column headers',
          location: '/assets table',
        });
        report.contentAnnounced = false;
      }

      // Check row announcement
      const rows = await page.locator('tbody tr');
      const rowCount = await rows.count();

      if (rowCount > 0) {
        console.log(`Table has ${rowCount} rows`);

        // Check first row for proper structure
        const firstRow = rows.first();
        const cells = await firstRow.locator('td').count();

        if (cells > 0) {
          console.log(`First row has ${cells} cells`);
        }
      }
    } else {
      report.issues.push({
        element: 'table',
        issue: 'No table element found for assets list',
        location: '/assets',
      });
      report.contentAnnounced = false;
    }

    // Check filter button
    const filterButton = await page.locator('button').filter({ hasText: 'Filter' });
    if (await filterButton.count() > 0) {
      report.semanticHTML.buttonsUsed = true;

      const ariaLabel = await filterButton.getAttribute('aria-label');
      const ariaExpanded = await filterButton.getAttribute('aria-expanded');

      if (!ariaLabel) {
        console.log('Filter button could benefit from aria-label like "Filter assets"');
      }

      if (!ariaExpanded) {
        report.issues.push({
          element: 'filter button',
          issue: 'Filter button should have aria-expanded to indicate state',
          location: '/assets toolbar',
        });
      }
    }

    // Check "Add Assets" button
    const addButton = await page.locator('button').filter({ hasText: 'Add Assets' });
    if (await addButton.count() > 0) {
      console.log('Add Assets button found');
    }

    reports.push(report);
    console.log('Assets List Flow Report:', JSON.stringify(report, null, 2));
  });

  test('Flow 4: Asset Detail Page Accessibility', async ({ page }) => {
    const report: AccessibilityReport = {
      flow: 'Asset Detail',
      contentAnnounced: true,
      labelsPresent: true,
      navigationOK: true,
      issues: [],
      semanticHTML: {
        headingsCorrect: false,
        listsUsed: false,
        buttonsUsed: false,
        linksUsed: false,
        formsCorrect: false,
      },
      ariaUsage: {
        liveRegions: false,
        ariaLabels: false,
        ariaRoles: false,
      },
    };

    // Login and navigate to assets
    await page.goto('http://localhost:5173/login');
    await page.fill('input[type="email"], input[name="email"]', TEST_CREDENTIALS.admin.email);
    await page.fill('input[type="password"], input[name="password"]', TEST_CREDENTIALS.admin.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');

    await page.goto('http://localhost:5173/assets');
    await page.waitForLoadState('networkidle');

    // Click on first asset if available
    const firstAssetRow = await page.locator('tbody tr').first();
    if (await firstAssetRow.count() > 0) {
      await firstAssetRow.click();
      await page.waitForLoadState('networkidle');

      // Check for page heading
      const heading = await page.locator('h1, h2, h3').first();
      if (await heading.count() > 0) {
        const headingText = await heading.textContent();
        console.log(`Asset detail heading: ${headingText}`);
        report.semanticHTML.headingsCorrect = true;
      } else {
        report.issues.push({
          element: 'heading',
          issue: 'No heading on asset detail page',
          location: '/assets/:id',
        });
      }

      // Check tabs
      const tabs = await page.locator('[role="tab"]');
      const tabCount = await tabs.count();

      if (tabCount > 0) {
        console.log(`Found ${tabCount} tabs`);
        report.ariaUsage.ariaRoles = true;

        // Check tab list
        const tablist = await page.locator('[role="tablist"]');
        if (await tablist.count() === 0) {
          report.issues.push({
            element: 'tabs',
            issue: 'Tabs without role="tablist" wrapper',
            location: '/assets/:id tabs',
          });
        }

        // Check each tab for proper attributes
        for (let i = 0; i < Math.min(tabCount, 3); i++) {
          const tab = tabs.nth(i);
          const ariaSelected = await tab.getAttribute('aria-selected');
          const ariaControls = await tab.getAttribute('aria-controls');

          if (!ariaSelected) {
            report.issues.push({
              element: 'tab',
              issue: `Tab ${i + 1} missing aria-selected attribute`,
              location: '/assets/:id tabs',
            });
          }

          if (!ariaControls) {
            report.issues.push({
              element: 'tab',
              issue: `Tab ${i + 1} missing aria-controls attribute`,
              location: '/assets/:id tabs',
            });
          }
        }

        // Check tab panels
        const tabpanels = await page.locator('[role="tabpanel"]');
        if (await tabpanels.count() > 0) {
          console.log('Tab panels found with proper role');
        } else {
          report.issues.push({
            element: 'tab panels',
            issue: 'Tab content not marked with role="tabpanel"',
            location: '/assets/:id',
          });
        }
      } else {
        console.log('No tabs found on asset detail page');
      }

      // Check for status indicators
      const tags = await page.locator('.ant-tag');
      const tagCount = await tags.count();

      if (tagCount > 0) {
        for (let i = 0; i < Math.min(tagCount, 2); i++) {
          const tag = tags.nth(i);
          const ariaLabel = await tag.getAttribute('aria-label');

          if (!ariaLabel) {
            report.issues.push({
              element: 'status tag',
              issue: `Status tag ${i + 1} should have aria-label describing status and its meaning`,
              location: '/assets/:id',
            });
          }
        }
      }
    } else {
      console.log('No assets found to test detail page');
      report.contentAnnounced = false;
    }

    reports.push(report);
    console.log('Asset Detail Flow Report:', JSON.stringify(report, null, 2));
  });

  test('Flow 5: Create Asset Modal Accessibility', async ({ page }) => {
    const report: AccessibilityReport = {
      flow: 'Create Asset Modal',
      contentAnnounced: true,
      labelsPresent: true,
      navigationOK: true,
      issues: [],
      semanticHTML: {
        headingsCorrect: false,
        listsUsed: false,
        buttonsUsed: false,
        linksUsed: false,
        formsCorrect: false,
      },
      ariaUsage: {
        liveRegions: false,
        ariaLabels: false,
        ariaRoles: false,
      },
    };

    // Login and navigate to assets
    await page.goto('http://localhost:5173/login');
    await page.fill('input[type="email"], input[name="email"]', TEST_CREDENTIALS.admin.email);
    await page.fill('input[type="password"], input[name="password"]', TEST_CREDENTIALS.admin.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');

    await page.goto('http://localhost:5173/assets');
    await page.waitForLoadState('networkidle');

    // Click "Add Assets" button
    const addButton = await page.locator('button').filter({ hasText: 'Add Assets' });
    if (await addButton.count() > 0) {
      await addButton.click();
      await page.waitForTimeout(1000);

      // Check modal role
      const modal = await page.locator('[role="dialog"]');
      if (await modal.count() > 0) {
        report.ariaUsage.ariaRoles = true;
        console.log('Modal has proper role="dialog"');

        // Check aria-modal
        const ariaModal = await modal.getAttribute('aria-modal');
        if (ariaModal !== 'true') {
          report.issues.push({
            element: 'modal',
            issue: 'Modal missing aria-modal="true"',
            location: 'Add Asset modal',
          });
        }

        // Check aria-labelledby
        const ariaLabelledBy = await modal.getAttribute('aria-labelledby');
        if (!ariaLabelledBy) {
          report.issues.push({
            element: 'modal',
            issue: 'Modal missing aria-labelledby pointing to title',
            location: 'Add Asset modal',
          });
        }
      } else {
        report.issues.push({
          element: 'modal',
          issue: 'Modal without role="dialog"',
          location: 'Add Asset modal',
        });
        report.contentAnnounced = false;
      }

      // Check modal title
      const modalTitle = await page.locator('.ant-modal-title, h2, h3').filter({ hasText: /Add|Asset/i }).first();
      if (await modalTitle.count() > 0) {
        const titleText = await modalTitle.textContent();
        console.log(`Modal title: ${titleText}`);
        report.semanticHTML.headingsCorrect = true;
      } else {
        report.issues.push({
          element: 'modal title',
          issue: 'Modal has no clear title/heading',
          location: 'Add Asset modal',
        });
      }

      // Check form fields
      const formInputs = await page.locator('input:not([type="hidden"])');
      const inputCount = await formInputs.count();

      console.log(`Found ${inputCount} form inputs`);

      if (inputCount > 0) {
        report.semanticHTML.formsCorrect = true;

        // Check first few inputs for labels
        for (let i = 0; i < Math.min(inputCount, 5); i++) {
          const input = formInputs.nth(i);
          const inputId = await input.getAttribute('id');
          const inputName = await input.getAttribute('name');
          const inputType = await input.getAttribute('type');

          // Look for associated label
          const label = inputId ? await page.locator(`label[for="${inputId}"]`) : null;
          const ariaLabel = await input.getAttribute('aria-label');
          const ariaLabelledBy = await input.getAttribute('aria-labelledby');

          if (label && (await label.count() > 0)) {
            const labelText = await label.textContent();
            console.log(`Input ${i + 1} (${inputName}) has label: ${labelText}`);
          } else if (ariaLabel) {
            console.log(`Input ${i + 1} (${inputName}) has aria-label: ${ariaLabel}`);
          } else if (ariaLabelledBy) {
            console.log(`Input ${i + 1} (${inputName}) has aria-labelledby: ${ariaLabelledBy}`);
          } else {
            report.issues.push({
              element: `form input ${inputName || inputType || i + 1}`,
              issue: 'Input field without label, aria-label, or aria-labelledby',
              location: 'Add Asset modal',
            });
            report.labelsPresent = false;
          }

          // Check for required fields
          const required = await input.getAttribute('required');
          const ariaRequired = await input.getAttribute('aria-required');

          if (required || ariaRequired === 'true') {
            console.log(`Input ${i + 1} marked as required`);
          }
        }
      }

      // Check form validation error messages
      const nextButton = await page.locator('button').filter({ hasText: 'Next' });
      if (await nextButton.count() > 0) {
        await nextButton.click();
        await page.waitForTimeout(500);

        // Look for error messages
        const errorMessages = await page.locator('.ant-form-item-explain-error, [role="alert"]');
        if (await errorMessages.count() > 0) {
          console.log('Error messages displayed');

          // Check if they're associated with inputs
          const firstError = errorMessages.first();
          const ariaLive = await firstError.getAttribute('aria-live');

          if (ariaLive) {
            report.ariaUsage.liveRegions = true;
            console.log('Error messages have aria-live for announcement');
          } else {
            report.issues.push({
              element: 'error messages',
              issue: 'Validation errors not announced via aria-live',
              location: 'Add Asset modal form',
            });
          }
        }
      }

      // Close modal
      const cancelButton = await page.locator('button').filter({ hasText: 'Cancel' });
      if (await cancelButton.count() > 0) {
        await cancelButton.click();
      }
    } else {
      console.log('Add Assets button not found');
      report.contentAnnounced = false;
    }

    reports.push(report);
    console.log('Create Asset Modal Flow Report:', JSON.stringify(report, null, 2));
  });

  test.afterAll(async () => {
    // Generate final report
    console.log('\n\n=== FINAL ACCESSIBILITY REPORT ===\n');

    for (const report of reports) {
      console.log(`\n--- ${report.flow} ---`);
      console.log(`Content Announced: ${report.contentAnnounced ? 'YES' : 'NO'}`);
      console.log(`Labels Present: ${report.labelsPresent ? 'YES' : 'NO'}`);
      console.log(`Navigation OK: ${report.navigationOK ? 'YES' : 'NO'}`);
      console.log(`Issues Found: ${report.issues.length}`);

      if (report.issues.length > 0) {
        console.log('\nIssues:');
        report.issues.forEach((issue, idx) => {
          console.log(`  ${idx + 1}. [${issue.element}] ${issue.issue} (${issue.location})`);
        });
      }
    }

    console.log('\n=== END REPORT ===\n');
  });
});
